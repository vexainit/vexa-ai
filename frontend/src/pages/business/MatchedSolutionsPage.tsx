import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PilotHandoffModal } from '../../components/business/PilotHandoffModal';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import type { BuilderSubmission, DiagnosticCase } from '../../types/vexa';

interface MatchedSolutionsResponse {
  case: DiagnosticCase;
  pipeline_counts: {
    total: number;
    pending_review: number;
    revision_needed: number;
    approved_connected: number;
  };
  approved_solutions: BuilderSubmission[];
}

export function MatchedSolutionsPage() {
  const { id = '' } = useParams();
  const { session } = useRole();
  const queryClient = useQueryClient();

  const [handoffTarget, setHandoffTarget] = useState<BuilderSubmission | null>(null);
  const [handoffSuccess, setHandoffSuccess] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', id, 'solutions', session.userId],
    queryFn: () =>
      apiFetch<MatchedSolutionsResponse>(`/audits/${id}/solutions`, {
        userId: session.userId,
        role: session.role,
      }),
    enabled: Boolean(id) && (session.role === 'BUSINESS' || session.role === 'ADMIN'),
  });

  const handoffMutation = useMutation({
    mutationFn: ({ calendarUrl, notes }: { calendarUrl: string; notes: string }) =>
      apiFetch<DiagnosticCase>(`/audits/${id}/handoff`, {
        method: 'POST',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify({
          submission_id: handoffTarget?.id,
          calendar_url: calendarUrl,
          notes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      setHandoffTarget(null);
      setHandoffSuccess(true);
    },
  });

  const counts = data?.pipeline_counts;
  const solutions = data?.approved_solutions ?? [];
  const auditCase = data?.case;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to={`/business/audits/${id}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-vb-teal hover:underline mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Diagnostic Report</span>
            </Link>
            <h1 className="font-display font-extrabold text-[26px] text-vb-ink">
              Matched Solutions &amp; 15-Minute Pilot Handoff
            </h1>
            {auditCase && (
              <p className="text-xs text-vb-muted mt-0.5">
                {auditCase.title} · Only mentor-verified builds (`APPROVED_CONNECTED`) appear here.
              </p>
            )}
          </div>
          {auditCase?.status === 'PILOT_MATCHED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-vb-verified-tint border border-vb-verified/30 text-vb-verified text-xs font-mono font-bold">
              <CheckCircle2 className="w-4 h-4" />
              STATUS: PILOT_MATCHED
            </span>
          )}
        </div>

        {/* Live Pipeline Status Banner */}
        <div className="vb-card p-4 flex flex-wrap items-center justify-between gap-3 bg-vb-surface">
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <span>
              <strong className="tabular-num text-vb-ink">{counts?.total ?? 0}</strong> Submitted
            </span>
            <span className="text-vb-border">·</span>
            <span>
              <strong className="tabular-num text-vb-revision">{counts?.pending_review ?? 0}</strong> In Mentor Review
            </span>
            <span className="text-vb-border">·</span>
            <span>
              <strong className="tabular-num text-vb-muted">{counts?.revision_needed ?? 0}</strong> In Revision
            </span>
            <span className="text-vb-border">·</span>
            <span className="text-vb-verified font-semibold">
              <strong className="tabular-num">{counts?.approved_connected ?? 0}</strong> Approved &amp; Ready
            </span>
          </div>
          <span className="text-[11px] text-vb-muted">
            Unvetted drafts are shielded until a verified mentor signs all 3 checks.
          </span>
        </div>

        {handoffSuccess && (
          <div className="vb-card p-4 border-vb-verified bg-vb-verified-tint/70 text-vb-verified text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>15-Minute Pilot Handoff Scheduled!</strong> Case status updated to{' '}
              <span className="font-mono font-bold">PILOT_MATCHED</span> and recorded in the Admin Audit Log.
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="vb-card p-6 h-40 animate-pulse" />
        ) : solutions.length === 0 ? (
          <div className="vb-card p-8 text-center space-y-2">
            <Clock className="w-8 h-8 text-vb-revision mx-auto" />
            <h2 className="font-display font-bold text-base text-vb-ink">
              {counts && counts.pending_review > 0
                ? `${counts.pending_review} builder draft(s) currently in Mentor AI Pre-Audit Review`
                : 'No mentor-approved solutions yet'}
            </h2>
            <p className="text-xs text-vb-muted max-w-md mx-auto">
              Solutions appear here automatically once a Platform-Verified Mentor signs all 3 quality checks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {solutions.map((sol) => (
              <div key={sol.id} className="vb-card p-6 space-y-4 border-vb-verified/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-vb-teal-tint text-vb-teal">
                        {sol.solution_type}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-vb-verified-tint text-vb-verified">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Mentor Verified
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-lg text-vb-ink mt-1.5">
                      {sol.solution_title}
                    </h2>
                    <div className="text-xs text-vb-muted">
                      Built by <span className="font-semibold text-vb-ink">{sol.builder_name}</span> · Verified by{' '}
                      <span className="font-semibold text-vb-ink">
                        {sol.reviewed_by_mentor_name || 'Verified Mentor'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="vb-label">Gemini Fit Score</div>
                    <div className="tabular-num text-2xl font-bold text-vb-verified">
                      {sol.ai_preaudit?.fit_score ?? 0} / 100
                    </div>
                  </div>
                </div>

                {/* 3-Point Checklist Ticks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    'Addresses Core Bottleneck',
                    'Handles Data Edge Cases',
                    'Safe & Ready for Pilot',
                  ].map((chk) => (
                    <div
                      key={chk}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-vb-verified-tint/50 text-vb-verified font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{chk}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded bg-vb-canvas border border-vb-border space-y-2 text-xs">
                  <div>
                    <span className="vb-label block mb-0.5">Verified Output on Masked Dataset</span>
                    <span className="text-vb-ink">{sol.output_preview}</span>
                  </div>
                  {sol.mentor_feedback && (
                    <div className="pt-2 border-t border-vb-border">
                      <span className="vb-label block mb-0.5">Mentor Endorsement Note</span>
                      <span className="text-vb-muted italic">“{sol.mentor_feedback}”</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-vb-border">
                  <div className="flex flex-wrap gap-1.5">
                    {sol.tech_stack.map((t) => (
                      <span
                        key={t}
                        className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-canvas border border-vb-border"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={sol.demo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-vb-border bg-vb-surface text-xs font-semibold text-vb-ink hover:border-vb-teal"
                    >
                      <span>Open Live Demo / Repo</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setHandoffTarget(sol)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule 15-Min Pilot Handoff</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <PilotHandoffModal
        open={Boolean(handoffTarget)}
        caseTitle={auditCase?.title || ''}
        submission={handoffTarget}
        onClose={() => setHandoffTarget(null)}
        submitting={handoffMutation.isPending}
        onConfirm={(calendarUrl, notes) => handoffMutation.mutate({ calendarUrl, notes })}
      />
    </AppShell>
  );
}
