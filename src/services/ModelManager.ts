import { DatabaseService } from './DatabaseService';
import { logError } from '@utils/logger';

export type ModelMode = 'online' | 'offline';
export type ModelStatus = 'not_downloaded' | 'downloading' | 'ready' | 'error';

export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  sizeBytes: number;
  downloadUrl: string;
  status: ModelStatus;
  progress: number;
}

export const LOCAL_MODEL_ID = 'gemma-4-4b-it';

// Gemma 4 E4B IQ2_M (Unsloth Dynamic) — ~1.5 GB, runs on devices with 3 GB+ RAM.
// Source: unsloth/gemma-4-E4B-it-GGUF on HuggingFace.
const OFFLINE_MODELS: Omit<ModelInfo, 'status' | 'progress'>[] = [
  {
    id: LOCAL_MODEL_ID,
    name: 'Gemma 4 4B (On Device)',
    size: '~1.5 GB',
    sizeBytes: 1_500_000_000,
    downloadUrl:
      'https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-UD-IQ2_M.gguf',
  },
];

const ONLINE_MODELS: Omit<ModelInfo, 'status' | 'progress'>[] = [
  {
    id: 'gemma-4-31b-it',
    name: 'Gemma 4 31B (Cloud)',
    size: '—',
    sizeBytes: 0,
    downloadUrl: '',
  },
  {
    id: 'gemma-4-26b-a4b-it',
    name: 'Gemma 4 26B A4B (Cloud)',
    size: '—',
    sizeBytes: 0,
    downloadUrl: '',
  },
];

// ─── RNFS types ───────────────────────────────────────────────────────────────

type DownloadProgress = { bytesWritten: number; contentLength: number };
type DownloadResult = { statusCode: number };
type FileStatResult = { size: number };
type RNFSLike = {
  DocumentDirectoryPath: string;
  mkdir(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileStatResult>;
  unlink(path: string): Promise<void>;
  downloadFile(options: {
    fromUrl: string;
    toFile: string;
    headers?: Record<string, string>;
    connectionTimeout?: number;
    readTimeout?: number;
    progress?: (res: DownloadProgress) => void;
    progressDivider?: number;
  }): { promise: Promise<DownloadResult> };
};

let cachedRNFS: RNFSLike | null | undefined;
function getRNFS(): RNFSLike | null {
  if (cachedRNFS !== undefined) return cachedRNFS;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedRNFS = require('react-native-fs') as RNFSLike;
  } catch {
    cachedRNFS = null;
  }
  return cachedRNFS;
}

// ─── llama.rn types ───────────────────────────────────────────────────────────

interface LlamaInitOpts {
  model: string;
  use_mlock?: boolean;
  n_ctx?: number;
  n_batch?: number;
  n_threads?: number;
  n_gpu_layers?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlamaCompletionParams {
  messages: ChatMessage[];
  n_predict?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
}

// NativeCompletionResult shape (llama.rn 0.12.x)
interface LlamaCompletionResult {
  content: string;   // filtered output (preferred)
  text: string;      // raw output including stop/reasoning tokens
}

interface LlamaContext {
  completion(
    params: LlamaCompletionParams,
    callback: (data: { token: string }) => void,
  ): Promise<LlamaCompletionResult>;
  stopCompletion(): Promise<void>;
  release(): Promise<void>;
}

interface LlamaRNModule {
  initLlama(opts: LlamaInitOpts): Promise<LlamaContext>;
}

let _llamaRN: LlamaRNModule | null | undefined;
function getLlamaRN(): LlamaRNModule | null {
  if (_llamaRN !== undefined) return _llamaRN;
  try {
    _llamaRN = require('llama.rn') as LlamaRNModule;
  } catch {
    _llamaRN = null;
  }
  return _llamaRN;
}

// ─── ModelManagerClass ────────────────────────────────────────────────────────

type StatusCallback = (models: ModelInfo[]) => void;

class ModelManagerClass {
  private mode: ModelMode = 'online';
  private listeners: Set<StatusCallback> = new Set();
  private models: ModelInfo[] = [];
  private currentModelId = 'gemma-4-26b-a4b-it';
  private initDone = false;

