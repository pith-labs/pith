import { compileMlConfigJob } from '../routes/ml.js';

let started = false;

function parseIntervalMs(raw: string | undefined): number {
  const fallback = 60 * 60 * 1000; // 1h
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 60_000) return fallback;
  return n;
}

export function startMlCron(): void {
  if (started) return;
  started = true;

  const enabled = process.env.ML_CRON_ENABLED === 'true';
  if (!enabled) return;

  const intervalMs = parseIntervalMs(process.env.ML_CRON_INTERVAL_MS);
  const autoPromote = process.env.ML_CRON_AUTO_PROMOTE === 'true';

  const run = async () => {
    try {
      const result = await compileMlConfigJob({ createdBy: null, promote: autoPromote });
      const v = (result.config as any)?.version ?? '?';
      const s = (result.config as any)?.status ?? 'candidate';
      console.log(`[PITH ML CRON] compiled config v${v} status=${s}`);
    } catch (err) {
      console.error('[PITH ML CRON] compile failed:', err);
    }
  };

  // Run once on startup, then interval.
  void run();
  setInterval(() => { void run(); }, intervalMs);
  console.log(`[PITH ML CRON] enabled interval=${intervalMs}ms autoPromote=${autoPromote}`);
}

