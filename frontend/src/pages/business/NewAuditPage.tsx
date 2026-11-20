import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { AuditProgressStepper } from '../../components/business/AuditProgressStepper';
import { DEMO_PRESETS, DemoPresetBar, type PresetConfig } from '../../components/business/DemoPresetBar';
import { FileDropzone } from '../../components/business/FileDropzone';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import type { DiagnosticCase, WorkspaceMode } from '../../types/vexa';

const MODE_META: Record<
  WorkspaceMode,
  {
    label: string;
    orgLabel: string;
    domains: string[];
    scales: string[];
    pains: string[];
    tools: string[];
  }
> = {
  SMB: {
    label: 'SMB / Agency',
    orgLabel: 'Business / Organization Name',
    domains: ['Retail/D2C', 'Manufacturing/Wholesale', 'Services/Agency', 'Logistics', 'EdTech/Other'],
    scales: ['1-5', '6-20', '21-50', '50+'],
    pains: [
      'Slow Lead Follow-up',
      'Order/Delivery Delays',
      'High Return/Refund Rate',
      'Manual Billing/Inventory Leaks',
      'Repetitive Customer Queries',
    ],
    tools: ['Excel/Sheets', 'WhatsApp', 'Tally', 'Shopify/WooCommerce', 'Manual Paper'],
  },
  CAMPUS: {
    label: 'Campus / Hiring',
    orgLabel: 'University / Hiring Cohort Name',
    domains: ['EdTech/Other', 'Retail/D2C', 'Logistics', 'Services/Agency', 'Manufacturing/Wholesale'],
    scales: ['1-5', '6-20', '21-50', '50+'],
    pains: [
      'Order/Delivery Delays',
      'High Return/Refund Rate',
      'Slow Lead Follow-up',
      'Manual Billing/Inventory Leaks',
    ],
    tools: ['Excel/Sheets', 'WhatsApp', 'Shopify/WooCommerce', 'Tally'],
  },
  PERSONAL: {
    label: 'Personal UPI Audit',
    orgLabel: 'Personal Profile Alias',
    domains: ['Salaried', 'Freelancer', 'Student'],
    scales: ['<₹25k', '₹25k–₹75k', '₹75k+'],
    pains: [
      'Micro-Transaction Drift',
      'Late-Night Impulse Spend',
      'Unused Auto-Pay Subscriptions',
      'High Food Delivery Share',
    ],
    tools: ['GPay/PhonePe', 'Credit Cards', 'Bank PDFs'],
  },
};

