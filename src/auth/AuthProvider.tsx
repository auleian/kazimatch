import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type AuthProvider as FbProvider,
} from 'firebase/auth';
import { auth, firebaseEnabled } from '../data/firebase';

export type ProviderId = 'google' | 'microsoft' | 'github';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  provider: string;
  isGuest: boolean;
}

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  mode: 'firebase' | 'local';
  signInWith(p: ProviderId): Promise<void>;
  signInEmail(email: string, password: string): Promise<void>;
  signUpEmail(name: string, email: string, password: string): Promise<void>;
  signInGuest(name?: string): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export const PROVIDER_LABEL: Record<string, string> = {
  'google.com': 'Google',
  'microsoft.com': 'Microsoft',
  'github.com': 'GitHub',
  password: 'Email',
  anonymous: 'Guest',
  google: 'Google',
  microsoft: 'Microsoft',
  github: 'GitHub',
  local: 'Demo',
};

function makeProvider(p: ProviderId): FbProvider {
  if (p === 'google') {
    const g = new GoogleAuthProvider();
    g.setCustomParameters({ prompt: 'select_account' });
    return g;
  }
  if (p === 'github') {
    const gh = new GithubAuthProvider();
    gh.addScope('read:user');
    return gh;
  }
  const ms = new OAuthProvider('microsoft.com');
  ms.setCustomParameters({ prompt: 'select_account' });
  return ms;
}

/** Turn Firebase auth error codes into something a person can act on. */
export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/operation-not-allowed': 'This sign-in method is not enabled yet. Enable it in Firebase console → Authentication → Sign-in method.',
    'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
    'auth/cancelled-popup-request': 'Another sign-in window is already open.',
    'auth/popup-blocked': 'Your browser blocked the sign-in pop-up. Allow pop-ups for this site and try again.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method. Sign in with that method instead.',
    'auth/unauthorized-domain': 'This domain is not authorised for sign-in. Add it in Firebase console → Authentication → Settings → Authorised domains.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account with that email. Create one instead.',
    'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Sign-in failed. Please try again.');
}

const LOCAL_KEY = 'kazimatch:localUser';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (firebaseEnabled && auth) {
      return onAuthStateChanged(auth, (u) => {
        setUser(
          u
            ? {
                uid: u.uid,
                displayName: u.displayName || u.email?.split('@')[0] || (u.isAnonymous ? 'Guest' : 'User'),
                email: u.email,
                photoURL: u.photoURL,
                provider: u.providerData[0]?.providerId ?? (u.isAnonymous ? 'anonymous' : 'password'),
                isGuest: u.isAnonymous,
              }
            : null,
        );
        setLoading(false);
      });
    }
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const localSignIn = (name: string, email: string | null, provider: string) => {
      // Simulated sign-in for local demo mode: one stable uid per email/provider.
      const id = `local-${(email ?? name).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const u: AppUser = { uid: id, displayName: name, email, photoURL: null, provider, isGuest: provider === 'anonymous' };
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(u));
      } catch {
        /* ignore */
      }
      setUser(u);
    };

    return {
      user,
      loading,
      mode: firebaseEnabled ? 'firebase' : 'local',
      async signInWith(p) {
        if (firebaseEnabled && auth) {
          await signInWithPopup(auth, makeProvider(p));
        } else {
          localSignIn(`Demo ${PROVIDER_LABEL[p]} user`, `demo.${p}@example.com`, p);
        }
      },
      async signInEmail(email, password) {
        if (firebaseEnabled && auth) await signInWithEmailAndPassword(auth, email, password);
        else localSignIn(email.split('@')[0], email, 'password');
      },
      async signUpEmail(name, email, password) {
        if (firebaseEnabled && auth) {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(cred.user, { displayName: name });
          setUser((prev) => (prev ? { ...prev, displayName: name } : prev));
        } else localSignIn(name, email, 'password');
      },
      async signInGuest(name = 'Guest') {
        if (firebaseEnabled && auth) await signInAnonymously(auth);
        else localSignIn(name, null, 'anonymous');
      },
      async signOut() {
        if (firebaseEnabled && auth) await fbSignOut(auth);
        try {
          localStorage.removeItem(LOCAL_KEY);
        } catch {
          /* ignore */
        }
        setUser(null);
      },
    };
  }, [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
