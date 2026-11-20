import { Clock } from 'lucide-react';
import { fitScoreTone, formatRelativeAge } from '../../lib/formatters';
import type { BuilderSubmission } from '../../types/vexa';

export function ReviewQueueItem({
  submission,
  selected,
  onSelect,
}: {
  submission: BuilderSubmission;
  selected: boolean;
  onSelect: () => void;
}) {
  const fit = submission.ai_preaudit?.fit_score ?? 0;
  const tone = fitScoreTone(fit);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3.5 rounded border transition-colors ${
        selected
          ? 'bg-vb-revision-tint/60 border-vb-revision'
          : 'bg-vb-surface border-vb-border hover:border-vb-revision/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-display font-bold text-sm text-vb-ink leading-snug">
          {submission.solution_title}
        </div>
        <span className="tabular-num text-[10px] font-semibold px-1.5 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-ink shrink-0">
          v{submission.version}
        </span>
      </div>
      <div className="text-xs text-vb-muted mt-1 flex items-center gap-1.5 flex-wrap">
        <span className="font-medium text-vb-ink">{submission.builder_name}</span>
        <span>·</span>
        <span>{submission.solution_type}</span>
        <span>·</span>
        <span className="inline-flex items-center gap-0.5 font-mono text-[11px]">
          <Clock className="w-3 h-3" />
          {formatRelativeAge(submission.updated_at)}
        </span>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-vb-muted truncate">
          {submission.challenge_brief?.challenge_title || submission.case_id}
        </span>
        <span className={`tabular-num text-[11px] font-bold px-2 py-0.5 rounded border shrink-0 ${tone.bg} ${tone.text} ${tone.border}`}>
          Fit: {fit} / 100
        </span>
      </div>
    </button>
  );
}
