import Foundation
import onnxruntime

// MARK: - ONNX Inference Engine

/// Wraps ONNX Runtime to run on-device inference for LLM text generation and Whisper STT.
/// Supports Core ML execution provider on Apple Silicon with automatic CPU fallback.
public final class OnnxInferenceEngine {

    private let environment: ORTEnv
    private let session: ORTSession
    private let sessionOptions: ORTSessionOptions

    // MARK: - Initialization

    /// Create an inference engine from a local ONNX model file.
    /// - Parameter modelPath: Path to the `.onnx` model file
    /// - Throws: If ONNX Runtime fails to initialize or load the model
    public init(modelPath: URL) throws {
        // Create ONNX Runtime environment
        self.environment = try ORTEnv(loggingLevel: .warning)

        // Configure session options
        self.sessionOptions = try ORTSessionOptions()
        try sessionOptions.setLogSeverityLevel(.warning)

        // Try to use Core ML execution provider for Apple Silicon acceleration
        #if os(iOS) || os(macOS)
        do {
            try sessionOptions.appendCoreMLExecutionProvider(with: .init())
        } catch {
            // Core ML EP not available — fall back to CPU (this is fine)
        }
        #endif

        // Set thread count for CPU execution
        try sessionOptions.setIntraOpNumThreads(Int32(min(ProcessInfo.processInfo.processorCount, 4)))

        // Create inference session
        self.session = try ORTSession(
            env: environment,
            modelPath: modelPath.path,
            sessionOptions: sessionOptions
        )
    }

    // MARK: - Text Generation (Autoregressive)

    /// Generate options for controlling text generation
    public struct GenerationConfig {
        public var maxNewTokens: Int = 100
        public var temperature: Float = 0.7
        public var topP: Float = 0.9
        public var topK: Int = 50
        public var repetitionPenalty: Float = 1.1
        public var eosTokenId: Int = 2  // Default EOS token
        public var padTokenId: Int = 0

        public init() {}
    }

    /// Run autoregressive text generation.
    /// - Parameters:
    ///   - inputIds: Tokenized input IDs
    ///   - config: Generation configuration
    /// - Returns: Array of generated token IDs (excluding input)
    public func generateTokens(
        inputIds: [Int64],
        config: GenerationConfig = .init()
    ) throws -> [Int64] {
        var currentIds = inputIds
        var generatedIds: [Int64] = []
        var pastKeyValues: [String: ORTValue]? = nil

        for _ in 0..<config.maxNewTokens {
            // Prepare input tensors
            let inputLength = currentIds.count
            let inputShape: [NSNumber] = [1, NSNumber(value: inputLength)]

            // Create input_ids tensor
            let inputIdsTensor = try createInt64Tensor(values: currentIds, shape: inputShape)

            // Create attention_mask tensor (all 1s)
            let attentionMask = Array(repeating: Int64(1), count: inputLength)
            let attentionMaskTensor = try createInt64Tensor(values: attentionMask, shape: inputShape)

            // Build input dict
            var inputs: [String: ORTValue] = [
                "input_ids": inputIdsTensor,
                "attention_mask": attentionMaskTensor,
            ]

            // Add past key values if available (for KV-cache optimization)
            if let past = pastKeyValues {
                for (key, value) in past {
                    inputs[key] = value
                }
            }

            // Run inference
            let outputNames = try session.outputNames()
            let results = try session.run(
                withInputs: inputs,
                outputNames: Set(outputNames),
                runOptions: nil
            )

            // Extract logits
            guard let logitsTensor = results["logits"] else {
                throw InferenceError.missingOutput("logits")
            }

            let logitsData = try logitsTensor.tensorData() as Data
            let vocabSize = logitsData.count / MemoryLayout<Float>.size / inputLength
            let logits = logitsData.withUnsafeBytes { buffer -> [Float] in
                let floatBuffer = buffer.bindMemory(to: Float.self)
                // Get logits for the last token position
                let startIdx = (inputLength - 1) * vocabSize
                return Array(floatBuffer[startIdx..<(startIdx + vocabSize)])
            }

            // Apply repetition penalty
            var processedLogits = logits
            if config.repetitionPenalty != 1.0 {
                let allIds = inputIds + generatedIds
                for id in allIds {
                    let idx = Int(id)
                    if idx < processedLogits.count {
                        if processedLogits[idx] > 0 {
                            processedLogits[idx] /= config.repetitionPenalty
                        } else {
                            processedLogits[idx] *= config.repetitionPenalty
                        }
                    }
                }
            }

            // Sample next token
            let nextToken = sampleToken(
                logits: processedLogits,
                temperature: config.temperature,
                topP: config.topP,
                topK: config.topK
            )

            // Check for EOS
            if nextToken == Int64(config.eosTokenId) {
                break
            }

            generatedIds.append(nextToken)

            // For next iteration, only feed the new token (with KV cache)
            // If model supports past_key_values, use them; otherwise feed full sequence
            if results.keys.contains(where: { $0.hasPrefix("present") || $0.hasPrefix("past_key_values") }) {
                // Model supports KV cache
                currentIds = [nextToken]
                pastKeyValues = results.filter { $0.key.hasPrefix("present") || $0.key.hasPrefix("past_key_values") }
            } else {
                // No KV cache — feed full sequence
                currentIds = inputIds + generatedIds
                pastKeyValues = nil
            }
        }

        return generatedIds
    }

