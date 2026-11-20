import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Lock, ShieldAlert } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { PreAuditBriefingCard } from '../../components/mentor/PreAuditBriefingCard';
import { ReviewQueueItem } from '../../components/mentor/ReviewQueueItem';
import { ThreePointScorecard } from '../../components/mentor/ThreePointScorecard';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import type { BuilderSubmission, RubricChecks } from '../../types/vexa';

const EMPTY_CHECKS: RubricChecks = {
  solves_core_bottleneck: false,
  handles_edge_cases: false,
  pilot_ready: false,
};

export function MentorReviewsPage() {
  const { session } = useRole();
  const queryClient = useQueryClient();

  const [queueTab, setQueueTab] = useState<'PENDING_REVIEW' | 'COMPLETED'>('PENDING_REVIEW');
  const [sort, setSort] = useState<'oldest' | 'highest_fit' | 'lowest_fit'>('oldest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'draft' | 'brief'>('draft');
  const [checks, setChecks] = useState<RubricChecks>(EMPTY_CHECKS);
  const [feedback, setFeedback] = useState('');
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', queueTab, sort, session.userId],
    queryFn: () =>
      apiFetch<{ mentor_is_verified: boolean; reviews: BuilderSubmission[] }>(
        `/reviews?status=${queueTab}&sort=${sort}`,
        { userId: session.userId, role: session.role }
      ),
  });

  const reviews = data?.reviews ?? [];
  const mentorIsVerified = data?.mentor_is_verified ?? session.isVerified;
  const active = reviews.find((r) => r.id === selectedId) || reviews[0] || null;

  useEffect(() => {
    if (!active) return;
    setSelectedId(active.id);
    setChecks(active.rubric_checks || EMPTY_CHECKS);
    setFeedback(active.mentor_feedback || '');
  }, [active?.id]);

  const decisionMutation = useMutation({
    mutationFn: (decision: 'APPROVED_CONNECTED' | 'REVISION_NEEDED') =>
      apiFetch<BuilderSubmission>(`/reviews/${active!.id}`, {
        method: 'PATCH',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify({
          decision,
          rubric_checks: checks,
          mentor_feedback: feedback,
        }),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      setBannerMessage({
        type: 'success',
        text:
          updated.status === 'APPROVED_CONNECTED'
            ? `Approved & Connected! Proof-of-Work Badge (${updated.verification_code}) & Business Pilot Card are now live.`
            : 'Revision requested and feedback delivered to the student portfolio tracker.',
      });
      setSelectedId(null);
      setChecks(EMPTY_CHECKS);
      setFeedback('');
    },
    onError: (err: Error) => {
      setBannerMessage({ type: 'error', text: err.message });
    },
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="vb-label">Mentor Quality Gatekeeper Workbench</span>
            <h1 className="font-display font-extrabold text-[28px] text-vb-ink mt-0.5">
              Review Queue &amp; Gemini AI Pre-Audit
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded border border-vb-border bg-vb-surface p-0.5">
              <button
                type="button"
                onClick={() => {
                  setQueueTab('PENDING_REVIEW');
                  setSelectedId(null);
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  queueTab === 'PENDING_REVIEW'
                    ? 'bg-vb-revision text-white'
                    : 'text-vb-muted hover:text-vb-ink'
                }`}
              >
                Pending Queue
              </button>
              <button
                type="button"
                onClick={() => {
                  setQueueTab('COMPLETED');
                  setSelectedId(null);
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold ${
                  queueTab === 'COMPLETED'
                    ? 'bg-vb-teal text-white'
                    : 'text-vb-muted hover:text-vb-ink'
                }`}
              >
                Completed Reviews
              </button>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'oldest' | 'highest_fit' | 'lowest_fit')}
              className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-surface"
            >
              <option value="oldest">FIFO: Oldest First</option>
              <option value="highest_fit">Highest AI Fit Score</option>
              <option value="lowest_fit">Lowest AI Fit Score</option>
            </select>
          </div>
        </div>

        {/* Unverified Mentor Read-Only Banner */}
        {!mentorIsVerified && (
          <div className="vb-card p-4 border-vb-revision bg-vb-revision-tint flex items-start gap-2.5 text-xs text-vb-revision">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>Pending Admin Verification (Read-Only Mode):</strong> Your mentor account (`{session.userId}`) has{' '}
              <span className="font-mono">is_verified = false</span>. Switch to Platform Admin in the sidebar and click{' '}
              <strong>Verify Mentor</strong> to unlock binding pilot approvals.
            </div>
          </div>
        )}

        {bannerMessage && (
          <div
            className={`vb-card p-3.5 text-xs flex items-center gap-2 ${
              bannerMessage.type === 'success'
                ? 'border-vb-verified bg-vb-verified-tint text-vb-verified'
                : 'border-vb-terracotta bg-vb-terracotta-tint text-vb-terracotta'
            }`}
          >
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 vb-card p-4 h-64 animate-pulse" />
            <div className="lg:col-span-8 vb-card p-6 h-96 animate-pulse" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="vb-card p-10 text-center space-y-2">
            <CheckCircle2 className="w-9 h-9 text-vb-verified mx-auto" />
            <h2 className="font-display font-bold text-base text-vb-ink">All Caught Up</h2>
            <p className="text-xs text-vb-muted">
              {queueTab === 'PENDING_REVIEW'
                ? 'Zero student drafts waiting in the review queue. Check Completed Reviews or submit a new draft as Student.'
                : 'No completed reviews yet.'}
            </p>
          </div>
        ) : (
          /* Master-Detail Split View (35% Left Rail / 65% Right Pane) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-4 space-y-2.5">
              <div className="vb-label px-1">
                {queueTab === 'PENDING_REVIEW' ? 'Pending Queue' : 'Completed Reviews'} ({reviews.length})
              </div>
              {reviews.map((item) => (
                <ReviewQueueItem
                  key={item.id}
                  submission={item}
                  selected={active?.id === item.id}
                  onSelect={() => {
                    setSelectedId(item.id);
                    setBannerMessage(null);
                  }}
                />
              ))}
            </div>

            {active && (
              <div className="lg:col-span-8 space-y-5">
                {/* Gemini AI Pre-Audit Card */}
                {active.ai_preaudit && <PreAuditBriefingCard preAudit={active.ai_preaudit} />}

                {/* Tabbed Student Draft vs Original Challenge Brief */}
                <div className="vb-card overflow-hidden">
                  <div className="flex border-b border-vb-border bg-vb-canvas px-4 pt-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDetailTab('draft')}
                      className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                        detailTab === 'draft'
                          ? 'border-vb-teal text-vb-teal'
                          : 'border-transparent text-vb-muted hover:text-vb-ink'
                      }`}
                    >
                      Student Submitted Draft (v{active.version})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab('brief')}
                      className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
                        detailTab === 'brief'
                          ? 'border-vb-teal text-vb-teal'
                          : 'border-transparent text-vb-muted hover:text-vb-ink'
                      }`}
                    >
                      Original Challenge Brief
                    </button>
                  </div>

                  {detailTab === 'draft' ? (
                    <div className="p-5 space-y-3 text-xs">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-bold text-base text-vb-ink">
                            {active.solution_title}
                          </h3>
                          <div className="text-vb-muted mt-0.5">
                            Builder: <strong className="text-vb-ink">{active.builder_name}</strong> ·{' '}
                            {active.solution_type}
                          </div>
                        </div>
                        <a
                          href={active.demo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-vb-teal text-vb-teal font-semibold hover:bg-vb-teal-tint"
                        >
                          <span>Inspect Live Demo / Repo</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {active.tech_stack.map((t) => (
                          <span
                            key={t}
                            className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-canvas border border-vb-border"
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div>
                        <span className="vb-label block mb-1">Architecture Summary</span>
                        <p className="text-vb-ink leading-relaxed whitespace-pre-wrap">
                          {active.architecture_summary}
                        </p>
                      </div>
                      <div className="p-3 rounded bg-vb-canvas border border-vb-border">
                        <span className="vb-label block mb-1">Quantified Output Preview</span>
                        <p className="text-vb-ink">{active.output_preview}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 space-y-3 text-xs">
                      <h3 className="font-display font-bold text-base text-vb-ink">
                        {active.challenge_brief?.challenge_title}
                      </h3>
                      <p className="text-vb-muted">{active.challenge_brief?.problem_statement}</p>
                      <div className="p-2.5 rounded bg-vb-terracotta-tint/50 border border-vb-terracotta/25">
                        <strong className="text-vb-terracotta">Target KPI: </strong>
                        <span>{active.challenge_brief?.target_kpi}</span>
                      </div>
                      <div>
                        <span className="vb-label block mb-1">Evaluation Criteria</span>
                        <ul className="space-y-1 text-vb-ink">
                          {(active.challenge_brief?.evaluation_checklist || []).map((c, i) => (
                            <li key={i}>• {c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mandatory 3-Point Verification Scorecard */}
                {active.status === 'PENDING_REVIEW' ? (
                  <ThreePointScorecard
                    checks={checks}
                    feedback={feedback}
                    disabled={!mentorIsVerified}
                    submitting={decisionMutation.isPending}
                    onChangeChecks={setChecks}
                    onChangeFeedback={setFeedback}
                    onDecision={(dec) => decisionMutation.mutate(dec)}
                  />
                ) : (
                  <div className="vb-card p-5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="vb-label">Recorded Decision</span>
                      <span className="font-mono font-bold text-vb-verified">{active.status}</span>
                    </div>
                    <p className="text-vb-ink">{active.mentor_feedback || 'No additional notes.'}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
