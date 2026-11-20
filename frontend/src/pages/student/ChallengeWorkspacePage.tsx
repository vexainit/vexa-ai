import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { DatasetPreviewTable } from '../../components/student/DatasetPreviewTable';
import { SubmissionForm, type SubmissionFormPayload } from '../../components/student/SubmissionForm';
import { useRole } from '../../context/RoleContext';
import { apiDownload, apiFetch } from '../../lib/api';
import type { BuilderSubmission, ChallengeItem } from '../../types/vexa';

export function ChallengeWorkspacePage() {
  const { id = '' } = useParams();
  const { session } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [downloadError, setDownloadError] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const { data: challenge, isLoading, error } = useQuery({
    queryKey: ['challenge', id, session.userId],
    queryFn: () =>
      apiFetch<ChallengeItem>(`/challenges/${id}`, {
        userId: session.userId,
        role: session.role,
      }),
    enabled: Boolean(id),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: SubmissionFormPayload) =>
      apiFetch<BuilderSubmission>('/submissions', {
        method: 'POST',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify(payload),
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      navigate(`/student/submissions/${created.id}`);
    },
  });

  const handleDownloadCsv = async () => {
    try {
      setDownloadError('');
      await apiDownload(`/challenges/${id}/dataset`, `${id}_masked_safe.csv`, {
        userId: session.userId,
        role: session.role,
      });
    } catch (e) {
      setDownloadError((e as Error).message);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="vb-card p-8 h-64 animate-pulse" />
      </AppShell>
    );
  }

  if (error || !challenge) {
    return (
      <AppShell>
        <div className="vb-card p-8 text-center space-y-3">
          <h2 className="font-display font-bold text-lg text-vb-ink">Challenge Not Found</h2>
          <Link to="/student/challenges" className="text-xs font-semibold text-vb-teal underline">
            Return to Challenge Marketplace
          </Link>
        </div>
      </AppShell>
    );
  }

  const brief = challenge.challenge_brief;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link
            to="/student/challenges"
            className="inline-flex items-center gap-1 text-xs font-semibold text-vb-teal hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Challenge Feed</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-vb-canvas border border-vb-border">
              {challenge.workspace_mode}
            </span>
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-vb-teal-tint text-vb-teal">
              {brief.expected_deliverable_type}
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-canvas border border-vb-border">
              {brief.difficulty}
            </span>
          </div>
          <h1 className="font-display font-extrabold text-[26px] text-vb-ink mt-1.5">
            {brief.challenge_title}
          </h1>
        </div>

        {/* 65 / 35 Split Layout (PRD Page 9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 65% (7 cols): Problem & Technical Brief */}
          <div className="lg:col-span-7 space-y-5">
            <div className="vb-card p-5 space-y-3">
              <div className="vb-label">Anonymized Business Context &amp; Current Stack</div>
              <p className="text-sm text-vb-ink font-medium">{brief.anonymized_context}</p>
              <div className="flex flex-wrap gap-1.5">
                {challenge.current_tools.map((t) => (
                  <span
                    key={t}
                    className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div className="pt-3 border-t border-vb-border">
                <div className="vb-label mb-1">Bottleneck #1 Root Cause &amp; Scope</div>
                <p className="text-sm text-vb-muted leading-relaxed">{brief.problem_statement}</p>
              </div>
              <div className="p-3 rounded bg-vb-terracotta-tint/60 border border-vb-terracotta/25 text-xs">
                <span className="font-semibold text-vb-terracotta">Target KPI: </span>
                <span className="text-vb-ink font-medium">{brief.target_kpi}</span>
              </div>
            </div>

            <div className="vb-card p-5 space-y-4">
              <div>
                <h2 className="font-display font-bold text-sm text-vb-ink mb-2">
                  Technical Requirements Checklist
                </h2>
                <ul className="space-y-2 text-xs text-vb-ink">
                  {brief.technical_requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-vb-teal shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-vb-border">
                <h2 className="font-display font-bold text-sm text-vb-ink mb-2">
                  Mentor 3-Point Grading Rubric (Upfront Transparency)
                </h2>
                <ul className="space-y-1.5 text-xs text-vb-muted">
                  {brief.evaluation_checklist.map((chk, i) => (
                    <li key={i}>• {chk}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Inline Submission Form (Student role only) */}
            {session.role === 'STUDENT' && showSubmitForm && (
              <SubmissionForm
                caseId={challenge.id}
                submitting={submitMutation.isPending}
                serverError={(submitMutation.error as Error | null)?.message}
                onSubmit={(payload) => submitMutation.mutate(payload)}
              />
            )}
          </div>

          {/* Right 35% (5 cols): Sticky Safe Dataset Card */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            <div className="vb-card p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="vb-label text-vb-ink">Safe Sample Data</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-vb-verified-tint text-vb-verified">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  0% PII Leak Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-vb-canvas border border-vb-border">
                  <div className="vb-label">Total Rows</div>
                  <div className="tabular-num font-bold text-base text-vb-ink mt-0.5">
                    {challenge.row_count}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-vb-canvas border border-vb-border">
                  <div className="vb-label">Columns</div>
                  <div className="tabular-num font-bold text-base text-vb-ink mt-0.5">
                    {challenge.col_count}
                  </div>
                </div>
              </div>

              <div>
                <div className="vb-label mb-1.5">First 5 Masked Rows (Monospace Preview)</div>
                {challenge.dataset_preview && (
                  <DatasetPreviewTable
                    columns={challenge.dataset_preview.columns}
                    rows={challenge.dataset_preview.rows}
                  />
                )}
              </div>

              {downloadError && (
                <div className="p-2.5 rounded bg-vb-terracotta-tint text-xs text-vb-terracotta">
                  {downloadError}
                </div>
              )}

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-vb-teal bg-vb-surface text-vb-teal text-xs font-semibold hover:bg-vb-teal-tint transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Safe Sample Data (.csv)</span>
                </button>

                {session.role === 'STUDENT' && (
                  <button
                    type="button"
                    onClick={() => setShowSubmitForm(true)}
                    className="w-full px-4 py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark transition-colors"
                  >
                    {showSubmitForm ? 'Complete Draft Form Below ↓' : 'Submit Solution Draft'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
