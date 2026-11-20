import { Database, Zap } from 'lucide-react';
import type { WorkspaceMode } from '../../types/vexa';

export interface PresetConfig {
  key: 'ahmedabad_d2c' | 'surat_wholesale' | 'personal_upi_30d';
  label: string;
  rowsLabel: string;
  mode: WorkspaceMode;
  organization: string;
  domain: string;
  scale: string;
  painPoints: string[];
  tools: string[];
  targetMetric: string;
  leakHint: string;
}

export const DEMO_PRESETS: PresetConfig[] = [
  {
    key: 'ahmedabad_d2c',
    label: 'Ahmedabad D2C Apparel Orders',
    rowsLabel: '500 rows · SMB',
    mode: 'SMB',
    organization: 'Kaya Looms D2C Apparel',
    domain: 'Retail/D2C',
    scale: '6-20',
    painPoints: ['Order/Delivery Delays', 'High Return/Refund Rate'],
    tools: ['Excel/Sheets', 'WhatsApp', 'Shopify/WooCommerce'],
    targetMetric: 'Reduce COD RTO rate by 35% and delayed dispatches by 40% within 30 days',
    leakHint: '19.2% COD RTO · ~₹1.48L/mo leak',
  },
  {
    key: 'surat_wholesale',
    label: 'Surat Wholesale Inquiry & Dispatch',
    rowsLabel: '400 rows · SMB',
    mode: 'SMB',
    organization: 'Surat Looms Wholesale Hub',
    domain: 'Manufacturing/Wholesale',
    scale: '21-50',
    painPoints: ['Slow Lead Follow-up', 'Manual Billing/Inventory Leaks'],
    tools: ['WhatsApp', 'Excel/Sheets', 'Tally'],
    targetMetric: 'Cut WhatsApp quote response time under 2 hours and lift conversion above 28%',
    leakHint: '41% >24h replies · ~₹2.1L/mo leak',
  },
  {
    key: 'personal_upi_30d',
    label: 'Personal 30-Day UPI Spend Log',
    rowsLabel: '180 rows · PERSONAL',
    mode: 'PERSONAL',
    organization: 'Aarav Personal UPI Audit',
    domain: 'Salaried',
    scale: '₹25k–₹75k',
    painPoints: ['Micro-Transaction Drift', 'Late-Night Impulse Spend'],
    tools: ['GPay/PhonePe', 'Credit Cards'],
    targetMetric: 'Cut discretionary micro-spend leakage below INR 5,000/month within 14 days',
    leakHint: '64 micro-txns · 4 unused autopays',
  },
];

export function DemoPresetBar({
  selectedKey,
  onSelectPreset,
  loading,
}: {
  selectedKey?: string | null;
  onSelectPreset: (preset: PresetConfig) => void;
  loading?: boolean;
}) {
  return (
    <div className="vb-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-vb-teal" />
          <span className="vb-label text-vb-ink">1-Click Indian Demo Presets (Zero Setup)</span>
        </div>
        <span className="text-[11px] font-mono text-vb-muted">Planted leaks + fake Indian PII</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEMO_PRESETS.map((preset) => {
          const isSelected = selectedKey === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              disabled={loading}
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-3 rounded border transition-colors ${
                isSelected
                  ? 'border-vb-teal bg-vb-teal-tint/60'
                  : 'border-vb-border bg-vb-canvas/50 hover:border-vb-teal/50 hover:bg-vb-surface'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-display font-bold text-vb-ink leading-snug">
                  {preset.label}
                </span>
                <Database className="w-3.5 h-3.5 text-vb-teal shrink-0" />
              </div>
              <div className="text-[11px] font-mono text-vb-muted mt-1">{preset.rowsLabel}</div>
              <div className="text-[11px] font-mono text-vb-terracotta mt-1">{preset.leakHint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
