"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const PithEngine_1 = require("../../src/core/PithEngine");
function activate(context) {
    const engine = new PithEngine_1.PithEngine();
    const optimizeSelectionCmd = vscode.commands.registerCommand('pith.optimizeSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selections = editor.selections;
        // Process each selection
        for (const selection of selections) {
            if (selection.isEmpty) {
                // If empty, we could do the whole file, but safer to just ignore or prompt
                vscode.window.showInformationMessage('Please select some text to compress with Pith.');
                continue;
            }
            const text = editor.document.getText(selection);
            try {
                const { output, noiseRemoved } = engine.optimize(text);
                await editor.edit(editBuilder => {
                    editBuilder.replace(selection, output);
                });
                if (noiseRemoved > 0) {
                    vscode.window.setStatusBarMessage(`Pith: Removed ${noiseRemoved}% noise 🧹`, 3000);
                }
                else {
                    vscode.window.setStatusBarMessage(`Pith: Text already optimal ✨`, 3000);
                }
            }
            catch (error) {
                console.error('Pith compression failed', error);
                vscode.window.showErrorMessage('Pith failed to process the text.');
            }
        }
    });
    context.subscriptions.push(optimizeSelectionCmd);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map