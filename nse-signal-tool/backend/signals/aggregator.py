import pandas as pd
from typing import Dict, Any, Tuple
from datetime import datetime


def calculate_confidence(
    symbol: str,
    indicators: Dict[str, Any],
    patterns: Dict[str, Any],
    volume_data: Dict[str, float],
    fno_data: Dict[str, Any],
    news_score: int,
    ml_probability: float,
    timeframe_agreement: int = 0
) -> Tuple[int, str, Dict[str, Any]]:
    """
    Aggregate all signal sources into final confidence score with enhanced weighting.

    Weighting (Updated):
        - Technical indicators: max 35 pts (increased for ADX & Stochastic)
        - Candlestick patterns: max 15 pts
        - Volume: max 10 pts (>2x avg=6, >1.5x=3, <0.5x=-3)
        - F&O data: max 10 pts (PCR, OI, FII/DII)
        - News sentiment: max 10 pts
        - ML model: max 20 pts (increased weight)
        - Multi-timeframe agreement: max 15 pts

    Total max: 115 pts (normalized to 0-100)

    Thresholds:
        >= 72 = BUY
        55-71 = WATCH
        36-54 = SKIP
        <= 35 = SELL

    Returns:
        (confidence_pct, signal, breakdown_dict)
    """
    breakdown = {
        "technical": 0,
        "patterns": 0,
        "volume": 0,
        "fno": 0,
        "news": 0,
        "ml": 0,
        "timeframe": 0
    }

    # 1. Technical Indicators (max 35 pts - updated for new indicators)
    tech_score = indicators.get("total_score", 0)
    breakdown["technical"] = max(-15, min(35, tech_score))

    # 2. Candlestick Patterns (max 15 pts)
    pattern_score = patterns.get("pattern_score", 0)
    breakdown["patterns"] = max(-10, min(15, pattern_score))

    # 3. Volume Analysis (max 10 pts) - Enhanced
    volume_ratio = volume_data.get("volume_ratio", 1.0)
    if volume_ratio > 2.5:  # Very high volume
        volume_score = 8
    elif volume_ratio > 2.0:
        volume_score = 6
    elif volume_ratio > 1.5:
        volume_score = 3
    elif volume_ratio < 0.5:  # Very low volume - neutral/bearish
        volume_score = -2
    elif volume_ratio < 0.7:
        volume_score = -1
    else:
        volume_score = 0
    breakdown["volume"] = volume_score

    # 4. F&O Data (max 10 pts) - Enhanced
    fno_score = 0

    # PCR analysis
    pcr = fno_data.get("pcr", 1.0)
    if pcr > 1.5:  # Very bullish - lots of puts
        fno_score += 4
    elif pcr > 1.2:  # Bullish
        fno_score += 3
    elif pcr < 0.7:  # Very bearish - lots of calls
        fno_score -= 3
    elif pcr < 0.8:  # Caution
        fno_score -= 2

    # OI direction
    oi_dir = fno_data.get("oi_direction", "neutral")
    if oi_dir == "long_buildup":
        fno_score += 4
    elif oi_dir == "short_covering":
        fno_score += 2
    elif oi_dir == "short_buildup":
        fno_score -= 3
    elif oi_dir == "long_unwinding":
        fno_score -= 2

    # FII/DII data
    fii_net = fno_data.get("fii_net", 0)
    if fii_net > 1000:  # Very strong FII buying
        fno_score += 5
    elif fii_net > 500:  # Strong FII buying
        fno_score += 3
    elif fii_net < -1000:  # Very strong FII selling
        fno_score -= 4
    elif fii_net < -500:  # Strong FII selling
        fno_score -= 2

    breakdown["fno"] = max(-8, min(10, fno_score))

    # 5. News Sentiment (max 10 pts)
    breakdown["news"] = max(-5, min(10, news_score))

    # 6. ML Model (max 20 pts) - Symmetric: bearish predictions subtract, bullish add
    ml_score = int((ml_probability - 0.5) * 40)  # 0.0→-20, 0.5→0, 1.0→+20
    breakdown["ml"] = max(-20, min(20, ml_score))

    # 7. Multi-timeframe Agreement (max 15 pts, min -15 pts)
    breakdown["timeframe"] = max(-15, min(15, timeframe_agreement))

    # Calculate total confidence
    total_confidence = sum(breakdown.values())

    # Additional bonuses for strong setups
    bonuses = 0

    # Bonus: Thursday (F&O expiry day) with good setup
    if datetime.now().weekday() == 3 and total_confidence > 60:  # Thursday
        bonuses += 5

    # Bonus: Multiple timeframes align strongly
    if timeframe_agreement >= 12:
        bonuses += 5

    # Bonus: Strong ADX with aligned indicators
    adx = indicators.get("adx", 0)
    if adx > 30 and indicators.get("ema_score", 0) >= 5:
        bonuses += 5

    # Bonus: Volume surge with technical setup
    if volume_ratio > 2.0 and tech_score > 15:
        bonuses += 3

    total_confidence += bonuses
    if bonuses > 0:
        breakdown["bonuses"] = bonuses

    # Normalize to 0-100 scale mapping 0 to 50
    # Dynamically compute max possible score based on what data sources contributed
    # This prevents penalizing signals when F&O or news data is unavailable
    max_possible = 35 + 15 + 10 + 20 + 15  # tech + patterns + volume + ml + timeframe = 95 (always available)
    if abs(fno_score) > 0:
        max_possible += 10  # F&O contributed
    if abs(news_score) > 0:
        max_possible += 10  # News contributed
    max_possible += 18  # max bonuses

    if total_confidence >= 0:
        confidence_pct = int(50 + (total_confidence / max_possible) * 50)
    else:
        # Negative scores map to 0-50
        min_possible = 80  # approximate negative floor (tech -23 + patterns -10 + vol -2 + fno -8 + news -5 + ml -20 + tf -15)
        confidence_pct = int(50 + (total_confidence / min_possible) * 50)
        
    confidence_pct = max(0, min(100, confidence_pct))

    # Balanced regime: allow both BUY and SELL to appear with practical thresholds.
    if confidence_pct >= 72:
        signal = "BUY"
    elif confidence_pct >= 55:
        signal = "WATCH"
    elif confidence_pct <= 35:
        signal = "SELL"
    else:
        signal = "SKIP"

    # Calculate entry, target, and stop loss with improved risk management
    current_price = float(volume_data.get("current_price", 0.0))
    atr = float(volume_data.get("atr", current_price * 0.02))

    entry_price = current_price

    # Dynamic target and stop loss based on ATR and volatility
    if atr > 0:
        if signal == "SELL":
            if confidence_pct <= 20: 
                target = round(current_price - (atr * 3), 2)
                stop_loss = round(current_price + (atr * 1.5), 2)
            elif confidence_pct <= 30:
                target = round(current_price - (atr * 2.5), 2)
                stop_loss = round(current_price + (atr * 1.5), 2)
            else:
                target = round(current_price - (atr * 2), 2)
                stop_loss = round(current_price + atr, 2)
        else: # BUY and others
            if confidence_pct >= 80:
                target = round(current_price + (atr * 3), 2)
                stop_loss = round(current_price - (atr * 1.5), 2)
            elif confidence_pct >= 70:
                target = round(current_price + (atr * 2.5), 2)
                stop_loss = round(current_price - (atr * 1.5), 2)
            else:
                target = round(current_price + (atr * 2), 2)
                stop_loss = round(current_price - atr, 2)
    else:
        # Fallback to percentage-based
        if signal == "SELL":
            target = round(current_price * 0.97, 2)
            stop_loss = round(current_price * 1.02, 2)
        else:
            target = round(current_price * 1.03, 2)
            stop_loss = round(current_price * 0.98, 2)

    breakdown["entry_price"] = entry_price
    breakdown["target"] = target
    breakdown["stop_loss"] = stop_loss
    if signal == "SELL":
        breakdown["risk_reward"] = round((entry_price - target) / (stop_loss - entry_price), 2) if stop_loss > entry_price else 0
    else:
        breakdown["risk_reward"] = round((target - entry_price) / (entry_price - stop_loss), 2) if entry_price > stop_loss else 0

    return confidence_pct, signal, breakdown


