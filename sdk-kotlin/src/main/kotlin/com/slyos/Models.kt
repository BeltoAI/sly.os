package com.slyos

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

// ─── Enumerations ────────────────────────────────────────────────────

/**
 * Quantization levels for model compression.
 * Lower bit depths reduce model size and memory usage at the cost of precision.
 */
enum class QuantizationLevel {
    /** 4-bit quantization - smallest models, fastest inference, lowest precision */
    Q4,
    /** 8-bit quantization - balanced between size and precision */
    Q8,
    /** 16-bit float - higher precision, larger models */
    FP16,
    /** 32-bit float - full precision, largest models, slowest inference */
    FP32;

    /**
     * Get the string representation for API calls
     */
    fun toQueryString(): String = this.name.lowercase()
}

/**
 * Categories of ML models supported by SlyOS
 */
enum class ModelCategory {
    /** Large Language Models for text generation */
    LLM,
    /** Speech-to-Text models for audio transcription */
    STT;

    fun toQueryString(): String = this.name.lowercase()
}

/**
 * Stages in the SDK lifecycle for progress reporting
 */
enum class ProgressStage {
    INITIALIZING,
    PROFILING,
    DOWNLOADING,
    LOADING,
    READY,
    GENERATING,
    TRANSCRIBING,
    ERROR
}

/**
 * Event types for telemetry and monitoring
 */
enum class EventType {
    AUTH,
    DEVICE_REGISTERED,
    DEVICE_PROFILED,
    MODEL_DOWNLOAD_START,
    MODEL_DOWNLOAD_PROGRESS,
    MODEL_LOADED,
    INFERENCE_START,
    INFERENCE_COMPLETE,
    ERROR,
    FALLBACK_SUCCESS,
    FALLBACK_ERROR
}

// ─── Configuration Classes ────────────────────────────────────────────

/**
 * Configuration for SlyOS SDK initialization
 *
 * @property apiKey Your SlyOS API key for authentication
 * @property apiUrl The base URL for the SlyOS API (defaults to https://api.slyos.world)
 * @property onProgress Callback for progress updates during operations
 * @property onEvent Callback for SDK lifecycle events
 */
@Serializable
data class SlyOSConfig(
    val apiKey: String,
    val apiUrl: String = "https://api.slyos.world",
    val onProgress: ((ProgressEvent) -> Unit)? = null,
    val onEvent: ((SlyEvent) -> Unit)? = null
)

/**
 * Extended configuration with fallback provider support
 */
@Serializable
data class SlyOSConfigWithFallback(
    val apiKey: String,
    val apiUrl: String = "https://api.slyos.world",
    val onProgress: ((ProgressEvent) -> Unit)? = null,
    val onEvent: ((SlyEvent) -> Unit)? = null,
    val fallback: FallbackConfig? = null
)

/**
 * Fallback configuration for cloud providers when on-device inference fails
 *
 * @property provider The cloud provider to use (openai or bedrock)
 * @property apiKey API key for the fallback provider
 * @property model Model identifier at the fallback provider
 * @property region AWS region (for Bedrock)
 */
@Serializable
data class FallbackConfig(
    val provider: String, // 'openai' or 'bedrock'
    val apiKey: String,
    val model: String,
    val region: String? = null
)

// ─── Device Profiling ────────────────────────────────────────────────

/**
 * Device capabilities and hardware profile for optimization
 *
 * @property cpuCores Number of CPU cores available
 * @property memoryMB Total system RAM in megabytes
 * @property estimatedStorageMB Available storage in megabytes
 * @property platform Platform identifier (android)
 * @property os Full OS version string
 * @property osVersion Android API level
 * @property recommendedQuant Automatically selected quantization level
 * @property maxContextWindow Maximum supported context window for LLMs
 */
@Serializable
data class DeviceProfile(
    val cpuCores: Int,
    val memoryMB: Int,
    val estimatedStorageMB: Int,
    val platform: String,
    val os: String,
    val osVersion: Int? = null,
    val recommendedQuant: QuantizationLevel,
    val maxContextWindow: Int,
    val hasGPU: Boolean = false
)

// ─── Model Information ───────────────────────────────────────────────

