import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, ShieldAlert, Trash2 } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { apiDownload, apiFetch } from '../../lib/api';
import { formatShortDate } from '../../lib/formatters';
import type { AdminOverviewResponse, UserProfile } from '../../types/vexa';

export function AdminBusinessesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverviewResponse>('/admin/overview'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { is_verified?: boolean; is_active?: boolean } }) =>
      apiFetch<UserProfile>(`/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] }),
  });

  const businesses = (data?.users ?? []).filter((u) => u.role === 'BUSINESS');

  return (
    <AppShell title="Admin · Registered Businesses">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-vb-ink">Business Accounts &amp; Incorporation Docs</h1>
            <p className="text-xs text-vb-muted mt-0.5">
              Inspect CIN/GSTIN registrations, download private Incorporation Certificates, and manage account status.
            </p>
          </div>
          <span className="tabular-num text-xs font-mono px-2.5 py-1 rounded bg-vb-surface border border-vb-border">
            {businesses.length} registered
          </span>
        </div>

        <div className="vb-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 h-40 animate-pulse" />
          ) : businesses.length === 0 ? (
            <div className="p-10 text-center text-xs text-vb-muted">
              No businesses registered yet. Businesses appear here immediately after signing up.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-vb-canvas border-b border-vb-border font-mono text-[11px] uppercase text-vb-muted">
                    <th className="px-4 py-2.5">Company &amp; Contact</th>
                    <th className="px-4 py-2.5">CIN / GSTIN</th>
                    <th className="px-4 py-2.5">Incorporation Cert</th>
                    <th className="px-4 py-2.5">Audits</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vb-border">
                  {businesses.map((b) => {
                    const meta = b.profile_meta || {};
                    return (
                      <tr key={b.id} className="hover:bg-vb-canvas/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-vb-ink">{meta.company_name || b.full_name}</div>
                          <div className="text-[11px] text-vb-muted">
                            {b.full_name} · <span className="font-mono">{b.email}</span>
                          </div>
                          <div className="text-[10px] font-mono text-vb-muted mt-0.5">
                            {meta.business_domain || '—'} · Joined {formatShortDate(b.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-vb-ink">{meta.cin_or_gstin || '—'}</td>
                        <td className="px-4 py-3">
                          {meta.has_incorporation_cert ? (
                            <button
                              type="button"
                              onClick={() =>
                                apiDownload(
                                  `/auth/certificate/${b.id}`,
                                  meta.incorporation_cert_name || `${b.id}_cert.pdf`
                                )
                              }
                              className="inline-flex items-center gap-1 text-vb-teal font-semibold hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          ) : (
                            <span className="text-vb-muted">Not uploaded</span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-num font-semibold">{b.stats?.audits_count ?? 0}</td>
                        <td className="px-4 py-3">
                          {b.is_active ? (
                            <span className="inline-flex items-center gap-1 text-vb-verified font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-vb-terracotta font-medium">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Suspended
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => updateMutation.mutate({ id: b.id, body: { is_active: !b.is_active } })}
                            className="px-2.5 py-1 rounded border border-vb-border text-[11px] font-semibold hover:border-vb-teal"
                          >
                            {b.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete business account ${b.email}?`)) {
                                deleteMutation.mutate(b.id);
                              }
                            }}
                            className="p-1.5 rounded border border-vb-terracotta/30 text-vb-terracotta hover:bg-vb-terracotta-tint align-middle"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
