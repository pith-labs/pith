import * as vscode from 'vscode';
import { PithEngine } from '@pith/core';

export function activate(context: vscode.ExtensionContext) {
  console.log("====================================");
  console.log("PITH EXTENSION IS ACTIVATING...");
  console.log("====================================");
  const engine = new PithEngine();

  // Registrar Chat Participant (Caso o Antigravity/Copilot volte a funcionar)
  const participant = vscode.chat.createChatParticipant('pith.assistant', async (request, chatContext, response, token) => {
    const userInput = request.prompt;
    if (!userInput.trim()) {
      response.markdown("Por favor, digite algum texto para o Pith otimizar.");
      return;
    }

    // 1. Otimizar a entrada do usuário
    let optimizedPrompt = userInput;
    try {
      const { output, noiseRemoved } = engine.optimize(userInput);
      optimizedPrompt = output;
      
      // Mostrar quanto de ruído foi removido
      response.markdown(`*🧹 Pith otimizou seu prompt (removeu ${noiseRemoved}% de ruído).*\n\n---\n\n`);
    } catch (error) {
      console.error('Pith compression failed', error);
      response.markdown("⚠️ Ocorreu um erro ao otimizar seu prompt com o Pith.\n\n");
    }

    // 2. Chamar a API de Modelos de Linguagem do VS Code
    try {
      // Tentar pegar um modelo Copilot / Antigravity disponivel (ex: gpt-4 ou gemini)
      const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      
      if (!model) {
        response.markdown("⚠️ Não foi possível encontrar um modelo de linguagem ativo. Certifique-se de que o Copilot ou Antigravity está ativado no VS Code.");
        return;
      }

      // Preparar mensagens
      const messages = [
        vscode.LanguageModelChatMessage.User(optimizedPrompt)
      ];

      // Enviar e transmitir resposta
      const chatResponse = await model.sendRequest(messages, {}, token);
      
      for await (const chunk of chatResponse.text) {
        if (token.isCancellationRequested) break;
        response.markdown(chunk);
      }
    } catch (error: any) {
      console.error('Language model request failed', error);
      response.markdown(`⚠️ Erro ao comunicar com a IA: ${error.message || error}`);
    }
  });

  context.subscriptions.push(participant);

  // Registrar Comando Global (Fallback)
  const optimizeCommand = vscode.commands.registerCommand('pith.optimize', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Abra um arquivo e selecione um texto para usar o Pith.');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    if (!text.trim()) {
      vscode.window.showWarningMessage('Por favor, selecione algum texto.');
      return;
    }

    try {
      vscode.window.showInformationMessage('Pith: Otimizando seu prompt...');
      const { output, noiseRemoved } = engine.optimize(text);
      
      // Copiar para a área de transferência
      await vscode.env.clipboard.writeText(output);

      // Mostrar o resultado rápido
      vscode.window.showInformationMessage(
        `[PITH] Prompt copiado! (${noiseRemoved}% de ruído removido)`
      );

      // Criar um novo editor "Untitled" com o texto otimizado para o usuário ver melhor
      const doc = await vscode.workspace.openTextDocument({
        content: `// Pith Engine Optimizations\n// Noise Removed: ${noiseRemoved}%\n// Prompt copiado automaticamente para sua área de transferência!\n\n${output}`,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });

    } catch (error: any) {
      console.error('Command Pith optimize failed', error);
      vscode.window.showErrorMessage(`Erro ao otimizar com o Pith: ${error.message}`);
    }
  });

  context.subscriptions.push(optimizeCommand);
}

export function deactivate() {}