/**
 * Metadata about an available model
 *
 * @property hfModel HuggingFace model identifier
 * @property task The ML task this model performs
 * @property category Category of the model (LLM or STT)
 * @property sizesMB Model sizes for each quantization level in MB
 * @property minRAM_MB Minimum RAM requirements for each quantization level
 */
@Serializable
data class ModelInfo(
    val hfModel: String,
    val task: String,
    val category: ModelCategory,
    val sizesMB: Map<String, Int>,
    val minRAM_MB: Map<String, Int>
)

/**
 * Recommendation for a suitable model based on device capabilities
 *
 * @property modelId Model identifier
 * @property quant Recommended quantization level
 * @property contextWindow Max context window for this model/device combo
 * @property reason Human-readable explanation for the recommendation
 */
data class ModelRecommendation(
    val modelId: String,
    val quant: QuantizationLevel,
    val contextWindow: Int,
    val reason: String
)

// ─── Progress and Events ────────────────────────────────────────────

/**
 * Progress event for long-running operations
 *
 * @property stage Current operation stage
 * @property progress Progress percentage (0-100)
 * @property message Human-readable status message
 * @property detail Additional metadata about the operation
 */
data class ProgressEvent(
    val stage: ProgressStage,
    val progress: Int,
    val message: String,
    val detail: Any? = null
)

/**
 * SDK lifecycle event for monitoring and telemetry
 *
 * @property type Type of event that occurred
 * @property data Event-specific metadata
 * @property timestamp Unix timestamp when the event occurred
 */
data class SlyEvent(
    val type: EventType,
    val data: Any? = null,
    val timestamp: Long = System.currentTimeMillis()
)

// ─── Inference Options ──────────────────────────────────────────────

/**
 * Options for text generation inference
 *
 * @property temperature Controls randomness (0.0-2.0), higher = more random
 * @property maxTokens Maximum tokens to generate
 * @property topP Nucleus sampling parameter (0.0-1.0)
 */
@Serializable
data class GenerateOptions(
    val temperature: Double? = null,
    val maxTokens: Int? = null,
    val topP: Double? = null
)

/**
 * Options for speech-to-text transcription
 *
 * @property language Language code (e.g., 'en', 'fr')
 * @property returnTimestamps Whether to include timestamp information
 */
@Serializable
data class TranscribeOptions(
    val language: String? = null,
    val returnTimestamps: Boolean? = null
)

// ─── OpenAI Compatibility Types ─────────────────────────────────────

/**
 * Message format compatible with OpenAI Chat Completions API
 */
@Serializable
data class ChatMessage(
    val role: String, // 'system', 'user', 'assistant'
    val content: String
)

/**
 * Request compatible with OpenAI Chat Completions API
 */
@Serializable
data class ChatCompletionRequest(
    val messages: List<ChatMessage>,
    val temperature: Double? = null,
    @SerialName("top_p")
    val topP: Double? = null,
    @SerialName("max_tokens")
    val maxTokens: Int? = null,
    @SerialName("frequency_penalty")
    val frequencyPenalty: Double? = null,
    @SerialName("presence_penalty")
    val presencePenalty: Double? = null,
    val stop: List<String>? = null
)

/**
 * Choice in a chat completion response
 */
@Serializable
data class ChatChoice(
    val index: Int,
    val message: ChatMessage,
    val finish_reason: String
)

/**
 * Token usage information
 */
@Serializable
data class TokenUsage(
    val prompt_tokens: Int,
    val completion_tokens: Int,
    val total_tokens: Int
)

/**
 * Response compatible with OpenAI Chat Completions API
 */
@Serializable
data class ChatCompletionResponse(
    val id: String,
    val `object`: String = "chat.completion",
    val created: Long,
    val model: String,
    val choices: List<ChatChoice>,
    val usage: TokenUsage
)

// ─── AWS Bedrock Compatibility Types ────────────────────────────────

/**
 * Bedrock text generation configuration
 */
@Serializable
data class BedrockTextGenerationConfig(
    val maxTokenCount: Int? = null,
    val temperature: Double? = null,
    val topP: Double? = null,
    val topK: Int? = null,
    val stopSequences: List<String>? = null
)

