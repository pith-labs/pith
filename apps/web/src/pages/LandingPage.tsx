import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TerminalSquare, Zap, Target, Cpu, CheckCircle2 } from 'lucide-react';
import { PithEngine } from '@pith/core';

const engine = new PithEngine();

// ── Interactive Demo ─────────────────────────────────────────────────────────
function InteractiveDemo() {
  const [input, setInput] = useState("Preciso que você me ajude a pensar em como eu deveria construir o backend de um sistema de compra de ingressos. Quero garantir que o sistema suporte múltiplas moedas e diferentes categorias de produtos como VIP, Premiere e Stage. Consegue me ajudar a pensar na melhor abordagem?");
  const [output, setOutput] = useState("");
  const [massaGorda, setMassaGorda] = useState(0);
  const [isDistilling, setIsDistilling] = useState(false);

  useEffect(() => {
    if (!input.trim()) { setOutput(''); setMassaGorda(0); setIsDistilling(false); return; }
    setIsDistilling(true);
    const id = setTimeout(() => {
      const { output: opt, noiseRemoved } = engine.optimize(input);
      setOutput(opt); setMassaGorda(noiseRemoved); setIsDistilling(false);
    }, 300);
    return () => clearTimeout(id);
  }, [input]);

  const currentSavings = input && output ? Math.max(0, Math.floor((input.length - output.length) / 4)) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
      <header className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
        <TerminalSquare className="text-emerald-400" />
        <h2 className="text-lg font-bold tracking-tight text-white">PITH Demo</h2>
      </header>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-300">Prompt Original (Verboso)</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-500 resize-none font-mono text-slate-300 leading-relaxed"
            placeholder="Digite seu prompt aqui..."
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-3">
              PITH
              <span className={`text-xs font-mono text-emerald-400 flex items-center gap-1 transition-opacity duration-300 ${isDistilling ? 'opacity-100 animate-pulse' : 'opacity-0'}`}>
                <Zap size={14} className="fill-emerald-400" />
                Destilando...
              </span>
            </label>
            <div className="flex items-center gap-4">
              {massaGorda > 0 && <span className="text-xs text-rose-400 font-mono font-bold">-{massaGorda}% Ruído</span>}
              {currentSavings > 0 && <span className="text-xs text-emerald-400 font-mono">↓ {currentSavings} tk salvos</span>}
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            className="w-full h-28 bg-black border border-emerald-900/50 rounded-xl p-4 text-sm text-emerald-400 font-mono focus:outline-none resize-none cursor-text shadow-[inset_0_0_15px_rgba(16,185,129,0.05)] leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

// ── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 flex flex-col items-center justify-center text-center px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mb-6">
          Remova o ruído. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
            Fale a língua da máquina.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          O PITH destila seus prompts removendo a verbosidade humana. Economize tokens, torne respostas mais diretas e aumente a eficiência das chamadas de IA.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <button className="px-8 py-4 rounded-xl relative group overflow-hidden font-bold transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] scale-100 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-emerald-500" />
            <span className="relative text-slate-900 flex items-center gap-2">
              <Zap size={20} /> Instalar Extensão (Grátis)
            </span>
          </button>
          <Link to="/docs" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold flex items-center gap-2 text-slate-100 transition-colors">
            <Cpu size={20} /> Ver Documentação API
          </Link>
        </div>

        {/* Live Demo */}
        <div className="w-full max-w-4xl relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 to-indigo-500/30 rounded-3xl blur-xl opacity-50" />
          <InteractiveDemo />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-slate-950 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Como o PITH funciona</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Um processo simples em três etapas que transforma a forma como você interage com LLMs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: TerminalSquare, title: '1. Escreva Naturalmente', desc: 'Use o PITH na extensão do Chrome ou na API. Escreva como sempre escreve — não mude sua forma de trabalhar.' },
              { icon: Zap, title: '2. PITH Comprime', desc: 'Antes de chegar na IA, seu prompt é destilado automaticamente: palavras vazias fora, intenção pura dentro. Menos tokens, mesmo resultado.' },
              { icon: Target, title: '3. Você economiza', desc: 'Menos tokens enviados = menos dinheiro gasto. Cada compressão reduz seu custo com GPT-4, Claude e outros LLMs na mesma chamada.' },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-emerald-500/30 transition-colors group">
                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/10 transition-colors">
                  <feature.icon className="text-emerald-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">O tamanho certo para você</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">De uso diário a integrações empresariais. Escolha como quer usar o PITH.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch pt-8">
            {/* Freemium / Pro Extension */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-2">PITH Extension</h3>
              <p className="text-slate-400 mb-6 flex-1">Para usuários que querem respostas melhores no ChatGPT e Claude.</p>
              <div className="mb-6 border-b border-slate-800 pb-6">
                <div className="flex items-baseline gap-2 text-white">
                  <span className="text-4xl font-bold">Grátis</span>
                </div>
                <p className="text-emerald-400 text-sm mt-1 mb-4">Ou PRO por $7 /mês</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> 100 compressões/mês (Grátis)</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> Ilimitado + Sync (PRO)</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> Funciona em qualquer aba</li>
                </ul>
              </div>
              <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Instalar Extensão</button>
            </div>

            {/* API SaaS */}
            <div className="relative bg-slate-900 border-2 border-emerald-500 rounded-3xl p-8 flex flex-col shadow-[0_0_40px_rgba(16,185,129,0.1)] -translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-slate-900 px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-full">Para Desenvolvedores</div>
              <h3 className="text-2xl font-bold text-white mb-2">API SaaS @pith/core</h3>
              <p className="text-slate-400 mb-6 flex-1">Destile prompts dos seus usuários antes de chamar a OpenAI, economizando tokens da sua empresa.</p>
              <div className="mb-6 border-b border-slate-800 pb-6">
                <div className="flex items-baseline gap-2 text-white">
                  <span className="text-4xl font-bold">Pay-as-you-go</span>
                </div>
                <p className="text-emerald-400 text-sm mt-1 mb-4">Cobre o custo com a economia gerada</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> API REST ultrarrápida</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> Dashboard de economia</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> Reduz falhas no LLM</li>
                </ul>
              </div>
              <button className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]">Acessar Chaves de API</button>
            </div>

            {/* VS Code */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col shadow-xl">
              <h3 className="text-2xl font-bold text-white mb-2">VS Code Marketplace</h3>
              <p className="text-slate-400 mb-6 flex-1">Acesso direto da sua IDE para gerar código mais rápido usando IA.</p>
              <div className="mb-6 border-b border-slate-800 pb-6">
                <div className="flex items-baseline gap-2 text-white">
                  <span className="text-4xl font-bold">$19</span>
                </div>
                <p className="text-slate-400 text-sm mt-1 mb-4">Licença Vitalícia (One-time)</p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> Pagamento único</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> Uso ilimitado local</li>
                  <li className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle2 size={16} className="text-emerald-500"/> Suporte a Cursor/Copilot</li>
                </ul>
              </div>
              <button className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors">Comprar Licença</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
