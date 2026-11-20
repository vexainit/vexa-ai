import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Compass,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  X,
} from 'lucide-react';
import { ROLE_DEFAULT_ROUTE, useRole } from '../../context/RoleContext';
import type { UserRole } from '../../types/vexa';

const ROLE_BADGE: Record<UserRole, { label: string; dot: string; bg: string }> = {
  BUSINESS: { label: 'BUSINESS', dot: 'bg-[#0F4C5C]', bg: 'bg-vb-teal-tint text-vb-teal' },
  STUDENT: { label: 'STUDENT', dot: 'bg-[#334155]', bg: 'bg-slate-100 text-slate-700' },
  MENTOR: { label: 'MENTOR', dot: 'bg-[#B45309]', bg: 'bg-vb-revision-tint text-vb-revision' },
  ADMIN: { label: 'ADMIN', dot: 'bg-[#18181B]', bg: 'bg-zinc-200 text-vb-ink' },
};

const DEMO_SWITCH_OPTIONS = [
  { userId: 'biz_kaya', role: 'BUSINESS' as UserRole, name: 'Kaya Looms D2C', subtitle: 'Business Owner' },
  { userId: 'stu_aarav', role: 'STUDENT' as UserRole, name: 'Aarav Mehta', subtitle: 'Student Builder' },
  { userId: 'men_priya', role: 'MENTOR' as UserRole, name: 'Priya Shah', subtitle: 'Verified Mentor' },
  { userId: 'men_pending', role: 'MENTOR' as UserRole, name: 'Vikram Desai', subtitle: 'Unverified Mentor' },
  { userId: 'adm_vexa', role: 'ADMIN' as UserRole, name: 'Vexa Ops Admin', subtitle: 'Platform Admin' },
];

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

function getNavItems(role: UserRole, userId: string): NavItem[] {
  if (role === 'BUSINESS') {
    return [
      { to: '/business', label: 'Diagnostic Audits', icon: LayoutDashboard, end: true },
      { to: '/business/new-audit', label: 'New 60s Audit', icon: FilePlus2 },
      { to: '/onboarding', label: 'Workspace Setup', icon: UserCheck },
    ];
  }
  if (role === 'STUDENT') {
    return [
      { to: '/student/challenges', label: 'Challenge Feed', icon: Compass },
      { to: '/student/submissions', label: 'My Drafts & Revisions', icon: FolderKanban },
      { to: `/portfolio/${userId}`, label: 'Verified Portfolio', icon: Award },
    ];
  }
  if (role === 'MENTOR') {
    return [
      { to: '/mentor/reviews', label: 'Review Queue', icon: ClipboardCheck },
      { to: '/student/challenges', label: 'Published Briefs', icon: Briefcase },
    ];
  }
  return [
    { to: '/admin', label: 'Telemetry & Users', icon: Activity, end: true },
    { to: '/admin/governance', label: 'Governance & Logs', icon: SlidersHorizontal },
    { to: '/business', label: 'All Business Audits', icon: LayoutDashboard },
    { to: '/mentor/reviews', label: 'Mentor Queue', icon: ClipboardCheck },
  ];
}

export function RoleSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { session, switchRoleByUserId } = useRole();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const navItems = getNavItems(session.role, session.userId);
  const badge = ROLE_BADGE[session.role];

  const handleSelectPersona = (userId: string) => {
    const next = switchRoleByUserId(userId);
    setSwitcherOpen(false);
    onCloseMobile();
    navigate(ROLE_DEFAULT_ROUTE[next.role]);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-vb-surface border-r border-vb-border">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-vb-border">
        <Link to="/" className="flex items-center gap-2.5 group" onClick={onCloseMobile}>
          <div className="w-7 h-7 rounded bg-vb-teal flex items-center justify-center text-white font-display font-extrabold text-sm tracking-tight">
            VB
          </div>
          <div>
            <div className="font-display font-extrabold text-[15px] leading-none text-vb-ink tracking-tight">
              VEXA BRIDGE
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-vb-muted mt-0.5">
              v2.0 Operations
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1 text-vb-muted hover:text-vb-ink rounded"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Demo Role Switcher Pill */}
      <div className="p-4 border-b border-vb-border relative">
        <div className="vb-label mb-1.5">Active Persona</div>
        <button
          type="button"
          onClick={() => setSwitcherOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-vb-border bg-vb-canvas hover:border-vb-teal/50 transition-colors text-left"
          aria-expanded={switcherOpen}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-vb-ink">
                {badge.label}
              </span>
              {session.role === 'MENTOR' && !session.isVerified && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-vb-revision-tint text-vb-revision font-medium">
                  Unverified
                </span>
              )}
            </div>
            <div className="text-xs font-medium text-vb-ink truncate mt-0.5">{session.fullName}</div>
          </div>
          <ChevronDown className={`w-4 h-4 text-vb-muted shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
        </button>

        {switcherOpen && (
          <div className="absolute left-4 right-4 top-[88px] z-40 vb-card shadow-sm py-1.5">
            <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-vb-muted border-b border-vb-border">
              Instant Demo Switcher
            </div>
            {DEMO_SWITCH_OPTIONS.map((opt) => {
              const active = session.userId === opt.userId;
              const optBadge = ROLE_BADGE[opt.role];
              return (
                <button
                  key={opt.userId}
                  type="button"
                  onClick={() => handleSelectPersona(opt.userId)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-vb-canvas transition-colors ${
                    active ? 'bg-vb-teal-tint/50' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-vb-ink truncate">{opt.name}</div>
                    <div className="text-[11px] text-vb-muted flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${optBadge.dot}`} />
                      {opt.subtitle}
                    </div>
                  </div>
                  {active && <CheckCircle2 className="w-3.5 h-3.5 text-vb-teal shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Role-Specific Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Workspace navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-vb-teal-tint text-vb-teal font-semibold border-l-2 border-vb-teal'
                    : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Privacy & Stack Indicator */}
      <div className="p-4 border-t border-vb-border bg-vb-canvas/60">
        <div className="flex items-center gap-2 text-[11px] font-medium text-vb-verified">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>PII Zero-Leak Gate Active</span>
        </div>
        <div className="text-[10px] font-mono text-vb-muted mt-1">
          Gemini 2.5 Flash · Pandas · Cloud Run
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (240px / 216px compact) */}
      <aside className="hidden lg:block fixed top-[3px] left-0 bottom-0 w-[216px] xl:w-[240px] z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-vb-ink/40" onClick={onCloseMobile} />
          <aside className="relative w-[260px] max-w-[85vw] h-full z-50 pt-[3px]">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
