"""Authentication Service: Scrypt Password Hashing, JWT Sessions, Firebase Admin ID Token Verification & Admin Bootstrap."""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User

logger = logging.getLogger("vexa.auth")
_firebase_initialized = False


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1)
    return f"scrypt${salt}${dk.hex()}"


def verify_password(password: str, stored_hash: str | None) -> bool:
    if not stored_hash or not stored_hash.startswith("scrypt$"):
        return False
    parts = stored_hash.split("$")
    if len(parts) != 3:
        return False
    _, salt, expected_hex = parts
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1)
    return hmac.compare_digest(dk.hex(), expected_hex)


def create_access_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "role": user.role,
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_expire_hours)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """Cryptographically verifies a Google Firebase Authentication ID token via official google-auth public certs."""
    if not settings.firebase_project_id:
        raise ValueError("Firebase Auth is not configured on backend (missing FIREBASE_PROJECT_ID).")

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    decoded = google_id_token.verify_firebase_token(
        id_token,
        google_requests.Request(),
        audience=settings.firebase_project_id,
        clock_skew_in_seconds=10,
    )
    if not decoded or not decoded.get("sub"):
        raise ValueError("Invalid Firebase ID token.")

    return {
        "firebase_uid": decoded["sub"],
        "email": (decoded.get("email") or "").strip().lower(),
        "full_name": decoded.get("name") or (decoded.get("email") or "User").split("@")[0],
    }


def ensure_bootstrap_admin(db: Session) -> None:
    """Ensures at least one Platform Admin account exists in the database (zero mock cases/data)."""
    existing_admin = db.query(User).filter(User.role == "ADMIN").first()
    if existing_admin:
        return

    admin = User(
        id="adm_vexa_root",
        full_name="Vexa Platform Admin",
        email=settings.admin_bootstrap_email.strip().lower(),
        password_hash=hash_password(settings.admin_bootstrap_password),
        role="ADMIN",
        domain_tags=json.dumps(["Platform Governance", "Database Control", "Compliance"]),
        profile_meta_json=json.dumps({"department": "Ecosystem Operations"}),
        is_verified=True,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("Bootstrapped Platform Admin account: %s", admin.email)
