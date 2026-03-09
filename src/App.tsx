import { useState, useEffect } from 'react';
import { Copy, Sparkles, TerminalSquare } from 'lucide-react';
import { LensEngine } from './core/LensEngine';

const engine = new LensEngine();

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isHardcore, setIsHardcore] = useState(false);
  const [savings, setSavings] = useState({ distilledTokens: 0, dollars: 0 });
  const [massaGorda, setMassaGorda] = useState(0);

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

  const handleOptimize = () => {
    if (!input.trim()) return;
    const { output: optimized, noiseRemoved } = engine.optimize(input, isHardcore);
    setOutput(optimized);
    setMassaGorda(noiseRemoved);
  };

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
          <div className="flex justify-between items-end">
            <label className="text-sm font-semibold text-slate-300">O que você quer perguntar?</label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-emerald-400 transition-colors">
              <input 
                type="checkbox" 
                checked={isHardcore}
                onChange={(e) => setIsHardcore(e.target.checked)}
                className="accent-emerald-500 rounded bg-slate-800 border-slate-700"
              />
              Modo Hardcore (Semantic Distillation)
            </label>
          </div>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono text-slate-300"
            placeholder="Ex: BFF [Purchase/Tickets] Display VIP/Premiere/Stage product categories according to showtimes. Just as we have for PY and CL..."
          />
        </div>

        <button 
          onClick={handleOptimize}
          className="mx-auto w-56 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center gap-2 font-bold transition-all shadow-[0_0_10px_rgba(79,70,229,0.2)]"
        >
          <Sparkles size={16} />
          Otimizar (Hardcore)
        </button>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-end">
            <label className="text-sm font-semibold text-slate-300">Linguagem de Máquina (LENS)</label>
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
            placeholder="[an][sr] BFF [Purchase/Tickets] VIP:True"
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button 
          onClick={() => {
            const dict = '[LENS_ZERO_G] Universal Semantic Distiller. Tags: [id]=ideação, [st]=estratégia, [cr]=crítica, [bz]=business, [cp]=comparar, [an]=analyze, [op]=optimize. Context: [sr]=code/script, [pf]=performance. Output: [dn]=dense. Syntax: [tags] Nouns/Adjectives [code].\n';
            navigator.clipboard.writeText(dict);
          }}
          className="px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          title="Copiar Dicionário Básico"
        >
          Dict
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
