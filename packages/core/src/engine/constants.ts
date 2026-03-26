// Compact abbreviations for long words (PT, EN, ES, FR, DE)
export const ABBREV = new Map<string, string>([
  // PT
  ['categorias', 'cats'], ['produtos', 'prods'],
  ['configuração', 'config'], ['configuracao', 'config'],
  ['desenvolvimento', 'dev'],
  ['documentação', 'docs'], ['documentacao', 'docs'],
  ['aplicação', 'app'], ['aplicacao', 'app'],
  ['implementação', 'impl'], ['implementacao', 'impl'],
  ['gerenciamento', 'mgmt'],
  ['informação', 'info'], ['informacao', 'info'],
  ['autenticação', 'auth'], ['autenticacao', 'auth'],
  ['ambiente', 'env'],
  ['repositório', 'repo'], ['repositorio', 'repo'],
  ['permissão', 'perm'],
  ['descrição', 'desc'],
  ['responsável', 'resp'],
  ['disponível', 'avail'],
  // EN
  ['categories', 'cats'],
  ['products', 'prods'],
  ['configuration', 'config'],
  ['development', 'dev'],
  ['documentation', 'docs'],
  ['application', 'app'],
  ['implementation', 'impl'],
  ['management', 'mgmt'],
  ['information', 'info'],
  ['authentication', 'auth'],
  ['environment', 'env'],
  ['repository', 'repo'],
  ['permission', 'perm'],
  ['description', 'desc'],
  ['responsible', 'resp'],
  ['available', 'avail'],
  // ES (Spanish)
  ['categorías', 'cats'], ['categorias', 'cats'],
  ['productos', 'prods'],
  ['configuración', 'config'], ['configuracion', 'config'],
  ['desarrollo', 'dev'],
  ['documentación', 'docs'], ['documentacion', 'docs'],
  ['aplicación', 'app'], ['aplicacion', 'app'],
  ['implementación', 'impl'], ['implementacion', 'impl'],
  ['gestión', 'mgmt'], ['gestion', 'mgmt'],
  ['información', 'info'], ['informacion', 'info'],
  ['autenticación', 'auth'], ['autenticacion', 'auth'],
  ['entorno', 'env'],
  ['repositorio', 'repo'],
  ['permiso', 'perm'],
  ['descripción', 'desc'], ['descripcion', 'desc'],
  ['disponible', 'avail'],
  // FR (French)
  ['catégories', 'cats'], ['categories', 'cats'],
  ['produits', 'prods'],
  ['configuration', 'config'],
  ['développement', 'dev'], ['developpement', 'dev'],
  ['documentation', 'docs'],
  ['application', 'app'],
  ['implémentation', 'impl'], ['implementation', 'impl'],
  ['gestion', 'mgmt'],
  ['information', 'info'],
  ['authentification', 'auth'],
  ['environnement', 'env'],
  ['dépôt', 'repo'], ['depot', 'repo'],
  ['permission', 'perm'],
  ['description', 'desc'],
  ['disponible', 'avail'],
  // DE (German)
  ['kategorien', 'cats'],
  ['produkte', 'prods'],
  ['konfiguration', 'config'],
  ['entwicklung', 'dev'],
  ['dokumentation', 'docs'],
  ['anwendung', 'app'],
  ['implementierung', 'impl'],
  ['verwaltung', 'mgmt'],
  ['information', 'info'], ['informationen', 'info'],
  ['authentifizierung', 'auth'],
  ['umgebung', 'env'],
  ['repository', 'repo'],
  ['berechtigung', 'perm'],
  ['beschreibung', 'desc'],
  ['verfügbar', 'avail'],
]);

export const QUERY_THRESHOLD = 5;
export const COMPRESS_THRESHOLD = 4;
export const MAX_QUERY_NICHES = 4;

/** Cópulas PT como token isolado — JS `\b` não trata letras acentuadas como `\w` (evita `técnica`→`t=cnica`). */
export const COPULA_PT_RE =
  /(?<![\p{L}\p{M}\p{N}])(é|são|está|estão|era|eram)(?![\p{L}\p{M}\p{N}])/giu;

/** Alterna ~ no termo seguinte; exclui sem/without — "sem ambiguidade" não é ~ambiguidade */
export const NEGATION_TOGGLE_WORD_RE = /^(não|nao|not|never|nem)$/i;

// Adjective/determiner suffixes — Latin-derived morphological patterns, never verb roots
export const ADJECTIVE_SUFFIX =
  /(?:ário|ária|oso|osa|ivo|iva|ável|ível|inho|inha|ante|ente|udo|uda|ário|ária|ary|ous|ive|able|ible|ful|less|ical|ial|ular|ural|olar|lear|quer|quier|ico|ica)$/i;
export const VERB_INFINITIVE = /[aei]r$/i;
export const VERB_CONJUGATED = /(?:[aei]ndo|[aei]ram|[aei]va[ms]?|[aei]rá|[aei]rão|[aei]sse[ms]?|[aei]mos|[aei]reis)$/i;
