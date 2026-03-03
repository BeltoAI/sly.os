import Foundation
import CommonCrypto
import Security
import onnxruntime

// MARK: - Main SlyOS SDK Class

/// The main SlyOS SDK class for on-device AI inference on iOS and macOS.
///
/// Supports real on-device inference using ONNX Runtime with Core ML acceleration.
/// Models are downloaded from HuggingFace Hub, cached locally, and run entirely on-device.
///
/// Example:
/// ```swift
/// let sdk = SlyOS(config: SlyOSConfig(apiKey: "your-key"))
/// let profile = try await sdk.initialize()
/// try await sdk.loadModel("quantum-1.7b")
/// let response = try await sdk.generate("quantum-1.7b", prompt: "What is AI?")
/// ```
@MainActor
public final class SlyOS {
    // MARK: - Private Properties

    private let config: SlyOSConfig
    private let networkClient: NetworkClient
    private let downloader: ModelDownloader
    private var deviceId: String

    private var deviceProfile: DeviceProfile?
    private var loadedModels: [String: LoadedModelInfo] = [:]

    // Telemetry batching
    private var telemetryBuffer: [TelemetryEntry] = []
    private var telemetryFlushTask: Task<Void, Never>?
    private static let telemetryBatchSize = 10
    private static let telemetryFlushInterval: UInt64 = 60_000_000_000 // 60 seconds in nanoseconds

    /// SDK version string
    public static let sdkVersion = "1.4.1"

    /// Information about a loaded model including inference engine and tokenizer
    private struct LoadedModelInfo {
        let modelId: String
        let hfModelId: String
        let category: ModelCategory
        let quantizationLevel: QuantizationLevel
        let contextWindow: Int
        let engine: OnnxInferenceEngine
        let tokenizer: SlyOSTokenizer?  // nil for STT models
        let modelDirectory: URL
        let loadedAt: Date
    }

    /// Telemetry entry for batched reporting
    private struct TelemetryEntry {
        let latencyMs: Int
        let tokensGenerated: Int
        let success: Bool
        let modelId: String
        let timestamp: Int
    }

    // MARK: - Initialization

    /// Initialize SlyOS SDK
    /// - Parameter config: Configuration with API key and optional callbacks
    public init(config: SlyOSConfig) {
        self.config = config
        self.networkClient = NetworkClient(apiUrl: config.apiUrl)
        self.downloader = ModelDownloader()
        self.deviceId = "" // Set in initialize()
    }

    deinit {
        telemetryFlushTask?.cancel()
    }

    // MARK: - Progress and Event Handling

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

    // MARK: - Persistent Device Identity

    /// Get or create a persistent device ID.
    /// iOS: stored in Keychain (survives app reinstalls)
    /// macOS: stored in ~/Library/Application Support/SlyOS/
    private static func getOrCreateDeviceId() -> String {
        let keychainKey = "com.slyos.device-id"

        // Try to read from Keychain
        if let existing = KeychainHelper.read(key: keychainKey) {
            return existing
        }

        // Generate new device ID
        let deviceId = "device-\(Int(Date().timeIntervalSince1970))-\(UUID().uuidString.prefix(12))"

        // Store in Keychain
        KeychainHelper.save(key: keychainKey, value: deviceId)

        return deviceId
    }

    /// Generate a device fingerprint from stable hardware signals.
    private static func generateDeviceFingerprint() -> String {
        var components: [String] = []

        // CPU info
        components.append(String(ProcessInfo.processInfo.processorCount))
        components.append(String(ProcessInfo.processInfo.physicalMemory))

        // Platform
        #if os(iOS)
        components.append("iOS")
        #elseif os(macOS)
        components.append("macOS")
        #endif

        // OS version
        let osVersion = ProcessInfo.processInfo.operatingSystemVersion
        components.append("\(osVersion.majorVersion).\(osVersion.minorVersion)")

        // GPU detection is handled by DeviceProfiler via Metal framework

        let joined = components.joined(separator: "|")

        // SHA256 hash
        return sha256(joined)
    }

    private static func sha256(_ string: String) -> String {
        guard let data = string.data(using: .utf8) else { return "unknown" }
        var hash = [UInt8](repeating: 0, count: 32)
        data.withUnsafeBytes { buffer in
            _ = CC_SHA256(buffer.baseAddress, CC_LONG(data.count), &hash)
        }
        return hash.prefix(16).map { String(format: "%02x", $0) }.joined()
    }

    // MARK: - Device Profiling

    /// Analyze device capabilities
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

    public func getDeviceProfile() -> DeviceProfile? {
        return deviceProfile
    }

