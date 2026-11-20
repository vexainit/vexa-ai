"""Authentication & Role-Specific Registration Router (Business, Student, Mentor, Admin + Firebase Auth)."""
from __future__ import annotations

import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.rbac import get_current_user
from app.models import User
from app.services.audit_logger import log_audit_event
from app.services.auth_service import (
    create_access_token,
    hash_password,
    verify_firebase_id_token,
    verify_password,
)
from app.services.serializers import serialize_user
from app.services.storage import storage_service

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=200)
    password: str = Field(min_length=6, max_length=128)
    expected_role: str | None = None


class FirebaseAuthRequest(BaseModel):
    id_token: str
    role: str | None = None
    full_name: str | None = None
    domain_tags: list[str] = Field(default_factory=list)
    profile_meta: dict = Field(default_factory=dict)


@router.post("/register", status_code=201)
async def register_user(
    full_name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    domain_tags: str = Form("[]"),
    profile_meta: str = Form("{}"),
    incorporation_certificate: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    role_upper = role.strip().upper()
    if role_upper not in ("BUSINESS", "STUDENT", "MENTOR"):
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "INVALID_ROLE",
                "message": "Self-registration is available for BUSINESS, STUDENT, or MENTOR roles.",
                "details": {},
            },
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "WEAK_PASSWORD", "message": "Password must be at least 8 characters.", "details": {}},
        )

    clean_email = email.strip().lower()
    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(
            status_code=409,
            detail={"error_code": "EMAIL_EXISTS", "message": "An account with this email already exists.", "details": {}},
        )

    try:
        tags_list = json.loads(domain_tags) if domain_tags else []
        meta_dict = json.loads(profile_meta) if profile_meta else {}
    except Exception:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_METADATA", "message": "Malformed profile metadata JSON.", "details": {}},
        )

    # Role-specific required verification fields
    if role_upper == "BUSINESS":
        if not str(meta_dict.get("company_name", "")).strip():
            raise HTTPException(status_code=400, detail={"error_code": "MISSING_FIELD", "message": "Registered Company Name is required for Business accounts.", "details": {}})
        if not str(meta_dict.get("cin_or_gstin", "")).strip():
            raise HTTPException(status_code=400, detail={"error_code": "MISSING_FIELD", "message": "CIN / GSTIN / Registration Number is required for Business verification.", "details": {}})
    elif role_upper == "STUDENT":
        if not str(meta_dict.get("college_name", "")).strip():
            raise HTTPException(status_code=400, detail={"error_code": "MISSING_FIELD", "message": "College / University Name is required for Student accounts.", "details": {}})
        if not str(meta_dict.get("graduation_year", "")).strip():
            raise HTTPException(status_code=400, detail={"error_code": "MISSING_FIELD", "message": "Graduation Year is required for Student accounts.", "details": {}})
    elif role_upper == "MENTOR":
        if not str(meta_dict.get("organization", "")).strip() or not str(meta_dict.get("job_title", "")).strip():
            raise HTTPException(status_code=400, detail={"error_code": "MISSING_FIELD", "message": "Current Organization and Job Title are required for Mentor accounts.", "details": {}})

    user_id = f"{role_upper[:3].lower()}_{uuid.uuid4().hex[:10]}"

    # Store Business Incorporation Certificate in private raw bucket/directory
    if incorporation_certificate is not None and incorporation_certificate.filename:
        cert_name = Path(incorporation_certificate.filename).name
        if not cert_name.lower().endswith((".pdf", ".png", ".jpg", ".jpeg")):
            raise HTTPException(
                status_code=400,
                detail={"error_code": "FILE_TYPE_UNSUPPORTED", "message": "Incorporation certificate must be PDF, PNG, or JPG.", "details": {}},
            )
        cert_bytes = await incorporation_certificate.read()
        if len(cert_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail={"error_code": "FILE_TOO_LARGE", "message": "Certificate must be under 5 MB.", "details": {}})
        stored_cert = storage_service.write_bytes("raw", f"certs/{user_id}_{cert_name}", cert_bytes)
        meta_dict["incorporation_cert_path"] = stored_cert
        meta_dict["incorporation_cert_name"] = cert_name

    # Mentors require Platform Admin verification before approving builds
    is_verified = role_upper != "MENTOR"

    user = User(
        id=user_id,
        full_name=full_name.strip(),
        email=clean_email,
        password_hash=hash_password(password),
        role=role_upper,
        domain_tags=json.dumps(tags_list if isinstance(tags_list, list) else []),
        profile_meta_json=json.dumps(meta_dict),
        is_verified=is_verified,
        is_active=True,
    )
    db.add(user)
    db.flush()
    log_audit_event(db, user.id, "USER_REGISTERED", user.id, {"role": user.role, "is_verified": is_verified})
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.post("/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail={"error_code": "INVALID_CREDENTIALS", "message": "Invalid email or password.", "details": {}},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail={"error_code": "ACCOUNT_SUSPENDED", "message": "This account has been suspended by a Platform Admin.", "details": {}},
        )
    if payload.expected_role and user.role != payload.expected_role.upper():
        raise HTTPException(
            status_code=403,
            detail={
                "error_code": "ROLE_PORTAL_MISMATCH",
                "message": f"This account is registered under the {user.role} portal. Please sign in via the {user.role} tab.",
                "details": {"actual_role": user.role},
            },
        )

    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.post("/firebase")
