"""RBAC & Ownership Enforcement Dependencies supporting JWT Bearer & Firebase ID Tokens (PRD Ch. 2.2 & 17.2)."""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DiagnosticCase, User
from app.services.auth_service import decode_access_token, verify_firebase_id_token


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": "AUTH_REQUIRED",
                "message": "Authentication required. Please sign in.",
                "details": {},
            },
        )

    token = authorization.split(" ", 1)[1].strip()
    user: User | None = None

    # 1. Try Vexa signed JWT session token
    claims = decode_access_token(token)
    if claims and claims.get("sub"):
        user = db.query(User).filter(User.id == claims["sub"]).first()
    else:
        # 2. Fallback: verify Firebase ID token directly
        try:
            fb = verify_firebase_id_token(token)
            user = db.query(User).filter(User.firebase_uid == fb["firebase_uid"]).first()
            if not user and fb.get("email"):
                user = db.query(User).filter(User.email == fb["email"]).first()
        except Exception:
            user = None

    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": "AUTH_INVALID_USER",
                "message": "Session expired, user not found, or account suspended.",
                "details": {},
            },
        )
    return user


def require_role(allowed_roles: list[str], require_verified: bool = False):
    allowed_upper = [r.upper() for r in allowed_roles]

    def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_upper:
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": "RBAC_FORBIDDEN",
                    "message": f"Role {user.role} cannot access this route.",
                    "details": {"allowed": allowed_upper},
                },
            )
        if require_verified and user.role == "MENTOR" and not user.is_verified:
            raise HTTPException(
                status_code=403,
                detail={
                    "error_code": "MENTOR_UNVERIFIED",
                    "message": "Admin verification required before approving builds.",
                    "details": {},
                },
            )
        return user

    return _guard


def assert_case_owner(case: DiagnosticCase, user: User) -> None:
    """Only the owning BUSINESS user or ADMIN may inspect raw CSV / PII Diff / publish."""
    if user.role == "ADMIN":
        return
    if case.owner_id != user.id:
        raise HTTPException(
            status_code=403,
            detail={
                "error_code": "RAW_DATA_RESTRICTED",
                "message": "Only the owning business or platform admin can access this resource.",
                "details": {"case_id": case.id},
            },
        )
