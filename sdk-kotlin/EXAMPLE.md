# SlyOS Kotlin SDK - Usage Examples

This document provides practical examples for using the SlyOS SDK in Android applications.

## Complete Example App

### MainActivity.kt

```kotlin
package com.example.slyosapp

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import androidx.lifecycle.lifecycleScope
import com.slyos.ChatCompletionRequest
import com.slyos.ChatMessage
import com.slyos.SlyOS
import com.slyos.SlyOSConfigWithFallback
import com.slyos.GenerateOptions
import com.slyos.ModelCategory
import com.slyos.ProgressStage
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    private lateinit var slyos: SlyOS
    private lateinit var inputText: EditText
    private lateinit var outputText: TextView
    private lateinit var generateButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize views
        inputText = findViewById(R.id.input_text)
        outputText = findViewById(R.id.output_text)
        generateButton = findViewById(R.id.generate_button)
        progressBar = findViewById(R.id.progress_bar)
        statusText = findViewById(R.id.status_text)

        // Initialize SlyOS SDK
        initializeSlyOS()

        // Set up button listeners
        generateButton.setOnClickListener { generateText() }
    }

    private fun initializeSlyOS() {
        // Configure SlyOS with optional cloud fallback
        val config = SlyOSConfigWithFallback(
            apiKey = "your-api-key-here",
            apiUrl = "https://api.slyos.world",
            onProgress = { event ->
                runOnUiThread {
                    progressBar.progress = event.progress
                    statusText.text = "${event.stage.name}: ${event.message}"
                }
            },
            onEvent = { event ->
                println("SlyOS Event: ${event.type} - ${event.data}")
            },
            fallback = null // Set up fallback if needed
        )

        slyos = SlyOS(this, config)

        // Initialize SDK asynchronously
        lifecycleScope.launch {
            try {
                val profile = slyos.initialize()
                runOnUiThread {
                    statusText.text = "Ready: ${profile.cpuCores} cores, " +
                            "${profile.memoryMB}MB RAM, ${profile.recommendedQuant.name}"
                    generateButton.isEnabled = true
                }

                // Load a model
                slyos.loadModel("quantum-1.7b")

            } catch (e: Exception) {
                runOnUiThread {
                    statusText.text = "Error: ${e.message}"
                }
            }
        }
    }

    private fun generateText() {
        generateButton.isEnabled = false
        val prompt = inputText.text.toString()

        lifecycleScope.launch {
            try {
                val result = slyos.generate(
                    modelId = "quantum-1.7b",
                    prompt = prompt,
                    options = GenerateOptions(
                        temperature = 0.7,
                        maxTokens = 256,
                        topP = 0.9
                    )
                )

                runOnUiThread {
                    outputText.text = result
                    statusText.text = "Generation complete"
                    generateButton.isEnabled = true
                }
            } catch (e: Exception) {
                runOnUiThread {
                    outputText.text = "Error: ${e.message}"
                    statusText.text = "Generation failed"
                    generateButton.isEnabled = true
                }
            }
        }
    }
}
```

## Chat Completions Example

```kotlin
private fun chatWithModel() {
    lifecycleScope.launch {
        try {
            val request = ChatCompletionRequest(
                messages = listOf(
                    ChatMessage(
                        role = "system",
                        content = "You are a helpful AI assistant."
                    ),
                    ChatMessage(
                        role = "user",
                        content = "Explain quantum computing in simple terms"
                    )
                ),
                temperature = 0.7,
                maxTokens = 512,
                topP = 0.9
            )

            val response = slyos.chatCompletion("quantum-3b", request)
            val assistantMessage = response.choices.firstOrNull()?.message?.content

            runOnUiThread {
                outputText.text = assistantMessage ?: "No response"
            }
        } catch (e: Exception) {
            runOnUiThread {
                outputText.text = "Chat failed: ${e.message}"
            }
        }
    }
}
```

## Device Profiling Example

```kotlin
private fun showDeviceInfo() {
    lifecycleScope.launch {
        try {
            val profile = slyos.getDeviceProfile() ?: return@launch

            val info = """
                Device Profile:
                CPU Cores: ${profile.cpuCores}
                RAM: ${profile.memoryMB}MB (${profile.memoryMB / 1024}GB)
                Storage: ${profile.estimatedStorageMB}MB
                OS: ${profile.os}
                API Level: ${profile.osVersion}
                Has GPU: ${profile.hasGPU}

                Recommendations:
                Quantization: ${profile.recommendedQuant.name}
                Max Context: ${profile.maxContextWindow} tokens
            """.trimIndent()

            runOnUiThread {
                outputText.text = info
            }
        } catch (e: Exception) {
            runOnUiThread {
                outputText.text = "Error getting device info: ${e.message}"
            }
        }
    }
}
```

## Model Recommendation Example

