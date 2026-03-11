import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { TerminalSquare, LogOut, Crown, LayoutDashboard } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import DocsPage from './pages/DocsPage';
import PrivacyPage from './pages/PrivacyPage';

function Navbar() {
  const { session, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const isPro = session?.tier === 'pro';

  return (
    <>
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <TerminalSquare className="text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            <span className="text-xl font-bold tracking-tight">PITH</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-7 text-sm font-medium">
            <a href="/#how-it-works" className="text-slate-400 hover:text-white transition-colors">Como funciona</a>
            <a href="/#pricing" className="text-slate-400 hover:text-white transition-colors">Preços</a>
            <Link to="/docs" className="text-slate-400 hover:text-white transition-colors">API Docs</Link>
            {session && (
              <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            )}
          </div>

          {/* Auth actions */}
          <div className="flex items-center gap-3">
            {session ? (
              <>
                {/* Tier badge */}
                <span className={`hidden sm:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full border ${
                  isPro
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-slate-700/50 text-slate-400 border-slate-600'
                }`}>
                  {isPro && <Crown size={10} />}
                  {isPro ? 'PRO' : 'FREE'}
                </span>

                {/* Dashboard shortcut */}
                <button
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:block text-sm text-slate-400 hover:text-white transition-colors truncate max-w-[140px]"
                  title={session.email}
                >
                  {session.email.split('@')[0]}
                </button>

                {/* Logout */}
                <button
                  onClick={logout}
                  title="Sair"
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuth(true)}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={() => setShowAuth(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]"
                >
                  Começar grátis
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <TerminalSquare size={18} className="text-slate-700" />
          <span>&copy; {new Date().getFullYear()} PITH. Todos os direitos reservados.</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-300 transition-colors">Termos</a>
          <Link to="/privacidade" className="hover:text-slate-300 transition-colors">Privacidade</Link>
          <a href="mailto:oi@pith.app" className="hover:text-slate-300 transition-colors">Contato</a>
        </div>
      </div>
    </footer>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col selection:bg-emerald-500/30">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}
