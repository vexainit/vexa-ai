import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, ShieldCheck, Upload } from 'lucide-react';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function FileDropzone({
  file,
  presetLabel,
  error,
  onFileSelect,
}: {
  file: File | null;
  presetLabel?: string | null;
  error?: string | null;
  onFileSelect: (file: File | null, validationError?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const validateAndEmit = (candidate: File | undefined) => {
    if (!candidate) return;
    const lower = candidate.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx')) {
      onFileSelect(null, 'Unsupported file type. Upload a .csv or .xlsx operational ledger.');
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      onFileSelect(null, 'File exceeds 10 MB limit. Trim export to recent 90 days and retry.');
      return;
    }
    onFileSelect(candidate, undefined);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          validateAndEmit(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`vb-card p-6 border-2 border-dashed cursor-pointer transition-colors text-center ${
          error
            ? 'border-vb-terracotta bg-vb-terracotta-tint/40'
            : dragging
            ? 'border-vb-teal bg-vb-teal-tint/40'
            : file || presetLabel
            ? 'border-vb-verified/60 bg-vb-verified-tint/30'
            : 'border-vb-border hover:border-vb-teal/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => validateAndEmit(e.target.files?.[0])}
        />
        {file ? (
          <div className="space-y-1.5">
            <FileSpreadsheet className="w-8 h-8 text-vb-verified mx-auto" />
            <div className="text-sm font-semibold text-vb-ink">{file.name}</div>
            <div className="text-xs font-mono text-vb-muted tabular-num">
              {(file.size / 1024).toFixed(1)} KB · Ready for Pandas + PII Shield
            </div>
            <div className="text-[11px] text-vb-teal underline pt-1">Click to replace file</div>
          </div>
        ) : presetLabel ? (
          <div className="space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-vb-teal mx-auto" />
            <div className="text-sm font-semibold text-vb-ink">Preset Attached: {presetLabel}</div>
            <div className="text-xs font-mono text-vb-muted">
              Server-side realistic Indian dataset loaded · Or click to upload custom CSV/XLSX
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 text-vb-muted mx-auto" />
            <div className="text-sm font-semibold text-vb-ink">
              Drop operational spreadsheet (.csv or .xlsx)
            </div>
            <div className="text-xs text-vb-muted">
              Up to <span className="tabular-num font-semibold">10 MB</span> &amp;{' '}
              <span className="tabular-num font-semibold">25,000 rows</span> · UTF-8, Tally CP1252 supported
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded border border-vb-terracotta/40 bg-vb-terracotta-tint text-xs text-vb-terracotta">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Privacy Assurance Box */}
      <div className="vb-card p-4 bg-vb-canvas/70">
        <div className="flex items-center gap-2 text-xs font-display font-bold text-vb-ink mb-2">
          <ShieldCheck className="w-4 h-4 text-vb-verified" />
          <span>Privacy-by-Construction Guarantee</span>
        </div>
        <ul className="space-y-1.5 text-xs text-vb-muted">
          <li>• Raw CSV rows never enter Gemini 2.5 Flash prompts or Student/Mentor storage.</li>
          <li>• Indian mobiles (+91), emails, UPI IDs, PAN/Aadhaar, and addresses are auto-redacted.</li>
          <li>• Customer names are deterministically hashed via per-case salted SHA-256 (`CUST_*`).</li>
          <li>• Inspect side-by-side redaction in the PII Shield Diff Drawer before publishing.</li>
        </ul>
      </div>
    </div>
  );
}