```kotlin
private fun recommendModel() {
    lifecycleScope.launch {
        try {
            val recommendation = slyos.recommendModel(ModelCategory.LLM)

            if (recommendation != null) {
                val info = """
                    Recommended Model:
                    Model ID: ${recommendation.modelId}
                    Quantization: ${recommendation.quant.name}
                    Context Window: ${recommendation.contextWindow} tokens

                    Reason:
                    ${recommendation.reason}
                """.trimIndent()

                runOnUiThread {
                    outputText.text = info
                }
            } else {
                runOnUiThread {
                    outputText.text = "No suitable model found for this device"
                }
            }
        } catch (e: Exception) {
            runOnUiThread {
                outputText.text = "Error: ${e.message}"
            }
        }
    }
}
```

## Streaming Responses (Future Enhancement)

```kotlin
// For future versions with streaming support:
private suspend fun streamGeneration() {
    slyos.generateStream(
        modelId = "quantum-1.7b",
        prompt = "Write a poem about AI",
        options = GenerateOptions(maxTokens = 512)
    ).collect { token ->
        // Update UI with each token
        runOnUiThread {
            outputText.append(token)
        }
    }
}
```

## Error Handling Best Practices

```kotlin
private fun handleSlyOSError(error: Exception) {
    val message = when {
        error.message?.contains("auth") == true -> {
            "Authentication failed. Check your API key."
        }
        error.message?.contains("Not enough RAM") == true -> {
            "Device has insufficient memory. Try a smaller model."
        }
        error.message?.contains("Unknown model") == true -> {
            "Model not found. Check the model ID."
        }
        error.message?.contains("download") == true -> {
            "Failed to download model. Check your internet connection."
        }
        error.message?.contains("ONNX") == true -> {
            "Inference engine error. Try restarting the app."
        }
        else -> "Error: ${error.message}"
    }

    runOnUiThread {
        statusText.text = message
    }
}
```

## Background Task Example

```kotlin
import android.app.Service
import android.content.Intent
import android.os.IBinder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class InferenceService : Service() {
    private lateinit var slyos: SlyOS
    private val scope = CoroutineScope(Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        slyos = SlyOS(this, SlyOSConfigWithFallback(
            apiKey = "your-api-key"
        ))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        scope.launch {
            try {
                slyos.initialize()
                slyos.loadModel("quantum-1.7b")

                val result = slyos.generate(
                    "quantum-1.7b",
                    "Summarize machine learning"
                )

                // Broadcast result to UI
                sendBroadcast(Intent().apply {
                    action = "com.example.slyosapp.RESULT"
                    putExtra("result", result)
                })

            } catch (e: Exception) {
                // Handle error
            }
        }

        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
```

## Caching Models Locally

```kotlin
import android.content.Context
import java.io.File

class ModelCache(context: Context) {
    private val cacheDir = File(context.cacheDir, "slyos_models")

    init {
        cacheDir.mkdirs()
    }

    fun getModelPath(modelId: String): File =
        File(cacheDir, modelId)

    fun hasModel(modelId: String): Boolean =
        getModelPath(modelId).exists()

    fun clearCache() {
        cacheDir.deleteRecursively()
        cacheDir.mkdirs()
    }
}
```

## Building a Chat UI

```kotlin
import androidx.recyclerview.widget.RecyclerView

data class ChatMessage(val role: String, val content: String)

class ChatAdapter : RecyclerView.Adapter<ChatViewHolder>() {
    private val messages = mutableListOf<ChatMessage>()

    fun addMessage(message: ChatMessage) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_message, parent, false)
        return ChatViewHolder(view)
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
        holder.bind(messages[position])
    }

    override fun getItemCount() = messages.size
}

class ChatViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
    fun bind(message: ChatMessage) {
        itemView.findViewById<TextView>(R.id.message_text).text = message.content
        itemView.findViewById<TextView>(R.id.message_role).text = message.role
    }
}
```

## Performance Monitoring

```kotlin
class PerformanceMonitor {
    private val timings = mutableMapOf<String, Long>()

    fun startTimer(key: String) {
        timings[key] = System.currentTimeMillis()
    }

    fun endTimer(key: String) {
        val startTime = timings.remove(key) ?: return
        val duration = System.currentTimeMillis() - startTime
        println("$key took ${duration}ms")
    }
}

// Usage:
val monitor = PerformanceMonitor()
monitor.startTimer("model_load")
slyos.loadModel("quantum-1.7b")
monitor.endTimer("model_load")
```

## Testing

```kotlin
import org.junit.Test
import kotlinx.coroutines.test.runTest

class SlyOSTest {
    private lateinit var slyos: SlyOS

    @Test
    fun testInitialization() = runTest {
        val config = SlyOSConfigWithFallback(apiKey = "test-key")
        slyos = SlyOS(context, config)

        val profile = slyos.initialize()
        assert(profile.cpuCores > 0)
        assert(profile.memoryMB > 0)
    }

    @Test
    fun testModelLoading() = runTest {
        slyos.loadModel("quantum-1.7b")
        assert(slyos.getAvailableModels().isNotEmpty())
    }
}
```
