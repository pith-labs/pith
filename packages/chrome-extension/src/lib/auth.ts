import { supabase } from './supabase.js';

export interface Session {
  accessToken: string;
  userId: string;
  email: string;
  tier: 'free' | 'pro';
}

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
  await saveSession(session);
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
  await saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  await clearSession();
}
