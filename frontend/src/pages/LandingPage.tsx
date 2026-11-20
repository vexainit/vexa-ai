import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, ClipboardCheck, GraduationCap, SlidersHorizontal } from 'lucide-react';
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

      {/* Clean Edge-Aligned Navigation */}
      <header className="bg-vb-surface border-b border-vb-border">
        <div className="max-w-[1120px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded bg-vb-teal text-white flex items-center justify-center font-display font-bold text-xs">
              VB
            </span>
            <span className="font-display font-bold text-base tracking-tight text-vb-ink">
              Vexa Bridge
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <Link
                to={ROLE_DEFAULT_ROUTE[user.role]}
                className="px-4 py-2 rounded-md bg-vb-teal text-white text-sm font-medium hover:bg-vb-teal-dark"
              >
                Open workspace
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-vb-muted hover:text-vb-ink px-2 py-1"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-md bg-vb-teal text-white text-sm font-medium hover:bg-vb-teal-dark"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-6 py-16 space-y-20">
        {/* Hallmark Hero: Big Display Head (<=7 words), 1 Crisp Sentence, Primary Actions */}
        <section className="max-w-3xl space-y-6">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-vb-ink leading-[1.1] tracking-tight">
            Turn messy spreadsheets into verified pilots.
          </h1>

          <p className="text-lg text-vb-muted leading-relaxed max-w-2xl">
            Quantify operational leaks in Python, redact customer PII automatically, and ship mentor-verified fixes.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/register?role=BUSINESS"
              className="px-6 py-3 rounded-md bg-vb-teal text-white text-sm font-semibold hover:bg-vb-teal-dark"
            >
              Register your business
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-md border border-vb-border bg-vb-surface text-vb-ink text-sm font-semibold hover:border-vb-ink/40"
            >
              Sign in to portal
            </Link>
          </div>
        </section>

        {/* Live Database Counts */}
        <section className="border-y border-vb-border py-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {[
            { label: 'Registered businesses', value: counts?.businesses ?? 0 },
            { label: 'Student builders', value: counts?.students ?? 0 },
            { label: 'Published challenges', value: counts?.published_challenges ?? 0 },
            { label: 'Verified pilots', value: counts?.approved_pilots ?? 0 },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-sm text-vb-muted">{m.label}</div>
              <div className="tabular-num text-3xl font-bold text-vb-ink mt-1">{m.value}</div>
            </div>
          ))}
        </section>

        {/* Four Dedicated Portals */}
        <section className="space-y-6">
          <h2 className="font-display font-bold text-2xl text-vb-ink">
            Choose your workspace
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                role: 'BUSINESS',
                title: 'Business portal',
                icon: Building2,
                desc: 'Upload order or dispatch sheets, inspect side-by-side PII redaction, export tickets, or publish bottlenecks.',
                loginTo: '/login?role=BUSINESS',
                registerTo: '/register?role=BUSINESS',
              },
              {
                role: 'STUDENT',
                title: 'Student portal',
                icon: GraduationCap,
                desc: 'Download anonymized datasets, submit working builds, and earn shareable proof-of-work credentials.',
                loginTo: '/login?role=STUDENT',
                registerTo: '/register?role=STUDENT',
              },
              {
                role: 'MENTOR',
                title: 'Mentor portal',
                icon: ClipboardCheck,
                desc: 'Review builder drafts with structured AI pre-audits and approve pilot-ready solutions on a 3-point scorecard.',
                loginTo: '/login?role=MENTOR',
                registerTo: '/register?role=MENTOR',
              },
              {
                role: 'ADMIN',
                title: 'Admin control',
                icon: SlidersHorizontal,
                desc: 'Verify businesses and mentors, moderate active cases, and inspect live database tables and audit logs.',
                loginTo: '/login?role=ADMIN',
                registerTo: null,
              },
            ].map((portal) => {
              const Icon = portal.icon;
              return (
                <div
                  key={portal.role}
                  className="vb-card p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <Icon className="w-5 h-5 text-vb-teal" />
                      <h3 className="font-display font-bold text-lg text-vb-ink">{portal.title}</h3>
                    </div>
                    <p className="text-[15px] text-vb-muted leading-relaxed">{portal.desc}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-vb-border flex items-center gap-5 text-sm font-semibold">
                    <Link to={portal.loginTo} className="text-vb-teal hover:underline">
                      Sign in
                    </Link>
                    {portal.registerTo && (
                      <Link to={portal.registerTo} className="text-vb-muted hover:text-vb-ink">
                        Create account
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Clean Footer */}
        <footer className="pt-8 border-t border-vb-border flex flex-wrap items-center justify-between gap-4 text-sm text-vb-muted">
          <span>Vexa Bridge</span>
          <div className="flex items-center gap-6">
            <span>Database: {health?.database || 'connected'}</span>
            <span>AI: {health?.gemini_configured ? 'Connected' : 'Fallback ready'}</span>
            <span>Auth: {health?.firebase_configured ? 'Firebase active' : 'Email active'}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
