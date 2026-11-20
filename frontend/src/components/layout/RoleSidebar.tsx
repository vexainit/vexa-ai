import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  Briefcase,
  Building2,
  ClipboardCheck,
  Compass,
  Database,
  FilePlus2,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import type { UserRole } from '../../types/vexa';

interface NavGroup {
  heading: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
  }[];
}

const ROLE_META: Record<UserRole, { label: string; dot: string }> = {
  BUSINESS: { label: 'Business Portal', dot: 'bg-[#0F4C5C]' },
  STUDENT: { label: 'Student Portal', dot: 'bg-[#334155]' },
  MENTOR: { label: 'Mentor Portal', dot: 'bg-[#B45309]' },
  ADMIN: { label: 'Admin Control', dot: 'bg-[#18181B]' },
};

function getSidebarGroups(role: UserRole, userId: string): NavGroup[] {
  if (role === 'BUSINESS') {
    return [
      {
        heading: 'Operations',
        items: [
          { to: '/business', label: 'Diagnostic Audits', icon: LayoutDashboard, end: true },
          { to: '/business/new-audit', label: 'New Audit', icon: FilePlus2 },
        ],
      },
      {
        heading: 'Organization',
        items: [{ to: '/profile', label: 'Company Profile & CIN', icon: Building2 }],
      },
    ];
  }
  if (role === 'STUDENT') {
    return [
      {
        heading: 'Marketplace',
        items: [{ to: '/student/challenges', label: 'Open Challenges', icon: Compass }],
      },
      {
        heading: 'Proof of Work',
        items: [
          { to: '/student/submissions', label: 'My Submissions', icon: FolderKanban },
          { to: `/portfolio/${userId}`, label: 'Verified Portfolio', icon: Award },
        ],
      },
      {
        heading: 'Account',
        items: [{ to: '/profile', label: 'College & Profile', icon: GraduationCap }],
      },
    ];
  }
  if (role === 'MENTOR') {
    return [
      {
        heading: 'Verification',
        items: [
          { to: '/mentor/reviews', label: 'Review Queue', icon: ClipboardCheck },
          { to: '/student/challenges', label: 'Published Briefs', icon: Briefcase },
        ],
      },
      {
        heading: 'Account',
        items: [{ to: '/profile', label: 'Mentor Credentials', icon: UserCircle }],
      },
    ];
  }
  return [
    {
      heading: 'Telemetry',
      items: [{ to: '/admin', label: 'Platform Overview', icon: Activity, end: true }],
    },
    {
      heading: 'Ecosystem Control',
      items: [
        { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
        { to: '/admin/students', label: 'Students', icon: GraduationCap },
        { to: '/admin/mentors', label: 'Mentors', icon: Users },
      ],
    },
    {
      heading: 'Database & Governance',
      items: [
        { to: '/admin/database', label: 'Database Explorer', icon: Database },
        { to: '/admin/governance', label: 'Moderation & Logs', icon: SlidersHorizontal },
      ],
    },
  ];
}

export function RoleSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { user, logout } = useRole();
  const navigate = useNavigate();

  if (!user) return null;

  const groups = getSidebarGroups(user.role, user.id);
  const meta = ROLE_META[user.role];

  const handleSignOut = async () => {
    await logout();
    onCloseMobile();
    navigate('/login');
  };

  const content = (
    <div className="flex h-full flex-col bg-vb-surface border-r border-vb-border">
      {/* Minimal Brand Header */}
      <div className="h-[52px] px-4 flex items-center justify-between border-b border-vb-border">
        <Link to="/" className="flex items-center gap-2.5" onClick={onCloseMobile}>
          <div className="w-6 h-6 rounded bg-vb-teal flex items-center justify-center text-white font-display font-extrabold text-[11px] tracking-tight">
            VB
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-vb-ink">
            Vexa Bridge
          </span>
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1 text-vb-muted hover:text-vb-ink rounded"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Role Context Indicator */}
      <div className="px-4 py-2.5 border-b border-vb-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className="text-[11px] font-medium text-vb-ink">{meta.label}</span>
        </div>
        {user.role === 'MENTOR' && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              user.is_verified
                ? 'bg-vb-verified-tint text-vb-verified'
                : 'bg-vb-revision-tint text-vb-revision'
            }`}
          >
            {user.is_verified ? 'Verified' : 'Pending'}
          </span>
        )}
      </div>

      {/* Grouped Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Sidebar navigation">
        {groups.map((group) => (
          <div key={group.heading}>
            <div className="px-2.5 mb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-vb-muted/80">
              {group.heading}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-1.5 rounded text-[13px] transition-colors ${
                        isActive
                          ? 'bg-vb-canvas text-vb-ink font-semibold border border-vb-border'
                          : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas/60 border border-transparent'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-vb-muted" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Clean Bottom Account Footer */}
      <div className="p-3 border-t border-vb-border space-y-2.5 bg-vb-canvas/40">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-7 h-7 rounded-full bg-vb-canvas border border-vb-border flex items-center justify-center text-xs font-display font-bold text-vb-ink shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-vb-ink truncate">{user.full_name}</div>
            <div className="text-[11px] text-vb-muted truncate">{user.email}</div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-vb-border/80 px-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-vb-verified">
            <ShieldCheck className="w-3 h-3" />
            PII Isolated
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-vb-muted hover:text-vb-terracotta transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block fixed top-[3px] left-0 bottom-0 w-[240px] z-30">
        {content}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-vb-ink/35" onClick={onCloseMobile} />
          <aside className="relative w-[256px] max-w-[85vw] h-full z-50 pt-[3px]">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
