export function TelemetryFunnel({
  funnel,
}: {
  funnel: { stage: string; count: number }[];
}) {
  const max = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <div className="vb-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-sm text-vb-ink">
          End-to-End Platform Conversion Funnel
        </h3>
        <span className="text-[11px] font-mono text-vb-muted">
          Audits → Published → Drafts → Reviewed → Pilots
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {funnel.map((item, idx) => {
          const pct = Math.round((item.count / max) * 100);
          const isFinal = idx === funnel.length - 1;
          return (
            <div key={item.stage} className="p-3 rounded bg-vb-canvas border border-vb-border">
              <div className="text-[11px] font-medium text-vb-muted truncate">{item.stage}</div>
              <div
                className={`tabular-num text-xl font-bold mt-1 ${
                  isFinal ? 'text-vb-verified' : 'text-vb-ink'
                }`}
              >
                {item.count}
              </div>
              <div className="h-1.5 w-full bg-vb-border rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${isFinal ? 'bg-vb-verified' : 'bg-vb-teal'}`}
                  style={{ width: `${Math.max(8, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
