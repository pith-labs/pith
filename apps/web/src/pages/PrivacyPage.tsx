import { Shield, Lock, EyeOff, Database, TerminalSquare, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();
  const sections = [
    {
      icon: EyeOff,
      title: t('privacy.sections.s1_title'),
      content: t('privacy.sections.s1_desc')
    },
    {
      icon: TerminalSquare,
      title: t('privacy.sections.s2_title'),
      content: t('privacy.sections.s2_desc')
    },
    {
      icon: Database,
      title: t('privacy.sections.s3_title'),
      content: t('privacy.sections.s3_desc')
    },
    {
      icon: RefreshCw,
      title: t('privacy.sections.s4_title'),
      content: t('privacy.sections.s4_desc')
    },
    {
      icon: Lock,
      title: t('privacy.sections.s5_title'),
      content: t('privacy.sections.s5_desc')
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-16">
        <div className="flex items-center gap-3 text-emerald-400 mb-6">
          <Shield size={32} />
          <h1 className="text-4xl font-extrabold text-white tracking-tight">{t('privacy.title')}</h1>
        </div>
        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
          {t('privacy.updated')} {new Date().toLocaleDateString()} <br />
          {t('privacy.hero')}
        </p>
      </div>

      <div className="space-y-12">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl relative overflow-hidden group">
            {/* Background flourish */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -trarnslate-y-1/2 translate-x-1/3 group-hover:bg-emerald-500/10 transition-colors duration-500 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
              <div className="w-14 h-14 shrink-0 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700/50">
                <section.icon size={26} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                <p className="text-slate-400 leading-relaxed">
                  {section.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 pt-10 border-t border-slate-800 text-center">
        <p className="text-slate-500">
          {t('privacy.footer.questions')}{' '}
          <a href="mailto:oi@pith.app" className="text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4 decoration-emerald-400/30">
            {t('privacy.footer.support')}
          </a>.
        </p>
      </div>
    </div>
  );
}
