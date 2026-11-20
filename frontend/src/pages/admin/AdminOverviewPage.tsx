import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Database, GraduationCap, Users } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { TelemetryFunnel } from '../../components/admin/TelemetryFunnel';
import { apiFetch } from '../../lib/api';
import type { AdminOverviewResponse } from '../../types/vexa';

export function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverviewResponse>('/admin/overview'),
  });

  const kpis = data?.kpis;

  return (
    <AppShell
      title="Platform Overview & Telemetry"
      actions={
        <Link
          to="/admin/database"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-vb-ink text-white text-xs font-semibold hover:bg-zinc-800"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Database Explorer</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* 3 Ecosystem Quick-Jump Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/businesses" className="vb-card p-4 hover:border-vb-teal transition-colors">
            <div className="flex items-center justify-between">
              <span className="vb-label">Businesses</span>
              <Building2 className="w-4 h-4 text-vb-teal" />
            </div>
            <div className="tabular-num text-2xl font-bold text-vb-ink mt-1">
              {kpis?.total_businesses ?? 0}
            </div>
            <div className="text-[11px] text-vb-muted mt-1">
              Manage CIN/GSTIN, Incorporation Certs &amp; Audits →
            </div>
          </Link>

          <Link to="/admin/students" className="vb-card p-4 hover:border-vb-teal transition-colors">
            <div className="flex items-center justify-between">
              <span className="vb-label">Students</span>
              <GraduationCap className="w-4 h-4 text-vb-teal" />
            </div>
            <div className="tabular-num text-2xl font-bold text-vb-ink mt-1">
              {kpis?.total_students ?? 0}
            </div>
            <div className="text-[11px] text-vb-muted mt-1">
              Inspect Colleges, Cohorts &amp; Proof-of-Work →
            </div>
          </Link>

          <Link to="/admin/mentors" className="vb-card p-4 hover:border-vb-teal transition-colors">
            <div className="flex items-center justify-between">
              <span className="vb-label">Mentors</span>
              <Users className="w-4 h-4 text-vb-revision" />
            </div>
            <div className="tabular-num text-2xl font-bold text-vb-ink mt-1">
              {kpis?.total_mentors ?? 0}
              {(kpis?.pending_mentor_verifications ?? 0) > 0 && (
                <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-vb-revision-tint text-vb-revision">
                  {kpis?.pending_mentor_verifications} pending
                </span>
              )}
            </div>
            <div className="text-[11px] text-vb-muted mt-1">
              Verify Mentor Approval Authority →
            </div>
          </Link>
        </div>

        {/* 6 Live Operational KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading || !kpis
            ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="vb-card p-4 h-24 animate-pulse" />)
            : [
                {
                  label: 'Total Audits Run',
                  value: kpis.total_audits,
                  sub: `SMB ${kpis.audits_by_mode.SMB || 0} · Campus ${kpis.audits_by_mode.CAMPUS || 0} · Personal ${kpis.audits_by_mode.PERSONAL || 0}`,
                  tone: 'text-vb-ink',
                },
                {
                  label: 'Published Challenges',
                  value: kpis.published_challenges,
                  sub: 'Active on PII-safe builder feed',
                  tone: 'text-vb-teal',
                },
                {
                  label: 'Active Builders (30d)',
                  value: kpis.active_builders,
                  sub: 'Students with live submissions',
                  tone: 'text-vb-ink',
                },
                {
                  label: 'Pending Mentor Reviews',
                  value: kpis.pending_mentor_reviews,
                  sub: 'Waiting 3-point scorecard',
                  tone: kpis.pending_mentor_reviews > 5 ? 'text-vb-revision' : 'text-vb-ink',
                },
                {
                  label: 'Approved Business Pilots',
                  value: kpis.approved_business_pilots,
                  sub: 'Mentor-verified handoffs',
                  tone: 'text-vb-verified',
                },
                {
                  label: 'Avg Review Turnaround',
                  value: kpis.avg_review_turnaround_mins ? `${kpis.avg_review_turnaround_mins}m` : '—',
                  sub: 'Submission to mentor decision',
                  tone: 'text-vb-ink',
                },
              ].map((card) => (
                <div key={card.label} className="vb-card p-4">
                  <div className="vb-label">{card.label}</div>
                  <div className={`tabular-num text-2xl font-bold mt-1.5 ${card.tone}`}>
                    {card.value}
                  </div>
                  <div className="text-[11px] font-mono text-vb-muted mt-1">{card.sub}</div>
                </div>
              ))}
        </div>

        {data?.funnel && <TelemetryFunnel funnel={data.funnel} />}
      </div>
    </AppShell>
  );
}
