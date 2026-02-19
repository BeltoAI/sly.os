import Foundation
import CoreML

// MARK: - Main SlyOS SDK Class

/// The main SlyOS SDK class for on-device AI inference on iOS and macOS.
///
/// Thread-safe actor that manages model loading, inference, device profiling, and telemetry.
/// All methods must be called from the main thread or via MainActor.run().
@MainActor
public final class SlyOS {
    // MARK: - Private Properties

    private let config: SlyOSConfig
    private let networkClient: NetworkClient
    private let deviceId: String

    private var deviceProfile: DeviceProfile?
    private var loadedModels: [String: LoadedModelInfo] = [:]

    /// Information about a loaded model
    private struct LoadedModelInfo {
        let modelId: String
        let quantizationLevel: QuantizationLevel
        let contextWindow: Int
        let loadedAt: Date
    }

    // MARK: - Initialization

    /// Initialize SlyOS SDK
    /// - Parameter config: Configuration with API key and optional callbacks
    public init(config: SlyOSConfig) {
        self.config = config
        self.networkClient = NetworkClient(apiUrl: config.apiUrl)
        self.deviceId = Self.generateDeviceId()
    }

    /// Generate a unique device identifier
    private static func generateDeviceId() -> String {
        let timestamp = Int(Date().timeIntervalSince1970)
        let random = UUID().uuidString.prefix(9)
        return "device-\(timestamp)-\(random)"
    }

    // MARK: - Progress and Event Handling

    /// Emit a progress event through the configured callback
    private func emitProgress(
        stage: ProgressStage,
        progress: Int,
        message: String,
        detail: Any? = nil
    ) {
        config.onProgress?(ProgressEvent(
            stage: stage,
            progress: progress,
            message: message,
            detail: detail
        ))
    }

    /// Emit a telemetry event through the configured callback
    private func emitEvent(
        type: SlyEventType,
        data: [String: AnySendable]? = nil
    ) {
        config.onEvent?(SlyEvent(
            type: type,
            data: data,
            timestamp: Int(Date().timeIntervalSince1970 * 1000)
        ))
    }

    // MARK: - Device Profiling

    /// Analyze device capabilities
    /// - Returns: DeviceProfile with CPU, RAM, storage, and recommended settings
    public func analyzeDevice() -> DeviceProfile {
        let profile = DeviceProfiler.profileDevice()
        self.deviceProfile = profile

        let ramGB = String(format: "%.1f", Double(profile.memoryMB) / 1024)
        emitProgress(
            stage: .profiling,
            progress: 100,
            message: "Device: \(profile.cpuCores) cores, \(ramGB)GB RAM, recommended \(profile.recommendedQuant.rawValue.uppercased())"
        )
        emitEvent(type: .deviceProfiled)

        return profile
    }

    /// Get current device profile (or nil if not analyzed)
    public func getDeviceProfile() -> DeviceProfile? {
        return deviceProfile
    }

    // MARK: - Model Recommendations

    /// Recommend best model based on device capabilities
    /// - Parameter category: Model category to filter (.llm or .stt)
    /// - Returns: ModelRecommendation or nil if no suitable model
    public func recommendModel(category: ModelCategory = .llm) -> ModelRecommendation? {
        guard let profile = deviceProfile else {
            emitProgress(
                stage: .error,
                progress: 0,
                message: "Device not profiled. Call analyzeDevice() first."
            )
            return nil
        }

        return recommendModel(category: category, deviceProfile: profile)
    }

    /// Get available models grouped by category
    public func getAvailableModels() -> [String: [ModelInfo]] {
        var grouped: [String: [ModelInfo]] = [
            "llm": [],
            "stt": []
        ]

        for (_, info) in modelRegistry {
            let categoryKey = info.category.rawValue
            if grouped[categoryKey] == nil {
                grouped[categoryKey] = []
            }
            grouped[categoryKey]?.append(info)
        }

        return grouped
    }

