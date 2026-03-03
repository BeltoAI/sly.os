package com.slyos

import android.app.ActivityManager
import android.content.Context
import android.opengl.GLES31
import android.os.Build
import android.os.Environment
import android.os.StatFs
import java.security.MessageDigest
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

/**
 * Profiles Android device capabilities for optimal model selection and resource allocation.
 * Provides information about CPU, RAM, storage, GPU, and recommends appropriate quantization levels.
 */
class DeviceProfiler(private val context: Context) {

    /**
     * Creates a device profile with current hardware capabilities.
     *
     * @return DeviceProfile with detected device capabilities
     */
    suspend fun profileDevice(): DeviceProfile {
        val cpuCores = Runtime.getRuntime().availableProcessors()
        val memoryMB = getTotalMemoryMB()
        val estimatedStorageMB = getAvailableStorageMB()
        val gpuInfo = getGPUInfo()
        val recommendedQuant = selectQuantization(memoryMB, "quantum-1.7b")
        val maxContextWindow = recommendContextWindow(memoryMB, recommendedQuant)

        return DeviceProfile(
            cpuCores = cpuCores,
            memoryMB = memoryMB,
            estimatedStorageMB = estimatedStorageMB,
            platform = "android",
            os = "${Build.MANUFACTURER} ${Build.MODEL} (API ${Build.VERSION.SDK_INT})",
            osVersion = Build.VERSION.SDK_INT,
            recommendedQuant = recommendedQuant,
            maxContextWindow = maxContextWindow,
            hasGPU = gpuInfo.hasGPU,
            gpuRenderer = gpuInfo.renderer,
            gpuVramMB = gpuInfo.estimatedVramMB
        )
    }

    private fun getTotalMemoryMB(): Int {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memInfo)
        return (memInfo.totalMem / (1024 * 1024)).toInt()
    }

    private fun getAvailableStorageMB(): Int {
        return try {
            val externalFilesDir = context.getExternalFilesDir(null)
            if (externalFilesDir != null && Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED) {
                val stat = StatFs(externalFilesDir.absolutePath)
                (stat.availableBlocksLong * stat.blockSizeLong / (1024 * 1024)).toInt()
            } else {
                val stat = StatFs(context.filesDir.absolutePath)
                (stat.availableBlocksLong * stat.blockSizeLong / (1024 * 1024)).toInt()
            }
        } catch (e: Exception) {
            10000
        }
    }

    /**
     * Detect GPU information using OpenGL ES.
     */
    private fun getGPUInfo(): GPUInfo {
        return try {
            val renderer = GLES31.glGetString(GLES31.GL_RENDERER)
            val vendor = GLES31.glGetString(GLES31.GL_VENDOR)

            val hasGPU = renderer != null && !renderer.contains("emulator", ignoreCase = true)

            // Estimate VRAM based on GPU family
            val vramMB = when {
                renderer == null -> 0
                renderer.contains("Adreno 7", ignoreCase = true) -> 4096
                renderer.contains("Adreno 6", ignoreCase = true) -> 3072
                renderer.contains("Adreno 5", ignoreCase = true) -> 2048
                renderer.contains("Mali-G7", ignoreCase = true) -> 4096
                renderer.contains("Mali-G6", ignoreCase = true) -> 3072
                renderer.contains("Mali", ignoreCase = true) -> 2048
                renderer.contains("PowerVR", ignoreCase = true) -> 2048
                renderer.contains("Xclipse", ignoreCase = true) -> 4096
                renderer.contains("Immortalis", ignoreCase = true) -> 6144
                else -> 1024
            }

            GPUInfo(
                hasGPU = hasGPU,
                renderer = if (renderer != null && vendor != null) "$vendor $renderer" else renderer,
                estimatedVramMB = vramMB
            )
        } catch (e: Exception) {
            // OpenGL may not be initialized — detect via model name
            val model = Build.MODEL.lowercase()
            val hasGPU = !(model.contains("emulator") || model.contains("sdk_gphone"))
            GPUInfo(hasGPU = hasGPU, renderer = null, estimatedVramMB = 0)
        }
    }

    private data class GPUInfo(
        val hasGPU: Boolean,
        val renderer: String?,
        val estimatedVramMB: Int
    )

    // ──────────────────────────────────────────────────────────────────

    companion object {
        private const val PREFS_NAME = "slyos_device"
        private const val KEY_DEVICE_ID = "device_id"

        /**
         * Get or create a persistent device ID.
         * Stored in SharedPreferences and survives app restarts.
         */
        fun getOrCreateDeviceId(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existing = prefs.getString(KEY_DEVICE_ID, null)
            if (existing != null) return existing

            val deviceId = "device-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(12)}"
            prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
            return deviceId
        }

        /**
         * Generate a device fingerprint from stable hardware signals.
         */
        fun generateFingerprint(): String {
            val components = listOf(
                Build.MODEL,
                Build.MANUFACTURER,
                Build.BRAND,
                Build.HARDWARE,
                Runtime.getRuntime().availableProcessors().toString(),
                Build.SUPPORTED_ABIS.joinToString(","),
                Build.FINGERPRINT
            )

            val joined = components.joinToString("|")
            return sha256(joined).take(32)
        }

        private fun sha256(input: String): String {
            val md = MessageDigest.getInstance("SHA-256")
            val digest = md.digest(input.toByteArray())
            return digest.joinToString("") { "%02x".format(it) }
        }

        /**
         * Selects optimal quantization level based on available memory.
         */
        fun selectQuantization(memoryMB: Int, modelId: String): QuantizationLevel {
            val modelInfo = ModelRegistry.getModel(modelId) ?: return QuantizationLevel.Q4

            if (modelInfo.category == ModelCategory.LLM) {
                return QuantizationLevel.Q4
            }

            val quantizations = listOf(QuantizationLevel.FP16, QuantizationLevel.Q8, QuantizationLevel.Q4)
            for (quant in quantizations) {
                val requiredMB = modelInfo.minRAM_MB[quant.toQueryString()] ?: continue
                if (memoryMB >= requiredMB) return quant
            }

            return QuantizationLevel.Q4
        }

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

        fun canRunModel(memoryMB: Int, modelId: String, quant: QuantizationLevel? = null): Pair<Boolean, String> {
            val modelInfo = ModelRegistry.getModel(modelId)
                ?: return Pair(false, "Unknown model: $modelId")

            val selectedQuant = quant ?: selectQuantization(memoryMB, modelId)
            val requiredMB = modelInfo.minRAM_MB[selectedQuant.toQueryString()]
                ?: return Pair(false, "Quantization level not supported")

            return when {
                memoryMB < requiredMB -> Pair(false, "Not enough RAM for ${selectedQuant.name} (need ${requiredMB}MB, have ${memoryMB}MB)")
                memoryMB < (modelInfo.minRAM_MB["q4"] ?: 0) -> Pair(false, "Model requires at least ${modelInfo.minRAM_MB["q4"]}MB RAM even at Q4")
                else -> Pair(true, "OK at ${selectedQuant.name} precision")
            }
        }
    }
}
