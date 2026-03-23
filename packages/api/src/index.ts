import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { optimizeRouter } from './routes/optimize.js';
import { statsRouter } from './routes/stats.js';
import { userRouter } from './routes/user.js';
import { licenseRouter } from './routes/license.js';
import { mlRouter } from './routes/ml.js';

const app = new Hono();

app.use('*', logger());
// Open CORS — auth is enforced via JWT on each route
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowHeaders: ['Authorization', 'Content-Type'],
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', version: '1.0.0' }));

// Routes
app.route('/v1/optimize', optimizeRouter);
app.route('/v1/stats',    statsRouter);
app.route('/v1/user',     userRouter);
app.route('/v1/license',  licenseRouter);
app.route('/v1/ml',       mlRouter);

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404));

const port = parseInt(process.env.PORT ?? '3001');
console.log(`[PITH API] Running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

export default app;