    // MARK: - Model Recommendations

    public func recommendModel(category: ModelCategory = .llm) -> ModelRecommendation? {
        guard let profile = deviceProfile else {
            emitProgress(stage: .error, progress: 0, message: "Device not profiled. Call analyzeDevice() first.")
            return nil
        }
        return SlyOS_recommendModel(category: category, deviceProfile: profile)
    }

    public func getAvailableModels() -> [String: [ModelInfo]] {
        var grouped: [String: [ModelInfo]] = ["llm": [], "stt": []]
        for (_, info) in modelRegistry {
            let categoryKey = info.category.rawValue
            if grouped[categoryKey] == nil { grouped[categoryKey] = [] }
            grouped[categoryKey]?.append(info)
        }
        return grouped
    }

    public func canRunModel(
        _ modelId: String,
        quant: QuantizationLevel? = nil
    ) -> (canRun: Bool, reason: String, recommendedQuant: QuantizationLevel) {
        guard let profile = deviceProfile else {
            return (canRun: true, reason: "Device not profiled yet - call initialize() first", recommendedQuant: .q4)
        }
        let check = checkModelCompatibility(modelId: modelId, quantization: quant, deviceProfile: profile)
        return (canRun: check.canRun, reason: check.reason, recommendedQuant: check.recommendedQuant)
    }

    // MARK: - SDK Version

    public func getSdkVersion() -> String {
        return Self.sdkVersion
    }

    // MARK: - Initialization

    /// Initialize SlyOS SDK.
    /// Authenticates with API, profiles device, and registers with backend.
    public func initialize() async throws -> DeviceProfile {
        emitProgress(stage: .initializing, progress: 0, message: "Starting SlyOS...")

        // Step 1: Persistent device ID
        self.deviceId = Self.getOrCreateDeviceId()

        // Step 2: Profile device
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

        // Step 3: Authenticate
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

        // Step 4: Register device with enhanced profile
        emitProgress(stage: .initializing, progress: 70, message: "Registering device...")
        do {
            try await networkClient.registerDevice(deviceId: deviceId, profile: profile)
            emitProgress(stage: .initializing, progress: 90, message: "Device registered")
            emitEvent(type: .deviceRegistered, data: ["deviceId": AnySendable(deviceId)])
        } catch {
            emitProgress(stage: .initializing, progress: 90, message: "Device registration skipped (non-critical)")
        }

        // Step 5: Start telemetry flush timer
        startTelemetryTimer()

        emitProgress(
            stage: .ready,
            progress: 100,
            message: "SlyOS v\(Self.sdkVersion) ready — recommended: \(profile.recommendedQuant.rawValue.uppercased())"
        )

        return profile
    }

    // MARK: - Model Loading (REAL)

