import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Database,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { ROLE_DEFAULT_ROUTE, useRole } from '../context/RoleContext';
import { apiFetch } from '../lib/api';
import type { HealthResponse } from '../types/vexa';

export function LandingPage() {
  const { user, isAuthenticated } = useRole();

  const { data: health } = useQuery({
    queryKey: ['public-health'],
    queryFn: () => apiFetch<HealthResponse>('/health'),
    staleTime: 15_000,
    retry: 1,
  });

  const counts = health?.live_counts;

  return (
    <div className="min-h-screen bg-vb-canvas text-vb-ink">
      <div className="h-[3px] bg-vb-teal w-full" />

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-vb-surface/95 backdrop-blur-none border-b border-vb-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded bg-vb-teal text-white flex items-center justify-center font-display font-bold text-xs">
              VB
            </span>
            <span className="font-display font-bold text-base tracking-tight text-vb-ink">
              Vexa Bridge
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-vb-muted">
            <a href="#pipeline" className="hover:text-vb-ink">
              How it works
            </a>
            <a href="#modes" className="hover:text-vb-ink">
              Workspace modes
            </a>
            <a href="#portals" className="hover:text-vb-ink">
              Portals
            </a>
            <a href="#privacy" className="hover:text-vb-ink">
              PII shield
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated && user ? (
              <Link
                to={ROLE_DEFAULT_ROUTE[user.role]}
                className="px-4 py-2 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark"
              >
                Open workspace
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-vb-muted hover:text-vb-ink px-2 py-1.5"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-16">
        {/* Balanced Split Hero: Headline + Live System Telemetry Panel (Zero Mock Numbers) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-vb-ink leading-[1.08] tracking-tight">
              Turn messy spreadsheets into verified pilots.
            </h1>

            <p className="text-lg text-vb-muted leading-relaxed max-w-2xl">
              Quantify operational leaks deterministically in Python, scrub Indian customer PII before storage, and ship mentor-verified solutions.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/register?role=BUSINESS"
                className="px-6 py-3 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark"
              >
                Register your business
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-md border border-vb-border bg-vb-surface text-vb-ink text-sm font-semibold hover:border-vb-teal"
              >
                Sign in to portal
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-vb-border max-w-xl">
              <div>
                <div className="tabular-num text-lg font-bold text-vb-ink">&lt; 1.5s</div>
                <div className="text-xs text-vb-muted">Exact Number Check</div>
              </div>
              <div>
                <div className="tabular-num text-lg font-bold text-vb-verified">0% PII</div>
                <div className="text-xs text-vb-muted">Zero-leak gate</div>
              </div>
              <div>
                <div className="tabular-num text-lg font-bold text-vb-ink">3-point</div>
                <div className="text-xs text-vb-muted">Mentor verification</div>
              </div>
            </div>
          </div>

          {/* Right Panel: Live Connected Infrastructure & Real DB Counts */}
          <div className="lg:col-span-5 vb-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-vb-border">
              <h2 className="font-display font-bold text-base text-vb-ink">
                Live platform status
              </h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded bg-vb-verified-tint text-vb-verified">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{health?.status === 'ok' ? 'Operational' : 'Connecting'}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Registered businesses', value: counts?.businesses ?? 0 },
                { label: 'Student builders', value: counts?.students ?? 0 },
                { label: 'Published challenges', value: counts?.published_challenges ?? 0 },
                { label: 'Verified pilots', value: counts?.approved_pilots ?? 0 },
              ].map((stat) => (
                <div key={stat.label} className="p-3.5 rounded-md bg-vb-canvas border border-vb-border">
                  <div className="text-xs text-vb-muted">{stat.label}</div>
                  <div className="tabular-num text-2xl font-bold text-vb-ink mt-1">{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 pt-3 border-t border-vb-border text-sm">
              <div className="flex items-center justify-between">
                <span className="text-vb-muted">Database engine</span>
                <span className="tabular-num font-medium text-vb-ink">{health?.database || 'connected'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-vb-muted">AI inference</span>
                <span className="font-medium text-vb-ink">
                  {health?.gemini_configured ? 'Gemini Flash connected' : 'Deterministic fallback'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-vb-muted">Authentication</span>
                <span className="font-medium text-vb-ink">
                  {health?.firebase_configured ? 'Firebase Auth + JWT' : 'Email + JWT'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-vb-muted">Dataset isolation</span>
                <span className="font-medium text-vb-verified">
                  {health?.storage_mode === 'gcs' ? 'Separate GCS buckets' : 'Isolated raw/masked dirs'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: End-to-End 4-Stage Pipeline */}
        <section id="pipeline" className="space-y-5">
          <div className="max-w-2xl">
            <h2 className="font-display font-bold text-2xl text-vb-ink">
              How an operational ledger becomes a working pilot
            </h2>
            <p className="text-sm text-vb-muted mt-1">
              Computation stays in Python, raw customer rows never reach an LLM, and every builder submission passes mentor verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                num: '01',
                icon: FileSpreadsheet,
                title: 'Exact Number Check',
                body: 'Python computes exact delay rates, COD RTO %, missing fields, and monthly INR leakage in under 1.5 seconds — no AI guessing.',
              },
              {
                num: '02',
                icon: ShieldCheck,
                title: 'Indian PII redaction',
                body: 'Two-pass scrubber masks phones, emails, UPI IDs, PAN/Aadhaar, and hashes customer names via salted SHA-256.',
              },
              {
                num: '03',
                icon: Cpu,
                title: 'Gemini scoped synthesis',
                body: 'Gemini receives only verified statistics to generate an executive roadmap, Jira/Trello tickets, and a builder brief.',
              },
              {
                num: '04',
                icon: ClipboardCheck,
                title: 'Mentor-vetted handoff',
                body: 'Students build on the masked CSV; verified mentors sign a 3-point scorecard before businesses schedule a 15-min pilot.',
              },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="vb-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="tabular-num text-sm font-bold text-vb-teal">{step.num}</span>
                    <Icon className="w-4 h-4 text-vb-muted" />
                  </div>
                  <h3 className="font-display font-bold text-base text-vb-ink">{step.title}</h3>
                  <p className="text-sm text-vb-muted leading-relaxed">{step.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Three Commercial Workspace Modes */}
        <section id="modes" className="space-y-5">
          <div className="max-w-2xl">
            <h2 className="font-display font-bold text-2xl text-vb-ink">
              Three workspace modes on one pipeline
            </h2>
            <p className="text-sm text-vb-muted mt-1">
              Switching workspace mode adapts intake fields, Pandas calculators, and structured AI framing automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Building2,
                mode: 'SMB and Agency',
                input: 'Order ledgers, WhatsApp dispatch sheets, Tally exports',
                output: 'Health score, monthly INR leak, quick wins vs. AI builds, Jira/Trello ticket export, or builder publishing.',
              },
              {
                icon: GraduationCap,
                mode: 'Campus and Hiring',
                input: 'Anonymized partner company operational logs',
                output: 'Standardized technical skill brief with edge-case grading traps and mentor AI pre-audit ranking.',
              },
              {
                icon: Wallet,
                mode: 'Personal UPI Audit',
                input: '30-day UPI transaction statements and expense logs',
                output: 'S.P.E.N.D. behavioral archetype, micro-transaction velocity, late-night food share, and a 7-day fix checklist.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.mode} className="vb-card p-6 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-5 h-5 text-vb-teal" />
                    <h3 className="font-display font-bold text-base text-vb-ink">{item.mode}</h3>
                  </div>
                  <div className="text-xs font-medium text-vb-muted">{item.input}</div>
                  <p className="text-sm text-vb-ink leading-relaxed">{item.output}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Four Dedicated Role Portals */}
        <section id="portals" className="space-y-5">
          <div className="max-w-2xl">
            <h2 className="font-display font-bold text-2xl text-vb-ink">
              Four dedicated role portals
            </h2>
            <p className="text-sm text-vb-muted mt-1">
              Every stakeholder gets an isolated workspace, role-specific sidebar, real-time analytics, and strict RBAC enforcement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                role: 'BUSINESS',
                title: 'Business portal',
                icon: Building2,
                req: 'CIN / GSTIN and incorporation certificate',
                desc: 'Upload ledgers, inspect side-by-side PII diffs, export tickets, or review mentor-approved pilots.',
                loginTo: '/login?role=BUSINESS',
                registerTo: '/register?role=BUSINESS',
              },
              {
                role: 'STUDENT',
                title: 'Student portal',
                icon: GraduationCap,
                req: 'College name, ID, and graduation year',
                desc: 'Download verified masked CSVs, submit versioned builds, and share Verified Proof-of-Work cards.',
                loginTo: '/login?role=STUDENT',
                registerTo: '/register?role=STUDENT',
              },
              {
                role: 'MENTOR',
                title: 'Mentor portal',
                icon: ClipboardCheck,
                req: 'Organization, title, and admin approval',
                desc: 'Triage incoming drafts with AI pre-audit fit scores and approve pilots via the 3-point scorecard.',
                loginTo: '/login?role=MENTOR',
                registerTo: '/register?role=MENTOR',
              },
              {
                role: 'ADMIN',
                title: 'Admin control',
                icon: SlidersHorizontal,
                req: 'Platform governance credentials',
                desc: 'Verify businesses and mentors, moderate cases, configure guardrails, and inspect live DB tables.',
                loginTo: '/login?role=ADMIN',
                registerTo: null,
              },
            ].map((portal) => {
              const Icon = portal.icon;
              return (
                <div key={portal.role} className="vb-card p-5 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-5 h-5 text-vb-teal" />
                      <h3 className="font-display font-bold text-base text-vb-ink">{portal.title}</h3>
                    </div>
                    <div className="text-xs text-vb-muted">{portal.req}</div>
                    <p className="text-sm text-vb-muted leading-relaxed">{portal.desc}</p>
                  </div>
                  <div className="mt-5 pt-3.5 border-t border-vb-border flex items-center gap-4 text-sm font-semibold">
                    <Link to={portal.loginTo} className="text-vb-teal hover:underline">
                      Sign in
                    </Link>
                    {portal.registerTo && (
                      <Link to={portal.registerTo} className="text-vb-muted hover:text-vb-ink">
                        Register
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 5: Privacy-by-Construction Spec Table */}
        <section id="privacy" className="vb-card overflow-hidden">
          <div className="px-6 py-4 border-b border-vb-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-vb-verified" />
              <h2 className="font-display font-bold text-base text-vb-ink">
                Automated Indian PII isolation boundary
              </h2>
            </div>
            <span className="text-xs font-medium text-vb-verified">
              Enforced before storage write and before student download
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-vb-canvas border-b border-vb-border text-vb-muted">
                  <th className="px-6 py-3 font-medium">Sensitive field</th>
                  <th className="px-6 py-3 font-medium">Detection layer</th>
                  <th className="px-6 py-3 font-medium">Builder-safe replacement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vb-border">
                {[
                  ['Customer and contact names', 'Column header classifier + per-case random salt', 'CUST_<6-char SHA256>'],
                  ['Indian mobile numbers', 'Regex (+91 / 10-digit [6-9]) + header sweep', '[REDACTED_PHONE]'],
                  ['Email and Indian UPI handles', 'RFC email + VPA handle regex', '[REDACTED_EMAIL] / [REDACTED_UPI]'],
                  ['PAN, GSTIN, Aadhaar', 'Government ID header + pattern sweep', '[REDACTED_ID]'],
                  ['Street addresses and formulas', 'Address header redaction + Excel formula prefixing', '[REDACTED_ADDR]'],
                ].map(([field, method, output]) => (
                  <tr key={field}>
                    <td className="px-6 py-3 font-medium text-vb-ink">{field}</td>
                    <td className="px-6 py-3 text-vb-muted">{method}</td>
                    <td className="px-6 py-3 tabular-num text-vb-verified font-medium">{output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-vb-border flex flex-wrap items-center justify-between gap-4 text-sm text-vb-muted">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4" />
            <span>Vexa Bridge · Google Cloud Run, Cloud SQL, Cloud Storage, Firebase Auth, Gemini</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-vb-ink">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-vb-ink">
              Register
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
