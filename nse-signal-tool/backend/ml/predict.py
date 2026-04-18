import pandas as pd
import pickle
import os
import warnings

# Suppress pandas FutureWarnings about deprecated methods
warnings.filterwarnings('ignore', category=FutureWarning)


def predict_signal(df: pd.DataFrame) -> float:
    """
    Load trained model and predict probability of price increase.

    Args:
        df: DataFrame with OHLCV data

    Returns:
        Probability float 0.0-1.0
    """
    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')

    # Check if model exists
    if not os.path.exists(model_path):
        print("⚠ Model not found. Run train.py first.")
        return 0.5  # Neutral probability

    try:
        # Load model and feature columns
        with open(model_path, 'rb') as f:
            model, feature_cols = pickle.load(f)

        # Create features from dataframe
        features_df = create_features_for_prediction(df)

        if features_df.empty:
            print("⚠ Could not create features from data")
            return 0.5

        # Feature validation
        missing_cols = [col for col in feature_cols if col not in features_df.columns]
        if missing_cols:
            print(f"⚠ Warning: Missing features for prediction: {missing_cols}")
            for col in missing_cols:
                features_df[col] = 0

        # Get the latest row features
        X = features_df[feature_cols].iloc[-1:].fillna(0)

        # Predict probability
        probability = model.predict_proba(X)[0][1]  # Probability of class 1 (price increase)

        return float(probability)

    except Exception as e:
        print(f"Error in prediction: {e}")
        return 0.5


def create_features_for_prediction(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create enhanced features for prediction (same as training but without label).
    Uses same indicators as training pipeline for consistency.
    """
    if df.empty or len(df) < 50:
        return pd.DataFrame()

    df = df.copy()

    # Ensure lowercase columns
    if 'close' not in df.columns:
        df.columns = [col.lower() for col in df.columns]

    # Import indicators from same module used in training
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from indicators import (
        sma, ema, rsi, macd, bollinger_bands, atr,
        stochastic, adx, obv, roc
    )

    # === MOMENTUM INDICATORS ===
    df['rsi_14'] = rsi(df['close'], length=14)
    df['rsi_9'] = rsi(df['close'], length=9)
    df['rsi_21'] = rsi(df['close'], length=21)

    # MACD
    macd_df = macd(df['close'], fast=12, slow=26, signal=9)
    df['macd'] = macd_df['macd']
    df['macd_signal'] = macd_df['signal']
    df['macd_hist'] = macd_df['histogram']

    # Stochastic Oscillator
    stoch_df = stochastic(df['high'], df['low'], df['close'], k_length=14, d_length=3)
    df['stoch_k'] = stoch_df['k']
    df['stoch_d'] = stoch_df['d']

    # === TREND INDICATORS ===
    df['ema9'] = ema(df['close'], length=9)
    df['ema21'] = ema(df['close'], length=21)
    df['ema50'] = ema(df['close'], length=50)
    df['ema200'] = ema(df['close'], length=200)

    # ADX - Trend Strength
    adx_df = adx(df['high'], df['low'], df['close'], length=14)
    df['adx'] = adx_df['adx'].fillna(25)

    # === VOLATILITY INDICATORS ===
    bb_df = bollinger_bands(df['close'], length=20, std=2)
    df['bb_lower'] = bb_df['lower']
    df['bb_middle'] = bb_df['middle']
    df['bb_upper'] = bb_df['upper']
    df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
    df['bb_width'] = df['bb_width'].fillna(0)
    df['bb_pct'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
    df['bb_pct'] = df['bb_pct'].fillna(0.5)

    # ATR - Average True Range
    df['atr'] = atr(df['high'], df['low'], df['close'], length=14)

    # === VOLUME INDICATORS ===
    df['volume_sma_20'] = sma(df['volume'], length=20)
    df['volume_ratio'] = df['volume'] / df['volume_sma_20']
    df['volume_ratio'] = df['volume_ratio'].fillna(1)
    df['volume_trend'] = df['volume'].rolling(5).mean() / df['volume'].rolling(20).mean()
    df['volume_trend'] = df['volume_trend'].fillna(1)

    # OBV - On Balance Volume
    df['obv'] = obv(df['close'], df['volume'])
    df['obv_ema'] = ema(df['obv'], length=20)

    # === PRICE ACTION ===
    df['price_change_1d'] = df['close'].pct_change(1)
    df['price_change_3d'] = df['close'].pct_change(3)
    df['price_change_5d'] = df['close'].pct_change(5)
    df['price_change_10d'] = df['close'].pct_change(10)

    df['roc_5'] = roc(df['close'], length=5)
    df['roc_10'] = roc(df['close'], length=10)

    df['hl_ratio'] = (df['high'] - df['low']) / df['close']
    df['close_loc'] = (df['close'] - df['low']) / (df['high'] - df['low'])
    df['close_loc'] = df['close_loc'].fillna(0.5)

    # === MA CROSSOVERS ===
    df['ema9_21_cross'] = (df['ema9'] > df['ema21']).astype(int)
    df['ema21_50_cross'] = (df['ema21'] > df['ema50']).astype(int)
    df['price_ema50_cross'] = (df['close'] > df['ema50']).astype(int)

    # === MEAN REVERSION ===
    df['dist_ema20'] = (df['close'] - df['ema21']) / df['ema21']
    df['dist_ema50'] = (df['close'] - df['ema50']) / df['ema50']
    df['dist_ema20'] = df['dist_ema20'].fillna(0)
    df['dist_ema50'] = df['dist_ema50'].fillna(0)

    # === VOLATILITY SQUEEZE ===
    df['bb_width_pctile'] = df['bb_width'].rolling(100).rank(pct=True)
    df['bb_width_pctile'] = df['bb_width_pctile'].fillna(0.5)

    df['atr_pct'] = df['atr'] / df['close']
    df['atr_pct'] = df['atr_pct'].fillna(0)

    # === VOLUME SPIKE ===
    df['vol_spike'] = df['volume'] / df['volume'].rolling(20).max()
    df['vol_spike'] = df['vol_spike'].fillna(0.5)

    # === CONSECUTIVE DIRECTION ===
    df['up_day'] = (df['close'] > df['close'].shift(1)).astype(int)
    df['consec_up'] = df['up_day'].groupby((df['up_day'] != df['up_day'].shift()).cumsum()).cumcount() + 1
    df['consec_up'] = df['consec_up'] * df['up_day']
    df['consec_down'] = (1 - df['up_day']).groupby(((1 - df['up_day']) != (1 - df['up_day']).shift()).cumsum()).cumcount() + 1
    df['consec_down'] = df['consec_down'] * (1 - df['up_day'])

    # === RSI RATE OF CHANGE ===
    df['rsi_roc'] = df['rsi_14'] - df['rsi_14'].shift(3)
    df['rsi_roc'] = df['rsi_roc'].fillna(0)

    # === TIME FEATURES ===
    if 'datetime' in df.columns:
        df['datetime'] = pd.to_datetime(df['datetime'])
        df['day_of_week'] = df['datetime'].dt.dayofweek
        df['month'] = df['datetime'].dt.month
        df['quarter'] = df['datetime'].dt.quarter
    else:
        df['day_of_week'] = 0
        df['month'] = 1
        df['quarter'] = 1

    return df


if __name__ == "__main__":
    # Test prediction
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from data.fetcher import get_stock_data

    df = get_stock_data("RELIANCE", "1d", "6mo")
    prob = predict_signal(df)
    print(f"ML prediction probability for RELIANCE: {prob:.2%}")
