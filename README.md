# Pith

O **Pith** é uma extensão inteligente para Google Chrome e editor de código que age como um compressor e destilador de prompts para modelos de IA. Seu objetivo principal é remover a "gordura" (palavras de preenchimento, polidez desnecessária e redundâncias) dos seus textos, enviando para a Inteligência Artificial apenas a intenção central e os dados essenciais.

Com o Pith, você obtém respostas mais diretas, economiza tokens e se comunica com as IAs seguindo padrões lógicos de alta densidade (o *Zero-G Protocol*).

## ✨ Principais Funcionalidades

- **Modo Invisível (Auto-Compressão):** Pode interceptar e comprimir o texto instantaneamente quando você clica em "Enviar" ou aperta Enter em plataformas suportadas (Chrome).
- **Destilação em Tempo Real:** Mostra visualmente quanto "ruído" foi removido da sua mensagem antes do envio.
- **Zero "Word Lists":** O motor do Pith (`PithEngine`) não usa dicionários gigantes de "palavras proibidas". Em vez disso, pontua palavras usando heurísticas como frequência, comprimento, posição, uso de maiúsculas e sufixos morfológicos.
- **Proteção de Contexto:** Código (```` ``` ````), URLs, chaves complexas e nomes de variáveis (`$var`, `{{var}}`) são isolados do processo de compressão e mantidos 100% intactos.

## 💻 VS Code (Antigravity) Extension

O Pith também possui uma extensão oficial para **VS Code / Antigravity**, utilizando o mesmo coração `PithEngine`. 

1. Acesse a pasta `vscode-extension/` no repositório.
2. Lá dentro foi gerado o pacote instalado `pith-vscode-1.0.0.vsix`.
3. No seu editor, vá em **Extensions > Install from VSIX...** e instale esse arquivo (ou apenas clique com o botão direito no arquivo VSIX > Install Extension VSIX).
4. Para usar, selecione um texto, pressione **`Cmd+Shift+L`** (macOS) ou `Ctrl+Shift+L` (Linux/Windows) para otimizar qualquer texto selecionado no seu editor!

## ⚙️ Como funciona o PithEngine?

O coração do Pith possui dois pipelines principais de raciocínio, dependendo do que você está digitando:

### 1. Pipeline de Extração Simbólica (Query Mode)
Utilizado em prompts menores e diretos, converte instruções conversacionais em representações simbólicas puras: `[tag] !ação #nicho @entidade ?atributo`.

Ele também detecta sua intenção principal usando as seguintes **Tags Zero-G**:
- `[tk]` (Task) → Tarefas e ações.
- `[an]` (Analyze) → Pedidos de análise ou revisão.
- `[op]` (Optimize) → Pedidos para refatorar ou melhorar.
- `[ex]` (Explain) → Dúvidas e explicações.
- `[gen]` (Generate) → Criação ou geração de conteúdo/código.
- `[fx]` (Fix) → Correção de bugs ou erros.
- `[sm]` (Summarize) → Criação de resumos.
- `[st]` (Study/Learn) → Planos de estudo ou aprendizado.
- `[id]` (Idea) → Ideias ou sugestões.

### 2. Pipeline de Compressão (Text Mode)
Ideal para textos mais longos ou contextos colados pelo usuário. Ele:
- Isola elementos intocáveis.
- Aplica transformações estruturais (ex: *VIP/Premiere/Stage* vira `[VIP|Pre|Sta]`).
- Filtra semanticamente o texto linha a linha com base no *score* ponderado de cada palavra.
- Abrevia termos comuns (ex: *desenvolvimento* vira `dev`, *configuração* vira `config`).

## 🛠️ Instalação para Desenvolvimento (Google Chrome)

1. Instale as dependências com `npm install`.
2. Gere o build da extensão com `npm run build`.
3. Abra o Google Chrome e acesse `chrome://extensions/`.
4. Habilite o **Modo do Desenvolvedor** (canto superior direito).
5. Clique em **Carregar sem compactação** (Load unpacked) e selecione a pasta `dist`.