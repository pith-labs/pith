import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import AuthModal from '../components/AuthModal';
import {
  Zap, TerminalSquare, Crown, LogOut, Copy, Share2,
  BarChart2, Key, ChevronRight, RefreshCw
} from 'lucide-react';
import { PithEngine } from '@pith/core';

const engine = new PithEngine();
const FREE_MONTHLY_LIMIT = 100;

export default function DashboardPage() {
  const { session, stats, profile, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Quick distiller
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [massaGorda, setMassaGorda] = useState(0);

  const isPro = session?.tier === 'pro';
  const monthlyUsed = stats?.monthlyCompressions ?? 0;
  const totalTokens = stats?.totalTokensSaved ?? 0;
  const dollarsSaved = stats?.dollarsSaved ?? 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleDistill = () => {
    if (!input.trim()) return;
    const { output: opt, noiseRemoved } = engine.optimize(input);
    setOutput(opt);
    setMassaGorda(noiseRemoved);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(
      `Já distilei ${totalTokens.toLocaleString('pt-BR')} tokens com PITH — economizei $${dollarsSaved.toFixed(2)} 🔥`
    );
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleCopyApiKey = () => {
    if (!profile?.apiKey) return;
    navigator.clipboard.writeText(profile.apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  if (!session) {
    return (
      <>
        <div className="max-w-md mx-auto px-6 py-32 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TerminalSquare size={28} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Faça login para continuar</h1>
          <p className="text-slate-400 mb-8">Acesse seu dashboard de compressões, economias e configurações.</p>
          <button
            onClick={() => setShowAuth(true)}
            className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            Entrar / Criar conta
          </button>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">{session.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-sm font-mono px-3 py-1.5 rounded-full border ${
            isPro
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-slate-700/50 text-slate-400 border-slate-600'
          }`}>
            {isPro && <Crown size={12} />}
            {isPro ? 'Conta PRO' : 'Plano Free'}
          </span>

          <button
            onClick={handleRefresh}
            title="Atualizar dados"
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Tokens Salvos', value: totalTokens.toLocaleString('pt-BR'), unit: 'tokens', color: 'text-emerald-400' },
          { label: 'Dólares Economizados', value: `$${dollarsSaved.toFixed(2)}`, unit: 'em chamadas de API', color: 'text-white' },
          { label: 'Compressões Lifetime', value: stats?.totalCompressions.toLocaleString('pt-BR') ?? '—', unit: 'total', color: 'text-indigo-400' },
          { label: 'Ruído Removido Médio', value: stats ? `${stats.avgNoiseRemoved.toFixed(0)}%` : '—', unit: 'por prompt', color: 'text-rose-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-500 text-xs font-medium mb-2">{stat.label}</p>
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
            <p className="text-slate-600 text-xs mt-1">{stat.unit}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Monthly usage */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <BarChart2 size={18} className="text-emerald-400" />
                Uso Mensal
              </h2>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-400 transition-colors"
              >
                <Share2 size={14} />
                {shareCopied ? 'Copiado!' : 'Compartilhar'}
              </button>
            </div>

            {!isPro ? (
              <>
                <div className="flex justify-between text-sm font-mono mb-2">
                  <span className="text-slate-400">Compressões usadas</span>
                  <span className={monthlyUsed >= FREE_MONTHLY_LIMIT ? 'text-rose-400 font-bold' : 'text-white'}>
                    {monthlyUsed} / {FREE_MONTHLY_LIMIT}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${monthlyUsed >= FREE_MONTHLY_LIMIT ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (monthlyUsed / FREE_MONTHLY_LIMIT) * 100)}%` }}
                  />
                </div>

                {monthlyUsed >= FREE_MONTHLY_LIMIT && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-sm text-rose-400 mb-4">
                    Limite mensal atingido. Faça upgrade para PRO para uso ilimitado.
                  </div>
                )}

                <button
                  onClick={() => navigate('/#pricing')}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Crown size={16} />
                  Upgrade para PRO — $7/mês
                  <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-400 flex items-center gap-2">
                <Zap size={16} />
                Uso ilimitado ativo. Aproveite!
              </div>
            )}
          </div>

          {/* Quick distiller */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <TerminalSquare size={18} className="text-emerald-400" />
              Destilador Rápido
            </h2>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite seu prompt verboso aqui..."
              className="w-full h-24 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-mono text-slate-300 focus:outline-none focus:border-indigo-500 resize-none mb-3"
            />

            <button
              onClick={handleDistill}
              disabled={!input.trim()}
              className="w-full py-3 mb-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              Destilar
            </button>

            {output && (
              <>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-mono">PITH Output</span>
                  <span className="text-rose-400 font-mono font-bold">-{massaGorda}% Ruído</span>
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={output}
                    className="w-full h-20 bg-black border border-emerald-900/50 rounded-xl p-3 text-sm text-emerald-400 font-mono resize-none shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(output)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Copiar"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* API Key */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Key size={18} className="text-emerald-400" />
              Chave de API
            </h2>

            {profile?.apiKey ? (
              <>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-400 break-all mb-3">
                  {profile.apiKey}
                </div>
                <button
                  onClick={handleCopyApiKey}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={14} />
                  {apiKeyCopied ? 'Copiado!' : 'Copiar chave'}
                </button>
              </>
            ) : (
              <div className="text-slate-500 text-sm">
                <p className="mb-3">Sua chave de API aparecerá aqui após o cadastro.</p>
                {!isPro && (
                  <p className="text-xs text-amber-400/80">Acesso à API requer plano PRO.</p>
                )}
              </div>
            )}
          </div>

          {/* Account info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4">Conta</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-300 truncate max-w-[160px]">{session.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plano</span>
                <span className={isPro ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                  {isPro ? 'PRO' : 'Free'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tokens mensais</span>
                <span className="text-emerald-400 font-mono">
                  {stats?.monthlyTokensSaved.toLocaleString('pt-BR') ?? '0'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full py-2.5 rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
