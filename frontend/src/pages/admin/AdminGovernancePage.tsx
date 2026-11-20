import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle2, Lock, RotateCcw, Save } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { AuditLogTable } from '../../components/admin/AuditLogTable';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import type { AdminConfig, AdminOverviewResponse, DiagnosticCase, WorkspaceMode } from '../../types/vexa';

export function AdminGovernancePage() {
  const { session } = useRole();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'moderation' | 'config' | 'logs'>('moderation');
  const [confirmArchiveCase, setConfirmArchiveCase] = useState<DiagnosticCase | null>(null);
  const [fitThreshold, setFitThreshold] = useState(65);
  const [maxUploadMb, setMaxUploadMb] = useState(10);
  const [enabledModes, setEnabledModes] = useState<WorkspaceMode[]>(['SMB', 'CAMPUS', 'PERSONAL']);
  const [savedNotice, setSavedNotice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview', session.userId],
    queryFn: () =>
      apiFetch<AdminOverviewResponse>('/admin/overview', {
        userId: session.userId,
        role: session.role,
      }),
    enabled: session.role === 'ADMIN',
  });

  useEffect(() => {
    if (!data?.config) return;
    setFitThreshold(data.config.min_ai_fit_alert_threshold);
    setMaxUploadMb(data.config.max_upload_mb);
    setEnabledModes(data.config.enabled_modes);
  }, [data?.config]);

  const caseMutation = useMutation({
    mutationFn: ({
      caseId,
      body,
    }: {
      caseId: string;
      body: { status?: 'ACTIVE' | 'ARCHIVED'; is_published_to_builders?: boolean };
    }) =>
      apiFetch<DiagnosticCase>(`/admin/cases/${caseId}`, {
        method: 'PATCH',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setConfirmArchiveCase(null);
    },
  });

  const configMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ config: AdminConfig }>('/admin/config', {
        method: 'PATCH',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify({
          min_ai_fit_alert_threshold: fitThreshold,
          max_upload_mb: maxUploadMb,
          enabled_modes: enabledModes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      setSavedNotice('Global guardrails updated and logged to system_audit_logs.');
      window.setTimeout(() => setSavedNotice(''), 3000);
    },
  });

  if (session.role !== 'ADMIN') {
    return (
      <AppShell>
        <div className="vb-card p-8 text-center space-y-3 max-w-lg mx-auto">
          <Lock className="w-8 h-8 text-vb-terracotta mx-auto" />
          <h1 className="font-display font-bold text-lg text-vb-ink">Admin Access Restricted (403)</h1>
          <p className="text-xs text-vb-muted">Switch to Platform Admin in the sidebar Role Switcher.</p>
        </div>
      </AppShell>
    );
  }

  const toggleMode = (m: WorkspaceMode) => {
    setEnabledModes((prev) =>
      prev.includes(m)
        ? prev.length > 1
          ? prev.filter((x) => x !== m)
          : prev
        : [...prev, m]
    );
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <span className="vb-label">Platform Admin Control Plane</span>
          <h1 className="font-display font-extrabold text-[28px] text-vb-ink mt-0.5">
            Case Moderation, Global Config &amp; Immutable Audit Logs
          </h1>
        </div>

        {/* 3 Clean Governance Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-vb-border pb-2">
          {[
            { id: 'moderation', label: `1. Case Moderation (${data?.cases.length ?? 0})` },
            { id: 'config', label: '2. System Config & Guardrails' },
            { id: 'logs', label: `3. Immutable Audit Logs (${data?.audit_logs.length ?? 0})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as 'moderation' | 'config' | 'logs')}
              className={`px-4 py-2 rounded text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? 'bg-vb-ink text-white'
                  : 'bg-vb-surface border border-vb-border text-vb-muted hover:text-vb-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="vb-card p-8 h-56 animate-pulse" />
        ) : activeTab === 'moderation' ? (
          <div className="vb-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-vb-canvas border-b border-vb-border font-mono text-[11px] uppercase text-vb-muted">
                    <th className="px-4 py-2.5">Case Title</th>
                    <th className="px-4 py-2.5">Mode</th>
                    <th className="px-4 py-2.5">Leak Est.</th>
                    <th className="px-4 py-2.5">Publish State</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vb-border">
                  {(data?.cases ?? []).map((c) => (
                    <tr key={c.id} className="hover:bg-vb-canvas/40">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-vb-ink">{c.title}</div>
                        <div className="font-mono text-[11px] text-vb-muted">
                          {c.id} · Owner: {c.owner_id}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">{c.workspace_mode}</td>
                      <td className="px-4 py-3 tabular-num font-semibold text-vb-terracotta">
                        {formatINR(c.deterministic_stats.est_monthly_leak_inr)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono text-[11px] px-2 py-0.5 rounded ${
                            c.is_published_to_builders
                              ? 'bg-vb-teal-tint text-vb-teal font-semibold'
                              : 'bg-vb-canvas text-vb-muted border border-vb-border'
                          }`}
                        >
                          {c.is_published_to_builders ? 'Published' : 'Private'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">{c.status}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        {c.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            onClick={() =>
                              caseMutation.mutate({
                                caseId: c.id,
                                body: { is_published_to_builders: !c.is_published_to_builders },
                              })
                            }
                            className="px-2.5 py-1 rounded border border-vb-border text-[11px] font-semibold hover:border-vb-teal"
                          >
                            {c.is_published_to_builders ? 'Unpublish' : 'Publish'}
                          </button>
                        )}
                        {c.status === 'ARCHIVED' ? (
                          <button
                            type="button"
                            onClick={() =>
                              caseMutation.mutate({ caseId: c.id, body: { status: 'ACTIVE' } })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-vb-teal text-vb-teal text-[11px] font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmArchiveCase(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-vb-terracotta/40 text-vb-terracotta text-[11px] font-semibold hover:bg-vb-terracotta-tint"
                          >
                            <Archive className="w-3 h-3" />
                            <span>Archive</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'config' ? (
          <div className="vb-card p-6 max-w-2xl space-y-5">
            <div>
              <h2 className="font-display font-bold text-base text-vb-ink">
                Global Operational Guardrails
              </h2>
              <p className="text-xs text-vb-muted mt-0.5">
                Controls platform-wide AI Fit Score alert thresholds, upload size caps, and active commercial Workspace Modes.
              </p>
            </div>

            {savedNotice && (
              <div className="p-3 rounded bg-vb-verified-tint border border-vb-verified/30 text-xs text-vb-verified flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{savedNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vb-label block mb-1.5">Min AI Fit Score Alert Threshold (0–100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={fitThreshold}
                  onChange={(e) => setFitThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm tabular-num rounded border border-vb-border bg-vb-surface"
                />
              </div>
              <div>
                <label className="vb-label block mb-1.5">Max File Upload Limit (MB)</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxUploadMb}
                  onChange={(e) => setMaxUploadMb(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm tabular-num rounded border border-vb-border bg-vb-surface"
                />
              </div>
            </div>

            <div>
              <label className="vb-label block mb-2">Enabled Commercial Workspace Modes</label>
              <div className="flex flex-wrap gap-3">
                {(['SMB', 'CAMPUS', 'PERSONAL'] as WorkspaceMode[]).map((m) => {
                  const on = enabledModes.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMode(m)}
                      className={`px-3.5 py-2 rounded text-xs font-mono font-semibold border ${
                        on
                          ? 'bg-vb-teal text-white border-vb-teal'
                          : 'bg-vb-canvas text-vb-muted border-vb-border'
                      }`}
                    >
                      {m} {on ? '· ENABLED' : '· OFF'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-vb-border flex justify-end">
              <button
                type="button"
                disabled={configMutation.isPending}
                onClick={() => configMutation.mutate()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{configMutation.isPending ? 'Saving...' : 'Save Global Guardrails'}</span>
              </button>
            </div>
          </div>
        ) : (
          <AuditLogTable logs={data?.audit_logs ?? []} />
        )}
      </div>

      {/* Confirmation Dialog before Archiving an Active Case (PRD Ch. 16.1 Page 14) */}
      {confirmArchiveCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-vb-ink/45" onClick={() => setConfirmArchiveCase(null)} />
          <div className="relative z-10 w-full max-w-md vb-card p-6 space-y-4">
            <h3 className="font-display font-bold text-base text-vb-ink">
              Archive Diagnostic Case?
            </h3>
            <p className="text-xs text-vb-muted leading-relaxed">
              Archiving <strong>{confirmArchiveCase.title}</strong> ({confirmArchiveCase.id}) immediately unpublishes it from the Student Challenge Feed and logs <span className="font-mono">CASE_ARCHIVED</span> in the compliance trail.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-vb-border">
              <button
                type="button"
                onClick={() => setConfirmArchiveCase(null)}
                className="px-4 py-2 rounded border border-vb-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={caseMutation.isPending}
                onClick={() =>
                  caseMutation.mutate({
                    caseId: confirmArchiveCase.id,
                    body: { status: 'ARCHIVED' },
                  })
                }
                className="px-4 py-2 rounded bg-vb-terracotta text-white text-xs font-semibold"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