  // llama.rn context — loaded when user picks the local model
  private llamaContext: LlamaContext | null = null;
  private llamaModelId: string | null = null;
  private completionRunning = false;

  async init() {
    if (this.initDone) return;
    this.initDone = true;
    await Promise.all([this.loadMode(), this.loadProgress()]);
    // Verify files directly — catches cases where the DB record is missing
    // but the .gguf file already exists on disk (e.g. fresh install over old data).
    await this.verifyFileStatus();
    this.rebuildList();
  }

  // Check every offline model's file on disk; mark ready if the file is large enough.
  private async verifyFileStatus() {
    const rnfs = getRNFS();
    if (!rnfs) return;
    for (const m of OFFLINE_MODELS) {
      const existing = this.models.find(mod => mod.id === m.id);
      if (existing?.status === 'ready') continue; // already confirmed
      const path = `${rnfs.DocumentDirectoryPath}/models/${m.id}.gguf`;
      try {
        if (await rnfs.exists(path)) {
          const stat = await rnfs.stat(path);
          if (stat.size > 500_000_000) {
            const idx = this.models.findIndex(mod => mod.id === m.id);
            const entry: ModelInfo = { ...m, status: 'ready', progress: 100 };
            if (idx === -1) this.models.push(entry);
            else this.models[idx] = { ...this.models[idx], status: 'ready', progress: 100 };
            this.saveProgress(m.id, 'ready', 100);
          }
        }
      } catch {}
    }
  }

  getMode(): ModelMode { return this.mode; }
  getCurrentModelId(): string { return this.currentModelId; }
  getModels(): ModelInfo[] { return this.models; }

  getOfflineModelInfo(): ModelInfo | null {
    return this.models.find(m => m.id === LOCAL_MODEL_ID) || null;
  }

  setCurrentModel(id: string) {
    this.currentModelId = id;
    DatabaseService.execute(
      "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('current_model', ?)",
      [id],
    );
  }

  async toggleMode(): Promise<ModelMode> {
    this.mode = this.mode === 'online' ? 'offline' : 'online';
    await DatabaseService.execute(
      "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('model_mode', ?)",
      [this.mode],
    );
    this.rebuildList();
    return this.mode;
  }

  async setMode(mode: ModelMode) {
    this.mode = mode;
    await DatabaseService.execute(
      "INSERT OR REPLACE INTO user_preferences (key, value) VALUES ('model_mode', ?)",
      [mode],
    );
    this.rebuildList();
  }

  // ── Download ──────────────────────────────────────────────────────────────

  async downloadModel(
    modelId: string,
    onProgress?: (pct: number) => void,
  ): Promise<boolean> {
    const model = OFFLINE_MODELS.find(m => m.id === modelId);
    if (!model) {
      logError('ModelManager.downloadModel', new Error('Unknown modelId'), { modelId });
      return false;
    }

    const rnfs = getRNFS();
    if (!rnfs) {
      logError('ModelManager.downloadModel', new Error('react-native-fs not available'), { modelId });
      this.updateModelStatus(modelId, 'error', 0);
      return false;
    }

    const destDir = `${rnfs.DocumentDirectoryPath}/models`;
    // mkdir is idempotent on some versions; guard with try/catch
    try { await rnfs.mkdir(destDir); } catch {}

    const destPath = `${destDir}/${modelId}.gguf`;

    // If a sufficiently large file already exists, treat as ready
    try {
      if (await rnfs.exists(destPath)) {
        const stat = await rnfs.stat(destPath);
        if (stat.size > 500_000_000) {
          this.updateModelStatus(modelId, 'ready', 100);
          return true;
        }
        // Partial file — remove it before re-downloading
        await rnfs.unlink(destPath);
      }
    } catch {}

    try {
      this.updateModelStatus(modelId, 'downloading', 0);

      const ret = rnfs.downloadFile({
        fromUrl: model.downloadUrl,
        toFile: destPath,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
          'Accept': '*/*',
        },
        connectionTimeout: 30_000,  // 30 s to connect
        readTimeout: 120_000,        // 2 min between data chunks
        progress: (res: DownloadProgress) => {
          const pct = res.contentLength > 0
            ? Math.round((res.bytesWritten / res.contentLength) * 100)
            : 0;
          this.updateModelStatus(modelId, 'downloading', pct);
          onProgress?.(pct);
        },
        progressDivider: 2,
      });

      const result = await ret.promise;

      // Accept any 2xx status (200 OK, 206 Partial Content from CDN, etc.)
      if (result.statusCode >= 200 && result.statusCode < 300) {
        this.updateModelStatus(modelId, 'ready', 100);
        return true;
      }

      throw new Error(`HTTP ${result.statusCode}`);
    } catch (e: any) {
      logError('ModelManager.downloadModel', e, { modelId });
      this.updateModelStatus(modelId, 'error', 0);
      try { await rnfs.unlink(destPath); } catch {}
      return false;
    }
  }

