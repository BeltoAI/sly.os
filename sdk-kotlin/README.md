# SlyOS Kotlin SDK

A comprehensive SDK for integrating on-device AI inference into Android applications using SlyOS.

## Features

- **On-Device Inference**: Run large language models (LLMs) and speech-to-text (STT) models directly on Android devices using ONNX Runtime
- **Automatic Device Profiling**: Detects device capabilities (CPU cores, RAM, storage) and recommends optimal model configurations
- **Smart Quantization**: Automatically selects the best quantization level (Q4, Q8, FP16, FP32) based on available memory
- **Cloud Fallback**: Seamless fallback to OpenAI or AWS Bedrock if on-device inference fails
- **OpenAI-Compatible API**: Drop-in replacement for OpenAI Chat Completions
- **Progress & Event Callbacks**: Real-time progress updates and lifecycle event monitoring
- **Async/Await Support**: Built on Kotlin coroutines for non-blocking operations
- **Telemetry**: Automatic performance tracking and error reporting

## Installation

### Add to your `build.gradle` (Project level):

```gradle
repositories {
    mavenCentral()
    google()
}
```

### Add to your `build.gradle.kts` (Module level):

```kotlin
dependencies {
    // SlyOS SDK
    implementation("com.slyos:slyos-sdk:1.0.0")

    // Required dependencies
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
    implementation("ai.onnxruntime:onnxruntime-android:1.16.3")
}
```

## Quick Start

### 1. Initialize the SDK

```kotlin
import android.content.Context
import com.slyos.SlyOS
import com.slyos.SlyOSConfigWithFallback
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var slyos: SlyOS

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize SlyOS with configuration
        val config = SlyOSConfigWithFallback(
            apiKey = "your-api-key-here",
            apiUrl = "https://api.slyos.world",
            onProgress = { event ->
                // Update UI with progress
                println("Progress: ${event.stage} - ${event.progress}% - ${event.message}")
            },
            onEvent = { event ->
                // Log lifecycle events
                println("Event: ${event.type} - ${event.data}")
            },
            fallback = null // Optional: configure fallback provider
        )

        slyos = SlyOS(this, config)

        // Initialize asynchronously
        lifecycleScope.launch {
            try {
                val profile = slyos.initialize()
                println("Device: ${profile.cpuCores} cores, ${profile.memoryMB}MB RAM")
                println("Recommended quantization: ${profile.recommendedQuant.name}")
            } catch (e: Exception) {
                println("Initialization failed: ${e.message}")
            }
        }
    }
}
```

### 2. Load a Model

```kotlin
lifecycleScope.launch {
    try {
        // Load a model (auto-selects quantization if not specified)
        slyos.loadModel("quantum-1.7b")
        println("Model loaded successfully")
    } catch (e: Exception) {
        println("Failed to load model: ${e.message}")
    }
}
```

### 3. Generate Text

```kotlin
lifecycleScope.launch {
    try {
        val result = slyos.generate(
            modelId = "quantum-1.7b",
            prompt = "What is machine learning?",
            options = GenerateOptions(
                temperature = 0.7,
                maxTokens = 256,
                topP = 0.9
            )
        )
        println("Generated: $result")
    } catch (e: Exception) {
        println("Generation failed: ${e.message}")
    }
}
```

### 4. Chat Completions (OpenAI Compatible)

```kotlin
import com.slyos.ChatCompletionRequest
import com.slyos.ChatMessage

lifecycleScope.launch {
    try {
        val request = ChatCompletionRequest(
            messages = listOf(
                ChatMessage(role = "system", content = "You are a helpful assistant."),
                ChatMessage(role = "user", content = "Hello, how are you?")
            ),
            temperature = 0.7,
            maxTokens = 256
        )

        val response = slyos.chatCompletion("quantum-1.7b", request)
        val assistantMessage = response.choices.firstOrNull()?.message?.content
        println("Assistant: $assistantMessage")
    } catch (e: Exception) {
        println("Chat failed: ${e.message}")
    }
}
```

### 5. Speech-to-Text Transcription