    /// Load a model for on-device inference.
    /// Downloads the ONNX model from HuggingFace Hub (cached locally) and initializes the inference engine.
    public func loadModel(
        _ modelId: String,
        quant: QuantizationLevel = .q4
    ) async throws {
        guard let registryInfo = modelRegistry[modelId] else {
            let available = modelRegistry.keys.joined(separator: ", ")
            throw SlyOSError.modelNotFound("Available: \(available)")
        }

        guard let profile = deviceProfile else {
            throw SlyOSError.deviceNotInitialized
        }

        // Check compatibility
        let check = checkModelCompatibility(modelId: modelId, quantization: quant, deviceProfile: profile)
        if !check.canRun {
            emitProgress(stage: .error, progress: 0, message: check.reason)
            throw SlyOSError.insufficientMemory(required: registryInfo.minRAM_MB[quant] ?? 0)
        }

        let estimatedSize = registryInfo.sizesMB[quant] ?? 0
        emitProgress(
            stage: .downloading,
            progress: 0,
            message: "Downloading \(modelId) (\(quant.rawValue.uppercased()), ~\(estimatedSize)MB)..."
        )
        emitEvent(type: .modelDownloadStart, data: [
            "modelId": AnySendable(modelId),
            "quant": AnySendable(quant.rawValue),
            "estimatedSizeMB": AnySendable(estimatedSize)
        ])

        let startTime = Date()

        do {
            // Step 1: Download model files from HuggingFace
            let modelDir = try await downloader.downloadModel(
                hfModelId: registryInfo.hfModel,
                quant: quant,
                progress: { [weak self] downloaded, total, fileName in
                    let percent = total > 0 ? Int(downloaded * 100 / total) : 0
                    let downloadedMB = downloaded / (1024 * 1024)
                    let totalMB = total / (1024 * 1024)
                    self?.emitProgress(
                        stage: .downloading,
                        progress: percent,
                        message: "Downloading \(fileName): \(downloadedMB)MB / \(totalMB)MB"
                    )
                    self?.emitEvent(type: .modelDownloadProgress, data: [
                        "modelId": AnySendable(modelId),
                        "percent": AnySendable(percent),
                        "file": AnySendable(fileName)
                    ])
                }
            )

            // Step 2: Initialize ONNX Runtime engine
            emitProgress(stage: .loading, progress: 80, message: "Loading \(modelId) into ONNX Runtime...")

            let modelFile = modelDir.appendingPathComponent("model.onnx")
            guard FileManager.default.fileExists(atPath: modelFile.path) else {
                throw SlyOSError.modelLoadingFailed("model.onnx not found after download")
            }

            let engine = try OnnxInferenceEngine(modelPath: modelFile)

            // Step 3: Initialize tokenizer (for LLM models)
            var tokenizer: SlyOSTokenizer? = nil
            if registryInfo.category == .llm {
                emitProgress(stage: .loading, progress: 90, message: "Loading tokenizer...")
                tokenizer = try await SlyOSTokenizer(modelDirectory: modelDir)
            }

            // Step 4: Determine context window
            let contextWindow = recommendContextWindow(memoryMB: profile.memoryMB, quant: quant)

            // Store loaded model
            let loadedModel = LoadedModelInfo(
                modelId: modelId,
                hfModelId: registryInfo.hfModel,
                category: registryInfo.category,
                quantizationLevel: quant,
                contextWindow: contextWindow,
                engine: engine,
                tokenizer: tokenizer,
                modelDirectory: modelDir,
                loadedAt: Date()
            )
            loadedModels[modelId] = loadedModel

            let loadTime = Int(Date().timeIntervalSince(startTime) * 1000)

            emitProgress(
                stage: .ready,
                progress: 100,
                message: "Loaded \(modelId) in \(loadTime / 1000)s (context: \(contextWindow))"
            )
            emitEvent(type: .modelLoaded, data: [
                "modelId": AnySendable(modelId),
                "quant": AnySendable(quant.rawValue),
                "loadTimeMs": AnySendable(loadTime),
                "contextWindow": AnySendable(contextWindow)
            ])

            // Report telemetry
            try? await networkClient.reportTelemetry(
                deviceId: deviceId,
                eventType: "model_load",
                modelId: modelId,
                success: true,
                latencyMs: loadTime
            )

        } catch let error as SlyOSError {
            emitProgress(stage: .error, progress: 0, message: "Failed to load \(modelId): \(error.localizedDescription ?? "unknown")")
            emitEvent(type: .error, data: ["modelId": AnySendable(modelId), "error": AnySendable(error.localizedDescription ?? "unknown")])
            try? await networkClient.reportTelemetry(deviceId: deviceId, eventType: "model_load", modelId: modelId, success: false, errorMessage: error.localizedDescription)
            throw error
        } catch {
            let wrapped = SlyOSError.modelLoadingFailed(error.localizedDescription)
            emitProgress(stage: .error, progress: 0, message: "Failed to load \(modelId): \(error.localizedDescription)")
            emitEvent(type: .error, data: ["modelId": AnySendable(modelId), "error": AnySendable(error.localizedDescription)])
            try? await networkClient.reportTelemetry(deviceId: deviceId, eventType: "model_load", modelId: modelId, success: false, errorMessage: error.localizedDescription)
            throw wrapped
        }
    }

    // MARK: - Text Generation (REAL)

