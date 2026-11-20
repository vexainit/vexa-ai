import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Building2, ClipboardCheck, GraduationCap, Loader2, SlidersHorizontal } from 'lucide-react';
import { ROLE_DEFAULT_ROUTE, useRole } from '../context/RoleContext';
import { apiFetch } from '../lib/api';
import { isFirebaseConfigured, PENDING_FIREBASE_TOKEN_KEY, signInWithGoogleFirebase } from '../lib/firebase';
import type { UserProfile, UserRole } from '../types/vexa';

const PORTALS: {
  role: UserRole;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { role: 'BUSINESS', label: 'Business', subtitle: 'Operational diagnostics & pilot handoffs', icon: Building2 },
  { role: 'STUDENT', label: 'Student', subtitle: 'PII-safe challenges & Proof-of-Work', icon: GraduationCap },
  { role: 'MENTOR', label: 'Mentor', subtitle: 'AI pre-audit queue & 3-point verification', icon: ClipboardCheck },
  { role: 'ADMIN', label: 'Admin', subtitle: 'Ecosystem governance & live database', icon: SlidersHorizontal },
];

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role')?.toUpperCase() as UserRole) || 'BUSINESS';
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    ['BUSINESS', 'STUDENT', 'MENTOR', 'ADMIN'].includes(initialRole) ? initialRole : 'BUSINESS'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { setAuthSession } = useRole();
  const navigate = useNavigate();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ access_token: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        token: null,
        body: JSON.stringify({
          email: email.trim(),
          password,
          expected_role: selectedRole,
        }),
      });
      setAuthSession(res.access_token, res.user);
      navigate(ROLE_DEFAULT_ROUTE[res.user.role]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleFirebaseLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      const idToken = await signInWithGoogleFirebase();
      const res = await apiFetch<{
        needs_registration: boolean;
        access_token?: string;
        user?: UserProfile;
        email?: string;
        full_name?: string;
      }>('/auth/firebase', {
        method: 'POST',
        token: null,
        body: JSON.stringify({ id_token: idToken }),
      });

      if (res.needs_registration) {
        sessionStorage.setItem(PENDING_FIREBASE_TOKEN_KEY, idToken);
        navigate(
          `/register?role=${selectedRole === 'ADMIN' ? 'BUSINESS' : selectedRole}&email=${encodeURIComponent(
            res.email || ''
          )}&name=${encodeURIComponent(res.full_name || '')}&google=1`
        );
        return;
      }
      if (res.access_token && res.user) {
        setAuthSession(res.access_token, res.user);
        navigate(ROLE_DEFAULT_ROUTE[res.user.role]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const activePortal = PORTALS.find((p) => p.role === selectedRole)!;

  return (
    <div className="min-h-screen bg-vb-canvas flex flex-col">
      <div className="h-[3px] bg-vb-teal w-full" />

      <header className="h-14 px-6 flex items-center justify-between border-b border-vb-border bg-vb-surface">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-sm text-vb-ink">
          <span className="w-6 h-6 rounded bg-vb-teal text-white flex items-center justify-center text-[11px] font-extrabold">
            VB
          </span>
          <span>Vexa Bridge</span>
        </Link>
        <Link to="/register" className="text-xs font-semibold text-vb-teal hover:underline">
          Need an account? Register →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] space-y-6">
          <div className="text-center space-y-1">
            <h1 className="font-display font-extrabold text-2xl text-vb-ink">Sign in to Vexa Bridge</h1>
            <p className="text-xs text-vb-muted">Select your portal to enter your role workspace.</p>
          </div>

          {/* 4-Portal Selector Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded border border-vb-border bg-vb-surface">
            {PORTALS.map((p) => {
              const Icon = p.icon;
              const active = selectedRole === p.role;
              return (
                <button
                  key={p.role}
                  type="button"
                  onClick={() => {
                    setSelectedRole(p.role);
                    setError('');
                  }}
                  className={`flex flex-col items-center gap-1 py-2 px-1 rounded text-[11px] font-semibold transition-colors ${
                    active ? 'bg-vb-teal text-white' : 'text-vb-muted hover:text-vb-ink hover:bg-vb-canvas'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="vb-card p-6 space-y-5">
            <div>
              <div className="text-sm font-display font-bold text-vb-ink">{activePortal.label} Portal</div>
              <div className="text-xs text-vb-muted">{activePortal.subtitle}</div>
            </div>

            {error && (
              <div className="p-3 rounded bg-vb-terracotta-tint border border-vb-terracotta/35 text-xs text-vb-terracotta flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Firebase Auth Button */}
            {selectedRole !== 'ADMIN' && (
              <>
                <button
                  type="button"
                  disabled={submitting || !isFirebaseConfigured}
                  onClick={handleGoogleFirebaseLogin}
                  className="w-full py-2.5 px-4 rounded border border-vb-border bg-vb-surface hover:bg-vb-canvas text-xs font-semibold text-vb-ink flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="font-mono font-bold text-vb-teal">G</span>
                  <span>
                    {isFirebaseConfigured
                      ? 'Continue with Google (Firebase Auth)'
                      : 'Google Sign-In (Add VITE_FIREBASE_* keys to enable)'}
                  </span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-vb-border w-full" />
                  <span className="bg-vb-surface px-2.5 text-[10px] font-mono uppercase text-vb-muted">
                    or email
                  </span>
                </div>
              </>
            )}

            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="vb-label block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'ADMIN' ? 'admin@vexabridge.in' : 'you@organization.in'}
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                  required
                />
              </div>

              <div>
                <label className="vb-label block mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm rounded border border-vb-border bg-vb-surface"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sign In to {activePortal.label} Portal</span>
              </button>
            </form>

            {selectedRole !== 'ADMIN' && (
              <div className="pt-3 border-t border-vb-border text-center text-xs text-vb-muted">
                New {activePortal.label.toLowerCase()} account?{' '}
                <Link
                  to={`/register?role=${selectedRole}`}
                  className="text-vb-teal font-semibold hover:underline"
                >
                  Register with verification credentials
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
