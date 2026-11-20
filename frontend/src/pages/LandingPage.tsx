import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { ROLE_DEFAULT_ROUTE, useRole } from '../context/RoleContext';
import type { UserRole } from '../types/vexa';

export function LandingPage() {
  const { switchRole } = useRole();
  const navigate = useNavigate();

  const launchDemo = (role: UserRole, pathOverride?: string) => {
    switchRole(role);
    navigate(pathOverride || ROLE_DEFAULT_ROUTE[role]);
  };

  return (
    <div className="min-h-screen bg-vb-canvas text-vb-ink">
      {/* Persistent 3px Deep Forest Teal Brand Strip */}
      <div className="h-[3px] bg-vb-teal w-full" />

      {/* Clean Editorial Top Bar */}
      <header className="bg-vb-surface border-b border-vb-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-vb-teal flex items-center justify-center text-white font-display font-extrabold text-sm">
              VB
            </div>
            <div>
              <span className="font-display font-extrabold text-base tracking-tight text-vb-ink">
                VEXA BRIDGE
              </span>
              <span className="ml-2 text-[11px] font-mono px-2 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-muted">
                v2.0 · Buildathon India 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/onboarding"
              className="hidden sm:inline-block text-xs font-semibold text-vb-muted hover:text-vb-ink"
            >
              Role Onboarding
            </Link>
            <button
              type="button"
              onClick={() => launchDemo('BUSINESS', '/business/new-audit')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark transition-colors"
            >
              <span>Try Live Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* 1-Click Judge Demo Launcher Bar */}
        <section className="vb-card p-4 bg-vb-surface flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-vb-verified" />
            <span className="text-xs font-display font-bold uppercase tracking-wider text-vb-ink">
              Launch Interactive Demo (Zero Signup · Pre-Seeded State)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => launchDemo('BUSINESS')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Business Owner</span>
            </button>
            <button
              type="button"
              onClick={() => launchDemo('STUDENT')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#334155] text-white text-xs font-semibold hover:bg-slate-800"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Builder</span>
            </button>
            <button
              type="button"
              onClick={() => launchDemo('MENTOR')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#B45309] text-white text-xs font-semibold hover:bg-amber-800"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Mentor Reviewer</span>
            </button>
            <button
              type="button"
              onClick={() => launchDemo('ADMIN')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-vb-ink text-white text-xs font-semibold hover:bg-zinc-800"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Platform Admin</span>
            </button>
          </div>
        </section>

        {/* Editorial Split Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded bg-vb-teal-tint text-vb-teal border border-vb-teal/20">
              100% Google AI Stack · Gemini 2.5 Flash · Pandas · Cloud Run
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-vb-ink leading-[1.15]">
              Turn messy Indian operational spreadsheets into verified AI pilots in 48 hours.
            </h1>

            <p className="text-[15px] text-vb-muted leading-relaxed max-w-2xl">
              Upload any order ledger, WhatsApp inquiry tracker, or 30-day UPI export. Python computes exact
              revenue leakage in under 1.5 seconds, scrubs Indian PII with a zero-leak gate, and Gemini 2.5
              Flash generates an executive roadmap plus a mentor-vetted Builder Challenge Brief.
            </p>

            {/* 3-Step Visual Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                {
                  step: '01',
                  title: 'Deterministic Audit',
                  desc: 'Pandas/NumPy profiles delays, RTO %, & INR leaks (<1.5s).',
                },
                {
                  step: '02',
                  title: 'Zero-Leak PII Shield',
                  desc: 'Redacts phones, UPI, emails & hashes names before storage.',
                },
                {
                  step: '03',
                  title: 'Mentor-Vetted Pilot',
                  desc: 'Export Jira tickets OR route to builders with AI Pre-Audit.',
                },
              ].map((s) => (
                <div key={s.step} className="vb-card p-3.5">
                  <div className="tabular-num text-xs font-bold text-vb-teal">{s.step}</div>
                  <div className="font-display font-bold text-sm text-vb-ink mt-1">{s.title}</div>
                  <div className="text-xs text-vb-muted mt-1">{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => launchDemo('BUSINESS', '/business/new-audit')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Run 60-Second Ahmedabad D2C Audit</span>
              </button>
              <button
                type="button"
                onClick={() => launchDemo('MENTOR', '/mentor/reviews')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded border border-vb-border bg-vb-surface text-vb-ink text-sm font-semibold hover:bg-vb-canvas"
              >
                <Award className="w-4 h-4 text-vb-revision" />
                <span>Inspect Pre-Seeded Mentor AI Pre-Audit</span>
              </button>
            </div>
          </div>

          {/* Right: Live Interactive Preview Card (Ahmedabad D2C Leak Summary) */}
          <div className="lg:col-span-5 vb-card overflow-hidden">
            <div className="px-5 py-3.5 bg-vb-teal text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-white/75">
                  Live Diagnostic Sample · SMB Mode
                </div>
                <div className="font-display font-bold text-sm">Kaya Looms D2C Apparel (500 Rows)</div>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/15">3.1s total</span>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-vb-terracotta-tint/60 border border-vb-terracotta/30">
                  <div className="vb-label text-vb-terracotta">Est. Monthly Leak</div>
                  <div className="tabular-num text-xl font-bold text-vb-terracotta mt-1">
                    INR 1,48,500
                  </div>
                </div>
                <div className="p-3 rounded bg-vb-canvas border border-vb-border">
                  <div className="vb-label">Health Score</div>
                  <div className="tabular-num text-xl font-bold text-vb-revision mt-1">54 / 100</div>
                </div>
              </div>

              <div className="p-3.5 rounded border-l-4 border-l-vb-terracotta bg-vb-canvas border border-vb-border">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="font-bold text-vb-terracotta">#1 CRITICAL BOTTLENECK</span>
                  <span className="text-vb-muted">19.2% COD RTO</span>
                </div>
                <div className="font-display font-bold text-sm text-vb-ink mt-1">
                  Unverified Tier-2 COD Return-to-Origin Spike
                </div>
                <div className="text-xs text-vb-muted mt-1">
                  28.4% delayed dispatches clustered Thu–Sat · 46.5 staff hrs lost/mo.
                </div>
              </div>

              {/* Mini PII Shield Preview */}
              <div className="p-3 rounded bg-vb-verified-tint/40 border border-vb-verified/30 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-vb-verified font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    PII Shield Verified (0% Leak)
                  </span>
                  <span>4 cols masked</span>
                </div>
                <div className="text-vb-muted">
                  Rohan Patel → <span className="text-vb-verified font-semibold">CUST_7F9A2C</span>
                </div>
                <div className="text-vb-muted">
                  +91 98250 44192 →{' '}
                  <span className="text-vb-verified font-semibold">[REDACTED_PHONE]</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => launchDemo('BUSINESS', '/business/new-audit?preset=ahmedabad_d2c')}
                className="w-full py-2.5 rounded border border-vb-teal text-vb-teal font-semibold text-xs hover:bg-vb-teal-tint transition-colors"
              >
                Run This Exact Preset Live →
              </button>
            </div>
          </div>
        </section>

        {/* 3-Column Commercial Workspace Mode Selector */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-vb-ink">
              Three Commercial Markets · One Mode-Adaptive Pipeline
            </h2>
            <span className="text-xs font-mono text-vb-muted">SMB · CAMPUS · PERSONAL</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                mode: 'SMB',
                title: 'SMB / Agency Operations',
                icon: Database,
                desc: 'Order logs, WhatsApp dispatch sheets, and Tally ledgers turned into INR leak diagnostics, Jira/Trello tickets, or vetted student pilots.',
                cta: 'Launch SMB Audit',
                action: () => launchDemo('BUSINESS', '/business/new-audit?preset=ahmedabad_d2c'),
              },
              {
                mode: 'CAMPUS',
                title: 'Campus & Hiring Cohorts',
                icon: GraduationCap,
                desc: 'Convert anonymized partner operational CSVs into standardized engineering assessments with edge-case grading rubrics and AI Pre-Audit ranking.',
                cta: 'Open Campus Mode',
                action: () => launchDemo('BUSINESS', '/business/new-audit?mode=CAMPUS'),
              },
              {
                mode: 'PERSONAL',
                title: 'Personal S.P.E.N.D. UPI Audit',
                icon: Wallet,
                desc: 'Upload 30-day UPI exports to expose <₹300 micro-transaction velocity, late-night food delivery share, and unused autopays with a 7-day fix plan.',
                cta: 'Run 30-Day UPI Audit',
                action: () => launchDemo('BUSINESS', '/business/new-audit?preset=personal_upi_30d'),
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.mode} className="vb-card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-teal">
                        {card.mode}
                      </span>
                      <Icon className="w-4 h-4 text-vb-muted" />
                    </div>
                    <h3 className="font-display font-bold text-[15px] text-vb-ink">{card.title}</h3>
                    <p className="text-xs text-vb-muted mt-1.5 leading-relaxed">{card.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={card.action}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-vb-teal hover:underline"
                  >
                    <span>{card.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