    // MARK: - Whisper Inference (Encoder-Decoder)

    /// Run Whisper encoder on mel spectrogram input.
    /// - Parameter melSpectrogram: 2D array of mel spectrogram features [n_mels x n_frames]
    /// - Returns: Encoder hidden states as ORTValue for decoder input
    public func runWhisperEncoder(melSpectrogram: [[Float]]) throws -> ORTValue {
        let nMels = melSpectrogram.count
        let nFrames = melSpectrogram.first?.count ?? 0
        let flatMel = melSpectrogram.flatMap { $0 }

        let shape: [NSNumber] = [1, NSNumber(value: nMels), NSNumber(value: nFrames)]
        let inputTensor = try createFloatTensor(values: flatMel, shape: shape)

        let inputs: [String: ORTValue] = ["input_features": inputTensor]
        let outputNames = try session.outputNames()

        let results = try session.run(
            withInputs: inputs,
            outputNames: Set(outputNames),
            runOptions: nil
        )

        // Return encoder output (usually "last_hidden_state" or "encoder_last_hidden_state")
        if let encoderOutput = results["last_hidden_state"] ?? results["encoder_last_hidden_state"] {
            return encoderOutput
        }

        // If specific names not found, return first output
        guard let firstOutput = results.values.first else {
            throw InferenceError.missingOutput("encoder output")
        }
        return firstOutput
    }

    /// Run Whisper decoder to generate token IDs from encoder output.
    /// - Parameters:
    ///   - encoderOutput: Hidden states from encoder
    ///   - maxTokens: Maximum tokens to generate
    ///   - startTokenId: Token to start decoding with (usually <|startoftranscript|>)
    ///   - eosTokenId: End of sequence token (usually <|endoftext|>)
    /// - Returns: Array of decoded token IDs
    public func runWhisperDecoder(
        encoderOutput: ORTValue,
        maxTokens: Int = 448,
        startTokenId: Int64 = 50258,
        eosTokenId: Int64 = 50257
    ) throws -> [Int64] {
        var decoderIds: [Int64] = [startTokenId]

        for _ in 0..<maxTokens {
            let shape: [NSNumber] = [1, NSNumber(value: decoderIds.count)]
            let decoderInputTensor = try createInt64Tensor(values: decoderIds, shape: shape)

            let inputs: [String: ORTValue] = [
                "encoder_hidden_states": encoderOutput,
                "decoder_input_ids": decoderInputTensor,
            ]

            let outputNames = try session.outputNames()
            let results = try session.run(
                withInputs: inputs,
                outputNames: Set(outputNames),
                runOptions: nil
            )

            guard let logitsTensor = results["logits"] else {
                throw InferenceError.missingOutput("decoder logits")
            }

            let logitsData = try logitsTensor.tensorData() as Data
            let seqLen = decoderIds.count
            let vocabSize = logitsData.count / MemoryLayout<Float>.size / seqLen

            let logits = logitsData.withUnsafeBytes { buffer -> [Float] in
                let floatBuffer = buffer.bindMemory(to: Float.self)
                let startIdx = (seqLen - 1) * vocabSize
                return Array(floatBuffer[startIdx..<(startIdx + vocabSize)])
            }

            // Greedy decoding for Whisper (deterministic)
            let nextToken = Int64(argmax(logits))

            if nextToken == eosTokenId {
                break
            }

            decoderIds.append(nextToken)
        }

        return Array(decoderIds.dropFirst()) // Remove start token
    }

