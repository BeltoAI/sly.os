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
    progress: number;
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
type FallbackProvider = 'openai' | 'bedrock';
interface FallbackConfig {
    provider: FallbackProvider;
    apiKey: string;
    model: string;
    region?: string;
}
interface SlyOSConfigWithFallback extends SlyOSConfig {
    fallback?: FallbackConfig;
}
interface OpenAICompatibleClient {
    chat: {
        completions: {
            create(request: OpenAIChatCompletionRequest & {
                model: string;
            }): Promise<OpenAIChatCompletionResponse>;
        };
    };
}
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
declare class SlyOS {
    private apiKey;
    private apiUrl;
    private deviceId;
    private token;
    private models;
    private deviceProfile;
    private onProgress;
    private onEvent;
    private fallbackConfig;
    constructor(config: SlyOSConfigWithFallback);
    private emitProgress;
    private emitEvent;
    analyzeDevice(): Promise<DeviceProfile>;
    getDeviceProfile(): DeviceProfile | null;
    recommendModel(category?: ModelCategory): {
        modelId: string;
        quant: QuantizationLevel;
        contextWindow: number;
        reason: string;
    } | null;
    initialize(): Promise<DeviceProfile>;
    getAvailableModels(): Record<string, {
        models: {
            id: string;
            sizesMB: Record<string, number>;
            minRAM_MB: Record<string, number>;
        }[];
    }>;
    canRunModel(modelId: string, quant?: QuantizationLevel): {
        canRun: boolean;
        reason: string;
        recommendedQuant: QuantizationLevel;
    };
    loadModel(modelId: string, options?: {
        quant?: QuantizationLevel;
    }): Promise<void>;
    generate(modelId: string, prompt: string, options?: GenerateOptions): Promise<string>;
    transcribe(modelId: string, audioInput: any, options?: TranscribeOptions): Promise<string>;
    chatCompletion(modelId: string, request: OpenAIChatCompletionRequest): Promise<OpenAIChatCompletionResponse>;
    bedrockInvoke(modelId: string, request: BedrockInvokeRequest): Promise<BedrockInvokeResponse>;
    private fallbackToOpenAI;
    private fallbackToBedrock;
    private fallbackToOpenAICloud;
    private fallbackToBedrockCloud;
    private invokeBedrockCloud;
    private mapModelToOpenAI;
    private localEmbeddingModel;
    private offlineIndexes;
    /**
     * Tier 2: Cloud-indexed RAG with local inference.
     * Retrieves relevant chunks from server, generates response locally.
     */
    ragQuery(options: RAGOptions): Promise<RAGResponse>;
    /**
     * Tier 1: Fully local RAG. Zero network calls.
     * Documents are chunked/embedded on-device, retrieval and generation all local.
     */
    ragQueryLocal(options: RAGOptions & {
        documents: Array<{
            content: string;
            name?: string;
        }>;
    }): Promise<RAGResponse>;
    /**
     * Tier 3: Offline RAG using a synced knowledge base.
     * First call syncKnowledgeBase(), then use this for offline queries.
     */
    ragQueryOffline(options: RAGOptions): Promise<RAGResponse>;
    /**
     * Sync a knowledge base for offline use (Tier 3).
     * Downloads chunks + embeddings from server, stores locally.
     */
    syncKnowledgeBase(knowledgeBaseId: string, deviceId?: string): Promise<{
        chunkCount: number;
        sizeMb: number;
        expiresAt: string;
    }>;
    private loadEmbeddingModel;
    private embedTextLocal;
    private cosineSimilarity;
    private chunkTextLocal;
    static openaiCompatible(config: {
        apiKey: string;
        apiUrl?: string;
        fallback?: FallbackConfig;
    }): OpenAICompatibleClient;
}
export default SlyOS;
export type { SlyOSConfig, SlyOSConfigWithFallback, GenerateOptions, TranscribeOptions, DeviceProfile, ProgressEvent, SlyEvent, QuantizationLevel, ModelCategory, OpenAIMessage, OpenAIChatCompletionRequest, OpenAIChatCompletionResponse, OpenAIChoice, OpenAIUsage, BedrockTextGenerationConfig, BedrockInvokeRequest, BedrockInvokeResponse, BedrockResult, FallbackConfig, FallbackProvider, OpenAICompatibleClient, RAGOptions, RAGChunk, RAGResponse, OfflineIndex, };
