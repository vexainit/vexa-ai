"""RBAC & Ownership Enforcement Dependencies (PRD Ch. 2.2 & 17.2)."""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DiagnosticCase, User


def get_current_user(
    x_vexa_user_id: str | None = Header(default=None, alias="X-Vexa-User-Id"),
    x_vexa_role: str | None = Header(default=None, alias="X-Vexa-Role"),
    db: Session = Depends(get_db),
) -> User:
    if not x_vexa_user_id or not x_vexa_role:
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": "AUTH_INVALID_USER",
                "message": "Missing X-Vexa-User-Id or X-Vexa-Role header.",
                "details": {},
            },
        )
    user = db.query(User).filter(User.id == x_vexa_user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail={
                "error_code": "AUTH_INVALID_USER",
                "message": "User inactive or not found.",
                "details": {},
            },
        )
    if user.role != x_vexa_role.upper():
        raise HTTPException(
            status_code=403,
            detail={
                "error_code": "RBAC_ROLE_MISMATCH",
                "message": "Role header mismatch.",
                "details": {"expected": user.role, "received": x_vexa_role.upper()},
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
