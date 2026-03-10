import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db/client.js';

export const licenseRouter = new Hono();

// POST /v1/license/validate — VS Code extension calls this on activation
// Returns { valid, tier } so the extension knows what features to unlock
licenseRouter.post(
  '/validate',
  zValidator('json', z.object({ key: z.string().min(1) })),
  async (c) => {
    const { key } = c.req.valid('json');

    const { data: keyRow } = await db
      .from('api_keys')
      .select('user_id, name, profiles(tier)')
      .eq('key', key)
      .single();

    if (!keyRow) {
      return c.json({ valid: false, tier: null, error: 'Invalid license key' }, 404);
    }

    const tier = (keyRow.profiles as any)?.tier ?? 'free';

    return c.json({ valid: true, tier, features: featuresFor(tier) });
  }
);

function featuresFor(tier: string) {
  return {
    optimizeCommand:   true,            // all tiers
    chatParticipant:   tier === 'pro',  // @pith in Copilot Chat — pro only
    batchOptimize:     tier === 'pro',  // optimize entire file — pro only
    unlimitedMonthly:  tier === 'pro',
  };
}
