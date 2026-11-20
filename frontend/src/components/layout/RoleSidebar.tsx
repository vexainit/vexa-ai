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
  BUSINESS: 'Business workspace',
  STUDENT: 'Student workspace',
  MENTOR: 'Mentor workspace',
  ADMIN: 'Admin control',
};

function getSidebarGroups(role: UserRole, userId: string): NavGroup[] {
  if (role === 'BUSINESS') {
    return [
      {
        heading: 'Operations',
        items: [
          { to: '/business', label: 'Diagnostic audits', icon: LayoutDashboard, end: true },
          { to: '/business/new-audit', label: 'New audit', icon: FilePlus2 },
        ],
      },
      {
        heading: 'Organization',
        items: [{ to: '/profile', label: 'Company profile', icon: Building2 }],
      },
    ];
  }
  if (role === 'STUDENT') {
    return [
      {
        heading: 'Marketplace',
        items: [{ to: '/student/challenges', label: 'Open challenges', icon: Compass }],
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
        items: [{ to: '/profile', label: 'College profile', icon: GraduationCap }],
      },
    ];
  }
  if (role === 'MENTOR') {
    return [
      {
        heading: 'Verification',
        items: [
          { to: '/mentor/reviews', label: 'Review queue', icon: ClipboardCheck },
          { to: '/student/challenges', label: 'Published briefs', icon: Briefcase },
        ],
      },
      {
        heading: 'Account',
        items: [{ to: '/profile', label: 'Mentor credentials', icon: UserCircle }],
      },
    ];
  }
  return [
    {
      heading: 'Overview',
      items: [{ to: '/admin', label: 'Platform telemetry', icon: Activity, end: true }],
    },
    {
      heading: 'Accounts',
      items: [
        { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
        { to: '/admin/students', label: 'Students', icon: GraduationCap },
        { to: '/admin/mentors', label: 'Mentors', icon: Users },
      ],
    },
    {
      heading: 'System',
      items: [
        { to: '/admin/database', label: 'Database explorer', icon: Database },
        { to: '/admin/governance', label: 'Moderation and logs', icon: SlidersHorizontal },
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
      <div className="h-14 px-5 flex items-center justify-between border-b border-vb-border">
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

      {/* Role Context */}
      <div className="px-5 py-3 border-b border-vb-border flex items-center justify-between">
        <span className="text-sm font-medium text-vb-muted">{ROLE_TITLES[user.role]}</span>
        {user.role === 'MENTOR' && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              user.is_verified
                ? 'bg-vb-verified-tint text-vb-verified'
                : 'bg-vb-revision-tint text-vb-revision'
            }`}
          >
            {user.is_verified ? 'Verified' : 'Pending'}
          </span>
        )}
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto" aria-label="Sidebar navigation">
        {groups.map((group) => (
          <div key={group.heading}>
            <div className="px-3 mb-2 text-[13px] font-medium text-vb-muted">
              {group.heading}
            </div>
            <div className="space-y-1">
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
                          ? 'bg-vb-canvas text-vb-ink font-semibold border border-vb-border'
                          : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas/70 border border-transparent'
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
      <div className="p-4 border-t border-vb-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-vb-canvas border border-vb-border flex items-center justify-center text-sm font-display font-bold text-vb-ink shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-vb-ink truncate">{user.full_name}</div>
            <div className="text-xs text-vb-muted truncate">{user.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md border border-vb-border text-sm font-medium text-vb-ink hover:bg-vb-canvas transition-colors"
        >
          <LogOut className="w-4 h-4 text-vb-muted" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block fixed top-[3px] left-0 bottom-0 w-[256px] z-30">
        {content}
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-vb-ink/35" onClick={onCloseMobile} />
          <aside className="relative w-[272px] max-w-[85vw] h-full z-50 pt-[3px]">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
