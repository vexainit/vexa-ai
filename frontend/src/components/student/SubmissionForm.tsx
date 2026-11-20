import { useState } from 'react';
import { AlertCircle, Loader2, Send } from 'lucide-react';
import type { BuilderSubmission, SolutionType } from '../../types/vexa';

const SOLUTION_TYPES: SolutionType[] = ['AI Agent', 'Automation', 'Web App', 'Data Analytics'];

export interface SubmissionFormPayload {
  case_id: string;
  solution_title: string;
  solution_type: SolutionType;
  tech_stack: string[];
  architecture_summary: string;
  demo_url: string;
  output_preview: string;
  resubmit_id?: string;
}

export function SubmissionForm({
  caseId,
  initial,
  submitting,
  serverError,
  onSubmit,
}: {
  caseId: string;
  initial?: BuilderSubmission | null;
  submitting: boolean;
  serverError?: string | null;
  onSubmit: (payload: SubmissionFormPayload) => void;
}) {
  const [title, setTitle] = useState(initial?.solution_title ?? '');
  const [solutionType, setSolutionType] = useState<SolutionType>(initial?.solution_type ?? 'AI Agent');
  const [tagsRaw, setTagsRaw] = useState(
    initial?.tech_stack?.join(', ') ?? 'Python, FastAPI, Gemini 2.5 Flash, Pandas'
  );
  const [arch, setArch] = useState(initial?.architecture_summary ?? '');
  const [demoUrl, setDemoUrl] = useState(initial?.demo_url ?? '');
  const [outputPreview, setOutputPreview] = useState(initial?.output_preview ?? '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stack = tagsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (title.trim().length < 5) {
      setValidationError('Solution title must be at least 5 characters.');
      return;
    }
    if (stack.length < 1) {
      setValidationError('Enter at least 1 tech stack tag (comma-separated).');
      return;
    }
    if (arch.trim().length < 80) {
      setValidationError(`Architecture summary must be at least 80 characters (currently ${arch.trim().length}).`);
      return;
    }
    if (!demoUrl.trim().startsWith('https://') && !demoUrl.trim().startsWith('http://')) {
      setValidationError('Demo/Repository URL must start with https:// or http://.');
      return;
    }
    if (outputPreview.trim().length < 30) {
      setValidationError('Quantified output preview must be at least 30 characters.');
      return;
    }
    setValidationError('');
    onSubmit({
      case_id: caseId,
      solution_title: title.trim(),
      solution_type: solutionType,
      tech_stack: stack,
      architecture_summary: arch.trim(),
      demo_url: demoUrl.trim(),
      output_preview: outputPreview.trim(),
      resubmit_id: initial?.id,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="vb-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-vb-border pb-3">
        <div>
          <h3 className="font-display font-bold text-base text-vb-ink">
            {initial ? `Submit Revised Draft (v${initial.version + 1})` : 'Submit Solution Draft (v1)'}
          </h3>
          <p className="text-xs text-vb-muted mt-0.5">
            Triggers immediate Gemini 2.5 Flash Mentor AI Pre-Audit (Fit Score 0–100 &amp; edge-case check).
          </p>
        </div>
        {submitting && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-vb-teal-tint text-vb-teal">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running Gemini Pre-Audit...
          </span>
        )}
      </div>

      {(validationError || serverError) && (
        <div className="flex items-start gap-2 p-3 rounded border border-vb-terracotta/40 bg-vb-terracotta-tint text-xs text-vb-terracotta">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{validationError || serverError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="vb-label block mb-1.5">Solution Title (5–100 chars)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., AutoCOD — WhatsApp + Gemini COD Confirmation Agent"
            className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface text-vb-ink"
            required
          />
        </div>
        <div>
          <label className="vb-label block mb-1.5">Deliverable Type</label>
          <select
            value={solutionType}
            onChange={(e) => setSolutionType(e.target.value as SolutionType)}
            className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface text-vb-ink"
          >
            {SOLUTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="vb-label block mb-1.5">Tech Stack Tags (comma-separated, 1–8)</label>
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="Python, FastAPI, Gemini 2.5 Flash, Cloud Run"
            className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface text-vb-ink"
            required
          />
        </div>
        <div>
          <label className="vb-label block mb-1.5">Live Demo / GitHub / Colab URL</label>
          <input
            type="url"
            value={demoUrl}
            onChange={(e) => setDemoUrl(e.target.value)}
            placeholder="https://autocod-demo-asia-south1.run.app"
            className="w-full px-3 py-2 text-sm font-mono rounded border border-vb-border bg-vb-surface text-vb-ink"
            required
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="vb-label">Architecture Summary &amp; Edge-Case Handling (min 80 chars)</label>
          <span className="tabular-num text-[11px] text-vb-muted">{arch.trim().length} / 2000</span>
        </div>
        <textarea
          rows={4}
          value={arch}
          onChange={(e) => setArch(e.target.value)}
          placeholder="Detail how your pipeline ingests the masked CSV, handles null dates/currency strings, applies deterministic rules, and uses Gemini 2.5 Flash..."
          className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface text-vb-ink"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="vb-label">Quantified Output Preview on Masked Dataset (min 30 chars)</label>
          <span className="tabular-num text-[11px] text-vb-muted">{outputPreview.trim().length} / 1000</span>
        </div>
        <textarea
          rows={2}
          value={outputPreview}
          onChange={(e) => setOutputPreview(e.target.value)}
          placeholder="e.g., Tested on 500-row masked CSV: flagged 94 high-risk COD orders (86% RTO recall), projecting INR 98,400/mo leak reduction."
          className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface text-vb-ink"
          required
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-vb-border">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>{initial ? `Resubmit v${initial.version + 1} for Mentor Review` : 'Submit Draft & Run Gemini Pre-Audit'}</span>
        </button>
      </div>
    </form>
  );
}