def calculate_volume_metrics(df) -> Dict[str, float]:
    """
    Calculate volume-related metrics.

    Returns:
        - current_volume: Latest volume
        - avg_volume_20: 20-day average volume
        - volume_ratio: Current / Average
        - current_price: Latest close price
        - atr: Average True Range
    """
    if df.empty or len(df) < 20:
        return {
            "current_volume": 0,
            "avg_volume_20": 0,
            "volume_ratio": 1.0,
            "current_price": 0,
            "atr": 0
        }

    try:
        df = df.copy()
        if 'close' not in df.columns:
            df.columns = [col.lower() for col in df.columns]

        current_volume = df['volume'].iloc[-1]
        avg_volume_20 = df['volume'].iloc[-20:].mean()
        volume_ratio = current_volume / avg_volume_20 if avg_volume_20 > 0 else 1.0
        current_price = df['close'].iloc[-1]

        # Calculate ATR (Average True Range)
        high_low = df['high'] - df['low']
        high_close = abs(df['high'] - df['close'].shift())
        low_close = abs(df['low'] - df['close'].shift())
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        atr = true_range.iloc[-14:].mean() if len(true_range) >= 14 else current_price * 0.02

        return {
            "current_volume": int(current_volume),
            "avg_volume_20": int(avg_volume_20),
            "volume_ratio": round(volume_ratio, 2),
            "current_price": round(current_price, 2),
            "atr": round(atr, 2)
        }

    except Exception as e:
        print(f"Error calculating volume metrics: {e}")
        return {
            "current_volume": 0,
            "avg_volume_20": 0,
            "volume_ratio": 1.0,
            "current_price": 0,
            "atr": 0
        }



if __name__ == "__main__":
    # Test
    sample_indicators = {
        "total_score": 18,
        "rsi_value": 45,
        "macd_score": 5
    }

    sample_patterns = {
        "pattern_score": 6,
        "patterns": ["bullish_engulfing"]
    }

    sample_volume = {
        "volume_ratio": 2.1,
        "current_price": 2500,
        "atr": 50
    }

    sample_fno = {
        "pcr": 1.3,
        "oi_direction": "long_buildup",
        "fii_net": 600
    }

    confidence, signal, breakdown = calculate_confidence(
        symbol="RELIANCE",
        indicators=sample_indicators,
        patterns=sample_patterns,
        volume_data=sample_volume,
        fno_data=sample_fno,
        news_score=6,
        ml_probability=0.75,
        timeframe_agreement=12
    )

    print(f"Confidence: {confidence}%")
    print(f"Signal: {signal}")
    print(f"Breakdown: {breakdown}")
