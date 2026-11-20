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

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-vb-canvas text-vb-ink">
        <div className="h-[3px] bg-vb-teal w-full" />
        <header className="h-16 bg-vb-surface border-b border-vb-border px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-base text-vb-ink">
            <span className="w-7 h-7 rounded bg-vb-teal text-white flex items-center justify-center text-xs font-bold">
              VB
            </span>
            <span>Vexa Bridge</span>
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 rounded-md bg-vb-teal text-white text-sm font-medium hover:bg-vb-teal-dark"
          >
            Sign in
          </Link>
        </header>
        <main className="max-w-[1120px] mx-auto px-6 py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vb-canvas text-vb-ink">
      <RoleIdentityStrip role={user.role} />
      <RoleSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="pt-[3px] lg:pl-[256px]">
        <header className="sticky top-[3px] z-20 h-14 bg-vb-surface border-b border-vb-border px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded border border-vb-border text-vb-ink"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-base font-display font-semibold text-vb-ink truncate">
              {title || `${user.role.charAt(0) + user.role.slice(1).toLowerCase()} workspace`}
            </div>
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </header>

        <main className="max-w-[1160px] mx-auto px-6 sm:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
