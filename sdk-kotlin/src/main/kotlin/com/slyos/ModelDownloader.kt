package com.slyos

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

/**
 * Downloads and caches ONNX models from HuggingFace Hub.
 * Models are stored in the app's cache directory and survive app restarts.
 * Android may reclaim cache space; models will re-download if evicted.
 */
class ModelDownloader(private val context: Context) {

    /**
     * Progress callback: (bytesDownloaded, totalBytes, fileName)
     */
    typealias ProgressHandler = (Long, Long, String) -> Unit

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(300, TimeUnit.SECONDS)
        .writeTimeout(300, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private val cacheBaseDir: File
        get() = File(context.cacheDir, "slyos-models").also { it.mkdirs() }

    // ──────────────────────────────────────────────────────────────────

    /**
     * Download a model from HuggingFace Hub if not already cached.
     *
     * @param hfModelId HuggingFace model identifier (e.g., "HuggingFaceTB/SmolLM2-1.7B-Instruct")
     * @param quant Quantization level to determine which ONNX file to download
     * @param progress Optional progress callback
     * @return Local directory containing the model files
     */
    suspend fun downloadModel(
        hfModelId: String,
        quant: QuantizationLevel = QuantizationLevel.Q4,
        progress: ProgressHandler? = null
    ): File = withContext(Dispatchers.IO) {
        val modelDir = modelDirectory(hfModelId, quant)

        // Check if already cached
        if (isModelCached(modelDir)) {
            return@withContext modelDir
        }

        modelDir.mkdirs()

        // Determine files to download
        val files = modelFiles(hfModelId, quant)

        for (fileInfo in files) {
            val localFile = File(modelDir, fileInfo.localName)

            // Skip if already downloaded
            if (localFile.exists() && localFile.length() > 0) {
                continue
            }

            try {
                downloadFile(fileInfo.url, localFile, fileInfo.localName, progress)
            } catch (e: Exception) {
                // Optional files (special_tokens_map, generation_config) can fail silently
                if (fileInfo.localName == "model.onnx" || fileInfo.localName == "tokenizer.json") {
                    throw e
                }
            }
        }

        modelDir
    }

    /**
     * Check if a model is already cached locally.
     */
    fun isModelCached(hfModelId: String, quant: QuantizationLevel = QuantizationLevel.Q4): Boolean {
        return isModelCached(modelDirectory(hfModelId, quant))
    }

    /**
     * Delete a cached model to free disk space.
     */
    fun deleteModel(hfModelId: String, quant: QuantizationLevel = QuantizationLevel.Q4) {
        val modelDir = modelDirectory(hfModelId, quant)
        if (modelDir.exists()) {
            modelDir.deleteRecursively()
        }
    }

    /**
     * Get total size of all cached models in bytes.
     */
    fun totalCacheSize(): Long {
        return if (cacheBaseDir.exists()) {
            cacheBaseDir.walkTopDown().filter { it.isFile }.sumOf { it.length() }
        } else 0
    }

    /**
     * Clear entire model cache.
     */
    fun clearCache() {
        if (cacheBaseDir.exists()) {
            cacheBaseDir.deleteRecursively()
        }
    }

    // ──────────────────────────────────────────────────────────────────

    private fun modelDirectory(hfModelId: String, quant: QuantizationLevel): File {
        val safeName = hfModelId.replace("/", "--")
        return File(cacheBaseDir, "${safeName}_${quant.toQueryString()}")
    }

    private fun isModelCached(modelDir: File): Boolean {
        val modelFile = File(modelDir, "model.onnx")
        return modelFile.exists() && modelFile.length() > 0
    }

    private data class FileDownloadInfo(val url: String, val localName: String)

    private fun modelFiles(hfModelId: String, quant: QuantizationLevel): List<FileDownloadInfo> {
        val baseUrl = "https://huggingface.co/$hfModelId/resolve/main"
        return listOf(
            FileDownloadInfo("$baseUrl/onnx/model.onnx", "model.onnx"),
            FileDownloadInfo("$baseUrl/tokenizer.json", "tokenizer.json"),
            FileDownloadInfo("$baseUrl/tokenizer_config.json", "tokenizer_config.json"),
            FileDownloadInfo("$baseUrl/config.json", "config.json"),
            FileDownloadInfo("$baseUrl/special_tokens_map.json", "special_tokens_map.json"),
            FileDownloadInfo("$baseUrl/generation_config.json", "generation_config.json"),
        )
    }

    private fun downloadFile(
        url: String,
        destination: File,
        fileName: String,
        progress: ProgressHandler?
    ) {
        val request = Request.Builder().url(url).build()
        val response = httpClient.newCall(request).execute()

        if (response.code == 404) {
            // Optional file not found — skip silently
            response.close()
            return
        }

        if (!response.isSuccessful) {
            response.close()
            throw Exception("HTTP ${response.code} downloading $fileName")
        }

        val body = response.body ?: throw Exception("Empty response body for $fileName")
        val totalBytes = body.contentLength()

        body.byteStream().use { input ->
            FileOutputStream(destination).use { output ->
                val buffer = ByteArray(8192)
                var bytesRead: Long = 0

                while (true) {
                    val count = input.read(buffer)
                    if (count == -1) break

                    output.write(buffer, 0, count)
                    bytesRead += count

                    progress?.invoke(bytesRead, totalBytes, fileName)
                }
            }
        }
    }
}
