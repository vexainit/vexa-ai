import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, Download, RefreshCw, Search } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { apiFetch } from '../../lib/api';
import { triggerTextDownload } from '../../lib/ticketExport';
import type { DatabaseTableResponse } from '../../types/vexa';

const TABLES = [
  { id: 'users', label: 'users' },
  { id: 'diagnostic_cases', label: 'diagnostic_cases' },
  { id: 'builder_submissions', label: 'builder_submissions' },
  { id: 'system_audit_logs', label: 'system_audit_logs' },
] as const;

export function AdminDatabasePage() {
  const [table, setTable] = useState<(typeof TABLES)[number]['id']>('users');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'database', table],
    queryFn: () => apiFetch<DatabaseTableResponse>(`/admin/database/${table}?limit=200`),
  });

  const rows = (data?.rows ?? []).filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q));
  });

  return (
    <AppShell
      title="Admin · Live Database Explorer"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-vb-border bg-vb-surface text-xs font-semibold hover:border-vb-teal"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={() =>
              data &&
              triggerTextDownload(
                `vexa_${data.table}.json`,
                JSON.stringify(data.rows, null, 2),
                'application/json'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {TABLES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTable(t.id);
                  setSearch('');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                  table === t.id
                    ? 'bg-vb-ink text-white font-semibold'
                    : 'bg-vb-surface border border-vb-border text-vb-muted hover:text-vb-ink'
                }`}
              >
                <Database className="w-3 h-3" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-vb-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter rows..."
                className="pl-8 pr-3 py-1.5 text-xs rounded border border-vb-border bg-vb-surface"
              />
            </div>
            <span className="tabular-num font-mono text-xs text-vb-muted">
              {rows.length} / {data?.total_rows ?? 0} rows
            </span>
          </div>
        </div>

        <div className="vb-card overflow-hidden">
          {isLoading ? (
            <div className="p-8 h-48 animate-pulse" />
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-xs text-vb-muted">
              No records in <span className="font-mono">{table}</span> yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="bg-vb-canvas border-b border-vb-border text-vb-muted">
                    {(data?.columns ?? []).map((col) => (
                      <th key={col} className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-vb-border">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-vb-canvas/50">
                      {(data?.columns ?? []).map((col) => (
                        <td
                          key={col}
                          className="px-3.5 py-2 text-vb-ink whitespace-nowrap max-w-[280px] truncate"
                          title={String(row[col] ?? '')}
                        >
                          {typeof row[col] === 'boolean'
                            ? row[col]
                              ? 'true'
                              : 'false'
                            : String(row[col] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
