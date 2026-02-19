package com.slyos

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.Environment
import android.os.StatFs
import kotlin.math.max
import kotlin.math.min

/**
 * Profiles Android device capabilities for optimal model selection and resource allocation.
 * Provides information about CPU, RAM, storage, and recommends appropriate quantization levels.
 */
class DeviceProfiler(private val context: Context) {

    /**
     * Creates a device profile with current hardware capabilities.
     * This function should be called on a background thread to avoid blocking the main thread.
     *
     * @return DeviceProfile with detected device capabilities
     */
    suspend fun profileDevice(): DeviceProfile {
        val cpuCores = Runtime.getRuntime().availableProcessors()
        val memoryMB = getTotalMemoryMB()
        val estimatedStorageMB = getAvailableStorageMB()
        val osVersion = Build.VERSION.SDK_INT
        val recommendedQuant = selectQuantization(memoryMB, "quantum-1.7b")
        val maxContextWindow = recommendContextWindow(memoryMB, recommendedQuant)

        return DeviceProfile(
            cpuCores = cpuCores,
            memoryMB = memoryMB,
            estimatedStorageMB = estimatedStorageMB,
            platform = "android",
            os = "${Build.MANUFACTURER} ${Build.MODEL} (API ${Build.VERSION.SDK_INT})",
            osVersion = osVersion,
            recommendedQuant = recommendedQuant,
            maxContextWindow = maxContextWindow,
            hasGPU = detectGPU()
        )
    }

    /**
     * Gets the total system RAM available to the app.
     *
     * @return Total RAM in megabytes
     */
    private fun getTotalMemoryMB(): Int {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memInfo)
        return (memInfo.totalMem / (1024 * 1024)).toInt()
    }

    /**
     * Gets available storage space on the device.
     *
     * @return Available storage in megabytes
     */
    private fun getAvailableStorageMB(): Int {
        return try {
            val externalFilesDir = context.getExternalFilesDir(null)
            if (externalFilesDir != null && Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED) {
                val stat = StatFs(externalFilesDir.absolutePath)
                (stat.availableBlocksLong * stat.blockSizeLong / (1024 * 1024)).toInt()
            } else {
                // Fallback to internal storage
                val stat = StatFs(context.filesDir.absolutePath)
                (stat.availableBlocksLong * stat.blockSizeLong / (1024 * 1024)).toInt()
            }
        } catch (e: Exception) {
            10000 // Default fallback
        }
    }

    /**
     * Detects if the device has a GPU available for acceleration.
     * Note: This is a basic check and may not reflect actual GPU capabilities.
     *
     * @return true if GPU hardware is likely available
     */
    private fun detectGPU(): Boolean {
        // Basic GPU detection based on common patterns
        val model = Build.MODEL.lowercase()
        val device = Build.DEVICE.lowercase()

        // Most modern devices have GPUs, but we can check specific models
        return !(model.contains("emulator") || device.contains("emulator"))
    }

    companion object {
        /**
         * Selects the optimal quantization level based on available memory.
         * Strategy: For LLMs, cap at Q4 for ONNX/WASM compatibility.
         * For STT models, allow higher precision when sufficient memory is available.
         *
         * @param memoryMB Available RAM in megabytes
         * @param modelId Model identifier to check requirements
         * @return Optimal quantization level
         */
        fun selectQuantization(memoryMB: Int, modelId: String): QuantizationLevel {
            val modelInfo = ModelRegistry.getModel(modelId) ?: return QuantizationLevel.Q4

            // For LLMs, use Q4 as the safest option
            if (modelInfo.category == ModelCategory.LLM) {
                return QuantizationLevel.Q4
            }

            // For STT models, try from best quality down
            val quantizations = listOf(QuantizationLevel.FP16, QuantizationLevel.Q8, QuantizationLevel.Q4)
            for (quant in quantizations) {
                val requiredMB = modelInfo.minRAM_MB[quant.toQueryString()] ?: continue
                if (memoryMB >= requiredMB) {
                    return quant
                }
            }

            return QuantizationLevel.Q4 // Fallback
        }

        /**
         * Recommends context window size based on available memory and quantization.
         * More RAM + lower bit depth = larger context window.
         *
         * @param memoryMB Available RAM in megabytes
         * @param quant Quantization level
         * @return Maximum recommended context window in tokens
         */
        fun recommendContextWindow(memoryMB: Int, quant: QuantizationLevel): Int {
            val base = when (quant) {
                QuantizationLevel.Q4 -> 1024
                QuantizationLevel.Q8 -> 2048
                QuantizationLevel.FP16 -> 4096
                QuantizationLevel.FP32 -> 8192
            }

            return when {
                memoryMB >= 16384 -> min(base * 4, 32768)
                memoryMB >= 8192 -> min(base * 2, 16384)
                memoryMB >= 4096 -> base
                else -> max(512, base / 2)
            }
        }

        /**
         * Checks if a model can run on this device with given quantization.
         *
         * @param memoryMB Available RAM in megabytes
         * @param modelId Model identifier
         * @param quant Quantization level (optional, will auto-select if not provided)
         * @return Pair<Boolean, String> - (canRun, reason)
         */
        fun canRunModel(memoryMB: Int, modelId: String, quant: QuantizationLevel? = null): Pair<Boolean, String> {
            val modelInfo = ModelRegistry.getModel(modelId)
                ?: return Pair(false, "Unknown model: $modelId")

            val selectedQuant = quant ?: selectQuantization(memoryMB, modelId)
            val requiredMB = modelInfo.minRAM_MB[selectedQuant.toQueryString()]
                ?: return Pair(false, "Quantization level not supported")

            return when {
                memoryMB < requiredMB -> Pair(
                    false,
                    "Not enough RAM for ${selectedQuant.name} (need ${requiredMB}MB, have ${memoryMB}MB)"
                )
                memoryMB < modelInfo.minRAM_MB["q4"]!! -> Pair(
                    false,
                    "Model requires at least ${modelInfo.minRAM_MB["q4"]}MB RAM even at Q4"
                )
                else -> Pair(true, "OK at ${selectedQuant.name} precision")
            }
        }
    }
}
