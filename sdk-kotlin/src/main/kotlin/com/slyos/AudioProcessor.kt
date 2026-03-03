package com.slyos

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.*

/**
 * Handles audio loading and mel spectrogram computation for Whisper speech-to-text models.
 * Uses Android MediaCodec for audio decoding and custom FFT for mel spectrogram.
 */
object AudioProcessor {

    /** Whisper expects audio at 16kHz */
    const val SAMPLE_RATE = 16000f

    /** Number of mel filterbank channels (Whisper uses 80) */
    const val N_MELS = 80

    /** FFT size for STFT */
    const val N_FFT = 400

    /** Hop length between frames */
    const val HOP_LENGTH = 160

    /** Maximum audio length in samples (30 seconds at 16kHz) */
    const val MAX_AUDIO_LENGTH = 480000

    // ──────────────────────────────────────────────────────────────────

    /**
     * Load an audio file and convert to 16kHz mono float samples.
     *
     * @param context Android context
     * @param audioUri URI to the audio file
     * @return Float array of audio samples normalized to [-1, 1]
     */
    fun loadAudio(context: Context, audioUri: Uri): FloatArray {
        val extractor = MediaExtractor()

        // Set data source
        val fd = context.contentResolver.openFileDescriptor(audioUri, "r")
            ?: throw AudioProcessingException("Cannot open audio file: $audioUri")

        extractor.setDataSource(fd.fileDescriptor)
        fd.close()

        // Find audio track
        var audioTrackIndex = -1
        var audioFormat: MediaFormat? = null
        for (i in 0 until extractor.trackCount) {
            val format = extractor.getTrackFormat(i)
            val mime = format.getString(MediaFormat.KEY_MIME) ?: continue
            if (mime.startsWith("audio/")) {
                audioTrackIndex = i
                audioFormat = format
                break
            }
        }

        if (audioTrackIndex == -1 || audioFormat == null) {
            extractor.release()
            throw AudioProcessingException("No audio track found in file")
        }

        extractor.selectTrack(audioTrackIndex)

        val sourceSampleRate = audioFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
        val channelCount = audioFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        val mime = audioFormat.getString(MediaFormat.KEY_MIME) ?: "audio/raw"

        // Decode audio using MediaCodec
        val decoder = MediaCodec.createDecoderByType(mime)
        decoder.configure(audioFormat, null, null, 0)
        decoder.start()

        val samples = mutableListOf<Float>()
        val bufferInfo = MediaCodec.BufferInfo()
        var isEOS = false

        while (!isEOS) {
            // Feed input
            val inputIndex = decoder.dequeueInputBuffer(10000)
            if (inputIndex >= 0) {
                val inputBuffer = decoder.getInputBuffer(inputIndex) ?: continue
                val sampleSize = extractor.readSampleData(inputBuffer, 0)

                if (sampleSize < 0) {
                    decoder.queueInputBuffer(inputIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                    isEOS = true
                } else {
                    val presentationTime = extractor.sampleTime
                    decoder.queueInputBuffer(inputIndex, 0, sampleSize, presentationTime, 0)
                    extractor.advance()
                }
            }

            // Read output
            var outputIndex = decoder.dequeueOutputBuffer(bufferInfo, 10000)
            while (outputIndex >= 0) {
                val outputBuffer = decoder.getOutputBuffer(outputIndex) ?: break
                outputBuffer.order(ByteOrder.nativeOrder())

                // Decode PCM 16-bit samples
                val shortBuffer = outputBuffer.asShortBuffer()
                val shortArray = ShortArray(shortBuffer.remaining())
                shortBuffer.get(shortArray)

                // Convert to mono float [-1, 1]
                for (i in shortArray.indices step channelCount) {
                    val sample = shortArray[i].toFloat() / Short.MAX_VALUE
                    samples.add(sample)
                }

                decoder.releaseOutputBuffer(outputIndex, false)
                outputIndex = decoder.dequeueOutputBuffer(bufferInfo, 0)
            }
        }

        decoder.stop()
        decoder.release()
        extractor.release()

        // Resample to 16kHz if needed
        val result = if (sourceSampleRate != SAMPLE_RATE.toInt()) {
            resample(samples.toFloatArray(), sourceSampleRate, SAMPLE_RATE.toInt())
        } else {
            samples.toFloatArray()
        }

        return result
    }

    /**
     * Load audio from a file path.
     */
    fun loadAudio(context: Context, filePath: String): FloatArray {
        return loadAudio(context, Uri.fromFile(File(filePath)))
    }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Compute log mel spectrogram from audio samples, matching Whisper's preprocessing.
     *
     * @param audio Audio samples at 16kHz, normalized to [-1, 1]
     * @return 2D array of shape [N_MELS x n_frames]
     */
    fun computeMelSpectrogram(audio: FloatArray): Array<FloatArray> {
        // Pad or truncate to max length
        val paddedAudio = when {
            audio.size > MAX_AUDIO_LENGTH -> audio.copyOfRange(0, MAX_AUDIO_LENGTH)
            audio.size < MAX_AUDIO_LENGTH -> audio + FloatArray(MAX_AUDIO_LENGTH - audio.size)
            else -> audio
        }

        // Compute STFT
        val nFrames = (paddedAudio.size - N_FFT) / HOP_LENGTH + 1
        val magnitudes = Array(nFrames) { FloatArray(N_FFT / 2 + 1) }

        // Hann window
        val window = hannWindow(N_FFT)

        // Process each frame
        for (frame in 0 until nFrames) {
            val start = frame * HOP_LENGTH
            val windowed = FloatArray(N_FFT)
            for (i in 0 until minOf(N_FFT, paddedAudio.size - start)) {
                windowed[i] = paddedAudio[start + i] * window[i]
            }

            magnitudes[frame] = fftMagnitude(windowed)
        }

        // Generate mel filterbank
        val melFilters = melFilterbank(N_MELS, N_FFT, SAMPLE_RATE)

        // Apply mel filterbank
        val melSpec = Array(N_MELS) { mel ->
            FloatArray(nFrames) { frame ->
                var sum = 0f
                for (bin in 0 until N_FFT / 2 + 1) {
                    sum += melFilters[mel][bin] * magnitudes[frame][bin]
                }
                sum
            }
        }

        // Log mel spectrogram with normalization
        val logOffset = 1e-10f
        var maxVal = Float.NEGATIVE_INFINITY
        for (mel in 0 until N_MELS) {
            for (frame in 0 until nFrames) {
                melSpec[mel][frame] = log10(maxOf(melSpec[mel][frame], logOffset))
                if (melSpec[mel][frame] > maxVal) maxVal = melSpec[mel][frame]
            }
        }

        // Normalize: clamp and scale
        val minClamp = maxVal - 8.0f
        for (mel in 0 until N_MELS) {
            for (frame in 0 until nFrames) {
                melSpec[mel][frame] = maxOf(melSpec[mel][frame], minClamp)
                melSpec[mel][frame] = (melSpec[mel][frame] - minClamp) / 8.0f * 4.0f
            }
        }

        return melSpec
    }

    // ──────────────────────────────────────────────────────────────────

    /** Simple linear resampling. */
    private fun resample(audio: FloatArray, fromRate: Int, toRate: Int): FloatArray {
        val ratio = toRate.toDouble() / fromRate
        val outputLength = (audio.size * ratio).toInt()
        val output = FloatArray(outputLength)

        for (i in output.indices) {
            val srcIndex = i / ratio
            val srcInt = srcIndex.toInt()
            val frac = (srcIndex - srcInt).toFloat()

            output[i] = if (srcInt + 1 < audio.size) {
                audio[srcInt] * (1 - frac) + audio[srcInt + 1] * frac
            } else {
                audio[minOf(srcInt, audio.size - 1)]
            }
        }
        return output
    }

    /** Hann window. */
    private fun hannWindow(size: Int): FloatArray {
        return FloatArray(size) { i ->
            0.5f * (1 - cos(2.0 * PI * i / size).toFloat())
        }
    }

    /** Compute magnitude spectrum via naive DFT (for frames of size N_FFT=400). */
    private fun fftMagnitude(signal: FloatArray): FloatArray {
        val n = signal.size
        val nBins = n / 2 + 1
        val magnitudes = FloatArray(nBins)

        // Naive DFT — O(n²) but n is small (400) so ~160K ops per frame, acceptable
        for (k in 0 until nBins) {
            var real = 0f
            var imag = 0f
            val omega = -2.0 * PI * k / n
            for (t in signal.indices) {
                val angle = (omega * t).toFloat()
                real += signal[t] * cos(angle)
                imag += signal[t] * sin(angle)
            }
            magnitudes[k] = (real * real + imag * imag) / (n * n).toFloat()
        }

        return magnitudes
    }

    /** Generate mel filterbank matrix. */
    private fun melFilterbank(nMels: Int, nFFT: Int, sampleRate: Float): Array<FloatArray> {
        val nBins = nFFT / 2 + 1

        fun hzToMel(hz: Float) = 2595.0f * log10(1.0f + hz / 700.0f)
        fun melToHz(mel: Float) = 700.0f * (10.0f.pow(mel / 2595.0f) - 1.0f)

        val melMin = hzToMel(0f)
        val melMax = hzToMel(sampleRate / 2)

        val melPoints = FloatArray(nMels + 2) { i ->
            melMin + i * (melMax - melMin) / (nMels + 1)
        }

        val fftFreqs = FloatArray(nBins) { it * sampleRate / nFFT }
        val melFreqs = melPoints.map { melToHz(it) }

        return Array(nMels) { mel ->
            FloatArray(nBins) { bin ->
                val freq = fftFreqs[bin]
                val lower = melFreqs[mel]
                val center = melFreqs[mel + 1]
                val upper = melFreqs[mel + 2]

                when {
                    freq in lower..center && center > lower -> (freq - lower) / (center - lower)
                    freq in center..upper && upper > center -> (upper - freq) / (upper - center)
                    else -> 0f
                }
            }
        }
    }
}

/** Exception thrown during audio processing. */
class AudioProcessingException(message: String) : Exception(message)