export function NewAuditPage() {
  const { session } = useRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<WorkspaceMode>('SMB');
  const [orgName, setOrgName] = useState('');
  const [domain, setDomain] = useState('Retail/D2C');
  const [scale, setScale] = useState('6-20');
  const [painPoints, setPainPoints] = useState<string[]>(['Order/Delivery Delays']);
  const [tools, setTools] = useState<string[]>(['Excel/Sheets', 'WhatsApp']);
  const [targetMetric, setTargetMetric] = useState('');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const meta = MODE_META[mode];

  const applyPreset = (preset: PresetConfig) => {
    setSelectedPresetKey(preset.key);
    setFile(null);
    setFileError(null);
    setFormError(null);
    setMode(preset.mode);
    setOrgName(preset.organization);
    setDomain(preset.domain);
    setScale(preset.scale);
    setPainPoints(preset.painPoints);
    setTools(preset.tools);
    setTargetMetric(preset.targetMetric);
  };

  useEffect(() => {
    const presetParam = searchParams.get('preset');
    const modeParam = searchParams.get('mode') as WorkspaceMode | null;
    if (presetParam) {
      const found = DEMO_PRESETS.find((p) => p.key === presetParam);
      if (found) applyPreset(found);
    } else if (modeParam && (modeParam === 'SMB' || modeParam === 'CAMPUS' || modeParam === 'PERSONAL')) {
      setMode(modeParam);
      const m = MODE_META[modeParam];
      setDomain(m.domains[0]);
      setScale(m.scales[0]);
      setPainPoints([m.pains[0]]);
      setTools([m.tools[0]]);
    }
  }, [searchParams]);

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode);
    const m = MODE_META[nextMode];
    setDomain(m.domains[0]);
    setScale(m.scales[0]);
    setPainPoints([m.pains[0]]);
    setTools([m.tools[0]]);
    if (selectedPresetKey) {
      const p = DEMO_PRESETS.find((x) => x.key === selectedPresetKey);
      if (p && p.mode !== nextMode && nextMode === 'PERSONAL') {
        setSelectedPresetKey(null);
      }
    }
  };

  const togglePainPoint = (p: string) => {
    setPainPoints((prev) => {
      if (prev.includes(p)) {
        return prev.length > 1 ? prev.filter((x) => x !== p) : prev;
      }
      if (prev.length >= 2) {
        return [prev[1], p];
      }
      return [...prev, p];
    });
  };

  const toggleTool = (t: string) => {
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const auditMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('workspace_mode', mode);
      formData.append('organization_or_profile_name', orgName.trim());
      formData.append('domain_category', domain);
      formData.append('scale_tier', scale);
      formData.append('primary_pain_points', JSON.stringify(painPoints));
      formData.append('current_tools', JSON.stringify(tools));
      formData.append('target_success_metric', targetMetric.trim());
      if (file) {
        formData.append('file', file);
      } else if (selectedPresetKey) {
        formData.append('preset_key', selectedPresetKey);
      }
      return apiFetch<DiagnosticCase>('/audits', {
        method: 'POST',
        body: formData,
        userId: session.userId,
        role: session.role,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      navigate(`/business/audits/${created.id}`);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orgName.trim().length < 2) {
      setFormError('Enter an organization or profile name (at least 2 characters).');
      return;
    }
    if (targetMetric.trim().length < 5) {
      setFormError('Enter a concrete target success metric (5–140 chars).');
      return;
    }
    if (!file && !selectedPresetKey) {
      setFormError('Upload a .csv / .xlsx spreadsheet or click one of the 3 Indian Demo Presets above.');
      return;
    }
    setFormError(null);
    auditMutation.mutate();
  };

  const activePreset = DEMO_PRESETS.find((p) => p.key === selectedPresetKey);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <span className="vb-label">60-Second Structured Intake &amp; Ingestion</span>
          <h1 className="font-display font-extrabold text-[28px] text-vb-ink mt-0.5">
            New Data Scan
          </h1>
          <p className="text-sm text-vb-muted mt-1">
            Click a pre-loaded Indian dataset preset or upload your own CSV/XLSX to run an Exact Number Check, Privacy Preview, and Gemini synthesis in under 5 seconds.
          </p>
        </div>

        {/* Top Demo Accelerator Strip */}
        <DemoPresetBar
          selectedKey={selectedPresetKey}
          onSelectPreset={applyPreset}
          loading={auditMutation.isPending}
        />

        {/* Live 3-Step Deterministic Progress Stepper */}
        <AuditProgressStepper active={auditMutation.isPending} />

        {formError && (
          <div className="flex items-start gap-2 p-3.5 rounded border border-vb-terracotta/40 bg-vb-terracotta-tint text-xs text-vb-terracotta">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 60% (7 cols): Structured Intake Form */}
          <div className="lg:col-span-7 vb-card p-6 space-y-5">
            {/* Workspace Mode Segmented Pill */}
            <div>
              <label className="vb-label block mb-2">Workspace Mode</label>
              <div className="inline-flex rounded border border-vb-border bg-vb-canvas p-1 gap-1">
                {(['SMB', 'CAMPUS', 'PERSONAL'] as WorkspaceMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleModeChange(m)}
                    className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                      mode === m
                        ? 'bg-vb-teal text-white'
                        : 'text-vb-muted hover:text-vb-ink'
                    }`}
                  >
                    {MODE_META[m].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="vb-label block mb-1.5">{meta.orgLabel}</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder={mode === 'PERSONAL' ? 'e.g., Aarav Personal UPI Audit' : 'e.g., Kaya Looms D2C Apparel'}
                  maxLength={80}
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                  required
                />
              </div>

              <div>
                <label className="vb-label block mb-1.5">Domain Category</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                >
                  {meta.domains.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="vb-label block mb-1.5">
                  {mode === 'PERSONAL' ? 'Monthly Spend Tier' : 'Team Scale Tier'}
                </label>
                <select
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                >
                  {meta.scales.map((s) => (
                    <option key={s} value={s}>
                      {mode === 'PERSONAL' ? s : `${s} staff`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary Pain Points (Min 1, Max 2) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="vb-label">Primary Pain Points (Select 1–2)</label>
                <span className="tabular-num text-[11px] text-vb-muted">{painPoints.length} / 2 selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {meta.pains.map((p) => {
                  const selected = painPoints.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePainPoint(p)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-vb-teal text-white border-vb-teal'
                          : 'bg-vb-canvas text-vb-ink border-vb-border hover:border-vb-teal/50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Tools */}
            <div>
              <label className="vb-label block mb-2">Current Operational Tools</label>
              <div className="flex flex-wrap gap-3">
                {meta.tools.map((t) => (
                  <label key={t} className="inline-flex items-center gap-1.5 text-xs text-vb-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tools.includes(t)}
                      onChange={() => toggleTool(t)}
                      className="accent-[#0F4C5C] rounded"
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Success Metric */}
            <div>
              <label className="vb-label block mb-1.5">Concrete Target Success Metric (5–140 chars)</label>
              <input
                type="text"
                value={targetMetric}
                onChange={(e) => setTargetMetric(e.target.value)}
                maxLength={140}
                placeholder="e.g., Reduce delayed deliveries by 40% within 30 days."
                className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                required
              />
            </div>

            <div className="pt-2 border-t border-vb-border flex justify-end">
              <button
                type="submit"
                disabled={auditMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark disabled:opacity-50"
              >
                <span>
                  {auditMutation.isPending ? 'Running Diagnostic Pipeline...' : 'Run AI Diagnostic (<5s)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right 40% (5 cols): Drag-and-Drop CSV/XLSX Zone + Privacy Assurance */}
          <div className="lg:col-span-5">
            <FileDropzone
              file={file}
              presetLabel={activePreset?.label}
              error={fileError}
              onFileSelect={(f, err) => {
                setFile(f);
                setFileError(err ?? null);
                if (f) setSelectedPresetKey(null);
              }}
            />
          </div>
        </form>
      </div>
    </AppShell>
  );
}
