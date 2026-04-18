"""
Technical indicators module - compatible with pandas 2.0+
Replaces outdated pandas_ta functionality
"""
import pandas as pd
import numpy as np


def sma(series: pd.Series, length: int = 20) -> pd.Series:
    """Simple Moving Average"""
    return series.rolling(window=length).mean()


def ema(series: pd.Series, length: int = 20) -> pd.Series:
    """Exponential Moving Average"""
    return series.ewm(span=length, adjust=False).mean()


def rsi(series: pd.Series, length: int = 14) -> pd.Series:
    """Relative Strength Index"""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=length).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=length).mean()
    rs = gain / loss
    rsi_values = 100 - (100 / (1 + rs))
    return rsi_values


def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """MACD - returns DataFrame with columns: MACD, Signal, Histogram"""
    fast_ema = ema(series, fast)
    slow_ema = ema(series, slow)
    macd_line = fast_ema - slow_ema
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return pd.DataFrame({
        'macd': macd_line,
        'signal': signal_line,
        'histogram': histogram
    })


def bollinger_bands(series: pd.Series, length: int = 20, std: float = 2):
    """Bollinger Bands - returns DataFrame with columns: Upper, Middle, Lower"""
    middle = sma(series, length)
    std_dev = series.rolling(window=length).std()
    upper = middle + (std * std_dev)
    lower = middle - (std * std_dev)
    return pd.DataFrame({
        'upper': upper,
        'middle': middle,
        'lower': lower
    })


def atr(high: pd.Series, low: pd.Series, close: pd.Series, length: int = 14) -> pd.Series:
    """Average True Range"""
    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr_val = tr.rolling(window=length).mean()
    return atr_val


def stochastic(high: pd.Series, low: pd.Series, close: pd.Series,
               k_length: int = 14, d_length: int = 3):
    """Stochastic Oscillator - returns DataFrame with columns: K, D"""
    lowest_low = low.rolling(window=k_length).min()
    highest_high = high.rolling(window=k_length).max()
    k = 100 * ((close - lowest_low) / (highest_high - lowest_low))
    d = k.rolling(window=d_length).mean()
    return pd.DataFrame({
        'k': k,
        'd': d
    })


def adx(high: pd.Series, low: pd.Series, close: pd.Series, length: int = 14):
    """Average Directional Index (simplified)"""
    # Positive and negative directional movements
    up = high.diff()
    down = -low.diff()

    pos_dm = np.where((up > down) & (up > 0), up, 0)
    neg_dm = np.where((down > up) & (down > 0), down, 0)

    tr1 = high - low
    tr2 = abs(high - close.shift())
    tr3 = abs(low - close.shift())
    tr = pd.concat([pd.Series(tr1), pd.Series(tr2), pd.Series(tr3)], axis=1).max(axis=1)

    atr_val = tr.rolling(window=length).mean()

    pos_di = 100 * (pd.Series(pos_dm).rolling(window=length).mean() / atr_val)
    neg_di = 100 * (pd.Series(neg_dm).rolling(window=length).mean() / atr_val)

    di_diff = abs(pos_di - neg_di)
    di_sum = pos_di + neg_di
    di_ratio = 100 * (di_diff / di_sum)

    adx_val = di_ratio.rolling(window=length).mean()
    return pd.DataFrame({'adx': adx_val})


def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """On-Balance Volume"""
    direction = np.sign(close.diff())
    obv_val = (direction * volume).fillna(0).cumsum()
    return obv_val


def roc(series: pd.Series, length: int = 12) -> pd.Series:
    """Rate of Change"""
    return ((series - series.shift(length)) / series.shift(length)) * 100
