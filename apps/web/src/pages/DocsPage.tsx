import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Terminal, Lock, Zap, BarChart2, User, Key, RefreshCw, ChevronRight, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BASE_URL = 'https://pith.onrender.com';

// ── Code block with copy ──────────────────────────────────────────────────────
function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className={`bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-300 overflow-x-auto leading-relaxed language-${lang}`}>
        <code>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title={t('dashboard.distiller.copy_title')}
      >
        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ── Endpoint block ────────────────────────────────────────────────────────────
interface Param { name: string; type: string; required?: boolean; desc: string; }
interface EndpointProps {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  summary: string;
  auth?: boolean;
  pro?: boolean;
  body?: Param[];
  response: string;
  example: string;
}

function Endpoint({ method, path, summary, auth = true, pro = false, body, response, example }: EndpointProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const colors: Record<string, string> = {
    GET: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    POST: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    PATCH: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-slate-800/40 transition-colors"
      >
        <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg border ${colors[method]}`}>{method}</span>
        <code className="text-slate-200 font-mono text-sm flex-1">{BASE_URL}{path}</code>
        <div className="flex items-center gap-2 shrink-0">
          {auth && <span className="flex items-center gap-1 text-xs text-slate-500 font-mono"><Lock size={10}/> {t('docs.auth.title').toLowerCase()}</span>}
          {pro && <span className="flex items-center gap-1 text-xs text-amber-400/80 font-mono"><Key size={10}/> pro</span>}
        </div>
        <ChevronRight size={16} className={`text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-800 p-5 flex flex-col gap-5 bg-slate-900/50">
          <p className="text-slate-400 text-sm">{summary}</p>

          {body && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Request Body <span className="text-slate-600 font-normal">· application/json</span></h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">{t('docs.endpoints.table.field')}</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">{t('docs.endpoints.table.type')}</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">{t('docs.endpoints.table.required')}</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">{t('docs.endpoints.table.description')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {body.map(p => (
                      <tr key={p.name}>
                        <td className="px-4 py-3 font-mono text-emerald-400 text-xs">{p.name}</td>
                        <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{p.type}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.required ? <span className="text-rose-400">{t('docs.endpoints.table.yes')}</span> : t('docs.endpoints.table.no')}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Response</h4>
            <CodeBlock code={response} lang="json" />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Exemplo · cURL</h4>
            <CodeBlock code={example} lang="bash" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Docs Page ─────────────────────────────────────────────────────────────────
export default function DocsPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<'nodejs' | 'python' | 'csharp' | 'java'>('nodejs');

  const endpoints: EndpointProps[] = [
    {
      method: 'POST',
      path: '/v1/optimize',
      summary: t('docs.endpoints.summary.optimize'),
      auth: true,
      body: [
        { name: 'text', type: 'string', required: true, desc: t('landing.demo.input_placeholder') },
      ],
      response: `{
  "output": "BFF [Tickets] backend: multi-currency support + VIP/Premiere/Stage categories",
  "noiseRemoved": 62,
  "tokensSaved": 38,
  "isQuery": false
}`,
      example: `curl -X POST ${BASE_URL}/v1/optimize \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Preciso de ajuda para criar um backend para sistema de ingressos com VIP, Premiere e Stage."}'`,
    },
    {
      method: 'GET',
      path: '/v1/stats',
      summary: t('docs.endpoints.summary.stats'),
      auth: true,
      response: `{
  "totalTokensSaved": 142800,
  "totalCompressions": 312,
  "avgNoiseRemoved": 48,
  "dollarsSaved": 2.14,
  "monthlyCompressions": 37,
  "monthlyTokensSaved": 18400
}`,
      example: `curl ${BASE_URL}/v1/stats \\
  -H "Authorization: Bearer SEU_TOKEN"`,
    },
    {
      method: 'GET',
      path: '/v1/user',
      summary: t('docs.endpoints.summary.user'),
      auth: true,
      response: `{
  "id": "uuid-do-usuario",
  "tier": "pro",
  "apiKey": "pith_live_xxxxxxxxxxxxxxxxxxxx",
  "apiKeyName": "Default"
}`,
      example: `curl ${BASE_URL}/v1/user \\
  -H "Authorization: Bearer SEU_TOKEN"`,
    },
    {
      method: 'POST',
      path: '/v1/user/api-key',
      summary: t('docs.endpoints.summary.api_key'),
      auth: true,
      pro: true,
      response: `{
  "key": "pith_live_xxxxxxxxxxxxxxxxxxxx"
}`,
      example: `curl -X POST ${BASE_URL}/v1/user/api-key \\
  -H "Authorization: Bearer SEU_TOKEN"`,
    },
    {
      method: 'PATCH',
      path: '/v1/user/sync',
      summary: t('docs.endpoints.summary.sync'),
      auth: true,
      body: [
        { name: 'tokensSaved', type: 'number', required: true, desc: t('dashboard.stats.tokens_unit') },
      ],
      response: `{
  "synced": true
}`,
      example: `curl -X PATCH ${BASE_URL}/v1/user/sync \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"tokensSaved": 4200}'`,
    },
    {
      method: 'POST',
      path: '/v1/license/validate',
      summary: t('docs.endpoints.summary.validate'),
      auth: false,
      body: [
        { name: 'key', type: 'string', required: true, desc: t('dashboard.api_key.empty_1') },
      ],
      response: `{
  "valid": true,
  "tier": "pro",
  "features": {
    "optimizeCommand": true,
    "chatParticipant": true,
    "batchOptimize": true,
    "unlimitedMonthly": true
  }
}`,
      example: `curl -X POST ${BASE_URL}/v1/license/validate \\
  -H "Content-Type: application/json" \\
  -d '{"key": "SEU_API_KEY"}'`,
    },
  ];

  const groups = [
    { label: t('docs.endpoints.groups.compression'), icon: Zap, ids: [0] },
    { label: t('docs.endpoints.groups.stats'), icon: BarChart2, ids: [1] },
    { label: t('docs.endpoints.groups.user'), icon: User, ids: [2, 3, 4] },
    { label: t('docs.endpoints.groups.extension'), icon: Terminal, ids: [5] },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-mono mb-4">
          <Terminal size={14} />
          <span>pith.onrender.com</span>
          <span className="text-slate-700">/</span>
          <span className="text-emerald-400">v1</span>
        </div>
        <h1 className="text-4xl font-extrabold text-white mb-4">{t('docs.header.title')}</h1>
        <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
          {t('docs.header.subtitle')}
        </p>
      </div>

      {/* Auth section */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-2 flex items-center gap-2"><Lock size={16} className="text-emerald-400" /> {t('docs.auth.title')}</h2>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            {t('docs.auth.subtitle')} <code className="text-emerald-400 text-xs font-mono">Authorization</code>:
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">{t('docs.auth.api_key')}</p>
              <CodeBlock code={`Authorization: pith_live_xxxxxxxxxxxxxxxxxxxx`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">{t('docs.auth.jwt')}</p>
              <CodeBlock code={`Authorization: Bearer eyJhbGci...`} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-800">
            {t('docs.auth.note')}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-2 flex items-center gap-2"><RefreshCw size={16} className="text-emerald-400" /> {t('docs.rate_limit.title')}</h2>
          <div className="space-y-3 text-sm">
            {[
              { plan: 'Free', limit: t('docs.rate_limit.free'), color: 'text-slate-300' },
              { plan: 'Pro', limit: t('docs.rate_limit.pro'), color: 'text-emerald-400' },
            ].map(r => (
              <div key={r.plan} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-500 font-mono">{r.plan}</span>
                <span className={`font-mono ${r.color}`}>{r.limit}</span>
              </div>
            ))}
          </div>

          {!session && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <Link to="/dashboard" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                {t('docs.rate_limit.dashboard_link')} <ChevronRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Endpoints */}
      {groups.map(group => (
        <div key={group.label} className="mb-10">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
            <group.icon size={18} className="text-emerald-400" />
            {group.label}
          </h2>
          <div className="flex flex-col gap-3">
            {group.ids.map(i => <Endpoint key={i} {...endpoints[i]} />)}
          </div>
        </div>
      ))}

      {/* Error codes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-10">
        <h2 className="font-bold text-white mb-4">{t('docs.errors.title')}</h2>
        <div className="border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">{t('docs.errors.status')}</th>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">{t('docs.errors.meaning')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                { code: '400', msg: t('docs.errors.e400') },
                { code: '401', msg: t('docs.errors.e401') },
                { code: '403', msg: t('docs.errors.e403') },
                { code: '429', msg: t('docs.errors.e429') },
                { code: '500', msg: t('docs.errors.e500') },
              ].map(e => (
                <tr key={e.code}>
                  <td className="px-4 py-3 font-mono text-rose-400 text-xs font-bold">{e.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">{e.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick start */}
      <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Zap size={16} className="text-emerald-400" />
            {t('docs.quick_start.title')}
          </h2>
          <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50 self-start">
            {(['nodejs', 'python', 'csharp', 'java'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab 
                    ? 'bg-emerald-500 text-slate-900 shadow-lg' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t(`docs.quick_start.tabs.${tab}`)}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'nodejs' && (
          <CodeBlock lang="js" code={`const res = await fetch('${BASE_URL}/v1/optimize', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'pith_live_xxxxxxxx' 
  },
  body: JSON.stringify({ text: userPrompt })
});

const { output, tokensSaved, noiseRemoved } = await res.json();

${t('docs.quick_start.node_comment')}
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: output }],
});`} />
        )}

        {activeTab === 'python' && (
          <CodeBlock lang="python" code={`import requests
import openai

res = requests.post(
    "${BASE_URL}/v1/optimize",
    headers={"Authorization": "pith_live_xxxxxxxx"},
    json={"text": user_prompt}
)

data = res.json()
output = data["output"]

${t('docs.quick_start.python_comment')}
completion = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": output}]
)`} />
        )}

        {activeTab === 'csharp' && (
          <CodeBlock lang="csharp" code={`using System.Net.Http.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "pith_live_xxxxxxxx");

var res = await client.PostAsJsonAsync("${BASE_URL}/v1/optimize", new { 
    text = userPrompt 
});

var data = await res.Content.ReadFromJsonAsync<dynamic>();
string output = data.output;

${t('docs.quick_start.csharp_comment')}
var completion = await openAiClient.GetChatCompletionsAsync("gpt-4o", new ChatCompletionsOptions() {
    Messages = { new ChatRequestUserMessage(output) }
});`} />
        )}

        {activeTab === 'java' && (
          <CodeBlock lang="java" code={`import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import org.json.JSONObject; // Assuming you have a JSON library like org.json

// Assuming you have an OpenAI client setup, e.g., from OpenAI-Java library
// OpenAiService openAiService = new OpenAiService("YOUR_OPENAI_API_KEY");

HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${BASE_URL}/v1/optimize"))
    .header("Authorization", "pith_live_xxxxxxxx")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString("{\\"text\\":\\"" + userPrompt + "\\"\\"}"))
    .build();

HttpResponse<String> response = HttpClient.newHttpClient()
    .send(request, HttpResponse.BodyHandlers.ofString());

JSONObject data = new JSONObject(response.body());
String output = data.getString("output");

${t('docs.quick_start.java_comment')}
// Example using OpenAI-Java library
// ChatCompletion completion = openAiService.createChatCompletion(
//     ChatCompletionRequest.builder()
//         .model("gpt-4o")
//         .messages(List.of(new ChatMessage("user", output)))
//         .build()
// );`} />
        )}

        <p className="text-xs text-slate-500 mt-4">
          {t('docs.quick_start.savings')}
        </p>
      </div>
    </div>
  );
}
