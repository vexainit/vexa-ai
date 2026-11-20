import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { ChallengeCard } from '../../components/student/ChallengeCard';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import type { ChallengeItem } from '../../types/vexa';

export function ChallengeFeedPage() {
  const { session } = useRole();
  const [mode, setMode] = useState('');
  const [domain, setDomain] = useState('');
  const [solutionType, setSolutionType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState('newest');

  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  if (domain) params.set('domain', domain);
  if (solutionType) params.set('solution_type', solutionType);
  if (difficulty) params.set('difficulty', difficulty);
  params.set('sort', sort);

  const { data, isLoading } = useQuery({
    queryKey: ['challenges', mode, domain, solutionType, difficulty, sort, session.userId],
    queryFn: () =>
      apiFetch<{ challenges: ChallengeItem[] }>(`/challenges?${params.toString()}`, {
        userId: session.userId,
        role: session.role,
      }),
  });

  const challenges = data?.challenges ?? [];
  const hasFilters = Boolean(mode || domain || solutionType || difficulty);

  const resetFilters = () => {
    setMode('');
    setDomain('');
    setSolutionType('');
    setDifficulty('');
    setSort('newest');
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <span className="vb-label">Student &amp; Builder Proof-of-Work Marketplace</span>
          <h1 className="font-display font-extrabold text-[28px] text-vb-ink mt-0.5">
            Published PII-Safe Business Challenges
          </h1>
          <p className="text-sm text-vb-muted mt-1">
            Solve real Indian operational bottlenecks using anonymized datasets. Every mentor-approved build earns a shareable Verified Proof-of-Work Card.
          </p>
        </div>

        {/* Multi-Facet Filter Bar */}
        <div className="vb-card p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-vb-ink mr-1">
            <Filter className="w-3.5 h-3.5 text-vb-teal" />
            <span>Filters</span>
          </div>

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-surface"
          >
            <option value="">All Modes</option>
            <option value="SMB">SMB / Agency</option>
            <option value="CAMPUS">Campus / Hiring</option>
          </select>

          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-surface"
          >
            <option value="">All Domains</option>
            <option value="Retail/D2C">Retail/D2C</option>
            <option value="Manufacturing/Wholesale">Manufacturing/Wholesale</option>
            <option value="Services/Agency">Services/Agency</option>
            <option value="Logistics">Logistics</option>
            <option value="EdTech/Other">EdTech/Other</option>
          </select>

          <select
            value={solutionType}
            onChange={(e) => setSolutionType(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-surface"
          >
            <option value="">All Deliverables</option>
            <option value="AI Agent">AI Agent</option>
            <option value="Automation">Automation</option>
            <option value="Web App">Web App</option>
            <option value="Data Analytics">Data Analytics</option>
          </select>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-surface"
          >
            <option value="">All Difficulty</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-canvas font-medium"
            >
              <option value="newest">Sort: Newest Published</option>
              <option value="impact">Sort: Highest Quantified Impact</option>
              <option value="fewest_submissions">Sort: Fewest Submissions</option>
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-vb-border text-xs font-semibold text-vb-muted hover:text-vb-ink"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Challenge Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="vb-card p-6 h-60 animate-pulse" />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <div className="vb-card p-10 text-center space-y-3">
            <h2 className="font-display font-bold text-base text-vb-ink">
              {hasFilters
                ? 'No published challenges match your current filters'
                : 'No published challenges yet'}
            </h2>
            <p className="text-xs text-vb-muted max-w-md mx-auto">
              {hasFilters
                ? 'Clear your active filters to view all open PII-safe business challenges.'
                : 'No businesses have published challenges yet. Check back soon as new PII-safe briefs are published.'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((ch) => (
              <ChallengeCard key={ch.id} item={ch} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
