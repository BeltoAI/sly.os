package com.slyos

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.util.UUID
import kotlin.math.ceil
import kotlin.math.min

/**
 * Main SlyOS SDK class for Android.
 * Handles device profiling, model management, and **real** on-device inference
 * using ONNX Runtime with NNAPI acceleration.
 *
 * Example usage:
 * ```
 * val slyos = SlyOS(context, SlyOSConfigWithFallback(apiKey = "your-api-key"))
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
    private var deviceId: String = "" // Set in initialize()
    private var token: String? = null
    private val models: MutableMap<String, LoadedModel> = mutableMapOf()
    private var deviceProfile: DeviceProfile? = null
    private val onProgress: ((ProgressEvent) -> Unit)? = config.onProgress
    private val onEvent: ((SlyEvent) -> Unit)? = config.onEvent
    private val fallbackConfig: FallbackConfig? = config.fallback

    private val httpClient: OkHttpClient = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }
    private val deviceProfiler = DeviceProfiler(context)
    private val modelDownloader = ModelDownloader(context)

    // Telemetry batching
    private val telemetryBuffer = mutableListOf<TelemetryEntry>()
    private var telemetryJob: Job? = null
    private val telemetryScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        const val SDK_VERSION = "1.4.1"
        private const val TELEMETRY_BATCH_SIZE = 10
        private const val TELEMETRY_FLUSH_INTERVAL_MS = 60_000L
    }

    // ──────────────────────────────────────────────────────────────────

    private fun emitProgress(stage: ProgressStage, progress: Int, message: String, detail: Any? = null) {
        onProgress?.invoke(ProgressEvent(stage = stage, progress = progress, message = message, detail = detail))
    }

    private fun emitEvent(type: EventType, data: Any? = null) {
        onEvent?.invoke(SlyEvent(type = type, data = data, timestamp = System.currentTimeMillis()))
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Initializes the SlyOS SDK.
     * Performs device profiling, authentication, and device registration.
     */
    suspend fun initialize(): DeviceProfile = withContext(Dispatchers.IO) {
        emitProgress(ProgressStage.INITIALIZING, 0, "Starting SlyOS...")

        // Step 1: Persistent device ID
        deviceId = DeviceProfiler.getOrCreateDeviceId(context)

        // Step 2: Profile device
        emitProgress(ProgressStage.PROFILING, 5, "Detecting device capabilities...")
        deviceProfile = deviceProfiler.profileDevice()
        val profile = deviceProfile!!

        emitProgress(
            ProgressStage.PROFILING, 20,
            "Detected: ${profile.cpuCores} CPU cores, ${profile.memoryMB / 1024}GB RAM" +
                    (if (profile.gpuRenderer != null) ", GPU: ${profile.gpuRenderer}" else "")
        )
        emitEvent(EventType.DEVICE_PROFILED, profile)

        // Step 3: Authenticate
        emitProgress(ProgressStage.INITIALIZING, 40, "Authenticating with API key...")
        try {
            val authRequest = mapOf("apiKey" to apiKey)
            val response = makeRequest(
                "POST", "$apiUrl/api/auth/sdk",
                json.encodeToString(
                    kotlinx.serialization.builtins.MapSerializer(
                        kotlinx.serialization.builtins.serializer<String>(),
                        kotlinx.serialization.builtins.serializer<String>()
                    ), authRequest
                )
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

        // Step 4: Register device with enhanced profile
        emitProgress(ProgressStage.INITIALIZING, 70, "Registering device...")
        try {
            val fingerprint = DeviceProfiler.generateFingerprint()
            val deviceInfo = mapOf(
                "device_id" to deviceId,
                "device_fingerprint" to fingerprint,
                "platform" to "android",
                "os_version" to profile.os,
                "total_memory_mb" to profile.memoryMB.toString(),
                "cpu_cores" to profile.cpuCores.toString(),
                "has_gpu" to profile.hasGPU.toString(),
                "gpu_renderer" to (profile.gpuRenderer ?: ""),
                "browser_name" to "SlyOS-Kotlin",
                "sdk_version" to SDK_VERSION,
                "recommended_quant" to profile.recommendedQuant.toQueryString(),
                "max_context_window" to profile.maxContextWindow.toString()
            )
            makeRequest(
                "POST", "$apiUrl/api/devices/register",
                json.encodeToString(
                    kotlinx.serialization.builtins.MapSerializer(
                        kotlinx.serialization.builtins.serializer<String>(),
                        kotlinx.serialization.builtins.serializer<String>()
                    ), deviceInfo
                ),
                token
            )
            emitProgress(ProgressStage.INITIALIZING, 90, "Device registered")
            emitEvent(EventType.DEVICE_REGISTERED, mapOf("deviceId" to deviceId))
        } catch (e: Exception) {
            emitProgress(ProgressStage.INITIALIZING, 90, "Device registration skipped (non-fatal)")
        }

        // Step 5: Start telemetry flush timer
        startTelemetryTimer()

        emitProgress(
            ProgressStage.READY, 100,
            "SlyOS v$SDK_VERSION ready — recommended: ${profile.recommendedQuant.name}"
        )

        profile
    }

    fun getDeviceProfile(): DeviceProfile? = deviceProfile
    fun analyzeDevice(): DeviceProfile = deviceProfile ?: throw Exception("Call initialize() first")
    fun getAvailableModels(): Map<String, ModelInfo> = ModelRegistry.getModels()
    fun getSdkVersion(): String = SDK_VERSION

    fun recommendModel(category: ModelCategory = ModelCategory.LLM): ModelRecommendation? {
        val profile = deviceProfile ?: throw Exception("Call initialize() first to profile device")
        val candidates = ModelRegistry.getModels(category)

        for ((modelId, info) in candidates.toList().sortedByDescending { it.second.sizesMB["q4"] }) {
            val quant = DeviceProfiler.selectQuantization(profile.memoryMB, modelId)
            val requiredMB = info.minRAM_MB[quant.toQueryString()] ?: continue
            if (profile.memoryMB >= requiredMB) {
                val ctx = DeviceProfiler.recommendContextWindow(profile.memoryMB, quant)
                return ModelRecommendation(modelId, quant, ctx, "Best model for ${profile.memoryMB / 1024}GB RAM at ${quant.name}")
            }
        }

        val smallest = candidates.toList().minByOrNull { it.second.sizesMB["q4"] ?: Int.MAX_VALUE }
        return smallest?.let {
            ModelRecommendation(it.first, QuantizationLevel.Q4, 512, "Limited device memory — using smallest model")
        }
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Loads a model into memory for real on-device inference.
     * Downloads the ONNX model from HuggingFace Hub (cached locally) and
     * initializes ONNX Runtime session + tokenizer.
     */
    suspend fun loadModel(modelId: String, quant: QuantizationLevel = QuantizationLevel.Q4) = withContext(Dispatchers.IO) {
        val modelInfo = ModelRegistry.getModel(modelId)
            ?: throw Exception("Unknown model: $modelId. Available: ${ModelRegistry.getModelIds().joinToString(", ")}")

        val profile = deviceProfile
        if (profile != null) {
            val (canRun, reason) = DeviceProfiler.canRunModel(profile.memoryMB, modelId, quant)
            if (!canRun) throw Exception(reason)
        }

        val estimatedSize = modelInfo.sizesMB[quant.toQueryString()] ?: 0
        emitProgress(ProgressStage.DOWNLOADING, 0, "Downloading $modelId (${quant.name}, ~${estimatedSize}MB)...")
        emitEvent(EventType.MODEL_DOWNLOAD_START, mapOf("modelId" to modelId, "quant" to quant.toQueryString()))

        val startTime = System.currentTimeMillis()

        try {
            // Step 1: Download model files from HuggingFace
            val modelDir = modelDownloader.downloadModel(
                hfModelId = modelInfo.hfModel,
                quant = quant,
                progress = { downloaded, total, fileName ->
                    val percent = if (total > 0) (downloaded * 100 / total).toInt() else 0
                    val downloadedMB = downloaded / (1024 * 1024)
                    val totalMB = total / (1024 * 1024)
                    emitProgress(ProgressStage.DOWNLOADING, percent, "Downloading $fileName: ${downloadedMB}MB / ${totalMB}MB")
                    emitEvent(EventType.MODEL_DOWNLOAD_PROGRESS, mapOf("modelId" to modelId, "percent" to percent))
                }
            )

            // Step 2: Initialize ONNX Runtime engine
            emitProgress(ProgressStage.LOADING, 80, "Loading $modelId into ONNX Runtime...")
            val modelFile = File(modelDir, "model.onnx")
            if (!modelFile.exists()) throw Exception("model.onnx not found after download")

            val engine = OnnxInferenceEngine(modelFile.absolutePath)

            // Step 3: Initialize tokenizer (for LLM models)
            var tokenizer: SlyOSTokenizer? = null
            if (modelInfo.category == ModelCategory.LLM) {
                emitProgress(ProgressStage.LOADING, 90, "Loading tokenizer...")
                tokenizer = SlyOSTokenizer(modelDir)
            }

            // Step 4: Determine context window
            val contextWindow = profile?.let {
                DeviceProfiler.recommendContextWindow(it.memoryMB, quant)
            } ?: 2048

            val loadedModel = LoadedModel(
                modelId = modelId,
                modelInfo = modelInfo,
                quant = quant,
                contextWindow = contextWindow,
                engine = engine,
                tokenizer = tokenizer,
                modelDirectory = modelDir
            )

            models[modelId] = loadedModel
            val loadTime = System.currentTimeMillis() - startTime

            emitProgress(ProgressStage.READY, 100, "$modelId loaded (${quant.name}, ${loadTime / 1000}s, ctx: $contextWindow)")
            emitEvent(EventType.MODEL_LOADED, mapOf(
                "modelId" to modelId, "quant" to quant.toQueryString(),
                "loadTimeMs" to loadTime, "contextWindow" to contextWindow
            ))

            // Telemetry
            sendTelemetryEvent("model_load", modelId, true, loadTime.toInt())

        } catch (e: Exception) {
            emitProgress(ProgressStage.ERROR, 0, "Failed to load $modelId: ${e.message}")
            emitEvent(EventType.ERROR, mapOf("stage" to "model_load", "modelId" to modelId, "error" to e.message))
            sendTelemetryEvent("model_load", modelId, false, errorMessage = e.message)
            throw e
        }
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Generates text using a loaded model with real ONNX Runtime inference.
     */
    suspend fun generate(
        modelId: String,
        prompt: String,
        options: GenerateOptions = GenerateOptions()
    ): String = withContext(Dispatchers.Default) {
        if (!models.containsKey(modelId)) {
            loadModel(modelId)
        }

        val loadedModel = models[modelId] ?: throw Exception("Model $modelId not loaded")

        if (loadedModel.modelInfo.category != ModelCategory.LLM) {
            throw Exception("Model $modelId is not an LLM. Use transcribe() for STT models.")
        }

        val tokenizer = loadedModel.tokenizer
            ?: throw Exception("No tokenizer available for $modelId")

        val maxTokens = min(options.maxTokens ?: 100, loadedModel.contextWindow)

        emitProgress(ProgressStage.GENERATING, 0, "Generating response (max $maxTokens tokens)...")
        emitEvent(EventType.INFERENCE_START, mapOf("modelId" to modelId, "maxTokens" to maxTokens))

        val startTime = System.currentTimeMillis()

        return@withContext try {
            // Step 1: Tokenize the prompt
            val inputIds = tokenizer.encodeAsLong(prompt)

            // Step 2: Run autoregressive generation
            val genConfig = OnnxInferenceEngine.GenerationConfig(
                maxNewTokens = maxTokens,
                temperature = (options.temperature ?: 0.7).toFloat(),
                topP = (options.topP ?: 0.9).toFloat()
            )

            val generatedIds = loadedModel.engine.generateTokens(inputIds, genConfig)

            // Step 3: Decode generated tokens
            val response = tokenizer.decodeLong(generatedIds).trim()

            val latency = System.currentTimeMillis() - startTime
            val tokensGenerated = generatedIds.size
            val tokensPerSec = if (latency > 0) tokensGenerated * 1000.0 / latency else 0.0

            emitProgress(
                ProgressStage.READY, 100,
                "Generated $tokensGenerated tokens in ${latency}ms (${String.format("%.1f", tokensPerSec)} tok/s)"
            )
            emitEvent(EventType.INFERENCE_COMPLETE, mapOf(
                "modelId" to modelId, "latencyMs" to latency,
                "tokensGenerated" to tokensGenerated, "tokensPerSec" to tokensPerSec
            ))

            // Batch telemetry
            recordTelemetry(TelemetryEntry(latency.toInt(), tokensGenerated, true, modelId, System.currentTimeMillis()))

            response

        } catch (e: Exception) {
            val latency = System.currentTimeMillis() - startTime
            emitProgress(ProgressStage.ERROR, 0, "Generation failed: ${e.message}")
            emitEvent(EventType.ERROR, mapOf("stage" to "inference", "modelId" to modelId, "error" to e.message))

            recordTelemetry(TelemetryEntry(latency.toInt(), 0, false, modelId, System.currentTimeMillis()))

            throw e
        }
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Transcribe audio using a Whisper model with real on-device inference.
     *
     * @param modelId Whisper model ID (e.g., "voicecore-base")
     * @param audioUri URI to the audio file
     * @param language Language code (default: "en")
     * @return Transcribed text
     */
    suspend fun transcribe(
        modelId: String,
        audioUri: Uri,
        language: String = "en"
    ): String = withContext(Dispatchers.Default) {
        if (!models.containsKey(modelId)) {
            loadModel(modelId)
        }

        val loadedModel = models[modelId] ?: throw Exception("Model $modelId not loaded")

        if (loadedModel.modelInfo.category != ModelCategory.STT) {
            throw Exception("Model $modelId is not an STT model. Use generate() for LLMs.")
        }

        emitProgress(ProgressStage.TRANSCRIBING, 0, "Transcribing audio...")
        emitEvent(EventType.INFERENCE_START, mapOf("modelId" to modelId, "type" to "transcription"))

        val startTime = System.currentTimeMillis()

        try {
            // Step 1: Load and preprocess audio
            emitProgress(ProgressStage.TRANSCRIBING, 10, "Loading audio...")
            val audioSamples = AudioProcessor.loadAudio(context, audioUri)

            // Step 2: Compute mel spectrogram
            emitProgress(ProgressStage.TRANSCRIBING, 30, "Computing mel spectrogram...")
            val melSpec = AudioProcessor.computeMelSpectrogram(audioSamples)

            // Step 3: Run Whisper encoder
            emitProgress(ProgressStage.TRANSCRIBING, 50, "Running encoder...")
            val encoderOutput = loadedModel.engine.runWhisperEncoder(melSpec)

            // Step 4: Run Whisper decoder
            emitProgress(ProgressStage.TRANSCRIBING, 70, "Decoding transcription...")
            val tokenIds = loadedModel.engine.runWhisperDecoder(encoderOutput, maxTokens = 448)

            // Step 5: Decode tokens to text
            val text = loadedModel.tokenizer?.decodeLong(tokenIds)
                ?: throw IllegalStateException("Tokenizer required for decoding transcription output")

            val latency = System.currentTimeMillis() - startTime

            emitProgress(ProgressStage.READY, 100, "Transcribed in ${latency}ms")
            emitEvent(EventType.INFERENCE_COMPLETE, mapOf(
                "modelId" to modelId, "latencyMs" to latency, "type" to "transcription"
            ))

            sendTelemetryEvent("inference", modelId, true, latency.toInt())

            text.trim()

        } catch (e: Exception) {
            emitProgress(ProgressStage.ERROR, 0, "Transcription failed: ${e.message}")
            emitEvent(EventType.ERROR, mapOf("stage" to "transcription", "modelId" to modelId, "error" to e.message))
            sendTelemetryEvent("inference", modelId, false, errorMessage = e.message)
            throw e
        }
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * OpenAI-compatible chat completion using real on-device inference.
     * Falls back to cloud providers if configured and on-device inference fails.
     */
    suspend fun chatCompletion(
        modelId: String,
        request: ChatCompletionRequest
    ): ChatCompletionResponse = withContext(Dispatchers.Default) {
        try {
            // Auto-load if not loaded
            if (!models.containsKey(modelId)) {
                loadModel(modelId)
            }

            val loadedModel = models[modelId] ?: throw Exception("Model $modelId not loaded")
            val tokenizer = loadedModel.tokenizer ?: throw Exception("No tokenizer for $modelId")

            // Apply chat template for proper formatting
            val prompt = tokenizer.applyChatTemplate(request.messages)

            val response = generate(
                modelId, prompt,
                GenerateOptions(
                    temperature = request.temperature,
                    maxTokens = request.maxTokens,
                    topP = request.topP
                )
            )

            val promptTokens = ceil(prompt.length / 4.0).toInt()
            val completionTokens = ceil(response.length / 4.0).toInt()

            ChatCompletionResponse(
                id = "chat-${System.currentTimeMillis()}-${UUID.randomUUID()}",
                `object` = "chat.completion",
                created = System.currentTimeMillis() / 1000,
                model = modelId,
                choices = listOf(
                    ChatChoice(index = 0, message = ChatMessage(role = "assistant", content = response), finish_reason = "stop")
                ),
                usage = TokenUsage(prompt_tokens = promptTokens, completion_tokens = completionTokens, total_tokens = promptTokens + completionTokens)
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

    /** Unload a model to free resources. */
    fun unloadModel(modelId: String) {
        models[modelId]?.engine?.close()
        models.remove(modelId)
    }

    /** Unload all models. */
    fun unloadAllModels() {
        models.values.forEach { it.engine.close() }
        models.clear()
    }

    /** Flush telemetry and clean up. */
    suspend fun destroy() {
        telemetryJob?.cancel()
        flushTelemetry()
        unloadAllModels()
    }

    // ──────────────────────────────────────────────────────────────────
    // Telemetry Batching

    private data class TelemetryEntry(
        val latencyMs: Int,
        val tokensGenerated: Int,
        val success: Boolean,
        val modelId: String,
        val timestamp: Long
    )

    private fun recordTelemetry(entry: TelemetryEntry) {
        synchronized(telemetryBuffer) {
            telemetryBuffer.add(entry)
            if (telemetryBuffer.size >= TELEMETRY_BATCH_SIZE) {
                telemetryScope.launch { flushTelemetry() }
            }
        }
    }

    private fun startTelemetryTimer() {
        telemetryJob?.cancel()
        telemetryJob = telemetryScope.launch {
            while (isActive) {
                delay(TELEMETRY_FLUSH_INTERVAL_MS)
                flushTelemetry()
            }
        }
    }

    private suspend fun flushTelemetry() {
        val batch: List<TelemetryEntry>
        synchronized(telemetryBuffer) {
            if (telemetryBuffer.isEmpty()) return
            batch = telemetryBuffer.toList()
            telemetryBuffer.clear()
        }

        if (token == null) return

        try {
            val metrics = batch.map { entry ->
                mapOf(
                    "latency_ms" to entry.latencyMs.toString(),
                    "tokens_generated" to entry.tokensGenerated.toString(),
                    "success" to entry.success.toString(),
                    "model_id" to entry.modelId,
                    "timestamp" to entry.timestamp.toString()
                )
            }
            val payload = mapOf(
                "device_id" to deviceId,
                "metrics" to metrics.toString()
            )
            makeRequest("POST", "$apiUrl/api/devices/telemetry",
                json.encodeToString(
                    kotlinx.serialization.builtins.MapSerializer(
                        kotlinx.serialization.builtins.serializer<String>(),
                        kotlinx.serialization.builtins.serializer<String>()
                    ), payload
                ), token)
        } catch (e: Exception) {
            // Put back on failure, cap at 100
            synchronized(telemetryBuffer) {
                telemetryBuffer.addAll(0, batch)
                while (telemetryBuffer.size > 100) {
                    telemetryBuffer.removeFirst()
                }
            }
        }
    }

    private suspend fun sendTelemetryEvent(
        eventType: String, modelId: String, success: Boolean,
        latencyMs: Int? = null, errorMessage: String? = null
    ) {
        if (token == null) return
        try {
            val data = mutableMapOf(
                "device_id" to deviceId,
                "event_type" to eventType,
                "model_id" to modelId,
                "success" to success.toString()
            )
            latencyMs?.let { data["latency_ms"] = it.toString() }
            errorMessage?.let { data["error_message"] = it }

            makeRequest("POST", "$apiUrl/api/telemetry",
                json.encodeToString(
                    kotlinx.serialization.builtins.MapSerializer(
                        kotlinx.serialization.builtins.serializer<String>(),
                        kotlinx.serialization.builtins.serializer<String>()
                    ), data
                ), token)
        } catch (e: Exception) { /* non-fatal */ }
    }

    // ──────────────────────────────────────────────────────────────────
    // Cloud Fallbacks

    private suspend fun fallbackToOpenAI(modelId: String, request: ChatCompletionRequest): ChatCompletionResponse =
        withContext(Dispatchers.IO) {
            if (fallbackConfig == null) throw Exception("OpenAI fallback not configured")

            val mappedModel = when (modelId) {
                "quantum-1.7b" -> "gpt-4o-mini"
                "quantum-3b" -> "gpt-4o"
                "quantum-code-3b" -> "gpt-4o"
                "quantum-8b" -> "gpt-4-turbo"
                else -> "gpt-4o-mini"
            }

            val payload = """{"model":"${fallbackConfig.model ?: mappedModel}","messages":${json.encodeToString(kotlinx.serialization.builtins.ListSerializer(ChatMessage.serializer()), request.messages)},"temperature":${request.temperature ?: 0.7},"max_tokens":${request.maxTokens ?: 256}}"""

            val response = makeRequest("POST", "https://api.openai.com/v1/chat/completions", payload, bearerToken = fallbackConfig.apiKey)
            emitEvent(EventType.FALLBACK_SUCCESS, mapOf("provider" to "openai"))
            json.decodeFromString<ChatCompletionResponse>(response)
        }

    private suspend fun fallbackToBedrock(modelId: String, request: ChatCompletionRequest): ChatCompletionResponse =
        withContext(Dispatchers.IO) {
            if (fallbackConfig == null) throw Exception("Bedrock fallback not configured")

            val lastMessage = request.messages.lastOrNull()?.content ?: ""
            val region = fallbackConfig.region ?: "us-east-1"
            val model = fallbackConfig.model ?: "anthropic.claude-3-sonnet-20240229-v1:0"
            val endpoint = "https://bedrock-runtime.${region}.amazonaws.com/model/${model}/invoke"

            val payload = """{"inputText":"${lastMessage.replace("\"","\\\"")}","textGenerationConfig":{"maxTokenCount":${request.maxTokens ?: 256},"temperature":${request.temperature ?: 0.7}}}"""

            val response = makeRequest("POST", endpoint, payload, bearerToken = fallbackConfig.apiKey)
            val bedrockResponse = json.decodeFromString<BedrockInvokeResponse>(response)

            emitEvent(EventType.FALLBACK_SUCCESS, mapOf("provider" to "bedrock"))

            val promptTokens = ceil(lastMessage.length / 4.0).toInt()
            val completionTokens = bedrockResponse.results.firstOrNull()?.tokenCount ?: 0

            ChatCompletionResponse(
                id = "chat-${System.currentTimeMillis()}-${UUID.randomUUID()}",
                created = System.currentTimeMillis() / 1000,
                model = modelId,
                choices = listOf(ChatChoice(0, ChatMessage("assistant", bedrockResponse.results.firstOrNull()?.outputText ?: ""), "stop")),
                usage = TokenUsage(promptTokens, completionTokens, promptTokens + completionTokens)
            )
        }

    // ──────────────────────────────────────────────────────────────────
    // HTTP

    private suspend fun makeRequest(
        method: String, url: String, body: String? = null,
        token: String? = null, bearerToken: String? = null
    ): String = withContext(Dispatchers.IO) {
        val requestBuilder = Request.Builder().url(url)

        when (method) {
            "GET" -> requestBuilder.get()
            "POST" -> requestBuilder.post((body ?: "").toRequestBody("application/json".toMediaType()))
            "PUT" -> requestBuilder.put((body ?: "").toRequestBody("application/json".toMediaType()))
            else -> throw Exception("Unsupported HTTP method: $method")
        }

        if (token != null) requestBuilder.header("Authorization", "Bearer $token")
        if (bearerToken != null) requestBuilder.header("Authorization", "Bearer $bearerToken")
        requestBuilder.header("Content-Type", "application/json")

        val request = requestBuilder.build()
        val response = httpClient.newCall(request).execute()

        if (!response.isSuccessful) throw Exception("HTTP ${response.code}: ${response.body?.string()}")
        response.body?.string() ?: ""
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Data class for loaded model state including real inference components.
     */
    private data class LoadedModel(
        val modelId: String,
        val modelInfo: ModelInfo,
        val quant: QuantizationLevel,
        val contextWindow: Int,
        val engine: OnnxInferenceEngine,
        val tokenizer: SlyOSTokenizer?,
        val modelDirectory: File
    )
}
