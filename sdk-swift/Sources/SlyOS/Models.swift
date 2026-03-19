import Foundation

// MARK: - Enumerations

/// Quantization level for model loading. Higher values = better quality but larger file size and higher RAM usage.
public enum QuantizationLevel: String, CaseIterable, Codable, Sendable {
    /// 4-bit quantization - smallest models, ~1-4GB
    case q4
    /// 8-bit quantization - medium models, ~1.7-8GB
    case q8
    /// 16-bit float precision - large models, ~3-17GB
    case fp16
    /// 32-bit float precision - largest models, ~6-33GB
    case fp32
}

/// Model category for filtering and recommendations
public enum ModelCategory: String, CaseIterable, Codable, Sendable {
    /// Large Language Model for text generation
    case llm
    /// Speech-to-Text model for audio transcription
    case stt
}

/// Provider for fallback cloud inference
public enum FallbackProvider: String, Codable, Sendable {
    case openai
    case bedrock
}

/// Progress stage during initialization and operations
public enum ProgressStage: String, Sendable {
    case initializing
    case profiling
    case downloading
    case loading
    case ready
    case generating
    case transcribing
    case error
}

/// Event type for telemetry tracking
public enum SlyEventType: String, Sendable {
    case auth
    case deviceRegistered = "device_registered"
    case deviceProfiled = "device_profiled"
    case modelDownloadStart = "model_download_start"
    case modelDownloadProgress = "model_download_progress"
    case modelLoaded = "model_loaded"
    case inferenceStart = "inference_start"
    case inferenceComplete = "inference_complete"
    case error
    case fallbackSuccess = "fallback_success"
    case fallbackError = "fallback_error"
}

// MARK: - Configuration Structures

/// Main configuration for initializing the SlyOS SDK
public struct SlyOSConfig: Sendable {
    /// API key for SlyOS authentication
    public let apiKey: String

    /// API endpoint URL (defaults to https://api.slyos.world)
    public var apiUrl: String = "https://api.slyos.world"

    /// Optional callback for progress updates
    public var onProgress: ((ProgressEvent) -> Void)?

    /// Optional callback for event tracking
    public var onEvent: ((SlyEvent) -> Void)?

    /// Optional fallback configuration for cloud providers
    public var fallbackConfig: FallbackConfig?

    /// Initialize configuration
    public init(
        apiKey: String,
        apiUrl: String = "https://api.slyos.world",
        onProgress: ((ProgressEvent) -> Void)? = nil,
        onEvent: ((SlyEvent) -> Void)? = nil,
        fallbackConfig: FallbackConfig? = nil
    ) {
        self.apiKey = apiKey
        self.apiUrl = apiUrl
        self.onProgress = onProgress
        self.onEvent = onEvent
        self.fallbackConfig = fallbackConfig
    }
}

/// Fallback configuration for cloud providers
public struct FallbackConfig: Sendable {
    /// Cloud provider to use as fallback
    public let provider: FallbackProvider

    /// API key for the fallback provider
    public let apiKey: String

    /// Model ID for the fallback provider
    public let model: String

    /// AWS region for Bedrock (e.g., "us-east-1")
    public var region: String?

    public init(
        provider: FallbackProvider,
        apiKey: String,
        model: String,
        region: String? = nil
    ) {
        self.provider = provider
        self.apiKey = apiKey
        self.model = model
        self.region = region
    }
}

// MARK: - Device Profiling

/// Device capabilities and profiling information
public struct DeviceProfile: Sendable, Codable {
    /// Number of CPU cores available
    public let cpuCores: Int

    /// Total system RAM in MB
    public let memoryMB: Int

    /// Estimated available storage in MB
    public let estimatedStorageMB: Int

    /// Device platform ("iOS" or "macOS")
    public let platform: String

    /// Operating system version string
    public let osVersion: String

    /// Recommended quantization level based on device capabilities
    public let recommendedQuant: QuantizationLevel

    /// Maximum recommended context window for inference
    public let maxContextWindow: Int

    // Enhanced device intelligence fields
    /// GPU name from Metal (e.g., "Apple M2 Pro", "Apple A17 Pro GPU")
    public var gpuName: String?

    /// Estimated GPU VRAM in MB
    public var gpuVramMB: Int?

    /// Screen width in pixels
    public var screenWidth: Int?

    /// Screen height in pixels
    public var screenHeight: Int?

    /// Screen pixel ratio (Retina scale factor)
    public var pixelRatio: Float?
}

// MARK: - Model Information

/// Information about an available model
public struct ModelInfo: Sendable, Codable {
    /// HuggingFace model identifier
    public let hfModel: String

    /// Task type (e.g., "text-generation", "automatic-speech-recognition")
    public let task: String

