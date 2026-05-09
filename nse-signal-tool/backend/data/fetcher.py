import pandas as pd
from datetime import datetime, timedelta
from typing import Literal
import time
import random
import logging
import threading
import yfinance as yf
import requests

try:
    from .test_data_generator import generate_synthetic_stock_data
except ImportError:
    from test_data_generator import generate_synthetic_stock_data

TimeFrame = Literal["15m", "1h", "4h", "1d"]

_user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

# Global rate limiter to prevent API hammering
_last_request_time = 0
_request_delay = 1.5

# In-memory cache to prevent redundant API calls
# Format: {(symbol, timeframe, period): (timestamp, dataframe)}
_cache = {}
CACHE_TTL_INTRADAY = 60  # 1 minute expiry for intraday
CACHE_TTL_DAILY = 3600   # 1 hour expiry for daily data
_cache_lock = threading.Lock()

# yfinance calls are not fully thread-safe under high parallel load.
_yf_lock = threading.Lock()

logger = logging.getLogger(__name__)


def _rate_limit():
    """Apply rate limiting to prevent API throttling."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < _request_delay:
        time.sleep(_request_delay - elapsed)
    _last_request_time = time.time()


def _fetch_nse_data(symbol: str, timeframe: str = "1d", days_back: int = 1825, retries: int = 3) -> pd.DataFrame:
    """
    Fetch data from NSE using yfinance (reliable and accurate).
    Falls back to synthetic data if API fails.

    Args:
        symbol: Stock symbol without .NS suffix
        timeframe: Data interval (1m, 5m, 15m, 1h, 1d, etc.)
        days_back: Number of days of historical data (default: 3 years)
        retries: Number of retry attempts

    Returns:
        DataFrame with OHLCV data from NSE or synthetic fallback
    """
    # Add .NS suffix for NSE stocks (but not for index symbols like ^NSEI)
    if symbol.startswith("^"):
        yf_symbol = symbol
    else:
        yf_symbol = f"{symbol}.NS"

    # Map timeframe to yfinance interval
    interval_map = {
        "15m": "15m",
        "1h": "1h",
        "4h": "1h",  # yfinance doesn't have 4h, we'll aggregate from 1h
        "1d": "1d"
    }
    interval = interval_map.get(timeframe, "1d")

    # yfinance has limitations on historical data for intraday
    if interval == "15m" and days_back > 7:
        days_back = 7   # Max 7 days for 15m data (yfinance hard limit)
    elif interval == "1h" and days_back > 60:
        days_back = 60  # Max 60 days for 1h intraday data

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)

    for attempt in range(retries):
        try:
            _rate_limit()

            # Use yf.download() — more reliable than ticker.history() for batch/cookie issues
            with _yf_lock:
                df = yf.download(
                    yf_symbol,
                    start=start_date,
                    end=end_date,
                    interval=interval,
                    auto_adjust=True,
                    actions=False,
                    progress=False,
                    multi_level_index=False,
                )

            if df.empty:
                if attempt < retries - 1:
                    backoff = (2 ** attempt) + random.uniform(0, 1)
                    print(f"[RETRY {attempt + 1}/{retries}] {symbol} - waiting {backoff:.1f}s...")
                    time.sleep(backoff)
                    continue
                # Only use synthetic fallback for daily timeframe
                # For intraday (15m, 1h), return empty to avoid polluting signals with fake data
                if interval in ["15m", "1h"]:
                    print(f"[SKIP] No intraday ({interval}) data for {symbol}, skipping (no synthetic)")
                    return pd.DataFrame()
                print(f"[FALLBACK] No data for {symbol}, using synthetic data")
                return generate_synthetic_stock_data(symbol, days=days_back, seed=hash(symbol) % 10000)

            # Standardize column names (yfinance uses title case)
            df.columns = [col.lower() for col in df.columns]

            # yf.download() returns DatetimeIndex — reset to column named 'datetime'
            df = df.reset_index()
            # After reset_index the index column could be named 'date', 'datetime', or 'Datetime'
            first_col = df.columns[0]
            if first_col.lower() in ('date', 'datetime', 'index'):
                df = df.rename(columns={first_col: 'datetime'})

            # Ensure datetime column exists
            if 'datetime' not in df.columns:
                raise ValueError(f"datetime column missing for {symbol}")

            # Ensure datetime is properly formatted
            if not pd.api.types.is_datetime64_any_dtype(df['datetime']):
                df['datetime'] = pd.to_datetime(df['datetime'])
            # Remove timezone info for consistency
            if hasattr(df['datetime'].dt, 'tz') and df['datetime'].dt.tz is not None:
                df['datetime'] = df['datetime'].dt.tz_localize(None)
            
            # Select required columns
            required_cols = ['datetime', 'open', 'high', 'low', 'close', 'volume']
            available_cols = [c for c in required_cols if c in df.columns]
            
            if 'datetime' not in available_cols:
                raise ValueError(f"datetime column missing for {symbol}")
                
            df = df[available_cols]

            # Clean data
            df = df.dropna()
            df = df.sort_values('datetime').reset_index(drop=True)

            print(f"[OK] Fetched {len(df)} candles for {symbol} via yfinance")
            return df

        except Exception as e:
            if attempt < retries - 1:
                backoff = (2 ** attempt) + random.uniform(0, 1)
                print(f"[RETRY {attempt + 1}/{retries}] - waiting {backoff:.1f}s... (Error: {str(e)[:80]})")
                time.sleep(backoff)
            else:
                if interval in ["15m", "1h"]:
                    print(f"[SKIP] No intraday ({interval}) data for {symbol}, skipping (no synthetic)")
                    return pd.DataFrame()
                print(f"[FALLBACK] yfinance failed for {symbol}, using synthetic data")
                logger.error(f"Failed to fetch {symbol}: {e}")
                return generate_synthetic_stock_data(symbol, days=days_back, seed=hash(symbol) % 10000)

    return pd.DataFrame()


def get_stock_data(symbol: str, timeframe: TimeFrame = "1d", period: str = "3y", retries: int = 3) -> pd.DataFrame:
    """
    Fetch OHLCV data for NSE stock using yfinance (accurate and reliable).

    Args:
        symbol: Stock symbol (without .NS suffix)
        timeframe: 15m, 1h, 4h, or 1d
        period: Time period (3y, 1y, 6mo, 60d, etc.)
        retries: Number of retry attempts (default: 3)

    Returns:
        DataFrame with OHLCV data from NSE
    """
    # Remove .NS suffix if present
    symbol = symbol.replace(".NS", "").upper()

    # Check cache first
    cache_key = (symbol, timeframe, period)
    with _cache_lock:
        if cache_key in _cache:
            timestamp, cached_df = _cache[cache_key]
            ttl = CACHE_TTL_INTRADAY if timeframe in ["15m", "1h", "4h"] else CACHE_TTL_DAILY
            if time.time() - timestamp < ttl:
                print(f"[CACHE] Using cached data for {symbol} ({timeframe})")
                return cached_df.copy()

    print(f"[FETCH] Fetching NSE data for {symbol} ({timeframe}, {period})")

    # Convert period to days
    period_map = {
        "5y": 1825,
        "3y": 1095,
        "2y": 730,
        "1y": 365,
        "6mo": 180,
        "60d": 60,
        "30d": 30,
        "7d": 7,
        "1d": 1
    }
    days_back = period_map.get(period, 1095)

    # Fetch from NSE via yfinance
    df = _fetch_nse_data(symbol, timeframe, days_back, retries)

    if df.empty:
        return pd.DataFrame()

    # Aggregate to 4h if needed (yfinance only has 1h)
    if timeframe == "4h" and 'datetime' in df.columns:
        df = df.set_index('datetime')
        df = df.resample('4H').agg({
            'open': 'first',
            'high': 'max',
            'low': 'min',
            'close': 'last',
            'volume': 'sum'
        }).dropna()
        df = df.reset_index()

    with _cache_lock:
        _cache[cache_key] = (time.time(), df.copy())
    return df


def get_latest_price(symbol: str, retries: int = 3) -> float:
    """Get latest price for a symbol from NSE using yfinance."""
    symbol = symbol.replace(".NS", "").upper()
    yf_symbol = f"{symbol}.NS"

    for attempt in range(retries):
        try:
            _rate_limit()
            # Use fast_info which is lighter than full .info fetch
            with _yf_lock:
                ticker = yf.Ticker(yf_symbol)
            try:
                price = ticker.fast_info.get('last_price') or ticker.fast_info.get('regular_market_price')
                if price:
                    return float(price)
            except Exception:
                pass

            # Fallback: get last close from 5-day download
            with _yf_lock:
                df = yf.download(yf_symbol, period="5d", interval="1d", progress=False,
                                 auto_adjust=True, multi_level_index=False)
            if not df.empty and 'Close' in df.columns:
                return float(df['Close'].iloc[-1])
            elif not df.empty and 'close' in df.columns:
                return float(df['close'].iloc[-1])

        except Exception as e:
            if attempt < retries - 1:
                backoff = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(backoff)
            else:
                logger.error(f"Failed to get latest price for {symbol}: {e}")

    return 0.0


if __name__ == "__main__":
    # Test
    df = get_stock_data("RELIANCE", "1d", "3y")
    if not df.empty:
        print(df.head())
        print(f"Shape: {df.shape}")
    print(f"Latest price: {get_latest_price('RELIANCE')}")
