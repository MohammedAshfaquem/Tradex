"""
Test script to verify yfinance-based fetcher works correctly
"""
import sys
sys.path.insert(0, 'nse-signal-tool/backend')

from data.fetcher import get_stock_data, get_latest_price

print("=" * 60)
print("Testing yfinance-based data fetcher")
print("=" * 60)

# Test SBIN (the one user reported as wrong)
print("\n1. Testing SBIN (State Bank of India)")
print("-" * 60)
latest_price = get_latest_price("SBIN")
print(f"Latest SBIN price: ₹{latest_price:.2f}")

# Fetch recent daily data
df_daily = get_stock_data("SBIN", timeframe="1d", period="30d")
if not df_daily.empty:
    print(f"Daily data: {len(df_daily)} candles")
    print(f"Last 3 days:")
    print(df_daily[['datetime', 'close']].tail(3))
else:
    print("ERROR: Failed to fetch daily data")

# Test other stocks
print("\n2. Testing RELIANCE")
print("-" * 60)
reliance_price = get_latest_price("RELIANCE")
print(f"Latest RELIANCE price: ₹{reliance_price:.2f}")

print("\n3. Testing TCS")
print("-" * 60)
tcs_price = get_latest_price("TCS")
print(f"Latest TCS price: ₹{tcs_price:.2f}")

print("\n" + "=" * 60)
print("Test complete!")
print("=" * 60)
