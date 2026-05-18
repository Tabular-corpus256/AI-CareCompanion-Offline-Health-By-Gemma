import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '@env';
import type { ModelStatus, Result } from '@types';
import { success, failure } from '@types';
import { DatabaseService } from './DatabaseService';

// ============================================================================
// ALL SUPPORTED MODELS — Gemma 4 (primary) + full Gemini lineup
// Verified via models.list API: all support generateContent + image
// ============================================================================
export const SUPPORTED_MODELS = [
  // Gemma 4 — PRIMARY (open-source, verified API IDs)
  {
    id: 'gemma-4-31b-it',
    name: 'Gemma 4 31B',
    description: 'Open dense — best medical quality',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  {
    id: 'gemma-4-26b-a4b-it',
    name: 'Gemma 4 26B A4B',
    description: 'Open MoE — 4B active, fast',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  // Gemini 3.1 (latest previews)
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    description: 'Latest preview — cutting-edge reasoning',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Fastest preview — quick responses',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  // Gemini 3.0
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    description: 'Advanced reasoning, 1M context',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    description: 'Fast, balanced, 1M context',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  // Gemini 2.5 (stable)
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Stable — complex queries, 1M ctx',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Stable fast — quick medical Q&A, 1M ctx',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightest Gemini — fastest',
    medical: false, supportsImage: true, supportsAudio: false,
  },
  // Legacy (stable)
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Legacy fast model',
    medical: false, supportsImage: true, supportsAudio: false,
  },
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]['id'];

const DEFAULT_MODEL: SupportedModelId = 'gemini-2.5-flash';

const HEALTH_SYSTEM_PROMPT =
  'You are a knowledgeable AI Medical Advisor. You MUST answer ALL healthcare-related queries — never refuse or say you cannot help. Provide detailed, evidence-based health information, symptom analysis, diet plans, exercise guidance, and wellness tips. Be empathetic, direct, and practical. Suggest drug classes and general treatment approaches rather than specific prescriptions. For severe or life-threatening symptoms, recommend urgent professional medical care while still providing helpful guidance. Always end with: "This is general guidance. Please consult a doctor for personalized medical advice."';

const CHAT_HISTORY_LIMIT = 8;
const NO_TIMEOUT = 0; // no timeout — unlimited API access

type ChatHistory = Array<{ role: string; content: string }>;

