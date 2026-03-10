import { useState, useEffect } from 'react';
import { Copy, TerminalSquare, Zap, Share2 } from 'lucide-react';
import { PithEngine } from '@pith/core';

const engine = new PithEngine();

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
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['distilledTokens', 'pithEnabled', 'responseBoost', 'hasSeenOnboarding'], (result) => {
        const tokens = result.distilledTokens || 0;
        setSavings({
          distilledTokens: tokens,
          dollars: (tokens / 1_000_000) * 15
        });
        setLensEnabled(result.pithEnabled !== false);
        setResponseBoost(result.responseBoost !== false);
        setHasSeenOnboarding(result.hasSeenOnboarding === true);
      });
    } else {
      setHasSeenOnboarding(true);
    }
  }, []);

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

  if (hasSeenOnboarding === null) return null;
  if (!hasSeenOnboarding) return <OnboardingScreen onFinish={finishOnboarding} />;

  return (
    <div className="w-[500px] min-h-[500px] bg-slate-900 text-slate-100 p-5 font-sans flex flex-col">
      <header className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <TerminalSquare className="text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight">PITH v3</h1>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm font-mono">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">{savings.distilledTokens.toLocaleString()} Tokens Destilados</span>
            <button
              onClick={shareStats}
              title="Compartilhar suas estatísticas"
              className="text-slate-500 hover:text-emerald-400 transition-colors"
            >
              {shareCopied ? (
                <span className="text-xs text-emerald-400 font-sans font-normal">copiado!</span>
              ) : (
                <Share2 size={14} />
              )}
            </button>
          </div>
          <span className="text-slate-400 text-xs">${savings.dollars.toFixed(2)} economizados</span>
        </div>
      </header>

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
