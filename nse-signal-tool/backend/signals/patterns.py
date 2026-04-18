import pandas as pd
import pandas_ta as ta
from typing import Dict, Any, List


def detect_patterns(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Detect candlestick patterns and return scores.

    Returns dict with:
        - patterns: List of detected pattern names
        - pattern_score: Total score from patterns (max 15 points)
        - at_support_resistance: Boolean if pattern is at key level
        - confirmed: Boolean if next candle confirms pattern
    """
    if df.empty or len(df) < 10:
        return {
            "patterns": [],
            "pattern_score": 0,
            "at_support_resistance": False,
            "confirmed": False,
            "error": "Insufficient data"
        }

    try:
        df = df.copy()

        # Ensure lowercase column names
        if 'close' not in df.columns:
            df.columns = [col.lower() for col in df.columns]

        detected_patterns = []
        total_score = 0

        # Get last few candles
        if len(df) < 3:
            return {
                "patterns": [],
                "pattern_score": 0,
                "at_support_resistance": False,
                "confirmed": False,
                "error": None
            }

        # Pattern detection using pandas_ta
        # Bullish patterns
        df['cdl_engulfing'] = ta.cdl_pattern(df['open'], df['high'], df['low'], df['close'], name='engulfing')
        df['cdl_morningstar'] = ta.cdl_pattern(df['open'], df['high'], df['low'], df['close'], name='morningstar')
        df['cdl_hammer'] = ta.cdl_pattern(df['open'], df['high'], df['low'], df['close'], name='hammer')
        df['cdl_doji'] = ta.cdl_pattern(df['open'], df['high'], df['low'], df['close'], name='doji')

        # Bearish patterns
        df['cdl_shootingstar'] = ta.cdl_pattern(df['open'], df['high'], df['low'], df['close'], name='shootingstar')
        df['cdl_eveningstar'] = ta.cdl_pattern(df['open'], df['high'], df['low'], df['close'], name='eveningstar')

        # Manual pattern detection as backup
        last_idx = -1
        prev_idx = -2
        prev2_idx = -3

        curr_open = df['open'].iloc[last_idx]
        curr_close = df['close'].iloc[last_idx]
        curr_high = df['high'].iloc[last_idx]
        curr_low = df['low'].iloc[last_idx]

        prev_open = df['open'].iloc[prev_idx]
        prev_close = df['close'].iloc[prev_idx]
        prev_high = df['high'].iloc[prev_idx]
        prev_low = df['low'].iloc[prev_idx]

        # Bullish Engulfing
        if (prev_close < prev_open and  # Previous candle is bearish
            curr_close > curr_open and  # Current candle is bullish
            curr_close > prev_open and  # Current close > previous open
            curr_open < prev_close):    # Current open < previous close
            detected_patterns.append("bullish_engulfing")
            total_score += 6

        # Bearish Engulfing
        elif (prev_close > prev_open and  # Previous candle is bullish
              curr_close < curr_open and  # Current candle is bearish
              curr_close < prev_open and  # Current close < previous open
              curr_open > prev_close):    # Current open > previous close
            detected_patterns.append("bearish_engulfing")
            total_score -= 6

        # Hammer (bullish)
        body = abs(curr_close - curr_open)
        lower_shadow = min(curr_open, curr_close) - curr_low
        upper_shadow = curr_high - max(curr_open, curr_close)

        if (lower_shadow > 2 * body and  # Long lower shadow
            upper_shadow < body * 0.3):  # Small upper shadow
            detected_patterns.append("hammer")
            total_score += 4

        # Shooting Star (bearish) - appears after uptrend
        # Upper shadow > 2x body, small lower shadow
        prev_trend_up = prev_close > prev_open  # Previous candle was bullish
        if (upper_shadow > 2 * body and  # Long upper shadow
            lower_shadow < body * 0.3 and  # Small lower shadow
            prev_trend_up):  # After an uptrend
            detected_patterns.append("shooting_star")
            total_score -= 5

        # Inverted Hammer (bullish) - appears after downtrend
        # Same shadow shape as shooting star, but after a downtrend
        elif (upper_shadow > 2 * body and  # Long upper shadow
             lower_shadow < body * 0.3 and  # Small lower shadow
             not prev_trend_up):  # After a downtrend (prev candle was bearish)
            detected_patterns.append("inverted_hammer")
            total_score += 3

        # Morning Star & Evening Star (3-candle reversals)
        if len(df) >= 3:
            prev2_open = df['open'].iloc[prev2_idx]
            prev2_close = df['close'].iloc[prev2_idx]

            # Morning Star: bearish -> small star -> bullish
            if (prev2_close < prev2_open and            # First candle bearish
                abs(prev_close - prev_open) < body * 0.5 and  # Second candle small body (star)
                curr_close > curr_open and              # Third candle bullish
                curr_close > (prev2_open + prev2_close) / 2):  # Closes above midpoint of first
                detected_patterns.append("morning_star")
                total_score += 6

            # Evening Star: bullish -> small star -> bearish
            if (prev2_close > prev2_open and            # First candle bullish
                abs(prev_close - prev_open) < body * 0.5 and  # Second candle small body (star)
                curr_close < curr_open and              # Third candle bearish
                curr_close < (prev2_open + prev2_close) / 2):  # Closes below midpoint of first
                detected_patterns.append("evening_star")
                total_score -= 6

        # Doji
        if body < (curr_high - curr_low) * 0.1:  # Very small body
            detected_patterns.append("doji")

        # Check if at support/resistance level
        at_support_resistance = False
        if len(df) >= 50:
            # Use 50-bar lookback for better support/resistance
            recent_lows = df['low'].iloc[-50:].nsmallest(5).mean()
            recent_highs = df['high'].iloc[-50:].nlargest(5).mean()

            current_price = df['close'].iloc[-1]
            
            # Calculate ATR for dynamic tolerance
            atr = ta.atr(df['high'], df['low'], df['close'], length=14)
            if atr is not None and not atr.empty and not pd.isna(atr.iloc[-1]):
                tolerance = atr.iloc[-1] * 0.5
            else:
                tolerance = (recent_highs - recent_lows) * 0.02
                
            if abs(current_price - recent_lows) < tolerance:
                at_support_resistance = True
                valuable_bullish = any(p in detected_patterns for p in ["hammer", "inverted_hammer", "morning_star", "bullish_engulfing"])
                if valuable_bullish:
                    total_score += 3  # Bonus for bullish pattern at support
                if "doji" in detected_patterns:
                    total_score += 4
                    
            elif abs(current_price - recent_highs) < tolerance:
                at_support_resistance = True
                valuable_bearish = any(p in detected_patterns for p in ["shooting_star", "evening_star", "bearish_engulfing"])
                if valuable_bearish:
                    total_score -= 3
                if "doji" in detected_patterns:
                    total_score -= 4

        # Check if pattern is confirmed by next candle
        # (We can't know this in real-time, but include logic for backtesting)
        confirmed = False

        # If we have data after this pattern (for backtesting)
        # In live trading, this would be checked on the next candle
        # For now, we'll leave it as False

        # Clamp score between -10 and 15
        total_score = max(-10, min(15, total_score))

        return {
            "patterns": detected_patterns,
            "pattern_score": total_score,
            "at_support_resistance": at_support_resistance,
            "confirmed": confirmed,
            "error": None
        }

    except Exception as e:
        return {
            "patterns": [],
            "pattern_score": 0,
            "at_support_resistance": False,
            "confirmed": False,
            "error": str(e)
        }


if __name__ == "__main__":
    # Test
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from data.fetcher import get_stock_data

    df = get_stock_data("RELIANCE", "1d", "3mo")
    patterns = detect_patterns(df)

    print("Candlestick Patterns for RELIANCE:")
    for key, value in patterns.items():
        print(f"{key}: {value}")
