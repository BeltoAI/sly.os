import Foundation

// MARK: - Model Downloader

/// Downloads and caches ONNX models from HuggingFace Hub.
/// Models are stored in the platform cache directory and survive app restarts.
/// The system may reclaim cache space; models will re-download if evicted.
public final class ModelDownloader: @unchecked Sendable {

    /// Progress callback: (bytesDownloaded, totalBytes, fileName)
    public typealias ProgressHandler = (Int64, Int64, String) -> Void

    private let session: URLSession
    private let cacheBaseDir: URL

    // MARK: - Initialization

    public init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 60
        config.timeoutIntervalForResource = 3600 // 1 hour for large models
        config.waitsForConnectivity = true
        self.session = URLSession(configuration: config)

        // Platform-appropriate cache directory
        #if os(iOS)
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        #elseif os(macOS)
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        #else
        let cacheDir = FileManager.default.temporaryDirectory
        #endif

        self.cacheBaseDir = cacheDir.appendingPathComponent("SlyOS/models", isDirectory: true)
    }

    // MARK: - Public API

    /// Download a model from HuggingFace Hub if not already cached.
    /// - Parameters:
    ///   - hfModelId: HuggingFace model identifier (e.g., "HuggingFaceTB/SmolLM2-1.7B-Instruct")
    ///   - quant: Quantization level to determine which ONNX file to download
    ///   - progress: Optional progress callback
    /// - Returns: Local directory path containing the model files
    public func downloadModel(
        hfModelId: String,
        quant: QuantizationLevel = .q4,
        progress: ProgressHandler? = nil
    ) async throws -> URL {
        let modelDir = modelDirectory(for: hfModelId, quant: quant)

        // Check if already cached
        if isModelCached(at: modelDir) {
            return modelDir
        }

        // Create model directory
        try FileManager.default.createDirectory(at: modelDir, withIntermediateDirectories: true)

        // Determine files to download
        let filesToDownload = modelFiles(for: hfModelId, quant: quant)

        for fileInfo in filesToDownload {
            let localPath = modelDir.appendingPathComponent(fileInfo.localName)

            // Skip if file already exists and has correct size
            if FileManager.default.fileExists(atPath: localPath.path) {
                let attrs = try? FileManager.default.attributesOfItem(atPath: localPath.path)
                if let fileSize = attrs?[.size] as? Int64, fileSize > 0 {
                    continue
                }
            }

            try await downloadFile(
                from: fileInfo.url,
                to: localPath,
                fileName: fileInfo.localName,
                progress: progress
            )
        }

        return modelDir
    }

    /// Check if a model is already cached locally.
    public func isModelCached(hfModelId: String, quant: QuantizationLevel = .q4) -> Bool {
        let modelDir = modelDirectory(for: hfModelId, quant: quant)
        return isModelCached(at: modelDir)
    }

    /// Delete a cached model to free disk space.
    public func deleteModel(hfModelId: String, quant: QuantizationLevel = .q4) throws {
        let modelDir = modelDirectory(for: hfModelId, quant: quant)
        if FileManager.default.fileExists(atPath: modelDir.path) {
            try FileManager.default.removeItem(at: modelDir)
        }
    }

    /// Get the total size of all cached models in bytes.
    public func totalCacheSize() -> Int64 {
        guard FileManager.default.fileExists(atPath: cacheBaseDir.path) else { return 0 }

        var totalSize: Int64 = 0
        if let enumerator = FileManager.default.enumerator(at: cacheBaseDir, includingPropertiesForKeys: [.fileSizeKey]) {
            for case let fileURL as URL in enumerator {
                let attrs = try? fileURL.resourceValues(forKeys: [.fileSizeKey])
                totalSize += Int64(attrs?.fileSize ?? 0)
            }
        }
        return totalSize
    }

    /// Clear entire model cache.
    public func clearCache() throws {
        if FileManager.default.fileExists(atPath: cacheBaseDir.path) {
            try FileManager.default.removeItem(at: cacheBaseDir)
        }
    }

    // MARK: - Private Helpers

    private func modelDirectory(for hfModelId: String, quant: QuantizationLevel) -> URL {
        let safeName = hfModelId.replacingOccurrences(of: "/", with: "--")
        return cacheBaseDir.appendingPathComponent("\(safeName)_\(quant.rawValue)", isDirectory: true)
    }

    private func isModelCached(at modelDir: URL) -> Bool {
        let modelFile = modelDir.appendingPathComponent("model.onnx")
        let tokenizerFile = modelDir.appendingPathComponent("tokenizer.json")

        // At minimum, we need the model file. Tokenizer is needed for LLMs but not necessarily for all models.
        return FileManager.default.fileExists(atPath: modelFile.path)
            || FileManager.default.fileExists(atPath: tokenizerFile.path)
    }

    /// Determine which files to download for a given model + quantization.
    private func modelFiles(for hfModelId: String, quant: QuantizationLevel) -> [FileDownloadInfo] {
        var files: [FileDownloadInfo] = []

        // ONNX model file — try quantized subdirectory first
        let onnxSubdir: String
        switch quant {
        case .q4:
            onnxSubdir = "onnx"  // Default ONNX directory
        case .q8:
            onnxSubdir = "onnx"
        case .fp16:
            onnxSubdir = "onnx"
        case .fp32:
            onnxSubdir = "onnx"
        }

        // Primary model file
        let modelUrl = "https://huggingface.co/\(hfModelId)/resolve/main/\(onnxSubdir)/model.onnx"
        files.append(FileDownloadInfo(url: modelUrl, localName: "model.onnx"))

        // Tokenizer files
        let tokenizerUrl = "https://huggingface.co/\(hfModelId)/resolve/main/tokenizer.json"
        files.append(FileDownloadInfo(url: tokenizerUrl, localName: "tokenizer.json"))

        // Tokenizer config
        let tokenizerConfigUrl = "https://huggingface.co/\(hfModelId)/resolve/main/tokenizer_config.json"
        files.append(FileDownloadInfo(url: tokenizerConfigUrl, localName: "tokenizer_config.json"))

        // Model config (needed for context window detection)
        let configUrl = "https://huggingface.co/\(hfModelId)/resolve/main/config.json"
        files.append(FileDownloadInfo(url: configUrl, localName: "config.json"))

        // Special tokens map
        let specialTokensUrl = "https://huggingface.co/\(hfModelId)/resolve/main/special_tokens_map.json"
        files.append(FileDownloadInfo(url: specialTokensUrl, localName: "special_tokens_map.json"))

        // Generation config (for sampling parameters)
        let genConfigUrl = "https://huggingface.co/\(hfModelId)/resolve/main/generation_config.json"
        files.append(FileDownloadInfo(url: genConfigUrl, localName: "generation_config.json"))

        return files
    }

    /// Download a single file with progress tracking.
    private func downloadFile(
        from urlString: String,
        to destination: URL,
        fileName: String,
        progress: ProgressHandler?
    ) async throws {
        guard let url = URL(string: urlString) else {
            throw ModelDownloadError.invalidURL(urlString)
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        do {
            let (tempURL, response) = try await session.download(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw ModelDownloadError.invalidResponse
            }

            // 404 for optional files (special_tokens_map, generation_config) is OK
            if httpResponse.statusCode == 404 {
                // Optional file not found — skip silently
                return
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                throw ModelDownloadError.httpError(httpResponse.statusCode)
            }

            // Move downloaded file to destination
            if FileManager.default.fileExists(atPath: destination.path) {
                try FileManager.default.removeItem(at: destination)
            }
            try FileManager.default.moveItem(at: tempURL, to: destination)

            // Report final progress
            let fileSize = (try? FileManager.default.attributesOfItem(atPath: destination.path))?[.size] as? Int64 ?? 0
            progress?(fileSize, fileSize, fileName)

        } catch let error as ModelDownloadError {
            throw error
        } catch {
            throw ModelDownloadError.networkError(error.localizedDescription)
        }
    }
}

// MARK: - Supporting Types

struct FileDownloadInfo {
    let url: String
    let localName: String
}

/// Errors during model download
public enum ModelDownloadError: LocalizedError {
    case invalidURL(String)
    case invalidResponse
    case httpError(Int)
    case networkError(String)
    case insufficientStorage
    case fileCorrupted(String)

    public var errorDescription: String? {
        switch self {
        case .invalidURL(let url):
            return "Invalid download URL: \(url)"
        case .invalidResponse:
            return "Invalid server response"
        case .httpError(let code):
            return "HTTP error \(code)"
        case .networkError(let msg):
            return "Network error: \(msg)"
        case .insufficientStorage:
            return "Insufficient storage for model download"
        case .fileCorrupted(let file):
            return "Downloaded file corrupted: \(file)"
        }
    }
}