    /// Check if a model can run on this device
    /// - Parameters:
    ///   - modelId: Model identifier
    ///   - quant: Optional specific quantization level
    /// - Returns: Tuple with (canRun: bool, reason: string, recommendedQuant: QuantizationLevel)
    public func canRunModel(
        _ modelId: String,
        quant: QuantizationLevel? = nil
    ) -> (canRun: Bool, reason: String, recommendedQuant: QuantizationLevel) {
        guard let profile = deviceProfile else {
            return (
                canRun: true,
                reason: "Device not profiled yet - call initialize() first",
                recommendedQuant: .q4
            )
        }

        let check = checkModelCompatibility(
            modelId: modelId,
            quantization: quant,
            deviceProfile: profile
        )

        return (
            canRun: check.canRun,
            reason: check.reason,
            recommendedQuant: check.recommendedQuant
        )
    }

    // MARK: - Initialization

    /// Initialize SlyOS SDK
    /// Authenticates with API, profiles device, and registers with backend
    /// - Returns: DeviceProfile with device capabilities
    /// - Throws: SlyOSError if initialization fails
    public func initialize() async throws -> DeviceProfile {
        emitProgress(stage: .initializing, progress: 0, message: "Starting SlyOS...")

        // Step 1: Profile device
        emitProgress(stage: .profiling, progress: 5, message: "Detecting device capabilities...")
        self.deviceProfile = DeviceProfiler.profileDevice()

        guard let profile = deviceProfile else {
            throw SlyOSError.deviceNotInitialized
        }

        let ramGB = String(format: "%.1f", Double(profile.memoryMB) / 1024)
        let storageGB = String(format: "%.1f", Double(profile.estimatedStorageMB) / 1024)
        emitProgress(
            stage: .profiling,
            progress: 20,
            message: "Detected: \(profile.cpuCores) cores, \(ramGB)GB RAM, \(storageGB)GB storage"
        )
        emitEvent(type: .deviceProfiled)

        // Step 2: Authenticate
        emitProgress(stage: .initializing, progress: 40, message: "Authenticating with API...")
        do {
            try await networkClient.authenticate(apiKey: config.apiKey)
            emitProgress(stage: .initializing, progress: 60, message: "Authenticated successfully")
            emitEvent(type: .auth, data: ["success": AnySendable(true)])
        } catch {
            emitProgress(stage: .error, progress: 0, message: "Authentication failed: \(error.localizedDescription)")
            emitEvent(type: .error, data: ["stage": AnySendable("auth"), "error": AnySendable(error.localizedDescription)])
            throw error
        }

        // Step 3: Register device
        emitProgress(stage: .initializing, progress: 70, message: "Registering device...")
        do {
            try await networkClient.registerDevice(deviceId: deviceId, profile: profile)
            emitProgress(stage: .initializing, progress: 90, message: "Device registered")
            emitEvent(type: .deviceRegistered, data: ["deviceId": AnySendable(deviceId)])
        } catch {
            // Device registration is non-critical
            emitProgress(stage: .initializing, progress: 90, message: "Device registration skipped (non-critical)")
        }

        emitProgress(
            stage: .ready,
            progress: 100,
            message: "SlyOS ready - recommended: \(profile.recommendedQuant.rawValue.uppercased())"
        )

        return profile
    }

    // MARK: - Model Loading

