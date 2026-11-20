import { useState } from 'react';
import { formatRelativeAge } from '../../lib/formatters';
import type { AuditLogEntry } from '../../types/vexa';

export function AuditLogTable({ logs }: { logs: AuditLogEntry[] }) {
  const [actionFilter, setActionFilter] = useState('ALL');
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action_type)));

  const filtered =
    actionFilter === 'ALL' ? logs : logs.filter((l) => l.action_type === actionFilter);

  return (
    <div className="vb-card overflow-hidden">
      <div className="p-4 border-b border-vb-border flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-sm text-vb-ink">
            Immutable Compliance Audit Trail ({filtered.length})
          </h3>
          <p className="text-[11px] text-vb-muted">
            Append-only `system_audit_logs` ledger capturing every privileged and cross-role state change.
          </p>
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-2.5 py-1.5 text-xs rounded border border-vb-border bg-vb-surface text-vb-ink font-mono"
        >
          <option value="ALL">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-vb-canvas border-b border-vb-border font-mono text-[11px] uppercase text-vb-muted">
              <th className="px-4 py-2.5">Timestamp</th>
              <th className="px-4 py-2.5">Actor</th>
              <th className="px-4 py-2.5">Action</th>
              <th className="px-4 py-2.5">Target Entity</th>
              <th className="px-4 py-2.5">Metadata Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vb-border">
            {filtered.map((entry) => (
              <tr key={entry.id} className="hover:bg-vb-canvas/40">
                <td className="px-4 py-2.5 font-mono text-[11px] text-vb-muted whitespace-nowrap">
                  {formatRelativeAge(entry.created_at)}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="font-semibold text-vb-ink">{entry.actor_name}</span>{' '}
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-muted">
                    {entry.actor_role}
                  </span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-vb-teal-tint text-vb-teal">
                    {entry.action_type}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-vb-ink whitespace-nowrap">
                  {entry.target_entity_id}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-vb-muted max-w-xs truncate">
                  {JSON.stringify(entry.metadata)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
