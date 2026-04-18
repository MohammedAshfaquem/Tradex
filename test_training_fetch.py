"""
Quick test to see if training data fetch works for a few stocks
"""
import sys
sys.path.insert(0, 'nse-signal-tool/backend')

from data.fetcher import get_stock_data
import time

test_stocks = ["TCS", "SBIN", "RELIANCE"]

print("=" * 60)
print("Testing ML Training Data Fetch (3 stocks)")
print("=" * 60)

success_count = 0
fail_count = 0

for symbol in test_stocks:
    print(f"\n{symbol}:")
    print("-" * 40)
    
    try:
        df = get_stock_data(symbol, timeframe="1d", period="3y")
        
        if not df.empty:
            print(f"✓ SUCCESS: Fetched {len(df)} candles")
            print(f"  Date range: {df['datetime'].min()} to {df['datetime'].max()}")
            print(f"  Latest close: ₹{df['close'].iloc[-1]:.2f}")
            success_count += 1
        else:
            print(f"✗ FAILED: Empty dataframe")
            fail_count += 1
    except Exception as e:
        print(f"✗ ERROR: {e}")
        fail_count += 1
    
    # Small delay between stocks
    time.sleep(0.5)

print("\n" + "=" * 60)
print(f"Results: {success_count} success, {fail_count} failed")
print("=" * 60)
