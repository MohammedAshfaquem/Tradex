import pandas as pd
from typing import Dict, Any
import warnings

try:
    import pandas_ta as ta  # pyright: ignore[reportMissingImports]
except ImportError:
    ta = None

# Suppress pandas FutureWarnings about deprecated methods
warnings.filterwarnings('ignore', category=FutureWarning)


def calculate_indicators(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculate enhanced technical indicators and return scores.

    Returns dict with indicator values and scores:
        - rsi_score: 0-6 points
        - macd_score: 0-5 points
        - ema_score: 0-5 points
        - bb_score: 0-4 points
        - vwap_score: 0-5 points
        - adx_score: 0-5 points (NEW)
        - stoch_score: 0-5 points (NEW)
        - total_score: sum of all scores (max 35 points)
    """
    if ta is None:
        return {
            "rsi_value": 50,
            "rsi_score": 0,
            "macd_value": 0,
            "macd_signal": 0,
            "macd_histogram": 0,
            "macd_score": 0,
            "ema9": 0,
            "ema21": 0,
            "ema50": 0,
            "ema_score": 0,
            "bb_upper": 0,
            "bb_middle": 0,
            "bb_lower": 0,
            "bb_score": 0,
            "vwap": 0,
            "vwap_score": 0,
            "adx": 0,
            "adx_score": 0,
            "stoch_k": 0,
            "stoch_d": 0,
            "stoch_score": 0,
            "total_score": 0,
            "error": "pandas_ta not installed"
        }

    if df.empty or len(df) < 50:
        return {
            "rsi_value": 50,
            "rsi_score": 0,
            "macd_value": 0,
            "macd_signal": 0,
            "macd_histogram": 0,
            "macd_score": 0,
            "ema9": 0,
            "ema21": 0,
            "ema50": 0,
            "ema_score": 0,
            "bb_upper": 0,
            "bb_middle": 0,
            "bb_lower": 0,
            "bb_score": 0,
            "vwap": 0,
            "vwap_score": 0,
            "adx": 0,
            "adx_score": 0,
            "stoch_k": 0,
            "stoch_d": 0,
            "stoch_score": 0,
            "total_score": 0,
            "error": "Insufficient data"
        }

    try:
        # Make a copy to avoid modifying original
        df = df.copy()

        # Ensure we have the right column names
        if 'close' not in df.columns:
            df.columns = [col.lower() for col in df.columns]

        # yfinance can occasionally produce duplicate OHLCV columns; keep first occurrence.
        if df.columns.duplicated().any():
            df = df.loc[:, ~df.columns.duplicated(keep='first')]

        # RSI(14)
        df['rsi'] = ta.rsi(df['close'], length=14)
        rsi_value = df['rsi'].iloc[-1] if not pd.isna(df['rsi'].iloc[-1]) else 50

        # RSI Score: 30-50=6pts, 50-60=4pts, 60-70=2pts, >70=-2pts, <30=+4pts (oversold reversal)
        if 30 <= rsi_value <= 50:
            rsi_score = 6
        elif 50 < rsi_value <= 60:
            rsi_score = 4
        elif 60 < rsi_value <= 70:
            rsi_score = 2
        elif rsi_value > 70:
            rsi_score = -2
        else:  # < 30
            rsi_score = 4

        # MACD
        macd = ta.macd(df['close'], fast=12, slow=26, signal=9)
        if macd is not None and not macd.empty:
            try:
                df['macd'] = macd['MACD_12_26_9']
                df['macd_signal'] = macd['MACDs_12_26_9']
                df['macd_histogram'] = macd['MACDh_12_26_9']
            except KeyError:
                try:
                    df['macd'] = macd.iloc[:, 0]
                    df['macd_signal'] = macd.iloc[:, 1]
                    df['macd_histogram'] = macd.iloc[:, 2]
                except:
                    df['macd'] = 0
                    df['macd_signal'] = 0
                    df['macd_histogram'] = 0
        else:
            df['macd'] = 0
            df['macd_signal'] = 0
            df['macd_histogram'] = 0

        macd_value = df['macd'].iloc[-1] if not pd.isna(df['macd'].iloc[-1]) else 0
        macd_signal = df['macd_signal'].iloc[-1] if not pd.isna(df['macd_signal'].iloc[-1]) else 0
        macd_histogram = df['macd_histogram'].iloc[-1] if not pd.isna(df['macd_histogram'].iloc[-1]) else 0

        # MACD Score: Fresh bullish cross=5, cross 1-3 bars ago=3, bearish cross=-4, cross 1-3 bars ago=-2
        macd_score = 0
        if len(df) >= 4:
            for i in range(1, 4):
                prev_idx = -i - 1
                curr_idx = -i
                # Bullish cross
                if (df['macd'].iloc[prev_idx] <= df['macd_signal'].iloc[prev_idx] and
                    df['macd'].iloc[curr_idx] > df['macd_signal'].iloc[curr_idx]):
                    macd_score = 5 if i == 1 else 3
                    break
                # Bearish cross
                elif (df['macd'].iloc[prev_idx] >= df['macd_signal'].iloc[prev_idx] and
                      df['macd'].iloc[curr_idx] < df['macd_signal'].iloc[curr_idx]):
                    macd_score = -4 if i == 1 else -2
                    break

            # Sustained momentum: MACD above/below signal without recent crossover
            if macd_score == 0:
                if macd_value > macd_signal and macd_histogram > 0:
                    macd_score = 2  # Sustained bullish momentum
                elif macd_value < macd_signal and macd_histogram < 0:
                    macd_score = -2  # Sustained bearish momentum

        # EMAs (9, 21, 50)
        df['ema9'] = ta.ema(df['close'], length=9)
        df['ema21'] = ta.ema(df['close'], length=21)
        df['ema50'] = ta.ema(df['close'], length=50)

        ema9 = df['ema9'].iloc[-1] if not pd.isna(df['ema9'].iloc[-1]) else 0
        ema21 = df['ema21'].iloc[-1] if not pd.isna(df['ema21'].iloc[-1]) else 0
        ema50 = df['ema50'].iloc[-1] if not pd.isna(df['ema50'].iloc[-1]) else 0

        # EMA Score: All aligned bullish=5, 2 aligned=3, all bearish=-5, 2 bearish=-3
        ema_score = 0
        if ema9 > ema21 > ema50:
            ema_score = 5
        elif ema9 < ema21 < ema50:
            ema_score = -5
        elif (ema9 > ema21) or (ema21 > ema50):
            ema_score = 3
        elif (ema9 < ema21) or (ema21 < ema50):
            ema_score = -3

        # Bollinger Bands
        bb = ta.bbands(df['close'], length=20, std=2)
        if bb is not None and not bb.empty:
            try:
                df['bb_upper'] = bb['BBU_20_2.0']
                df['bb_middle'] = bb['BBM_20_2.0']
                df['bb_lower'] = bb['BBL_20_2.0']
            except KeyError:
                try:
                    df['bb_upper'] = bb.iloc[:, 0]
                    df['bb_middle'] = bb.iloc[:, 1]
                    df['bb_lower'] = bb.iloc[:, 2]
                except:
                    df['bb_upper'] = 0
                    df['bb_middle'] = 0
                    df['bb_lower'] = 0
        else:
            df['bb_upper'] = 0
            df['bb_middle'] = 0
            df['bb_lower'] = 0

        bb_upper = df['bb_upper'].iloc[-1] if not pd.isna(df['bb_upper'].iloc[-1]) else 0
        bb_middle = df['bb_middle'].iloc[-1] if not pd.isna(df['bb_middle'].iloc[-1]) else 0
        bb_lower = df['bb_lower'].iloc[-1] if not pd.isna(df['bb_lower'].iloc[-1]) else 0
        close_price = df['close'].iloc[-1]

        # BB Score
        bb_score = 0
        if bb_lower > 0:
            bb_range = bb_upper - bb_lower
            distance_from_lower = (close_price - bb_lower) / bb_range if bb_range > 0 else 0.5

            if distance_from_lower < 0.2:
                bb_score = 4
            elif 0.4 < distance_from_lower < 0.6:
                bb_score = 2
            elif distance_from_lower > 0.8:
                bb_score = -2

        # VWAP
        vwap = 0
        vwap_score = 0
        if 'volume' in df.columns and len(df) > 0:
            high_col = df['high']
            low_col = df['low']
            close_col = df['close']
            volume_col = df['volume']

            # Defensive handling if any column still resolves to a DataFrame.
            if isinstance(high_col, pd.DataFrame):
                high_col = high_col.iloc[:, 0]
            if isinstance(low_col, pd.DataFrame):
                low_col = low_col.iloc[:, 0]
            if isinstance(close_col, pd.DataFrame):
                close_col = close_col.iloc[:, 0]
            if isinstance(volume_col, pd.DataFrame):
                volume_col = volume_col.iloc[:, 0]

            df['typical_price'] = (high_col + low_col + close_col) / 3
            df['vol_tp'] = volume_col * df['typical_price']
            
            # Check if dataframe has datetime column/index for daily reset
            if 'datetime' in df.columns:
                date_mask = pd.to_datetime(df['datetime']).dt.date
                df['cum_vol'] = volume_col.groupby(date_mask).cumsum()
                df['cum_vol_tp'] = df.groupby(date_mask)['vol_tp'].cumsum()
            elif hasattr(df.index, 'date'):
                df['cum_vol'] = volume_col.groupby(df.index.date).cumsum()
                df['cum_vol_tp'] = df.groupby(df.index.date)['vol_tp'].cumsum()
            else:
                # Fallback to overall cumulative if no date available
                df['cum_vol'] = volume_col.cumsum()
                df['cum_vol_tp'] = df['vol_tp'].cumsum()

            df['vwap'] = df['cum_vol_tp'] / df['cum_vol']
            vwap = df['vwap'].iloc[-1] if not pd.isna(df['vwap'].iloc[-1]) else 0

            if len(df) >= 2 and vwap > 0:
                prev_close = df['close'].iloc[-2]
                prev_vwap = df['vwap'].iloc[-2] if not pd.isna(df['vwap'].iloc[-2]) else vwap

                if prev_close <= prev_vwap and close_price > vwap:
                    vwap_score = 5
                elif close_price > vwap:
                    vwap_score = 3
                elif close_price < vwap:
                    vwap_score = -2

        # ADX - Trend Strength (NEW)
        adx_df = ta.adx(df['high'], df['low'], df['close'], length=14)
        adx = 25
        adx_score = 0
        if adx_df is not None and not adx_df.empty:
            try:
                adx = adx_df['ADX_14'].iloc[-1] if not pd.isna(adx_df['ADX_14'].iloc[-1]) else 25
            except:
                try:
                    adx = adx_df.iloc[:, 0].iloc[-1] if not pd.isna(adx_df.iloc[:, 0].iloc[-1]) else 25
                except:
                    adx = 25

        # ADX Score: >25 with bullish trend=5, >25 with bearish= -3
        if adx > 25 and ema9 > ema21:
            adx_score = 5
        elif adx > 25 and ema9 < ema21:
            adx_score = -3
        elif adx > 20 and ema9 > ema21:
            adx_score = 3
        elif adx > 20 and ema9 < ema21:
            adx_score = -2

        # Stochastic Oscillator (NEW)
        stoch = ta.stoch(df['high'], df['low'], df['close'], k=14, d=3)
        stoch_k = 50
        stoch_d = 50
        stoch_score = 0
        if stoch is not None and not stoch.empty:
            try:
                stoch_k = stoch['STOCHk_14_3_3'].iloc[-1] if not pd.isna(stoch['STOCHk_14_3_3'].iloc[-1]) else 50
                stoch_d = stoch['STOCHd_14_3_3'].iloc[-1] if not pd.isna(stoch['STOCHd_14_3_3'].iloc[-1]) else 50
            except:
                try:
                    stoch_k = stoch.iloc[:, 0].iloc[-1] if not pd.isna(stoch.iloc[:, 0].iloc[-1]) else 50
                    stoch_d = stoch.iloc[:, 1].iloc[-1] if not pd.isna(stoch.iloc[:, 1].iloc[-1]) else 50
                except:
                    pass

        # Stochastic Score: Oversold (<20) with bullish cross=5, <20=3, >80=-2
        if stoch_k < 20:
            if len(df) >= 2:
                try:
                    prev_k = stoch['STOCHk_14_3_3'].iloc[-2] if not pd.isna(stoch['STOCHk_14_3_3'].iloc[-2]) else 50
                    prev_d = stoch['STOCHd_14_3_3'].iloc[-2] if not pd.isna(stoch['STOCHd_14_3_3'].iloc[-2]) else 50
                except:
                    try:
                        prev_k = stoch.iloc[:, 0].iloc[-2] if not pd.isna(stoch.iloc[:, 0].iloc[-2]) else 50
                        prev_d = stoch.iloc[:, 1].iloc[-2] if not pd.isna(stoch.iloc[:, 1].iloc[-2]) else 50
                    except:
                        prev_k, prev_d = 50, 50
                
                if prev_k <= prev_d and stoch_k > stoch_d:
                    stoch_score = 5
                else:
                    stoch_score = 3
        elif stoch_k > 80:
            if len(df) >= 2:
                try:
                    prev_k = stoch['STOCHk_14_3_3'].iloc[-2] if not pd.isna(stoch['STOCHk_14_3_3'].iloc[-2]) else 50
                    prev_d = stoch['STOCHd_14_3_3'].iloc[-2] if not pd.isna(stoch['STOCHd_14_3_3'].iloc[-2]) else 50
                except:
                    try:
                        prev_k = stoch.iloc[:, 0].iloc[-2] if not pd.isna(stoch.iloc[:, 0].iloc[-2]) else 50
                        prev_d = stoch.iloc[:, 1].iloc[-2] if not pd.isna(stoch.iloc[:, 1].iloc[-2]) else 50
                    except:
                        prev_k, prev_d = 50, 50
                
                if prev_k >= prev_d and stoch_k < stoch_d:
                    stoch_score = -5 # bearish crossover
                else:
                    stoch_score = -2

        total_score = rsi_score + macd_score + ema_score + bb_score + vwap_score + adx_score + stoch_score

        return {
            "rsi_value": round(rsi_value, 2),
            "rsi_score": rsi_score,
            "macd_value": round(macd_value, 4),
            "macd_signal": round(macd_signal, 4),
            "macd_histogram": round(macd_histogram, 4),
            "macd_score": macd_score,
            "ema9": round(ema9, 2),
            "ema21": round(ema21, 2),
            "ema50": round(ema50, 2),
            "ema_score": ema_score,
            "bb_upper": round(bb_upper, 2),
            "bb_middle": round(bb_middle, 2),
            "bb_lower": round(bb_lower, 2),
            "bb_score": bb_score,
            "vwap": round(vwap, 2),
            "vwap_score": vwap_score,
            "adx": round(adx, 2),
            "adx_score": adx_score,
            "stoch_k": round(stoch_k, 2),
            "stoch_d": round(stoch_d, 2),
            "stoch_score": stoch_score,
            "total_score": total_score,
            "error": None
        }

    except Exception as e:
        return {
            "rsi_value": 50,
            "rsi_score": 0,
            "macd_value": 0,
            "macd_signal": 0,
            "macd_histogram": 0,
            "macd_score": 0,
            "ema9": 0,
            "ema21": 0,
            "ema50": 0,
            "ema_score": 0,
            "bb_upper": 0,
            "bb_middle": 0,
            "bb_lower": 0,
            "bb_score": 0,
            "vwap": 0,
            "vwap_score": 0,
            "adx": 0,
            "adx_score": 0,
            "stoch_k": 0,
            "stoch_d": 0,
            "stoch_score": 0,
            "total_score": 0,
            "error": str(e)
        }


if __name__ == "__main__":
    # Test with sample data
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from data.fetcher import get_stock_data

    df = get_stock_data("RELIANCE", "1d", "3mo")
    indicators = calculate_indicators(df)

    print("Technical Indicators for RELIANCE:")
    for key, value in indicators.items():
        print(f"{key}: {value}")
