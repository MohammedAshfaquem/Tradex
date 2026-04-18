import pandas as pd
from typing import Dict, Any

# Try to import nsepython functions
NSEPYTHON_AVAILABLE = False
try:
    from nsepython import nse_optionchain_expiry_dates, nse_optionchain_scrapper
    NSEPYTHON_AVAILABLE = True
except ImportError:
    print("WARNING: nsepython not installed. F&O data will return neutral values.")


def get_fno_data(symbol: str) -> Dict[str, Any]:
    """
    Fetch F&O data for a symbol using nsepython.

    Returns dict with:
        - pcr: Put-Call Ratio
        - max_pain: Max pain price
        - oi_direction: 'long_buildup', 'short_buildup', 'neutral'
        - total_call_oi: Total call open interest
        - total_put_oi: Total put open interest
    """
    # Remove .NS suffix if present
    symbol = symbol.replace(".NS", "").upper()

    neutral_data = {
        "pcr": 1.0,
        "max_pain": 0,
        "oi_direction": "neutral",
        "total_call_oi": 0,
        "total_put_oi": 0,
        "error": None
    }

    if not NSEPYTHON_AVAILABLE:
        print(f"INFO: nsepython not available for {symbol}")
        return neutral_data

    try:
        # Fetch options chain
        expiry_dates = nse_optionchain_expiry_dates(symbol)

        if not expiry_dates or len(expiry_dates) == 0:
            print(f"INFO: No expiry dates found for {symbol}")
            return neutral_data

        # Get nearest expiry
        nearest_expiry = expiry_dates[0]

        # Fetch options chain data
        option_chain = nse_optionchain_scrapper(symbol, nearest_expiry)

        if not option_chain or 'records' not in option_chain:
            print(f"INFO: No option chain data for {symbol}")
            return neutral_data

        records = option_chain['records']['data']

        # Calculate PCR and OI
        total_call_oi = 0
        total_put_oi = 0
        strike_data = []

        for record in records:
            strike = record.get('strikePrice', 0)

            call_oi = record.get('CE', {}).get('openInterest', 0) if 'CE' in record else 0
            put_oi = record.get('PE', {}).get('openInterest', 0) if 'PE' in record else 0

            call_volume = record.get('CE', {}).get('totalTradedVolume', 0) if 'CE' in record else 0
            put_volume = record.get('PE', {}).get('totalTradedVolume', 0) if 'PE' in record else 0

            total_call_oi += call_oi
            total_put_oi += put_oi

            # Calculate pain at this strike
            pain = (call_oi * max(0, strike - record.get('strikePrice', 0)) +
                    put_oi * max(0, record.get('strikePrice', 0) - strike))

            strike_data.append({
                'strike': strike,
                'call_oi': call_oi,
                'put_oi': put_oi,
                'call_volume': call_volume,
                'put_volume': put_volume,
                'pain': pain
            })

        # Calculate PCR
        pcr = total_put_oi / total_call_oi if total_call_oi > 0 else 1.0

        # Calculate max pain (strike with minimum total pain)
        if strike_data:
            df = pd.DataFrame(strike_data)
            max_pain_strike = df.loc[df['pain'].idxmin(), 'strike']
        else:
            max_pain_strike = 0

        # Determine OI direction
        oi_direction = "neutral"
        if pcr > 1.2:
            oi_direction = "long_buildup"  # More puts = bullish
        elif pcr < 0.8:
            oi_direction = "short_buildup"  # More calls = could be bearish if excessive

        return {
            "pcr": round(pcr, 2),
            "max_pain": max_pain_strike,
            "oi_direction": oi_direction,
            "total_call_oi": total_call_oi,
            "total_put_oi": total_put_oi,
            "error": None
        }

    except Exception as e:
        print(f"ERROR: F&O error for {symbol}: {e}")
        neutral_data["error"] = str(e)
        return neutral_data


def get_fii_dii_data() -> Dict[str, float]:
    """
    Fetch FII and DII daily buy/sell data from NSE.

    Returns dict with:
        - fii_net: Net FII flow in crores
        - dii_net: Net DII flow in crores
    """
    neutral_data = {
        "fii_net": 0.0,
        "dii_net": 0.0,
        "error": None
    }

    if not NSEPYTHON_AVAILABLE:
        return neutral_data

    try:
        # For now, return neutral since nse_fno might not be consistently available
        # In production, you'd fetch from NSE website directly
        print("INFO: FII/DII data requires direct NSE API")
        return neutral_data

    except Exception as e:
        print(f"ERROR: FII/DII error: {e}")
        neutral_data["error"] = str(e)
        return neutral_data


if __name__ == "__main__":
    # Test
    print("Testing F&O data for RELIANCE:")
    fno_data = get_fno_data("RELIANCE")
    print(fno_data)

    print("\nTesting FII/DII data:")
    fii_dii = get_fii_dii_data()
    print(fii_dii)
