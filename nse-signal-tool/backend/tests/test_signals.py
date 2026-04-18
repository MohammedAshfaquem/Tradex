import pandas as pd
import numpy as np
import sys
import os

if not hasattr(pd.Series, 'append'):
    pd.Series.append = lambda self, other, ignore_index=False, verify_integrity=False: pd.concat([self, other], ignore_index=ignore_index, verify_integrity=verify_integrity)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from signals.indicators import calculate_indicators
from signals.patterns import detect_patterns
from signals.aggregator import calculate_confidence

def test_rsi_scoring():
    # Create mock dataframe with 100 rows to ensure MACD/EMA can initialize
    dates = pd.date_range('2023-01-01', periods=100)
    data = {
        'open': np.ones(100) * 100,
        'high': np.ones(100) * 105,
        'low': np.ones(100) * 95,
        'close': np.linspace(100, 80, 100), # Downtrend
        'volume': np.ones(100) * 1000
    }
    df = pd.DataFrame(data, index=dates)
    df.index.name = 'datetime'
    
    # Calculate indicators
    result = calculate_indicators(df)
    
    print("Indicator results keys:", list(result.keys()))
    assert 'rsi_score' in result
    
def test_aggregator_sell_signal():
    # Force a negative score to trigger SELL
    indicators = {'total_score': -30, 'breakdown': {}}
    patterns = {'total_score': -10, 'patterns': ['evening_star']}
    volume_data = {'volume_ratio': 0.3, 'current_price': 100, 'atr': 2}
    
    confidence, signal, breakdown = calculate_confidence(
        symbol='TEST',
        indicators=indicators,
        patterns=patterns,
        volume_data=volume_data,
        fno_data={},
        news_score=-5,
        ml_probability=0.1,
        timeframe_agreement=-10
    )
    
    print(f"Signal: {signal}, Confidence: {confidence}")
    assert signal == "SELL"
    assert confidence <= 35
    # Risk reward for SELL should be positive
    assert breakdown['risk_reward'] >= 0

if __name__ == '__main__':
    test_rsi_scoring()
    test_aggregator_sell_signal()
    print("All signal tests passed!")
