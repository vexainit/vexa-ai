import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Award, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PreAuditBriefingCard } from '../../components/mentor/PreAuditBriefingCard';
import { SubmissionForm, type SubmissionFormPayload } from '../../components/student/SubmissionForm';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import { formatRelativeAge } from '../../lib/formatters';
import type { BuilderSubmission, SubmissionStatus } from '../../types/vexa';

const STATUS_BADGE: Record<SubmissionStatus, { label: string; style: string }> = {
  PENDING_REVIEW: {
    label: 'Pending Mentor Review',
    style: 'bg-vb-revision-tint text-vb-revision border-vb-revision/30',
  },
  REVISION_NEEDED: {
    label: 'Revision Requested',
    style: 'bg-vb-terracotta-tint text-vb-terracotta border-vb-terracotta/30',
  },
  APPROVED_CONNECTED: {
    label: 'Approved & Connected',
    style: 'bg-vb-verified-tint text-vb-verified border-vb-verified/30',
  },
};

export function SubmissionsPage() {
  const { id } = useParams();
  const { session } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', session.userId],
    queryFn: () =>
      apiFetch<{ submissions: BuilderSubmission[] }>('/submissions', {
        userId: session.userId,
        role: session.role,
      }),
  });

  const resubmitMutation = useMutation({
    mutationFn: (payload: SubmissionFormPayload) =>
      apiFetch<BuilderSubmission>('/submissions', {
        method: 'POST',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify(payload),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      navigate(`/student/submissions/${updated.id}`);
    },
  });

  const submissions = data?.submissions ?? [];
  const activeSub = id ? submissions.find((s) => s.id === id) || submissions[0] : submissions[0];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="vb-label">Builder Proof-of-Work Tracker</span>
            <h1 className="font-display font-extrabold text-[28px] text-vb-ink mt-0.5">
              My Solution Drafts &amp; Versioned Revisions
            </h1>
          </div>
          <Link
            to={`/portfolio/${session.userId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
          >
            <Award className="w-4 h-4" />
            <span>Open Verified Portfolio</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="vb-card p-6 h-48 animate-pulse" />
        ) : submissions.length === 0 ? (
          <div className="vb-card p-10 text-center space-y-3">
            <h2 className="font-display font-bold text-base text-vb-ink">No drafts submitted yet</h2>
            <p className="text-xs text-vb-muted">
              Browse the published PII-safe business challenges and submit your first working build.
            </p>
            <Link
              to="/student/challenges"
              className="inline-block px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold"
            >
              Browse Challenge Feed
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Rail: Submission List */}
            <div className="lg:col-span-4 space-y-2.5">
              {submissions.map((s) => {
                const badge = STATUS_BADGE[s.status];
                const selected = activeSub?.id === s.id;
                return (
                  <Link
                    key={s.id}
                    to={`/student/submissions/${s.id}`}
                    className={`block p-4 rounded border transition-colors ${
                      selected
                        ? 'bg-vb-surface border-vb-teal'
                        : 'bg-vb-surface border-vb-border hover:border-vb-teal/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badge.style}`}>
                        {badge.label}
                      </span>
                      <span className="tabular-num text-[11px] font-mono font-semibold text-vb-muted">
                        v{s.version}
                      </span>
                    </div>
                    <div className="font-display font-bold text-sm text-vb-ink mt-2">
                      {s.solution_title}
                    </div>
                    <div className="text-[11px] text-vb-muted mt-1 flex items-center justify-between">
                      <span>{s.solution_type}</span>
                      <span className="font-mono">{formatRelativeAge(s.updated_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Right Pane: Active Submission Details + Revision Flow */}
            {activeSub && (
              <div className="lg:col-span-8 space-y-5">
                <div className="vb-card p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-vb-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-num font-mono text-xs font-bold px-2 py-0.5 rounded bg-vb-canvas border border-vb-border">
                          Version v{activeSub.version}
                        </span>
                        <span
                          className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${
                            STATUS_BADGE[activeSub.status].style
                          }`}
                        >
                          {STATUS_BADGE[activeSub.status].label}
                        </span>
                      </div>
                      <h2 className="font-display font-bold text-xl text-vb-ink mt-2">
                        {activeSub.solution_title}
                      </h2>
                    </div>
                    <a
                      href={activeSub.demo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-vb-teal hover:underline"
                    >
                      <span>Open Demo</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Highlighted Mentor Feedback Callout when REVISION_NEEDED */}
                  {activeSub.status === 'REVISION_NEEDED' && activeSub.mentor_feedback && (
                    <div className="p-4 rounded border border-vb-terracotta/40 bg-vb-terracotta-tint/70 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-vb-terracotta">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Mentor Revision Feedback ({activeSub.reviewed_by_mentor_name})</span>
                      </div>
                      <p className="text-xs text-vb-ink">{activeSub.mentor_feedback}</p>
                    </div>
                  )}

                  {/* Emerald Banner when APPROVED_CONNECTED */}
                  {activeSub.status === 'APPROVED_CONNECTED' && (
                    <div className="p-4 rounded border border-vb-verified/40 bg-vb-verified-tint/70 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-vb-verified font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Approved &amp; Connected! Credential ID:{' '}
                          <span className="font-mono font-bold">{activeSub.verification_code}</span>
                        </span>
                      </div>
                      <Link
                        to={`/portfolio/${activeSub.builder_id}`}
                        className="px-3 py-1.5 rounded bg-vb-verified text-white text-xs font-semibold"
                      >
                        View Shareable Card →
                      </Link>
                    </div>
                  )}

                  {activeSub.status === 'PENDING_REVIEW' && (
                    <div className="p-3 rounded bg-vb-canvas border border-vb-border flex items-center gap-2 text-xs text-vb-muted">
                      <Clock className="w-4 h-4 text-vb-revision shrink-0" />
                      <span>
                        In Verified Mentor Review Queue. Switch to the <strong>Mentor Reviewer</strong> role in the sidebar to approve live.
                      </span>
                    </div>
                  )}

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="vb-label block mb-1">Architecture Summary</span>
                      <p className="text-vb-ink leading-relaxed whitespace-pre-wrap">
                        {activeSub.architecture_summary}
                      </p>
                    </div>
                    <div>
                      <span className="vb-label block mb-1">Quantified Output Preview</span>
                      <p className="text-vb-ink">{activeSub.output_preview}</p>
                    </div>
                  </div>
                </div>

                {/* Live AI Pre-Audit Summary */}
                {activeSub.ai_preaudit && <PreAuditBriefingCard preAudit={activeSub.ai_preaudit} />}

                {/* Versioned Revision Resubmission Form (v+1) */}
                {activeSub.status === 'REVISION_NEEDED' && session.role === 'STUDENT' && (
                  <SubmissionForm
                    caseId={activeSub.case_id}
                    initial={activeSub}
                    submitting={resubmitMutation.isPending}
                    serverError={(resubmitMutation.error as Error | null)?.message}
                    onSubmit={(payload) => resubmitMutation.mutate(payload)}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
