import pandas as pd
import numpy as np
from datetime import datetime
import pickle
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.fetcher import get_stock_data
from ml.predict import create_features_for_prediction


# Includes both training stocks and out-of-sample stocks for backtesting
BACKTEST_STOCKS = [
    # Training
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "SBIN", "AXISBANK", "WIPRO", "LT", "MARUTI",
    # Out of sample
    "ITC", "HINDUNILVR", "TRENT", "SUNPHARMA", "BAJFINANCE"
]


def backtest_model():
    """
    Run walk-forward backtest on all training stocks.

    Prints:
        - Accuracy per stock
        - Overall accuracy
        - Win rate
        - Average profit/loss
        - Risk/reward ratio
    """
    print("="*60)
    print("BACKTESTING ML MODEL")
    print("="*60)

    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')

    if not os.path.exists(model_path):
        print("❌ Model not found. Run train.py first.")
        return

    # Load model
    with open(model_path, 'rb') as f:
        model, feature_cols = pickle.load(f)

    results_by_stock = {}
    all_trades = []

    for symbol in BACKTEST_STOCKS:
        print(f"\nBacktesting {symbol}...")

        # Fetch data
        df = get_stock_data(symbol, timeframe="1d", period="3y")

        if df.empty:
            print(f"  ⚠ No data available")
            continue

        # Create features
        features_df = create_features_for_prediction(df)

        if features_df.empty or len(features_df) < 50:
            print(f"  ⚠ Insufficient data")
            continue

        # Prepare features
        X = features_df[feature_cols].fillna(0)

        # Predict probabilities
        probabilities = model.predict_proba(X)[:, 1]

        # --- ML directional accuracy ---
        # Check how often the model correctly predicts next-day direction
        correct_dir = 0
        total_dir = 0
        for i in range(len(features_df) - 1):
            pred_up = probabilities[i] > 0.5
            actual_up = features_df['close'].iloc[i + 1] > features_df['close'].iloc[i]
            if pred_up == actual_up:
                correct_dir += 1
            total_dir += 1
        if total_dir > 0:
            stock_ml_accuracy = correct_dir / total_dir * 100
        else:
            stock_ml_accuracy = 0

        # Simulate trading
        trades = []
        in_position = False
        entry_price = 0
        stop_loss = 0
        target = 0
        entry_idx = 0

        for i in range(len(features_df) - 10):  # Leave buffer at end
            prob = probabilities[i]
            current_close = features_df['close'].iloc[i]
            current_low = features_df['low'].iloc[i]
            current_high = features_df['high'].iloc[i]

            if in_position:
                # Check stop loss and target on current candle
                if current_low <= stop_loss:
                    exit_price = stop_loss
                    profit_pct = ((exit_price / entry_price) - 1) * 100 - 0.1 # 0.1% slippage
                    trades.append({
                        'symbol': symbol,
                        'entry_price': entry_price,
                        'exit_price': exit_price,
                        'profit_pct': profit_pct,
                        'win': False
                    })
                    in_position = False
                elif current_high >= target:
                    exit_price = target
                    profit_pct = ((exit_price / entry_price) - 1) * 100 - 0.1
                    trades.append({
                        'symbol': symbol,
                        'entry_price': entry_price,
                        'exit_price': exit_price,
                        'profit_pct': profit_pct,
                        'win': True
                    })
                    in_position = False
                elif i >= entry_idx + 5:
                    # Time-based exit after 5 days
                    exit_price = current_close
                    profit_pct = ((exit_price / entry_price) - 1) * 100 - 0.1
                    trades.append({
                        'symbol': symbol,
                        'entry_price': entry_price,
                        'exit_price': exit_price,
                        'profit_pct': profit_pct,
                        'win': profit_pct > 0
                    })
                    in_position = False

            # Predict for NEXT candle entry
            if not in_position and prob > 0.65:
                in_position = True
                entry_price = current_close
                entry_idx = i
                atr_val = features_df['atr'].iloc[i] if 'atr' in features_df.columns else current_close * 0.02
                stop_loss = entry_price - (atr_val * 1.5)
                # target volatility adjusted
                target_pct = atr_val / current_close
                target_pct = max(0.01, min(0.04, target_pct))
                target = entry_price * (1 + target_pct)

        if trades:
            wins = sum(1 for t in trades if t['win'])
            win_rate = wins / len(trades) * 100
            avg_profit = np.mean([t['profit_pct'] for t in trades if t['win']]) if wins > 0 else 0
            avg_loss = np.mean([t['profit_pct'] for t in trades if not t['win']]) if (len(trades) - wins) > 0 else 0

            results_by_stock[symbol] = {
                'total_trades': len(trades),
                'wins': wins,
                'losses': len(trades) - wins,
                'win_rate': win_rate,
                'avg_profit': avg_profit,
                'avg_loss': avg_loss,
                'rr_ratio': abs(avg_profit / avg_loss) if avg_loss != 0 else 0,
                'ml_accuracy': round(stock_ml_accuracy, 1)
            }

            all_trades.extend(trades)

            print(f"  Trades: {len(trades)} | Win Rate: {win_rate:.1f}% | Avg Profit: {avg_profit:.2f}% | Avg Loss: {avg_loss:.2f}%")
        else:
            print(f"  No trades generated")

    # Overall results
    print("\n" + "="*60)
    print("OVERALL BACKTEST RESULTS")
    print("="*60)

    if all_trades:
        total_trades = len(all_trades)
        total_wins = sum(1 for t in all_trades if t['win'])
        overall_win_rate = total_wins / total_trades * 100

        winning_trades = [t['profit_pct'] for t in all_trades if t['win']]
        losing_trades = [t['profit_pct'] for t in all_trades if not t['win']]

        avg_profit = np.mean(winning_trades) if winning_trades else 0
        avg_loss = np.mean(losing_trades) if losing_trades else 0
        rr_ratio = abs(avg_profit / avg_loss) if avg_loss != 0 else 0

        # Compute overall ML directional accuracy across all stocks
        ml_accuracies = [s['ml_accuracy'] for s in results_by_stock.values() if 'ml_accuracy' in s]
        overall_ml_accuracy = round(np.mean(ml_accuracies), 1) if ml_accuracies else 0

        print(f"Total Trades: {total_trades}")
        print(f"Wins: {total_wins} | Losses: {total_trades - total_wins}")
        print(f"Overall Win Rate: {overall_win_rate:.2f}%")
        print(f"ML Directional Accuracy: {overall_ml_accuracy:.1f}%")
        print(f"Average Profit per Trade: {avg_profit:.2f}%")
        print(f"Average Loss per Trade: {avg_loss:.2f}%")
        print(f"Risk/Reward Ratio: {rr_ratio:.2f}")
        print("="*60)

        # Per-stock table
        print("\nPER-STOCK RESULTS:")
        print("-"*80)
        print(f"{'Stock':<12} {'Trades':<8} {'Win Rate':<12} {'Avg Profit':<12} {'Avg Loss':<12} {'R/R':<8}")
        print("-"*80)

        for symbol, stats in results_by_stock.items():
            print(f"{symbol:<12} {stats['total_trades']:<8} {stats['win_rate']:<11.1f}% {stats['avg_profit']:<11.2f}% {stats['avg_loss']:<11.2f}% {stats['rr_ratio']:<8.2f}")

        print("-"*80)

        # Save results
        results = {
            'run_date': datetime.now().isoformat(),
            'total_trades': total_trades,
            'overall_win_rate': overall_win_rate,
            'ml_accuracy': overall_ml_accuracy,
            'avg_profit': avg_profit,
            'avg_loss': avg_loss,
            'rr_ratio': rr_ratio,
            'by_stock': results_by_stock,
            'all_trades': all_trades
        }

        return results

    else:
        print("No trades generated during backtest")
        return None


if __name__ == "__main__":
    backtest_model()
