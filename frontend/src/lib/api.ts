const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
export const AUTH_TOKEN_KEY = 'vexa_bridge_jwt_token_v2';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

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
  options: RequestInit & { token?: string | null; userId?: string; role?: string } = {}
): Promise<T> {
  const { token, userId: _u, role: _r, headers, ...rest } = options;
  const activeToken = token !== undefined ? token : getStoredToken();
  const authHeaders: Record<string, string> = {};
  if (activeToken) {
    authHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

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
  _auth?: { userId?: string; role?: string }
): Promise<void> {
  const activeToken = getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
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
