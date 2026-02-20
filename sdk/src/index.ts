import axios from 'axios';
import { pipeline, env } from '@huggingface/transformers';

// @ts-ignore - Force CPU in Node.js
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.proxy = false;
}

// ─── Types ──────────────────────────────────────────────────────────

interface SlyOSConfig {
  apiKey: string;
  apiUrl?: string;
  onProgress?: ProgressCallback;
  onEvent?: EventCallback;
}

interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

interface TranscribeOptions {
  language?: string;
  returnTimestamps?: boolean;
}

type ModelCategory = 'llm' | 'stt';
type QuantizationLevel = 'q4' | 'q8' | 'fp16' | 'fp32';

interface ModelInfo {
  hfModel: string;
  task: string;
  category: ModelCategory;
  sizesMB: Record<QuantizationLevel, number>;
  minRAM_MB: Record<QuantizationLevel, number>;
}

interface DeviceProfile {
  cpuCores: number;
  memoryMB: number;
  estimatedStorageMB: number;
  platform: 'web' | 'nodejs';
  os: string;
  recommendedQuant: QuantizationLevel;
  maxContextWindow: number;
}

interface ProgressEvent {
  stage: 'initializing' | 'profiling' | 'downloading' | 'loading' | 'ready' | 'generating' | 'transcribing' | 'error';
  progress: number; // 0-100
  message: string;
  detail?: any;
}

interface SlyEvent {
  type: 'auth' | 'device_registered' | 'device_profiled' | 'model_download_start' | 'model_download_progress' | 'model_loaded' | 'inference_start' | 'inference_complete' | 'error' | 'fallback_success' | 'fallback_error';
  data?: any;
  timestamp: number;
}

type ProgressCallback = (event: ProgressEvent) => void;
type EventCallback = (event: SlyEvent) => void;

// ─── OpenAI Compatibility Types ──────────────────────────────────────

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatCompletionRequest {
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
}

interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

// ─── AWS Bedrock Compatibility Types ─────────────────────────────────

interface BedrockTextGenerationConfig {
  maxTokenCount?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

interface BedrockInvokeRequest {
  inputText: string;
  textGenerationConfig?: BedrockTextGenerationConfig;
}

interface BedrockResult {
  outputText: string;
  tokenCount: number;
}

interface BedrockInvokeResponse {
  results: BedrockResult[];
  input_text_token_count?: number;
}

// ─── Fallback Configuration ─────────────────────────────────────────

type FallbackProvider = 'openai' | 'bedrock';

interface FallbackConfig {
  provider: FallbackProvider;
  apiKey: string;
  model: string;
  region?: string; // for Bedrock
}

interface SlyOSConfigWithFallback extends SlyOSConfig {
  fallback?: FallbackConfig;
}

// ─── OpenAI Compatible Client ───────────────────────────────────────

interface OpenAICompatibleClient {
  chat: {
    completions: {
      create(request: OpenAIChatCompletionRequest & { model: string }): Promise<OpenAIChatCompletionResponse>;
    };
  };
}

// ─── RAG Types ──────────────────────────────────────────────────

interface RAGOptions {
  knowledgeBaseId: string;
  query: string;
  topK?: number;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
}

interface RAGChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  similarityScore: number;
  metadata?: Record<string, any>;
}

interface RAGResponse {
  query: string;
  retrievedChunks: RAGChunk[];
  generatedResponse: string;
  context: string;
  latencyMs: number;
  tierUsed: 1 | 2 | 3;
}

interface OfflineIndex {
  metadata: {
    kb_id: string;
    kb_name: string;
    chunk_size: number;
    embedding_dim: number;
    total_chunks: number;
    synced_at: string;
    expires_at: string;
    sync_token: string;
  };
  chunks: Array<{
    id: string;
    document_id: string;
    document_name: string;
    content: string;
    chunk_index: number;
    embedding: number[] | null;
    metadata: Record<string, any>;
  }>;
}

// ─── Model Registry ─────────────────────────────────────────────────

const modelMap: Record<string, ModelInfo> = {
  // LLM models (1B+)
  'quantum-1.7b': {
    hfModel: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
    task: 'text-generation',
    category: 'llm',
    sizesMB: { q4: 900, q8: 1700, fp16: 3400, fp32: 6800 },
    minRAM_MB: { q4: 2048, q8: 3072, fp16: 5120, fp32: 8192 },
  },
  'quantum-3b': {
    hfModel: 'Qwen/Qwen2.5-3B-Instruct',
    task: 'text-generation',
    category: 'llm',
    sizesMB: { q4: 1600, q8: 3200, fp16: 6400, fp32: 12800 },
    minRAM_MB: { q4: 3072, q8: 5120, fp16: 8192, fp32: 16384 },
  },
  'quantum-code-3b': {
    hfModel: 'Qwen/Qwen2.5-Coder-3B-Instruct',
    task: 'text-generation',
    category: 'llm',
    sizesMB: { q4: 1600, q8: 3200, fp16: 6400, fp32: 12800 },
    minRAM_MB: { q4: 3072, q8: 5120, fp16: 8192, fp32: 16384 },
  },
  'quantum-8b': {
    hfModel: 'Qwen/Qwen2.5-7B-Instruct',
    task: 'text-generation',
    category: 'llm',
    sizesMB: { q4: 4200, q8: 8400, fp16: 16800, fp32: 33600 },
    minRAM_MB: { q4: 6144, q8: 10240, fp16: 20480, fp32: 40960 },
  },
  // STT models
  'voicecore-base': {
    hfModel: 'onnx-community/whisper-base',
    task: 'automatic-speech-recognition',
    category: 'stt',
    sizesMB: { q4: 40, q8: 75, fp16: 150, fp32: 300 },
    minRAM_MB: { q4: 512, q8: 512, fp16: 1024, fp32: 2048 },
  },
  'voicecore-small': {
    hfModel: 'onnx-community/whisper-small',
    task: 'automatic-speech-recognition',
    category: 'stt',
    sizesMB: { q4: 100, q8: 200, fp16: 400, fp32: 800 },
    minRAM_MB: { q4: 1024, q8: 1024, fp16: 2048, fp32: 4096 },
  },
};

