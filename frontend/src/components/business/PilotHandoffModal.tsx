import { useState } from 'react';
import { Calendar, CheckCircle2, ExternalLink, X } from 'lucide-react';
import type { BuilderSubmission } from '../../types/vexa';

export function PilotHandoffModal({
  open,
  caseTitle,
  submission,
  onClose,
  onConfirm,
  submitting,
}: {
  open: boolean;
  caseTitle: string;
  submission: BuilderSubmission | null;
  onClose: () => void;
  onConfirm: (calendarUrl: string, notes: string) => void;
  submitting?: boolean;
}) {
  const [calendarUrl, setCalendarUrl] = useState('https://cal.com/vexa-bridge/15min-pilot-handoff');
  const [notes, setNotes] = useState(
    'Agenda: (1) 5-min live walkthrough on masked dataset, (2) 5-min SOP integration check, (3) 5-min pilot rollout timeline.'
  );
  const [urlError, setUrlError] = useState('');

  if (!open || !submission) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarUrl.startsWith('https://')) {
      setUrlError('Provide a valid https:// calendar or meeting link.');
      return;
    }
    setUrlError('');
    onConfirm(calendarUrl, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-vb-ink/45" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg vb-card overflow-hidden">
        <div className="px-6 py-4 bg-vb-teal text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <h3 className="font-display font-bold text-sm">Schedule 15-Min Pilot Handoff</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/10 rounded" aria-label="Close modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded bg-vb-canvas border border-vb-border space-y-1 text-xs">
            <div className="font-semibold text-vb-ink">{submission.solution_title}</div>
            <div className="text-vb-muted">
              Builder: <span className="text-vb-ink font-medium">{submission.builder_name}</span> · Case:{' '}
              <span className="text-vb-ink font-medium">{caseTitle}</span>
            </div>
            <div className="flex items-center gap-1.5 text-vb-verified font-mono pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Mentor Verified ({submission.reviewed_by_mentor_name || 'Verified Mentor'}) · Fit Score{' '}
                {submission.ai_preaudit?.fit_score ?? 0}/100
              </span>
            </div>
          </div>

          <div>
            <label className="vb-label block mb-1.5">External Calendar / Meeting URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
                className="flex-1 px-3 py-2 text-xs font-mono rounded border border-vb-border bg-vb-surface text-vb-ink"
                required
              />
              <a
                href={calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded border border-vb-border text-vb-muted hover:text-vb-teal flex items-center"
                title="Open external booking page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            {urlError && <p className="text-xs text-vb-terracotta mt-1">{urlError}</p>}
          </div>

          <div>
            <label className="vb-label block mb-1.5">Pre-Filled Pilot Agenda</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-vb-border bg-vb-surface text-vb-ink"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-vb-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded border border-vb-border text-vb-ink hover:bg-vb-canvas"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded bg-vb-teal text-white hover:bg-vb-teal-dark disabled:opacity-50"
            >
              {submitting ? 'Confirming...' : 'Confirm Handoff & Mark PILOT_MATCHED'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
