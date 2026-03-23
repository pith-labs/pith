export const API_URL = import.meta.env.VITE_API_URL as string; // https://pith-api.onrender.com

async function request<T>(path: string, token: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface BackendStats {
  totalTokensSaved:    number;
  totalCompressions:   number;
  avgNoiseRemoved:     number;
  dollarsSaved:        number;
  monthlyCompressions: number;
  monthlyTokensSaved:  number;
}

export interface UserProfile {
  id:          string;
  tier:        'free' | 'pro';
  hasApiKey:   boolean;
  apiKeyName:  string | null;
}

export const api = {
  stats:     (token: string) => request<BackendStats>('/v1/stats', token),
  user:      (token: string) => request<UserProfile>('/v1/user', token),
  createApiKey: (token: string) =>
    request<{ key: string }>('/v1/user/api-key', token, { method: 'POST' }),
  syncLocal: (token: string, tokensSaved: number) =>
    request<{ synced: boolean }>('/v1/user/sync', token, {
      method: 'PATCH',
      body: JSON.stringify({ tokensSaved }),
    }),
};
