import { supabase } from './supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export interface Session {
  accessToken: string;
  userId: string;
  email: string;
  tier: 'free' | 'pro';
}

// ── Persist / load session via chrome.storage ─────────────────────────────────

export async function saveSession(session: Session): Promise<void> {
  await chrome.storage.local.set({ pithSession: session });
}

export async function loadSession(): Promise<Session | null> {
  const result = await chrome.storage.local.get('pithSession');
  return result.pithSession ?? null;
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove('pithSession');
}

// ── Google OAuth via chrome.identity ─────────────────────────────────────────
// chrome.identity.launchWebAuthFlow opens a secure browser window and handles
// the redirect without exposing tokens to arbitrary web pages.

export async function loginWithGoogle(): Promise<Session> {
  const redirectUrl = chrome.identity.getRedirectURL(); // e.g. https://<id>.chromiumapp.org/

  const authUrl =
    `${SUPABASE_URL}/auth/v1/authorize` +
    `?provider=google` +
    `&redirect_to=${encodeURIComponent(redirectUrl)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      async (responseUrl) => {
        if (chrome.runtime.lastError || !responseUrl) {
          return reject(new Error(chrome.runtime.lastError?.message ?? 'Auth cancelled'));
        }

        // Supabase puts the tokens in the URL hash: #access_token=...&...
        const hash = new URL(responseUrl).hash.slice(1);
        const params = new URLSearchParams(hash);
        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken) return reject(new Error('No access token in redirect'));

        // Set session so supabase.auth.getUser works
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken ?? '' });
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);

        if (error || !user) return reject(new Error('Failed to get user'));

        const session: Session = {
          accessToken,
          userId: user.id,
          email:  user.email ?? '',
          tier:   'free', // will be updated after sync
        };

        await saveSession(session);
        resolve(session);
      }
    );
  });
}

export async function logout(): Promise<void> {
  await clearSession();
}