/**
 * Bedrock invoke request
 */
@Serializable
data class BedrockInvokeRequest(
    val inputText: String,
    val textGenerationConfig: BedrockTextGenerationConfig? = null
)

/**
 * Result from Bedrock inference
 */
@Serializable
data class BedrockResult(
    val outputText: String,
    val tokenCount: Int
)

/**
 * Response from Bedrock invoke
 */
@Serializable
data class BedrockInvokeResponse(
    val results: List<BedrockResult>,
    val input_text_token_count: Int? = null
)

// ─── Model Registry ─────────────────────────────────────────────────

/**
 * Global model registry with metadata and requirements
 */
object ModelRegistry {
    val models: Map<String, ModelInfo> = mapOf(
        // LLM models (1B+)
        "quantum-1.7b" to ModelInfo(
            hfModel = "HuggingFaceTB/SmolLM2-1.7B-Instruct",
            task = "text-generation",
            category = ModelCategory.LLM,
            sizesMB = mapOf(
                "q4" to 900, "q8" to 1700, "fp16" to 3400, "fp32" to 6800
            ),
            minRAM_MB = mapOf(
                "q4" to 2048, "q8" to 3072, "fp16" to 5120, "fp32" to 8192
            )
        ),
        "quantum-3b" to ModelInfo(
            hfModel = "Qwen/Qwen2.5-3B-Instruct",
            task = "text-generation",
            category = ModelCategory.LLM,
            sizesMB = mapOf(
                "q4" to 1600, "q8" to 3200, "fp16" to 6400, "fp32" to 12800
            ),
            minRAM_MB = mapOf(
                "q4" to 3072, "q8" to 5120, "fp16" to 8192, "fp32" to 16384
            )
        ),
        "quantum-code-3b" to ModelInfo(
            hfModel = "Qwen/Qwen2.5-Coder-3B-Instruct",
            task = "text-generation",
            category = ModelCategory.LLM,
            sizesMB = mapOf(
                "q4" to 1600, "q8" to 3200, "fp16" to 6400, "fp32" to 12800
            ),
            minRAM_MB = mapOf(
                "q4" to 3072, "q8" to 5120, "fp16" to 8192, "fp32" to 16384
            )
        ),
        "quantum-8b" to ModelInfo(
            hfModel = "Qwen/Qwen2.5-7B-Instruct",
            task = "text-generation",
            category = ModelCategory.LLM,
            sizesMB = mapOf(
                "q4" to 4200, "q8" to 8400, "fp16" to 16800, "fp32" to 33600
            ),
            minRAM_MB = mapOf(
                "q4" to 6144, "q8" to 10240, "fp16" to 20480, "fp32" to 40960
            )
        ),
        // STT models
        "voicecore-base" to ModelInfo(
            hfModel = "onnx-community/whisper-base",
            task = "automatic-speech-recognition",
            category = ModelCategory.STT,
            sizesMB = mapOf(
                "q4" to 40, "q8" to 75, "fp16" to 150, "fp32" to 300
            ),
            minRAM_MB = mapOf(
                "q4" to 512, "q8" to 512, "fp16" to 1024, "fp32" to 2048
            )
        ),
        "voicecore-small" to ModelInfo(
            hfModel = "onnx-community/whisper-small",
            task = "automatic-speech-recognition",
            category = ModelCategory.STT,
            sizesMB = mapOf(
                "q4" to 100, "q8" to 200, "fp16" to 400, "fp32" to 800
            ),
            minRAM_MB = mapOf(
                "q4" to 1024, "q8" to 1024, "fp16" to 2048, "fp32" to 4096
            )
        )
    )

    /**
     * Get model info by ID
     */
    fun getModel(modelId: String): ModelInfo? = models[modelId]

    /**
     * Get all models, optionally filtered by category
     */
    fun getModels(category: ModelCategory? = null): Map<String, ModelInfo> =
        if (category != null) {
            models.filterValues { it.category == category }
        } else {
            models
        }

    /**
     * Get all available model IDs
     */
    fun getModelIds(): List<String> = models.keys.toList()
}
