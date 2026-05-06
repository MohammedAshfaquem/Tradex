import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import pickle
import os
import sys
import warnings

# Suppress pandas FutureWarnings about deprecated methods
warnings.filterwarnings('ignore', category=FutureWarning)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.fetcher import get_stock_data

# Expanded training stocks for better model generalization
TRAINING_STOCKS = [
    # Large Cap - IT
    "TCS", "INFY", "WIPRO", "HCLTECH", "TECHM",
    # Large Cap - Banking
    "HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK",
    # Large Cap - Energy & Utilities
    "RELIANCE", "ONGC", "NTPC", "POWERGRID", "BPCL",
    # Large Cap - Auto
    "MARUTI", "TRENT", "M&M", "BAJAJ-AUTO", "EICHERMOT",
    # Large Cap - FMCG & Pharma
    "HINDUNILVR", "ITC", "NESTLEIND", "SUNPHARMA", "DRREDDY",
    # Large Cap - Metals & Industrials
    "LT", "BHARTIARTL", "ASIANPAINT", "TATASTEEL", "HINDALCO"
]


def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create enhanced features for ML model from OHLCV data with advanced indicators.
    """
    if df.empty or len(df) < 50:
        return pd.DataFrame()

    df = df.copy()

    # Ensure lowercase columns
    df.columns = [col.lower() for col in df.columns]

    from .indicators import (
        sma, ema, rsi, macd, bollinger_bands, atr,
        stochastic, adx, obv, roc
    )

    # === MOMENTUM INDICATORS ===
    # RSI - Multiple timeframes
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
    # EMAs - Multiple timeframes
    df['ema9'] = ema(df['close'], length=9)
    df['ema21'] = ema(df['close'], length=21)
    df['ema50'] = ema(df['close'], length=50)
    df['ema200'] = ema(df['close'], length=200)

    # ADX - Trend Strength
    adx_df = adx(df['high'], df['low'], df['close'], length=14)
    df['adx'] = adx_df['adx'].fillna(25)

    # === VOLATILITY INDICATORS ===
    # Bollinger Bands
    bb_df = bollinger_bands(df['close'], length=20, std=2)
    df['bb_lower'] = bb_df['lower']
    df['bb_middle'] = bb_df['middle']
    df['bb_upper'] = bb_df['upper']
    # Bollinger Band Width - volatility measure
    df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']
    df['bb_width'] = df['bb_width'].fillna(0)
    # Bollinger %B - position within bands
    df['bb_pct'] = (df['close'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
    df['bb_pct'] = df['bb_pct'].fillna(0.5)

    # ATR - Average True Range
    df['atr'] = atr(df['high'], df['low'], df['close'], length=14)

    # === VOLUME INDICATORS ===
    # Volume ratio and trends
    df['volume_sma_20'] = sma(df['volume'], length=20)
    df['volume_ratio'] = df['volume'] / df['volume_sma_20']
    df['volume_ratio'] = df['volume_ratio'].fillna(1)
    df['volume_trend'] = df['volume'].rolling(5).mean() / df['volume'].rolling(20).mean()
    df['volume_trend'] = df['volume_trend'].fillna(1)

    # OBV - On Balance Volume
    df['obv'] = obv(df['close'], df['volume'])
    df['obv_ema'] = ema(df['obv'], length=20)

    # === PRICE ACTION ===
    # Price changes - Multiple timeframes
    df['price_change_1d'] = df['close'].pct_change(1)
    df['price_change_3d'] = df['close'].pct_change(3)
    df['price_change_5d'] = df['close'].pct_change(5)
    df['price_change_10d'] = df['close'].pct_change(10)

    # Price momentum
    df['roc_5'] = roc(df['close'], length=5)
    df['roc_10'] = roc(df['close'], length=10)

    # High-Low relationship
    df['hl_ratio'] = (df['high'] - df['low']) / df['close']
    df['close_loc'] = (df['close'] - df['low']) / (df['high'] - df['low'])
    df['close_loc'] = df['close_loc'].fillna(0.5)

    # === MA CROSSOVERS ===
    df['ema9_21_cross'] = (df['ema9'] > df['ema21']).astype(int)
    df['ema21_50_cross'] = (df['ema21'] > df['ema50']).astype(int)
    df['price_ema50_cross'] = (df['close'] > df['ema50']).astype(int)

    # === MEAN REVERSION ===
    # Distance from key MAs (how stretched price is)
    df['dist_ema20'] = (df['close'] - df['ema21']) / df['ema21']
    df['dist_ema50'] = (df['close'] - df['ema50']) / df['ema50']
    df['dist_ema20'] = df['dist_ema20'].fillna(0)
    df['dist_ema50'] = df['dist_ema50'].fillna(0)

    # === VOLATILITY SQUEEZE ===
    # Low BB width = coiling volatility
    df['bb_width_pctile'] = df['bb_width'].rolling(100).rank(pct=True)
    df['bb_width_pctile'] = df['bb_width_pctile'].fillna(0.5)

    # ATR as percentage of price
    df['atr_pct'] = df['atr'] / df['close']
    df['atr_pct'] = df['atr_pct'].fillna(0)

    # === VOLUME SPIKE ===
    # Volume relative to recent max
    df['vol_spike'] = df['volume'] / df['volume'].rolling(20).max()
    df['vol_spike'] = df['vol_spike'].fillna(0.5)

    # === CONSECUTIVE DIRECTION ===
    # Number of consecutive up/down days
    df['up_day'] = (df['close'] > df['close'].shift(1)).astype(int)
    df['consec_up'] = df['up_day'].groupby((df['up_day'] != df['up_day'].shift()).cumsum()).cumcount() + 1
    df['consec_up'] = df['consec_up'] * df['up_day']  # 0 for down days
    df['consec_down'] = (1 - df['up_day']).groupby(((1 - df['up_day']) != (1 - df['up_day']).shift()).cumsum()).cumcount() + 1
    df['consec_down'] = df['consec_down'] * (1 - df['up_day'])  # 0 for up days

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

    # === TARGET LABEL ===
    # Future return over 5 days
    df['future_return'] = df['close'].shift(-5) / df['close'] - 1

    # Volatility adjusted thresholds using ATR
    df['target_return'] = df['atr'] / df['close']
    df['target_return'] = df['target_return'].clip(lower=0.01, upper=0.04)

    # Dead zone: ignore signals where future move is within noise range
    # BUY = 1 when future return exceeds target, SELL/HOLD = 0 otherwise
    # Drop rows where move is too small (noise) to improve signal quality
    noise_threshold = df['target_return'] * 0.4
    df['label'] = (df['future_return'] > df['target_return']).astype(int)
    # Mark noise rows for removal (weak moves that confuse the model)
    df['is_noise'] = (df['future_return'].abs() < noise_threshold)
    df = df[~df['is_noise']].drop(columns=['is_noise'])

    # Drop NaN
    df = df.dropna()

    return df


def train_model():
    print("Starting ML model training...")
    print(f"Training on {len(TRAINING_STOCKS)} stocks: {', '.join(TRAINING_STOCKS)}")

    all_data = []

    for idx, symbol in enumerate(TRAINING_STOCKS, 1):
        print(f"Fetching data for {symbol}... ({idx}/{len(TRAINING_STOCKS)})")
        df = get_stock_data(symbol, timeframe="1d", period="5y")

        if df.empty:
            print(f"  [WARN] No data for {symbol}, skipping")
            continue

        features_df = create_features(df)

        if features_df.empty:
            print(f"  [WARN] Could not create features for {symbol}, skipping")
            continue

        features_df['symbol'] = symbol
        all_data.append(features_df)
        print(f"  [OK] Added {len(features_df)} samples from {symbol}")
        
        # Small delay every 5 stocks to avoid overwhelming the API
        if idx % 5 == 0 and idx < len(TRAINING_STOCKS):
            print(f"  [PAUSE] Cooling down for 3 seconds...")
            import time
            time.sleep(3)

    if not all_data:
        print("[ERROR] No data available for training!")
        return

    combined_df = pd.concat(all_data, ignore_index=True)
    if 'datetime' in combined_df.columns:
        combined_df['datetime'] = pd.to_datetime(combined_df['datetime'])
        combined_df = combined_df.sort_values('datetime').reset_index(drop=True)
    print(f"\nTotal samples: {len(combined_df)}")

    feature_cols = [
        # Momentum indicators (relative/normalized - these generalize across stocks)
        'rsi_14', 'rsi_9', 'rsi_21', 'macd_hist',
        'stoch_k', 'stoch_d',
        # Trend indicators (relative)
        'adx',
        # Volatility indicators (relative/normalized)
        'bb_width', 'bb_pct', 'atr_pct',
        # Volume indicators (ratios - stock-independent)
        'volume_ratio', 'volume_trend',
        # Price action (returns - stock-independent)
        'price_change_1d', 'price_change_3d', 'price_change_5d', 'price_change_10d',
        'roc_5', 'roc_10', 'hl_ratio', 'close_loc',
        # MA crossovers (binary - stock-independent)
        'ema9_21_cross', 'ema21_50_cross', 'price_ema50_cross',
        # Mean reversion (relative distance)
        'dist_ema20', 'dist_ema50',
        # Volatility squeeze (percentile rank)
        'bb_width_pctile',
        # Volume spike (ratio)
        'vol_spike',
        # Consecutive direction
        'consec_up', 'consec_down',
        # RSI momentum
        'rsi_roc',
        # Time features (keep day_of_week only - expiry effects; drop month/quarter - calendar overfitting)
        'day_of_week'
    ]

    X = combined_df[feature_cols]
    y = combined_df['label']

    print(f"Features shape: {X.shape}")
    pos_count = y.sum()
    neg_count = len(y) - pos_count
    scale_pos_weight = float(neg_count / pos_count) if pos_count > 0 else 1.0
    print(f"Labels distribution: {y.value_counts().to_dict()}")
    print(f"Scale pos weight: {scale_pos_weight:.2f}")

    print("\nPerforming walk-forward validation...")
    tscv = TimeSeriesSplit(n_splits=5)

    accuracies, precisions, recalls, f1_scores = [], [], [], []

    for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):
        val_size = int(len(train_idx) * 0.2)
        if val_size == 0:
            val_size = 1
        actual_train_idx = train_idx[:-val_size]
        val_idx = train_idx[-val_size:]

        X_train, y_train = X.iloc[actual_train_idx], y.iloc[actual_train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
        X_test, y_test = X.iloc[test_idx], y.iloc[test_idx]

        model = XGBClassifier(
            n_estimators=500,
            max_depth=4,
            learning_rate=0.02,
            min_child_weight=10,
            gamma=0.5,
            subsample=0.7,
            colsample_bytree=0.6,
            reg_alpha=1.0,
            reg_lambda=3.0,
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            eval_metric='logloss',
            early_stopping_rounds=25
        )

        eval_set = [(X_val, y_val)]
        model.fit(X_train, y_train, eval_set=eval_set, verbose=False)
        y_pred = model.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)

        accuracies.append(acc)
        precisions.append(prec)
        recalls.append(rec)
        f1_scores.append(f1)

        print(f"  Fold {fold + 1}: Accuracy={acc:.3f}, Precision={prec:.3f}, Recall={rec:.3f}, F1={f1:.3f}")

    print("\n" + "=" * 60)
    print("WALK-FORWARD VALIDATION RESULTS")
    print("=" * 60)
    print(f"Average Accuracy:  {np.mean(accuracies):.3f}")
    print(f"Average Precision: {np.mean(precisions):.3f}")
    print(f"Average Recall:    {np.mean(recalls):.3f}")
    print(f"Average F1 Score:  {np.mean(f1_scores):.3f}")
    print("=" * 60)

    print("\nTraining final model on all data...")
    final_model = XGBClassifier(
        n_estimators=500,
        max_depth=4,
        learning_rate=0.02,
        min_child_weight=10,
        gamma=0.5,
        subsample=0.7,
        colsample_bytree=0.6,
        reg_alpha=1.0,
        reg_lambda=3.0,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric='logloss'
    )

    final_model.fit(X, y, verbose=False)

    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump((final_model, feature_cols), f)

    print(f"\n[OK] Model saved to {model_path}")

    print("\nTop 10 Feature Importances:")
    importances = final_model.feature_importances_
    feature_importance = sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True)

    for i, (feat, importance) in enumerate(feature_importance[:10], 1):
        print(f"  {i}. {feat}: {importance:.4f}")


if __name__ == "__main__":
    train_model()