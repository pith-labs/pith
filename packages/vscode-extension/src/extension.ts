import * as vscode from 'vscode';
import { PithEngine } from '@pith/core';

export function activate(context: vscode.ExtensionContext) {
  console.log("====================================");
  console.log("PITH EXTENSION IS ACTIVATING...");
  console.log("====================================");
  const engine = new PithEngine();

  // Registrar Comando Global (Fallback)
  const optimizeCommand = vscode.commands.registerCommand('pith.optimize', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Abra um arquivo e selecione um texto para usar o Pith.');
      return;
    }

    const selection = editor.selection;
    const hasSelection = !selection.isEmpty;
    const targetRange = hasSelection
      ? selection
      : new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(
            editor.document.lineCount - 1,
            editor.document.lineAt(editor.document.lineCount - 1).text.length
          )
        );

    const text = editor.document.getText(targetRange);

    if (!text.trim()) {
      vscode.window.showWarningMessage('Por favor, selecione algum texto ou deixe o arquivo com conteúdo.');
      return;
    }

    try {
      vscode.window.showInformationMessage('Pith: Otimizando seu prompt...');
      const { output, noiseRemoved } = engine.optimize(text);
      await editor.edit(editBuilder => {
        editBuilder.replace(targetRange, output);
      });

      vscode.window.showInformationMessage(
        `[PITH] Prompt otimizado no editor (${noiseRemoved}% de ruído removido)`
      );

    } catch (error: any) {
      console.error('Command Pith optimize failed', error);
      vscode.window.showErrorMessage(`Erro ao otimizar com o Pith: ${error.message}`);
    }
  });

  context.subscriptions.push(optimizeCommand);
}

export function deactivate() {}