    /// Load a model for inference
    /// - Parameters:
    ///   - modelId: Model identifier (e.g., "quantum-1.7b")
    ///   - quant: Quantization level (.q4, .q8, .fp16, .fp32)
    /// - Throws: SlyOSError if model loading fails
    public func loadModel(
        _ modelId: String,
        quant: QuantizationLevel = .q4
    ) async throws {
        // Check model exists
        guard modelRegistry[modelId] != nil else {
            let available = modelRegistry.keys.joined(separator: ", ")
            throw SlyOSError.modelNotFound("Available: \(available)")
        }

        // Check device profiled
        guard let profile = deviceProfile else {
            throw SlyOSError.deviceNotInitialized
        }

        // Check compatibility
        let check = checkModelCompatibility(
            modelId: modelId,
            quantization: quant,
            deviceProfile: profile
        )

        if !check.canRun {
            emitProgress(stage: .error, progress: 0, message: check.reason)
            throw SlyOSError.insufficientMemory(required: 0)
        }

        // Start download/loading
        emitProgress(
            stage: .downloading,
            progress: 0,
            message: "Downloading \(modelId) (\(quant.rawValue.uppercased()))..."
        )

        let startTime = Date()
        emitEvent(type: .modelDownloadStart)

        do {
            // Simulate model loading with Core ML
            // In production, this would:
            // 1. Download ONNX model from HuggingFace
            // 2. Convert to .mlmodel format
            // 3. Load into Core ML
            // 4. Initialize inference session

            await Task.sleep(1_000_000_000) // 1 second simulation

            let contextWindow = recommendContextWindow(memoryMB: profile.memoryMB, quant: quant)
            let loadedModel = LoadedModelInfo(
                modelId: modelId,
                quantizationLevel: quant,
                contextWindow: contextWindow,
                loadedAt: Date()
            )
            loadedModels[modelId] = loadedModel

            let loadTime = Int(Date().timeIntervalSince(startTime) * 1000)
            emitProgress(
                stage: .ready,
                progress: 100,
                message: "Loaded \(modelId) in \(loadTime)ms (context: \(contextWindow))"
            )
            emitEvent(
                type: .modelLoaded,
                data: [
                    "modelId": AnySendable(modelId),
                    "quant": AnySendable(quant.rawValue),
                    "loadTimeMs": AnySendable(loadTime),
                    "contextWindow": AnySendable(contextWindow)
                ]
            )

            // Report telemetry
            try await networkClient.reportTelemetry(
                deviceId: deviceId,
                eventType: "model_load",
                modelId: modelId,
                success: true,
                latencyMs: loadTime
            )

        } catch {
            emitProgress(stage: .error, progress: 0, message: "Failed to load \(modelId)")
            emitEvent(type: .error, data: ["modelId": AnySendable(modelId), "error": AnySendable(error.localizedDescription)])

            try await networkClient.reportTelemetry(
                deviceId: deviceId,
                eventType: "model_load",
                modelId: modelId,
                success: false,
                errorMessage: error.localizedDescription
            )

            throw SlyOSError.modelLoadingFailed(error.localizedDescription)
        }
    }

    // MARK: - Text Generation

    /// Generate text using a loaded model
    /// - Parameters:
    ///   - modelId: Model identifier
    ///   - prompt: Input prompt
    ///   - options: Generation options (temperature, maxTokens, topP)
    /// - Returns: Generated text
    /// - Throws: SlyOSError if generation fails
    public func generate(
        _ modelId: String,
        prompt: String,
        options: GenerateOptions = .init()
    ) async throws -> String {
        // Load model if not already loaded
        if loadedModels[modelId] == nil {
            try await loadModel(modelId)
        }

        guard let modelInfo = loadedModels[modelId] else {
            throw SlyOSError.modelNotFound(modelId)
        }

        guard let registryInfo = modelRegistry[modelId] else {
            throw SlyOSError.modelNotFound(modelId)
        }

        // Verify it's an LLM model
        guard registryInfo.category == .llm else {
            throw SlyOSError.inferenceFailed("Model \(modelId) is not an LLM. Use STT models for speech recognition.")
        }

        let maxTokens = min(options.maxTokens ?? 100, modelInfo.contextWindow)

        emitProgress(
            stage: .generating,
            progress: 0,
            message: "Generating (max \(maxTokens) tokens)..."
        )
        emitEvent(type: .inferenceStart, data: ["modelId": AnySendable(modelId), "maxTokens": AnySendable(maxTokens)])

        let startTime = Date()

        do {
            // Simulate inference with Core ML
            // In production, this would:
            // 1. Tokenize the prompt
            // 2. Run inference on Core ML model
            // 3. Decode tokens to text
            // 4. Stream or return results

            await Task.sleep(2_000_000_000) // 2 second simulation

            let response = "This is a simulated response from \(modelId). In production, this would be actual model output. \(prompt)"

            let latency = Int(Date().timeIntervalSince(startTime) * 1000)
            let tokensGenerated = response.split(separator: " ").count

            emitProgress(
                stage: .ready,
                progress: 100,
                message: "Generated \(tokensGenerated) tokens in \(latency)ms"
            )
            emitEvent(
                type: .inferenceComplete,
                data: [
                    "modelId": AnySendable(modelId),
                    "latencyMs": AnySendable(latency),
                    "tokensGenerated": AnySendable(tokensGenerated)
                ]
            )

            try await networkClient.reportTelemetry(
                deviceId: deviceId,
                eventType: "inference",
                modelId: modelId,
                success: true,
                latencyMs: latency,
                tokensGenerated: tokensGenerated
            )

            return response

        } catch {
            emitProgress(stage: .error, progress: 0, message: "Generation failed: \(error.localizedDescription)")
            emitEvent(type: .error, data: ["modelId": AnySendable(modelId), "error": AnySendable(error.localizedDescription)])

            try await networkClient.reportTelemetry(
                deviceId: deviceId,
                eventType: "inference",
                modelId: modelId,
                success: false,
                errorMessage: error.localizedDescription
            )

            throw SlyOSError.inferenceFailed(error.localizedDescription)
        }
    }

