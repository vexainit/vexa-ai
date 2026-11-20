import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  Globe,
  Lock,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { BottleneckCard } from '../../components/business/BottleneckCard';
import { HealthScoreStrip } from '../../components/business/HealthScoreStrip';
import { PIIShieldDiffDrawer } from '../../components/business/PIIShieldDiffDrawer';
import { RoadmapSplitView } from '../../components/business/RoadmapSplitView';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import { formatShortDate } from '../../lib/formatters';
import { buildCsvTickets, buildMarkdownTickets, triggerTextDownload } from '../../lib/ticketExport';
import type { DiagnosticCase } from '../../types/vexa';

export function AuditReportPage() {
  const { id = '' } = useParams();
  const { session } = useRole();
  const queryClient = useQueryClient();

  const [piiDrawerOpen, setPiiDrawerOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [personalOptIn, setPersonalOptIn] = useState(false);

  const { data: audit, isLoading, error } = useQuery({
    queryKey: ['audit', id, session.userId],
    queryFn: () =>
      apiFetch<DiagnosticCase>(`/audits/${id}`, {
        userId: session.userId,
        role: session.role,
      }),
    enabled: Boolean(id) && (session.role === 'BUSINESS' || session.role === 'ADMIN'),
  });

  const publishMutation = useMutation({
    mutationFn: (nextPublished: boolean) =>
      apiFetch<DiagnosticCase>(`/audits/${id}/publish`, {
        method: 'PATCH',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify({ is_published_to_builders: nextPublished }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      setPiiDrawerOpen(false);
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="vb-card p-6 h-24 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="vb-card p-4 h-28 animate-pulse" />
            ))}
          </div>
          <div className="vb-card p-6 h-48 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (error || !audit) {
    return (
      <AppShell>
        <div className="vb-card p-8 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-vb-terracotta mx-auto" />
          <h2 className="font-display font-bold text-lg text-vb-ink">Diagnostic Report Not Found</h2>
          <p className="text-xs text-vb-muted">{(error as Error)?.message || 'Invalid case ID.'}</p>
          <Link
            to="/business"
            className="inline-block px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold"
          >
            Back to Diagnostic Audits
          </Link>
        </div>
      </AppShell>
    );
  }

  const report = audit.ai_report;
  const brief = report.challenge_brief;
  const isPersonal = audit.workspace_mode === 'PERSONAL';
  const canPublish = !isPersonal || personalOptIn || audit.is_published_to_builders;

  return (
    <AppShell>
      <div className="space-y-6 pb-8">
        {/* Report Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-vb-teal-tint text-vb-teal">
                {audit.workspace_mode} MODE
              </span>
              <span className="text-xs text-vb-muted">
                {audit.domain_category} · {formatShortDate(audit.created_at)}
              </span>
              {report.generation_mode === 'deterministic_fallback' && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-vb-revision-tint text-vb-revision">
                  Deterministic Pandas Fallback
                </span>
              )}
            </div>
            <h1 className="font-display font-extrabold text-[26px] text-vb-ink leading-tight">
              {audit.title} — AI Diagnostic Report
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPiiDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-vb-verified bg-vb-verified-tint text-vb-verified text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy Preview</span>
            </button>
            <Link
              to={`/business/audits/${audit.id}/solutions`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-vb-border bg-vb-surface text-vb-ink text-xs font-semibold hover:border-vb-teal"
            >
              <Users className="w-4 h-4 text-vb-teal" />
              <span>
                Matched Solutions ({audit.submission_counts.approved} Approved)
              </span>
            </Link>
          </div>
        </div>

        {/* Band 1: 4-Metric Tabular KPI Strip */}
        <HealthScoreStrip
          score={report.health_score}
          stats={audit.deterministic_stats}
          mode={audit.workspace_mode}
          piiColumnsCount={audit.pii_summary?.masked_columns?.length}
        />

        {/* Band 2: Executive Summary */}
        <section className="vb-card p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-vb-border">
            <h2 className="font-display font-bold text-base text-vb-ink">
              Executive Summary (Grounded in Deterministic Pandas Metrics)
            </h2>
            <span className="font-mono text-[11px] text-vb-muted">Zero-Hallucination Math</span>
          </div>
          <ul className="space-y-2 text-sm text-vb-ink">
            {report.executive_summary.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="tabular-num text-xs font-bold text-vb-teal mt-0.5">0{idx + 1}</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-2.5 border-t border-vb-border text-[11px] text-vb-muted">
            Footnote: Manual staff hours lost are computed deterministically at a conservative 6 min/exception baseline.
          </div>
        </section>

        {/* Optional Personal S.P.E.N.D. Mode Behavioral Diagnostic Card */}
        {isPersonal && report.personal_spend && (
          <section className="vb-card p-5 border-vb-teal/40 bg-vb-teal-tint/20 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-vb-border">
              <div>
                <span className="vb-label text-vb-teal">Personal S.P.E.N.D. Behavioral Diagnostic</span>
                <h2 className="font-display font-bold text-lg text-vb-ink mt-0.5">
                  Archetype: {report.personal_spend.behavioral_archetype}
                </h2>
              </div>
              <div className="px-3 py-1.5 rounded bg-vb-terracotta-tint border border-vb-terracotta/30">
                <span className="vb-label text-vb-terracotta block">Micro-Leakage Score</span>
                <span className="tabular-num text-lg font-bold text-vb-terracotta">
                  {report.personal_spend.micro_leakage_score} / 100
                </span>
              </div>
            </div>
            <div>
              <div className="vb-label mb-2">7-Day Personal Fix Checklist</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {report.personal_spend.seven_day_fix_checklist.map((step, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-vb-surface border border-vb-border text-xs text-vb-ink flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-vb-teal shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Band 3: Top 3 Ranked Bottlenecks */}
        <section className="space-y-3">
          <h2 className="font-display font-bold text-[18px] text-vb-ink">
            Top 3 Ranked Operational Bottlenecks
          </h2>
          <div className="space-y-3">
            {report.top_bottlenecks.map((item) => (
              <BottleneckCard key={item.rank} item={item} />
            ))}
          </div>
        </section>

        {/* Band 4: Two-Column Actionable Improvement Roadmap */}
        <section className="space-y-3">
          <h2 className="font-display font-bold text-[18px] text-vb-ink">
            Actionable Improvement Roadmap
          </h2>
          <RoadmapSplitView actions={report.improvement_roadmap} />
        </section>

        {/* Band 5: Auto-Generated Builder Challenge Brief */}
        <section className="vb-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-vb-border">
            <div>
              <span className="vb-label text-vb-teal">Auto-Scoped from Bottleneck #1</span>
              <h2 className="font-display font-bold text-lg text-vb-ink mt-0.5">
                {brief.challenge_title}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded bg-vb-teal-tint text-vb-teal font-semibold">
                {brief.expected_deliverable_type}
              </span>
              <span className="px-2.5 py-1 rounded bg-vb-canvas border border-vb-border font-medium">
                {brief.difficulty}
              </span>
            </div>
          </div>

          <p className="text-sm text-vb-muted leading-relaxed">{brief.problem_statement}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-vb-canvas border border-vb-border">
              <div className="vb-label mb-2">Technical Requirements</div>
              <ul className="space-y-1.5 text-xs text-vb-ink">
                {brief.technical_requirements.map((req, i) => (
                  <li key={i}>• {req}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded bg-vb-canvas border border-vb-border">
              <div className="vb-label mb-2">Mentor Evaluation Checklist</div>
              <ul className="space-y-1.5 text-xs text-vb-ink">
                {brief.evaluation_checklist.map((chk, i) => (
                  <li key={i}>• {chk}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Bottom Dual-Execution Action Bar (Self-Serve vs. Builder Network) */}
        <section className="vb-card p-5 border-vb-teal/40 bg-vb-surface space-y-3">
          {isPersonal && !audit.is_published_to_builders && (
            <label className="flex items-start gap-2.5 p-3 rounded bg-vb-revision-tint/60 border border-vb-revision/30 text-xs text-vb-revision cursor-pointer">
              <input
                type="checkbox"
                checked={personalOptIn}
                onChange={(e) => setPersonalOptIn(e.target.checked)}
                className="mt-0.5 accent-[#0F4C5C]"
              />
              <span>
                <strong>Personal Mode Privacy Guardrail:</strong> Builder publishing is disabled by default
                for Personal UPI audits. Check this box to explicitly opt in to sharing the anonymized dataset.
              </span>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-display font-bold text-sm text-vb-ink">
                Execute Bottleneck #1 — Dual-Track Routing (Zero Lock-In)
              </div>
              <div className="text-xs text-vb-muted mt-0.5">
                Export internal Jira/Trello/Notion tickets OR publish the PII-safe brief to the Vexa Builder Network.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setTicketModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded border border-vb-border bg-vb-canvas text-vb-ink text-xs font-semibold hover:border-vb-teal"
              >
                <Download className="w-4 h-4 text-vb-teal" />
                <span>Download Task List</span>
              </button>

              <button
                type="button"
                disabled={!canPublish || publishMutation.isPending}
                onClick={() => publishMutation.mutate(!audit.is_published_to_builders)}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded text-xs font-semibold transition-colors disabled:opacity-45 ${
                  audit.is_published_to_builders
                    ? 'border border-vb-verified bg-vb-verified-tint text-vb-verified hover:bg-emerald-100'
                    : 'bg-vb-teal text-white hover:bg-vb-teal-dark'
                }`}
              >
                {audit.is_published_to_builders ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Posted to Student Hub (Click to Unpost)</span>
                  </>
                ) : (
                  <>
                    {canPublish ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>
                      {publishMutation.isPending ? 'Updating...' : 'Post to Student Hub'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Page 6A: Signature 640px Side-by-Side PII Shield Diff Drawer */}
      <PIIShieldDiffDrawer
        caseId={audit.id}
        open={piiDrawerOpen}
        onClose={() => setPiiDrawerOpen(false)}
        isPublished={audit.is_published_to_builders}
        publishing={publishMutation.isPending}
        onConfirmPublish={canPublish ? () => publishMutation.mutate(true) : undefined}
      />

      {/* Page 6B: Self-Serve Internal Ticket Export Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-vb-ink/40" onClick={() => setTicketModalOpen(false)} />
          <div className="relative z-10 w-full max-w-xl vb-card overflow-hidden">
            <div className="px-5 py-4 bg-vb-teal text-white flex items-center justify-between">
              <span className="font-display font-bold text-sm">
                Download Task List (Notion · Linear · Jira · Trello)
              </span>
              <button type="button" onClick={() => setTicketModalOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-vb-muted">
                Download your scoped Bottleneck #1 brief and improvement roadmap for internal team execution—zero external sharing required.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    triggerTextDownload(
                      `${audit.id}_tickets.md`,
                      buildMarkdownTickets(audit),
                      'text/markdown;charset=utf-8'
                    )
                  }
                  className="p-4 rounded border border-vb-border hover:border-vb-teal text-left bg-vb-canvas/60 space-y-1.5"
                >
                  <FileCode2 className="w-5 h-5 text-vb-teal" />
                  <div className="font-display font-bold text-sm text-vb-ink">Download tickets.md</div>
                  <div className="text-[11px] text-vb-muted">
                    Clean Notion / Linear checklist with acceptance criteria &amp; KPI callouts.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerTextDownload(
                      `${audit.id}_tickets.csv`,
                      buildCsvTickets(audit),
                      'text/csv;charset=utf-8'
                    )
                  }
                  className="p-4 rounded border border-vb-border hover:border-vb-teal text-left bg-vb-canvas/60 space-y-1.5"
                >
                  <FileSpreadsheet className="w-5 h-5 text-vb-teal" />
                  <div className="font-display font-bold text-sm text-vb-ink">Download tickets.csv</div>
                  <div className="text-[11px] text-vb-muted">
                    Jira Cloud &amp; Trello columns: Summary, Issue Type, Priority, Labels, Description, Target KPI.
                  </div>
                </button>
              </div>
              <pre className="p-3 rounded bg-vb-canvas border border-vb-border font-mono text-[11px] text-vb-ink max-h-48 overflow-auto whitespace-pre-wrap">
                {buildMarkdownTickets(audit)}
              </pre>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setTicketModalOpen(false)}
                  className="px-4 py-2 rounded border border-vb-border text-xs font-semibold text-vb-ink hover:bg-vb-canvas"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
