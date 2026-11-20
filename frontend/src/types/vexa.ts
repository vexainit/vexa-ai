export type UserRole = 'BUSINESS' | 'STUDENT' | 'MENTOR' | 'ADMIN';
export type WorkspaceMode = 'SMB' | 'CAMPUS' | 'PERSONAL';
export type CaseStatus = 'ACTIVE' | 'PILOT_MATCHED' | 'ARCHIVED';
export type SubmissionStatus =
  | 'PENDING_REVIEW'
  | 'REVISION_NEEDED'
  | 'APPROVED_CONNECTED';
export type SolutionType =
  | 'AI Agent'
  | 'Automation'
  | 'Web App'
  | 'Data Analytics';

export interface UserProfileMeta {
  // Business fields
  company_name?: string;
  cin_or_gstin?: string;
  incorporation_cert_name?: string;
  has_incorporation_cert?: boolean;
  business_domain?: string;
  scale_tier?: string;
  website_url?: string;
  // Student fields
  college_name?: string;
  student_id_number?: string;
  degree_branch?: string;
  graduation_year?: string;
  github_url?: string;
  // Mentor fields
  organization?: string;
  job_title?: string;
  years_experience?: string;
  linkedin_url?: string;
  expertise_summary?: string;
  // Admin fields
  department?: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  domain_tags: string[];
  profile_meta?: UserProfileMeta;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  stats?: {
    audits_count: number;
    submissions_count: number;
    verified_builds_count: number;
    reviews_completed: number;
  };
}

export interface HealthResponse {
  status: string;
  database: string;
  gemini_model: string;
  gemini_configured: boolean;
  firebase_configured: boolean;
  storage_mode: string;
  active_workspace_modes: WorkspaceMode[];
  live_counts: {
    businesses: number;
    students: number;
    mentors: number;
    audits: number;
    published_challenges: number;
    approved_pilots: number;
  };
}

export interface DeterministicStats {
  row_count: number;
  col_count: number;
  missing_cell_pct: number;
  duplicate_rows: number;
  columns?: string[];
  delayed_order_pct?: number;
  cod_rto_pct?: number;
  delayed_count?: number;
  return_count?: number;
  peak_bottleneck_segment: string;
  est_monthly_leak_inr: number;
  est_manual_hours_lost: number;
  total_spend_inr?: number;
  micro_txn_count?: number;
  micro_txn_sum_inr?: number;
  late_night_impulse_pct?: number;
  recurring_sub_count?: number;
  recurring_drain_inr?: number;
  top_categories?: Record<string, number>;
  profiling_ms: number;
}

export interface BottleneckItem {
  rank: 1 | 2 | 3;
  title: string;
  root_cause: string;
  quantified_leak: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  affected_segment: string;
}

export interface RoadmapAction {
  title: string;
  track: 'QUICK_WIN' | 'AI_AUTOMATION_BUILD';
  effort_estimate: string;
  expected_impact: string;
}

export interface ChallengeBrief {
  challenge_title: string;
  anonymized_context: string;
  problem_statement: string;
  expected_deliverable_type: SolutionType;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  target_kpi: string;
  technical_requirements: string[];
  evaluation_checklist: string[];
}

export interface PersonalSpendExtension {
  behavioral_archetype: string;
  micro_leakage_score: number;
  seven_day_fix_checklist: string[];
}

export interface AIReport {
  health_score: number;
  executive_summary: string[];
  top_bottlenecks: BottleneckItem[];
  improvement_roadmap: RoadmapAction[];
  challenge_brief: ChallengeBrief;
  personal_spend?: PersonalSpendExtension | null;
  generation_mode: 'gemini_2_5_flash' | 'deterministic_fallback';
}

export interface PIISummary {
  masked_columns: string[];
  rules_triggered?: string[];
  zero_leak_verified: boolean;
}

