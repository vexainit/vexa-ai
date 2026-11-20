import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Database,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
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

      {/* Minimal Header */}
      <header className="bg-vb-surface border-b border-vb-border">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded bg-vb-teal text-white flex items-center justify-center font-display font-extrabold text-[11px]">
              VB
            </span>
            <span className="font-display font-bold text-sm tracking-tight text-vb-ink">
              Vexa Bridge
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <Link
                to={ROLE_DEFAULT_ROUTE[user.role]}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
              >
                <span>Open {user.role.charAt(0) + user.role.slice(1).toLowerCase()} Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-semibold text-vb-muted hover:text-vb-ink px-2 py-1"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-14 space-y-14">
        {/* Crisp Editorial Hero */}
        <section className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 text-[11px] font-mono text-vb-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-vb-verified" />
            <span>Zero-Leak PII Isolation · Gemini 2.5 Flash · Google Cloud</span>
          </div>

          <h1 className="font-display font-extrabold text-3xl sm:text-[40px] text-vb-ink leading-[1.12] tracking-tight">
            Operational diagnostics, PII-safe challenge scoping, and mentor-verified execution.
          </h1>

          <p className="text-[15px] text-vb-muted leading-relaxed max-w-2xl">
            Upload operational CSV or Excel ledgers to quantify revenue leakage in Python, redact Indian customer PII automatically, and route fixes internally or through verified student builders and industry mentors.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/register?role=BUSINESS"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
            >
              <span>Register Business</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded border border-vb-border bg-vb-surface text-vb-ink text-xs font-semibold hover:border-vb-ink/30"
            >
              <span>Sign In to Portal</span>
            </Link>
          </div>
        </section>

        {/* Live Database Telemetry Strip (Real DB Counts — Zero Mock Data) */}
        <section className="border-y border-vb-border py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { label: 'Registered Businesses', value: counts?.businesses ?? 0 },
            { label: 'Active Student Builders', value: counts?.students ?? 0 },
            { label: 'Published PII-Safe Briefs', value: counts?.published_challenges ?? 0 },
            { label: 'Verified Pilot Builds', value: counts?.approved_pilots ?? 0 },
          ].map((m) => (
            <div key={m.label}>
              <div className="vb-label">{m.label}</div>
              <div className="tabular-num text-2xl font-bold text-vb-ink mt-1">{m.value}</div>
            </div>
          ))}
        </section>

        {/* 4 Dedicated Role Portals */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-base text-vb-ink">
              Four Dedicated Role Portals
            </h2>
            <span className="text-[11px] font-mono text-vb-muted">
              Firebase Auth · Role-Scoped RBAC · Live Database
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                role: 'BUSINESS',
                title: 'Business Portal',
                icon: Building2,
                req: 'CIN / GSTIN & Incorporation Cert',
                desc: 'Run AI spreadsheet diagnostics, inspect PII redaction diffs, export tickets, or publish bottlenecks.',
                loginTo: '/login?role=BUSINESS',
                registerTo: '/register?role=BUSINESS',
              },
              {
                role: 'STUDENT',
                title: 'Student Portal',
                icon: GraduationCap,
                req: 'College, Roll No & Grad Year',
                desc: 'Download PII-verified datasets, submit working builds, and earn shareable Proof-of-Work credentials.',
                loginTo: '/login?role=STUDENT',
                registerTo: '/register?role=STUDENT',
              },
              {
                role: 'MENTOR',
                title: 'Mentor Portal',
                icon: ClipboardCheck,
                req: 'Organization, Title & Admin Review',
                desc: 'Review student drafts with Gemini AI Pre-Audit briefings and sign 3-point pilot scorecards.',
                loginTo: '/login?role=MENTOR',
                registerTo: '/register?role=MENTOR',
              },
              {
                role: 'ADMIN',
                title: 'Admin Control',
                icon: SlidersHorizontal,
                req: 'Platform Governance Credentials',
                desc: 'Verify businesses & mentors, moderate cases, inspect all database tables, and audit logs.',
                loginTo: '/login?role=ADMIN',
                registerTo: null,
              },
            ].map((portal) => {
              const Icon = portal.icon;
              return (
                <div
                  key={portal.role}
                  className="vb-card p-5 flex flex-col justify-between hover:border-vb-teal/50 transition-colors"
                >
                  <div>
                    <Icon className="w-4 h-4 text-vb-teal mb-3" />
                    <h3 className="font-display font-bold text-sm text-vb-ink">{portal.title}</h3>
                    <div className="text-[11px] font-mono text-vb-muted mt-0.5">{portal.req}</div>
                    <p className="text-xs text-vb-muted mt-2.5 leading-relaxed">{portal.desc}</p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-vb-border flex items-center justify-between text-xs font-semibold">
                    <Link to={portal.loginTo} className="text-vb-teal hover:underline">
                      Sign In →
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

        {/* Minimal Infrastructure Footer */}
        <footer className="pt-6 border-t border-vb-border flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-vb-muted">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            DB: {health?.database || 'connected'} · Storage: {health?.storage_mode || 'isolated'}
          </span>
          <span>
            Gemini 2.5 Flash: {health?.gemini_configured ? 'Connected' : 'Fallback Ready'} · Firebase Auth:{' '}
            {health?.firebase_configured ? 'Active' : 'Email/JWT Active'}
          </span>
        </footer>
      </main>
    </div>
  );
}
