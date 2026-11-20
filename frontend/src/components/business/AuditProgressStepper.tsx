import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

const STEPS = [
  { title: '1. Profiling Data', detail: 'Vectorized Pandas/NumPy KPI & leak math (<1.5s)' },
  { title: '2. Masking Indian PII', detail: 'Two-pass regex scrubber + salted SHA-256 + zero-leak gate' },
  { title: '3. Synthesizing Report', detail: 'Gemini 2.5 Flash strict JSON diagnostic & scoped brief' },
];

export function AuditProgressStepper({ active }: { active: boolean }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return;
    }
    const start = performance.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Math.floor(performance.now() - start));
    }, 60);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  const currentStage = elapsedMs < 500 ? 0 : elapsedMs < 1000 ? 1 : 2;

  return (
    <div className="vb-card p-5 border-vb-teal/40 bg-vb-teal-tint/30">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-display font-bold uppercase tracking-wider text-vb-teal">
          Running Deterministic + Gemini 2.5 Flash Pipeline
        </span>
        <span className="tabular-num text-xs font-semibold text-vb-teal">{elapsedMs} ms</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STEPS.map((step, idx) => {
          const done = idx < currentStage;
          const running = idx === currentStage;
          return (
            <div
              key={step.title}
              className={`p-3 rounded border bg-vb-surface ${
                running
                  ? 'border-vb-teal'
                  : done
                  ? 'border-vb-verified/50'
                  : 'border-vb-border opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-vb-ink">
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-vb-verified shrink-0" />
                ) : running ? (
                  <Loader2 className="w-4 h-4 text-vb-teal animate-spin shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-vb-border inline-block shrink-0" />
                )}
                <span>{step.title}</span>
              </div>
              <div className="text-[11px] text-vb-muted mt-1">{step.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
