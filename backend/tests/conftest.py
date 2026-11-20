"""Pytest fixtures for isolated SQLite test DB and FastAPI TestClient."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import Base, SessionLocal, engine
from app.main import app
from app.services.seed_demo import seed_demo_data


@pytest.fixture(scope="module")
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db, force=True)
    finally:
        db.close()
    with TestClient(app) as c:
        yield c
