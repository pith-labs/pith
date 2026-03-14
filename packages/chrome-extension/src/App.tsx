import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, TerminalSquare, Zap, Share2, LogOut, Crown, X, Globe } from 'lucide-react';
import { setLocale } from './i18n';
import { PithEngine } from '@pith/core';
import { login, signUp, loadSession, logout as doLogout, type Session } from './lib/auth.js';
import { api, type BackendStats } from './lib/api.js';

const engine = new PithEngine();

const FREE_MONTHLY_LIMIT = 100;

const ONBOARDING_EXAMPLE = `Olá, tudo bem? Gostaria de pedir um favor. Eu estava pensando que seria muito interessante se você pudesse me ajudar a criar uma estratégia de marketing para o meu negócio de brigadeiros gourmet no Instagram. Você consegue fazer isso para mim?`;

// ── Auth Form (login / cadastro) ──────────────────────────────────────────────

const LANGS = [{ code: 'en', label: 'EN' }, { code: 'pt', label: 'PT' }, { code: 'es', label: 'ES' }, { code: 'fr', label: 'FR' }];

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs font-mono uppercase" title="Language">
        <Globe size={12} />
        {i18n.language?.slice(0, 2) || 'EN'}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 py-1 w-24 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          {LANGS.map((l) => (
            <button key={l.code} type="button" onClick={() => { setLocale(l.code); setOpen(false); }} className={`block w-full text-left px-3 py-1.5 text-sm ${i18n.language?.startsWith(l.code) ? 'text-emerald-400 bg-slate-700/50' : 'text-slate-300 hover:bg-slate-700'}`}>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthForm({ onSuccess, onClose, required }: { onSuccess: (s: Session) => void; onClose: () => void; required?: boolean }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const s = mode === 'login'
        ? await login(email, password)
        : await signUp(email, password);
      onSuccess(s);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      // signUp returns info message on email confirmation required
      if (msg.includes('Confirme')) setInfo(msg);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-10 flex items-center justify-center p-5">
      <div className="w-full max-w-xs flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-100">
            {mode === 'login' ? t('auth.login') : t('auth.signup')}
          </h2>
          {!required && (
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
              <X size={16} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
            required
            minLength={6}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          {error && (
            <p className="text-xs text-rose-400 font-mono">{error}</p>
          )}
          {info && (
            <p className="text-xs text-emerald-400 font-mono">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm transition-all disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? t('auth.submit_login') : t('auth.submit_signup')}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setInfo(null); }}
          className="text-xs text-slate-500 hover:text-slate-300 text-center transition-colors"
        >
          {mode === 'login' ? t('auth.switch_to_signup') : t('auth.switch_to_login')}
        </button>
      </div>
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────

function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const { output, noiseRemoved } = engine.optimize(ONBOARDING_EXAMPLE);

  return (
    <div className="w-[500px] min-h-[500px] bg-slate-900 text-slate-100 p-5 font-sans flex flex-col">
      <header className="flex items-center gap-2 mb-5 border-b border-slate-800 pb-4">
        <TerminalSquare className="text-emerald-400" />
        <h1 className="text-xl font-bold tracking-tight">PITH</h1>
        <span className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <span className="text-xs text-slate-500 font-mono">{t('onboarding.title')}</span>
        </span>
      </header>

      <div className="flex-1 flex flex-col gap-4">
        <p className="text-slate-300 text-sm">
          {t('onboarding.intro')}<br/>
          <span className="text-slate-500">{t('onboarding.see_example')}</span>
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-slate-500 uppercase tracking-wider">{t('onboarding.original')}</label>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-mono text-slate-400 leading-relaxed">
            {ONBOARDING_EXAMPLE}
          </div>
        </div>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Zap size={16} className="inline mr-2" />
            {t('onboarding.distill')}
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider">{t('onboarding.distilled')}</label>
                <span className="text-xs font-mono text-rose-400 font-bold">-{noiseRemoved}% {t('onboarding.noise')}</span>
              </div>
              <div className="bg-black border border-emerald-900/50 rounded-xl p-3 text-sm text-emerald-400 font-mono leading-relaxed shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]">
                {output}
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              {t('onboarding.result')}
            </p>
            <button
              onClick={onFinish}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-all"
            >
              {t('onboarding.got_it')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useTranslation();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [savings, setSavings] = useState({ distilledTokens: 0, dollars: 0 });
  const [massaGorda, setMassaGorda] = useState(0);
  const [isDistilling, setIsDistilling] = useState(false);
  const [pithEnabled, setPithEnabled] = useState(true);
  const [responseBoost, setResponseBoost] = useState(true);
  const [outputCompress, setOutputCompress] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  // Auth
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['distilledTokens', 'pithEnabled', 'responseBoost', 'outputCompress', 'hasSeenOnboarding'], (result) => {
        const tokens = result.distilledTokens || 0;
        setSavings({ distilledTokens: tokens, dollars: (tokens / 1_000_000) * 15 });
        setPithEnabled(result.pithEnabled !== false);
        setResponseBoost(result.responseBoost !== false);
        setOutputCompress(result.outputCompress !== false);
        setHasSeenOnboarding(result.hasSeenOnboarding === true);

        loadSession().then(async (s) => {
          if (!s) { setShowAuthForm(true); return; }
          // Sync any locally accumulated tokens before fetching stats
          const user = await syncAndFetch(s, tokens);
          setSession({ ...s, tier: user?.tier ?? 'free' });
        });
      });
    } else {
      setHasSeenOnboarding(true);
    }
  }, []);

  const syncAndFetch = async (s: Session, localTokens: number) => {
    if (localTokens > 0) {
      await api.syncLocal(s.accessToken, localTokens).catch(() => {});
      // Reset local counter after sync to avoid double-counting
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ distilledTokens: 0 });
      }
      setSavings({ distilledTokens: 0, dollars: 0 });
    }
    const [stats, user] = await Promise.all([api.stats(s.accessToken), api.user(s.accessToken)]).catch(() => [null, null]) as [BackendStats | null, { tier: 'free' | 'pro' } | null];
    if (stats) setBackendStats(stats);
    return user;
  };

  const handleAuthSuccess = async (s: Session) => {
    setShowAuthForm(false);
    const user = await syncAndFetch(s, savings.distilledTokens);
    setSession({ ...s, tier: user?.tier ?? 'free' });
  };

  const handleLogout = async () => {
    await doLogout();
    setSession(null);
    setBackendStats(null);
  };

  const finishOnboarding = () => {
    setHasSeenOnboarding(true);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ hasSeenOnboarding: true });
    }
  };

  useEffect(() => {
    if (!input.trim()) { setOutput(''); setMassaGorda(0); setIsDistilling(false); return; }
    setIsDistilling(true);
    const id = setTimeout(() => {
      const { output: opt, noiseRemoved } = engine.optimize(input);
      setOutput(opt); setMassaGorda(noiseRemoved); setIsDistilling(false);
    }, 300);
    return () => clearTimeout(id);
  }, [input]);

  const calculateEconomy = (a: string, b: string) => Math.max(0, Math.floor((a.length - b.length) / 4));

  const copyPrompt = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    const tokensSaved = calculateEconomy(input, output);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['distilledTokens'], (result) => {
        const newTotal = (result.distilledTokens || 0) + tokensSaved;
        chrome.storage.local.set({ distilledTokens: newTotal });
        setSavings({ distilledTokens: newTotal, dollars: (newTotal / 1_000_000) * 15 });
      });
    }
  };

  const shareStats = () => {
    const text = `Já distilei ${savings.distilledTokens.toLocaleString('pt-BR')} tokens com PITH — economizei $${savings.dollars.toFixed(2)} em chamadas de IA. 🔥\nUse o PITH: prompt mais limpo, resposta mais direta.`;
    navigator.clipboard.writeText(text);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const currentSavings = input && output ? calculateEconomy(input, output) : 0;
  const displayTokens = backendStats?.totalTokensSaved ?? savings.distilledTokens;
  const displayDollars = backendStats?.dollarsSaved ?? savings.dollars;
  const monthlyUsed = backendStats?.monthlyCompressions ?? 0;
  const isPro = session?.tier === 'pro';

  if (hasSeenOnboarding === null) return null;
  if (!hasSeenOnboarding) return <OnboardingScreen onFinish={finishOnboarding} />;

  return (
    <div className="relative w-[500px] min-h-[500px] bg-slate-900 text-slate-100 p-5 font-sans flex flex-col">
      {showAuthForm && (
        <AuthForm onSuccess={handleAuthSuccess} onClose={() => setShowAuthForm(false)} required={!session} />
      )}

      <header className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <TerminalSquare className="text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight">PITH v3</h1>
          <LanguageSwitcher />
          {session && (
            <span className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${isPro ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-700 text-slate-400'}`}>
              {isPro && <Crown size={10} />}
              {isPro ? 'PRO' : 'FREE'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5 text-sm font-mono">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">{displayTokens.toLocaleString()} tk</span>
              <button onClick={shareStats} title={t('main.share_stats')} className="text-slate-500 hover:text-emerald-400 transition-colors">
                {shareCopied ? <span className="text-xs text-emerald-400 font-sans font-normal">{t('main.copied')}</span> : <Share2 size={14} />}
              </button>
            </div>
            <span className="text-slate-400 text-xs">${displayDollars.toFixed(2)} {t('main.saved')}</span>
          </div>

          {session ? (
            <button onClick={handleLogout} title={`Logout (${session.email})`} className="text-slate-500 hover:text-rose-400 transition-colors">
              <LogOut size={16} />
            </button>
          ) : (
            <button
              onClick={() => setShowAuthForm(true)}
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
            >
              {t('main.login_btn')}
            </button>
          )}
        </div>
      </header>

      {session && !isPro && (
          <div className="mb-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">{t('main.monthly_usage')}</span>
            <span className={monthlyUsed >= FREE_MONTHLY_LIMIT ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              {monthlyUsed}/{FREE_MONTHLY_LIMIT}
            </span>
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${monthlyUsed >= FREE_MONTHLY_LIMIT ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (monthlyUsed / FREE_MONTHLY_LIMIT) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">{t('main.what_to_ask')}</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono text-slate-300"
            placeholder={t('main.placeholder')}
          />
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-3">
              PITH
              <span className={`text-xs font-mono text-emerald-400 flex items-center gap-1 transition-opacity duration-300 ${isDistilling ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
                <Zap size={14} className="fill-emerald-400" />
                {t('main.distilling')}
              </span>
            </label>
            <div className="flex items-center gap-3">
              {massaGorda > 0 && <span className="text-xs text-rose-400 font-mono font-bold">-{massaGorda}% {t('main.noise_label')}</span>}
              {currentSavings > 0 && <span className="text-xs text-emerald-400 font-mono">↓ {currentSavings} tk</span>}
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            className="w-full h-24 bg-black border border-emerald-900/50 rounded-xl p-3 text-sm text-emerald-400 font-mono focus:outline-none resize-none cursor-text shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]"
            placeholder="[id] !strategy @Marketing !vender brigadeiro ?gourmet @Instagram"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">{t('main.invisible_mode')}</span>
          <button
            onClick={() => { const n = !pithEnabled; setPithEnabled(n); if (typeof chrome !== 'undefined' && chrome.storage?.local) chrome.storage.local.set({ pithEnabled: n }); }}
            className={`w-10 h-5 rounded-full transition-colors relative ${pithEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${pithEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">{t('main.response_boost')}</span>
          <button
            onClick={() => { const n = !responseBoost; setResponseBoost(n); if (typeof chrome !== 'undefined' && chrome.storage?.local) chrome.storage.local.set({ responseBoost: n }); }}
            className={`w-10 h-5 rounded-full transition-colors relative ${responseBoost ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${responseBoost ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">{t('main.output_compress')}</span>
          <button
            onClick={() => { const n = !outputCompress; setOutputCompress(n); if (typeof chrome !== 'undefined' && chrome.storage?.local) chrome.storage.local.set({ outputCompress: n }); }}
            className={`w-10 h-5 rounded-full transition-colors relative ${outputCompress ? 'bg-indigo-500' : 'bg-slate-600'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${outputCompress ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => navigator.clipboard.writeText("I will communicate using the Zero-G Protocol (2-letter tags). Treat:\n[tk]: Task/Jira\n[an]: Analyze\n[op]: Optimize\n[ex]: Explain\n[sr]: Source Code\n[dn]: Dense Output\n[pf]: Performance\nIgnore syntax errors, focus on technical keywords and logical assignments (: , = , ->). Answer in the most token-efficient way possible.")}
          className="px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          title={t('main.copy_pith_prompt')}
        >
          {t('main.copy_pith_prompt')}
        </button>
        <button
          onClick={copyPrompt}
          disabled={!output}
          className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${output ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
        >
          <Copy size={18} />
          {t('main.copy_and_save')}
        </button>
      </div>
    </div>
  );
}
