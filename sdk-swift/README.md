# SlyOS SDK for Swift

A comprehensive on-device AI inference SDK for iOS and macOS, bringing the power of SlyOS to Apple platforms. Run models locally for text generation, code completion, and speech recognition with hardware profiling and intelligent quantization selection.

## Features

- **On-Device Inference**: Run LLMs and speech recognition models locally on iOS/macOS
- **Smart Device Profiling**: Automatic CPU/RAM/storage detection with quantization recommendations
- **Model Registry**: Pre-configured models including Quantum 1.7B, 3B, Code-3B, 8B, and VoiceCore STT
- **Quantization Levels**: Support for Q4, Q8, FP16, and FP32 precisions
- **OpenAI Compatible API**: Drop-in replacement for OpenAI chat completions
- **AWS Bedrock Fallback**: Automatic fallback to cloud providers if needed
- **Async/Await**: Modern Swift concurrency support
- **Telemetry & Monitoring**: Built-in event tracking and telemetry reporting
- **Core ML Integration**: Native integration with Core ML for inference

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
.package(url: "https://github.com/slyos/sdk-swift.git", from: "1.0.0")
```

Or in Xcode:
1. File → Add Packages
2. Enter: `https://github.com/slyos/sdk-swift.git`
3. Select version and target

## Quick Start

```swift
import SlyOS

// Initialize the SDK
let config = SlyOSConfig(
    apiKey: "your-api-key-here",
    apiUrl: "https://api.slyos.world"
)

let sdk = SlyOS(config: config)

// Initialize and profile device
let profile = try await sdk.initialize()
print("Device RAM: \(profile.memoryMB)MB")
print("Recommended quantization: \(profile.recommendedQuant)")

// Load a model
try await sdk.loadModel("quantum-1.7b", quant: .q4)

// Generate text
let response = try await sdk.generate(
    "quantum-1.7b",
    prompt: "What is machine learning?",
    options: GenerateOptions(
        temperature: 0.7,
        maxTokens: 256
    )
)
print(response)
```

## Usage Examples

### Device Profiling

```swift
let sdk = SlyOS(config: config)

// Analyze device capabilities
let profile = try await sdk.analyzeDevice()

// Check model compatibility
let check = sdk.canRunModel("quantum-3b", quant: .q8)
if check.canRun {
    print("Model can run: \(check.reason)")
} else {
    print("Cannot run model: \(check.reason)")
    print("Recommended: \(check.recommendedQuant)")
}
```

### Model Recommendation

```swift
// Get smart model recommendation based on device
if let recommendation = sdk.recommendModel(category: .llm) {
    print("Recommended model: \(recommendation.modelId)")
    print("Quantization: \(recommendation.quantizationLevel)")
    print("Reason: \(recommendation.reason)")

    try await sdk.loadModel(recommendation.modelId, quant: recommendation.quantizationLevel)
}
```

### Chat Completion (OpenAI Compatible)

```swift
let request = ChatCompletionRequest(
    messages: [
        ChatMessage(role: "system", content: "You are a helpful assistant."),
        ChatMessage(role: "user", content: "Explain Swift concurrency.")
    ],
    temperature: 0.7,
    maxTokens: 512
)

let response = try await sdk.chatCompletion("quantum-3b", request: request)
print("Assistant: \(response.choices[0].message.content)")
print("Tokens used: \(response.usage.totalTokens)")
```

### Text Generation with Options

```swift
let options = GenerateOptions(
    temperature: 0.9,
    maxTokens: 1024,
    topP: 0.95
)

let text = try await sdk.generate(
    "quantum-code-3b",
    prompt: "func fibonacci(n: Int) {",
    options: options
)
print(text)
```

### Progress Monitoring

```swift
let config = SlyOSConfig(
    apiKey: "your-key",
    onProgress: { event in
        print("[\(event.stage)] \(event.progress)% - \(event.message)")
    },
    onEvent: { event in
        print("Event: \(event.type) at \(Date(timeIntervalSince1970: Double(event.timestamp) / 1000))")
    }
)

let sdk = SlyOS(config: config)
try await sdk.initialize()  // Will emit progress events
```

### Available Models

All models are accessible via their model IDs:

#### LLM Models
- `quantum-1.7b`: SmolLM2 1.7B (lightweight, ~900MB Q4)
- `quantum-3b`: Qwen 2.5 3B (balanced, ~1.6GB Q4)
- `quantum-code-3b`: Qwen 2.5 Coder 3B (code-focused, ~1.6GB Q4)
- `quantum-8b`: Qwen 2.5 7B (powerful, ~4.2GB Q4)

#### Speech-to-Text Models
- `voicecore-base`: Whisper Base (~40MB Q4)
- `voicecore-small`: Whisper Small (~100MB Q4)