def exchange_firebase_token(payload: FirebaseAuthRequest, db: Session = Depends(get_db)):
    """Verifies Firebase Google Sign-In ID token and returns a Vexa session or prompts for role credentials."""
    try:
        fb = verify_firebase_id_token(payload.id_token)
    except Exception as exc:
        raise HTTPException(
            status_code=401,
            detail={"error_code": "FIREBASE_AUTH_FAILED", "message": str(exc), "details": {}},
        )

    user = db.query(User).filter(User.firebase_uid == fb["firebase_uid"]).first()
    if not user and fb.get("email"):
        user = db.query(User).filter(User.email == fb["email"]).first()
        if user:
            user.firebase_uid = fb["firebase_uid"]
            db.commit()
            db.refresh(user)

    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail={"error_code": "ACCOUNT_SUSPENDED", "message": "Account suspended.", "details": {}})
        token = create_access_token(user)
        return {"needs_registration": False, "access_token": token, "token_type": "bearer", "user": serialize_user(user)}

    # New Firebase user: require role selection & role credentials
    if not payload.role:
        return {
            "needs_registration": True,
            "email": fb["email"],
            "full_name": fb["full_name"],
            "firebase_uid": fb["firebase_uid"],
        }

    role_upper = payload.role.strip().upper()
    if role_upper not in ("BUSINESS", "STUDENT", "MENTOR"):
        raise HTTPException(status_code=400, detail={"error_code": "INVALID_ROLE", "message": "Choose BUSINESS, STUDENT, or MENTOR.", "details": {}})

    user = User(
        id=f"{role_upper[:3].lower()}_{uuid.uuid4().hex[:10]}",
        firebase_uid=fb["firebase_uid"],
        full_name=(payload.full_name or fb["full_name"]).strip(),
        email=fb["email"],
        role=role_upper,
        domain_tags=json.dumps(payload.domain_tags),
        profile_meta_json=json.dumps(payload.profile_meta),
        is_verified=(role_upper != "MENTOR"),
        is_active=True,
    )
    db.add(user)
    db.flush()
    log_audit_event(db, user.id, "USER_REGISTERED_FIREBASE", user.id, {"role": user.role})
    db.commit()
    db.refresh(user)

    token = create_access_token(user)
    return {"needs_registration": False, "access_token": token, "token_type": "bearer", "user": serialize_user(user)}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {"user": serialize_user(user)}


@router.get("/certificate/{user_id}")
def download_incorporation_certificate(
    user_id: str,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Owner or Admin ONLY: streams uploaded Business Incorporation Certificate from private storage."""
    if current.role != "ADMIN" and current.id != user_id:
        raise HTTPException(status_code=403, detail={"error_code": "RBAC_FORBIDDEN", "message": "Cannot access another organization's certificate.", "details": {}})

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "User not found.", "details": {}})

    meta = json.loads(target.profile_meta_json or "{}")
    cert_path = meta.get("incorporation_cert_path")
    cert_name = meta.get("incorporation_cert_name", "incorporation_certificate.pdf")
    if not cert_path:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "No incorporation certificate uploaded.", "details": {}})

    raw_bytes = storage_service.read_bytes(cert_path)
    media = "application/pdf" if cert_name.lower().endswith(".pdf") else "application/octet-stream"
    return Response(
        content=raw_bytes,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{cert_name}"'},
    )
