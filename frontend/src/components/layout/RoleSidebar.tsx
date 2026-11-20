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
  Handshake,
  LayoutDashboard,
  LogOut,
  Settings,
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

const ROLE_TITLES: Record<UserRole, string> = {
  BUSINESS: 'Business portal',
  STUDENT: 'Student portal',
  MENTOR: 'Mentor portal',
  ADMIN: 'Admin control',
};

function getSidebarGroups(role: UserRole, userId: string): NavGroup[] {
  if (role === 'BUSINESS') {
    return [
      {
        heading: 'Overview',
        items: [
          { to: '/business', label: 'Analytics overview', icon: LayoutDashboard, end: true },
          { to: '/business/new-audit', label: 'New Data Scan', icon: FilePlus2 },
        ],
      },
      {
        heading: 'Execution',
        items: [
          { to: '/business/pilots', label: 'Pilots and solutions', icon: Handshake },
        ],
      },
      {
        heading: 'Account',
        items: [
          { to: '/profile', label: 'Company profile', icon: Building2 },
          { to: '/settings', label: 'Settings', icon: Settings },
        ],
      },
    ];
  }
  if (role === 'STUDENT') {
    return [
      {
        heading: 'Overview',
        items: [
          { to: '/student', label: 'Builder overview', icon: LayoutDashboard, end: true },
          { to: '/student/challenges', label: 'Challenge marketplace', icon: Compass },
        ],
      },
      {
        heading: 'Proof of work',
        items: [
          { to: '/student/submissions', label: 'My submissions', icon: FolderKanban },
          { to: `/portfolio/${userId}`, label: 'Verified portfolio', icon: Award },
        ],
      },
      {
        heading: 'Account',
        items: [
          { to: '/profile', label: 'College profile', icon: GraduationCap },
          { to: '/settings', label: 'Settings', icon: Settings },
        ],
      },
    ];
  }
  if (role === 'MENTOR') {
    return [
      {
        heading: 'Overview',
        items: [
          { to: '/mentor', label: 'Mentor overview', icon: LayoutDashboard, end: true },
          { to: '/mentor/reviews', label: 'Review queue', icon: ClipboardCheck },
        ],
      },
      {
        heading: 'Reference',
        items: [
          { to: '/student/challenges', label: 'Published briefs', icon: Briefcase },
        ],
      },
      {
        heading: 'Account',
        items: [
          { to: '/profile', label: 'Mentor credentials', icon: UserCircle },
          { to: '/settings', label: 'Settings', icon: Settings },
        ],
      },
    ];
  }
  return [
    {
      heading: 'Telemetry',
      items: [{ to: '/admin', label: 'Platform overview', icon: Activity, end: true }],
    },
    {
      heading: 'Ecosystem control',
      items: [
        { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
        { to: '/admin/students', label: 'Students', icon: GraduationCap },
        { to: '/admin/mentors', label: 'Mentors', icon: Users },
      ],
    },
    {
      heading: 'Database and system',
      items: [
        { to: '/admin/database', label: 'Database explorer', icon: Database },
        { to: '/admin/governance', label: 'Moderation and logs', icon: SlidersHorizontal },
        { to: '/settings', label: 'Settings', icon: Settings },
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

  const handleSignOut = async () => {
    await logout();
    onCloseMobile();
    navigate('/login');
  };

  const content = (
    <div className="flex h-full flex-col bg-vb-surface border-r border-vb-border">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-vb-border shrink-0">
        <Link to="/" className="flex items-center gap-2.5" onClick={onCloseMobile}>
          <span className="w-7 h-7 rounded bg-vb-teal flex items-center justify-center text-white font-display font-bold text-xs">
            VB
          </span>
          <span className="font-display font-bold text-base tracking-tight text-vb-ink">
            Vexa Bridge
          </span>
        </Link>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-vb-muted hover:text-vb-ink rounded"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Context Bar */}
      <div className="px-5 py-2.5 border-b border-vb-border flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-vb-muted">{ROLE_TITLES[user.role]}</span>
        {user.role === 'MENTOR' ? (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              user.is_verified
                ? 'bg-vb-verified-tint text-vb-verified'
                : 'bg-vb-revision-tint text-vb-revision'
            }`}
          >
            {user.is_verified ? 'Verified' : 'Pending'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-vb-verified font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protected</span>
          </span>
        )}
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Sidebar navigation">
        {groups.map((group) => (
          <div key={group.heading}>
            <div className="px-3 mb-1.5 text-[13px] font-medium text-vb-muted">
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
                      `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-vb-teal-tint text-vb-teal font-semibold border border-vb-teal/25'
                          : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas border border-transparent'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Account Footer */}
      <div className="p-4 border-t border-vb-border space-y-3 shrink-0 bg-vb-canvas/40">
        <Link to="/profile" onClick={onCloseMobile} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-vb-surface border border-vb-border flex items-center justify-center text-sm font-display font-bold text-vb-ink shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-vb-ink truncate group-hover:text-vb-teal">
              {user.full_name}
            </div>
            <div className="text-xs text-vb-muted truncate">{user.email}</div>
          </div>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-vb-border bg-vb-surface text-sm font-medium text-vb-ink hover:bg-vb-canvas transition-colors"
        >
          <LogOut className="w-4 h-4 text-vb-muted" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block fixed top-[3px] left-0 bottom-0 w-[248px] z-30">
        {content}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="relative w-[268px] max-w-[85vw] h-full z-50 pt-[3px]">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
