"""SQLAlchemy 2.0 ORM models matching PRD Ch. 11.2 + Real Auth & Role Credential Metadata."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    firebase_uid: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    domain_tags: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    profile_meta_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


class DiagnosticCase(Base):
    __tablename__ = "diagnostic_cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    workspace_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    domain_category: Mapped[str] = mapped_column(String(80), nullable=False)
    scale_tier: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pain_points_json: Mapped[str] = mapped_column(Text, nullable=False)
    current_tools_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    target_metric: Mapped[str] = mapped_column(Text, nullable=False)
    deterministic_stats_json: Mapped[str] = mapped_column(Text, nullable=False)
    ai_report_json: Mapped[str] = mapped_column(Text, nullable=False)
    challenge_brief_json: Mapped[str] = mapped_column(Text, nullable=False)
    pii_diff_sample_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_csv_path: Mapped[str] = mapped_column(Text, nullable=False)
    masked_csv_path: Mapped[str] = mapped_column(Text, nullable=False)
    is_published_to_builders: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="ACTIVE", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    owner: Mapped[User] = relationship("User", foreign_keys=[owner_id])
    submissions: Mapped[list["BuilderSubmission"]] = relationship(
        "BuilderSubmission", back_populates="case", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_cases_published", "is_published_to_builders", "status"),
        Index("idx_cases_owner", "owner_id", "created_at"),
    )


class BuilderSubmission(Base):
    __tablename__ = "builder_submissions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("diagnostic_cases.id"), nullable=False)
    builder_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    solution_title: Mapped[str] = mapped_column(String(160), nullable=False)
    solution_type: Mapped[str] = mapped_column(String(40), nullable=False)
    tech_stack_json: Mapped[str] = mapped_column(Text, nullable=False)
    architecture_summary: Mapped[str] = mapped_column(Text, nullable=False)
    demo_url: Mapped[str] = mapped_column(Text, nullable=False)
    output_preview: Mapped[str] = mapped_column(Text, nullable=False)
    ai_preaudit_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default="PENDING_REVIEW", nullable=False)
    reviewed_by_mentor_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("users.id"), nullable=True)
    rubric_checks_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    mentor_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    case: Mapped[DiagnosticCase] = relationship("DiagnosticCase", back_populates="submissions")
    builder: Mapped[User] = relationship("User", foreign_keys=[builder_id])
    reviewer: Mapped[User | None] = relationship("User", foreign_keys=[reviewed_by_mentor_id])

    __table_args__ = (
        Index("idx_sub_status", "status", "updated_at"),
        Index("idx_sub_case", "case_id", "builder_id"),
    )


class AuditLog(Base):
    __tablename__ = "system_audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    actor_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    actor: Mapped[User] = relationship("User", foreign_keys=[actor_id])

    __table_args__ = (
        Index("idx_audit_created", "created_at"),
    )


class SystemConfig(Base):
    __tablename__ = "system_config"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value_json: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
