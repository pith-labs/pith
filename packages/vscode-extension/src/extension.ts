import * as vscode from 'vscode';
import { PithEngine } from '@pith/core';

function getTargetRange(editor: vscode.TextEditor): vscode.Range {
  const { selection, document } = editor;
  if (!selection.isEmpty) return selection;
  return new vscode.Range(
    new vscode.Position(0, 0),
    document.lineCount > 0
      ? new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
      : new vscode.Position(0, 0)
  );
}

const STATUS_DEFAULT = '$(sparkle) Pith';

function showBriefStatus(message: string, statusBar: vscode.StatusBarItem) {
  statusBar.text = message;
  statusBar.show();
  setTimeout(() => {
    statusBar.text = STATUS_DEFAULT;
  }, 2500);
}

export function activate(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('pith');
  const telemetryApiUrl = String(cfg.get('telemetryApiUrl') || '').trim();
  const telemetryToken = String(cfg.get('telemetryToken') || '').trim();
  const telemetryEnabled = Boolean(cfg.get('telemetryEnabled', false));

  const engine = new PithEngine();

  async function optimizeWithPersist(text: string): Promise<{ output: string; noiseRemoved: number }> {
    if (!telemetryEnabled || !telemetryApiUrl || !telemetryToken) {
      return engine.optimize(text);
    }
    try {
      const res = await fetch(`${telemetryApiUrl}/v1/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${telemetryToken}`,
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return engine.optimize(text);
      const j = (await res.json()) as { output: string; noiseRemoved: number };
      return { output: j.output, noiseRemoved: j.noiseRemoved };
    } catch {
      return engine.optimize(text);
    }
  }

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);

  const runOptimize = async (copyOnly: boolean) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('Abra um arquivo para usar o Pith.');
      return;
    }

    const targetRange = getTargetRange(editor);
    const text = editor.document.getText(targetRange);
    if (!text.trim()) {
      vscode.window.showWarningMessage('Selecione texto ou use em um arquivo com conteúdo.');
      return;
    }

    try {
      const { output, noiseRemoved } = await optimizeWithPersist(text);
      if (copyOnly) {
        await vscode.env.clipboard.writeText(output);
        showBriefStatus(`$(check) Pith: copiado (-${noiseRemoved}%)`, statusBarItem);
      } else {
        await editor.edit(editBuilder => editBuilder.replace(targetRange, output));
        showBriefStatus(`$(check) Pith: otimizado (-${noiseRemoved}%)`, statusBarItem);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Pith: ${error.message}`);
    }
  };

  const runOptimizeClipboard = async () => {
    let text: string;
    try {
      text = await vscode.env.clipboard.readText();
    } catch {
      vscode.window.showErrorMessage('Não foi possível ler a área de transferência.');
      return;
    }
    if (!text?.trim()) {
      vscode.window.showWarningMessage('Área de transferência vazia. Copie o texto do chat primeiro.');
      return;
    }
    try {
      const { output, noiseRemoved } = await optimizeWithPersist(text);
      await vscode.env.clipboard.writeText(output);
      showBriefStatus(`$(check) Pith: clipboard (-${noiseRemoved}%) → Cole no chat`, statusBarItem);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Pith: ${error.message}`);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('pith.optimize', () => runOptimize(false)),
    vscode.commands.registerCommand('pith.optimizeCopy', () => runOptimize(true)),
    vscode.commands.registerCommand('pith.optimizeClipboard', runOptimizeClipboard)
  );

  statusBarItem.text = STATUS_DEFAULT;
  statusBarItem.tooltip = 'Editor: Ctrl+Alt+P. Chat: copie o texto → Ctrl+Alt+Shift+P → cole.';
  statusBarItem.command = 'pith.optimize';
  statusBarItem.show();
}

export function deactivate() {}
