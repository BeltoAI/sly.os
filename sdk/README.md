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

**Returns:** `Promise<void>`

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

## 🌐 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Chrome** | ✅ Supported | Recommended |
| **Safari** | ✅ Supported | iOS 16+ |
| **Edge** | ✅ Supported | Chromium-based |
| **Firefox** | ⚠️ Limited | Some models work |
| **Node.js** | ✅ Supported | v18+ |
| **React Native** | 🚧 Coming Soon | Q2 2026 |

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
await sdk.loadModel('quantum-1.7b');

// Use different models
const fast = await sdk.generate('quantum-1.7b', 'Quick question?');
const detailed = await sdk.generate('quantum-1.7b', 'Complex question?');
```

---

## 📊 Performance

### Benchmarks (Quantum 360M)

| Metric | Browser | Node.js |
|--------|---------|---------|
| First load | 60-120s | 30-60s |
| Cached load | <1s | <0.5s |
| Inference | 35 tok/s | 50 tok/s |
| Memory | 500MB | 300MB |

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
- Telemetry sent to SlyOS (anonymized)
- No user data sent to cloud

---

## 📦 Package Info

- **Package:** `@emilshirokikh/slyos-sdk`
- **Version:** 1.0.0
- **License:** MIT
- **Size:** 13.5 KB (unpacked)
- **Dependencies:** axios, @huggingface/transformers

---

## 🤝 Contributing
```bash
# Clone repo
git clone https://github.com/BeltoAI/sly.git
cd sly/sdk

# Install dependencies
npm install

# Make changes to src/index.ts

# Build
npm run build

# Test locally
npm link
```

---

## 📄 License

MIT - See LICENSE file

---

## 🙏 Credits

Built with Hugging Face Transformers.js

---

## 📞 Support

- **npm:** https://www.npmjs.com/package/@emilshirokikh/slyos-sdk
- **GitHub:** https://github.com/BeltoAI/sly
- **Docs:** See main README.md
- **Email:** support@slyos.world
