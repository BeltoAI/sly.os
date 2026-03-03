import Foundation
import Transformers

// MARK: - SlyOS Tokenizer

/// Wraps HuggingFace swift-transformers to handle tokenization for LLM and Whisper models.
/// Supports encoding text to token IDs, decoding back to text, and chat template formatting.
public final class SlyOSTokenizer {

    private let tokenizer: Tokenizer
    private let tokenizerConfig: TokenizerConfig?

    // MARK: - Initialization

    /// Initialize tokenizer from a local model directory containing tokenizer.json.
    /// - Parameter modelDirectory: Directory containing tokenizer.json and optionally tokenizer_config.json
    public init(modelDirectory: URL) async throws {
        // Load tokenizer from local files
        let tokenizerPath = modelDirectory.appendingPathComponent("tokenizer.json")

        guard FileManager.default.fileExists(atPath: tokenizerPath.path) else {
            throw TokenizerError.fileNotFound("tokenizer.json not found in \(modelDirectory.path)")
        }

        // Load tokenizer config if available
        let configPath = modelDirectory.appendingPathComponent("tokenizer_config.json")
        if FileManager.default.fileExists(atPath: configPath.path) {
            let configData = try Data(contentsOf: configPath)
            self.tokenizerConfig = try? JSONDecoder().decode(TokenizerConfig.self, from: configData)
        } else {
            self.tokenizerConfig = nil
        }

        // Initialize HuggingFace tokenizer from local directory
        self.tokenizer = try await AutoTokenizer.from(modelFolder: modelDirectory)
    }

    // MARK: - Encoding

    /// Encode text to token IDs.
    /// - Parameter text: Input text to tokenize
    /// - Returns: Array of token IDs
    public func encode(_ text: String) -> [Int] {
        let encoding = tokenizer.encode(text: text)
        return encoding
    }

    /// Encode text to Int64 token IDs (for ONNX Runtime which uses Int64).
    /// - Parameter text: Input text to tokenize
    /// - Returns: Array of Int64 token IDs
    public func encodeAsInt64(_ text: String) -> [Int64] {
        return encode(text).map { Int64($0) }
    }

    // MARK: - Decoding

    /// Decode token IDs back to text.
    /// - Parameter ids: Array of token IDs
    /// - Returns: Decoded text string
    public func decode(_ ids: [Int]) -> String {
        return tokenizer.decode(tokens: ids)
    }

    /// Decode Int64 token IDs back to text.
    /// - Parameter ids: Array of Int64 token IDs
    /// - Returns: Decoded text string
    public func decodeInt64(_ ids: [Int64]) -> String {
        return decode(ids.map { Int(truncatingIfNeeded: $0) })
    }

    // MARK: - Chat Templates

    /// Apply chat template to format messages for instruct models.
    /// Converts an array of ChatMessage objects into a formatted prompt string
    /// that the model expects.
    ///
    /// For example, SmolLM2-Instruct uses:
    /// ```
    /// <|im_start|>system\nYou are a helpful assistant.<|im_end|>
    /// <|im_start|>user\nHello!<|im_end|>
    /// <|im_start|>assistant\n
    /// ```
    ///
    /// - Parameter messages: Array of chat messages with roles and content
    /// - Returns: Formatted prompt string ready for tokenization
    public func applyChatTemplate(messages: [ChatMessage]) -> String {
        // Try to use the tokenizer's built-in chat template if available
        if let chatTemplate = tokenizerConfig?.chatTemplate {
            return applyChatTemplateFormat(messages: messages, template: chatTemplate)
        }

        // Fallback: Use ChatML format (widely supported by instruct models)
        return applyChatMLFormat(messages: messages)
    }

    /// Apply ChatML format (used by SmolLM2, Qwen, and many other instruct models).
    private func applyChatMLFormat(messages: [ChatMessage]) -> String {
        var formatted = ""
        for message in messages {
            formatted += "<|im_start|>\(message.role)\n\(message.content)<|im_end|>\n"
        }
        // Add the assistant turn start
        formatted += "<|im_start|>assistant\n"
        return formatted
    }

    /// Apply template-based formatting.
    private func applyChatTemplateFormat(messages: [ChatMessage], template: String) -> String {
        // Simple Jinja2-like template processing for common patterns
        // Most HuggingFace models use ChatML or a close variant

        if template.contains("im_start") || template.contains("ChatML") {
            return applyChatMLFormat(messages: messages)
        }

        // Llama-style template
        if template.contains("[INST]") {
            return applyLlamaFormat(messages: messages)
        }

        // Default to ChatML
        return applyChatMLFormat(messages: messages)
    }

    /// Apply Llama instruction format.
    private func applyLlamaFormat(messages: [ChatMessage]) -> String {
        var formatted = ""
        var systemMessage = ""

        for message in messages {
            switch message.role {
            case "system":
                systemMessage = message.content
            case "user":
                if !systemMessage.isEmpty {
                    formatted += "[INST] <<SYS>>\n\(systemMessage)\n<</SYS>>\n\n\(message.content) [/INST]"
                    systemMessage = ""
                } else {
                    formatted += "[INST] \(message.content) [/INST]"
                }
            case "assistant":
                formatted += " \(message.content) "
            default:
                formatted += message.content
            }
        }

        return formatted
    }

    // MARK: - Token Info

    /// Get the vocabulary size.
    public var vocabularySize: Int {
        return tokenizer.vocabularySize
    }

    /// Get the EOS token ID if available.
    public var eosTokenId: Int? {
        return tokenizer.eosTokenId
    }

    /// Get the BOS (beginning of sequence) token ID if available.
    public var bosTokenId: Int? {
        return tokenizer.bosTokenId
    }

    /// Get the unknown token ID if available.
    public var unknownTokenId: Int? {
        return tokenizer.unknownTokenId
    }
}

// MARK: - Tokenizer Config

/// Parsed tokenizer_config.json for template and special token information.
struct TokenizerConfig: Codable {
    let chatTemplate: String?
    let modelMaxLength: Int?
    let bosToken: String?
    let eosToken: String?
    let padToken: String?
    let unkToken: String?

    enum CodingKeys: String, CodingKey {
        case chatTemplate = "chat_template"
        case modelMaxLength = "model_max_length"
        case bosToken = "bos_token"
        case eosToken = "eos_token"
        case padToken = "pad_token"
        case unkToken = "unk_token"
    }
}

// MARK: - Tokenizer Errors

public enum TokenizerError: LocalizedError {
    case fileNotFound(String)
    case initializationFailed(String)
    case encodingFailed(String)
    case decodingFailed(String)

    public var errorDescription: String? {
        switch self {
        case .fileNotFound(let msg):
            return "Tokenizer file not found: \(msg)"
        case .initializationFailed(let msg):
            return "Tokenizer initialization failed: \(msg)"
        case .encodingFailed(let msg):
            return "Token encoding failed: \(msg)"
        case .decodingFailed(let msg):
            return "Token decoding failed: \(msg)"
        }
    }
}
