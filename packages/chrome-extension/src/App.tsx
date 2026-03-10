import { useState, useEffect } from 'react';
import { Copy, TerminalSquare, Zap, Share2, LogIn, LogOut, Crown } from 'lucide-react';

import { PithEngine } from '@pith/core';
import { loginWithGoogle, loadSession, logout as doLogout, type Session } from './lib/auth.js';
import { api, type BackendStats } from './lib/api.js';

const engine = new PithEngine();

const FREE_MONTHLY_LIMIT = 100;

const ONBOARDING_EXAMPLE = `Olá, tudo bem? Gostaria de pedir um favor. Eu estava pensando que seria muito interessante se você pudesse me ajudar a criar uma estratégia de marketing para o meu negócio de brigadeiros gourmet no Instagram. Você consegue fazer isso para mim?`;

function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const { output, noiseRemoved } = engine.optimize(ONBOARDING_EXAMPLE);

  return (
    <div className="w-[500px] min-h-[500px] bg-slate-900 text-slate-100 p-5 font-sans flex flex-col">
      <header className="flex items-center gap-2 mb-5 border-b border-slate-800 pb-4">
        <TerminalSquare className="text-emerald-400" />
        <h1 className="text-xl font-bold tracking-tight">PITH</h1>
        <span className="ml-auto text-xs text-slate-500 font-mono">primeiro uso</span>
      </header>

      <div className="flex-1 flex flex-col gap-4">
        <p className="text-slate-300 text-sm">
          PITH remove o ruído dos seus prompts antes de enviar para a IA.<br/>
          <span className="text-slate-500">Veja o que acontece com este prompt:</span>
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-slate-500 uppercase tracking-wider">Original (verboso)</label>
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
            Destilar
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono text-emerald-400 uppercase tracking-wider">PITH (destilado)</label>
                <span className="text-xs font-mono text-rose-400 font-bold">-{noiseRemoved}% Massa Gorda</span>
              </div>
              <div className="bg-black border border-emerald-900/50 rounded-xl p-3 text-sm text-emerald-400 font-mono leading-relaxed shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]">
                {output}
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              A IA recebe apenas a intenção. Resposta mais direta, menos tokens gastos.
            </p>
            <button
              onClick={onFinish}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-all"
            >
              Entendi — usar PITH
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [savings, setSavings] = useState({ distilledTokens: 0, dollars: 0 });
  const [massaGorda, setMassaGorda] = useState(0);
  const [isDistilling, setIsDistilling] = useState(false);
  const [pithEnabled, setLensEnabled] = useState(true);
  const [responseBoost, setResponseBoost] = useState(true);
  const [outputCompress, setOutputCompress] = useState(true);
  const [shareCopied, setShareCopied] = useState(false);

  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [backendStats, setBackendStats] = useState<BackendStats | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['distilledTokens', 'pithEnabled', 'responseBoost', 'outputCompress', 'hasSeenOnboarding'], (result) => {
        const tokens = result.distilledTokens || 0;
        setSavings({
          distilledTokens: tokens,
          dollars: (tokens / 1_000_000) * 15
        });
        setLensEnabled(result.pithEnabled !== false);
        setResponseBoost(result.responseBoost !== false);
        setOutputCompress(result.outputCompress !== false);
        setHasSeenOnboarding(result.hasSeenOnboarding === true);
      });

      // Load persisted session
      loadSession().then((s) => {
        if (s) {
          setSession(s);
          fetchBackendStats(s);
        }
      });
    } else {
      setHasSeenOnboarding(true);
    }
  }, []);

  const fetchBackendStats = async (s: Session) => {
    try {
      const [stats, user] = await Promise.all([
        api.stats(s.accessToken),
        api.user(s.accessToken),
      ]);
      setBackendStats(stats);
      // Update tier from backend
      setSession((prev) => prev ? { ...prev, tier: user.tier } : prev);
    } catch {
      // silently fail — offline or token expired
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const s = await loginWithGoogle();

      // Sync any locally accumulated tokens before getting backend stats
      const localTokens = savings.distilledTokens;
      if (localTokens > 0) {
        await api.syncLocal(s.accessToken, localTokens).catch(() => {});
      }

      // Fetch user profile (may update tier) + stats
      const [stats, user] = await Promise.all([
        api.stats(s.accessToken),
        api.user(s.accessToken),
      ]);
      setBackendStats(stats);
      setSession({ ...s, tier: user.tier });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      if (!msg.includes('cancelled') && !msg.includes('cancel')) {
        setAuthError(msg);
      }
    } finally {
      setIsLoggingIn(false);
    }
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
    if (!input.trim()) {
      setOutput('');
      setMassaGorda(0);
      setIsDistilling(false);
      return;
    }

    setIsDistilling(true);
    const timeoutId = setTimeout(() => {
      const { output: optimized, noiseRemoved } = engine.optimize(input);
      setOutput(optimized);
      setMassaGorda(noiseRemoved);
      setIsDistilling(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [input]);

  const calculateEconomy = (rawIn: string, rawOut: string) => {
    return Math.max(0, Math.floor((rawIn.length - rawOut.length) / 4));
  };

  const copyPrompt = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    const tokensSaved = calculateEconomy(input, output);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['distilledTokens'], (result) => {
        const current = result.distilledTokens || 0;
        const newTotal = current + tokensSaved;
        chrome.storage.local.set({ distilledTokens: newTotal });
        setSavings({
          distilledTokens: newTotal,
          dollars: (newTotal / 1_000_000) * 15
        });
      });
    }
  };

  const shareStats = () => {
    const tokens = savings.distilledTokens.toLocaleString('pt-BR');
    const dollars = savings.dollars.toFixed(2);
    const text = `Já distilei ${tokens} tokens com PITH — economizei $${dollars} em chamadas de IA. 🔥\nUse o PITH: prompt mais limpo, resposta mais direta.`;
    navigator.clipboard.writeText(text);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const currentSavings = input && output ? calculateEconomy(input, output) : 0;

  // Use backend stats when available, fallback to local
  const displayTokens = backendStats?.totalTokensSaved ?? savings.distilledTokens;
  const displayDollars = backendStats?.dollarsSaved ?? savings.dollars;
  const monthlyUsed = backendStats?.monthlyCompressions ?? 0;
  const isPro = session?.tier === 'pro';

  if (hasSeenOnboarding === null) return null;
  if (!hasSeenOnboarding) return <OnboardingScreen onFinish={finishOnboarding} />;

  return (
    <div className="w-[500px] min-h-[500px] bg-slate-900 text-slate-100 p-5 font-sans flex flex-col">
      <header className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <TerminalSquare className="text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight">PITH v3</h1>
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
              <button
                onClick={shareStats}
                title="Compartilhar estatísticas"
                className="text-slate-500 hover:text-emerald-400 transition-colors"
              >
                {shareCopied ? (
                  <span className="text-xs text-emerald-400 font-sans font-normal">copiado!</span>
                ) : (
                  <Share2 size={14} />
                )}
              </button>
            </div>
            <span className="text-slate-400 text-xs">${displayDollars.toFixed(2)} saved</span>
          </div>

          {session ? (
            <button
              onClick={handleLogout}
              title={`Logout (${session.email})`}
              className="text-slate-500 hover:text-rose-400 transition-colors"
            >
              <LogOut size={16} />
            </button>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              title="Login com Google"
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            >
              <LogIn size={13} />
              {isLoggingIn ? '...' : 'Login'}
            </button>
          )}
        </div>
      </header>

      {authError && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-rose-900/30 border border-rose-800 text-xs text-rose-400 font-mono">
          {authError}
        </div>
      )}

      {/* Free tier usage bar */}
      {session && !isPro && (
        <div className="mb-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Uso mensal</span>
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
          {monthlyUsed >= FREE_MONTHLY_LIMIT && (
            <p className="text-xs text-rose-400 font-mono text-center">Limite mensal atingido.</p>
          )}
        </div>
      )}


      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-300">O que você quer perguntar?</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono text-slate-300"
            placeholder="Ex: BFF [Purchase/Tickets] Display VIP/Premiere/Stage product categories according to showtimes. Just as we have for PY and CL..."
          />
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-3">
              Linguagem de Máquina (PITH)
              <span className={`text-xs font-mono text-emerald-400 flex items-center gap-1 transition-opacity duration-300 ${isDistilling ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
                <Zap size={14} className="fill-emerald-400" />
                Destilando...
              </span>
            </label>
            <div className="flex items-center gap-3">
              {massaGorda > 0 && (
                <span className="text-xs text-rose-400 font-mono font-bold">-{massaGorda}% Massa Gorda</span>
              )}
              {currentSavings > 0 && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  ↓ {currentSavings} tk
                </span>
              )}
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
          <span className="text-sm text-slate-300">Modo Invisível (Auto-compress)</span>
          <button
            onClick={() => {
              const next = !pithEnabled;
              setLensEnabled(next);
              if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ pithEnabled: next });
              }
            }}
            className={`w-10 h-5 rounded-full transition-colors relative ${pithEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${pithEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Response Boost (respostas concisas)</span>
          <button
            onClick={() => {
              const next = !responseBoost;
              setResponseBoost(next);
              if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ responseBoost: next });
              }
            }}
            className={`w-10 h-5 rounded-full transition-colors relative ${responseBoost ? 'bg-emerald-500' : 'bg-slate-600'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${responseBoost ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Output Compress (comprimir respostas)</span>
          <button
            onClick={() => {
              const next = !outputCompress;
              setOutputCompress(next);
              if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ outputCompress: next });
              }
            }}
            className={`w-10 h-5 rounded-full transition-colors relative ${outputCompress ? 'bg-indigo-500' : 'bg-slate-600'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${outputCompress ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => {
            const dict = "I will communicate using the Zero-G Protocol (2-letter tags). Treat:\n[tk]: Task/Jira\n[an]: Analyze\n[op]: Optimize\n[ex]: Explain\n[sr]: Source Code\n[dn]: Dense Output\n[pf]: Performance\nIgnore syntax errors, focus on technical keywords and logical assignments (: , = , ->). Answer in the most token-efficient way possible.";
            navigator.clipboard.writeText(dict);
          }}
          className="px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          title="Copiar Sistema Zero-G Integrado"
        >
          Copy PITH Prompt
        </button>
        <button
          onClick={copyPrompt}
          disabled={!output}
          className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${
            output ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          <Copy size={18} />
          Copiar e Salvar
        </button>
      </div>
    </div>
  );
}
