/**
 * Frases complexas + asserções estruturais (sem “ground truth” semântico).
 * Rodar: npx tsx src/pithEngine.fixtures.test.ts
 */
import assert from 'node:assert/strict';
import { PithEngine } from './PithEngine.ts';
import { decodeCompactOpcode } from './engine/opcode.ts';

const eng = new PithEngine();

type Case = {
  name: string;
  input: string;
  assert?: (out: string, m: ReturnType<PithEngine['optimize']>) => void;
};

const cases: Case[] = [
  {
    name: 'PT técnico: infinitivo longo -er (converter)',
    input:
      'não quero rota, quero funções async, quando chegar a req de converter um input, vamos chamar a exata função que vai salvar no banco, sem rota, sem nada',
    assert: (o, m) => {
      assert.equal(m.isQuery, true);
      assert.match(o, /^M=Q /);
      assert.match(o, /\bACT=converter\b/);
      assert.match(o, /\bGOAL=_\b/);
    },
  },
  {
    name: 'PT: engine + ter',
    input:
      'eu quero que a engine seja generica, não tenhamos nenhuma regra fixa de semantica! isso gera limitação, precisamos ter algo que funcione de qualquer jeito!',
    assert: (o, m) => {
      assert.equal(m.isQuery, true);
      assert.match(o, /\bACT=ter\b/);
    },
  },
  {
    name: 'EN: infinitivo refactor',
    input: 'Refactor the auth middleware to use opaque tokens only and avoid round-trips to the legacy service.',
    assert: o => {
      assert.match(o, /\bACT=refactor\b/);
    },
  },
  {
    name: 'Lista markdown → compress (M=C) + BL',
    input: `- Requisitos não-funcionais
- SLO de latência p99
- Plano de rollback`,
    assert: (o, m) => {
      assert.equal(m.isQuery, false);
      assert.match(o, /^M=C /);
      assert.match(o, /\bF=.*BL/);
    },
  },
  {
    name: 'Compress PT: símbolo + (ex-e) sobrevive ao filtro',
    input: ['a', 'b', 'c', 'Consolidar o fechamento contratual e os pré-requisitos operacionais.'].join('\n'),
    assert: o => {
      assert.match(o, /^M=C /);
      assert.match(o, /contratual \+ os/);
    },
  },
  {
    name: 'Compress PT: cópula é não mutila técnica/critérios',
    input: ['Contexto', '', 'A implementação técnica não consegue avançar; os critérios de rollout são claros.', 'Mais linha', 'Outra'].join(
      '\n'
    ),
    assert: o => {
      assert.match(o, /^M=C /);
      assert.doesNotMatch(o, /t=cnica|crit=rios/);
    },
  },
  {
    name: 'Bloco código → F inclui NE',
    input: 'const f = (x) => { return x + 1; };',
    assert: o => {
      assert.match(o, /\bF=.*NE/);
    },
  },
  {
    name: 'Duas interrogações → conversacional M=V',
    input: 'Isso vale para produção? E para staging?',
    assert: (o, m) => {
      assert.equal(m.isQuery, true);
      assert.match(o, /^M=V /);
      assert.match(o, /\bS=\?/);
    },
  },
  {
    name: 'PT misto: números, negação, termos técnicos',
    input:
      'Não persistir em Redis o JWT 256-bit até validarmos o HMAC; se o TTL passar de 900s, invalidar sessão e notificar o serviço de auditoria.',
    assert: o => {
      assert.match(o, /^M=(Q|V|C) /);
      assert.match(o, /\bGOAL=_\b/);
    },
  },
  {
    name: 'FR (uma linha): modo query + slots vazios de produto',
    input:
      'Comment implémenter un cache LRU avec éviction par fréquence sans bloquer le thread principal ?',
    assert: o => {
      assert.match(o, /\bGOAL=_\b.*\bCSTR=_\b.*\bPROTO=_\b/);
    },
  },
  {
    name: 'DE (uma linha): morfologia -en vs infinitivo',
    input: 'Wir müssen die Konfiguration validieren bevor wir deployen.',
    assert: o => {
      assert.match(o, /^M=Q /);
    },
  },
  {
    name: 'Texto longo → compress',
    input: Array.from({ length: 45 }, (_, i) => `paragrafo ${i} com palavras e mais texto.`).join(' '),
    assert: (o, m) => {
      assert.equal(m.isQuery, false);
      assert.match(o, /^M=C /);
    },
  },
  {
    name: 'Pergunta longa em linha única não vira compress',
    input:
      'Cara, imagina o seguinte: a gente tem uma rota na API que faz um processamento de imagem ou gera um PDF super pesado e, enquanto ela roda, todas as outras requisições dos outros usuários simplesmente travam e a API para de responder. Como você resolveria isso no Node.js para que esse processo não sequestre o Event Loop e o sistema continue rodando liso para todo mundo?',
    assert: (o, m) => {
      assert.equal(m.isQuery, true);
      assert.match(o, /^M=Q /);
    },
  },
  {
    name: 'Pergunta longa multilinha não vira compress',
    input: [
      'Contexto longo com várias linhas e detalhes de produção.',
      'A fila começa a crescer e o Node fica congestionado em horários de pico.',
      'Temos tarefas de imagem e PDF em paralelo e bastante IO.',
      'Como resolver isso sem sequestrar o Event Loop?'
    ].join('\n'),
    assert: (o, m) => {
      assert.equal(m.isQuery, true);
      assert.match(o, /^M=Q /);
    },
  },
  {
    name: 'PT literário (sem infinitivo na superfície) → verbo finito',
    input:
      'Embora a análise sintática de períodos compostos exija atenção meticulosa, a intersecção entre a semântica e a pragmática revela nuances que, frequentemente, passam despercebidas em leituras superficiais.',
    assert: o => assert.match(o, /\bACT=revela\b/),
  },
  {
    name: 'PT ecossistema → verbo (não substantivo ecossistema)',
    input:
      'Desde o ecossistema das barreiras de corais até os algoritmos de processamento quântico, a evolução demonstra que a adaptabilidade é o único caminho para a permanência.',
    assert: o => assert.match(o, /\bACT=demonstra\b/),
  },
  {
    name: 'PT culto → gerúndio',
    input:
      'É imprescindível que se mantenha a concordância verbal em conformidade com a norma culta, garantindo que a mensagem seja transmitida sem ambiguidades ou ruídos de comunicação.',
    assert: o => assert.match(o, /\bACT=garantindo\b/),
  },
  {
    name: 'PT perspectiva → infinitivo mapear',
    input:
      'Sob a perspectiva de que a linguagem molda a percepção da realidade, torna-se evidente que a articulação de cláusulas subordinadas não é apenas um exercício gramatical, mas uma tentativa de mapear a densidade do pensamento humano.',
    assert: o => assert.match(o, /\bACT=mapear\b/),
  },
  {
    name: 'PT volatilidade → transcenda (não volatilidade/gestores)',
    input:
      'A volatilidade dos mercados financeiros contemporâneos, aliada à rápida obsolescência tecnológica, impõe aos gestores a necessidade de uma visão holística que transcenda a mera análise estatística de curto prazo.',
    assert: o => assert.match(o, /\bACT=transcenda\b/),
  },
  {
    name: 'PT arquitetura → evitando',
    input:
      'A arquitetura de uma frase complexa exige que o autor equilibre a extensão do período com a clareza da exposição, evitando que o excesso de orações intercaladas obscureça o núcleo semântico da mensagem.',
    assert: o => assert.match(o, /\bACT=evitando\b/),
  },
  {
    name: 'PT Caso → impedindo',
    input:
      'Caso houvesse maior zelo na aplicação dos conectivos lógicos, a fluidez do argumento seria preservada, impedindo que a fragmentação das ideias comprometesse a integridade estrutural do texto.',
    assert: o => assert.match(o, /\bACT=impedindo\b/),
  },
  {
    name: 'PT condicional -iam vs substantivo (edital)',
    input:
      'Caso os proponentes do projeto tivessem atentado para as minúcias do edital, teriam percebido que a conformidade com as normas técnicas é o pressuposto sine qua non para a viabilidade de qualquer empreendimento de tal magnitude.',
    assert: o => assert.match(o, /\bACT=teriam\b/),
  },
  {
    name: 'PT bioma → verbo (abrange), cultural em A',
    input:
      'A preservação do bioma amazônico não se restringe à manutenção da flora, mas abrange a salvaguarda da diversidade cultural das populações tradicionais, cujos conhecimentos ancestrais são pilares para a sustentabilidade global.',
    assert: o => {
      assert.match(o, /\bACT=abrange\b/);
      assert.match(o, /\bA=.*cultural\b/);
    },
  },
];

