from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .models import Base, Signal, StockCache, BacktestResult, Watchlist
import os

# Database file path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'nse_signals.db')
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # Needed for SQLite
    echo=False  # Set to True for SQL debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionScoped = scoped_session(SessionLocal)


def init_db():
    """Initialize database - create all tables."""
    print(f"Initializing database at {DB_PATH}")
    Base.metadata.create_all(bind=engine)
    print("✓ Database initialized")
    print("ℹ️  No default watchlist. Add stocks via API or manually.")


def get_db_session():
    """Get a new database session."""
    return SessionLocal()


def get_db():
    """Dependency for FastAPI to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize database on module import
if not os.path.exists(DB_PATH):
    init_db()


if __name__ == "__main__":
    # Test database
    init_db()

    session = get_db_session()

    # Test adding a signal
    from datetime import datetime
    test_signal = Signal(
        symbol="RELIANCE",
        timestamp=datetime.now(),
        signal="BUY",
        confidence=78.5,
        entry_price=2520.0,
        target=2600.0,
        stoploss=2470.0,
        reason="Strong technical setup with FII support",
        breakdown_json='{"technical": 20, "patterns": 6, "volume": 6, "fno": 8, "news": 6, "ml": 12}'
    )

    session.add(test_signal)
    session.commit()

    print("✓ Test signal added")

    # Query signals
    signals = session.query(Signal).filter_by(symbol="RELIANCE").all()
    print(f"Found {len(signals)} signals for RELIANCE")

    session.close()
