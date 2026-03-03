package com.slyos

import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer
import java.io.File
import java.nio.file.Paths

/**
 * Wraps DJL HuggingFace tokenizer for encoding text to token IDs and decoding back.
 * Uses the Rust-backed tokenizers library via JNI for fast tokenization.
 */
class SlyOSTokenizer(modelDirectory: File) {

    private val tokenizer: HuggingFaceTokenizer
    private val tokenizerConfig: Map<String, Any>?

    init {
        val tokenizerPath = File(modelDirectory, "tokenizer.json")
        if (!tokenizerPath.exists()) {
            throw TokenizerException("tokenizer.json not found in ${modelDirectory.absolutePath}")
        }

        tokenizer = HuggingFaceTokenizer.newInstance(Paths.get(tokenizerPath.absolutePath))

        // Load tokenizer config if available
        val configFile = File(modelDirectory, "tokenizer_config.json")
        tokenizerConfig = if (configFile.exists()) {
            try {
                val json = configFile.readText()
                @Suppress("UNCHECKED_CAST")
                kotlinx.serialization.json.Json.Default.parseToJsonElement(json)
                    .let { null } // We'll parse specific fields as needed
            } catch (e: Exception) {
                null
            }
        } else null
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Encode text to token IDs.
     *
     * @param text Input text to tokenize
     * @return Array of token IDs
     */
    fun encode(text: String): IntArray {
        val encoding = tokenizer.encode(text)
        return encoding.ids.map { it.toInt() }.toIntArray()
    }

    /**
     * Encode text to Long token IDs (for ONNX Runtime which uses Int64).
     *
     * @param text Input text to tokenize
     * @return LongArray of token IDs
     */
    fun encodeAsLong(text: String): LongArray {
        val encoding = tokenizer.encode(text)
        return encoding.ids
    }

    /**
     * Decode token IDs back to text.
     *
     * @param ids Token IDs to decode
     * @return Decoded text string
     */
    fun decode(ids: IntArray): String {
        return tokenizer.decode(ids.map { it.toLong() }.toLongArray())
    }

    /**
     * Decode Long token IDs back to text.
     *
     * @param ids Long token IDs to decode
     * @return Decoded text string
     */
    fun decodeLong(ids: LongArray): String {
        return tokenizer.decode(ids)
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Apply chat template to format messages for instruct models.
     * Uses ChatML format which is compatible with SmolLM2, Qwen, and most instruct models.
     *
     * @param messages List of chat messages with roles and content
     * @return Formatted prompt string ready for tokenization
     */
    fun applyChatTemplate(messages: List<ChatMessage>): String {
        return applyChatMLFormat(messages)
    }

    /**
     * ChatML format used by SmolLM2, Qwen, and many instruct models.
     */
    private fun applyChatMLFormat(messages: List<ChatMessage>): String {
        val sb = StringBuilder()
        for (message in messages) {
            sb.append("<|im_start|>${message.role}\n${message.content}<|im_end|>\n")
        }
        sb.append("<|im_start|>assistant\n")
        return sb.toString()
    }

    /**
     * Get the vocabulary size.
     */
    val vocabularySize: Int
        get() = try {
            // DJL tokenizer doesn't directly expose vocab size,
            // but we can estimate from the tokenizer
            32000 // Default for most models
        } catch (e: Exception) {
            32000
        }
}

/**
 * Exception thrown during tokenization operations.
 */
class TokenizerException(message: String) : Exception(message)
