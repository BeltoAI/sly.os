import Foundation
import AVFoundation
import Accelerate

// MARK: - Audio Processor for Whisper

/// Handles audio loading and mel spectrogram computation for Whisper speech-to-text models.
/// Uses AVFoundation for audio decoding and Accelerate for DSP operations.
public final class AudioProcessor {

    /// Whisper expects audio at 16kHz sample rate
    public static let sampleRate: Float = 16000.0

    /// Number of mel filterbank channels (Whisper uses 80)
    public static let nMels: Int = 80

    /// FFT size for STFT
    public static let nFFT: Int = 400

    /// Hop length between frames
    public static let hopLength: Int = 160

    /// Maximum audio length in samples (30 seconds at 16kHz)
    public static let maxAudioLength: Int = 480000

    // MARK: - Audio Loading

    /// Load an audio file and convert to 16kHz mono float samples.
    /// - Parameter url: URL to the audio file (supports wav, mp3, m4a, caf, etc.)
    /// - Returns: Array of float samples normalized to [-1, 1]
    public static func loadAudio(from url: URL) throws -> [Float] {
        guard FileManager.default.fileExists(atPath: url.path) else {
            throw AudioProcessorError.fileNotFound(url.path)
        }

        let audioFile = try AVAudioFile(forReading: url)

        // Set up format for 16kHz mono Float32
        guard let targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatFloat32,
            sampleRate: Double(sampleRate),
            channels: 1,
            interleaved: false
        ) else {
            throw AudioProcessorError.formatError("Cannot create target audio format")
        }

        // Create converter
        guard let converter = AVAudioConverter(from: audioFile.processingFormat, to: targetFormat) else {
            throw AudioProcessorError.formatError("Cannot create audio converter from \(audioFile.processingFormat) to \(targetFormat)")
        }

        // Calculate output frame count
        let ratio = Double(sampleRate) / audioFile.fileFormat.sampleRate
        let outputFrameCount = AVAudioFrameCount(Double(audioFile.length) * ratio)

        guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: outputFrameCount) else {
            throw AudioProcessorError.formatError("Cannot create output buffer")
        }

        // Read and convert
        let inputBuffer = AVAudioPCMBuffer(pcmFormat: audioFile.processingFormat, frameCapacity: AVAudioFrameCount(audioFile.length))!
        try audioFile.read(into: inputBuffer)

        var error: NSError?
        converter.convert(to: outputBuffer, error: &error) { _, outStatus in
            outStatus.pointee = .haveData
            return inputBuffer
        }

        if let error = error {
            throw AudioProcessorError.conversionError(error.localizedDescription)
        }

        // Extract float samples
        guard let channelData = outputBuffer.floatChannelData else {
            throw AudioProcessorError.formatError("No channel data in output buffer")
        }

        let frameCount = Int(outputBuffer.frameLength)
        let samples = Array(UnsafeBufferPointer(start: channelData[0], count: frameCount))

        return samples
    }

    // MARK: - Mel Spectrogram

    /// Compute log mel spectrogram from audio samples, matching Whisper's preprocessing.
    /// - Parameter audio: Audio samples at 16kHz, normalized to [-1, 1]
    /// - Returns: 2D array of shape [n_mels, n_frames]
    public static func computeMelSpectrogram(audio: [Float]) -> [[Float]] {
        // Pad or truncate to max length
        var paddedAudio: [Float]
        if audio.count > maxAudioLength {
            paddedAudio = Array(audio.prefix(maxAudioLength))
        } else {
            paddedAudio = audio
            if audio.count < maxAudioLength {
                paddedAudio.append(contentsOf: Array(repeating: 0, count: maxAudioLength - audio.count))
            }
        }

        // Compute STFT
        let nFrames = (paddedAudio.count - nFFT) / hopLength + 1
        var magnitudes = [[Float]](repeating: [Float](repeating: 0, count: nFFT / 2 + 1), count: nFrames)

        // Hann window
        let window = hannWindow(size: nFFT)

        // Process each frame
        for frame in 0..<nFrames {
            let start = frame * hopLength
            let end = min(start + nFFT, paddedAudio.count)

            // Extract and window the frame
            var windowed = [Float](repeating: 0, count: nFFT)
            let frameLength = end - start
            for i in 0..<frameLength {
                windowed[i] = paddedAudio[start + i] * window[i]
            }

            // Compute magnitude spectrum using Accelerate vDSP FFT
            let spectrum = fftMagnitude(signal: windowed)
            magnitudes[frame] = spectrum
        }

        // Generate mel filterbank
        let melFilters = melFilterbank(
            nMels: nMels,
            nFFT: nFFT,
            sampleRate: sampleRate
        )

        // Apply mel filterbank: [n_mels x (nFFT/2+1)] * [n_frames x (nFFT/2+1)]^T
        var melSpec = [[Float]](repeating: [Float](repeating: 0, count: nFrames), count: nMels)

        for mel in 0..<nMels {
            for frame in 0..<nFrames {
                var sum: Float = 0
                for bin in 0..<(nFFT / 2 + 1) {
                    sum += melFilters[mel][bin] * magnitudes[frame][bin]
                }
                melSpec[mel][frame] = sum
            }
        }

        // Log mel spectrogram
        let logOffset: Float = 1e-10
        for mel in 0..<nMels {
            for frame in 0..<nFrames {
                melSpec[mel][frame] = log10(max(melSpec[mel][frame], logOffset))
            }
        }

        // Normalize: clamp to max - 8.0, then scale to [0, 1] * 4.0
        let maxVal = melSpec.flatMap { $0 }.max() ?? 0
        let minClamp = maxVal - 8.0
        for mel in 0..<nMels {
            for frame in 0..<nFrames {
                melSpec[mel][frame] = max(melSpec[mel][frame], minClamp)
                melSpec[mel][frame] = (melSpec[mel][frame] - minClamp) / 8.0 * 4.0
            }
        }

        return melSpec
    }

    // MARK: - DSP Helpers

    /// Create a Hann window of given size.
    private static func hannWindow(size: Int) -> [Float] {
        var window = [Float](repeating: 0, count: size)
        vDSP_hann_window(&window, vDSP_Length(size), Int32(vDSP_HANN_NORM))
        return window
    }

    /// Compute magnitude spectrum of a signal using vDSP FFT.
    private static func fftMagnitude(signal: [Float]) -> [Float] {
        let n = signal.count
        let log2n = vDSP_Length(log2(Float(n)))

        guard let fftSetup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2)) else {
            return [Float](repeating: 0, count: n / 2 + 1)
        }
        defer { vDSP_destroy_fftsetup(fftSetup) }

        // Split complex arrays
        var realPart = [Float](repeating: 0, count: n / 2)
        var imagPart = [Float](repeating: 0, count: n / 2)

        // Convert to split complex format
        signal.withUnsafeBufferPointer { signalPtr in
            signalPtr.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: n / 2) { complexPtr in
                var splitComplex = DSPSplitComplex(realp: &realPart, imagp: &imagPart)
                vDSP_ctoz(complexPtr, 2, &splitComplex, 1, vDSP_Length(n / 2))
            }
        }

        // Perform FFT
        var splitComplex = DSPSplitComplex(realp: &realPart, imagp: &imagPart)
        vDSP_fft_zrip(fftSetup, &splitComplex, 1, log2n, FFTDirection(kFFTDirection_Forward))

        // Compute magnitude squared
        var magnitudes = [Float](repeating: 0, count: n / 2 + 1)

        // DC component
        magnitudes[0] = realPart[0] * realPart[0]
        // Nyquist component
        magnitudes[n / 2] = imagPart[0] * imagPart[0]

        // Other components
        for i in 1..<(n / 2) {
            magnitudes[i] = realPart[i] * realPart[i] + imagPart[i] * imagPart[i]
        }

        // Scale
        var scale: Float = 1.0 / Float(n * n)
        vDSP_vsmul(magnitudes, 1, &scale, &magnitudes, 1, vDSP_Length(magnitudes.count))

        return magnitudes
    }

    /// Generate mel filterbank matrix.
    private static func melFilterbank(nMels: Int, nFFT: Int, sampleRate: Float) -> [[Float]] {
        let nBins = nFFT / 2 + 1

        // Mel scale conversion
        func hzToMel(_ hz: Float) -> Float {
            return 2595.0 * log10(1.0 + hz / 700.0)
        }

        func melToHz(_ mel: Float) -> Float {
            return 700.0 * (pow(10.0, mel / 2595.0) - 1.0)
        }

        let melMin = hzToMel(0)
        let melMax = hzToMel(sampleRate / 2)

        // Create equally-spaced mel points
        var melPoints = [Float](repeating: 0, count: nMels + 2)
        for i in 0...(nMels + 1) {
            melPoints[i] = melMin + Float(i) * (melMax - melMin) / Float(nMels + 1)
        }

        // Convert mel points to frequency bins
        let fftFreqs = (0..<nBins).map { Float($0) * sampleRate / Float(nFFT) }
        let melFreqs = melPoints.map { melToHz($0) }

        // Build filterbank
        var filterbank = [[Float]](repeating: [Float](repeating: 0, count: nBins), count: nMels)

        for mel in 0..<nMels {
            let lower = melFreqs[mel]
            let center = melFreqs[mel + 1]
            let upper = melFreqs[mel + 2]

            for bin in 0..<nBins {
                let freq = fftFreqs[bin]

                if freq >= lower && freq <= center && center > lower {
                    filterbank[mel][bin] = (freq - lower) / (center - lower)
                } else if freq > center && freq <= upper && upper > center {
                    filterbank[mel][bin] = (upper - freq) / (upper - center)
                }
            }
        }

        return filterbank
    }
}

// MARK: - Audio Processor Errors

public enum AudioProcessorError: LocalizedError {
    case fileNotFound(String)
    case formatError(String)
    case conversionError(String)
    case processingError(String)

    public var errorDescription: String? {
        switch self {
        case .fileNotFound(let path):
            return "Audio file not found: \(path)"
        case .formatError(let msg):
            return "Audio format error: \(msg)"
        case .conversionError(let msg):
            return "Audio conversion error: \(msg)"
        case .processingError(let msg):
            return "Audio processing error: \(msg)"
        }
    }
}