export interface DiagnosticCase {
  id: string;
  owner_id: string;
  owner_name?: string;
  workspace_mode: WorkspaceMode;
  title: string;
  domain_category: string;
  scale_tier: string;
  pain_points: string[];
  current_tools: string[];
  target_metric: string;
  deterministic_stats: DeterministicStats;
  ai_report: AIReport;
  pii_summary?: PIISummary;
  is_published_to_builders: boolean;
  status: CaseStatus;
  latency_ms?: number;
  submission_counts: {
    pending: number;
    revision_needed: number;
    approved: number;
  };
  created_at: string;
}

export interface PIIDiffRow {
  row_index: number;
  original: Record<string, string>;
  masked: Record<string, string>;
}

export interface PIIDiffResponse {
  case_id: string;
  zero_leak_verified: boolean;
  redacted_columns: string[];
  rules_triggered: string[];
  sample_rows: PIIDiffRow[];
}

export interface ChallengeItem {
  id: string;
  workspace_mode: WorkspaceMode;
  domain_category: string;
  scale_tier: string;
  current_tools: string[];
  target_metric: string;
  status: CaseStatus;
  row_count: number;
  col_count: number;
  est_monthly_leak_inr: number;
  challenge_brief: ChallengeBrief;
  submission_count: number;
  pii_verified: boolean;
  created_at: string;
  dataset_preview?: {
    columns: { name: string; type: string }[];
    rows: Record<string, string>[];
  };
}

export interface MentorPreAudit {
  fit_score: number;
  recommendation: 'STRONG_CANDIDATE' | 'NEEDS_MINOR_REVISION' | 'MAJOR_GAPS';
  key_strengths: string[];
  edge_case_risks: string[];
  mentor_probe_question: string;
}

export interface RubricChecks {
  solves_core_bottleneck: boolean;
  handles_edge_cases: boolean;
  pilot_ready: boolean;
}

export interface BuilderSubmission {
  id: string;
  case_id: string;
  builder_id: string;
  builder_name: string;
  version: number;
  solution_title: string;
  solution_type: SolutionType;
  tech_stack: string[];
  architecture_summary: string;
  demo_url: string;
  output_preview: string;
  ai_preaudit: MentorPreAudit;
  status: SubmissionStatus;
  reviewed_by_mentor_id?: string | null;
  reviewed_by_mentor_name?: string | null;
  rubric_checks?: RubricChecks | null;
  mentor_feedback?: string | null;
  verification_code?: string | null;
  created_at?: string;
  updated_at: string;
  challenge_brief?: ChallengeBrief;
  case_summary?: {
    id: string;
    workspace_mode: WorkspaceMode;
    domain_category: string;
    scale_tier: string;
    target_metric: string;
    row_count: number;
    est_monthly_leak_inr: number;
  };
}

export interface PortfolioCard {
  id: string;
  verification_code: string;
  solution_title: string;
  solution_type: SolutionType;
  tech_stack: string[];
  demo_url: string;
  output_preview: string;
  anonymized_impact: string;
  fit_score: number;
  rubric_checks?: RubricChecks | null;
  mentor_feedback?: string | null;
  reviewed_by_mentor_name?: string | null;
  approved_at: string;
}

export interface PortfolioResponse {
  student: {
    id: string;
    full_name: string;
    skills: string[];
    total_verified_builds: number;
  };
  verified_cards: PortfolioCard[];
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  target_entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminConfig {
  min_ai_fit_alert_threshold: number;
  max_upload_mb: number;
  enabled_modes: WorkspaceMode[];
}

export interface AdminOverviewResponse {
  kpis: {
    total_audits: number;
    audits_by_mode: Record<string, number>;
    published_challenges: number;
    active_builders: number;
    pending_mentor_reviews: number;
    approved_business_pilots: number;
    avg_review_turnaround_mins: number;
    total_businesses: number;
    total_students: number;
    total_mentors: number;
    pending_mentor_verifications: number;
  };
  funnel: { stage: string; count: number }[];
  config: AdminConfig;
  users: UserProfile[];
  cases: DiagnosticCase[];
  submissions: BuilderSubmission[];
  audit_logs: AuditLogEntry[];
}

export interface DatabaseTableResponse {
  table: string;
  total_rows: number;
  columns: string[];
  rows: Record<string, unknown>[];
}
