package com.slyos

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.Closeable
import java.nio.FloatBuffer
import java.nio.LongBuffer
import kotlin.math.exp
import kotlin.math.ln
import kotlin.random.Random

/**
 * Wraps ONNX Runtime to run on-device inference for LLM text generation and Whisper STT.
 * Supports NNAPI execution provider on Android for GPU/NPU acceleration with CPU fallback.
 */
class OnnxInferenceEngine(
    modelPath: String
) : Closeable {

    private val ortEnv: OrtEnvironment = OrtEnvironment.getEnvironment()
    private val session: OrtSession

    init {
        val sessionOptions = OrtSession.SessionOptions().apply {
            // Try NNAPI execution provider for hardware acceleration
            try {
                addNnapi()
            } catch (e: Exception) {
                // NNAPI not available — CPU fallback is fine
            }

            // Optimize for inference
            setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)

            // Thread pool
            setIntraOpNumThreads(minOf(Runtime.getRuntime().availableProcessors(), 4))
        }

        session = ortEnv.createSession(modelPath, sessionOptions)
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Generation configuration for controlling text output.
     */
    data class GenerationConfig(
        var maxNewTokens: Int = 100,
        var temperature: Float = 0.7f,
        var topP: Float = 0.9f,
        var topK: Int = 50,
        var repetitionPenalty: Float = 1.1f,
        var eosTokenId: Int = 2,
        var padTokenId: Int = 0
    )

    /**
     * Run autoregressive text generation.
     *
     * @param inputIds Tokenized input IDs
     * @param config Generation configuration
     * @return Array of generated token IDs (excluding input)
     */
    fun generateTokens(
        inputIds: LongArray,
        config: GenerationConfig = GenerationConfig()
    ): LongArray {
        var currentIds = inputIds.copyOf()
        val generatedIds = mutableListOf<Long>()

        for (step in 0 until config.maxNewTokens) {
            val inputLength = currentIds.size

            // Create input tensors
            val inputIdsTensor = OnnxTensor.createTensor(
                ortEnv,
                LongBuffer.wrap(currentIds),
                longArrayOf(1, inputLength.toLong())
            )

            val attentionMask = LongArray(inputLength) { 1L }
            val attentionMaskTensor = OnnxTensor.createTensor(
                ortEnv,
                LongBuffer.wrap(attentionMask),
                longArrayOf(1, inputLength.toLong())
            )

            val inputs = mapOf(
                "input_ids" to inputIdsTensor,
                "attention_mask" to attentionMaskTensor
            )

            // Run inference
            val results = session.run(inputs)

            // Extract logits from the last token position
            val logitsResult = results.get("logits")
                ?: results.get(0)
                ?: throw InferenceException("Missing logits output")

            @Suppress("UNCHECKED_CAST")
            val logitsTensor = logitsResult.get() as? Array<Array<FloatArray>>
                ?: throw InferenceException("Unexpected logits output type: ${logitsResult.info}")
            val lastPositionLogits = logitsTensor[0][inputLength - 1]
            val vocabSize = lastPositionLogits.size

            // Apply repetition penalty
            val processedLogits = lastPositionLogits.copyOf()
            if (config.repetitionPenalty != 1.0f) {
                val allIds = inputIds.toList() + generatedIds
                for (id in allIds) {
                    val idx = id.toInt()
                    if (idx in processedLogits.indices) {
                        if (processedLogits[idx] > 0) {
                            processedLogits[idx] /= config.repetitionPenalty
                        } else {
                            processedLogits[idx] *= config.repetitionPenalty
                        }
                    }
                }
            }

            // Sample next token
            val nextToken = sampleToken(
                processedLogits,
                config.temperature,
                config.topP,
                config.topK
            )

            // Clean up tensors
            inputIdsTensor.close()
            attentionMaskTensor.close()
            results.close()

            // Check for EOS
            if (nextToken == config.eosTokenId.toLong()) {
                break
            }

            generatedIds.add(nextToken)

            // Feed full sequence for next iteration (no KV-cache for simplicity)
            currentIds = inputIds + generatedIds.toLongArray()
        }

        return generatedIds.toLongArray()
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Run Whisper encoder on mel spectrogram input.
     *
     * @param melSpectrogram 2D array [n_mels x n_frames]
     * @return Encoder hidden states tensor
     */
    fun runWhisperEncoder(melSpectrogram: Array<FloatArray>): OnnxTensor {
        val nMels = melSpectrogram.size
        val nFrames = melSpectrogram.firstOrNull()?.size ?: 0
        val flatMel = melSpectrogram.flatMap { it.toList() }.toFloatArray()

        val inputTensor = OnnxTensor.createTensor(
            ortEnv,
            FloatBuffer.wrap(flatMel),
            longArrayOf(1, nMels.toLong(), nFrames.toLong())
        )

        val inputs = mapOf("input_features" to inputTensor)
        val results = session.run(inputs)

        // Get encoder output
        val output = results.get("last_hidden_state")
            ?: results.get("encoder_last_hidden_state")
            ?: results.get(0)
            ?: throw InferenceException("Missing encoder output")

        // Note: caller is responsible for closing the tensor
        return output.get() as OnnxTensor
    }

    /**
     * Run Whisper decoder to generate token IDs from encoder output.
     *
     * @param encoderOutput Hidden states from encoder
     * @param maxTokens Maximum tokens to generate
     * @param startTokenId Start of transcript token
     * @param eosTokenId End of text token
     * @return Array of decoded token IDs
     */
    fun runWhisperDecoder(
        encoderOutput: OnnxTensor,
        maxTokens: Int = 448,
        startTokenId: Long = 50258L,
        eosTokenId: Long = 50257L
    ): LongArray {
        val decoderIds = mutableListOf(startTokenId)

        for (step in 0 until maxTokens) {
            val decoderInputTensor = OnnxTensor.createTensor(
                ortEnv,
                LongBuffer.wrap(decoderIds.toLongArray()),
                longArrayOf(1, decoderIds.size.toLong())
            )

            val inputs = mapOf(
                "encoder_hidden_states" to encoderOutput,
                "decoder_input_ids" to decoderInputTensor
            )

            val results = session.run(inputs)

            val logitsResult = results.get("logits")
                ?: results.get(0)
                ?: throw InferenceException("Missing decoder logits")

            @Suppress("UNCHECKED_CAST")
            val logitsTensor = logitsResult.get() as? Array<Array<FloatArray>>
                ?: throw InferenceException("Unexpected decoder logits type: ${logitsResult.info}")
            val seqLen = decoderIds.size
            val lastLogits = logitsTensor[0][seqLen - 1]

            // Greedy decode for Whisper
            val nextToken = argmax(lastLogits).toLong()

            decoderInputTensor.close()
            results.close()

            if (nextToken == eosTokenId) break
            decoderIds.add(nextToken)
        }

        return decoderIds.drop(1).toLongArray() // Remove start token
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Sample a token from logits using temperature + top-p + top-k sampling.
     */
    private fun sampleToken(logits: FloatArray, temperature: Float, topP: Float, topK: Int): Long {
        // Greedy if temperature is 0
        if (temperature == 0f) {
            return argmax(logits).toLong()
        }

        // Apply temperature
        val scaled = if (temperature != 1.0f) {
            logits.map { it / temperature }.toFloatArray()
        } else logits

        // Softmax
        val maxLogit = scaled.max()
        val expLogits = scaled.map { exp((it - maxLogit).toDouble()).toFloat() }.toFloatArray()
        val sumExp = expLogits.sum()
        var probs = expLogits.map { it / sumExp }.toFloatArray()

        // Top-K filtering
        if (topK > 0 && topK < probs.size) {
            val indexed = probs.mapIndexed { i, p -> i to p }.sortedByDescending { it.second }
            val threshold = indexed[minOf(topK - 1, indexed.size - 1)].second
            probs = probs.map { if (it >= threshold) it else 0f }.toFloatArray()
            val sum = probs.sum()
            if (sum > 0) probs = probs.map { it / sum }.toFloatArray()
        }

        // Top-P nucleus filtering
        if (topP < 1.0f) {
            val indexed = probs.mapIndexed { i, p -> i to p }.sortedByDescending { it.second }
            var cumProb = 0f
            var cutoffIdx = indexed.size
            for ((i, item) in indexed.withIndex()) {
                cumProb += item.second
                if (cumProb >= topP) {
                    cutoffIdx = i + 1
                    break
                }
            }
            val allowedIndices = indexed.take(cutoffIdx).map { it.first }.toSet()
            probs = probs.mapIndexed { i, p -> if (i in allowedIndices) p else 0f }.toFloatArray()
            val sum = probs.sum()
            if (sum > 0) probs = probs.map { it / sum }.toFloatArray()
        }

        // Weighted random sampling
        val random = Random.nextFloat()
        var cumulative = 0f
        for (i in probs.indices) {
            cumulative += probs[i]
            if (cumulative >= random) {
                return i.toLong()
            }
        }

        return argmax(probs).toLong()
    }

    private fun argmax(array: FloatArray): Int {
        if (array.isEmpty()) return 0
        var maxIdx = 0
        var maxVal = array[0]
        for (i in 1 until array.size) {
            if (array[i] > maxVal) {
                maxVal = array[i]
                maxIdx = i
            }
        }
        return maxIdx
    }

    // ──────────────────────────────────────────────────────────────────

    override fun close() {
        session.close()
    }
}

/**
 * Exception thrown during ONNX Runtime inference.
 */
class InferenceException(message: String) : Exception(message)
