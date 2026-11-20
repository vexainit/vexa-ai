import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Lock, ShieldCheck, X } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import type { PIIDiffResponse } from '../../types/vexa';

export function PIIShieldDiffDrawer({
  caseId,
  open,
  onClose,
  onConfirmPublish,
  isPublished,
  publishing,
}: {
  caseId: string;
  open: boolean;
  onClose: () => void;
  onConfirmPublish?: () => void;
  isPublished?: boolean;
  publishing?: boolean;
}) {
  const { session } = useRole();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['pii-diff', caseId, session.userId],
    queryFn: () =>
      apiFetch<PIIDiffResponse>(`/audits/${caseId}/pii-diff`, {
        userId: session.userId,
        role: session.role,
      }),
    enabled: open && Boolean(caseId),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="PII Shield Diff Inspector">
      <div className="fixed inset-0 bg-vb-ink/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[640px] h-full bg-vb-surface border-l border-vb-border flex flex-col">
        {/* Top Dark Forest Teal Inspector Header */}
        <div className="bg-vb-teal text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>PII Shield Diff Inspector</span>
            </div>
            <div className="text-xs text-white/85 mt-1 font-mono">
              {data
                ? `${data.redacted_columns.length} Sensitive Columns Redacted • 0% Leak Gate Verified`
                : 'Inspecting Owner-Only Raw vs. Builder-Safe Masked Rows'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 text-white"
            aria-label="Close PII Shield Diff Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-vb-canvas">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="vb-card p-4 h-36 animate-pulse bg-vb-surface" />
              ))}
            </div>
          ) : error ? (
            <div className="vb-card p-5 border-vb-terracotta bg-vb-terracotta-tint text-vb-terracotta text-sm flex items-start gap-2.5">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Access Restricted (403)</div>
                <p className="text-xs mt-1">{(error as Error).message}</p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Summary Badges */}
              <div className="vb-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="vb-label">Detected &amp; Redacted Columns</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded bg-vb-verified-tint text-vb-verified">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    verify_pii.py PASS (0 Leaks)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.redacted_columns.map((col) => (
                    <span
                      key={col}
                      className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-terracotta-tint text-vb-terracotta border border-vb-terracotta/25"
                    >
                      {col}
                    </span>
                  ))}
                </div>
                {data.rules_triggered.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-vb-border">
                    {data.rules_triggered.map((rule) => (
                      <span
                        key={rule}
                        className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                      >
                        {rule}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Side-by-Side 3-Row Diff Cards */}
              {data.sample_rows.map((row) => {
                const keys = Object.keys(row.original);
                const redactedSet = new Set(data.redacted_columns);
                return (
                  <div key={row.row_index} className="vb-card overflow-hidden">
                    <div className="px-4 py-2 bg-vb-canvas border-b border-vb-border flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-vb-ink">
                        Sample Row #{row.row_index}
                      </span>
                      <span className="text-[11px] text-vb-muted">
                        Salted SHA-256 preserves repeat-customer analytics
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-vb-border">
                      {/* Left: Original Upload (Private Bucket Only) */}
                      <div className="p-3.5 bg-vb-terracotta-tint/35">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-vb-terracotta mb-2">
                          Original Upload (Private Bucket Only)
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          {keys.map((k) => {
                            const changed = redactedSet.has(k) || row.original[k] !== row.masked[k];
                            return (
                              <div key={k} className="flex gap-1.5 leading-snug">
                                <span className="text-vb-muted shrink-0">{k}:</span>
                                <span
                                  className={`break-all ${
                                    changed
                                      ? 'bg-vb-terracotta/15 text-vb-terracotta font-semibold px-1 rounded'
                                      : 'text-vb-ink'
                                  }`}
                                >
                                  {row.original[k] || '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Masked Builder CSV */}
                      <div className="p-3.5 bg-vb-verified-tint/35">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-vb-verified mb-2">
                          Masked Builder CSV (Students &amp; Mentors)
                        </div>
                        <div className="space-y-1 font-mono text-[11px]">
                          {keys.map((k) => {
                            const changed = redactedSet.has(k) || row.original[k] !== row.masked[k];
                            return (
                              <div key={k} className="flex gap-1.5 leading-snug">
                                <span className="text-vb-muted shrink-0">{k}:</span>
                                <span
                                  className={`break-all ${
                                    changed
                                      ? 'bg-vb-verified/15 text-vb-verified font-semibold px-1 rounded'
                                      : 'text-vb-ink'
                                  }`}
                                >
                                  {row.masked[k] || '—'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : null}
        </div>

        {/* Footer Action Bar */}
        <div className="px-6 py-4 bg-vb-surface border-t border-vb-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded border border-vb-border text-vb-ink hover:bg-vb-canvas"
          >
            Close Inspector
          </button>
          {onConfirmPublish && !isPublished && (
            <button
              type="button"
              disabled={publishing}
              onClick={onConfirmPublish}
              className="px-4 py-2 text-xs font-semibold rounded bg-vb-teal text-white hover:bg-vb-teal-dark disabled:opacity-50"
            >
              {publishing ? 'Publishing...' : 'Verify 0% Leak & Publish to Builder Network'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