### Quantization Levels

Choose the right quantization for your device:

```swift
public enum QuantizationLevel: String, CaseIterable {
    case q4    // 4-bit quantization (smallest, ~1-4GB)
    case q8    // 8-bit quantization (medium, ~1.7-8GB)
    case fp16  // 16-bit float (large, ~3-17GB)
    case fp32  // 32-bit float (largest, ~6-33GB)
}
```

## API Reference

### SlyOS Class

#### Initialization
```swift
init(config: SlyOSConfig)
```

#### Core Methods

```swift
// Initialize SDK and authenticate
func initialize() async throws -> DeviceProfile

// Profile device capabilities
func analyzeDevice() -> DeviceProfile

// Load a model
func loadModel(_ modelId: String, quant: QuantizationLevel = .q4) async throws

// Generate text
func generate(_ modelId: String, prompt: String, options: GenerateOptions = .init()) async throws -> String

// OpenAI-compatible chat completion
func chatCompletion(_ modelId: String, request: ChatCompletionRequest) async throws -> ChatCompletionResponse

// Get model recommendation
func recommendModel(category: ModelCategory = .llm) -> ModelRecommendation?

// Check model compatibility
func canRunModel(_ modelId: String, quant: QuantizationLevel?) -> (canRun: Bool, reason: String, recommendedQuant: QuantizationLevel)

// Get available models
func getAvailableModels() -> [String: [ModelInfo]]
```

### Configuration

```swift
struct SlyOSConfig {
    let apiKey: String
    var apiUrl: String = "https://api.slyos.world"
    var onProgress: ((ProgressEvent) -> Void)?
    var onEvent: ((SlyEvent) -> Void)?
    var fallbackConfig: FallbackConfig?
}
```

### Types

```swift
struct DeviceProfile {
    let cpuCores: Int
    let memoryMB: Int
    let estimatedStorageMB: Int
    let platform: String
    let osVersion: String
    let recommendedQuant: QuantizationLevel
    let maxContextWindow: Int
}

struct GenerateOptions {
    var temperature: Float?
    var maxTokens: Int?
    var topP: Float?
}

struct ChatCompletionRequest {
    let messages: [ChatMessage]
    var temperature: Float?
    var maxTokens: Int?
    var topP: Float?
    var frequencyPenalty: Float?
    var presencePenalty: Float?
    var stop: [String]?
}

struct ChatCompletionResponse {
    let id: String
    let object: String
    let created: Int
    let model: String
    let choices: [ChatChoice]
    let usage: TokenUsage
}

enum ModelCategory: String {
    case llm
    case stt
}
```

## Fallback Configuration

Automatically fall back to cloud providers if on-device inference fails:

```swift
let config = SlyOSConfig(
    apiKey: "sly-api-key",
    fallbackConfig: FallbackConfig(
        provider: .openai,
        apiKey: "openai-api-key",
        model: "gpt-4o-mini"
    )
)
```

## System Requirements

- iOS 15.0+
- macOS 12.0+
- Swift 5.9+
- Xcode 15.0+

### Device Requirements for Models

| Model | Q4 RAM | Q8 RAM | FP16 RAM | FP32 RAM |
|-------|--------|--------|----------|----------|
| quantum-1.7b | 2GB | 3GB | 5GB | 8GB |
| quantum-3b | 3GB | 5GB | 8GB | 16GB |
| quantum-code-3b | 3GB | 5GB | 8GB | 16GB |
| quantum-8b | 6GB | 10GB | 20GB | 40GB |
| voicecore-base | 512MB | 512MB | 1GB | 2GB |
| voicecore-small | 1GB | 1GB | 2GB | 4GB |

## Thread Safety

The SDK's main class `SlyOS` uses `@MainActor` to ensure thread safety:

```swift
@MainActor
class SlyOS {
    // All methods are Main Actor isolated
}
```

When calling from background threads, use `MainActor.run()`:

```swift
await MainActor.run {
    try await sdk.initialize()
}
```

## Error Handling

All async methods throw `SlyOSError`:

```swift
do {
    try await sdk.initialize()
} catch let error as SlyOSError {
    switch error {
    case .authenticationFailed(let message):
        print("Auth failed: \(message)")
    case .modelNotFound(let modelId):
        print("Model not found: \(modelId)")
    case .insufficientMemory(let required):
        print("Need \(required)MB RAM")
    case .inference(let message):
        print("Inference failed: \(message)")
    case .network(let message):
        print("Network error: \(message)")
    }
} catch {
    print("Unexpected error: \(error)")
}
```

## License

MIT License - See LICENSE file for details

## Support

For issues, feature requests, or questions:
- GitHub: https://github.com/slyos/sdk-swift/issues
- Email: support@slyos.world
- Docs: https://docs.slyos.world