```kotlin
import com.slyos.TranscriptionOptions

lifecycleScope.launch {
    try {
        // Load audio file
        val audioBytes = resources.openRawResource(R.raw.recording).use {
            it.readBytes()
        }

        // Transcribe using Whisper-based STT model
        val result = slyos.transcribe(
            modelId = "voicecore-base",
            audio = audioBytes,
            options = TranscriptionOptions(language = "en")
        )

        println("Transcribed text: ${result.text}")
    } catch (e: Exception) {
        println("Transcription failed: ${e.message}")
    }
}
```

**Parameters:**
- `modelId` (String): STT model ID (`voicecore-base` or `voicecore-small`)
- `audio` (ByteArray): Audio file data (WAV, MP3, M4A)
- `options` (TranscriptionOptions, optional): Language and transcription settings

**Returns:** `TranscriptionResult` with `text` property containing transcribed string

## Available Models

### LLM Models (Text Generation)

| Model ID | HuggingFace | Size (Q4) | Min RAM |
|----------|-------------|-----------|---------|
| `quantum-1.7b` | HuggingFaceTB/SmolLM2-1.7B-Instruct | 900MB | 2GB |
| `quantum-3b` | Qwen/Qwen2.5-3B-Instruct | 1.6GB | 3GB |
| `quantum-code-3b` | Qwen/Qwen2.5-Coder-3B-Instruct | 1.6GB | 3GB |
| `quantum-8b` | Qwen/Qwen2.5-7B-Instruct | 4.2GB | 6GB |

### STT Models (Speech-to-Text)

| Model ID | HuggingFace | Size (Q4) | Min RAM |
|----------|-------------|-----------|---------|
| `voicecore-base` | onnx-community/whisper-base | 40MB | 512MB |
| `voicecore-small` | onnx-community/whisper-small | 100MB | 1GB |

## Device Profiling & Recommendations

### Analyze Device

```kotlin
lifecycleScope.launch {
    val profile = slyos.analyzeDevice()
    println("""
        CPU Cores: ${profile.cpuCores}
        RAM: ${profile.memoryMB}MB
        Storage: ${profile.estimatedStorageMB}MB
        OS: ${profile.os}
        Recommended Quantization: ${profile.recommendedQuant.name}
        Max Context Window: ${profile.maxContextWindow}
    """.trimIndent())
}
```

### Get Model Recommendation

```kotlin
lifecycleScope.launch {
    val recommendation = slyos.recommendModel(ModelCategory.LLM)
    if (recommendation != null) {
        println("""
            Recommended Model: ${recommendation.modelId}
            Quantization: ${recommendation.quant.name}
            Context Window: ${recommendation.contextWindow}
            Reason: ${recommendation.reason}
        """.trimIndent())
    }
}
```

### List Available Models

```kotlin
val models = slyos.getAvailableModels()
models.forEach { (modelId, info) ->
    println("Model: $modelId - ${info.category.name}")
}
```

## NNAPI GPU Acceleration

The SDK automatically detects and uses Android NNAPI (Neural Networks API) for GPU-accelerated inference on compatible devices:

```kotlin
lifecycleScope.launch {
    val profile = slyos.initialize()

    if (profile.hasGPU) {
        println("GPU acceleration available (NNAPI)")
    } else {
        println("GPU not available - using CPU")
    }
}
```

**NNAPI Support:**
- Automatically enabled on Android 8.1+
- Detects Adreno, Mali, PowerVR GPUs
- ONNX Runtime handles GPU delegation
- Fallback to CPU if NNAPI unavailable
- Optimal quantization (Q4/Q8) selected based on available VRAM

## Persistent Device ID (SharedPreferences)

The SDK stores a persistent device identifier in Android SharedPreferences for accurate device tracking:

```kotlin
// Retrieve persistent device ID
val deviceId = slyos.getDeviceId()
println("Device ID: $deviceId")

// Device ID is automatically:
// - Generated on first initialization
// - Stored in SharedPreferences (private app storage)
// - Retrieved on subsequent initializations
// - Used for analytics and subscription tracking
```

**SharedPreferences Details:**
- Preference file: `com.slyos.sdk.prefs`
- Key: `device_id`
- Scope: Private to application

