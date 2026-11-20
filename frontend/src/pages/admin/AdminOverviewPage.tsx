import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Lock, SlidersHorizontal } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { TelemetryFunnel } from '../../components/admin/TelemetryFunnel';
import { UserGovernanceTable } from '../../components/admin/UserGovernanceTable';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import type { AdminOverviewResponse, UserProfile } from '../../types/vexa';

export function AdminOverviewPage() {
  const { session } = useRole();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview', session.userId],
    queryFn: () =>
      apiFetch<AdminOverviewResponse>('/admin/overview', {
        userId: session.userId,
        role: session.role,
      }),
    enabled: session.role === 'ADMIN',
  });

  const userMutation = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: { is_verified?: boolean; is_active?: boolean } }) =>
      apiFetch<UserProfile>(`/admin/users/${userId}`, {
        method: 'PATCH',
        userId: session.userId,
        role: session.role,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  if (session.role !== 'ADMIN') {
    return (
      <AppShell>
        <div className="vb-card p-8 text-center space-y-3 max-w-lg mx-auto">
          <Lock className="w-8 h-8 text-vb-terracotta mx-auto" />
          <h1 className="font-display font-bold text-lg text-vb-ink">Admin Access Restricted (403)</h1>
          <p className="text-xs text-vb-muted">
            Switch to <strong>Platform Admin</strong> in the left sidebar Role Switcher to access telemetry, mentor verification, and immutable audit logs.
          </p>
        </div>
      </AppShell>
    );
  }

  const kpis = data?.kpis;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="vb-label">Platform Admin Control Plane</span>
            <h1 className="font-display font-extrabold text-[28px] text-vb-ink mt-0.5">
              Ecosystem Telemetry &amp; Mentor Verification
            </h1>
          </div>
          <Link
            to="/admin/governance"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-vb-ink text-white text-xs font-semibold hover:bg-zinc-800"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Moderation, Config &amp; Audit Logs</span>
          </Link>
        </div>

        {error && (
          <div className="vb-card p-4 border-vb-terracotta bg-vb-terracotta-tint text-xs text-vb-terracotta">
            {(error as Error).message}
          </div>
        )}

        {/* 6-Card Operational KPI Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading || !kpis
            ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="vb-card p-4 h-24 animate-pulse" />)
            : [
                {
                  label: 'Total Audits Run',
                  value: kpis.total_audits,
                  sub: `SMB ${kpis.audits_by_mode.SMB || 0} · P ${kpis.audits_by_mode.PERSONAL || 0}`,
                  tone: 'text-vb-ink',
                },
                {
                  label: 'Published Challenges',
                  value: kpis.published_challenges,
                  sub: 'Active on Builder Feed',
                  tone: 'text-vb-teal',
                },
                {
                  label: 'Active Builders',
                  value: kpis.active_builders,
                  sub: 'Submitted last 30d',
                  tone: 'text-vb-ink',
                },
                {
                  label: 'Pending Reviews',
                  value: kpis.pending_mentor_reviews,
                  sub: 'Waiting mentor check',
                  tone: kpis.pending_mentor_reviews > 5 ? 'text-vb-revision' : 'text-vb-ink',
                },
                {
                  label: 'Approved Pilots',
                  value: kpis.approved_business_pilots,
                  sub: 'North-star metric',
                  tone: 'text-vb-verified',
                },
                {
                  label: 'Avg Turnaround',
                  value: `${kpis.avg_review_turnaround_mins}m`,
                  sub: 'Target SLA <12h',
                  tone: 'text-vb-ink',
                },
              ].map((card) => (
                <div key={card.label} className="vb-card p-4">
                  <div className="vb-label truncate">{card.label}</div>
                  <div className={`tabular-num text-2xl font-bold mt-1.5 ${card.tone}`}>
                    {card.value}
                  </div>
                  <div className="text-[10px] font-mono text-vb-muted mt-0.5 truncate">{card.sub}</div>
                </div>
              ))}
        </div>

        {/* 5-Stage Conversion Funnel */}
        {data?.funnel && <TelemetryFunnel funnel={data.funnel} />}

        {/* Searchable User & Mentor Governance Directory */}
        {data?.users && (
          <UserGovernanceTable
            users={data.users}
            busyUserId={userMutation.isPending ? userMutation.variables?.userId : null}
            onToggleVerify={(u) =>
              userMutation.mutate({ userId: u.id, body: { is_verified: !u.is_verified } })
            }
            onToggleActive={(u) =>
              userMutation.mutate({ userId: u.id, body: { is_active: !u.is_active } })
            }
          />
        )}
      </div>
    </AppShell>
  );
}