    /// Model category
    public let category: ModelCategory

    /// Model sizes in MB for each quantization level
    public let sizesMB: [QuantizationLevel: Int]

    /// Minimum RAM required in MB for each quantization level
    public let minRAM_MB: [QuantizationLevel: Int]
}

/// Model recommendation based on device capabilities
public struct ModelRecommendation: Sendable {
    /// Recommended model ID
    public let modelId: String

    /// Recommended quantization level
    public let quantizationLevel: QuantizationLevel

    /// Maximum context window for this configuration
    public let contextWindow: Int

    /// Explanation of why this model was recommended
    public let reason: String
}

// MARK: - Inference Options

/// Options for text generation
public struct GenerateOptions: Sendable {
    /// Sampling temperature (0.0-2.0), controls randomness. Higher = more creative
    public var temperature: Float?

    /// Maximum number of tokens to generate
    public var maxTokens: Int?

    /// Nucleus sampling parameter (0.0-1.0), controls diversity
    public var topP: Float?

    public init(
        temperature: Float? = nil,
        maxTokens: Int? = nil,
        topP: Float? = nil
    ) {
        self.temperature = temperature
        self.maxTokens = maxTokens
        self.topP = topP
    }
}

// MARK: - OpenAI Compatible Types

/// Message in OpenAI chat format
public struct ChatMessage: Sendable, Codable {
    /// Role: "system", "user", or "assistant"
    public let role: String

    /// Message content
    public let content: String

    public init(role: String, content: String) {
        self.role = role
        self.content = content
    }
}

/// Chat completion request (OpenAI compatible)
public struct ChatCompletionRequest: Sendable, Codable {
    /// Array of messages in the conversation
    public let messages: [ChatMessage]

    /// Temperature for sampling
    public var temperature: Float?

    /// Nucleus sampling parameter
    public var topP: Float?

    /// Maximum tokens to generate
    public var maxTokens: Int?

    /// Frequency penalty
    public var frequencyPenalty: Float?

    /// Presence penalty
    public var presencePenalty: Float?

    /// Stop sequences
    public var stop: [String]?

    public init(
        messages: [ChatMessage],
        temperature: Float? = nil,
        topP: Float? = nil,
        maxTokens: Int? = nil,
        frequencyPenalty: Float? = nil,
        presencePenalty: Float? = nil,
        stop: [String]? = nil
    ) {
        self.messages = messages
        self.temperature = temperature
        self.topP = topP
        self.maxTokens = maxTokens
        self.frequencyPenalty = frequencyPenalty
        self.presencePenalty = presencePenalty
        self.stop = stop
    }
}

/// Chat choice in completion response
public struct ChatChoice: Sendable, Codable {
    public let index: Int
    public let message: ChatMessage
    public let finishReason: String

    enum CodingKeys: String, CodingKey {
        case index
        case message
        case finishReason = "finish_reason"
    }
}

/// Token usage information
public struct TokenUsage: Sendable, Codable {
    public let promptTokens: Int
    public let completionTokens: Int
    public let totalTokens: Int

    enum CodingKeys: String, CodingKey {
        case promptTokens = "prompt_tokens"
        case completionTokens = "completion_tokens"
        case totalTokens = "total_tokens"
    }
}

/// Chat completion response (OpenAI compatible)
public struct ChatCompletionResponse: Sendable, Codable {
    public let id: String
    public let object: String
    public let created: Int
    public let model: String
    public let choices: [ChatChoice]
    public let usage: TokenUsage
}

// MARK: - Events and Progress

/// Progress update event
public struct ProgressEvent: Sendable {
    /// Current stage
    public let stage: ProgressStage

    /// Progress percentage (0-100)
    public let progress: Int

    /// Human-readable progress message
    public let message: String

    /// Additional details (model-dependent)
    public var detail: Any?
}

/// Telemetry event
public struct SlyEvent: Sendable {
    /// Event type
    public let type: SlyEventType

    /// Event data (model-dependent)
    public var data: [String: AnySendable]?

    /// Event timestamp (milliseconds since epoch)
    public let timestamp: Int
}

/// Type-erased sendable value for event data
public enum AnySendable: Sendable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null

    /// Convenience initializer from String
    public init(_ value: String) { self = .string(value) }
    /// Convenience initializer from Int
    public init(_ value: Int) { self = .int(value) }
    /// Convenience initializer from Double
    public init(_ value: Double) { self = .double(value) }
    /// Convenience initializer from Bool
    public init(_ value: Bool) { self = .bool(value) }
}

// MARK: - AWS Bedrock Types