  async deleteModel(modelId: string) {
    // Unload llama context if this model is loaded
    if (this.llamaModelId === modelId) await this.unloadLocalModel();
    const rnfs = getRNFS();
    if (!rnfs) return;
    const path = `${rnfs.DocumentDirectoryPath}/models/${modelId}.gguf`;
    try { await rnfs.unlink(path); } catch {}
    this.updateModelStatus(modelId, 'not_downloaded', 0);
  }

  async getDownloadedSize(modelId: string): Promise<number> {
    const rnfs = getRNFS();
    if (!rnfs) return 0;
    const path = `${rnfs.DocumentDirectoryPath}/models/${modelId}.gguf`;
    try {
      if (await rnfs.exists(path)) return (await rnfs.stat(path)).size;
    } catch {}
    return 0;
  }

  getModelPath(modelId: string): string | null {
    const rnfs = getRNFS();
    if (!rnfs) return null;
    return `${rnfs.DocumentDirectoryPath}/models/${modelId}.gguf`;
  }

  // ── llama.rn context management ───────────────────────────────────────────

  isLocalModelLoaded(): boolean {
    return this.llamaContext !== null && this.llamaModelId === LOCAL_MODEL_ID;
  }

  isLlamaRNAvailable(): boolean {
    return getLlamaRN() !== null;
  }

  async loadLocalModel(): Promise<boolean> {
    const llama = getLlamaRN();
    if (!llama) return false;

    const rnfs = getRNFS();
    if (!rnfs) return false;

    const modelPath = `${rnfs.DocumentDirectoryPath}/models/${LOCAL_MODEL_ID}.gguf`;
    const exists = await rnfs.exists(modelPath);
    if (!exists) return false;

    // Already loaded
    if (this.llamaContext && this.llamaModelId === LOCAL_MODEL_ID) return true;

    // Unload previous context if any
    if (this.llamaContext) await this.unloadLocalModel();

    try {
      this.llamaContext = await llama.initLlama({
        model: modelPath,
        use_mlock: false,
        n_ctx: 2048,        // must be > prompt_tokens + n_predict; 1024 was too small
        n_batch: 256,
        n_threads: 4,
        n_gpu_layers: 0,   // CPU-only; GPU offload causes SIGSEGV on most Android devices
      });
      this.llamaModelId = LOCAL_MODEL_ID;
      return true;
    } catch (e: any) {
      logError('ModelManager.loadLocalModel', e);
      this.llamaContext = null;
      this.llamaModelId = null;
      return false;
    }
  }

  async unloadLocalModel(): Promise<void> {
    if (!this.llamaContext) return;
    try { await this.llamaContext.release(); } catch {}
    this.llamaContext = null;
    this.llamaModelId = null;
  }

