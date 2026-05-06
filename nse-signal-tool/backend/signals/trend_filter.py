import pandas as pd
from data.fetcher import get_stock_data
import time
import yfinance as yf

_trend_cache = {"timestamp": 0, "status": "neutral"}
CACHE_TTL = 3600  # 1 hour

def get_market_trend() -> str:
    """
    Determine overall market trend using NIFTY 50 (^NSEI).
    Returns 'bullish', 'bearish', or 'neutral'.
    """
    global _trend_cache
    
    if time.time() - _trend_cache["timestamp"] < CACHE_TTL:
        return _trend_cache["status"]
        
    try:
        # Fetch NIFTY 50 data — use ^NSEI directly (no .NS suffix)
        df = get_stock_data("^NSEI", timeframe="1d", period="3mo")
        if df.empty:
            return "neutral"
            
        current_close = df['close'].iloc[-1]
        
        # Calculate 20 EMA and 50 EMA
        ema20 = df['close'].ewm(span=20, adjust=False).mean().iloc[-1]
        ema50 = df['close'].ewm(span=50, adjust=False).mean().iloc[-1]
        
        status = "neutral"
        if current_close > ema20 and ema20 > ema50:
            status = "bullish"
        elif current_close < ema20 and ema20 < ema50:
            status = "bearish"
            
        _trend_cache = {
            "timestamp": time.time(),
            "status": status
        }
        return status
    except Exception as e:
        print(f"Error checking market trend: {e}")
        return "neutral"