    // MARK: - Tensor Helpers

    private func createInt64Tensor(values: [Int64], shape: [NSNumber]) throws -> ORTValue {
        let data = Data(bytes: values, count: values.count * MemoryLayout<Int64>.size)
        let mutableData = NSMutableData(data: data)
        return try ORTValue(
            tensorData: mutableData,
            elementType: .int64,
            shape: shape
        )
    }

    private func createFloatTensor(values: [Float], shape: [NSNumber]) throws -> ORTValue {
        let data = Data(bytes: values, count: values.count * MemoryLayout<Float>.size)
        let mutableData = NSMutableData(data: data)
        return try ORTValue(
            tensorData: mutableData,
            elementType: .float,
            shape: shape
        )
    }

    // MARK: - Sampling

    /// Sample a token from logits using temperature + top-p (nucleus) sampling.
    private func sampleToken(logits: [Float], temperature: Float, topP: Float, topK: Int) -> Int64 {
        // Apply temperature
        var scaledLogits = logits
        if temperature > 0 && temperature != 1.0 {
            scaledLogits = logits.map { $0 / temperature }
        }

        // If temperature is 0, use greedy decoding
        if temperature == 0 {
            return Int64(argmax(scaledLogits))
        }

        // Softmax
        let maxLogit = scaledLogits.max() ?? 0
        let expLogits = scaledLogits.map { exp($0 - maxLogit) }
        let sumExp = expLogits.reduce(0, +)
        var probs = expLogits.map { $0 / sumExp }

        // Top-K filtering
        if topK > 0 && topK < probs.count {
            let indexed = probs.enumerated().sorted { $0.element > $1.element }
            let threshold = indexed[min(topK - 1, indexed.count - 1)].element
            probs = probs.map { $0 >= threshold ? $0 : 0 }
            // Renormalize
            let sum = probs.reduce(0, +)
            if sum > 0 { probs = probs.map { $0 / sum } }
        }

        // Top-P (nucleus) filtering
        if topP < 1.0 {
            let indexed = probs.enumerated().sorted { $0.element > $1.element }
            var cumProb: Float = 0
            var cutoffIdx = indexed.count
            for (i, item) in indexed.enumerated() {
                cumProb += item.element
                if cumProb >= topP {
                    cutoffIdx = i + 1
                    break
                }
            }
            let allowedIndices = Set(indexed.prefix(cutoffIdx).map { $0.offset })
            probs = probs.enumerated().map { allowedIndices.contains($0.offset) ? $0.element : 0 }
            // Renormalize
            let sum = probs.reduce(0, +)
            if sum > 0 { probs = probs.map { $0 / sum } }
        }

        // Weighted random sampling
        let random = Float.random(in: 0..<1)
        var cumulative: Float = 0
        for (index, prob) in probs.enumerated() {
            cumulative += prob
            if cumulative >= random {
                return Int64(index)
            }
        }

        // Fallback to most likely token
        return Int64(argmax(probs))
    }

    /// Return index of maximum value.
    private func argmax(_ array: [Float]) -> Int {
        guard !array.isEmpty else { return 0 }
        var maxIdx = 0
        var maxVal = array[0]
        for i in 1..<array.count {
            if array[i] > maxVal {
                maxVal = array[i]
                maxIdx = i
            }
        }
        return maxIdx
    }
}

// MARK: - Inference Errors

public enum InferenceError: LocalizedError {
    case missingOutput(String)
    case invalidTensorShape(String)
    case sessionCreationFailed(String)
    case executionFailed(String)

    public var errorDescription: String? {
        switch self {
        case .missingOutput(let name):
            return "Missing expected output tensor: \(name)"
        case .invalidTensorShape(let detail):
            return "Invalid tensor shape: \(detail)"
        case .sessionCreationFailed(let detail):
            return "Failed to create ONNX session: \(detail)"
        case .executionFailed(let detail):
            return "Inference execution failed: \(detail)"
        }
    }
}
