from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Signal(Base):
    """Store generated trading signals."""
    __tablename__ = 'signals'

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(20), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.now, nullable=False, index=True)
    signal = Column(String(10), nullable=False)  # BUY, SELL, SKIP, WATCH
    confidence = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=True)
    target = Column(Float, nullable=True)
    stoploss = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    breakdown_json = Column(Text, nullable=True)  # JSON string of score breakdown

    def __repr__(self):
        return f"<Signal(symbol={self.symbol}, signal={self.signal}, confidence={self.confidence}%)>"


class StockCache(Base):
    """Cache fetched stock data to reduce API calls."""
    __tablename__ = 'stock_cache'

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(20), nullable=False, index=True)
    timeframe = Column(String(10), nullable=False, index=True)
    data_json = Column(Text, nullable=False)  # JSON string of OHLCV data
    fetched_at = Column(DateTime, default=datetime.now, nullable=False)

    def __repr__(self):
        return f"<StockCache(symbol={self.symbol}, timeframe={self.timeframe})>"


class BacktestResult(Base):
    """Store backtest results."""
    __tablename__ = 'backtest_results'

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_date = Column(DateTime, default=datetime.now, nullable=False)
    accuracy = Column(Float, nullable=True)
    win_rate = Column(Float, nullable=True)
    total_trades = Column(Integer, nullable=True)
    avg_profit = Column(Float, nullable=True)
    avg_loss = Column(Float, nullable=True)
    rr_ratio = Column(Float, nullable=True)
    results_json = Column(Text, nullable=True)  # Full results as JSON

    def __repr__(self):
        return f"<BacktestResult(date={self.run_date}, accuracy={self.accuracy}%)>"


class Watchlist(Base):
    """User's watchlist of stocks."""
    __tablename__ = 'watchlist'

    id = Column(Integer, primary_key=True, autoincrement=True)
    symbol = Column(String(20), nullable=False, unique=True, index=True)
    added_at = Column(DateTime, default=datetime.now, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<Watchlist(symbol={self.symbol}, active={self.is_active})>"
