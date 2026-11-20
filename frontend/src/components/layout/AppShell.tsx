import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { RoleIdentityStrip } from './RoleIdentityStrip';
import { RoleSidebar } from './RoleSidebar';

export function AppShell({
  children,
  title,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}) {
  const { user, isAuthenticated } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Public read-only pages (like /portfolio/:id when logged out)
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-vb-canvas text-vb-ink">
        <div className="h-[3px] bg-vb-teal w-full" />
        <header className="h-14 bg-vb-surface border-b border-vb-border px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-sm text-vb-ink">
            <span className="w-6 h-6 rounded bg-vb-teal text-white flex items-center justify-center text-[11px] font-extrabold">
              VB
            </span>
            <span>Vexa Bridge</span>
          </Link>
          <Link
            to="/login"
            className="px-3.5 py-1.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark"
          >
            Sign In
          </Link>
        </header>
        <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vb-canvas text-vb-ink">
      <RoleIdentityStrip role={user.role} />
      <RoleSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Slim Sticky Context Topbar (52px) */}
      <div className="pt-[3px] lg:pl-[240px]">
        <header className="sticky top-[3px] z-20 h-[52px] bg-vb-surface/95 border-b border-vb-border px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded border border-vb-border text-vb-ink"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-sm font-display font-semibold text-vb-ink truncate">
              {title || `${user.role.charAt(0) + user.role.slice(1).toLowerCase()} Workspace`}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>

        {/* Main Workspace Canvas */}
        <main className="max-w-[1160px] mx-auto px-4 sm:px-8 py-7">{children}</main>
      </div>
    </div>
  );
}