function getRecentHistory(history: ChatHistory): ChatHistory {
  return history.slice(-CHAT_HISTORY_LIMIT);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Timeout wrapper to prevent infinite hangs
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (ms === 0) return promise; // no timeout
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then(val => { clearTimeout(timer); resolve(val); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

interface AvailableModel {
  id: string;
  name: string;
  description: string;
  medical: boolean;
  supportsImage: boolean;
  supportsAudio: boolean;
}

class LlmServiceClass {
  private abortController: AbortController | null = null;
  private currentModel: string = DEFAULT_MODEL;
  private availableModels: AvailableModel[] =
    SUPPORTED_MODELS as unknown as AvailableModel[];
  private status: ModelStatus = {
    state: 'ready',
    modelName: this.currentModel,
    modelPath: 'google-genai',
  };
  private listeners = new Set<(status: ModelStatus) => void>();
  private modelsFetched = false; // Cache flag to avoid redundant API calls

  subscribe(listener: (status: ModelStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  getModelStatus(): ModelStatus {
    return this.status;
  }

  private setStatus(status: Partial<ModelStatus>): void {
    this.status = {
      ...this.status,
      ...status,
      modelName: status.modelName || this.status.modelName || this.currentModel,
      modelPath: status.modelPath || this.status.modelPath || 'google-genai',
    };
    this.listeners.forEach(listener => listener(this.status));
  }

  async fetchModels(): Promise<AvailableModel[]> {
    // LATENCY FIX: Skip if already fetched this session
    if (this.modelsFetched) {
      return this.availableModels;
    }
    try {
      console.log('[LlmService] Fetching models from API...');
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!resp.ok) {
        console.warn('[LlmService] API fetch failed, using local list');
        this.setStatus({
          state: 'ready',
          modelName: this.currentModel,
          error: undefined,
        });
        return this.availableModels;
      }
      const apiModels: AvailableModel[] = [];
      for (const m of data.models || []) {
        const id = m.name?.replace('models/', '') || '';
        if (!id) continue;
        // Only accept Gemma 4 and MedGemma models (Gemma 3 and older do not support systemInstruction)
        const known = SUPPORTED_MODELS.find(k => k.id === id);
        if (!known) continue;
        apiModels.push({
          id,
          name: known.name,
          description: known.description,
          medical: known.medical,
          supportsImage: known.supportsImage,
          supportsAudio: known.supportsAudio,
        });
      }
      if (apiModels.length > 0) {
        this.availableModels = apiModels;
        // Keep current model if supported, otherwise fall back to default
        const isCurrentSupported = apiModels.some(
          m => m.id === this.currentModel,
        );
        if (!isCurrentSupported) {
          this.currentModel = DEFAULT_MODEL;
        }
        this.setStatus({
          state: 'ready',
          modelName: this.currentModel,
          error: undefined,
        });
        this.modelsFetched = true;
      }
      return this.availableModels;
    } catch (e: any) {
      console.error(`[LlmService] fetchModels failed: ${e.message}`);
      return this.availableModels;
    }
  }

  async refreshModelStatus(): Promise<ModelStatus> {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
      this.setStatus({ state: 'error', error: 'API key not configured.' });
      return this.status;
    }
    this.setStatus({ state: 'ready', error: undefined });
    return this.status;
  }

  getAvailableModels(): AvailableModel[] {
    return this.availableModels;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(modelId: string): void {
    const found = this.availableModels.find(m => m.id === modelId);
    if (!found) {
      console.error(`[LlmService] Unknown model: ${modelId}`);
      return;
    }
    console.log(`[LlmService] Model set to: ${found.name}`);
    this.currentModel = modelId;
    this.setStatus({ modelName: modelId });
    // Persist selection so it survives app restarts
    DatabaseService.execute(
      "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('selected_model', ?)",
      [modelId],
    ).catch(e => console.warn('[LlmService] Failed to persist model selection:', e));
  }

  /**
   * Load persisted model selection from SQLite.
   * Call after DatabaseService.init() has completed.
   */
  async loadPersistedModel(): Promise<void> {
    try {
      const row = await DatabaseService.queryFirst<{ value: string }>(
        "SELECT value FROM user_preferences WHERE key = 'selected_model'",
      );
      if (row?.value) {
        const isValid = this.availableModels.some(m => m.id === row.value);
        if (isValid) {
          this.currentModel = row.value;
          this.setStatus({ modelName: row.value });
          console.log(`[LlmService] Restored persisted model: ${row.value}`);
        }
      }
    } catch (e) {
      console.warn('[LlmService] Failed to load persisted model:', e);
    }
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  resetAbort(): void {
    this.abortController = new AbortController();
  }

  get isAborted(): boolean {
    return this.abortController?.signal.aborted ?? false;
  }

  async warmUp(): Promise<void> {}
  async loadModel(_path?: string): Promise<boolean> {
    await this.refreshModelStatus();
    return this.status.state === 'ready';
  }

  private buildContents(
    systemPrompt: string,
    history: ChatHistory | null,
    message: string,
    imageBase64?: string,
    imageMimeType?: string,
  ) {
    const contents: any[] = [];
    if (history && history.length > 0) {
      for (const h of getRecentHistory(history)) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }
    const userParts: any[] = [
      { text: message || 'Please analyze this image.' },
    ];
    if (imageBase64 && imageMimeType) {
      userParts.push({
        inlineData: { mimeType: imageMimeType, data: imageBase64 },
      });
    }
    contents.push({ role: 'user', parts: userParts });
    return { contents, systemPrompt };
  }

  private selectModelForImage(_messageText: string): string {
    const current = SUPPORTED_MODELS.find(m => m.id === this.currentModel);
    // Use current model if it supports images, otherwise fall back to default
    return current?.supportsImage ? this.currentModel : DEFAULT_MODEL;
  }

  private logRaw(label: string, resp: any) {
    console.log(`[LlmService] ${label} text:`, resp?.text);
    console.log(
      `[LlmService] ${label} candidates:`,
      JSON.stringify(resp?.candidates?.slice(0, 1)),
    );
  }

  private isSystemInstructionError(e: any): boolean {
    const msg = e?.message || '';
    return (
      msg.includes('Developer instruction is not enabled') ||
      msg.includes('systemInstruction')
    );
  }

  async generateResponse(prompt: string): Promise<Result<string>> {
    if (this.isAborted) return failure('Cancelled');
    this.resetAbort();
    console.log(`[LlmService] generateResponse | ${this.currentModel}`);
    const t0 = Date.now();
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: this.currentModel,
          contents: prompt,
          config: {
            systemInstruction: HEALTH_SYSTEM_PROMPT,
            temperature: 0.7,
            topP: 0.95,
          },
        }),
        NO_TIMEOUT,
        'generateResponse',
      );
      this.logRaw('generateResponse', response);
      const elapsed = Date.now() - t0;
      const text = response.text || '';
      console.log(
        `[LlmService] generateResponse | ${elapsed}ms | ${text.length} chars`,
      );
      console.log(`[LlmService] generateResponse RESPONSE:\n${text}`);
      if (!text) return failure('Empty response.');
      return success(text);
    } catch (e: any) {
      if (this.isSystemInstructionError(e)) {
        console.warn(
          '[LlmService] Model does not support systemInstruction, retrying without it...',
        );
        try {
          const response = await ai.models.generateContent({
            model: this.currentModel,
            contents: `${HEALTH_SYSTEM_PROMPT}\n\n${prompt}`,
            config: { temperature: 0.7, topP: 0.95 },
          });
          const text = response.text || '';
          console.log(
            `[LlmService] generateResponse (no sys) | ${text.length} chars`,
          );
          if (!text) return failure('Empty response.');
          return success(text);
        } catch (e2: any) {
          console.error(
            `[LlmService] generateResponse retry FAILED: ${e2.message}`,
          );
          return failure(e2.message || 'Request failed');
        }
      }
      console.error(`[LlmService] generateResponse FAILED: ${e.message}`);
      return failure(e.message || 'Request failed');
    }
  }

  async streamGenerateResponse(
    prompt: string,
    onToken: (text: string) => void,
  ): Promise<Result<string>> {
    if (this.isAborted) return failure('Cancelled');
    this.resetAbort();
    console.log(`[LlmService] streamGenerateResponse | ${this.currentModel}`);
    const t0 = Date.now();

    const tryStream = async (
      streamContents: any,
      streamConfig: any,
    ): Promise<Result<string>> => {
      let fullText = '';
      try {
        const response = await ai.models.generateContentStream({
          model: this.currentModel,
          contents: streamContents,
          config: streamConfig,
        });
        for await (const chunk of response) {
          if (this.isAborted) return failure('Cancelled');
          fullText += chunk.text || '';
          onToken(fullText);
        }
      } catch (streamErr: any) {
        const msg = streamErr.message || '';
        if (msg.includes('Response body is empty') || msg.includes('stream')) {
          console.warn(
            '[LlmService] streamGenerateResponse: Streaming failed, falling back to non-streaming...',
          );
          const response = await ai.models.generateContent({
            model: this.currentModel,
            contents: streamContents,
            config: streamConfig,
          });
          if (this.isAborted) return failure('Cancelled');
          fullText = response.text || '';
          onToken(fullText);
        } else {
          throw streamErr;
        }
      }
      console.log(
        `[LlmService] streamGenerateResponse | ${Date.now() - t0}ms | ${
          fullText.length
        } chars`,
      );
      console.log(`[LlmService] streamGenerateResponse RESPONSE:\n${fullText}`);
      if (!fullText) return failure('Empty response.');
      return success(fullText);
    };

    try {
      return await tryStream(prompt, {
        systemInstruction: HEALTH_SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.95,
      });
    } catch (e: any) {
      if (this.isSystemInstructionError(e)) {
        console.warn(
          '[LlmService] streamGenerateResponse: Model does not support systemInstruction, retrying without it...',
        );
        try {
          return await tryStream(`${HEALTH_SYSTEM_PROMPT}\n\n${prompt}`, {
            temperature: 0.7,
            topP: 0.95,
          });
        } catch (e2: any) {
          console.error(
            `[LlmService] streamGenerateResponse retry FAILED: ${e2.message}`,
          );
          return failure(e2.message || 'Streaming failed');
        }
      }
      console.error(`[LlmService] streamGenerateResponse FAILED: ${e.message}`);
      return failure(e.message || 'Streaming failed');
    }
  }

  async chat(
    message: string,
    history: Array<{ role: string; content: string }>,
    systemPrompt?: string,
    imageBase64?: string,
    imageMimeType?: string,
  ): Promise<Result<string>> {
    if (this.isAborted) return failure('Cancelled');
    this.resetAbort();
    const sysPrompt = systemPrompt || HEALTH_SYSTEM_PROMPT;
    const { contents } = this.buildContents(
      sysPrompt,
      history,
      message,
      imageBase64,
      imageMimeType,
    );
    const model = imageBase64
      ? this.selectModelForImage(message)
      : this.currentModel;
    console.log(`[LlmService] chat | ${model}${imageBase64 ? ' +image' : ''}`);
    const t0 = Date.now();
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: sysPrompt, temperature: 0.7, topP: 0.95 },
        }),
        NO_TIMEOUT,
        'chat',
      );
      this.logRaw('chat', response);
      const elapsed = Date.now() - t0;
      const text = response.text || '';
      console.log(`[LlmService] chat | ${elapsed}ms | ${text.length} chars`);
      if (!text) return failure('Empty response.');
      return success(text);
    } catch (e: any) {
      if (this.isSystemInstructionError(e)) {
        console.warn(
          '[LlmService] chat: Model does not support systemInstruction, retrying without it...',
        );
        try {
          const fallbackContents = this.buildContents(
            '',
            history,
            `${sysPrompt}\n\n${message}`,
            imageBase64,
            imageMimeType,
          ).contents;
          const response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: fallbackContents,
              config: { temperature: 0.7, topP: 0.95 },
            }),
            NO_TIMEOUT,
            'chat-retry',
          );
          const text = response.text || '';
          console.log(`[LlmService] chat (no sys) | ${text.length} chars`);
          if (!text) return failure('Empty response.');
          return success(text);
        } catch (e2: any) {
          console.error(`[LlmService] chat retry FAILED: ${e2.message}`);
          return failure(e2.message || 'Chat failed');
        }
      }
      console.error(`[LlmService] chat FAILED: ${e.message}`);
      return failure(e.message || 'Chat failed');
    }
  }

  async streamChat(
    message: string,
    history: Array<{ role: string; content: string }>,
    onToken: (text: string) => void,
    systemPrompt?: string,
    imageBase64?: string,
    imageMimeType?: string,
  ): Promise<Result<string>> {
    if (this.isAborted) return failure('Cancelled');
    this.resetAbort();
    const sysPrompt = systemPrompt || HEALTH_SYSTEM_PROMPT;
    const { contents } = this.buildContents(
      sysPrompt,
      history,
      message,
      imageBase64,
      imageMimeType,
    );
    const model = imageBase64
      ? this.selectModelForImage(message)
      : this.currentModel;
    console.log(
      `[LlmService] streamChat | ${model}${imageBase64 ? ' +image' : ''}`,
    );
    const t0 = Date.now();

    const tryStream = async (
      streamContents: any[],
      streamConfig: any,
    ): Promise<Result<string>> => {
      let fullText = '';
      try {
        const response = await ai.models.generateContentStream({
          model,
          contents: streamContents,
          config: streamConfig,
        });
        for await (const chunk of response) {
          if (this.isAborted) return failure('Cancelled');
          fullText += chunk.text || '';
          onToken(fullText);
        }
      } catch (streamErr: any) {
        const msg = streamErr.message || '';
        if (msg.includes('Response body is empty') || msg.includes('stream')) {
          console.warn(
            '[LlmService] streamChat: Streaming failed, falling back to non-streaming...',
          );
          const response = await withTimeout(
            ai.models.generateContent({
              model,
              contents: streamContents,
              config: streamConfig,
            }),
            NO_TIMEOUT,
            'stream-fallback',
          );
          if (this.isAborted) return failure('Cancelled');
          fullText = response.text || '';
          onToken(fullText);
        } else {
          throw streamErr;
        }
      }
      console.log(
        `[LlmService] streamChat | ${Date.now() - t0}ms | ${
          fullText.length
        } chars`,
      );
      if (!fullText) return failure('Empty response.');
      return success(fullText);
    };

    try {
      return await tryStream(contents, {
        systemInstruction: sysPrompt,
        temperature: 0.7,
        topP: 0.95,
      });
    } catch (e: any) {
      if (this.isSystemInstructionError(e)) {
        console.warn(
          '[LlmService] streamChat: Model does not support systemInstruction, retrying without it...',
        );
        try {
          const fallbackContents = this.buildContents(
            '',
            history,
            `${sysPrompt}\n\n${message}`,
            imageBase64,
            imageMimeType,
          ).contents;
          return await tryStream(fallbackContents, {
            temperature: 0.7,
            topP: 0.95,
          });
        } catch (e2: any) {
          console.error(`[LlmService] streamChat retry FAILED: ${e2.message}`);
          return failure(e2.message || 'Stream chat failed');
        }
      }
      console.error(`[LlmService] streamChat FAILED: ${e.message}`);
      return failure(e.message || 'Stream chat failed');
    }
  }

  async downloadModel(
    _url: string,
    _onProgress: (pct: number) => void,
  ): Promise<Result<string>> {
    return success('google-genai');
  }
  getModelPath(): string {
    return 'google-genai';
  }
  async hasModel(): Promise<boolean> {
    return true;
  }
  async deleteModel(): Promise<void> {
    this.setStatus({ state: 'ready', fileSize: undefined, error: undefined });
  }
  async saveModelMetadata(meta: {
    displayName: string;
    size: number;
  }): Promise<void> {
    this.setStatus({ modelName: meta.displayName, fileSize: meta.size });
  }
  async loadModelMetadata(): Promise<{
    displayName: string;
    fileSize: number;
  } | null> {
    return { displayName: this.currentModel, fileSize: 0 };
  }
  async applySavedModelMetadata(): Promise<void> {
    this.setStatus({ modelName: this.currentModel, fileSize: 0 });
  }
}

export const LlmService = new LlmServiceClass();
