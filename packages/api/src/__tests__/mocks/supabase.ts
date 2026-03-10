import { vi } from 'vitest';

// ── Defaults (overrideable per test) ──────────────────────────────────────────

export const mockProfile   = { tier: 'free', created_at: '2025-01-01T00:00:00Z' };
export const mockApiKey    = { key: 'a'.repeat(64), name: 'Default', created_at: '2025-01-01T00:00:00Z' };
export const mockUsageLogs = [
  { tokens_saved: 100, noise_removed: 30, created_at: '2025-01-01T00:00:00Z' },
  { tokens_saved: 200, noise_removed: 45, created_at: '2025-02-01T00:00:00Z' },
];
export const mockMonthly = { compressions: 5, tokens_saved_month: 300 };

// ── Builder: returns a chainable Supabase query mock ─────────────────────────

export function makeQueryMock(result: { data: unknown; error: null | object }) {
  const chain = {
    select:   vi.fn().mockReturnThis(),
    insert:   vi.fn().mockReturnThis(),
    delete:   vi.fn().mockReturnThis(),
    update:   vi.fn().mockReturnThis(),
    eq:       vi.fn().mockReturnThis(),
    single:   vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then:     vi.fn().mockResolvedValue(result),
  };
  return chain;
}

// ── Main mock factory ─────────────────────────────────────────────────────────

export function buildDbMock(overrides: {
  profile?:   typeof mockProfile | null;
  apiKey?:    typeof mockApiKey  | null;
  usageLogs?: typeof mockUsageLogs;
  monthly?:   typeof mockMonthly | null;
  insertError?: object | null;
} = {}) {
  const profile   = 'profile'   in overrides ? overrides.profile   : mockProfile;
  const apiKey    = 'apiKey'    in overrides ? overrides.apiKey    : mockApiKey;
  const usageLogs = overrides.usageLogs ?? mockUsageLogs;
  const monthly   = 'monthly'   in overrides ? overrides.monthly   : mockMonthly;

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles')     return makeQueryMock({ data: profile,   error: null });
      if (table === 'api_keys')     return makeQueryMock({ data: apiKey,    error: null });
      if (table === 'usage_logs')   return makeQueryMock({ data: usageLogs, error: overrides.insertError ?? null });
      if (table === 'monthly_usage') return makeQueryMock({ data: monthly,  error: null });
      return makeQueryMock({ data: null, error: null });
    }),
  };
}

// ── Supabase auth mock (JWT path) ─────────────────────────────────────────────

export const mockUser = { id: 'user-123', email: 'test@pith.app' };

export function buildAuthMock(user: typeof mockUser | null = mockUser) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'Invalid JWT' },
      }),
    },
  };
}
