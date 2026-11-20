import type { UserRole } from '../types/vexa';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

export class VexaApiError extends Error {
  constructor(
    public status: number,
    public errorCode: string,
    message: string,
    public details: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { userId?: string; role?: UserRole } = {}
): Promise<T> {
  const { userId, role, headers, ...rest } = options;
  const authHeaders: Record<string, string> = {};
  if (userId) authHeaders['X-Vexa-User-Id'] = userId;
  if (role) authHeaders['X-Vexa-Role'] = role;

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...authHeaders,
      ...(rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new VexaApiError(
      res.status,
      err?.detail?.error_code || err?.error_code || 'UNKNOWN_ERROR',
      err?.detail?.message || err?.message || res.statusText,
      err?.detail?.details || err?.details || {}
    );
  }
  return res.json() as Promise<T>;
}

export async function apiDownload(
  path: string,
  filename: string,
  auth: { userId: string; role: UserRole }
): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'X-Vexa-User-Id': auth.userId,
      'X-Vexa-Role': auth.role,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new VexaApiError(
      res.status,
      err?.detail?.error_code || err?.error_code || 'DOWNLOAD_ERROR',
      err?.detail?.message || err?.message || 'File download failed'
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
