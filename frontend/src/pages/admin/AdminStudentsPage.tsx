import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, ShieldAlert, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../../components/layout/AppShell';
import { apiFetch } from '../../lib/api';
import { formatShortDate } from '../../lib/formatters';
import type { AdminOverviewResponse, UserProfile } from '../../types/vexa';

export function AdminStudentsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverviewResponse>('/admin/overview'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { is_active?: boolean } }) =>
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

  const students = (data?.users ?? []).filter((u) => u.role === 'STUDENT');

  return (
    <AppShell title="Admin · Student Builders">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-xl text-vb-ink">Student Builder Directory</h1>
            <p className="text-xs text-vb-muted mt-0.5">
              Track college affiliation, graduation cohorts, submissions, and Verified Proof-of-Work portfolios.
            </p>
          </div>
          <span className="tabular-num text-xs font-mono px-2.5 py-1 rounded bg-vb-surface border border-vb-border">
            {students.length} registered
          </span>
        </div>

        <div className="vb-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 h-40 animate-pulse" />
          ) : students.length === 0 ? (
            <div className="p-10 text-center text-xs text-vb-muted">
              No student builders registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-vb-canvas border-b border-vb-border font-mono text-[11px] uppercase text-vb-muted">
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">College &amp; Cohort</th>
                    <th className="px-4 py-2.5">Builds / Verified</th>
                    <th className="px-4 py-2.5">Portfolio</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vb-border">
                  {students.map((s) => {
                    const meta = s.profile_meta || {};
                    return (
                      <tr key={s.id} className="hover:bg-vb-canvas/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-vb-ink">{s.full_name}</div>
                          <div className="font-mono text-[11px] text-vb-muted">{s.email}</div>
                          <div className="text-[10px] font-mono text-vb-muted mt-0.5">
                            ID: {meta.student_id_number || '—'} · Joined {formatShortDate(s.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-vb-ink">{meta.college_name || '—'}</div>
                          <div className="text-[11px] text-vb-muted">
                            {meta.degree_branch || '—'} · Class of {meta.graduation_year || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-num">
                          <span className="font-semibold text-vb-ink">{s.stats?.submissions_count ?? 0}</span>
                          {' / '}
                          <span className="font-semibold text-vb-verified">
                            {s.stats?.verified_builds_count ?? 0} PoW
                          </span>
                        </td>
                        <td className="px-4 py-3 space-x-2 whitespace-nowrap">
                          <Link to={`/portfolio/${s.id}`} className="text-vb-teal font-semibold hover:underline">
                            PoW Card
                          </Link>
                          {meta.github_url && (
                            <a
                              href={meta.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-vb-muted hover:text-vb-ink"
                            >
                              <span>GitHub</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.is_active ? (
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
                            onClick={() => updateMutation.mutate({ id: s.id, body: { is_active: !s.is_active } })}
                            className="px-2.5 py-1 rounded border border-vb-border text-[11px] font-semibold hover:border-vb-teal"
                          >
                            {s.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete student account ${s.email}?`)) {
                                deleteMutation.mutate(s.id);
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
