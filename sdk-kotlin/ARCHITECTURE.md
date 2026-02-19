# SlyOS Kotlin SDK - Architecture & Design

## Overview

The SlyOS Kotlin SDK is designed to bring on-device AI inference capabilities to Android applications. It mirrors the TypeScript SDK's functionality while being optimized for Android's resource constraints and best practices.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│         (Android Activity, Fragment, Service)               │
└─────────────────────┬───────────────────────────────────────┘
                      │ initialize(), generate(), chatCompletion()
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                      SlyOS Main API                          │
│  ├─ Device Profiling                                        │
│  ├─ Model Loading & Caching                                │
│  ├─ Inference Management                                    │
│  ├─ Cloud Fallback Routing                                 │
│  └─ Telemetry & Events                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌────────┐  ┌─────────┐  ┌─────────────┐
   │Device  │  │Model    │  │Cloud        │
   │Profiler│  │Registry │  │Fallback     │
   └────────┘  └─────────┘  └─────────────┘
        │             │
        ▼             ▼
   ┌──────────────────────────────┐
   │  ONNX Runtime Android        │
   │  (On-Device Inference)       │
   └──────────────────────────────┘
```

## Module Breakdown

### 1. SlyOS.kt - Main SDK Class

**Purpose**: Central coordinator for all SDK operations.

**Key Responsibilities**:
- Device initialization and authentication
- Model lifecycle management (loading, caching)
- Inference orchestration (generate, chat completions)
- Event and progress callbacks
- Cloud provider fallback routing
- Telemetry tracking

**Key Methods**:
```kotlin
suspend fun initialize(): DeviceProfile
suspend fun loadModel(modelId: String, quant: QuantizationLevel)
suspend fun generate(modelId: String, prompt: String, options: GenerateOptions): String
suspend fun chatCompletion(modelId: String, request: ChatCompletionRequest): ChatCompletionResponse
fun recommendModel(category: ModelCategory): ModelRecommendation?
fun getAvailableModels(): Map<String, ModelInfo>
```

**Threading Model**:
- All suspend functions run on `Dispatchers.IO` for HTTP calls and `Dispatchers.Default` for computation
- Automatically marshals results back to caller's coroutine context
- Never blocks UI thread

### 2. Models.kt - Data Structures

**Purpose**: Comprehensive type definitions matching TypeScript SDK.

**Components**:

#### Enumerations
- `QuantizationLevel`: Q4, Q8, FP16, FP32
- `ModelCategory`: LLM, STT
- `ProgressStage`: INITIALIZING, PROFILING, DOWNLOADING, LOADING, READY, GENERATING, ERROR
- `EventType`: AUTH, DEVICE_PROFILED, MODEL_LOADED, INFERENCE_COMPLETE, etc.

#### Configuration Classes
- `SlyOSConfig`: Basic configuration (apiKey, apiUrl, callbacks)
- `SlyOSConfigWithFallback`: Extended config with cloud provider fallback
- `FallbackConfig`: OpenAI/Bedrock credentials

#### Data Classes
- `DeviceProfile`: Hardware capabilities (CPU, RAM, OS version, etc.)
- `ModelInfo`: Model metadata from registry
- `ModelRecommendation`: Smart model selection result
- `GenerateOptions`: Inference parameters (temperature, maxTokens, topP)
- `ChatCompletionRequest/Response`: OpenAI-compatible format
- `BedrockInvokeRequest/Response`: AWS Bedrock format

#### Model Registry
- `ModelRegistry`: Static registry of all available models with specifications
- Hardcoded model metadata (HuggingFace URLs, size, memory requirements)

### 3. DeviceProfiler.kt - Hardware Analysis

**Purpose**: Detect device capabilities and recommend optimal configurations.

**Key Responsibilities**:
- CPU core detection via `Runtime.getRuntime().availableProcessors()`
- RAM detection via `ActivityManager.MemoryInfo`
- Storage detection via `StatFs` (external and internal)
- GPU hardware detection
- Quantization level selection based on available memory
- Context window sizing based on memory and quantization

**Key Algorithms**:

```
selectQuantization(memoryMB, modelId):
  IF model is LLM:
    RETURN Q4  # Safest for ONNX
  ELSE (STT model):
    FOR each precision in [FP16, Q8, Q4]:
      IF memoryMB >= minRAM[precision]:
        RETURN precision

