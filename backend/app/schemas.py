"""Pydantic v2 Schemas for Gemini Structured Outputs & REST API Contracts (PRD Ch. 10, 15, 18)."""
from __future__ import annotations

from typing import Any, List, Literal, Optional
from pydantic import BaseModel, Field


# --- Gemini 2.5 Flash Strict Structured Output Schemas (PRD Ch. 10.2 & 10.3) ---

class BottleneckItem(BaseModel):
    rank: int = Field(ge=1, le=3)
    title: str
    root_cause: str
    quantified_leak: str
    urgency: Literal["CRITICAL", "HIGH", "MEDIUM"]
    affected_segment: str


class RoadmapAction(BaseModel):
    title: str
    track: Literal["QUICK_WIN", "AI_AUTOMATION_BUILD"]
    effort_estimate: str
    expected_impact: str


class ChallengeBrief(BaseModel):
    challenge_title: str
    anonymized_context: str
    problem_statement: str
    expected_deliverable_type: Literal["AI Agent", "Automation", "Web App", "Data Analytics"]
    difficulty: Literal["Beginner", "Intermediate", "Advanced"]
    target_kpi: str
    technical_requirements: List[str]
    evaluation_checklist: List[str]


class PersonalSpendExtension(BaseModel):
    behavioral_archetype: str
    micro_leakage_score: int = Field(ge=0, le=100)
    seven_day_fix_checklist: List[str]


class DiagnosticAndBriefResponse(BaseModel):
    health_score: int = Field(ge=0, le=100)
    executive_summary: List[str]
    top_bottlenecks: List[BottleneckItem]
    improvement_roadmap: List[RoadmapAction]
    challenge_brief: ChallengeBrief
    personal_spend: Optional[PersonalSpendExtension] = None


class MentorPreAuditResponse(BaseModel):
    fit_score: int = Field(ge=0, le=100)
    recommendation: Literal["STRONG_CANDIDATE", "NEEDS_MINOR_REVISION", "MAJOR_GAPS"]
    key_strengths: List[str]
    edge_case_risks: List[str]
    mentor_probe_question: str


# --- API Request / Response Schemas ---

class PublishCaseRequest(BaseModel):
    is_published_to_builders: bool


class PilotHandoffRequest(BaseModel):
    submission_id: Optional[str] = None
    calendar_url: Optional[str] = None
    notes: Optional[str] = None


class SubmissionCreateRequest(BaseModel):
    case_id: str
    solution_title: str = Field(min_length=5, max_length=100)
    solution_type: Literal["AI Agent", "Automation", "Web App", "Data Analytics"]
    tech_stack: List[str] = Field(min_length=1, max_length=8)
    architecture_summary: str = Field(min_length=80, max_length=2000)
    demo_url: str = Field(min_length=8, max_length=500)
    output_preview: str = Field(min_length=30, max_length=1000)
    resubmit_id: Optional[str] = None


class RubricChecks(BaseModel):
    solves_core_bottleneck: bool
    handles_edge_cases: bool
    pilot_ready: bool


class MentorReviewRequest(BaseModel):
    decision: Literal["APPROVED_CONNECTED", "REVISION_NEEDED"]
    rubric_checks: RubricChecks
    mentor_feedback: str = ""


class AdminUserUpdateRequest(BaseModel):
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None


class AdminCaseUpdateRequest(BaseModel):
    status: Optional[Literal["ACTIVE", "PILOT_MATCHED", "ARCHIVED"]] = None
    is_published_to_builders: Optional[bool] = None


class AdminConfigUpdateRequest(BaseModel):
    min_ai_fit_alert_threshold: Optional[int] = Field(default=None, ge=0, le=100)
    max_upload_mb: Optional[int] = Field(default=None, ge=1, le=50)
    enabled_modes: Optional[List[Literal["SMB", "CAMPUS", "PERSONAL"]]] = None


class OnboardingRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=200)
    role: Literal["BUSINESS", "STUDENT", "MENTOR"]
    domain_tags: List[str] = Field(default_factory=list)


class ErrorEnvelope(BaseModel):
    error_code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
