"""Vexa Bridge FastAPI Application Entrypoint (Real Auth, Zero Mock Data, Cloud Run + Cloud SQL Ready)."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, SessionLocal, engine
from app.routers import admin, audits, auth, challenges, health, reviews, submissions
from app.services.auth_service import ensure_bootstrap_admin

logging.basicConfig(level=logging.INFO, format="%(message)s")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ensure_bootstrap_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Vexa Bridge API",
    version="2.0.0",
    description="Multi-Mode AI Business Diagnostic, PII-Safe Challenge Scoping & Proof-of-Work Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "error_code" in exc.detail:
        envelope = {
            "error_code": exc.detail["error_code"],
            "message": exc.detail.get("message", "Request error"),
            "details": exc.detail.get("details", {}),
        }
    else:
        envelope = {
            "error_code": f"HTTP_{exc.status_code}",
            "message": str(exc.detail),
            "details": {},
        }
    return JSONResponse(status_code=exc.status_code, content={**envelope, "detail": envelope})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    envelope = {
        "error_code": "VALIDATION_ERROR",
        "message": "Request validation failed.",
        "details": {"errors": exc.errors()},
    }
    return JSONResponse(status_code=422, content={**envelope, "detail": envelope})


API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(audits.router, prefix=API_PREFIX)
app.include_router(challenges.router, prefix=API_PREFIX)
app.include_router(submissions.router, prefix=API_PREFIX)
app.include_router(reviews.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)


STATIC_DIR = Path(__file__).resolve().parents[1] / "static"
if STATIC_DIR.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(
                status_code=404,
                content={"error_code": "ENTITY_NOT_FOUND", "message": "API route not found.", "details": {}},
            )
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(STATIC_DIR / "index.html"))
