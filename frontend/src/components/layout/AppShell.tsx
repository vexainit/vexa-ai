import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { RoleIdentityStrip } from './RoleIdentityStrip';
import { RoleSidebar } from './RoleSidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-vb-canvas text-vb-ink">
      <RoleIdentityStrip role={session.role} />
      <RoleSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Mobile Top Bar (<1024px) */}
      <header className="lg:hidden sticky top-[3px] z-20 flex items-center justify-between px-4 h-12 bg-vb-surface border-b border-vb-border">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded border border-vb-border text-vb-ink"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="font-display font-bold text-sm tracking-tight">VEXA BRIDGE</span>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-vb-canvas border border-vb-border">
          {session.role}
        </span>
      </header>

      {/* Main Content Workspace */}
      <main className="pt-[3px] lg:pl-[216px] xl:pl-[240px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
