import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

export const PENDING_FIREBASE_TOKEN_KEY = 'vexa_pending_fb_token';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase Auth is not configured yet. Add VITE_FIREBASE_* keys to frontend/.env.');
  }
  if (!app) {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export async function signInWithGoogleFirebase(): Promise<string> {
  // Firebase only authorizes `localhost` by default (not 127.0.0.1)
  if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
    const localhostUrl = window.location.href.replace('://127.0.0.1', '://localhost');
    throw new Error(
      `Google Sign-In requires localhost (Firebase blocks 127.0.0.1 by default). Open ${localhostUrl} instead.`
    );
  }

  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const cred = await signInWithPopup(auth, provider);
    return await cred.user.getIdToken(true);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Google Sign-In window was closed before completing.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Browser blocked the Google Sign-In popup. Allow popups for localhost and retry.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error(
        `Domain "${window.location.hostname}" is not authorized in Firebase Console → Authentication → Settings → Authorized domains.`
      );
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error(
        'Google Sign-In provider is not enabled yet in Firebase Console → Authentication → Sign-in method → Enable Google.'
      );
    }
    throw new Error((err as Error)?.message || 'Google Sign-In failed.');
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    sessionStorage.removeItem(PENDING_FIREBASE_TOKEN_KEY);
  } catch {
    // ignore
  }
  if (!isFirebaseConfigured || !authInstance) return;
  await fbSignOut(authInstance).catch(() => undefined);
}
