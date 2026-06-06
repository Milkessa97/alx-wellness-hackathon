import React, { createContext, useContext, useState, useEffect } from 'react';

// ──────────────────────────────────────────────────────────────────────────
// Real authentication shim.
//
// This file is aliased to `next-auth` / `next-auth/react` (see vite.config.ts
// and tsconfig paths) so the rest of the app can keep importing the familiar
// NextAuth surface (`useSession`, `signIn`, `signOut`, `SessionProvider`).
//
// Under the hood this is NOT NextAuth: the app is a Vite SPA, so there is no
// Next.js server to mint tokens. Instead we use Google Identity Services (GIS)
// in the browser to obtain a Google credential, then exchange it at the backend
// (`POST /api/auth/google`), which verifies it and returns an HS256 app-JWT.
// That JWT is what every protected API call sends as `Authorization: Bearer`.
// ──────────────────────────────────────────────────────────────────────────

export interface User {
  name: string;
  email: string;
  image?: string;
  role?: string;
  tier?: string;
}

export interface Session {
  user: User;
  expires: string;
  token?: string;
}

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading';

interface AuthContextType {
  session: Session | null;
  status: AuthStatus;
  signIn: (provider?: string, options?: any) => Promise<boolean>;
  signOut: (options?: any) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_SESSION_KEY = 'maedot_auth_session';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID: string =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

// ──────────────────────────────────────────────────────────────────────────
// Module-level GIS bootstrap + session broadcast
//
// The GIS credential callback fires outside of React, and `signIn` may be
// called from module scope (e.g. a 401 retry), so the source of truth lives at
// module level. React `SessionProvider`s subscribe via `listeners`.
// ──────────────────────────────────────────────────────────────────────────

type SessionListener = (s: Session | null) => void;
const listeners = new Set<SessionListener>();

// Module-level source of truth for the current session, so non-React callers
// (e.g. `getSession()` used by the API wrapper) can read it without a hook.
let currentSession: Session | null = null;

function persistAndBroadcast(session: Session | null) {
  currentSession = session;
  try {
    if (session) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  } catch {
    /* localStorage may be unavailable (private mode) — broadcast regardless */
  }
  listeners.forEach((l) => l(session));
}

function isExpired(session: Session | null): boolean {
  if (!session?.expires) return false;
  const ts = Date.parse(session.expires);
  return !Number.isNaN(ts) && ts <= Date.now();
}

function loadStoredSession(): Session | null {
  try {
    const saved = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Session;
    if (isExpired(parsed)) {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

let gisScriptPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${GIS_SRC}"]`
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Identity Services'))
      );
      if ((window as any).google?.accounts?.id) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

let gisInitialized = false;

async function ensureGisInitialized(): Promise<void> {
  await loadGisScript();
  const google = (window as any).google;
  if (!google?.accounts?.id) {
    throw new Error('Google Identity Services is unavailable.');
  }
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not configured.');
  }
  if (!gisInitialized) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    gisInitialized = true;
  }
}

// Called by GIS (One Tap or rendered button) with a Google credential (ID token).
async function handleCredentialResponse(response: { credential: string }) {
  try {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential }),
    });

    if (!res.ok) {
      console.error('Google sign-in exchange failed:', res.status);
      persistAndBroadcast(null);
      return;
    }

    const data = await res.json(); // { token, user: { email, name, image }, expires }
    const session: Session = {
      user: {
        name: data.user?.name ?? '',
        email: data.user?.email ?? '',
        image: data.user?.image ?? undefined,
        role: 'Patient',
      },
      token: data.token,
      expires: data.expires,
    };
    persistAndBroadcast(session);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('navigationchange'));
    }
  } catch (e) {
    console.error('Google sign-in exchange error:', e);
    persistAndBroadcast(null);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// React surface (NextAuth-compatible)
// ──────────────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    const stored = loadStoredSession();
    setSession(stored);
    setStatus(stored ? 'authenticated' : 'unauthenticated');

    const listener: SessionListener = (s) => {
      setSession(s);
      setStatus(s ? 'authenticated' : 'unauthenticated');
    };
    listeners.add(listener);

    // Warm up GIS in the background so the first sign-in click is instant.
    ensureGisInitialized().catch(() => {
      /* surfaced again when the user actually attempts to sign in */
    });

    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Fetch subscription tier from backend when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.token) {
      const fetchSubscriptionStatus = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/stripe/subscription-status`, {
            headers: {
              'Authorization': `Bearer ${session.token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            const tier = data.tier || 'free';
            localStorage.setItem('maedot_user_tier', tier);
            
            // Also update the session user tier
            setSession((prev) => {
              if (!prev) return null;
              if (prev.user.tier === tier) return prev;
              const updated = {
                ...prev,
                user: {
                  ...prev.user,
                  tier: tier,
                },
              };
              try {
                localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(updated));
              } catch {}
              return updated;
            });
          }
        } catch (e) {
          console.error('Failed to fetch subscription status:', e);
        }
      };
      fetchSubscriptionStatus();
    } else if (status === 'unauthenticated') {
      try {
        localStorage.removeItem('maedot_user_tier');
      } catch {}
    }
  }, [status, session?.token]);

  const value: AuthContextType = {
    session,
    status,
    signIn: (provider?: string, options?: any) => signIn(provider, options),
    signOut: (options?: any) => signOut(options),
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

// NextAuth-compatible hook: returns { data, status }.
export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    return { data: null, status: 'unauthenticated' as AuthStatus };
  }
  return {
    data: context.session,
    status: context.status,
  };
}

// NextAuth-compatible, non-hook session accessor. Returns the current session
// (or null) without requiring React context — usable from plain modules such as
// the `apiFetch` wrapper. Falls back to the persisted session on cold start
// (e.g. first call after a full page reload, before SessionProvider mounts).
export async function getSession(): Promise<Session | null> {
  if (currentSession) {
    return isExpired(currentSession) ? null : currentSession;
  }
  const stored = loadStoredSession();
  currentSession = stored;
  return stored;
}

// Programmatic sign-in: triggers the Google One Tap / prompt flow.
// For a guaranteed-clickable entry point, prefer `renderGoogleButton`.
export async function signIn(
  _provider: string = 'google',
  _options?: any
): Promise<boolean> {
  try {
    await ensureGisInitialized();
    const google = (window as any).google;
    google.accounts.id.prompt();
    return true;
  } catch (e) {
    console.error('signIn failed:', e);
    return false;
  }
}

// Renders the official Google button into `element`. The credential it produces
// flows through the same `handleCredentialResponse` exchange as One Tap.
export async function renderGoogleButton(
  element: HTMLElement,
  options?: Record<string, any>
): Promise<void> {
  await ensureGisInitialized();
  const google = (window as any).google;
  google.accounts.id.renderButton(element, {
    type: 'standard',
    theme: 'outline',
    size: 'medium',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'left',
    ...options,
  });
}

export async function signOut(_options?: any): Promise<boolean> {
  try {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
  } catch {
    /* ignore — GIS may not be loaded */
  }
  persistAndBroadcast(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('navigationchange'));
  }
  return true;
}

// Default export keeps `import NextAuth from 'next-auth/react'` working.
export function NextAuth(_options?: any): any {
  return () => {};
}

NextAuth.useSession = useSession;
NextAuth.getSession = getSession;
NextAuth.signIn = signIn;
NextAuth.signOut = signOut;
NextAuth.SessionProvider = SessionProvider;

export default NextAuth;
