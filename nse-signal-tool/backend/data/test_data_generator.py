"""
Generate realistic synthetic OHLCV data for ML model training when APIs are unavailable.
Uses geometric Brownian motion to create realistic price movements.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta


def generate_synthetic_stock_data(
    symbol: str,
    start_price: float = 100.0,
    days: int = 1095,
    volatility: float = 0.02,
    drift: float = 0.0005,
    seed: int = None
) -> pd.DataFrame:
    """
    Generate synthetic OHLCV data using geometric Brownian motion.

    Args:
        symbol: Stock symbol name
        start_price: Starting price
        days: Number of trading days to generate
        volatility: Daily volatility (std dev)
        drift: Daily drift (mean return)
        seed: Random seed for reproducibility

    Returns:
        DataFrame with OHLCV data
    """
    if seed is not None:
        np.random.seed(seed)

    # Generate daily returns
    returns = np.random.normal(drift, volatility, days)
    prices = start_price * np.exp(np.cumsum(returns))

    # Generate OHLCV data
    data = []
    current_date = datetime.now() - timedelta(days=days)

    for i in range(len(prices)):
        # Skip weekends (simple approach)
        if current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue

        # Add realistic intraday variation
        open_price = prices[i]
        daily_range = prices[i] * volatility * 2
        high = open_price + np.random.uniform(0, daily_range)
        low = open_price - np.random.uniform(0, daily_range)
        close_price = np.random.uniform(low, high)

        # Volume typically varies
        volume = int(np.random.normal(1000000, 200000))
        volume = max(volume, 10000)  # Ensure positive

        data.append({
            'datetime': current_date,
            'open': round(open_price, 2),
            'high': round(max(high, close_price), 2),
            'low': round(min(low, open_price, close_price), 2),
            'close': round(close_price, 2),
            'volume': volume
        })

        current_date += timedelta(days=1)

    df = pd.DataFrame(data)
    return df


def generate_training_dataset(
    symbols: list,
    start_prices: dict = None,
    days: int = 1095,
) -> pd.DataFrame:
    """
    Generate synthetic training data for multiple stocks.

    Args:
        symbols: List of stock symbols
        start_prices: Dict mapping symbol to starting price
        days: Number of trading days

    Returns:
        Combined DataFrame with all synthetic data
    """
    if start_prices is None:
        start_prices = {}

    all_data = []

    for i, symbol in enumerate(symbols):
        start_price = start_prices.get(symbol, 1000.0)
        # Different volatility for different stocks
        volatility = 0.015 + np.random.uniform(-0.005, 0.005)

        df = generate_synthetic_stock_data(
            symbol=symbol,
            start_price=start_price,
            days=days,
            volatility=volatility,
            seed=i  # Use symbol index for reproducibility
        )
        df['symbol'] = symbol
        all_data.append(df)
        print(f"Generated {len(df)} candles for {symbol}")

    combined_df = pd.concat(all_data, ignore_index=True)
    return combined_df


if __name__ == "__main__":
    # Test data generation
    symbols = ["TCS", "INFY", "RELIANCE"]
    start_prices = {
        "TCS": 3500,
        "INFY": 1800,
        "RELIANCE": 2500,
    }

    df = generate_training_dataset(symbols, start_prices, days=365)
    print(f"\nGenerated {len(df)} total records")
    print(df.head(10))
