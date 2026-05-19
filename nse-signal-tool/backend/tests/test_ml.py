import pandas as pd
import numpy as np
import sys
import os

if not hasattr(pd.Series, 'append'):
    pd.Series.append = lambda self, other, ignore_index=False, verify_integrity=False: pd.concat([self, other], ignore_index=ignore_index, verify_integrity=verify_integrity)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.predict import create_features_for_prediction

def test_feature_creation():
    dates = pd.date_range('2023-01-01', periods=250)
    data = {
        'open': np.random.uniform(90, 110, 250),
        'high': np.random.uniform(105, 115, 250),
        'low': np.random.uniform(85, 95, 250),
        'close': np.random.uniform(90, 110, 250),
        'volume': np.random.randint(1000, 10000, 250)
    }
    df = pd.DataFrame(data, index=dates)
    df.index.name = 'datetime'
    
    # changes test
    
    features = create_features_for_prediction(df)
    
    print("Generated ML features:", list(features.columns[:5]), "...")
    assert not features.empty
    assert 'ema9' in features.columns
    assert 'rsi_14' in features.columns

if __name__ == '__main__':
    test_feature_creation()
    print("All ML tests passed!")