/// Bedrock text generation configuration
public struct BedrockTextGenerationConfig: Sendable, Codable {
    public var maxTokenCount: Int?
    public var temperature: Float?
    public var topP: Float?
    public var topK: Int?
    public var stopSequences: [String]?

    public init(
        maxTokenCount: Int? = nil,
        temperature: Float? = nil,
        topP: Float? = nil,
        topK: Int? = nil,
        stopSequences: [String]? = nil
    ) {
        self.maxTokenCount = maxTokenCount
        self.temperature = temperature
        self.topP = topP
        self.topK = topK
        self.stopSequences = stopSequences
    }
}

/// Bedrock invoke request
public struct BedrockInvokeRequest: Sendable, Codable {
    public let inputText: String
    public var textGenerationConfig: BedrockTextGenerationConfig?

    enum CodingKeys: String, CodingKey {
        case inputText
        case textGenerationConfig
    }

    public init(
        inputText: String,
        textGenerationConfig: BedrockTextGenerationConfig? = nil
    ) {
        self.inputText = inputText
        self.textGenerationConfig = textGenerationConfig
    }
}

/// Bedrock inference result
public struct BedrockResult: Sendable, Codable {
    public let outputText: String
    public let tokenCount: Int

    enum CodingKeys: String, CodingKey {
        case outputText
        case tokenCount
    }
}

/// Bedrock invoke response
public struct BedrockInvokeResponse: Sendable, Codable {
    public let results: [BedrockResult]
    public let inputTextTokenCount: Int?

    enum CodingKeys: String, CodingKey {
        case results
        case inputTextTokenCount = "input_text_token_count"
    }
}

// MARK: - RAG Types

/// Options for RAG (Retrieval-Augmented Generation) queries
public struct RAGOptions: Sendable {
    public let knowledgeBaseId: String
    public let query: String
    public var topK: Int?
    public let modelId: String
    public var temperature: Float?
    public var maxTokens: Int?
    /// Streaming callback — called for each generated token
    public var onToken: (@Sendable (String, String) -> Void)?

    public init(
        knowledgeBaseId: String,
        query: String,
        topK: Int? = nil,
        modelId: String,
        temperature: Float? = nil,
        maxTokens: Int? = nil,
        onToken: (@Sendable (String, String) -> Void)? = nil
    ) {
        self.knowledgeBaseId = knowledgeBaseId
        self.query = query
        self.topK = topK
        self.modelId = modelId
        self.temperature = temperature
        self.maxTokens = maxTokens
        self.onToken = onToken
    }
}

/// A retrieved chunk from RAG
public struct RAGChunk: Sendable, Codable {
    public let id: String
    public let documentId: String
    public let documentName: String
    public let content: String
    public let similarityScore: Double
    public var metadata: [String: String]?

    enum CodingKeys: String, CodingKey {
        case id
        case documentId = "document_id"
        case documentName = "document_name"
        case content
        case similarityScore = "similarity_score"
        case metadata
    }
}

/// Response from a RAG query
public struct RAGResponse: Sendable {
    /// The original query
    public let query: String
    /// Retrieved chunks used for context
    public let retrievedChunks: [RAGChunk]
    /// The generated response
    public let generatedResponse: String
    /// The context string passed to the model
    public let context: String
    /// Total latency in milliseconds
    public let latencyMs: Int
    /// Which RAG tier was used (1=local, 2=cloud-indexed, 3=offline)
    public let tierUsed: Int
    /// Detailed timing breakdown
    public let timing: RAGTiming
    /// Dynamic configuration used for this query
    public let config: RAGConfig
}

/// Detailed timing metrics for RAG queries
public struct RAGTiming: Sendable {
    /// Time spent retrieving/embedding chunks
    public let retrievalMs: Int
    /// Time spent building context
    public let contextBuildMs: Int
    /// Time to first generated token
    public let firstTokenMs: Int
    /// Total generation time
    public let generationMs: Int
    /// End-to-end total time
    public let totalMs: Int
    /// Number of tokens generated
    public let tokensGenerated: Int
    /// Generation throughput
    public let tokensPerSecond: Double
}

/// Dynamic RAG configuration computed from device profile
public struct RAGConfig: Sendable {
    public let maxContextChars: Int
    public let maxGenTokens: Int
    public let chunkSize: Int
    public let topK: Int
    public let contextWindowUsed: Int
    public let deviceTier: DeviceTier
}

/// Device capability tier
public enum DeviceTier: String, Sendable {
    case low
    case mid
    case high
}

/// Options for local RAG with user-provided documents
public struct RAGLocalOptions: Sendable {
    public let query: String
    public let documents: [RAGDocument]
    public let modelId: String
    public var temperature: Float?
    public var maxTokens: Int?
    public var onToken: (@Sendable (String, String) -> Void)?