  /**
   * Run streaming completion via the messages API (uses the model's Jinja template).
   * Streams tokens to onToken; returns full text on completion.
   * Returns null if not loaded or an error occurs.
   */
  async runCompletion(
    messages: ChatMessage[],
    onToken: (text: string) => void,
  ): Promise<string | null> {
    if (!this.llamaContext) {
      logError('ModelManager.runCompletion', new Error('No llama context'));
      return null;
    }
    if (this.completionRunning) {
      logError('ModelManager.runCompletion', new Error('Completion already running'));
      return null;
    }
    this.completionRunning = true;
    try {
      let accumulated = '';
      const result = await this.llamaContext.completion(
        {
          messages,
          n_predict: 512,          // safe: 2048 ctx − ~200 prompt tokens = ~1800 headroom
          temperature: 0.7,
          top_p: 0.95,
          stop: ['<end_of_turn>', '<eos>', '<|endoftext|>'],
        },
        (data: { token: string }) => {
          accumulated += data.token;
          onToken(accumulated);
        },
      );
      // content = filtered output (no reasoning/tool-call wrappers); fall back to text or accumulated
      return result.content || result.text || accumulated || null;
    } catch (e: any) {
      logError('ModelManager.runCompletion', e);
      return null;
    } finally {
      this.completionRunning = false;
    }
  }

  async stopCompletion(): Promise<void> {
    if (this.llamaContext && this.completionRunning) {
      try { await this.llamaContext.stopCompletion(); } catch {}
    }
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  onModelsChanged(cb: StatusCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private updateModelStatus(id: string, status: ModelStatus, progress: number) {
    // Ensure the model exists in the list (it may be in the other mode's list)
    const idx = this.models.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.models[idx] = { ...this.models[idx], status, progress };
    } else {
      const meta = OFFLINE_MODELS.find(m => m.id === id);
      if (meta) this.models.push({ ...meta, status, progress });
    }
    this.notify();
    this.saveProgress(id, status, progress);
  }

  private rebuildList() {
    const source = this.mode === 'online' ? ONLINE_MODELS : OFFLINE_MODELS;
    this.models = source.map(m => {
      const existing = this.models?.find(e => e.id === m.id);
      return { ...m, status: existing?.status || 'not_downloaded', progress: existing?.progress || 0 };
    });
    this.notify();
  }

  private notify() {
    this.listeners.forEach(cb => { try { cb([...this.models]); } catch {} });
  }

  private async loadMode() {
    try {
      const row = await DatabaseService.queryFirst<{ value: string }>(
        "SELECT value FROM user_preferences WHERE key = 'model_mode'",
      );
      if (row?.value === 'offline' || row?.value === 'online') this.mode = row.value;
    } catch {}
  }

  private async saveProgress(id: string, status: ModelStatus, progress: number) {
    await DatabaseService.execute(
      "INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)",
      [`model_${id}_status`, JSON.stringify({ status, progress })],
    );
  }

  private async loadProgress() {
    const rnfs = getRNFS();
    for (const m of OFFLINE_MODELS) {
      try {
        const row = await DatabaseService.queryFirst<{ value: string }>(
          "SELECT value FROM user_preferences WHERE key = ?",
          [`model_${m.id}_status`],
        );
        if (!row?.value) continue;
        const { status, progress } = JSON.parse(row.value);
        if (status === 'ready' && rnfs) {
          const path = `${rnfs.DocumentDirectoryPath}/models/${m.id}.gguf`;
          if (!(await rnfs.exists(path))) {
            await DatabaseService.execute(
              "DELETE FROM user_preferences WHERE key = ?",
              [`model_${m.id}_status`],
            );
            continue;
          }
        } else if (status === 'ready' && !rnfs) {
          await DatabaseService.execute(
            "DELETE FROM user_preferences WHERE key = ?",
            [`model_${m.id}_status`],
          );
          continue;
        }
        if (status === 'ready' || status === 'downloading') {
          const idx = this.models.findIndex(mod => mod.id === m.id);
          const entry = { ...m, status, progress };
          if (idx === -1) this.models.push(entry);
          else this.models[idx] = { ...this.models[idx], status, progress };
        }
      } catch {}
    }
  }
}

export const ModelManager = new ModelManagerClass();
