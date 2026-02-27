# SlyOS

[![npm version](https://img.shields.io/npm/v/@emilshirokikh/slyos-sdk?style=flat-square)](https://www.npmjs.com/package/@emilshirokikh/slyos-sdk)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?style=flat-square)](https://www.typescriptlang.org/)

**On-Device AI Infrastructure for the Edge**

SlyOS is an open-source SDK that brings AI inference to your users' devices—phones, laptops, and IoT hardware—without cloud dependency. Run models locally for faster responses, better privacy, and dramatically lower costs.

## What is SlyOS?

SlyOS is a complete on-device AI infrastructure platform that enables developers to:

- **Deploy AI models directly to user devices** instead of relying on cloud APIs
- **Run unlimited inferences** with a Pure Edge ($0.15/device/month) or Hybrid RAG ($0.45/device/month) subscription
- **Improve privacy** — data never leaves the device
- **Reduce latency** — sub-second responses with local inference
- **Save costs** — eliminate per-API-call charges with flat device-based pricing

Perfect for building privacy-first applications, offline-capable services, and cost-effective AI features at scale.

## Features

✨ **On-Device Inference** — Run AI models natively on user devices
📊 **Device Profiling** — Automatically optimize for device capabilities
⚡ **Auto Quantization** — Quantize models for optimal performance
📈 **Progress Tracking** — Monitor model downloads and inference metrics
🔌 **OpenAI Compatible** — Drop-in replacement for OpenAI API
🏢 **AWS Bedrock Compatible** — Works with Bedrock invoke patterns
☁️ **Cloud Fallback** — Gracefully fall back to cloud APIs when needed
🗣️ **LLM + STT** — Support for both language and speech models
📱 **Multi-Platform** — Web browsers, Node.js, and mobile (coming soon)
🧠 **Device Intelligence** — SlyOS Score, hardware fingerprinting, performance benchmarking
💡 **Community Ideas** — Built-in feature request and voting system
📚 **RAG Knowledge Bases** — Upload documents and URLs for context-aware responses

## Quick Start

### 1. Install

```bash
npm install @emilshirokikh/slyos-sdk
```

### 2. Initialize & Generate

```javascript
import SlyOS from '@emilshirokikh/slyos-sdk';

// Initialize SDK with your API key
const sdk = new SlyOS({
  apiKey: 'sk_your_api_key_here'
});

await sdk.initialize();

// Load a model (one-time download)
await sdk.loadModel('quantum-3b');

// Generate a response (runs locally!)
const response = await sdk.generate('quantum-3b', 'Hello, how are you?', {
  temperature: 0.7,
  maxTokens: 100
});

console.log(response);
// Output: Generated entirely on the user's device
```

### 3. Verify Results

✅ AI runs on the user's device
✅ Works offline after initial download
✅ No per-inference charges
✅ Sub-second response times
✅ Complete privacy — data stays local

## OpenAI Compatibility

Use SlyOS as a drop-in replacement for OpenAI:

```javascript
import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({
  apiKey: 'sk_your_api_key_here'
});

// API compatible with OpenAI ChatCompletion
const response = await sdk.chatCompletion({
  model: 'quantum-3b',
  messages: [
    { role: 'user', content: 'Explain quantum computing' }
  ],
  temperature: 0.7,
  maxTokens: 200
});

console.log(response.choices[0].message.content);
```

## AWS Bedrock Compatibility

Invoke models using Bedrock patterns:

```javascript
const response = await sdk.bedrockInvoke('quantum-3b', {
  inputText: 'What is machine learning?',
  textGenerationConfig: {
    maxTokenCount: 150,
    temperature: 0.7
  }
});

console.log(response.results[0].outputText);
```

## Cloud Fallback

Automatically fall back to cloud APIs when on-device inference isn't available:

```javascript
const sdk = new SlyOS({
  apiKey: 'sk_your_api_key_here',
  fallback: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini'
  }
});

// If on-device fails, automatically uses OpenAI
const response = await sdk.generate('quantum-3b', 'Your prompt here');
```

## Pricing

SlyOS offers transparent, device-based pricing with no per-inference charges:

| Plan | Price | Features |
|------|-------|----------|
| **Free Trial** | Free (30 days) | All features included |
| **Pure Edge** | $0.15/device/month | On-device inference, model zoo, device profiling, analytics, device intelligence |
| **Hybrid RAG** | $0.45/device/month | Everything in Pure Edge + RAG knowledge bases, vector search, document upload, URL scraping, offline sync |

All devices are billed equally. Choose Pure Edge for core AI inference or upgrade to Hybrid RAG for advanced knowledge management features.

## Available Models

| Model | Category | Size | Inference Speed | Best For |
|-------|----------|------|-----------------|----------|
| **quantum-1.7b** | LLM | 0.9 GB | 15 tok/sec | Advanced features on high-end phones |
| **quantum-3b** | LLM | 1.6 GB | 10 tok/sec | Desktop & tablet applications |
| **quantum-code-3b** | Code LLM | 1.6 GB | 10 tok/sec | Code generation & completion |
| **quantum-8b** | LLM | 4.2 GB | 5 tok/sec | Server-side inference, high quality |
| **voicecore-base** | Speech-to-Text | 40 MB | 1x | Voice features & transcription |
| **voicecore-small** | Speech-to-Text | 100 MB | 2x | Lightweight voice on mobile |

Sizes shown are Q4 (most compressed). Higher precision quantizations available.

## Device Requirements

| Requirement | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 512 MB free | 2 GB + |
| **Storage** | 200 MB free | 5 GB + |
| **Processor** | Multi-core | Modern multi-core (2GHz+) |
| **Browsers** | Chrome 90+, Safari 14+, Edge 90+ | Latest versions |
| **Node.js** | 16+ | 18 LTS+ |

## Dashboard

SlyOS includes a management dashboard at [dashboard-khaki-iota-54.vercel.app](https://dashboard-khaki-iota-54.vercel.app) for monitoring devices, managing models, configuring RAG knowledge bases, and viewing analytics.

## API Reference

### Core Methods

**`initialize(options?)`** — Initialize the SDK with configuration
**`loadModel(modelId, options?)`** — Download and cache a model
**`generate(modelId, prompt, options?)`** — Generate text from a prompt
**`chatCompletion(options)`** — OpenAI-compatible chat API
**`transcribe(modelId, audio)`** — Speech-to-text transcription
**`bedrockInvoke(options)`** — AWS Bedrock-compatible invoke
**`recommendModel(category?)`** — Get best model recommendation for device
**`searchModels(query, options?)`** — Search HuggingFace model hub
**`getDeviceProfile()`** — Get device capabilities & specs
**`getModelContextWindow()`** — Get current model's context window size
**`getDeviceId()`** — Get persistent device identifier
**`destroy()`** — Flush telemetry and clean up resources

See the [full API documentation](https://docs.slyos.world/api) for complete method signatures and options.

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to your branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request** with a clear description

Please ensure:
- Code follows the existing style
- Changes are well-tested
- Commit messages are clear and descriptive
- No internal URLs, credentials, or secrets are included

## License

MIT License — See [LICENSE](LICENSE) for details

## Acknowledgments

Built with:
- [Hugging Face Transformers.js](https://github.com/xenova/transformers.js)
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)

## Support

- **Documentation:** [docs.slyos.world](https://docs.slyos.world)
- **GitHub Issues:** [Report issues here](https://github.com/BeltoAI/sly.os/issues)
- **npm Package:** [@emilshirokikh/slyos-sdk](https://www.npmjs.com/package/@emilshirokikh/slyos-sdk)

---

**Built for the edge. Made for privacy. Powered by your users' devices.**
