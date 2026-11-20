import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle2, ClipboardCheck, GraduationCap, Info } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { ROLE_DEFAULT_ROUTE, useRole } from '../context/RoleContext';
import { apiFetch } from '../lib/api';
import type { UserProfile, UserRole } from '../types/vexa';

const ROLE_CARDS: {
  role: 'BUSINESS' | 'STUDENT' | 'MENTOR';
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  bullets: string[];
  tags: string[];
}[] = [
  {
    role: 'BUSINESS',
    title: 'Business Owner / Ops Lead',
    icon: Briefcase,
    bullets: [
      'Run 60-second AI operational & INR leak audits',
      'Inspect side-by-side PII Shield redaction diffs',
      'Export Jira/Trello tickets or publish to builders',
    ],
    tags: ['Retail/D2C', 'Wholesale', 'Logistics', 'Services/Agency', 'Personal UPI'],
  },
  {
    role: 'STUDENT',
    title: 'Student / Early-Career Builder',
    icon: GraduationCap,
    bullets: [
      'Browse real anonymized Indian SMB bottlenecks',
      'Download PII-verified sample CSV datasets',
      'Earn shareable Mentor-Verified Proof-of-Work cards',
    ],
    tags: ['Python', 'FastAPI', 'Gemini 2.5 Flash', 'Pandas', 'React', 'Automation'],
  },
  {
    role: 'MENTOR',
    title: 'Technical & Business Mentor',
    icon: ClipboardCheck,
    bullets: [
      'Review student drafts with Gemini AI Pre-Audit briefings',
      'Score submissions on a mandatory 3-point rubric',
      'Connect verified solutions to SMB owners in 1 click',
    ],
    tags: ['AI Architecture', 'SMB Operations', 'Data Engineering', 'Cloud Run'],
  },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCustomSession } = useRole();

  const [selectedRole, setSelectedRole] = useState<'BUSINESS' | 'STUDENT' | 'MENTOR'>('BUSINESS');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Retail/D2C']);
  const [formError, setFormError] = useState('');

  const activeCard = ROLE_CARDS.find((c) => c.role === selectedRole)!;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<UserProfile>('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          role: selectedRole,
          domain_tags: selectedTags,
        }),
      }),
    onSuccess: (user) => {
      setCustomSession(user);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate(ROLE_DEFAULT_ROUTE[user.role as UserRole]);
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !email.includes('@')) {
      setFormError('Enter your full name and a valid email address to create a workspace profile.');
      return;
    }
    setFormError('');
    mutation.mutate();
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <span className="vb-label">Workspace Onboarding</span>
          <h1 className="font-display font-extrabold text-[28px] text-vb-ink mt-1">
            Configure Your Role &amp; Operational Domain
          </h1>
          <p className="text-sm text-vb-muted mt-1">
            Select your persona to register a live RBAC profile (or use the sidebar Role Switcher for pre-seeded demo accounts).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 3 Large Selectable Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ROLE_CARDS.map((card) => {
              const Icon = card.icon;
              const selected = selectedRole === card.role;
              return (
                <button
                  key={card.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(card.role);
                    setSelectedTags([card.tags[0]]);
                  }}
                  className={`text-left vb-card p-5 transition-colors ${
                    selected ? 'border-2 border-vb-teal bg-vb-teal-tint/30' : 'hover:border-vb-teal/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`w-5 h-5 ${selected ? 'text-vb-teal' : 'text-vb-muted'}`} />
                    {selected && <CheckCircle2 className="w-4 h-4 text-vb-teal" />}
                  </div>
                  <div className="font-display font-bold text-[15px] text-vb-ink">{card.title}</div>
                  <ul className="mt-3 space-y-1.5 text-xs text-vb-muted">
                    {card.bullets.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {selectedRole === 'MENTOR' && (
            <div className="vb-card p-4 border-vb-revision/40 bg-vb-revision-tint/60 flex items-start gap-2.5 text-xs text-vb-revision">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Mentor Verification Notice:</strong> Newly registered mentors start in read-only
                triage mode (`is_verified = false`) until approved by a Platform Admin in `/admin`.
              </span>
            </div>
          )}

          {/* Profile & Domain Tags */}
          <div className="vb-card p-6 space-y-4">
            {formError && (
              <div className="p-3 rounded bg-vb-terracotta-tint border border-vb-terracotta/30 text-xs text-vb-terracotta">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="vb-label block mb-1.5">Full Name / Organization</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Meera Joshi"
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                  required
                />
              </div>
              <div>
                <label className="vb-label block mb-1.5">Work / Campus Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="meera@company.in"
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                  required
                />
              </div>
            </div>

            <div>
              <label className="vb-label block mb-2">Domain &amp; Focus Tags</label>
              <div className="flex flex-wrap gap-2">
                {activeCard.tags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-vb-teal text-white border-vb-teal'
                          : 'bg-vb-canvas text-vb-ink border-vb-border hover:border-vb-teal/50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-vb-border">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-5 py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark disabled:opacity-50"
              >
                {mutation.isPending ? 'Creating Profile...' : 'Enter Workspace →'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