    public init(
        query: String,
        documents: [RAGDocument],
        modelId: String,
        temperature: Float? = nil,
        maxTokens: Int? = nil,
        onToken: (@Sendable (String, String) -> Void)? = nil
    ) {
        self.query = query
        self.documents = documents
        self.modelId = modelId
        self.temperature = temperature
        self.maxTokens = maxTokens
        self.onToken = onToken
    }
}

/// A document for local RAG
public struct RAGDocument: Sendable {
    public let content: String
    public let name: String?

    public init(content: String, name: String? = nil) {
        self.content = content
        self.name = name
    }
}

/// Offline knowledge base index for tier-3 RAG
public struct OfflineIndex: Sendable {
    public let kbId: String
    public let kbName: String
    public let totalChunks: Int
    public let syncedAt: String
    public let expiresAt: String
    public let chunks: [OfflineChunk]
}

/// A chunk in the offline index
public struct OfflineChunk: Sendable {
    public let id: String
    public let documentId: String
    public let documentName: String
    public let content: String
    public let chunkIndex: Int
}

// MARK: - Error Types

/// SlyOS SDK errors
public enum SlyOSError: LocalizedError, Sendable {
    case authenticationFailed(String)
    case modelNotFound(String)
    case insufficientMemory(required: Int)
    case modelLoadingFailed(String)
    case inferenceFailed(String)
    case networkError(String)
    case deviceNotInitialized
    case invalidConfiguration(String)

    public var errorDescription: String? {
        switch self {
        case .authenticationFailed(let msg):
            return "Authentication failed: \(msg)"
        case .modelNotFound(let modelId):
            return "Model not found: \(modelId)"
        case .insufficientMemory(let required):
            return "Insufficient memory. Required: \(required)MB"
        case .modelLoadingFailed(let msg):
            return "Model loading failed: \(msg)"
        case .inferenceFailed(let msg):
            return "Inference failed: \(msg)"
        case .networkError(let msg):
            return "Network error: \(msg)"
        case .deviceNotInitialized:
            return "Device not initialized. Call initialize() first"
        case .invalidConfiguration(let msg):
            return "Invalid configuration: \(msg)"
        }
    }
}

// MARK: - Model Registry

/// Built-in model registry with all available models
let modelRegistry: [String: ModelInfo] = [
    // LLM Models
    "quantum-1.7b": ModelInfo(
        hfModel: "HuggingFaceTB/SmolLM2-1.7B-Instruct",
        task: "text-generation",
        category: .llm,
        sizesMB: [.q4: 900, .q8: 1700, .fp16: 3400, .fp32: 6800],
        minRAM_MB: [.q4: 2048, .q8: 3072, .fp16: 5120, .fp32: 8192]
    ),
    "quantum-3b": ModelInfo(
        hfModel: "Qwen/Qwen2.5-3B-Instruct",
        task: "text-generation",
        category: .llm,
        sizesMB: [.q4: 1600, .q8: 3200, .fp16: 6400, .fp32: 12800],
        minRAM_MB: [.q4: 3072, .q8: 5120, .fp16: 8192, .fp32: 16384]
    ),
    "quantum-code-3b": ModelInfo(
        hfModel: "Qwen/Qwen2.5-Coder-3B-Instruct",
        task: "text-generation",
        category: .llm,
        sizesMB: [.q4: 1600, .q8: 3200, .fp16: 6400, .fp32: 12800],
        minRAM_MB: [.q4: 3072, .q8: 5120, .fp16: 8192, .fp32: 16384]
    ),
    "quantum-8b": ModelInfo(
        hfModel: "Qwen/Qwen2.5-7B-Instruct",
        task: "text-generation",
        category: .llm,
        sizesMB: [.q4: 4200, .q8: 8400, .fp16: 16800, .fp32: 33600],
        minRAM_MB: [.q4: 6144, .q8: 10240, .fp16: 20480, .fp32: 40960]
    ),

    // STT Models
    "voicecore-base": ModelInfo(
        hfModel: "onnx-community/whisper-base",
        task: "automatic-speech-recognition",
        category: .stt,
        sizesMB: [.q4: 40, .q8: 75, .fp16: 150, .fp32: 300],
        minRAM_MB: [.q4: 512, .q8: 512, .fp16: 1024, .fp32: 2048]
    ),
    "voicecore-small": ModelInfo(
        hfModel: "onnx-community/whisper-small",
        task: "automatic-speech-recognition",
        category: .stt,
        sizesMB: [.q4: 100, .q8: 200, .fp16: 400, .fp32: 800],
        minRAM_MB: [.q4: 1024, .q8: 1024, .fp16: 2048, .fp32: 4096]
    )
]
