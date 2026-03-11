import { Shield, Lock, EyeOff, Database, TerminalSquare, RefreshCw } from 'lucide-react';

export default function PrivacyPage() {
  const sections = [
    {
      icon: EyeOff,
      title: "1. Privacidade Ativa por Design (Zero Data Retention)",
      content: "O PITH foi construído sob um princípio fundamental: seus dados originais não nos pertencem. Ao utilizar nossa API ou extensão, o texto do seu prompt original é processado pela nossa Engine de Destilação (Zero-G) em memória. Nós não salvamos o conteúdo do que você digita, nem o resultado gerado. Armazenamos exclusivamente metadados matemáticos (quantos caracteres entraram, quantos saíram, tokens economizados) para fins de faturamento e exibição no seu dashboard."
    },
    {
      icon: TerminalSquare,
      title: "2. PITH e Modelos de IA (OpenAI, Anthropic, etc)",
      content: "O PITH age como um middleware restritivo. Nós não enviamos seus dados para a OpenAI, Google ou Anthropic em seu nome a partir dos nossos servidores. O PITH converte o seu prompt extenso em 'Linguagem de Máquina' (PITH) e devolve para você (ou para a sua máquina local via extensão/API). O envio posterior desse texto destilado para a IA final fica sob seu total controle e responsabilidade, utilizando as suas próprias credenciais."
    },
    {
      icon: Database,
      title: "3. Dados que Coletamos",
      content: "Para o funcionamento da plataforma web, coletamos dados estritamente operacionais através do nosso provedor de autenticação (Supabase) e pagamentos (Stripe). Isso inclui: endereço de e-mail (para login e comunicação operacional), histórico de uso financeiro (tokens economizados), ID da extensão e chaves de API (criptografadas)."
    },
    {
      icon: RefreshCw,
      title: "4. Sincronização da Extensão",
      content: "A extensão do Chrome do PITH processa o texto localmente na aba ativa do seu navegador. Se você estiver utilizando uma conta PITH conectada, a extensão se comunica com nossos servidores apenas para sincronizar seu histórico matemático de tokens salvos e cota mensal. Em nenhum momento o conteúdo das suas conversas locais do ChatGPT ou Claude é transmitido para os servidores do PITH."
    },
    {
      icon: Lock,
      title: "5. Segurança e Armazenamento",
      content: "Toda comunicação com nossos servidores é criptografada via HTTPS/TLS. Os metadados operacionais e informações de conta são armazenados em infraestrutura serverless segura. Suas chaves de API geradas na plataforma são restritas e não devem ser expostas publicamente no lado do cliente (Client-Side)."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="mb-16">
        <div className="flex items-center gap-3 text-emerald-400 mb-6">
          <Shield size={32} />
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Política de Privacidade</h1>
        </div>
        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl">
          Última atualização: {new Date().toLocaleDateString('pt-BR')} <br />
          No PITH, acreditamos que sua propriedade intelectual deve permanecer com você. Nós reduzimos tokens, não a sua privacidade.
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
          Dúvidas sobre como tratamos seus dados? Entre em contato enviando um oi no{' '}
          <a href="mailto:oi@pith.app" className="text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4 decoration-emerald-400/30">
            suporte
          </a>.
        </p>
      </div>
    </div>
  );
}
