# 🔥 @emilshirokikh/slyos-sdk

Official SDK for SlyOS on-device AI platform. Run AI models locally in browsers and Node.js.

---

## 📦 Installation
```bash
npm install @emilshirokikh/slyos-sdk
```

**npm:** https://www.npmjs.com/package/@emilshirokikh/slyos-sdk

---

## 🚀 Quick Start
```javascript
import SlyOS from '@emilshirokikh/slyos-sdk';

// 1. Initialize
const sdk = new SlyOS({
  apiKey: 'sk_live_your_api_key'
});
await sdk.initialize();

// 2. Load model (downloads ~200MB once)
await sdk.loadModel('quantum-1.7b');

// 3. Generate responses
const response = await sdk.generate('quantum-1.7b', 
  'What is artificial intelligence?',
  {
    temperature: 0.7,
    maxTokens: 100,
    topP: 0.9
  }
);

console.log(response);
// AI runs locally - no per-inference charges!
```

---

## 📚 API Reference

### Constructor
```typescript
new SlyOS(config: SlyOSConfig)
```

**Config:**
```typescript
{
  apiKey: string;      // Get from dashboard
  apiUrl?: string;     // Optional, defaults to production
}
```

---

### Methods

#### `initialize()`
Authenticates with SlyOS backend and registers device.
```javascript
await sdk.initialize();
```

**Returns:** `Promise<DeviceProfile>`

---

#### `loadModel(modelId)`
Downloads and caches AI model locally.
```javascript
await sdk.loadModel('quantum-1.7b');
```

**Parameters:**
- `modelId` (string): Model identifier
  - `quantum-1.7b` - 900MB, recommended
  - `quantum-3b` - 1.6GB, high quality
  - `quantum-code-3b` - 1.6GB, code-optimized
  - `quantum-8b` - 4.2GB, best quality

**Returns:** `Promise<void>`

**First call:** Downloads model (~1-2 min)  
**Subsequent calls:** Uses cached model (<1 sec)

---

#### `generate(modelId, prompt, options?)`
Generates AI response locally.
```javascript
const response = await sdk.generate('quantum-1.7b', 
  'Tell me about your menu',
  {
    temperature: 0.7,
    maxTokens: 150,
    topP: 0.9
  }
);
```

**Parameters:**
- `modelId` (string): Model to use
- `prompt` (string): Input text
- `options` (object, optional):
  - `temperature` (0-2): Creativity (default: 0.7)
  - `maxTokens` (10-2000): Max response length (default: 100)
  - `topP` (0-1): Nucleus sampling (default: 0.9)

**Returns:** `Promise<string>` - Generated text

---

#### `chatCompletion(options)`
OpenAI-compatible chat completions.
```javascript
const response = await sdk.chatCompletion({
  model: 'quantum-3b',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing' }
  ],
  temperature: 0.7,
  maxTokens: 512,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0
});

console.log(response.choices[0].message.content);
```

**Parameters:**
- `model` (string): Model ID to use
- `messages` (array): Conversation messages with role and content
- `temperature` (0-2, optional): Creativity control (default: 0.7)
- `maxTokens` (optional): Maximum response length
- `topP` (0-1, optional): Nucleus sampling
- `frequencyPenalty` (optional): Reduce repeated tokens
- `presencePenalty` (optional): Encourage new topics

**Returns:** `Promise<ChatCompletionResponse>`

---

#### `transcribe(modelId, audio, options?)`
Speech-to-text using voicecore models.
```javascript
const audioData = await fetch('audio.wav').then(r => r.arrayBuffer());

const result = await sdk.transcribe('voicecore-base', audioData, {
  language: 'en'
});

console.log(result.text); // Transcribed text
```

**Parameters:**
- `modelId` (string): STT model (`voicecore-base` or `voicecore-small`)
- `audio` (ArrayBuffer): Audio data
- `options` (object, optional):
  - `language` (string): Language code (default: 'en')

**Returns:** `Promise<TranscriptionResult>`

---

#### `recommendModel(category?)`
Returns best model for the current device's hardware.
```javascript
const recommendation = sdk.recommendModel('llm');
console.log(recommendation.modelId); // e.g., 'quantum-1.7b'
```

---

#### `searchModels(query, options?)`
Search HuggingFace Hub for ONNX-compatible models.
```javascript
const results = await sdk.searchModels('code generation', {
  limit: 10
});

results.forEach(model => {
  console.log(model.name, model.downloads);
});
```

**Parameters:**
- `query` (string): Search keywords
- `options` (object, optional):
  - `limit` (number): Results to return (default: 5)

**Returns:** `Promise<Array<ModelSearchResult>>`

---

#### `getDeviceProfile()`
Returns the device's hardware profile (CPU, RAM, GPU, screen, network).

---

#### `getModelContextWindow()`
Returns current model's context window size in tokens.

---

#### `getDeviceId()`
Returns the persistent device identifier.

---

#### `destroy()`
Flushes pending telemetry and cleans up timers. Call before shutting down.
```javascript
await sdk.destroy(); // Ensures telemetry is sent
```