// ─── Context Window Sizing ──────────────────────────────────────────

function recommendContextWindow(memoryMB: number, quant: QuantizationLevel): number {
  // More RAM + smaller quant = larger context window
  const base = quant === 'q4' ? 1024 : quant === 'q8' ? 2048 : quant === 'fp16' ? 4096 : 8192;

  if (memoryMB >= 16384) return Math.min(base * 4, 32768);
  if (memoryMB >= 8192) return Math.min(base * 2, 16384);
  if (memoryMB >= 4096) return base;
  return Math.max(512, Math.floor(base / 2));
}

function selectQuantization(memoryMB: number, modelId: string): QuantizationLevel {
  const info = modelMap[modelId];
  if (!info) return 'q4';

  // ONNX/WASM has protobuf size limits — fp16 files >2GB crash on many systems.
  // For LLMs, cap at q4 via WASM. FP16/Q8 need native backends (llama.cpp).
  // STT models are small enough for q8/fp16.
  if (info.category === 'llm') {
    return 'q4'; // safest for ONNX/WASM across all platforms
  }

  // STT models: try from best quality down
  const quants: QuantizationLevel[] = ['fp16', 'q8', 'q4'];
  for (const q of quants) {
    if (memoryMB >= info.minRAM_MB[q]) return q;
  }
  return 'q4'; // fallback
}

// ─── Device Profiling ───────────────────────────────────────────────

async function profileDevice(): Promise<DeviceProfile> {
  const isNode = typeof window === 'undefined';
  let cpuCores = 4;
  let memoryMB = 4096;
  let estimatedStorageMB = 10000;
  let platform: 'web' | 'nodejs' = isNode ? 'nodejs' : 'web';
  let os = 'unknown';

  if (isNode) {
    // Node.js environment
    try {
      const osModule = await import('os');
      cpuCores = osModule.cpus().length;
      memoryMB = Math.round(osModule.totalmem() / (1024 * 1024));
      os = `${osModule.platform()} ${osModule.release()}`;

      // Estimate free disk via df-like check
      try {
        const { execSync } = await import('child_process');
        const dfOutput = execSync('df -m . 2>/dev/null || echo "0 0 0 0"', { encoding: 'utf-8' });
        const lines = dfOutput.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          estimatedStorageMB = parseInt(parts[3]) || 10000; // Available column
        }
      } catch {
        estimatedStorageMB = 10000;
      }
    } catch {
      // Fallback
    }
  } else {
    // Browser environment
    cpuCores = navigator.hardwareConcurrency || 4;
    memoryMB = ((navigator as any).deviceMemory || 4) * 1024; // deviceMemory is in GB
    os = navigator.userAgent;

    // Storage Manager API (Chrome 61+)
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        estimatedStorageMB = Math.round((estimate.quota || 0) / (1024 * 1024));
      }
    } catch {
      estimatedStorageMB = 5000;
    }
  }

  const recommendedQuant = selectQuantization(memoryMB, 'quantum-1.7b'); // default baseline
  const maxContextWindow = recommendContextWindow(memoryMB, recommendedQuant);

  return {
    cpuCores,
    memoryMB,
    estimatedStorageMB,
    platform,
    os,
    recommendedQuant,
    maxContextWindow,
  };
}

// ─── Main SDK Class ─────────────────────────────────────────────────

class SlyOS {
  private apiKey: string;
  private apiUrl: string;
  private deviceId: string;
  private token: string | null = null;
  private models: Map<string, any> = new Map();
  private deviceProfile: DeviceProfile | null = null;
  private onProgress: ProgressCallback | null;
  private onEvent: EventCallback | null;
  private fallbackConfig: FallbackConfig | null;

