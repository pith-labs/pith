import { supabase } from './supabase';

export interface Session {
  accessToken: string;
  userId: string;
  email: string;
  tier: 'free' | 'pro';
}

const SESSION_KEY = 'pith_session';

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Session; } catch { return null; }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function signUp(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Confirme seu email para ativar a conta.');

  const session: Session = {
    accessToken: data.session.access_token,
    userId: data.user!.id,
    email: data.user!.email ?? email,
    tier: 'free',
  };
  saveSession(session);
  return session;
}

export async function login(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const session: Session = {
    accessToken: data.session.access_token,
    userId: data.user.id,
    email: data.user.email ?? email,
    tier: 'free',
  };
  saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  clearSession();
}
