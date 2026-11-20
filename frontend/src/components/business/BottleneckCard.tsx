import type { BottleneckItem } from '../../types/vexa';

const URGENCY_STYLES: Record<BottleneckItem['urgency'], string> = {
  CRITICAL: 'bg-vb-terracotta-tint text-vb-terracotta border-vb-terracotta/30',
  HIGH: 'bg-vb-revision-tint text-vb-revision border-vb-revision/30',
  MEDIUM: 'bg-vb-canvas text-vb-muted border-vb-border',
};

export function BottleneckCard({ item }: { item: BottleneckItem }) {
  const isPrimary = item.rank === 1;
  return (
    <div
      className={`vb-card p-4 ${
        isPrimary ? 'border-l-4 border-l-vb-terracotta' : 'border-l-4 border-l-vb-border'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`tabular-num text-xs font-bold px-2 py-0.5 rounded ${
              isPrimary ? 'bg-vb-terracotta text-white' : 'bg-vb-canvas text-vb-ink border border-vb-border'
            }`}
          >
            #{item.rank}
          </span>
          <h3 className="font-display font-bold text-[15px] text-vb-ink">{item.title}</h3>
        </div>
        <span
          className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${
            URGENCY_STYLES[item.urgency]
          }`}
        >
          {item.urgency}
        </span>
      </div>
      <p className="text-sm text-vb-muted leading-relaxed">{item.root_cause}</p>
      <div className="mt-3 pt-2.5 border-t border-vb-border flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <div>
          <span className="text-vb-muted">Quantified Leak: </span>
          <span className={`tabular-num font-semibold ${isPrimary ? 'text-vb-terracotta' : 'text-vb-ink'}`}>
            {item.quantified_leak}
          </span>
        </div>
        <div>
          <span className="text-vb-muted">Affected Segment: </span>
          <span className="font-medium text-vb-ink">{item.affected_segment}</span>
        </div>
      </div>
    </div>
  );
}
