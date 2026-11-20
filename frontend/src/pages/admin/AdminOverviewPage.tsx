import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Building2, Database, GraduationCap, Users } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../lib/api';
import type { AdminOverviewResponse } from '../../types/vexa';

export function AdminOverviewPage() {
  const { theme } = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => apiFetch<AdminOverviewResponse>('/admin/overview'),
  });

  const kpis = data?.kpis;
  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#2B2E36' : '#E5E2DC';
  const axisTick = isDark ? '#A1A1AA' : '#52525B';
  const tealBar = isDark ? '#2DA8B8' : '#0F4C5C';
  const verifiedBar = isDark ? '#4ADE80' : '#15803D';
  const revisionBar = isDark ? '#F59E0B' : '#B45309';

  const ecosystemData = [
    { role: 'Businesses', count: kpis?.total_businesses ?? 0, color: tealBar },
    { role: 'Students', count: kpis?.total_students ?? 0, color: verifiedBar },
    { role: 'Mentors', count: kpis?.total_mentors ?? 0, color: revisionBar },
  ];

  return (
    <AppShell
      title="Platform overview and telemetry"
      actions={
        <Link
          to="/admin/database"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-vb-teal text-white text-sm font-medium hover:bg-vb-teal-dark"
        >
          <Database className="w-4 h-4" />
          <span>Database explorer</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* 3 Ecosystem Control Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/businesses" className="vb-card p-5 hover:border-vb-teal transition-colors">
            <div className="flex items-center justify-between">
              <span className="vb-label">Businesses</span>
              <Building2 className="w-5 h-5 text-vb-teal" />
            </div>
            <div className="tabular-num text-3xl font-bold text-vb-ink mt-1.5">
              {kpis?.total_businesses ?? 0}
            </div>
            <div className="text-sm text-vb-muted mt-1">Manage CIN, certificates, and audits</div>
          </Link>

          <Link to="/admin/students" className="vb-card p-5 hover:border-vb-teal transition-colors">
            <div className="flex items-center justify-between">
              <span className="vb-label">Students</span>
              <GraduationCap className="w-5 h-5 text-vb-teal" />
            </div>
            <div className="tabular-num text-3xl font-bold text-vb-ink mt-1.5">
              {kpis?.total_students ?? 0}
            </div>
            <div className="text-sm text-vb-muted mt-1">Inspect colleges and proof of work</div>
          </Link>

          <Link to="/admin/mentors" className="vb-card p-5 hover:border-vb-teal transition-colors">
            <div className="flex items-center justify-between">
              <span className="vb-label">Mentors</span>
              <Users className="w-5 h-5 text-vb-revision" />
            </div>
            <div className="tabular-num text-3xl font-bold text-vb-ink mt-1.5">
              {kpis?.total_mentors ?? 0}
              {(kpis?.pending_mentor_verifications ?? 0) > 0 && (
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-vb-revision-tint text-vb-revision">
                  {kpis?.pending_mentor_verifications} pending
                </span>
              )}
            </div>
            <div className="text-sm text-vb-muted mt-1">Verify mentor approval authority</div>
          </Link>
        </div>

        {/* 6 Live Operational KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading || !kpis
            ? [1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="vb-card p-5 h-24 animate-pulse" />)
            : [
                {
                  label: 'Total audits run',
                  value: kpis.total_audits,
                  sub: `SMB ${kpis.audits_by_mode.SMB || 0}, Campus ${kpis.audits_by_mode.CAMPUS || 0}, Personal ${kpis.audits_by_mode.PERSONAL || 0}`,
                  tone: 'text-vb-ink',
                },
                {
                  label: 'Published challenges',
                  value: kpis.published_challenges,
                  sub: 'Active on PII-safe builder feed',
                  tone: 'text-vb-teal',
                },
                {
                  label: 'Active builders (30d)',
                  value: kpis.active_builders,
                  sub: 'Students with live submissions',
                  tone: 'text-vb-ink',
                },
                {
                  label: 'Pending mentor reviews',
                  value: kpis.pending_mentor_reviews,
                  sub: 'Waiting 3-point scorecard',
                  tone: kpis.pending_mentor_reviews > 5 ? 'text-vb-revision' : 'text-vb-ink',
                },
                {
                  label: 'Approved business pilots',
                  value: kpis.approved_business_pilots,
                  sub: 'Mentor-verified handoffs',
                  tone: 'text-vb-verified',
                },
                {
                  label: 'Avg review turnaround',
                  value: kpis.avg_review_turnaround_mins ? `${kpis.avg_review_turnaround_mins}m` : '—',
                  sub: 'Submission to mentor decision',
                  tone: 'text-vb-ink',
                },
              ].map((card) => (
                <div key={card.label} className="vb-card p-5">
                  <div className="vb-label">{card.label}</div>
                  <div className={`tabular-num text-2xl font-bold mt-1.5 ${card.tone}`}>
                    {card.value}
                  </div>
                  <div className="text-xs text-vb-muted mt-1">{card.sub}</div>
                </div>
              ))}
        </div>

        {/* 2 Live Admin Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 vb-card p-5 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-vb-ink">
                Platform conversion funnel
              </h2>
              <p className="text-xs text-vb-muted">Live stage counts from PostgreSQL / SQLite</p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.funnel ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="stage" tick={{ fill: axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="count" fill={tealBar} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 vb-card p-5 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-vb-ink">Registered accounts by role</h2>
              <p className="text-xs text-vb-muted">Active supply and demand across the ecosystem</p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ecosystemData} layout="vertical" margin={{ top: 8, right: 16, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="role" tick={{ fill: axisTick, fontSize: 13 }} axisLine={false} tickLine={false} width={84} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {ecosystemData.map((entry) => (
                      <Cell key={entry.role} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
