import { useState } from 'react';
import { CheckCircle2, Search, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import type { UserProfile } from '../../types/vexa';

export function UserGovernanceTable({
  users,
  onToggleVerify,
  onToggleActive,
  busyUserId,
}: {
  users: UserProfile[];
  onToggleVerify: (user: UserProfile) => void;
  onToggleActive: (user: UserProfile) => void;
  busyUserId?: string | null;
}) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = query.trim().toLowerCase();
    const matchesQ =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    return matchesRole && matchesQ;
  });

  return (
    <div className="vb-card overflow-hidden">
      <div className="p-4 border-b border-vb-border flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display font-bold text-sm text-vb-ink">
          User &amp; Mentor Verification Directory ({filtered.length})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-vb-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, ID..."
              className="pl-8 pr-3 py-1.5 text-xs rounded border border-vb-border bg-vb-canvas text-vb-ink"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-surface text-vb-ink"
          >
            <option value="ALL">All Roles</option>
            <option value="BUSINESS">BUSINESS</option>
            <option value="STUDENT">STUDENT</option>
            <option value="MENTOR">MENTOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-vb-canvas border-b border-vb-border text-[11px] font-mono uppercase text-vb-muted">
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">Role</th>
              <th className="px-4 py-2.5">Domain Tags</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Governance Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vb-border">
            {filtered.map((u) => {
              const busy = busyUserId === u.id;
              return (
                <tr key={u.id} className="hover:bg-vb-canvas/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-vb-ink">{u.full_name}</div>
                    <div className="font-mono text-[11px] text-vb-muted">
                      {u.email} · {u.id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-vb-canvas border border-vb-border">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.domain_tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-vb-canvas text-vb-muted border border-vb-border">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 space-y-1">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-vb-verified">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-vb-terracotta">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Suspended
                      </span>
                    )}
                    {u.role === 'MENTOR' && (
                      <div
                        className={`text-[10px] font-mono font-semibold ${
                          u.is_verified ? 'text-vb-verified' : 'text-vb-revision'
                        }`}
                      >
                        {u.is_verified ? 'Verified Mentor' : 'Pending Verification'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {u.role === 'MENTOR' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onToggleVerify(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                            u.is_verified
                              ? 'border-vb-border text-vb-muted hover:bg-vb-canvas'
                              : 'border-vb-verified bg-vb-verified text-white hover:bg-emerald-800'
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>{u.is_verified ? 'Revoke Verify' : 'Verify Mentor'}</span>
                        </button>
                      )}
                      {u.role !== 'ADMIN' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border ${
                            u.is_active
                              ? 'border-vb-terracotta/40 text-vb-terracotta hover:bg-vb-terracotta-tint'
                              : 'border-vb-teal text-vb-teal hover:bg-vb-teal-tint'
                          }`}
                        >
                          <UserX className="w-3 h-3" />
                          <span>{u.is_active ? 'Suspend' : 'Activate'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