  constructor(config: SlyOSConfigWithFallback) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.slyos.world';
    this.deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.onProgress = config.onProgress || null;
    this.onEvent = config.onEvent || null;
    this.fallbackConfig = config.fallback || null;
  }

  // ── Progress & Event Helpers ────────────────────────────────────

  private emitProgress(stage: ProgressEvent['stage'], progress: number, message: string, detail?: any) {
    if (this.onProgress) {
      this.onProgress({ stage, progress, message, detail });
    }
  }

  private emitEvent(type: SlyEvent['type'], data?: any) {
    if (this.onEvent) {
      this.onEvent({ type, data, timestamp: Date.now() });
    }
  }

  // ── Device Analysis ─────────────────────────────────────────────

  async analyzeDevice(): Promise<DeviceProfile> {
    this.emitProgress('profiling', 10, 'Analyzing device capabilities...');
    this.deviceProfile = await profileDevice();
    this.emitProgress('profiling', 100, `Device: ${this.deviceProfile.cpuCores} cores, ${Math.round(this.deviceProfile.memoryMB / 1024 * 10) / 10}GB RAM`);
    this.emitEvent('device_profiled', this.deviceProfile);
    return this.deviceProfile;
  }

  getDeviceProfile(): DeviceProfile | null {
    return this.deviceProfile;
  }

  // ── Smart Model Recommendation ──────────────────────────────────

  recommendModel(category: ModelCategory = 'llm'): { modelId: string; quant: QuantizationLevel; contextWindow: number; reason: string } | null {
    if (!this.deviceProfile) {
      throw new Error('Call analyzeDevice() first to get a recommendation.');
    }

    const mem = this.deviceProfile.memoryMB;
    const candidates = Object.entries(modelMap).filter(([_, info]) => info.category === category);

    // Sort by size descending — pick the biggest model that fits
    for (const [id, info] of candidates.sort((a, b) => b[1].sizesMB.q4 - a[1].sizesMB.q4)) {
      const quant = selectQuantization(mem, id);
      if (mem >= info.minRAM_MB[quant]) {
        const ctx = recommendContextWindow(mem, quant);
        return {
          modelId: id,
          quant,
          contextWindow: ctx,
          reason: `Best model for ${Math.round(mem / 1024)}GB RAM at ${quant.toUpperCase()} precision`,
        };
      }
    }

    // Fallback to smallest
    const smallest = candidates.sort((a, b) => a[1].sizesMB.q4 - b[1].sizesMB.q4)[0];
    if (smallest) {
      return {
        modelId: smallest[0],
        quant: 'q4',
        contextWindow: 512,
        reason: 'Limited device memory — using smallest available model at Q4',
      };
    }

    return null;
  }

  // ── Initialize ──────────────────────────────────────────────────

  async initialize(): Promise<DeviceProfile> {
    this.emitProgress('initializing', 0, 'Starting SlyOS...');

    // Step 1: Profile device
    this.emitProgress('profiling', 5, 'Detecting device capabilities...');
    this.deviceProfile = await profileDevice();
    this.emitProgress('profiling', 20, `Detected: ${this.deviceProfile.cpuCores} CPU cores, ${Math.round(this.deviceProfile.memoryMB / 1024 * 10) / 10}GB RAM, ${Math.round(this.deviceProfile.estimatedStorageMB / 1024)}GB storage`);
    this.emitEvent('device_profiled', this.deviceProfile);

    // Step 2: Authenticate
    this.emitProgress('initializing', 40, 'Authenticating with API key...');
    try {
      const authRes = await axios.post(`${this.apiUrl}/api/auth/sdk`, {
        apiKey: this.apiKey,
      });
      this.token = authRes.data.token;
      this.emitProgress('initializing', 60, 'Authenticated successfully');
      this.emitEvent('auth', { success: true });
    } catch (err: any) {
      this.emitProgress('error', 0, `Authentication failed: ${err.message}`);
      this.emitEvent('error', { stage: 'auth', error: err.message });
      throw new Error(`SlyOS auth failed: ${err.response?.data?.error || err.message}`);
    }

    // Step 3: Register device with real specs
    this.emitProgress('initializing', 70, 'Registering device...');
    try {
      await axios.post(`${this.apiUrl}/api/devices/register`, {
        device_id: this.deviceId,
        platform: this.deviceProfile.platform,
        os_version: this.deviceProfile.os,
        total_memory_mb: this.deviceProfile.memoryMB,
        cpu_cores: this.deviceProfile.cpuCores,
        has_gpu: false,
        recommended_quant: this.deviceProfile.recommendedQuant,
        max_context_window: this.deviceProfile.maxContextWindow,
      }, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      this.emitProgress('initializing', 90, 'Device registered');
      this.emitEvent('device_registered', { deviceId: this.deviceId });
    } catch (err: any) {
      // Non-fatal — device registration shouldn't block usage
      this.emitProgress('initializing', 90, 'Device registration skipped (non-fatal)');
    }

    this.emitProgress('ready', 100, `SlyOS ready — recommended quantization: ${this.deviceProfile.recommendedQuant.toUpperCase()}`);

    return this.deviceProfile;
  }

  // ── Model Loading ───────────────────────────────────────────────

  getAvailableModels(): Record<string, { models: { id: string; sizesMB: Record<string, number>; minRAM_MB: Record<string, number> }[] }> {
    const grouped: Record<string, any[]> = { llm: [], stt: [] };
    for (const [id, info] of Object.entries(modelMap)) {
      if (!grouped[info.category]) grouped[info.category] = [];
      grouped[info.category].push({
        id,
        sizesMB: info.sizesMB,
        minRAM_MB: info.minRAM_MB,
      });
    }
    return Object.fromEntries(
      Object.entries(grouped).map(([cat, models]) => [cat, { models }])
    );
  }

  canRunModel(modelId: string, quant?: QuantizationLevel): { canRun: boolean; reason: string; recommendedQuant: QuantizationLevel } {
    const info = modelMap[modelId];
    if (!info) return { canRun: false, reason: `Unknown model "${modelId}"`, recommendedQuant: 'q4' };
    if (!this.deviceProfile) return { canRun: true, reason: 'Device not profiled yet — call initialize() first', recommendedQuant: 'q4' };

    const mem = this.deviceProfile.memoryMB;
    const bestQuant = selectQuantization(mem, modelId);

    if (quant && mem < info.minRAM_MB[quant]) {
      return {
        canRun: false,
        reason: `Not enough RAM for ${quant.toUpperCase()} (need ${info.minRAM_MB[quant]}MB, have ${mem}MB). Try ${bestQuant.toUpperCase()} instead.`,
        recommendedQuant: bestQuant,
      };
    }

    if (mem < info.minRAM_MB.q4) {
      return {
        canRun: false,
        reason: `Model requires at least ${info.minRAM_MB.q4}MB RAM even at Q4. Device has ${mem}MB.`,
        recommendedQuant: 'q4',
      };
    }

    return { canRun: true, reason: `OK at ${bestQuant.toUpperCase()} precision`, recommendedQuant: bestQuant };
  }

  async loadModel(modelId: string, options?: { quant?: QuantizationLevel }): Promise<void> {
    const info = modelMap[modelId];
    if (!info) {
      const available = Object.keys(modelMap).join(', ');
      throw new Error(`Unknown model "${modelId}". Available: ${available}`);
    }

    // Determine quantization
    let quant: QuantizationLevel = options?.quant || 'fp32';
    if (!options?.quant && this.deviceProfile) {
      quant = selectQuantization(this.deviceProfile.memoryMB, modelId);
      this.emitProgress('downloading', 0, `Auto-selected ${quant.toUpperCase()} quantization for your device`);
    }

    // Check feasibility
    const check = this.canRunModel(modelId, quant);
    if (!check.canRun) {
      this.emitProgress('error', 0, check.reason);
      throw new Error(check.reason);
    }

    const estimatedSize = info.sizesMB[quant];
    this.emitProgress('downloading', 0, `Downloading ${modelId} (${quant.toUpperCase()}, ~${estimatedSize}MB)...`);
    this.emitEvent('model_download_start', { modelId, quant, estimatedSizeMB: estimatedSize });

    // Map quant to dtype for HuggingFace
    const dtypeMap: Record<QuantizationLevel, string> = {
      q4: 'q4',
      q8: 'q8',
      fp16: 'fp16',
      fp32: 'fp32',
    };

    let lastReportedPercent = 0;
    const startTime = Date.now();

    try {
      const pipe = await pipeline(info.task as any, info.hfModel, {
        device: 'cpu',
        dtype: dtypeMap[quant] as any,
        progress_callback: (progressData: any) => {
          // HuggingFace transformers sends progress events during download
          if (progressData && typeof progressData === 'object') {
            let percent = 0;
            let msg = 'Downloading...';

            if (progressData.status === 'progress' && progressData.progress !== undefined) {
              percent = Math.round(progressData.progress);
              const loaded = progressData.loaded ? `${Math.round(progressData.loaded / 1024 / 1024)}MB` : '';
              const total = progressData.total ? `${Math.round(progressData.total / 1024 / 1024)}MB` : '';
              msg = loaded && total ? `Downloading: ${loaded} / ${total}` : `Downloading: ${percent}%`;
            } else if (progressData.status === 'done') {
              percent = 100;
              msg = progressData.file ? `Downloaded ${progressData.file}` : 'Download complete';
            } else if (progressData.status === 'initiate') {
              msg = progressData.file ? `Starting download: ${progressData.file}` : 'Initiating download...';
            }

            // Only emit if progress meaningfully changed (avoid flooding)
            if (percent !== lastReportedPercent || progressData.status === 'done' || progressData.status === 'initiate') {
              lastReportedPercent = percent;
              this.emitProgress('downloading', percent, msg, progressData);
              this.emitEvent('model_download_progress', { modelId, percent, ...progressData });
            }
          }
        },
      });

      const loadTime = Date.now() - startTime;
      const contextWindow = this.deviceProfile
        ? recommendContextWindow(this.deviceProfile.memoryMB, quant)
        : 2048;

      this.models.set(modelId, { pipe, info, quant, contextWindow });

      this.emitProgress('ready', 100, `${modelId} loaded (${quant.toUpperCase()}, ${(loadTime / 1000).toFixed(1)}s, ctx: ${contextWindow})`);
      this.emitEvent('model_loaded', { modelId, quant, loadTimeMs: loadTime, contextWindow });

      // Telemetry
      if (this.token) {
        await axios.post(`${this.apiUrl}/api/telemetry`, {
          device_id: this.deviceId,
          event_type: 'model_load',
          model_id: modelId,
          success: true,
          metadata: { quant, loadTimeMs: loadTime, contextWindow },
        }, {
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      }
    } catch (error: any) {
      this.emitProgress('error', 0, `Failed to load ${modelId}: ${error.message}`);
      this.emitEvent('error', { stage: 'model_load', modelId, error: error.message });

      if (this.token) {
        await axios.post(`${this.apiUrl}/api/telemetry`, {
          device_id: this.deviceId,
          event_type: 'model_load',
          model_id: modelId,
          success: false,
          error_message: error.message,
        }, {
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      }
      throw error;
    }
  }

  // ── Inference: Generate ─────────────────────────────────────────

  async generate(modelId: string, prompt: string, options: GenerateOptions = {}): Promise<string> {
    if (!this.models.has(modelId)) {
      await this.loadModel(modelId);
    }

    const { pipe, info, contextWindow } = this.models.get(modelId);
    if (info.category !== 'llm') {
      throw new Error(`Model "${modelId}" is not an LLM. Use transcribe() for STT models.`);
    }

    const maxTokens = Math.min(options.maxTokens || 100, contextWindow || 2048);

    this.emitProgress('generating', 0, `Generating response (max ${maxTokens} tokens)...`);
    this.emitEvent('inference_start', { modelId, maxTokens });
    const startTime = Date.now();

    try {
      const result = await pipe(prompt, {
        max_new_tokens: maxTokens,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        do_sample: true,
      });

      const rawOutput = result[0].generated_text;
      // HuggingFace transformers returns the prompt + generated text concatenated.
      // Strip the original prompt so we only return the NEW tokens.
      const response = rawOutput.startsWith(prompt)
        ? rawOutput.slice(prompt.length).trim()
        : rawOutput.trim();
      const latency = Date.now() - startTime;
      const tokensGenerated = response.split(/\s+/).length;
      const tokensPerSec = (tokensGenerated / (latency / 1000)).toFixed(1);

      this.emitProgress('ready', 100, `Generated ${tokensGenerated} tokens in ${(latency / 1000).toFixed(1)}s (${tokensPerSec} tok/s)`);
      this.emitEvent('inference_complete', { modelId, latencyMs: latency, tokensGenerated, tokensPerSec: parseFloat(tokensPerSec) });

      if (this.token) {
        await axios.post(`${this.apiUrl}/api/telemetry`, {
          device_id: this.deviceId,
          event_type: 'inference',
          model_id: modelId,
          latency_ms: latency,
          tokens_generated: tokensGenerated,
          success: true,
        }, {
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      }

      return response;
    } catch (error: any) {
      this.emitProgress('error', 0, `Generation failed: ${error.message}`);
      this.emitEvent('error', { stage: 'inference', modelId, error: error.message });

      if (this.token) {
        await axios.post(`${this.apiUrl}/api/telemetry`, {
          device_id: this.deviceId,
          event_type: 'inference',
          model_id: modelId,
          success: false,
          error_message: error.message,
        }, {
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      }
      throw error;
    }
  }

  // ── Inference: Transcribe ───────────────────────────────────────

  async transcribe(modelId: string, audioInput: any, options: TranscribeOptions = {}): Promise<string> {
    if (!this.models.has(modelId)) {
      await this.loadModel(modelId);
    }

    const { pipe, info } = this.models.get(modelId);
    if (info.category !== 'stt') {
      throw new Error(`Model "${modelId}" is not an STT model. Use generate() for LLMs.`);
    }

    this.emitProgress('transcribing', 0, 'Transcribing audio...');
    this.emitEvent('inference_start', { modelId, type: 'transcription' });
    const startTime = Date.now();

    try {
      const result = await pipe(audioInput, {
        language: options.language || 'en',
        return_timestamps: options.returnTimestamps || false,
      });

      const text = result.text;
      const latency = Date.now() - startTime;

      this.emitProgress('ready', 100, `Transcribed in ${(latency / 1000).toFixed(1)}s`);
      this.emitEvent('inference_complete', { modelId, latencyMs: latency, type: 'transcription' });

      if (this.token) {
        await axios.post(`${this.apiUrl}/api/telemetry`, {
          device_id: this.deviceId,
          event_type: 'inference',
          model_id: modelId,
          latency_ms: latency,
          success: true,
        }, {
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      }

      return text;
    } catch (error: any) {
      this.emitProgress('error', 0, `Transcription failed: ${error.message}`);
      this.emitEvent('error', { stage: 'transcription', modelId, error: error.message });

      if (this.token) {
        await axios.post(`${this.apiUrl}/api/telemetry`, {
          device_id: this.deviceId,
          event_type: 'inference',
          model_id: modelId,
          success: false,
          error_message: error.message,
        }, {
          headers: { Authorization: `Bearer ${this.token}` },
        }).catch(() => {});
      }
      throw error;
    }
  }

  // ── OpenAI Compatibility ────────────────────────────────────────────

  async chatCompletion(modelId: string, request: OpenAIChatCompletionRequest): Promise<OpenAIChatCompletionResponse> {
    try {
      // Convert OpenAI message format to a prompt string
      const prompt = request.messages
        .map(msg => {
          if (msg.role === 'system') {
            return `System: ${msg.content}`;
          } else if (msg.role === 'user') {
            return `User: ${msg.content}`;
          } else {
            return `Assistant: ${msg.content}`;
          }
        })
        .join('\n\n');

      const response = await this.generate(modelId, prompt, {
        temperature: request.temperature,
        maxTokens: request.max_tokens,
        topP: request.top_p,
      });

      // Estimate token counts (rough approximation: ~4 chars per token)
      const promptTokens = Math.ceil(prompt.length / 4);
      const completionTokens = Math.ceil(response.length / 4);

      return {
        id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: modelId,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: response,
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
      };
    } catch (error: any) {
      // Fallback to cloud provider if configured
      if (this.fallbackConfig?.provider === 'openai') {
        return this.fallbackToOpenAI(modelId, request);
      } else if (this.fallbackConfig?.provider === 'bedrock') {
        return this.fallbackToBedrock(modelId, request);
      }
      throw error;
    }
  }

  // ── AWS Bedrock Compatibility ──────────────────────────────────────

  async bedrockInvoke(modelId: string, request: BedrockInvokeRequest): Promise<BedrockInvokeResponse> {
    try {
      const response = await this.generate(modelId, request.inputText, {
        temperature: request.textGenerationConfig?.temperature,
        maxTokens: request.textGenerationConfig?.maxTokenCount,
        topP: request.textGenerationConfig?.topP,
      });

      // Estimate token counts
      const inputTokens = Math.ceil(request.inputText.length / 4);
      const outputTokens = Math.ceil(response.length / 4);

      return {
        results: [
          {
            outputText: response,
            tokenCount: outputTokens,
          },
        ],
        input_text_token_count: inputTokens,
      };
    } catch (error: any) {
      // Fallback to cloud provider if configured
      if (this.fallbackConfig?.provider === 'bedrock') {
        return this.fallbackToBedrockCloud(modelId, request);
      } else if (this.fallbackConfig?.provider === 'openai') {
        return this.fallbackToOpenAICloud(modelId, request);
      }
      throw error;
    }
  }

  // ── Fallback: OpenAI Cloud ────────────────────────────────────────

  private async fallbackToOpenAI(modelId: string, request: OpenAIChatCompletionRequest): Promise<OpenAIChatCompletionResponse> {
    if (!this.fallbackConfig) {
      throw new Error('OpenAI fallback not configured');
    }

    const mappedModel = this.mapModelToOpenAI(modelId);
    const payload = {
      model: this.fallbackConfig.model || mappedModel,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      frequency_penalty: request.frequency_penalty,
      presence_penalty: request.presence_penalty,
      stop: request.stop,
    };

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: {
          Authorization: `Bearer ${this.fallbackConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      this.emitEvent('fallback_success', { provider: 'openai', originalModel: modelId, mappedModel: this.fallbackConfig.model });
      return response.data;
    } catch (error: any) {
      this.emitProgress('error', 0, `OpenAI fallback failed: ${error.message}`);
      this.emitEvent('fallback_error', { provider: 'openai', error: error.message });
      throw error;
    }
  }

  private async fallbackToBedrock(modelId: string, request: OpenAIChatCompletionRequest): Promise<OpenAIChatCompletionResponse> {
    if (!this.fallbackConfig) {
      throw new Error('Bedrock fallback not configured');
    }

    // Convert OpenAI format to Bedrock's expected format (simplified)
    const lastMessage = request.messages[request.messages.length - 1];
    const inputText = lastMessage.content;

    const bedrockResponse = await this.invokeBedrockCloud(inputText, {
      temperature: request.temperature,
      maxTokenCount: request.max_tokens,
      topP: request.top_p,
    });

    // Convert Bedrock response back to OpenAI format
    const promptTokens = Math.ceil(inputText.length / 4);
    const completionTokens = bedrockResponse.results[0].tokenCount;

    this.emitEvent('fallback_success', { provider: 'bedrock', originalModel: modelId, mappedModel: this.fallbackConfig.model });

    return {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: bedrockResponse.results[0].outputText,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }

  private async fallbackToOpenAICloud(modelId: string, request: BedrockInvokeRequest): Promise<BedrockInvokeResponse> {
    if (!this.fallbackConfig) {
      throw new Error('OpenAI fallback not configured');
    }

    const mappedModel = this.mapModelToOpenAI(modelId);
    const payload = {
      model: this.fallbackConfig.model || mappedModel,
      messages: [{ role: 'user', content: request.inputText }],
      temperature: request.textGenerationConfig?.temperature,
      max_tokens: request.textGenerationConfig?.maxTokenCount,
      top_p: request.textGenerationConfig?.topP,
    };

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
        headers: {
          Authorization: `Bearer ${this.fallbackConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const outputText = response.data.choices[0].message.content;
      const inputTokens = Math.ceil(request.inputText.length / 4);
      const outputTokens = response.data.usage.completion_tokens;

      this.emitEvent('fallback_success', { provider: 'openai', originalModel: modelId, mappedModel: this.fallbackConfig.model });

      return {
        results: [
          {
            outputText,
            tokenCount: outputTokens,
          },
        ],
        input_text_token_count: inputTokens,
      };
    } catch (error: any) {
      this.emitProgress('error', 0, `OpenAI fallback failed: ${error.message}`);
      this.emitEvent('fallback_error', { provider: 'openai', error: error.message });
      throw error;
    }
  }

  private async fallbackToBedrockCloud(modelId: string, request: BedrockInvokeRequest): Promise<BedrockInvokeResponse> {
    if (!this.fallbackConfig) {
      throw new Error('Bedrock fallback not configured');
    }

    try {
      return await this.invokeBedrockCloud(request.inputText, request.textGenerationConfig);
    } catch (error: any) {
      this.emitProgress('error', 0, `Bedrock fallback failed: ${error.message}`);
      this.emitEvent('fallback_error', { provider: 'bedrock', error: error.message });
      throw error;
    }
  }

  private async invokeBedrockCloud(inputText: string, config?: BedrockTextGenerationConfig): Promise<BedrockInvokeResponse> {
    if (!this.fallbackConfig) {
      throw new Error('Bedrock fallback not configured');
    }

    const region = this.fallbackConfig.region || 'us-east-1';
    const model = this.fallbackConfig.model || 'anthropic.claude-3-sonnet-20240229-v1:0';

    // Bedrock endpoint format: https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/invoke
    const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${model}/invoke`;

    const payload = {
      inputText,
      textGenerationConfig: {
        maxTokenCount: config?.maxTokenCount || 256,
        temperature: config?.temperature || 0.7,
        topP: config?.topP || 0.9,
        topK: config?.topK,
        stopSequences: config?.stopSequences,
      },
    };

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.fallbackConfig.apiKey}`,
          'Content-Type': 'application/json',
          'X-Amz-Target': 'AmazonBedrockRuntime.InvokeModel',
        },
      });

      this.emitEvent('fallback_success', { provider: 'bedrock', model });
      return response.data;
    } catch (error: any) {
      throw new Error(`Bedrock invocation failed: ${error.message}`);
    }
  }

  private mapModelToOpenAI(slyModelId: string): string {
    const modelMapping: Record<string, string> = {
      'quantum-1.7b': 'gpt-4o-mini',
      'quantum-3b': 'gpt-4o',
      'quantum-code-3b': 'gpt-4o',
      'quantum-8b': 'gpt-4-turbo',
    };
    return modelMapping[slyModelId] || 'gpt-4o-mini';
  }

  // ═══════════════════════════════════════════════════════════
  // RAG — Retrieval Augmented Generation
  // ═══════════════════════════════════════════════════════════

  private localEmbeddingModel: any = null;
  private offlineIndexes: Map<string, OfflineIndex> = new Map();

  /**
   * Tier 2: Cloud-indexed RAG with local inference.
   * Retrieves relevant chunks from server, generates response locally.
   */
  async ragQuery(options: RAGOptions): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Retrieve relevant chunks from backend
      const searchResponse = await axios.post(
        `${this.apiUrl}/api/rag/knowledge-bases/${options.knowledgeBaseId}/query`,
        {
          query: options.query,
          top_k: options.topK || 5,
          model_id: options.modelId
        },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      const { retrieved_chunks, prompt_template, context } = searchResponse.data;

      // Step 2: Generate response locally using the augmented prompt
      const response = await this.generate(options.modelId, prompt_template, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      return {
        query: options.query,
        retrievedChunks: retrieved_chunks.map((c: any) => ({
          id: c.id,
          documentId: c.document_id,
          documentName: c.document_name,
          content: c.content,
          similarityScore: c.similarity_score,
          metadata: c.metadata
        })),
        generatedResponse: response,
        context,
        latencyMs: Date.now() - startTime,
        tierUsed: 2,
      };
    } catch (error: any) {
      this.emitEvent?.('error', { stage: 'rag_query', error: error.message });
      throw new Error(`RAG query failed: ${error.message}`);
    }
  }

  /**
   * Tier 1: Fully local RAG. Zero network calls.
   * Documents are chunked/embedded on-device, retrieval and generation all local.
   */
  async ragQueryLocal(options: RAGOptions & { documents: Array<{ content: string; name?: string }> }): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Load embedding model if needed
      if (!this.localEmbeddingModel) {
        await this.loadEmbeddingModel();
      }

      // Step 2: Chunk documents if not already chunked
      const allChunks: Array<{ content: string; documentName: string; embedding?: number[] }> = [];
      for (const doc of options.documents) {
        const chunks = this.chunkTextLocal(doc.content, 512, 128);
        for (const chunk of chunks) {
          const embedding = await this.embedTextLocal(chunk);
          allChunks.push({ content: chunk, documentName: doc.name || 'Document', embedding });
        }
      }

      // Step 3: Embed query
      const queryEmbedding = await this.embedTextLocal(options.query);

      // Step 4: Cosine similarity search
      const scored = allChunks
        .filter(c => c.embedding)
        .map(c => ({
          ...c,
          similarityScore: this.cosineSimilarity(queryEmbedding, c.embedding!)
        }))
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, options.topK || 5);

      // Step 5: Build context
      const context = scored.map(c => `[Source: ${c.documentName}]\n${c.content}`).join('\n\n---\n\n');
      const prompt = `You are a helpful assistant. Answer based ONLY on the following context:\n\n${context}\n\nQuestion: ${options.query}\n\nAnswer:`;

      // Step 6: Generate locally
      const response = await this.generate(options.modelId, prompt, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      return {
        query: options.query,
        retrievedChunks: scored.map((c, i) => ({
          id: `local-${i}`,
          documentId: 'local',
          documentName: c.documentName,
          content: c.content,
          similarityScore: c.similarityScore,
          metadata: {}
        })),
        generatedResponse: response,
        context,
        latencyMs: Date.now() - startTime,
        tierUsed: 1,
      };
    } catch (error: any) {
      this.emitEvent?.('error', { stage: 'rag_local', error: error.message });
      throw new Error(`Local RAG failed: ${error.message}`);
    }
  }

  /**
   * Tier 3: Offline RAG using a synced knowledge base.
   * First call syncKnowledgeBase(), then use this for offline queries.
   */
  async ragQueryOffline(options: RAGOptions): Promise<RAGResponse> {
    const startTime = Date.now();

    const index = this.offlineIndexes.get(options.knowledgeBaseId);
    if (!index) {
      throw new Error(`Knowledge base "${options.knowledgeBaseId}" not synced. Call syncKnowledgeBase() first.`);
    }

    // Check expiry
    if (new Date(index.metadata.expires_at) < new Date()) {
      throw new Error('Offline index has expired. Please re-sync.');
    }

    try {
      // Load embedding model
      if (!this.localEmbeddingModel) {
        await this.loadEmbeddingModel();
      }

      // Embed query
      const queryEmbedding = await this.embedTextLocal(options.query);

      // Search offline index
      const scored = index.chunks
        .filter(c => c.embedding && c.embedding.length > 0)
        .map(c => ({
          ...c,
          similarityScore: this.cosineSimilarity(queryEmbedding, c.embedding!)
        }))
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, options.topK || 5);

      // Build context
      const context = scored.map(c => `[Source: ${c.document_name}]\n${c.content}`).join('\n\n---\n\n');
      const prompt = `You are a helpful assistant. Answer based ONLY on the following context:\n\n${context}\n\nQuestion: ${options.query}\n\nAnswer:`;

      // Generate locally
      const response = await this.generate(options.modelId, prompt, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });

      return {
        query: options.query,
        retrievedChunks: scored.map(c => ({
          id: c.id,
          documentId: c.document_id,
          documentName: c.document_name,
          content: c.content,
          similarityScore: c.similarityScore,
          metadata: c.metadata
        })),
        generatedResponse: response,
        context,
        latencyMs: Date.now() - startTime,
        tierUsed: 3,
      };
    } catch (error: any) {
      this.emitEvent?.('error', { stage: 'rag_offline', error: error.message });
      throw new Error(`Offline RAG failed: ${error.message}`);
    }
  }

  /**
   * Sync a knowledge base for offline use (Tier 3).
   * Downloads chunks + embeddings from server, stores locally.
   */
  async syncKnowledgeBase(knowledgeBaseId: string, deviceId?: string): Promise<{ chunkCount: number; sizeMb: number; expiresAt: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/rag/knowledge-bases/${knowledgeBaseId}/sync`,
        { device_id: deviceId || this.deviceId || 'sdk-device' },
        { headers: { Authorization: `Bearer ${this.token}` } }
      );

      const { sync_package, chunk_count, package_size_mb, expires_at } = response.data;
      this.offlineIndexes.set(knowledgeBaseId, sync_package);

      return {
        chunkCount: chunk_count,
        sizeMb: package_size_mb,
        expiresAt: expires_at
      };
    } catch (error: any) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  // --- RAG Helper Methods ---

  private async loadEmbeddingModel(): Promise<void> {
    this.emitProgress?.('downloading', 0, 'Loading embedding model (all-MiniLM-L6-v2)...');
    try {
      const { pipeline } = await import('@huggingface/transformers');
      this.localEmbeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this.emitProgress?.('ready', 100, 'Embedding model loaded');
    } catch (error: any) {
      this.emitProgress?.('error', 0, `Embedding model failed: ${error.message}`);
      throw error;
    }
  }

  private async embedTextLocal(text: string): Promise<number[]> {
    if (!this.localEmbeddingModel) throw new Error('Embedding model not loaded');
    const result = await this.localEmbeddingModel(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private chunkTextLocal(text: string, chunkSize: number = 512, overlap: number = 128): string[] {
    if (!text || text.length === 0) return [];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      if (end < text.length) {
        const bp = Math.max(text.lastIndexOf('.', end), text.lastIndexOf('\n', end));
        if (bp > start + chunkSize / 2) end = bp + 1;
      }
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 20) chunks.push(chunk);
      start = end - overlap;
      if (start >= text.length) break;
    }
    return chunks;
  }

  // ── Static OpenAI Compatible Factory ────────────────────────────────

  static openaiCompatible(config: { apiKey: string; apiUrl?: string; fallback?: FallbackConfig }): OpenAICompatibleClient {
    const instance = new SlyOS({
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      fallback: { ...config.fallback, provider: config.fallback?.provider || 'openai' } as FallbackConfig,
    });

    return {
      chat: {
        completions: {
          async create(request: OpenAIChatCompletionRequest & { model: string }): Promise<OpenAIChatCompletionResponse> {
            const { model, ...chatRequest } = request;
            return instance.chatCompletion(model, chatRequest);
          },
        },
      },
    };
  }
}

export default SlyOS;
export type {
  SlyOSConfig,
  SlyOSConfigWithFallback,
  GenerateOptions,
  TranscribeOptions,
  DeviceProfile,
  ProgressEvent,
  SlyEvent,
  QuantizationLevel,
  ModelCategory,
  OpenAIMessage,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionResponse,
  OpenAIChoice,
  OpenAIUsage,
  BedrockTextGenerationConfig,
  BedrockInvokeRequest,
  BedrockInvokeResponse,
  BedrockResult,
  FallbackConfig,
  FallbackProvider,
  OpenAICompatibleClient,
  RAGOptions,
  RAGChunk,
  RAGResponse,
  OfflineIndex,
};
