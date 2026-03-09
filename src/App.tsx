import { useState, useEffect } from 'react';
import { Copy, TerminalSquare, Zap } from 'lucide-react';
import { LensEngine } from './core/LensEngine';

const engine = new LensEngine();

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [savings, setSavings] = useState({ distilledTokens: 0, dollars: 0 });
  const [massaGorda, setMassaGorda] = useState(0);
  const [isDistilling, setIsDistilling] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['distilledTokens'], (result) => {
        const tokens = result.distilledTokens || 0;
        setSavings({
          distilledTokens: tokens,
          dollars: (tokens / 1_000_000) * 15 // Assuming $15 per 1M tokens avg
        });
      });
    }
  }, []);

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
      // Economy calculation: (Input_Chars - Output_Chars) / 4
      return Math.max(0, Math.floor((rawIn.length - rawOut.length) / 4));
  };

  const copyPrompt = () => {
    if (!output) return;
    
    // Copy to clipboard
    navigator.clipboard.writeText(output);
    
    // Calculate and save tokens
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

  const currentSavings = input && output ? calculateEconomy(input, output) : 0;

  return (
    <div className="w-[500px] min-h-[500px] bg-slate-900 text-slate-100 p-5 font-sans flex flex-col">
      <header className="flex justify-between items-center mb-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <TerminalSquare className="text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight">LENS v3</h1>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm font-mono">
          <span className="text-emerald-400 font-bold">{savings.distilledTokens.toLocaleString()} Tokens Destilados</span>
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
              Linguagem de Máquina (LENS)
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

      <div className="mt-6 flex gap-3">
        <button 
          onClick={() => {
            const dict = "I will communicate using the Zero-G Protocol (2-letter tags). Treat:\n[tk]: Task/Jira\n[an]: Analyze\n[op]: Optimize\n[ex]: Explain\n[sr]: Source Code\n[dn]: Dense Output\n[pf]: Performance\nIgnore syntax errors, focus on technical keywords and logical assignments (: , = , ->). Answer in the most token-efficient way possible.";
            navigator.clipboard.writeText(dict);
          }}
          className="px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          title="Copiar Sistema Zero-G Integrado"
        >
          Copy LENS Prompt
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