    /// Generate text using a loaded model with real on-device ONNX Runtime inference.
    public func generate(
        _ modelId: String,
        prompt: String,
        options: GenerateOptions = .init()
    ) async throws -> String {
        // Auto-load if not loaded
        if loadedModels[modelId] == nil {
            try await loadModel(modelId)
        }

        guard let loaded = loadedModels[modelId] else {
            throw SlyOSError.modelNotFound(modelId)
        }

        guard loaded.category == .llm else {
            throw SlyOSError.inferenceFailed("Model \(modelId) is not an LLM. Use transcribe() for STT models.")
        }

        guard let tokenizer = loaded.tokenizer else {
            throw SlyOSError.inferenceFailed("No tokenizer available for \(modelId)")
        }

        let maxTokens = min(options.maxTokens ?? 100, loaded.contextWindow)

        emitProgress(stage: .generating, progress: 0, message: "Generating (max \(maxTokens) tokens)...")
        emitEvent(type: .inferenceStart, data: ["modelId": AnySendable(modelId), "maxTokens": AnySendable(maxTokens)])

        let startTime = Date()

        do {
            // Step 1: Tokenize the prompt
            let inputIds = tokenizer.encodeAsInt64(prompt)

            // Step 2: Run autoregressive generation
            var genConfig = OnnxInferenceEngine.GenerationConfig()
            genConfig.maxNewTokens = maxTokens
            genConfig.temperature = options.temperature ?? 0.7
            genConfig.topP = options.topP ?? 0.9
            if let eosId = tokenizer.eosTokenId {
                genConfig.eosTokenId = eosId
            }

            let generatedIds = try loaded.engine.generateTokens(
                inputIds: inputIds,
                config: genConfig
            )

            // Step 3: Decode generated tokens
            let response = tokenizer.decodeInt64(generatedIds).trimmingCharacters(in: .whitespacesAndNewlines)

            let latency = Int(Date().timeIntervalSince(startTime) * 1000)
            let tokensGenerated = generatedIds.count
            let tokensPerSec = latency > 0 ? Double(tokensGenerated) / (Double(latency) / 1000.0) : 0

            emitProgress(
                stage: .ready,
                progress: 100,
                message: "Generated \(tokensGenerated) tokens in \(latency)ms (\(String(format: "%.1f", tokensPerSec)) tok/s)"
            )
            emitEvent(type: .inferenceComplete, data: [
                "modelId": AnySendable(modelId),
                "latencyMs": AnySendable(latency),
                "tokensGenerated": AnySendable(tokensGenerated),
                "tokensPerSec": AnySendable(tokensPerSec)
            ])

            // Batch telemetry
            recordTelemetry(TelemetryEntry(
                latencyMs: latency,
                tokensGenerated: tokensGenerated,
                success: true,
                modelId: modelId,
                timestamp: Int(Date().timeIntervalSince1970 * 1000)
            ))

            return response

        } catch {
            let latency = Int(Date().timeIntervalSince(startTime) * 1000)
            emitProgress(stage: .error, progress: 0, message: "Generation failed: \(error.localizedDescription)")
            emitEvent(type: .error, data: ["modelId": AnySendable(modelId), "error": AnySendable(error.localizedDescription)])

            recordTelemetry(TelemetryEntry(
                latencyMs: latency,
                tokensGenerated: 0,
                success: false,
                modelId: modelId,
                timestamp: Int(Date().timeIntervalSince1970 * 1000)
            ))

            throw SlyOSError.inferenceFailed(error.localizedDescription)
        }
    }

    // MARK: - Speech-to-Text (REAL)

