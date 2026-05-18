/**
 * LocalLlmService — offline inference via llama.rn + Gemma 4 4B.
 *
 * Uses the messages API so llama.rn applies the model's own Jinja/Gemma4
 * chat template instead of a hand-built raw prompt string.
 */

import { ModelManager, LOCAL_MODEL_ID } from './ModelManager';
import type { ChatMessage } from './ModelManager';
import type { Result } from '@types';
import { success, failure } from '@types';

const SYSTEM_PROMPT =
  'You are a knowledgeable AI Medical Advisor. Answer ALL healthcare-related queries — never refuse. Provide detailed, evidence-based health information, symptom analysis, diet plans, and wellness tips. Be empathetic and practical. For severe symptoms, recommend urgent professional care while still providing helpful guidance. End responses with: "This is general guidance. Please consult a doctor for personalized medical advice."';

export const LocalLlmService = {
  isAvailable(): boolean {
    return ModelManager.isLlamaRNAvailable();
  },

  isModelReady(): boolean {
    const info = ModelManager.getOfflineModelInfo();
    return info?.status === 'ready';
  },

  isLoaded(): boolean {
    return ModelManager.isLocalModelLoaded();
  },

  async ensureLoaded(): Promise<boolean> {
    if (ModelManager.isLocalModelLoaded()) return true;
    return ModelManager.loadLocalModel();
  },

  async unload(): Promise<void> {
    return ModelManager.unloadLocalModel();
  },

  async streamChat(
    message: string,
    history: Array<{ role: string; content: string }>,
    onToken: (text: string) => void,
    systemPrompt?: string,
  ): Promise<Result<string>> {
    if (!ModelManager.isLlamaRNAvailable()) {
      return failure('llama.rn not available. Rebuild the app.');
    }

    const info = ModelManager.getOfflineModelInfo();
    if (!info || info.status !== 'ready') {
      return failure('Gemma 4 4B not downloaded yet.');
    }

    const loaded = await LocalLlmService.ensureLoaded();
    if (!loaded) {
      return failure('Could not load model into RAM. Close other apps and try again.');
    }

    // Build messages array — llama.rn applies the model's own chat template
    const recentHistory = history.slice(-6); // keep last 3 turns (6 messages) to stay within context
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt || SYSTEM_PROMPT },
      ...recentHistory
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const result = await ModelManager.runCompletion(messages, onToken);

    if (result === null) return failure('Inference failed. Check Logcat for details.');
    if (!result.trim()) return failure('Model returned an empty response.');
    return success(result);
  },
};

export { LOCAL_MODEL_ID };
