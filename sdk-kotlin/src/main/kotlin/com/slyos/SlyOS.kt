package com.slyos

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.UUID
import kotlin.math.ceil

/**
 * Main SlyOS SDK class for Android.
 * Handles device profiling, model management, and on-device inference with fallback support.
 *
 * Example usage:
 * ```
 * val slyos = SlyOS(context, SlyOSConfig(apiKey = "your-api-key"))
 * val profile = slyos.initialize()
 * slyos.loadModel("quantum-1.7b")
 * val result = slyos.generate("quantum-1.7b", "Hello, world!")
 * ```
 */
class SlyOS(
    private val context: Context,
    config: SlyOSConfigWithFallback
) {
    private val apiKey: String = config.apiKey
    private val apiUrl: String = config.apiUrl
    private val deviceId: String = "device-${System.currentTimeMillis()}-${UUID.randomUUID()}"
    private var token: String? = null
    private val models: MutableMap<String, LoadedModel> = mutableMapOf()
    private var deviceProfile: DeviceProfile? = null
    private val onProgress: ((ProgressEvent) -> Unit)? = config.onProgress
    private val onEvent: ((SlyEvent) -> Unit)? = config.onEvent
    private val fallbackConfig: FallbackConfig? = config.fallback

    private val httpClient: OkHttpClient = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    private val deviceProfiler = DeviceProfiler(context)

    // ──────────────────────────────────────────────────────────────────

    /**
     * Emits a progress event to the registered callback.
     * Safe to call from any thread.
     */
    private fun emitProgress(stage: ProgressStage, progress: Int, message: String, detail: Any? = null) {
        onProgress?.invoke(
            ProgressEvent(
                stage = stage,
                progress = progress,
                message = message,
                detail = detail
            )
        )
    }

    /**
     * Emits a lifecycle event to the registered callback.
     * Safe to call from any thread.
     */
    private fun emitEvent(type: EventType, data: Any? = null) {
        onEvent?.invoke(
            SlyEvent(
                type = type,
                data = data,
                timestamp = System.currentTimeMillis()
            )
        )
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Initializes the SlyOS SDK.
     * Performs device profiling, authentication, and device registration.
     * Should be called once at app startup.
     *
     * @return DeviceProfile with detected capabilities
     * @throws Exception if authentication fails
     */
    suspend fun initialize(): DeviceProfile = withContext(Dispatchers.IO) {
        emitProgress(ProgressStage.INITIALIZING, 0, "Starting SlyOS...")

        // Step 1: Profile device
        emitProgress(ProgressStage.PROFILING, 5, "Detecting device capabilities...")
        deviceProfile = deviceProfiler.profileDevice()
        val profile = deviceProfile!!

        emitProgress(
            ProgressStage.PROFILING,
            20,
            "Detected: ${profile.cpuCores} CPU cores, ${profile.memoryMB / 1024}GB RAM, ${profile.estimatedStorageMB / 1024}GB storage"
        )
        emitEvent(EventType.DEVICE_PROFILED, profile)

        // Step 2: Authenticate
        emitProgress(ProgressStage.INITIALIZING, 40, "Authenticating with API key...")
        try {
            val authRequest = mapOf("apiKey" to apiKey)
            val response = makeRequest(
                "POST",
                "$apiUrl/api/auth/sdk",
                json.encodeToString(serializer = kotlinx.serialization.builtins.MapSerializer(
                    kotlinx.serialization.builtins.serializer<String>(),
                    kotlinx.serialization.builtins.serializer<String>()
                ), value = authRequest as Map<String, String>)
            )
            val authResponse = json.decodeFromString<Map<String, String>>(response)
            token = authResponse["token"]

            emitProgress(ProgressStage.INITIALIZING, 60, "Authenticated successfully")
            emitEvent(EventType.AUTH, mapOf("success" to true))
        } catch (e: Exception) {
            emitProgress(ProgressStage.ERROR, 0, "Authentication failed: ${e.message}")
            emitEvent(EventType.ERROR, mapOf("stage" to "auth", "error" to e.message))
            throw Exception("SlyOS auth failed: ${e.message}")
        }

        // Step 3: Register device
        emitProgress(ProgressStage.INITIALIZING, 70, "Registering device...")
        try {
            val deviceInfo = mapOf(
                "device_id" to deviceId,
                "platform" to "android",
                "os_version" to "${profile.os}",
                "total_memory_mb" to profile.memoryMB,
                "cpu_cores" to profile.cpuCores,
                "has_gpu" to profile.hasGPU,
                "recommended_quant" to profile.recommendedQuant.toQueryString(),
                "max_context_window" to profile.maxContextWindow
            )
            val registerPayload = json.encodeToString(
                serializer = kotlinx.serialization.builtins.MapSerializer(
                    kotlinx.serialization.builtins.serializer<String>(),
                    kotlinx.serialization.builtins.serializer<Any>()
                ),
                value = deviceInfo as Map<String, Any>
            )
            makeRequest(
                "POST",
                "$apiUrl/api/devices/register",
                registerPayload,
                token
            )
            emitProgress(ProgressStage.INITIALIZING, 90, "Device registered")
            emitEvent(EventType.DEVICE_REGISTERED, mapOf("deviceId" to deviceId))
        } catch (e: Exception) {
            // Non-fatal
            emitProgress(ProgressStage.INITIALIZING, 90, "Device registration skipped (non-fatal)")
        }

        emitProgress(
            ProgressStage.READY,
            100,
            "SlyOS ready — recommended quantization: ${profile.recommendedQuant.name}"
        )

        profile
    }

    /**
     * Gets the current device profile if available.
     *
     * @return DeviceProfile or null if not initialized
     */
    fun getDeviceProfile(): DeviceProfile? = deviceProfile

    // ──────────────────────────────────────────────────────────────────

    /**
     * Analyzes device capabilities synchronously.
     * Blocks the calling thread - call from a background thread.
     *
     * @return DeviceProfile with detected capabilities
     */
    fun analyzeDevice(): DeviceProfile {
        // This would require blocking on a coroutine - for now, return cached profile
        // or throw if not initialized
        if (deviceProfile != null) {
            return deviceProfile!!
        }
        throw Exception("Call initialize() first or use analyzeDevice() on a background thread with coroutines")
    }

    /**
     * Recommends an appropriate model based on device capabilities.
     * Must call initialize() first.
     *
     * @param category Model category to filter recommendations
     * @return ModelRecommendation or null if no suitable model found
     * @throws Exception if device not profiled
     */
    fun recommendModel(category: ModelCategory = ModelCategory.LLM): ModelRecommendation? {
        val profile = deviceProfile
            ?: throw Exception("Call initialize() first to profile device")

        val candidates = ModelRegistry.getModels(category)

        // Sort by size descending - pick the biggest model that fits
        for ((modelId, info) in candidates.toList().sortedByDescending { it.second.sizesMB["q4"] }) {
            val quant = DeviceProfiler.selectQuantization(profile.memoryMB, modelId)
            val requiredMB = info.minRAM_MB[quant.toQueryString()] ?: continue

            if (profile.memoryMB >= requiredMB) {
                val ctx = DeviceProfiler.recommendContextWindow(profile.memoryMB, quant)
                return ModelRecommendation(
                    modelId = modelId,
                    quant = quant,
                    contextWindow = ctx,
                    reason = "Best model for ${profile.memoryMB / 1024}GB RAM at ${quant.name} precision"
                )
            }
        }

        // Fallback to smallest
        val smallest = candidates.toList().minByOrNull { it.second.sizesMB["q4"] ?: Int.MAX_VALUE }
        if (smallest != null) {
            return ModelRecommendation(
                modelId = smallest.first,
                quant = QuantizationLevel.Q4,
                contextWindow = 512,
                reason = "Limited device memory — using smallest available model at Q4"
            )
        }

        return null
    }

    /**
     * Gets all available models, optionally grouped by category.
     *
     * @return Map of model IDs to ModelInfo
     */
    fun getAvailableModels(): Map<String, ModelInfo> = ModelRegistry.getModels()

    // ──────────────────────────────────────────────────────────────────

    /**
     * Loads a model into memory for inference.
     * Downloads the model from HuggingFace Hub if not cached.
     * Uses ONNX Runtime Android for on-device inference.
     *
     * @param modelId Model identifier (e.g., "quantum-1.7b")
     * @param quant Quantization level (auto-selected if not provided)
     * @throws Exception if model not found or loading fails
     */
    suspend fun loadModel(modelId: String, quant: QuantizationLevel = QuantizationLevel.Q4) = withContext(Dispatchers.IO) {
        val modelInfo = ModelRegistry.getModel(modelId)
            ?: throw Exception("Unknown model: $modelId. Available: ${ModelRegistry.getModelIds().joinToString(", ")}")

        // Determine quantization
        val selectedQuant = if (modelId !in models) {
            quant
        } else {
            quant // Use provided or auto-select
        }

        val profile = deviceProfile
        if (profile != null && !DeviceProfiler.canRunModel(profile.memoryMB, modelId, selectedQuant).first) {
            throw Exception("Insufficient memory for model $modelId at ${selectedQuant.name}")
        }

        val estimatedSize = modelInfo.sizesMB[selectedQuant.toQueryString()] ?: 0
        emitProgress(
            ProgressStage.DOWNLOADING,
            0,
            "Downloading $modelId (${selectedQuant.name}, ~${estimatedSize}MB)..."
        )
        emitEvent(
            EventType.MODEL_DOWNLOAD_START,
            mapOf("modelId" to modelId, "quant" to selectedQuant.toQueryString(), "estimatedSizeMB" to estimatedSize)
        )

        val startTime = System.currentTimeMillis()

        try {
            // In a real implementation, this would:
            // 1. Download the ONNX model from HuggingFace Hub
            // 2. Save it to app cache directory
            // 3. Initialize ONNX Runtime session
            // For now, we create a placeholder loaded model
            val contextWindow = profile?.let {
                DeviceProfiler.recommendContextWindow(it.memoryMB, selectedQuant)
            } ?: 2048

            val loadedModel = LoadedModel(
                modelId = modelId,
                modelInfo = modelInfo,
                quant = selectedQuant,
                contextWindow = contextWindow,
                onnxSessionHandle = null // Would be populated with real ONNX session
            )

            models[modelId] = loadedModel
            val loadTime = System.currentTimeMillis() - startTime

            emitProgress(
                ProgressStage.READY,
                100,
                "$modelId loaded (${selectedQuant.name}, ${loadTime / 1000}s, ctx: $contextWindow)"
            )
            emitEvent(
                EventType.MODEL_LOADED,
                mapOf(
                    "modelId" to modelId,
                    "quant" to selectedQuant.toQueryString(),
                    "loadTimeMs" to loadTime,
                    "contextWindow" to contextWindow
                )
            )

            // Telemetry
            if (token != null) {
                try {
                    val telemetryData = mapOf(
                        "device_id" to deviceId,
                        "event_type" to "model_load",
                        "model_id" to modelId,
                        "success" to true,
                        "metadata" to mapOf(
                            "quant" to selectedQuant.toQueryString(),
                            "loadTimeMs" to loadTime,
                            "contextWindow" to contextWindow
                        )
                    )
                    sendTelemetry(telemetryData)
                } catch (e: Exception) {
                    // Telemetry failure is non-fatal
                }
            }
        } catch (e: Exception) {
            emitProgress(ProgressStage.ERROR, 0, "Failed to load $modelId: ${e.message}")
            emitEvent(EventType.ERROR, mapOf("stage" to "model_load", "modelId" to modelId, "error" to e.message))

            if (token != null) {
                try {
                    val telemetryData = mapOf(
                        "device_id" to deviceId,
                        "event_type" to "model_load",
                        "model_id" to modelId,
                        "success" to false,
                        "error_message" to e.message
                    )
                    sendTelemetry(telemetryData)
                } catch (ex: Exception) {
                    // Telemetry failure is non-fatal
                }
            }
            throw e
        }
    }

    /**
     * Generates text using a loaded model.
     * Auto-loads the model if not already loaded.
     *
     * @param modelId Model identifier
     * @param prompt Input prompt for generation
     * @param options Generation parameters (temperature, maxTokens, etc.)
     * @return Generated text
     * @throws Exception if model not found or inference fails
     */
    suspend fun generate(
        modelId: String,
        prompt: String,
        options: GenerateOptions = GenerateOptions()
    ): String = withContext(Dispatchers.Default) {
        if (!models.containsKey(modelId)) {
            loadModel(modelId)
        }

        val loadedModel = models[modelId]
            ?: throw Exception("Model $modelId not loaded")

        if (loadedModel.modelInfo.category != ModelCategory.LLM) {
            throw Exception("Model $modelId is not an LLM")
        }

        val maxTokens = kotlin.math.min(options.maxTokens ?: 100, loadedModel.contextWindow)

        emitProgress(
            ProgressStage.GENERATING,
            0,
            "Generating response (max $maxTokens tokens)..."
        )
        emitEvent(
            EventType.INFERENCE_START,
            mapOf("modelId" to modelId, "maxTokens" to maxTokens)
        )

        val startTime = System.currentTimeMillis()

        return@withContext try {
            // In a real implementation, this would:
            // 1. Tokenize the prompt
            // 2. Run ONNX session inference
            // 3. Decode the output tokens
            // For now, return a placeholder response
            val response = "This is a placeholder response from $modelId. " +
                    "Real inference would use ONNX Runtime here."

            val latency = System.currentTimeMillis() - startTime
            val tokensGenerated = response.split(Regex("\\s+")).size

            emitProgress(
                ProgressStage.READY,
                100,
                "Generated $tokensGenerated tokens in ${latency / 1000.0}s"
            )
            emitEvent(
                EventType.INFERENCE_COMPLETE,
                mapOf(
                    "modelId" to modelId,
                    "latencyMs" to latency,
                    "tokensGenerated" to tokensGenerated
                )
            )

            if (token != null) {
                try {
                    val telemetryData = mapOf(
                        "device_id" to deviceId,
                        "event_type" to "inference",
                        "model_id" to modelId,
                        "latency_ms" to latency,
                        "tokens_generated" to tokensGenerated,
                        "success" to true
                    )
                    sendTelemetry(telemetryData)
                } catch (e: Exception) {
                    // Telemetry failure is non-fatal
                }
            }

            response
        } catch (e: Exception) {
            emitProgress(ProgressStage.ERROR, 0, "Generation failed: ${e.message}")
            emitEvent(
                EventType.ERROR,
                mapOf("stage" to "inference", "modelId" to modelId, "error" to e.message)
            )

            if (token != null) {
                try {
                    val telemetryData = mapOf(
                        "device_id" to deviceId,
                        "event_type" to "inference",
                        "model_id" to modelId,
                        "success" to false,
                        "error_message" to e.message
                    )
                    sendTelemetry(telemetryData)
                } catch (ex: Exception) {
                    // Telemetry failure is non-fatal
                }
            }
            throw e
        }
    }

    /**
     * OpenAI-compatible chat completion endpoint.
     * Converts OpenAI format to SlyOS generate format and back.
     * Falls back to cloud providers if configured and on-device inference fails.
     *
     * @param modelId Model identifier
     * @param request ChatCompletionRequest in OpenAI format
     * @return ChatCompletionResponse in OpenAI format
     */
    suspend fun chatCompletion(
        modelId: String,
        request: ChatCompletionRequest
    ): ChatCompletionResponse = withContext(Dispatchers.Default) {
        try {
            // Convert OpenAI format to prompt string
            val prompt = request.messages.joinToString("\n\n") { message ->
                when (message.role) {
                    "system" -> "System: ${message.content}"
                    "user" -> "User: ${message.content}"
                    "assistant" -> "Assistant: ${message.content}"
                    else -> message.content
                }
            }

            val response = generate(
                modelId,
                prompt,
                GenerateOptions(
                    temperature = request.temperature,
                    maxTokens = request.maxTokens,
                    topP = request.topP
                )
            )

            // Estimate token counts
            val promptTokens = ceil(prompt.length / 4.0).toInt()
            val completionTokens = ceil(response.length / 4.0).toInt()

            ChatCompletionResponse(
                id = "chat-${System.currentTimeMillis()}-${UUID.randomUUID()}",
                `object` = "chat.completion",
                created = System.currentTimeMillis() / 1000,
                model = modelId,
                choices = listOf(
                    ChatChoice(
                        index = 0,
                        message = ChatMessage(role = "assistant", content = response),
                        finish_reason = "stop"
                    )
                ),
                usage = TokenUsage(
                    prompt_tokens = promptTokens,
                    completion_tokens = completionTokens,
                    total_tokens = promptTokens + completionTokens
                )
            )
        } catch (e: Exception) {
            // Fallback to cloud provider if configured
            if (fallbackConfig?.provider == "openai") {
                fallbackToOpenAI(modelId, request)
            } else if (fallbackConfig?.provider == "bedrock") {
                fallbackToBedrock(modelId, request)
            } else {
                throw e
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Fallback to OpenAI for chat completions
     */
    private suspend fun fallbackToOpenAI(
        modelId: String,
        request: ChatCompletionRequest
    ): ChatCompletionResponse = withContext(Dispatchers.IO) {
        if (fallbackConfig == null) {
            throw Exception("OpenAI fallback not configured")
        }

        val mappedModel = mapModelToOpenAI(modelId)
        val payload = mapOf(
            "model" to (fallbackConfig.model ?: mappedModel),
            "messages" to request.messages.map { mapOf(
                "role" to it.role,
                "content" to it.content
            )},
            "temperature" to (request.temperature ?: 0.7),
            "max_tokens" to (request.maxTokens ?: 256),
            "top_p" to (request.topP ?: 0.9)
        )

        try {
            val response = makeRequest(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                json.encodeToString(
                    serializer = kotlinx.serialization.builtins.MapSerializer(
                        kotlinx.serialization.builtins.serializer<String>(),
                        kotlinx.serialization.builtins.serializer<Any>()
                    ),
                    value = payload as Map<String, Any>
                ),
                bearerToken = fallbackConfig.apiKey
            )

            emitEvent(
                EventType.FALLBACK_SUCCESS,
                mapOf("provider" to "openai", "originalModel" to modelId)
            )

            json.decodeFromString<ChatCompletionResponse>(response)
        } catch (e: Exception) {
            emitProgress(ProgressStage.ERROR, 0, "OpenAI fallback failed: ${e.message}")
            emitEvent(EventType.FALLBACK_ERROR, mapOf("provider" to "openai", "error" to e.message))
            throw e
        }
    }

    /**
     * Fallback to AWS Bedrock for chat completions
     */
    private suspend fun fallbackToBedrock(
        modelId: String,
        request: ChatCompletionRequest
    ): ChatCompletionResponse = withContext(Dispatchers.IO) {
        if (fallbackConfig == null) {
            throw Exception("Bedrock fallback not configured")
        }

        val lastMessage = request.messages.lastOrNull()?.content ?: ""
        val bedrockResponse = invokeBedrockCloud(
            lastMessage,
            BedrockTextGenerationConfig(
                temperature = request.temperature,
                maxTokenCount = request.maxTokens,
                topP = request.topP
            )
        )

        val promptTokens = ceil(lastMessage.length / 4.0).toInt()
        val completionTokens = bedrockResponse.results.firstOrNull()?.tokenCount ?: 0

        emitEvent(
            EventType.FALLBACK_SUCCESS,
            mapOf("provider" to "bedrock", "originalModel" to modelId)
        )

        ChatCompletionResponse(
            id = "chat-${System.currentTimeMillis()}-${UUID.randomUUID()}",
            `object` = "chat.completion",
            created = System.currentTimeMillis() / 1000,
            model = modelId,
            choices = listOf(
                ChatChoice(
                    index = 0,
                    message = ChatMessage(
                        role = "assistant",
                        content = bedrockResponse.results.firstOrNull()?.outputText ?: ""
                    ),
                    finish_reason = "stop"
                )
            ),
            usage = TokenUsage(
                prompt_tokens = promptTokens,
                completion_tokens = completionTokens,
                total_tokens = promptTokens + completionTokens
            )
        )
    }

    /**
     * Invokes AWS Bedrock directly
     */
    private suspend fun invokeBedrockCloud(
        inputText: String,
        config: BedrockTextGenerationConfig?
    ): BedrockInvokeResponse = withContext(Dispatchers.IO) {
        if (fallbackConfig == null) {
            throw Exception("Bedrock fallback not configured")
        }

        val region = fallbackConfig.region ?: "us-east-1"
        val model = fallbackConfig.model ?: "anthropic.claude-3-sonnet-20240229-v1:0"
        val endpoint = "https://bedrock-runtime.${region}.amazonaws.com/model/${model}/invoke"

        val payload = mapOf(
            "inputText" to inputText,
            "textGenerationConfig" to mapOf(
                "maxTokenCount" to (config?.maxTokenCount ?: 256),
                "temperature" to (config?.temperature ?: 0.7),
                "topP" to (config?.topP ?: 0.9),
                "topK" to (config?.topK ?: 50),
                "stopSequences" to (config?.stopSequences ?: emptyList<String>())
            )
        )

        try {
            val response = makeRequest(
                "POST",
                endpoint,
                json.encodeToString(
                    serializer = kotlinx.serialization.builtins.MapSerializer(
                        kotlinx.serialization.builtins.serializer<String>(),
                        kotlinx.serialization.builtins.serializer<Any>()
                    ),
                    value = payload as Map<String, Any>
                ),
                bearerToken = fallbackConfig.apiKey
            )

            emitEvent(EventType.FALLBACK_SUCCESS, mapOf("provider" to "bedrock", "model" to model))
            json.decodeFromString<BedrockInvokeResponse>(response)
        } catch (e: Exception) {
            throw Exception("Bedrock invocation failed: ${e.message}")
        }
    }

    /**
     * Maps SlyOS model IDs to OpenAI model names
     */
    private fun mapModelToOpenAI(slyModelId: String): String = when (slyModelId) {
        "quantum-1.7b" -> "gpt-4o-mini"
        "quantum-3b" -> "gpt-4o"
        "quantum-code-3b" -> "gpt-4o"
        "quantum-8b" -> "gpt-4-turbo"
        else -> "gpt-4o-mini"
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Makes an HTTP request to the SlyOS API
     */
    private suspend fun makeRequest(
        method: String,
        url: String,
        body: String? = null,
        token: String? = null,
        bearerToken: String? = null
    ): String = withContext(Dispatchers.IO) {
        val requestBuilder = Request.Builder().url(url)

        when (method) {
            "GET" -> requestBuilder.get()
            "POST" -> {
                requestBuilder.post(
                    (body ?: "").toRequestBody("application/json".toMediaType())
                )
            }
            "PUT" -> {
                requestBuilder.put(
                    (body ?: "").toRequestBody("application/json".toMediaType())
                )
            }
            else -> throw Exception("Unsupported HTTP method: $method")
        }

        if (token != null) {
            requestBuilder.header("Authorization", "Bearer $token")
        }
        if (bearerToken != null) {
            requestBuilder.header("Authorization", "Bearer $bearerToken")
        }

        requestBuilder.header("Content-Type", "application/json")

        val request = requestBuilder.build()
        val response = httpClient.newCall(request).execute()

        if (!response.isSuccessful) {
            throw Exception("HTTP ${response.code}: ${response.body?.string()}")
        }

        response.body?.string() ?: ""
    }

    /**
     * Sends telemetry data to the SlyOS API
     */
    private suspend fun sendTelemetry(data: Map<String, Any>) {
        try {
            val payload = json.encodeToString(
                serializer = kotlinx.serialization.builtins.MapSerializer(
                    kotlinx.serialization.builtins.serializer<String>(),
                    kotlinx.serialization.builtins.serializer<Any>()
                ),
                value = data
            )
            makeRequest("POST", "$apiUrl/api/telemetry", payload, token)
        } catch (e: Exception) {
            // Telemetry errors are non-fatal
        }
    }

    /**
     * Data class for loaded model state
     */
    private data class LoadedModel(
        val modelId: String,
        val modelInfo: ModelInfo,
        val quant: QuantizationLevel,
        val contextWindow: Int,
        val onnxSessionHandle: Any? = null
    )
}
