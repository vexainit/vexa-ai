import { Clock, Cpu, Zap } from 'lucide-react';
import type { RoadmapAction } from '../../types/vexa';

export function RoadmapSplitView({ actions }: { actions: RoadmapAction[] }) {
  const quickWins = actions.filter((a) => a.track === 'QUICK_WIN');
  const aiBuilds = actions.filter((a) => a.track === 'AI_AUTOMATION_BUILD');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Column 1: Quick Wins */}
      <div className="vb-card p-5">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-vb-border">
          <Zap className="w-4 h-4 text-vb-verified" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wide text-vb-ink">
            Immediate Quick Wins (This Week · Zero Code)
          </h3>
        </div>
        <div className="space-y-3">
          {quickWins.map((item, idx) => (
            <div key={idx} className="p-3 rounded bg-vb-canvas/70 border border-vb-border">
              <div className="font-semibold text-sm text-vb-ink">{item.title}</div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-vb-muted mt-1">
                <Clock className="w-3 h-3" />
                <span>{item.effort_estimate}</span>
              </div>
              <div className="text-xs text-vb-verified font-medium mt-1.5">{item.expected_impact}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Automation & AI Builds */}
      <div className="vb-card p-5">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-vb-border">
          <Cpu className="w-4 h-4 text-vb-teal" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wide text-vb-ink">
            Automation &amp; AI Builds (High Leverage)
          </h3>
        </div>
        <div className="space-y-3">
          {aiBuilds.map((item, idx) => (
            <div key={idx} className="p-3 rounded bg-vb-teal-tint/30 border border-vb-teal/25">
              <div className="font-semibold text-sm text-vb-ink">{item.title}</div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-vb-teal mt-1">
                <Clock className="w-3 h-3" />
                <span>{item.effort_estimate}</span>
              </div>
              <div className="text-xs text-vb-ink font-medium mt-1.5">{item.expected_impact}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
