import { Hono } from 'hono';
import Stripe from 'stripe';
import { auth } from '../middleware/auth.js';
import { db } from '../db/client.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' });

// Price IDs — create these in Stripe Dashboard
const PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,   // $7/month recurring
  api_metered: process.env.STRIPE_PRICE_API_METERED!,   // pay-per-use for B2B
};

export const stripeRouter = new Hono();

// ── A. Freemium → Pro upgrade ─────────────────────────────────────────────────

// POST /v1/stripe/checkout — authenticated user starts Pro checkout
stripeRouter.post('/checkout', auth, async (c) => {
  const userId = c.get('userId');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICES.pro_monthly, quantity: 1 }],
    success_url: `${process.env.APP_URL}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.APP_URL}/upgrade/cancelled`,
    metadata: { userId },
    allow_promotion_codes: true,
  });

  return c.json({ url: session.url });
});

// ── B. API SaaS — pay-as-you-go checkout ─────────────────────────────────────

// POST /v1/stripe/checkout/api — B2B devs set up metered billing
stripeRouter.post('/checkout/api', auth, async (c) => {
  const userId = c.get('userId');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: PRICES.api_metered }],
    success_url: `${process.env.APP_URL}/api-access/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.APP_URL}/api-access`,
    metadata: { userId, plan: 'api' },
  });

  return c.json({ url: session.url });
});

// ── Webhook — Stripe calls this after successful payment ──────────────────────

stripeRouter.post('/webhook', async (c) => {
  const sig  = c.req.header('stripe-signature') ?? '';
  const body = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.userId;
    if (!userId) return c.json({ ok: true });

    // Upgrade tier in DB
    await db.from('profiles').update({ tier: 'pro' }).eq('id', userId);

    // Auto-generate API key for B2B plan
    if (session.metadata?.plan === 'api') {
      await db.from('api_keys').upsert({ user_id: userId, name: 'API Access' }, { onConflict: 'user_id' });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub    = event.data.object as Stripe.Subscription;
    const custId = sub.customer as string;

    // Find user by stripe_customer_id (add this column to profiles if needed)
    const { data } = await db
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', custId)
      .single();

    if (data) await db.from('profiles').update({ tier: 'free' }).eq('id', data.id);
  }

  return c.json({ ok: true });
});

// ── GET /v1/stripe/portal — customer portal for managing subscription ─────────

stripeRouter.get('/portal', auth, async (c) => {
  const userId = c.get('userId');

  const { data: profile } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!profile?.stripe_customer_id) {
    return c.json({ error: 'No active subscription' }, 404);
  }

  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${process.env.APP_URL}/dashboard`,
  });

  return c.json({ url: session.url });
});
