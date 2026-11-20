"""Immutable System Audit Log Writer (PRD Ch. 7.5 & 11.2)."""
from __future__ import annotations

import json
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def log_audit_event(
    db: Session,
    actor_id: str,
    action_type: str,
    target_entity_id: str,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        actor_id=actor_id,
        action_type=action_type,
        target_entity_id=target_entity_id,
        metadata_json=json.dumps(metadata or {}),
    )
    db.add(entry)
    return entry