    // MARK: - Chat Completion (OpenAI Compatible)

    /// OpenAI-compatible chat completion endpoint
    /// - Parameters:
    ///   - modelId: Model identifier
    ///   - request: Chat completion request
    /// - Returns: Chat completion response
    /// - Throws: SlyOSError if completion fails
    public func chatCompletion(
        _ modelId: String,
        request: ChatCompletionRequest
    ) async throws -> ChatCompletionResponse {
        // Convert messages to prompt
        let prompt = request.messages.map { message in
            switch message.role {
            case "system":
                return "System: \(message.content)"
            case "user":
                return "User: \(message.content)"
            case "assistant":
                return "Assistant: \(message.content)"
            default:
                return "\(message.role): \(message.content)"
            }
        }.joined(separator: "\n\n")

        // Generate response
        let response = try await generate(
            modelId,
            prompt: prompt,
            options: GenerateOptions(
                temperature: request.temperature,
                maxTokens: request.maxTokens,
                topP: request.topP
            )
        )

        // Estimate token counts (rough: ~4 chars per token)
        let promptTokens = (prompt.count + 3) / 4
        let completionTokens = (response.count + 3) / 4

        return ChatCompletionResponse(
            id: "chat-\(UUID().uuidString)",
            object: "chat.completion",
            created: Int(Date().timeIntervalSince1970),
            model: modelId,
            choices: [
                ChatChoice(
                    index: 0,
                    message: ChatMessage(role: "assistant", content: response),
                    finishReason: "stop"
                )
            ],
            usage: TokenUsage(
                promptTokens: promptTokens,
                completionTokens: completionTokens,
                totalTokens: promptTokens + completionTokens
            )
        )
    }

    // MARK: - Cleanup

    /// Unload a model to free resources
    /// - Parameter modelId: Model identifier
    public func unloadModel(_ modelId: String) {
        loadedModels.removeValue(forKey: modelId)
    }

    /// Unload all models
    public func unloadAllModels() {
        loadedModels.removeAll()
    }
}

// MARK: - Helper: AnySendable Conversion

extension AnySendable {
    init(_ value: Any) {
        if let sendable = value as? Sendable {
            self.init(sendable)
        } else {
            self.init("\(value)")
        }
    }

    init(_ value: Sendable) {
        if let string = value as? String {
            self.init(string)
        } else if let int = value as? Int {
            self.init(int)
        } else if let double = value as? Double {
            self.init(double)
        } else if let bool = value as? Bool {
            self.init(bool)
        } else {
            self.init("\(value)")
        }
    }

    init(_ string: String) {
        self = .init(value: string)
    }

    init(_ int: Int) {
        self = .init(value: int)
    }

    init(_ double: Double) {
        self = .init(value: double)
    }

    init(_ bool: Bool) {
        self = .init(value: bool)
    }

    private init(value: Any) {
        // This is a private initializer to avoid ambiguity
        if let string = value as? String {
            self = .string(string)
        } else if let int = value as? Int {
            self = .int(int)
        } else if let double = value as? Double {
            self = .double(double)
        } else if let bool = value as? Bool {
            self = .bool(bool)
        } else {
            self = .string("\(value)")
        }
    }
}

extension AnySendable: Equatable {
    public static func == (lhs: AnySendable, rhs: AnySendable) -> Bool {
        switch (lhs, rhs) {
        case let (.string(a), .string(b)):
            return a == b
        case let (.int(a), .int(b)):
            return a == b
        case let (.double(a), .double(b)):
            return a == b
        case let (.bool(a), .bool(b)):
            return a == b
        case (.null, .null):
            return true
        default:
            return false
        }
    }
}
