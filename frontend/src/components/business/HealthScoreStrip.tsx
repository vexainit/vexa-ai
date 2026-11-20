import { ShieldCheck } from 'lucide-react';
import { formatINRLong, healthScoreTone } from '../../lib/formatters';
import type { DeterministicStats, WorkspaceMode } from '../../types/vexa';

export function HealthScoreStrip({
  score,
  stats,
  mode,
  piiColumnsCount,
}: {
  score: number;
  stats: DeterministicStats;
  mode: WorkspaceMode;
  piiColumnsCount?: number;
}) {
  const tone = healthScoreTone(score);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* KPI 1: Health Score */}
      <div className="vb-card p-4">
        <div className="flex items-center justify-between">
          <span className="vb-label">Health Score</span>
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${tone.bg} ${tone.text}`}>
            {tone.label}
          </span>
        </div>
        <div className={`tabular-num text-2xl font-bold mt-2 ${tone.text}`}>
          {score} <span className="text-sm font-normal text-vb-muted">/ 100</span>
        </div>
        <div className="text-[11px] text-vb-muted mt-1">
          Profiled in <span className="tabular-num">{stats.profiling_ms}ms</span> (Pandas)
        </div>
      </div>

      {/* KPI 2: Rows Analyzed */}
      <div className="vb-card p-4">
        <div className="flex items-center justify-between">
          <span className="vb-label">Rows Analyzed</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-vb-verified-tint text-vb-verified">
            <ShieldCheck className="w-3 h-3" />
            PII Safe
          </span>
        </div>
        <div className="tabular-num text-2xl font-bold text-vb-ink mt-2">
          {stats.row_count.toLocaleString('en-IN')}
        </div>
        <div className="text-[11px] text-vb-muted mt-1">
          <span className="tabular-num">{stats.col_count}</span> cols ·{' '}
          <span className="tabular-num">{piiColumnsCount ?? 0}</span> PII fields masked
        </div>
      </div>

      {/* KPI 3: Estimated Monthly Financial Leak (Burnt Terracotta Highlight) */}
      <div className="vb-card p-4 border-vb-terracotta/50 bg-vb-terracotta-tint/50">
        <div className="vb-label text-vb-terracotta">
          {mode === 'PERSONAL' ? 'Est. Monthly Micro-Leak' : 'Est. Monthly Leak'}
        </div>
        <div className="tabular-num text-2xl font-bold text-vb-terracotta mt-2">
          {formatINRLong(stats.est_monthly_leak_inr)}
        </div>
        <div className="text-[11px] text-vb-muted mt-1 truncate" title={stats.peak_bottleneck_segment}>
          {stats.peak_bottleneck_segment}
        </div>
      </div>

      {/* KPI 4: Manual Hours Lost / Micro-Txn Count */}
      <div className="vb-card p-4">
        <div className="vb-label">
          {mode === 'PERSONAL' ? 'Micro-Txns (<₹300)' : 'Manual Hrs Lost'}
        </div>
        <div className="tabular-num text-2xl font-bold text-vb-ink mt-2">
          {mode === 'PERSONAL'
            ? `${stats.micro_txn_count ?? 0} txns`
            : `${stats.est_manual_hours_lost} hrs`}
        </div>
        <div className="text-[11px] text-vb-muted mt-1">
          {mode === 'PERSONAL'
            ? `${stats.late_night_impulse_pct ?? 0}% late-night food share`
            : `${stats.delayed_order_pct ?? 0}% delayed · ${stats.cod_rto_pct ?? 0}% RTO`}
        </div>
      </div>
    </div>
  );
}