recommendContextWindow(memoryMB, quant):
  base = switch(quant):
    Q4: 1024
    Q8: 2048
    FP16: 4096
    FP32: 8192

  IF memoryMB >= 16GB:
    RETURN min(base * 4, 32768)
  ELSE IF memoryMB >= 8GB:
    RETURN min(base * 2, 16384)
  ELSE IF memoryMB >= 4GB:
    RETURN base
  ELSE:
    RETURN max(512, base / 2)
```

### 4. Data Flow Diagrams

#### Initialization Flow

```
┌─── initialize() ───┐
│                    │
├─► Profile Device  ─► Detect CPU, RAM, Storage, OS
│
├─► Authenticate   ─► POST /api/auth/sdk
│                    └─► Get auth token
│
├─► Register Device ─► POST /api/devices/register
│                     └─► Track device capabilities
│
└─► Return DeviceProfile
    (Non-fatal if registration fails)
```

#### Model Loading Flow

```
┌─── loadModel(modelId, quant?) ───┐
│                                    │
├─► Validate Model ID  ─► Check ModelRegistry
│
├─► Auto-Select Quant  ─► DeviceProfiler.selectQuantization()
│
├─► Check Feasibility  ─► Verify RAM requirements
│
├─► Download ONNX      ─► Cache to app storage
│                        └─► Progress callbacks
│
├─► Initialize ONNX    ─► Create session
│   Session
│
├─► Cache Model        ─► Store in memory Map
│
└─► Emit Events        ─► MODEL_LOADED event
    & Telemetry
```

#### Inference Flow

```
┌─── generate(modelId, prompt, options) ───┐
│                                            │
├─► Check Loaded      ─► Auto-load if needed
│
├─► Validate Model    ─► Ensure it's an LLM
│   Type
│
├─► Prepare Tokens    ─► Tokenize input
│
├─► Run Inference     ─► ONNX session forward pass
│
├─► Decode Output     ─► Convert tokens to text
│
├─► Record Metrics    ─► Latency, token count
│
└─► Send Telemetry    ─► POST /api/telemetry
    & Return Result
```

## API Compatibility

### OpenAI Chat Completions

The SDK implements OpenAI-compatible chat completions:

```kotlin
// Drop-in compatible interface
val response = slyos.chatCompletion(
    modelId = "quantum-3b",
    request = ChatCompletionRequest(
        messages = listOf(
            ChatMessage(role = "system", content = "You are helpful"),
            ChatMessage(role = "user", content = "Hello")
        ),
        temperature = 0.7,
        maxTokens = 256
    )
)
```

Returns `ChatCompletionResponse` with same structure as OpenAI API.

### AWS Bedrock Compatibility

Fallback to Bedrock format:
```kotlin
// Internally converts to Bedrock format and back
```

## Resource Management

### Memory Strategy

```
Device Memory Allocation:
├─ System/UI: 500-1000 MB (reserved)
├─ App Base: 100-200 MB
├─ Model Cache: Variable (depends on model & quant)
└─ Runtime Buffer: 512-1024 MB (ONNX inference)
```

### Quantization Selection Logic

- **Q4 (4-bit)**: ~87.5% size reduction. Recommended for most Android devices.
- **Q8 (8-bit)**: ~75% size reduction. Good balance.
- **FP16 (16-bit)**: ~50% size reduction. For high-RAM devices.
- **FP32 (32-bit)**: No compression. Full precision, use only if necessary.

### Caching Strategy

- Models stored in app-specific cache directory: `context.cacheDir`
- Can be cleared via standard cache management
- No automatic cleanup (user responsibility)
- Future: LRU eviction policy

## Thread Safety & Coroutines

### Design Principles

1. **Dispatcher Strategy**:
   - `Dispatchers.IO` for network operations (HTTP, API calls)
   - `Dispatchers.Default` for computation (tokenization, inference)
   - Results marshaled back to caller's context

2. **No Blocking Operations**:
   - All I/O and heavy computation suspendable
   - Safe to call from main thread (won't block)
   - Progress/event callbacks run on caller's context

3. **Thread-Local Safety**:
   - OkHttpClient is thread-safe
   - ONNX sessions are thread-confined to calling thread
   - SharedFlow for event broadcasting (future enhancement)

### Example Thread Flow

```
MainThread (UI):
  lifecycleScope.launch {
    slyos.generate(...) // Suspends here
  }
    │
    ├─ Switch to Dispatchers.Default
    │ ├─ Tokenization
    │ ├─ ONNX inference
    │ ├─ Decoding
    │ └─ Result ready
    │
    └─ Switch back to MainThread
       └─ Resume coroutine with result
          (Ready to update UI)