## Cloud Fallback Configuration

Configure fallback to OpenAI or AWS Bedrock:

### OpenAI Fallback

```kotlin
val config = SlyOSConfigWithFallback(
    apiKey = "your-slyos-api-key",
    fallback = FallbackConfig(
        provider = "openai",
        apiKey = "your-openai-api-key",
        model = "gpt-4o-mini"
    )
)
```

### AWS Bedrock Fallback

```kotlin
val config = SlyOSConfigWithFallback(
    apiKey = "your-slyos-api-key",
    fallback = FallbackConfig(
        provider = "bedrock",
        apiKey = "your-aws-api-key",
        model = "anthropic.claude-3-sonnet-20240229-v1:0",
        region = "us-east-1"
    )
)
```

## Quantization Levels

- **Q4** (4-bit): Smallest models (~50% of FP32 size), fastest inference, recommended for most devices
- **Q8** (8-bit): Medium compression (~25% of FP32 size), good balance
- **FP16** (16-bit): Higher precision (~50% of FP32 size), for devices with sufficient RAM
- **FP32** (32-bit): Full precision, largest models, slowest inference

The SDK automatically selects the optimal quantization based on available RAM.

## Tokenizer Support (DJL)

The SDK uses Deep Java Library (DJL) tokenizers for accurate token counting and text processing:

```kotlin
// Token counting (automatic behind-the-scenes)
val maxContextTokens = sdk.getModelContextWindow()
println("Max context: $maxContextTokens tokens")

// The SDK automatically uses DJL tokenizers for:
// - Token counting before inference
// - Context window validation
// - Batched request processing
```

DJL provides optimized implementations of:
- Qwen tokenizer (for quantum-* models)
- Whisper tokenizer (for voicecore-* models)
- BPE tokenization with subword matching

## Whisper Speech-to-Text Models

The SDK includes built-in support for Whisper-based speech recognition for on-device transcription:

**Available STT Models:**
- `voicecore-base`: Whisper Base (~40MB Q4) - Recommended, good accuracy/speed tradeoff
- `voicecore-small`: Whisper Small (~100MB Q4) - Higher accuracy, requires more memory

**Supported Audio Formats:**
- WAV (PCM 16-bit, 16kHz recommended)
- MP3
- M4A/AAC

**Example: Record and Transcribe**

```kotlin
import android.media.MediaRecorder
import java.io.File

class AudioTranscriber(private val slyos: SlyOS, val context: Context) {
    private var mediaRecorder: MediaRecorder? = null

    fun recordAndTranscribe() {
        lifecycleScope.launch {
            val audioFile = File(context.cacheDir, "recording.wav")

            // Setup recording
            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(audioFile.absolutePath)
                prepare()
                start()
            }

            // ... user speaks ...

            mediaRecorder?.stop()
            mediaRecorder?.release()

            // Transcribe
            try {
                val audioBytes = audioFile.readBytes()
                val result = slyos.transcribe("voicecore-base", audioBytes)
                println("Transcribed: ${result.text}")
            } catch (e: Exception) {
                println("Transcription error: ${e.message}")
            }
        }
    }
}
```

## Performance Optimization Tips

1. **Use Q4 Quantization**: Best balance of size, speed, and quality for Android
2. **Pre-load Models**: Load models during app startup to avoid user-facing delays
3. **Batch Inference**: Process multiple requests together when possible
4. **Monitor Device Resources**: Use device profiling to make informed decisions
5. **Enable Fallback**: Always configure a fallback provider for reliability
6. **Use Coroutines**: Never block the main thread - always use `lifecycleScope.launch`

## Audio Processing

The SDK includes an `AudioProcessor` utility for preprocessing audio before transcription:

```kotlin
import com.slyos.AudioProcessor

// Initialize audio processor
val audioProcessor = AudioProcessor(context)

lifecycleScope.launch {
    try {
        // Load audio file
        val audioFile = File(context.cacheDir, "recording.wav")
        val audioBytes = audioFile.readBytes()

        // Process: resample to 16kHz and normalize
        val processedAudio = audioProcessor.process(
            audioBytes,
            targetSampleRate = 16000,
            normalize = true
        )

        // Transcribe
        val result = slyos.transcribe("voicecore-base", processedAudio)
        println("Transcribed: ${result.text}")
    } catch (e: Exception) {
        println("Processing error: ${e.message}")
    }
}
```