#### `getSdkVersion()`
Returns the current SDK version string (e.g. `'1.4.0'`).

#### `getAvailableModels()`
Returns available models grouped by category (`llm`, `stt`).

#### `canRunModel(modelId, quant?)`
Checks if the current device can run a specific model based on hardware profile.

#### `ragQuery(modelId, knowledgeBaseId, query, options?)`
Performs a RAG query against a cloud-indexed knowledge base. Requires Hybrid RAG plan.

#### `ragQueryLocal(modelId, knowledgeBaseId, query, options?)`
Performs a RAG query using locally-cached embeddings for offline-capable retrieval.

#### `ragQueryOffline(modelId, knowledgeBaseId, query, options?)`
Fully offline RAG query using pre-synced knowledge base data.

#### `syncKnowledgeBase(knowledgeBaseId)`
Downloads and caches a knowledge base locally for offline RAG queries.

---

## 🌐 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Chrome** | ✅ Supported | Recommended |
| **Safari** | ✅ Supported | iOS 16+ |
| **Edge** | ✅ Supported | Chromium-based |
| **Firefox** | ⚠️ Limited | Some models work |
| **Node.js** | ✅ Supported | v18+ |
| **React Native** | 🚧 Coming Soon | Q3 2026 |

---

## 💡 Usage Examples

### Basic Chatbot
```javascript
import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({ apiKey: 'sk_live_...' });
await sdk.initialize();
await sdk.loadModel('quantum-1.7b');

async function chat(userMessage) {
  return await sdk.generate('quantum-1.7b', userMessage);
}

const response = await chat('What are your hours?');
console.log(response);
```

---

### With System Prompt
```javascript
const systemPrompt = `You are a helpful assistant for McDonald's. 
Help with menu, hours, and nutrition. Be friendly and concise.`;

const userMessage = 'What breakfast items do you have?';
const fullPrompt = `${systemPrompt}\n\nCustomer: ${userMessage}\nAssistant:`;

const response = await sdk.generate('quantum-1.7b', fullPrompt, {
  temperature: 0.7,
  maxTokens: 150
});
```

---

### React Integration
```jsx
import { useState, useEffect } from 'react';
import SlyOS from '@emilshirokikh/slyos-sdk';

function Chatbot() {
  const [sdk, setSdk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState('');

  useEffect(() => {
    async function init() {
      const client = new SlyOS({ apiKey: 'sk_live_...' });
      await client.initialize();
      await client.loadModel('quantum-1.7b');
      setSdk(client);
      setLoading(false);
    }
    init();
  }, []);

  async function handleChat(message) {
    const reply = await sdk.generate('quantum-1.7b', message);
    setResponse(reply);
  }

  if (loading) return <div>Loading AI...</div>;
  
  return (
    <div>
      <button onClick={() => handleChat('Hello!')}>
        Chat
      </button>
      <p>{response}</p>
    </div>
  );
}
```

---

## 🔧 Advanced Configuration

### Custom Backend URL
```javascript
const sdk = new SlyOS({
  apiKey: 'sk_live_...',
  apiUrl: 'https://api.slyos.world'
});
```

---

### Multiple Models
```javascript
await sdk.loadModel('quantum-1.7b');
await sdk.loadModel('quantum-3b');

// Use different models
const fast = await sdk.generate('quantum-1.7b', 'Quick question?');
const detailed = await sdk.generate('quantum-3b', 'Complex question?');
```

---

## 📊 Performance

### Benchmarks (Quantum 1.7B)

| Metric | Browser | Node.js |
|--------|---------|---------|
| First load | 60-120s | 30-60s |
| Cached load | <1s | <0.5s |
| Inference | 10-15 tok/s | 15-25 tok/s |
| Memory | 1.2GB | 900MB |

---

## 🐛 Troubleshooting

### Model won't load
```javascript
// Check browser console for errors
// Ensure 2GB+ RAM available
// Try smaller model (quantum-1.7b)
```

### CORS errors
```javascript
// Backend must allow your domain
// Check CORS_ORIGIN environment variable
```

### Slow inference
```javascript
// Use smaller model
// Reduce maxTokens
// Check CPU/RAM availability
```

---

## 🔒 Security

- API keys stored client-side (localStorage)
- All inference happens locally (private)
- Inference telemetry batched locally (flushed every 10 inferences or 60s)
- No user data sent to cloud

---

## 📦 Package Info

- **Package:** `@emilshirokikh/slyos-sdk`
- **Version:** 1.4.0
- **License:** MIT
- **Size:** 168 KB (unpacked)
- **Dependencies:** axios, @huggingface/transformers

---

## 📄 License

MIT - See LICENSE file

---

## 🙏 Credits

Built with Hugging Face Transformers.js

---

## 📞 Support

- **npm:** https://www.npmjs.com/package/@emilshirokikh/slyos-sdk
- **GitHub:** https://github.com/BeltoAI/sly.os
- **Docs:** See main README.md
- **Email:** support@slyos.world
