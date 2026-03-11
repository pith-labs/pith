import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { login as doLogin, signUp as doSignUp, logout as doLogout, loadSession, type Session } from './auth';
import { api, type BackendStats, type UserProfile } from './api';

interface AuthContextValue {
  session: Session | null;
  stats: BackendStats | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<BackendStats | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (s: Session) => {
    const [backendStats, userProfile] = await Promise.all([
      api.stats(s.accessToken).catch(() => null),
      api.user(s.accessToken).catch(() => null),
    ]);
    if (backendStats) setStats(backendStats);
    if (userProfile) {
      setProfile(userProfile);
      setSession(prev => prev ? { ...prev, tier: userProfile.tier } : prev);
    }
  };

  useEffect(() => {
    const s = loadSession();
    if (s) {
      setSession(s);
      fetchData(s).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const s = await doLogin(email, password);
    setSession(s);
    await fetchData(s);
  };

  const signUp = async (email: string, password: string) => {
    const s = await doSignUp(email, password);
    setSession(s);
    await fetchData(s);
  };

  const logout = async () => {
    await doLogout();
    setSession(null);
    setStats(null);
    setProfile(null);
  };

  const refresh = async () => {
    if (session) await fetchData(session);
  };

  return (
    <AuthContext.Provider value={{ session, stats, profile, loading, login, signUp, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