    /// Transcribe audio using a Whisper model with real on-device inference.
    /// - Parameters:
    ///   - modelId: Whisper model ID (e.g., "voicecore-base", "voicecore-small")
    ///   - audioURL: URL to the audio file (wav, mp3, m4a, etc.)
    ///   - options: Transcription options
    /// - Returns: Transcribed text
    public func transcribe(
        _ modelId: String,
        audioURL: URL,
        language: String = "en"
    ) async throws -> String {
        // Auto-load if not loaded
        if loadedModels[modelId] == nil {
            try await loadModel(modelId)
        }

        guard let loaded = loadedModels[modelId] else {
            throw SlyOSError.modelNotFound(modelId)
        }

        guard loaded.category == .stt else {
            throw SlyOSError.inferenceFailed("Model \(modelId) is not an STT model. Use generate() for LLMs.")
        }

        emitProgress(stage: .transcribing, progress: 0, message: "Transcribing audio...")
        emitEvent(type: .inferenceStart, data: ["modelId": AnySendable(modelId), "type": AnySendable("transcription")])

        let startTime = Date()

        do {
            // Step 1: Load and preprocess audio
            emitProgress(stage: .transcribing, progress: 10, message: "Loading audio...")
            let audioSamples = try AudioProcessor.loadAudio(from: audioURL)

            // Step 2: Compute mel spectrogram
            emitProgress(stage: .transcribing, progress: 30, message: "Computing mel spectrogram...")
            let melSpec = AudioProcessor.computeMelSpectrogram(audio: audioSamples)

            // Step 3: Run Whisper encoder
            emitProgress(stage: .transcribing, progress: 50, message: "Running encoder...")
            let encoderOutput = try loaded.engine.runWhisperEncoder(melSpectrogram: melSpec)

            // Step 4: Run Whisper decoder
            emitProgress(stage: .transcribing, progress: 70, message: "Decoding transcription...")
            let tokenIds = try loaded.engine.runWhisperDecoder(
                encoderOutput: encoderOutput,
                maxTokens: 448
            )

            // Step 5: Decode tokens to text
            // For Whisper, we use a simple decode since the tokenizer handles special tokens
            let text: String
            if let tokenizer = loaded.tokenizer {
                text = tokenizer.decodeInt64(tokenIds)
            } else {
                // Fallback: basic ASCII decode (shouldn't happen if tokenizer loaded)
                text = tokenIds.map { String(UnicodeScalar(Int($0) % 128)!) }.joined()
            }

            let latency = Int(Date().timeIntervalSince(startTime) * 1000)

            emitProgress(
                stage: .ready,
                progress: 100,
                message: "Transcribed in \(latency)ms"
            )
            emitEvent(type: .inferenceComplete, data: [
                "modelId": AnySendable(modelId),
                "latencyMs": AnySendable(latency),
                "type": AnySendable("transcription")
            ])

            try? await networkClient.reportTelemetry(
                deviceId: deviceId,
                eventType: "inference",
                modelId: modelId,
                success: true,
                latencyMs: latency
            )

            return text.trimmingCharacters(in: .whitespacesAndNewlines)

        } catch {
            emitProgress(stage: .error, progress: 0, message: "Transcription failed: \(error.localizedDescription)")
            emitEvent(type: .error, data: ["modelId": AnySendable(modelId), "error": AnySendable(error.localizedDescription)])

            try? await networkClient.reportTelemetry(
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

    /// OpenAI-compatible chat completion using on-device inference.
    public func chatCompletion(
        _ modelId: String,
        request: ChatCompletionRequest
    ) async throws -> ChatCompletionResponse {
        // Auto-load if not loaded
        if loadedModels[modelId] == nil {
            try await loadModel(modelId)
        }

        guard let loaded = loadedModels[modelId], let tokenizer = loaded.tokenizer else {
            throw SlyOSError.modelNotFound(modelId)
        }

        // Apply chat template to format messages correctly for the model
        let prompt = tokenizer.applyChatTemplate(messages: request.messages)

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

        // Estimate token counts
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

    public func unloadModel(_ modelId: String) {
        loadedModels.removeValue(forKey: modelId)
    }

    public func unloadAllModels() {
        loadedModels.removeAll()
    }

    /// Flush remaining telemetry and clean up.
    public func destroy() async {
        telemetryFlushTask?.cancel()
        await flushTelemetry()
    }

    // MARK: - Telemetry Batching

    private func recordTelemetry(_ entry: TelemetryEntry) {
        telemetryBuffer.append(entry)
        if telemetryBuffer.count >= Self.telemetryBatchSize {
            Task { await flushTelemetry() }
        }
    }

    private func startTelemetryTimer() {
        telemetryFlushTask?.cancel()
        telemetryFlushTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: Self.telemetryFlushInterval)
                guard !Task.isCancelled else { break }
                await self?.flushTelemetry()
            }
        }
    }

    private func flushTelemetry() async {
        guard !telemetryBuffer.isEmpty else { return }

        let batch = telemetryBuffer
        telemetryBuffer = []

        do {
            try await networkClient.reportBatchTelemetry(
                deviceId: deviceId,
                metrics: batch.map { entry in
                    [
                        "latency_ms": entry.latencyMs,
                        "tokens_generated": entry.tokensGenerated,
                        "success": entry.success,
                        "model_id": entry.modelId,
                        "timestamp": entry.timestamp,
                    ] as [String: Any]
                }
            )
            emitEvent(type: .inferenceComplete, data: ["telemetry_flushed": AnySendable(batch.count)])
        } catch {
            // Put back on failure, cap at 100
            telemetryBuffer.insert(contentsOf: batch, at: 0)
            if telemetryBuffer.count > 100 {
                telemetryBuffer = Array(telemetryBuffer.suffix(100))
            }
        }
    }
}

// MARK: - Keychain Helper

private enum KeychainHelper {
    static func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]

        SecItemDelete(query as CFDictionary) // Remove existing
        SecItemAdd(query as CFDictionary, nil)
    }

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        guard status == errSecSuccess, let data = item as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }
}

// MARK: - AnySendable Equatable Conformance

extension AnySendable: Equatable {
    public static func == (lhs: AnySendable, rhs: AnySendable) -> Bool {
        switch (lhs, rhs) {
        case let (.string(a), .string(b)): return a == b
        case let (.int(a), .int(b)): return a == b
        case let (.double(a), .double(b)): return a == b
        case let (.bool(a), .bool(b)): return a == b
        case (.null, .null): return true
        default: return false
        }
    }
}