**AudioProcessor Methods:**
```kotlin
suspend fun process(
    audioBytes: ByteArray,
    targetSampleRate: Int = 16000,
    normalize: Boolean = true
): ByteArray

fun detectSilence(
    audioBytes: ByteArray,
    threshold: Float = 0.01f
): List<IntRange>

suspend fun trim(audioBytes: ByteArray): ByteArray
```

## Error Handling

```kotlin
lifecycleScope.launch {
    try {
        slyos.loadModel("quantum-3b")
    } catch (e: Exception) {
        when {
            e.message?.contains("Unknown model") == true -> {
                println("Invalid model ID")
            }
            e.message?.contains("Not enough RAM") == true -> {
                println("Device has insufficient memory")
            }
            e.message?.contains("auth") == true -> {
                println("Authentication failed")
            }
            else -> println("Error: ${e.message}")
        }
    }
}
```

## Permissions

Add to your `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Architecture

```
┌─────────────────────────────────────┐
│         Application Layer           │
│     (Android Activity/Fragment)     │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│         SlyOS SDK                   │
├─────────────────────────────────────┤
│ ├─ SlyOS (Main API)                 │
│ ├─ DeviceProfiler (Hardware Info)   │
│ ├─ ModelRegistry (Model Metadata)   │
│ └─ Models (Data Classes)            │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      ONNX Runtime Android           │
│  (On-Device Inference Engine)       │
└────────────────┬────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼─────┐    ┌─────▼────┐
    │ Local    │    │  Cloud   │
    │ Models   │    │Fallback  │
    │(Cache)   │    │(OpenAI,  │
    │          │    │ Bedrock) │
    └──────────┘    └──────────┘
```

## API Reference

### SlyOS Class

#### `suspend fun initialize(): DeviceProfile`
Initializes the SDK: profiles device, authenticates, and registers device.

#### `suspend fun loadModel(modelId: String, quant: QuantizationLevel): Unit`
Loads a model for inference. Auto-selects quantization if not specified.

#### `suspend fun generate(modelId: String, prompt: String, options: GenerateOptions): String`
Generates text using a loaded LLM model.

#### `suspend fun chatCompletion(modelId: String, request: ChatCompletionRequest): ChatCompletionResponse`
OpenAI-compatible chat completion endpoint.

#### `suspend fun transcribe(modelId: String, audio: ByteArray, options: TranscriptionOptions): TranscriptionResult`
Transcribes audio to text using Whisper-based STT models. Supports WAV, MP3, and M4A formats.

#### `fun analyzeDevice(): DeviceProfile`
Synchronous device capability analysis.

#### `fun recommendModel(category: ModelCategory): ModelRecommendation?`
Gets a model recommendation based on device capabilities.

#### `fun getAvailableModels(): Map<String, ModelInfo>`
Lists all available models and their specifications.

## Troubleshooting

### "Authentication failed"
- Verify your API key is correct
- Check that API key has necessary permissions
- Ensure device has internet connectivity

### "Not enough RAM for model"
- Use `recommendModel()` to find a suitable model for your device
- Consider using a smaller model (e.g., quantum-1.7b instead of quantum-8b)
- Use lower quantization level (Q4 instead of FP32)

### "Model download failed"
- Check internet connectivity
- Verify HuggingFace Hub is accessible
- Ensure sufficient storage space available

### "Inference timeout"
- Reduce `maxTokens` parameter
- Use a smaller model
- Close other apps to free up memory

## Development

### Building from Source

```bash
./gradlew build
./gradlew assembleDebug
```

### Running Tests

```bash
./gradlew test
./gradlew connectedAndroidTest
```

## License

Apache License 2.0

## Support

For issues and questions:
- Documentation: https://docs.slyos.world
- Discord: https://discord.gg/slyos
- GitHub Issues: https://github.com/slyos/sdk-kotlin/issues
