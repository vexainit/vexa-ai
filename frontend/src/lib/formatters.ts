export function formatINR(amount: number | undefined | null): string {
  const n = Math.round(amount ?? 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

export function formatINRLong(amount: number | undefined | null): string {
  const n = Math.round(amount ?? 0);
  return `INR ${n.toLocaleString('en-IN')}`;
}

export function formatRelativeAge(isoDate: string | undefined): string {
  if (!isoDate) return 'Just now';
  const dt = new Date(isoDate);
  const diffMs = Date.now() - dt.getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatShortDate(isoDate: string | undefined): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function healthScoreTone(score: number): {
  text: string;
  bg: string;
  label: string;
} {
  if (score >= 75) return { text: 'text-vb-verified', bg: 'bg-vb-verified-tint', label: 'Healthy' };
  if (score >= 55) return { text: 'text-vb-revision', bg: 'bg-vb-revision-tint', label: 'Moderate Risk' };
  return { text: 'text-vb-terracotta', bg: 'bg-vb-terracotta-tint', label: 'Critical Leak' };
}

export function fitScoreTone(score: number): {
  text: string;
  bg: string;
  border: string;
} {
  if (score >= 80) return { text: 'text-vb-verified', bg: 'bg-vb-verified-tint', border: 'border-vb-verified/30' };
  if (score >= 60) return { text: 'text-vb-revision', bg: 'bg-vb-revision-tint', border: 'border-vb-revision/30' };
  return { text: 'text-vb-terracotta', bg: 'bg-vb-terracotta-tint', border: 'border-vb-terracotta/30' };
}
