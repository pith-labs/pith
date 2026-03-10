import { PithEngine } from './packages/core/dist/index.js';

const engine = new PithEngine();
const text = "então chegamos no limite da extensão, certo? temos como melhorar ainda mais o motor? por exemplo, eu acho que ele ainda não tá bom suficiente quando são perguntas assim, que nem to fazendo agora, veja como ele traduz para IA:";
const result = engine.optimize(text);
console.log("ORIGINAL:", text);
console.log("PITH:", result.output);
