export function DatasetPreviewTable({
  columns,
  rows,
}: {
  columns: { name: string; type: string }[];
  rows: Record<string, string>[];
}) {
  if (!columns.length) return null;

  return (
    <div className="border border-vb-border rounded overflow-x-auto bg-vb-surface">
      <table className="w-full text-left border-collapse font-mono text-[11px]">
        <thead>
          <tr className="bg-vb-canvas border-b border-vb-border">
            {columns.map((col, idx) => (
              <th
                key={col.name}
                className={`px-2.5 py-2 font-semibold text-vb-ink whitespace-nowrap ${
                  idx === 0 ? 'sticky left-0 bg-vb-canvas border-r border-vb-border' : ''
                }`}
              >
                <div>{col.name}</div>
                <div className="text-[9px] font-normal text-vb-muted uppercase">{col.type}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-vb-border">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-vb-canvas/50">
              {columns.map((col, cIdx) => {
                const val = row[col.name] || '—';
                const isRedacted = val.startsWith('[REDACTED') || val.startsWith('CUST_');
                return (
                  <td
                    key={col.name}
                    className={`px-2.5 py-1.5 whitespace-nowrap ${
                      cIdx === 0 ? 'sticky left-0 bg-vb-surface border-r border-vb-border font-medium' : ''
                    } ${isRedacted ? 'text-vb-verified font-semibold' : 'text-vb-ink'}`}
                  >
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