```

## Error Handling

### Exception Strategy

- **Checked Exceptions**: Network errors, invalid models, auth failures
- **Runtime Errors**: Memory allocation, ONNX runtime errors
- **Non-Fatal Errors**: Device registration, telemetry failures

### Error Recovery

```
On Inference Error:
├─ IF on-device inference fails:
│  └─► Check if fallback configured
│      ├─ YES: Route to cloud provider
│      └─ NO: Throw exception
│
└─ IF fallback also fails:
   └─► Throw final exception with context
```

## Telemetry & Analytics

### Events Tracked

1. **Auth**: Successful authentication
2. **Device Profiled**: Device detection completed
3. **Model Download**: Start, progress, completion
4. **Model Loaded**: Model ready for inference
5. **Inference**: Start and completion with metrics
6. **Fallback**: Cloud provider routing
7. **Errors**: Stage and error details

### Telemetry Payload

```json
{
  "device_id": "device-timestamp-uuid",
  "event_type": "inference",
  "model_id": "quantum-3b",
  "latency_ms": 2500,
  "tokens_generated": 128,
  "success": true,
  "metadata": {
    "quant": "q4",
    "contextWindow": 2048
  }
}
```

## Security Considerations

### API Key Handling

- Stored in `SlyOSConfig` only in memory
- Never logged or broadcast
- Passed to API via `Authorization: Bearer` header
- HTTPS enforced for all API calls

### Data Privacy

- Device profile doesn't include PII
- Model cache stored locally (device-only)
- Telemetry doesn't include user data
- Inference results never sent to SlyOS backend

## Performance Optimizations

### Model Selection Strategy

```
Device with 4GB RAM:
  ├─ quantum-1.7b at Q4 (900 MB) ✓
  ├─ quantum-3b at Q4 (1.6 GB) ✓
  ├─ quantum-8b at Q4 (4.2 GB) ✗ (over budget)
  └─ Recommend: quantum-3b at Q4

Device with 2GB RAM:
  ├─ quantum-1.7b at Q4 (900 MB) ✓ (recommended)
  └─ Recommend: quantum-1.7b at Q4
```

### Context Window Sizing

Balances capability with performance:
- Larger context = slower generation, higher memory
- Dynamically sized based on device and quantization
- Application can override if needed

## Future Enhancements

1. **Streaming Inference**: Real-time token streaming
2. **Batch Inference**: Multiple prompts simultaneously
3. **GPU Acceleration**: Android GPU Compute support
4. **Multi-Model Serving**: Load multiple models, switch between them
5. **Model Caching**: Persistent local caching across app sessions
6. **Quantization Conversion**: Runtime quantization switching
7. **Fine-tuning**: On-device model adaptation
8. **Memory-Efficient Attention**: FlashAttention for longer contexts

## Dependencies

### Core Dependencies
- **kotlinx-coroutines**: Async operations
- **kotlinx-serialization**: JSON encoding/decoding
- **okhttp3**: HTTP client with interceptors
- **onnxruntime-android**: On-device inference

### Android Framework
- **androidx.core**: Lifecycle, compatibility
- **android.os.Build**: Device identification
- **android.app.ActivityManager**: Memory detection

## Testing Strategy

### Unit Tests
- Device profiler logic
- Quantization selection
- Context window calculation
- Model registry lookups

### Integration Tests
- API authentication
- Model loading workflow
- Inference pipeline
- Fallback routing

### Device Tests
- Real ONNX inference
- Memory constraints
- Long-running operations
- Battery impact

## Deployment

### Build & Release

```bash
./gradlew build                    # Full build
./gradlew assembleDebug           # Debug APK
./gradlew bundleRelease           # AAB for Play Store
./gradlew publish                 # Maven Central publish
```

### Version Management
- Semantic versioning: MAJOR.MINOR.PATCH
- Current: 1.0.0 (stable release)

### Backwards Compatibility
- Maintains API stability across minor versions
- Breaking changes only in major versions