let failed = 0;
for (const c of cases) {
  try {
    const m = eng.optimize(c.input, { ultraCompact: false });
    if (c.assert) c.assert(m.output, m);
    else assert.ok(m.output.length > 0);
  } catch (e) {
    console.error(`FAIL: ${c.name}`);
    console.error(e);
    failed++;
  }
}

try {
  const m = eng.optimizeMachine('Melhorar algoritmo para aproximar linguagem de máquina com 900 segundos');
  assert.match(m.output, /^m:/);
  assert.match(m.output, /\|k:[A-F0-9]{8}$/);
  assert.match(m.output, /\|x:/); // attrs slot exists in compact format
} catch (e) {
  console.error('FAIL: Modo ultra-compact');
  console.error(e);
  failed++;
}

try {
  const full = eng.optimize('Melhorar algoritmo para aproximar linguagem de máquina com 900 segundos', { ultraCompact: false }).output;
  const compact = eng.optimizeMachine('Melhorar algoritmo para aproximar linguagem de máquina com 900 segundos').output;
  const decoded = decodeCompactOpcode(compact);
  assert.equal(decoded.full, full);
  assert.equal(decoded.isValidCrc, true);
} catch (e) {
  console.error('FAIL: Round-trip compact <-> full');
  console.error(e);
  failed++;
}

if (failed) {
  process.exit(1);
}
console.log(`OK ${cases.length} casos + ultra-compact + round-trip`);
