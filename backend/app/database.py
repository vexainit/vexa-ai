"""SQLAlchemy 2.0 engine & session management (SQLite local / Google Cloud SQL PostgreSQL)."""
from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

is_sqlite = settings.database_url.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}
engine_kwargs = {"connect_args": connect_args, "future": True}
if not is_sqlite:
    # Cloud SQL PostgreSQL connection pooling hygiene for Cloud Run
    engine_kwargs.update({"pool_pre_ping": True, "pool_size": 5, "max_overflow": 10})

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
