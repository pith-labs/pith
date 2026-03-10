"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const core_1 = require("@pith/core");
function activate(context) {
    const engine = new core_1.PithEngine();
    // Registrar Chat Participant
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
        }
        catch (error) {
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
                if (token.isCancellationRequested)
                    break;
                response.markdown(chunk);
            }
        }
        catch (error) {
            console.error('Language model request failed', error);
            response.markdown(`⚠️ Erro ao comunicar com a IA: ${error.message || error}`);
        }
    });
    context.subscriptions.push(participant);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map