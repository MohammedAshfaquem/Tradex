from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from .models import Base, Signal, StockCache, BacktestResult, Watchlist
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./nse_signals.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
SessionScoped = scoped_session(SessionLocal)


def init_db():
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database initialized")


def get_db_session():
    return SessionLocal()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Always safe to run — won't overwrite existing data
init_db()