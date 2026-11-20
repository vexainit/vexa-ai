import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, ExternalLink, Trash2, UserCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { apiFetch } from '../../lib/api';
import { formatShortDate } from '../../lib/formatters';
import type { AdminOverviewResponse, UserProfile } from '../../types/vexa';

export function AdminMentorsPage() {
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

  const mentors = (data?.users ?? []).filter((u) => u.role === 'MENTOR');

  return (
    <AppShell title="Admin · Mentor Verification">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-vb-ink">Industry Mentors &amp; Approval Authority</h1>
            <p className="text-xs text-vb-muted mt-0.5">
              Review organization credentials and toggle mentor approval authority (`is_verified`).
            </p>
          </div>
          <span className="tabular-num text-xs font-mono px-2.5 py-1 rounded bg-vb-surface border border-vb-border">
            {mentors.length} registered
          </span>
        </div>

        <div className="vb-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 h-40 animate-pulse" />
          ) : mentors.length === 0 ? (
            <div className="p-10 text-center text-xs text-vb-muted">
              No mentors registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-vb-canvas border-b border-vb-border font-mono text-[11px] uppercase text-vb-muted">
                    <th className="px-4 py-2.5">Mentor</th>
                    <th className="px-4 py-2.5">Organization &amp; Title</th>
                    <th className="px-4 py-2.5">Reviews</th>
                    <th className="px-4 py-2.5">Verification</th>
                    <th className="px-4 py-2.5 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vb-border">
                  {mentors.map((m) => {
                    const meta = m.profile_meta || {};
                    return (
                      <tr key={m.id} className="hover:bg-vb-canvas/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-vb-ink">{m.full_name}</div>
                          <div className="font-mono text-[11px] text-vb-muted">{m.email}</div>
                          <div className="text-[10px] font-mono text-vb-muted mt-0.5">
                            Joined {formatShortDate(m.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-vb-ink">
                            {meta.job_title || '—'} · {meta.organization || '—'}
                          </div>
                          <div className="text-[11px] text-vb-muted flex items-center gap-2 mt-0.5">
                            <span>{meta.years_experience ? `${meta.years_experience} yrs exp` : ''}</span>
                            {meta.linkedin_url && (
                              <a
                                href={meta.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-vb-teal hover:underline"
                              >
                                <span>LinkedIn</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-num font-semibold">{m.stats?.reviews_completed ?? 0}</td>
                        <td className="px-4 py-3">
                          {m.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-vb-verified font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-vb-revision font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              Pending Approval
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => updateMutation.mutate({ id: m.id, body: { is_verified: !m.is_verified } })}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                              m.is_verified
                                ? 'border-vb-border text-vb-muted hover:bg-vb-canvas'
                                : 'border-vb-verified bg-vb-verified text-white'
                            }`}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{m.is_verified ? 'Revoke' : 'Verify Mentor'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateMutation.mutate({ id: m.id, body: { is_active: !m.is_active } })}
                            className="px-2.5 py-1 rounded border border-vb-border text-[11px] font-semibold"
                          >
                            {m.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete mentor account ${m.email}?`)) {
                                deleteMutation.mutate(m.id);
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
