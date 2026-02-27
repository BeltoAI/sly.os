import axios from 'axios';
import { pipeline, env } from '@huggingface/transformers';
// @ts-ignore - Force CPU in Node.js
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.proxy = false;
}
// ─── Model Registry ─────────────────────────────────────────────────
const modelMap = {
    // LLM models (1B+)
    'quantum-1.7b': {
        hfModel: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
        task: 'text-generation',
        category: 'llm',
        sizesMB: { q4: 900, q8: 1700, fp16: 3400, fp32: 6800 },
        minRAM_MB: { q4: 2048, q8: 3072, fp16: 5120, fp32: 8192 },
    },
    'quantum-3b': {
        hfModel: 'Qwen/Qwen2.5-3B-Instruct',
        task: 'text-generation',
        category: 'llm',
        sizesMB: { q4: 1600, q8: 3200, fp16: 6400, fp32: 12800 },
        minRAM_MB: { q4: 3072, q8: 5120, fp16: 8192, fp32: 16384 },
    },
    'quantum-code-3b': {
        hfModel: 'Qwen/Qwen2.5-Coder-3B-Instruct',
        task: 'text-generation',
        category: 'llm',
        sizesMB: { q4: 1600, q8: 3200, fp16: 6400, fp32: 12800 },
        minRAM_MB: { q4: 3072, q8: 5120, fp16: 8192, fp32: 16384 },
    },
    'quantum-8b': {
        hfModel: 'Qwen/Qwen2.5-7B-Instruct',
        task: 'text-generation',
        category: 'llm',
        sizesMB: { q4: 4200, q8: 8400, fp16: 16800, fp32: 33600 },
        minRAM_MB: { q4: 6144, q8: 10240, fp16: 20480, fp32: 40960 },
    },
    // STT models
    'voicecore-base': {
        hfModel: 'onnx-community/whisper-base',
        task: 'automatic-speech-recognition',
        category: 'stt',
        sizesMB: { q4: 40, q8: 75, fp16: 150, fp32: 300 },
        minRAM_MB: { q4: 512, q8: 512, fp16: 1024, fp32: 2048 },
    },
    'voicecore-small': {
        hfModel: 'onnx-community/whisper-small',
        task: 'automatic-speech-recognition',
        category: 'stt',
        sizesMB: { q4: 100, q8: 200, fp16: 400, fp32: 800 },
        minRAM_MB: { q4: 1024, q8: 1024, fp16: 2048, fp32: 4096 },
    },
};
// ─── Context Window Sizing ──────────────────────────────────────────
function recommendContextWindow(memoryMB, quant) {
    // More RAM + smaller quant = larger context window
    const base = quant === 'q4' ? 1024 : quant === 'q8' ? 2048 : quant === 'fp16' ? 4096 : 8192;
    if (memoryMB >= 16384)
        return Math.min(base * 4, 32768);
    if (memoryMB >= 8192)
        return Math.min(base * 2, 16384);
    if (memoryMB >= 4096)
        return base;
    return Math.max(512, Math.floor(base / 2));
}
function selectQuantization(memoryMB, modelId) {
    const info = modelMap[modelId];
    if (!info)
        return 'q4';
    // ONNX/WASM has protobuf size limits — fp16 files >2GB crash on many systems.
    // For LLMs, cap at q4 via WASM. FP16/Q8 need native backends (llama.cpp).
    // STT models are small enough for q8/fp16.
    if (info.category === 'llm') {
        return 'q4'; // safest for ONNX/WASM across all platforms
    }
    // STT models: try from best quality down
    const quants = ['fp16', 'q8', 'q4'];
    for (const q of quants) {
        if (memoryMB >= info.minRAM_MB[q])
            return q;
    }
    return 'q4'; // fallback
}
// ─── Context Window Detection ──────────────────────────────────────
async function detectContextWindowFromHF(hfModelId) {
    try {
        const configUrl = `https://huggingface.co/${hfModelId}/raw/main/config.json`;
        const response = await axios.get(configUrl, { timeout: 5000 });
        const config = response.data;
        // Try multiple context window field names
        const contextWindow = config.max_position_embeddings ||
            config.n_positions ||
            config.max_seq_len ||
            config.model_max_length ||
            2048;
        return contextWindow;
    }
    catch {
        // Default if config cannot be fetched
        return 2048;
    }
}
// ─── SDK Version ────────────────────────────────────────────────────
const SDK_VERSION = '1.4.0';
// ─── Persistent Device Identity ─────────────────────────────────────
async function hashString(str) {
    const isNode = typeof window === 'undefined';
    if (isNode) {
        const crypto = await import('crypto');
        return crypto.createHash('sha256').update(str).digest('hex').substring(0, 32);
    }
    else {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, 32);
    }
}
async function getOrCreateDeviceId() {
    const isNode = typeof window === 'undefined';
    if (isNode) {
        // Node.js: persist in ~/.slyos/device-id
        try {
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');
            const slyosDir = path.join(os.homedir(), '.slyos');
            const idFile = path.join(slyosDir, 'device-id');
            try {
                const existing = fs.readFileSync(idFile, 'utf-8').trim();
                if (existing)
                    return existing;
            }
            catch { }
            const deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
            fs.mkdirSync(slyosDir, { recursive: true });
            fs.writeFileSync(idFile, deviceId);
            return deviceId;
        }
        catch {
            return `device-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
        }
    }
    else {
        // Browser: persist in localStorage
        const key = 'slyos_device_id';
        try {
            const existing = localStorage.getItem(key);
            if (existing)
                return existing;
        }
        catch { }
        const deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
        try {
            localStorage.setItem(key, deviceId);
        }
        catch { }
        return deviceId;
    }
}
async function generateDeviceFingerprint() {
    const isNode = typeof window === 'undefined';
    let components = [];
    if (isNode) {
        try {
            const os = await import('os');
            const cpus = os.cpus();
            components.push(cpus[0]?.model || 'unknown-cpu');
            components.push(String(os.totalmem()));
            components.push(os.platform());
            components.push(os.arch());
            components.push(String(cpus.length));
        }
        catch { }
    }
    else {
        components.push(String(navigator.hardwareConcurrency || 0));
        components.push(String(navigator.deviceMemory || 0));
        components.push(navigator.platform || 'unknown');
        // WebGL renderer for GPU fingerprint
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                if (ext) {
                    components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'unknown-gpu');
                }
            }
        }
        catch { }
        components.push(String(screen.width || 0));
        components.push(String(screen.height || 0));
    }
    return await hashString(components.join('|'));
}
// ─── Enhanced Device Profiling ──────────────────────────────────────
function detectGPU() {
    if (typeof window === 'undefined')
        return { renderer: null, vramMb: 0 };
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl)
            return { renderer: null, vramMb: 0 };
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
        // Rough VRAM estimate from renderer string
        let vramMb = 0;
        if (renderer) {
            const match = renderer.match(/(\d+)\s*MB/i);
            if (match)
                vramMb = parseInt(match[1]);
            else if (/RTX\s*40/i.test(renderer))
                vramMb = 8192;
            else if (/RTX\s*30/i.test(renderer))
                vramMb = 6144;
            else if (/GTX/i.test(renderer))
                vramMb = 4096;
            else if (/Apple M[2-4]/i.test(renderer))
                vramMb = 8192;
            else if (/Apple M1/i.test(renderer))
                vramMb = 4096;
            else if (/Intel/i.test(renderer))
                vramMb = 1024;
        }
        return { renderer, vramMb };
    }
    catch {
        return { renderer: null, vramMb: 0 };
    }
}
function detectBrowser() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined')
        return { name: 'node', version: process.version || 'unknown' };
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) {
        const m = ua.match(/Edg\/([\d.]+)/);
        return { name: 'Edge', version: m?.[1] || '' };
    }
    if (/Chrome\//i.test(ua)) {
        const m = ua.match(/Chrome\/([\d.]+)/);
        return { name: 'Chrome', version: m?.[1] || '' };
    }
    if (/Firefox\//i.test(ua)) {
        const m = ua.match(/Firefox\/([\d.]+)/);
        return { name: 'Firefox', version: m?.[1] || '' };
    }
    if (/Safari\//i.test(ua)) {
        const m = ua.match(/Version\/([\d.]+)/);
        return { name: 'Safari', version: m?.[1] || '' };
    }
    return { name: 'unknown', version: '' };
}
function detectNetworkType() {
    if (typeof navigator === 'undefined')
        return 'unknown';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn)
        return 'unknown';
    return conn.effectiveType || conn.type || 'unknown';
}
async function measureApiLatency(apiUrl) {
    try {
        const start = Date.now();
        await axios.head(`${apiUrl}/api/health`, { timeout: 5000 });
        return Date.now() - start;
    }
    catch {
        try {
            const start = Date.now();
            await axios.get(`${apiUrl}/api/health`, { timeout: 5000 });
            return Date.now() - start;
        }
        catch {
            return -1;
        }
    }
}
// ─── Device Profiling ───────────────────────────────────────────────
async function profileDevice() {
    const isNode = typeof window === 'undefined';
    let cpuCores = 4;
    let memoryMB = 4096;
    let estimatedStorageMB = 10000;
    let platform = isNode ? 'nodejs' : 'web';
    let os = 'unknown';
    if (isNode) {
        // Node.js environment
        try {
            const osModule = await import('os');
            cpuCores = osModule.cpus().length;
            memoryMB = Math.round(osModule.totalmem() / (1024 * 1024));
            os = `${osModule.platform()} ${osModule.release()}`;
            // Estimate free disk via df-like check
            try {
                const { execSync } = await import('child_process');
                const dfOutput = execSync('df -m . 2>/dev/null || echo "0 0 0 0"', { encoding: 'utf-8' });
                const lines = dfOutput.trim().split('\n');
                if (lines.length > 1) {
                    const parts = lines[1].split(/\s+/);
                    estimatedStorageMB = parseInt(parts[3]) || 10000; // Available column
                }
            }
            catch {
                estimatedStorageMB = 10000;
            }
        }
        catch {
            // Fallback
        }
    }
    else {
        // Browser environment
        cpuCores = navigator.hardwareConcurrency || 4;
        memoryMB = (navigator.deviceMemory || 4) * 1024; // deviceMemory is in GB
        os = navigator.userAgent;
        // Storage Manager API (Chrome 61+)
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                estimatedStorageMB = Math.round((estimate.quota || 0) / (1024 * 1024));
            }
        }
        catch {
            estimatedStorageMB = 5000;
        }
    }
    const recommendedQuant = selectQuantization(memoryMB, 'quantum-1.7b'); // default baseline
    const maxContextWindow = recommendContextWindow(memoryMB, recommendedQuant);
    // Enhanced profiling
    const gpu = detectGPU();
    const browser = detectBrowser();
    const networkType = detectNetworkType();
    const timezone = Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || 'unknown';
    let screenWidth = 0, screenHeight = 0, pixelRatio = 0;
    let wasmAvailable = false, webgpuAvailable = false;
    if (!isNode) {
        screenWidth = screen?.width || 0;
        screenHeight = screen?.height || 0;
        pixelRatio = window?.devicePixelRatio || 1;
    }
    // Capability detection
    try {
        wasmAvailable = typeof WebAssembly !== 'undefined';
    }
    catch { }
    if (!isNode) {
        try {
            webgpuAvailable = !!navigator.gpu;
        }
        catch { }
    }
    return {
        cpuCores,
        memoryMB,
        estimatedStorageMB,
        platform,
        os,
        recommendedQuant,
        maxContextWindow,
        gpuRenderer: gpu.renderer || undefined,
        gpuVramMb: gpu.vramMb || undefined,
        screenWidth: screenWidth || undefined,
        screenHeight: screenHeight || undefined,
        pixelRatio: pixelRatio || undefined,
        browserName: browser.name,
        browserVersion: browser.version,
        networkType,
        timezone,
        wasmAvailable,
        webgpuAvailable,
    };
}
class SlyOS {
    constructor(config) {
        this.token = null;
        this.models = new Map();
        this.deviceProfile = null;
        this.modelContextWindow = 0;
        // Telemetry batching
        this.telemetryBuffer = [];
        this.telemetryFlushTimer = null;
        // ═══════════════════════════════════════════════════════════
        // RAG — Retrieval Augmented Generation
        // ═══════════════════════════════════════════════════════════
        this.localEmbeddingModel = null;
        this.offlineIndexes = new Map();
        this.apiKey = config.apiKey;
        this.apiUrl = config.apiUrl || 'https://api.slyos.world';
        this.deviceId = ''; // Set asynchronously in initialize()
        this.onProgress = config.onProgress || null;
        this.onEvent = config.onEvent || null;
        this.fallbackConfig = config.fallback || null;
    }
    // ── Progress & Event Helpers ────────────────────────────────────
    emitProgress(stage, progress, message, detail) {
        if (this.onProgress) {
            this.onProgress({ stage, progress, message, detail });
        }
    }
    emitEvent(type, data) {
        if (this.onEvent) {
            this.onEvent({ type, data, timestamp: Date.now() });
        }
    }
    // ── Telemetry Batching ─────────────────────────────────────────
    recordTelemetry(entry) {
        this.telemetryBuffer.push(entry);
        if (this.telemetryBuffer.length >= SlyOS.TELEMETRY_BATCH_SIZE) {
            this.flushTelemetry();
        }
        else if (!this.telemetryFlushTimer) {
            this.telemetryFlushTimer = setTimeout(() => this.flushTelemetry(), SlyOS.TELEMETRY_FLUSH_INTERVAL);
        }
    }
    async flushTelemetry() {
        if (this.telemetryFlushTimer) {
            clearTimeout(this.telemetryFlushTimer);
            this.telemetryFlushTimer = null;
        }
        if (this.telemetryBuffer.length === 0 || !this.token)
            return;
        const batch = [...this.telemetryBuffer];
        this.telemetryBuffer = [];
        try {
            await axios.post(`${this.apiUrl}/api/devices/telemetry`, {
                device_id: this.deviceId,
                metrics: batch,
            }, {
                headers: { Authorization: `Bearer ${this.token}` },
                timeout: 10000,
            });
            this.emitEvent('telemetry_flushed', { count: batch.length });
        }
        catch {
            // Put back on failure for next attempt
            this.telemetryBuffer.unshift(...batch);
            // Cap buffer to prevent memory leak
            if (this.telemetryBuffer.length > 100) {
                this.telemetryBuffer = this.telemetryBuffer.slice(-100);
            }
        }
    }
    // ── Device Analysis ─────────────────────────────────────────────
    async analyzeDevice() {
        this.emitProgress('profiling', 10, 'Analyzing device capabilities...');
        this.deviceProfile = await profileDevice();
        this.emitProgress('profiling', 100, `Device: ${this.deviceProfile.cpuCores} cores, ${Math.round(this.deviceProfile.memoryMB / 1024 * 10) / 10}GB RAM`);
        this.emitEvent('device_profiled', this.deviceProfile);
        return this.deviceProfile;
    }
    getDeviceProfile() {
        return this.deviceProfile;
    }
    getModelContextWindow() {
        return this.modelContextWindow;
    }
    getDeviceId() {
        return this.deviceId;
    }
    getSdkVersion() {
        return SDK_VERSION;
    }
    // Flush remaining telemetry and clean up timers
    async destroy() {
        await this.flushTelemetry();
        if (this.telemetryFlushTimer) {
            clearTimeout(this.telemetryFlushTimer);
            this.telemetryFlushTimer = null;
        }
    }
    // ── Smart Model Recommendation ──────────────────────────────────
    recommendModel(category = 'llm') {
        if (!this.deviceProfile) {
            throw new Error('Call analyzeDevice() first to get a recommendation.');
        }
        const mem = this.deviceProfile.memoryMB;
        const candidates = Object.entries(modelMap).filter(([_, info]) => info.category === category);
        // Sort by size descending — pick the biggest model that fits
        for (const [id, info] of candidates.sort((a, b) => b[1].sizesMB.q4 - a[1].sizesMB.q4)) {
            const quant = selectQuantization(mem, id);
            if (mem >= info.minRAM_MB[quant]) {
                const ctx = recommendContextWindow(mem, quant);
                return {
                    modelId: id,
                    quant,
                    contextWindow: ctx,
                    reason: `Best model for ${Math.round(mem / 1024)}GB RAM at ${quant.toUpperCase()} precision`,
                };
            }
        }
        // Fallback to smallest
        const smallest = candidates.sort((a, b) => a[1].sizesMB.q4 - b[1].sizesMB.q4)[0];
        if (smallest) {
            return {
                modelId: smallest[0],
                quant: 'q4',
                contextWindow: 512,
                reason: 'Limited device memory — using smallest available model at Q4',
            };
        }
        return null;
    }
    // ── Initialize ──────────────────────────────────────────────────
    async initialize() {
        this.emitProgress('initializing', 0, 'Starting SlyOS...');
        // Step 1: Persistent device ID
        this.deviceId = await getOrCreateDeviceId();
        // Step 2: Profile device (enhanced)
        this.emitProgress('profiling', 5, 'Detecting device capabilities...');
        this.deviceProfile = await profileDevice();
        // Step 2b: Generate device fingerprint
        this.deviceProfile.deviceFingerprint = await generateDeviceFingerprint();
        this.emitProgress('profiling', 20, `Detected: ${this.deviceProfile.cpuCores} CPU cores, ${Math.round(this.deviceProfile.memoryMB / 1024 * 10) / 10}GB RAM${this.deviceProfile.gpuRenderer ? ', GPU: ' + this.deviceProfile.gpuRenderer.substring(0, 30) : ''}`);
        this.emitEvent('device_profiled', this.deviceProfile);
        // Step 3: Authenticate
        this.emitProgress('initializing', 40, 'Authenticating with API key...');
        try {
            const authRes = await axios.post(`${this.apiUrl}/api/auth/sdk`, {
                apiKey: this.apiKey,
            });
            this.token = authRes.data.token;
            this.emitProgress('initializing', 60, 'Authenticated successfully');
            this.emitEvent('auth', { success: true });
        }
        catch (err) {
            this.emitProgress('error', 0, `Authentication failed: ${err.message}`);
            this.emitEvent('error', { stage: 'auth', error: err.message });
            throw new Error(`SlyOS auth failed: ${err.response?.data?.error || err.message}`);
        }
        // Step 4: Measure API latency
        const latency = await measureApiLatency(this.apiUrl);
        if (latency > 0)
            this.deviceProfile.latencyToApiMs = latency;
        // Step 5: Register device with full intelligence profile
        this.emitProgress('initializing', 70, 'Registering device...');
        try {
            // Determine supported quantizations based on memory
            const mem = this.deviceProfile.memoryMB;
            const supportedQuants = ['q4'];
            if (mem >= 4096)
                supportedQuants.push('q8');
            if (mem >= 8192)
                supportedQuants.push('fp16');
            if (mem >= 16384)
                supportedQuants.push('fp32');
            // Determine recommended tier
            let recommendedTier = 1;
            if (mem >= 8192 && this.deviceProfile.cpuCores >= 4)
                recommendedTier = 2;
            if (mem >= 16384 && this.deviceProfile.cpuCores >= 8)
                recommendedTier = 3;
            await axios.post(`${this.apiUrl}/api/devices/register`, {
                device_id: this.deviceId,
                device_fingerprint: this.deviceProfile.deviceFingerprint,
                platform: this.deviceProfile.platform,
                os_version: this.deviceProfile.os,
                total_memory_mb: this.deviceProfile.memoryMB,
                cpu_cores: this.deviceProfile.cpuCores,
                // Enhanced fields
                gpu_renderer: this.deviceProfile.gpuRenderer || null,
                gpu_vram_mb: this.deviceProfile.gpuVramMb || null,
                screen_width: this.deviceProfile.screenWidth || null,
                screen_height: this.deviceProfile.screenHeight || null,
                pixel_ratio: this.deviceProfile.pixelRatio || null,
                browser_name: this.deviceProfile.browserName || null,
                browser_version: this.deviceProfile.browserVersion || null,
                sdk_version: SDK_VERSION,
                network_type: this.deviceProfile.networkType || null,
                latency_to_api_ms: this.deviceProfile.latencyToApiMs || null,
                timezone: this.deviceProfile.timezone || null,
                // Capabilities
                wasm_available: this.deviceProfile.wasmAvailable || false,
                webgpu_available: this.deviceProfile.webgpuAvailable || false,
                supported_quants: supportedQuants,
                recommended_tier: recommendedTier,
            }, {
                headers: { Authorization: `Bearer ${this.token}` },
            });
            this.emitProgress('initializing', 90, 'Device registered');
            this.emitEvent('device_registered', { deviceId: this.deviceId, fingerprint: this.deviceProfile.deviceFingerprint });
        }
        catch (err) {
            // Non-fatal — device registration shouldn't block usage
            this.emitProgress('initializing', 90, 'Device registration skipped (non-fatal)');
        }
        // Step 6: Start telemetry flush timer
        this.telemetryFlushTimer = setTimeout(() => this.flushTelemetry(), SlyOS.TELEMETRY_FLUSH_INTERVAL);
        this.emitProgress('ready', 100, `SlyOS v${SDK_VERSION} ready — ${this.deviceProfile.recommendedQuant.toUpperCase()}, ${this.deviceProfile.gpuRenderer ? 'GPU detected' : 'CPU only'}`);
        return this.deviceProfile;
    }
    // ── Model Loading ───────────────────────────────────────────────
    getAvailableModels() {
        const grouped = { llm: [], stt: [] };
        for (const [id, info] of Object.entries(modelMap)) {
            if (!grouped[info.category])
                grouped[info.category] = [];
            grouped[info.category].push({
                id,
                sizesMB: info.sizesMB,
                minRAM_MB: info.minRAM_MB,
            });
        }
        return Object.fromEntries(Object.entries(grouped).map(([cat, models]) => [cat, { models }]));
    }
    async searchModels(query, options) {
        try {
            const limit = options?.limit || 20;
            const filters = ['onnx']; // Filter for ONNX models only
            if (options?.task) {
                filters.push(options.task);
            }
            const filterString = filters.map(f => `"${f}"`).join(',');
            const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&filter=${encodeURIComponent(`[${filterString}]`)}&sort=downloads&direction=-1&limit=${limit}`;
            const response = await axios.get(url, { timeout: 10000 });
            const models = Array.isArray(response.data) ? response.data : [];
            return models.map((model) => ({
                id: model.id,
                name: model.id.split('/')[1] || model.id,
                downloads: model.downloads || 0,
                likes: model.likes || 0,
                task: model.task || 'unknown',
                size_category: model.size_category || 'unknown',
            }));
        }
        catch (error) {
            this.emitEvent('error', { stage: 'model_search', error: error.message });
            throw new Error(`Model search failed: ${error.message}`);
        }
    }
    canRunModel(modelId, quant) {
        const info = modelMap[modelId];
        if (!info)
            return { canRun: false, reason: `Unknown model "${modelId}"`, recommendedQuant: 'q4' };
        if (!this.deviceProfile)
            return { canRun: true, reason: 'Device not profiled yet — call initialize() first', recommendedQuant: 'q4' };
        const mem = this.deviceProfile.memoryMB;
        const bestQuant = selectQuantization(mem, modelId);
        if (quant && mem < info.minRAM_MB[quant]) {
            return {
                canRun: false,
                reason: `Not enough RAM for ${quant.toUpperCase()} (need ${info.minRAM_MB[quant]}MB, have ${mem}MB). Try ${bestQuant.toUpperCase()} instead.`,
                recommendedQuant: bestQuant,
            };
        }
        if (mem < info.minRAM_MB.q4) {
            return {
                canRun: false,
                reason: `Model requires at least ${info.minRAM_MB.q4}MB RAM even at Q4. Device has ${mem}MB.`,
                recommendedQuant: 'q4',
            };
        }
        return { canRun: true, reason: `OK at ${bestQuant.toUpperCase()} precision`, recommendedQuant: bestQuant };
    }
    async loadModel(modelId, options) {
        const info = modelMap[modelId];
        let hfModelId;
        let task;
        let estimatedSize;
        // Handle curated models
        if (info) {
            hfModelId = info.hfModel;
            task = info.task;
            // Determine quantization
            let quant = options?.quant || 'fp32';
            if (!options?.quant && this.deviceProfile) {
                quant = selectQuantization(this.deviceProfile.memoryMB, modelId);
                this.emitProgress('downloading', 0, `Auto-selected ${quant.toUpperCase()} quantization for your device`);
            }
            // Check feasibility
            const check = this.canRunModel(modelId, quant);
            if (!check.canRun) {
                this.emitProgress('error', 0, check.reason);
                throw new Error(check.reason);
            }
            estimatedSize = info.sizesMB[quant];
            this.emitProgress('downloading', 0, `Downloading ${modelId} (${quant.toUpperCase()}, ~${estimatedSize}MB)...`);
            this.emitEvent('model_download_start', { modelId, quant, estimatedSizeMB: estimatedSize });
        }
        else {
            // Handle custom HuggingFace models
            hfModelId = modelId;
            task = 'text-generation'; // Default task
            estimatedSize = 2048; // Default estimate
            this.emitProgress('downloading', 0, `Loading custom HuggingFace model: ${modelId}...`);
            this.emitEvent('model_download_start', { modelId, custom: true, estimatedSizeMB: estimatedSize });
        }
        // Map quant to dtype for HuggingFace
        const dtypeMap = {
            q4: 'q4',
            q8: 'q8',
            fp16: 'fp16',
            fp32: 'fp32',
        };
        let lastReportedPercent = 0;
        const startTime = Date.now();
        try {
            // For custom HF models, detect context window
            let detectedContextWindow = 2048;
            if (!info) {
                detectedContextWindow = await detectContextWindowFromHF(hfModelId);
            }
            const pipe = await pipeline(task, hfModelId, {
                device: 'cpu',
                dtype: 'q4', // Default to q4 for stability
                progress_callback: (progressData) => {
                    // HuggingFace transformers sends progress events during download
                    if (progressData && typeof progressData === 'object') {
                        let percent = 0;
                        let msg = 'Downloading...';
                        if (progressData.status === 'progress' && progressData.progress !== undefined) {
                            percent = Math.round(progressData.progress);
                            const loaded = progressData.loaded ? `${Math.round(progressData.loaded / 1024 / 1024)}MB` : '';
                            const total = progressData.total ? `${Math.round(progressData.total / 1024 / 1024)}MB` : '';
                            msg = loaded && total ? `Downloading: ${loaded} / ${total}` : `Downloading: ${percent}%`;
                        }
                        else if (progressData.status === 'done') {
                            percent = 100;
                            msg = progressData.file ? `Downloaded ${progressData.file}` : 'Download complete';
                        }
                        else if (progressData.status === 'initiate') {
                            msg = progressData.file ? `Starting download: ${progressData.file}` : 'Initiating download...';
                        }
                        // Only emit if progress meaningfully changed (avoid flooding)
                        if (percent !== lastReportedPercent || progressData.status === 'done' || progressData.status === 'initiate') {
                            lastReportedPercent = percent;
                            this.emitProgress('downloading', percent, msg, progressData);
                            this.emitEvent('model_download_progress', { modelId, percent, ...progressData });
                        }
                    }
                },
            });
            const loadTime = Date.now() - startTime;
            let contextWindow;
            if (info) {
                // For curated models, use recommendContextWindow
                const quant = options?.quant || (this.deviceProfile ? selectQuantization(this.deviceProfile.memoryMB, modelId) : 'q4');
                contextWindow = this.deviceProfile
                    ? recommendContextWindow(this.deviceProfile.memoryMB, quant)
                    : 2048;
            }
            else {
                // For custom HF models, use detected context window
                contextWindow = detectedContextWindow;
            }
            this.modelContextWindow = contextWindow;
            this.models.set(modelId, { pipe, info, quant: 'q4', contextWindow });
            this.emitProgress('ready', 100, `${modelId} loaded (q4, ${(loadTime / 1000).toFixed(1)}s, ctx: ${contextWindow})`);
            this.emitEvent('model_loaded', { modelId, quant: 'q4', loadTimeMs: loadTime, contextWindow });
            // Telemetry
            if (this.token) {
                await axios.post(`${this.apiUrl}/api/telemetry`, {
                    device_id: this.deviceId,
                    event_type: 'model_load',
                    model_id: modelId,
                    success: true,
                    metadata: { quant: 'q4', loadTimeMs: loadTime, contextWindow, custom: !info },
                }, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }).catch(() => { });
            }
        }
        catch (error) {
            this.emitProgress('error', 0, `Failed to load ${modelId}: ${error.message}`);
            this.emitEvent('error', { stage: 'model_load', modelId, error: error.message });
            if (this.token) {
                await axios.post(`${this.apiUrl}/api/telemetry`, {
                    device_id: this.deviceId,
                    event_type: 'model_load',
                    model_id: modelId,
                    success: false,
                    error_message: error.message,
                }, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }).catch(() => { });
            }
            throw error;
        }
    }
    // ── Inference: Generate ─────────────────────────────────────────
    async generate(modelId, prompt, options = {}) {
        if (!this.models.has(modelId)) {
            await this.loadModel(modelId);
        }
        const { pipe, info, contextWindow } = this.models.get(modelId);
        if (info.category !== 'llm') {
            throw new Error(`Model "${modelId}" is not an LLM. Use transcribe() for STT models.`);
        }
        const maxTokens = Math.min(options.maxTokens || 100, contextWindow || 2048);
        this.emitProgress('generating', 0, `Generating response (max ${maxTokens} tokens)...`);
        this.emitEvent('inference_start', { modelId, maxTokens });
        const startTime = Date.now();
        try {
            const result = await pipe(prompt, {
                max_new_tokens: maxTokens,
                temperature: options.temperature || 0.7,
                top_p: options.topP || 0.9,
                do_sample: true,
            });
            const rawOutput = result[0].generated_text;
            // HuggingFace transformers returns the prompt + generated text concatenated.
            // Strip the original prompt so we only return the NEW tokens.
            const response = rawOutput.startsWith(prompt)
                ? rawOutput.slice(prompt.length).trim()
                : rawOutput.trim();
            const latency = Date.now() - startTime;
            const tokensGenerated = response.split(/\s+/).length;
            const tokensPerSec = (tokensGenerated / (latency / 1000)).toFixed(1);
            this.emitProgress('ready', 100, `Generated ${tokensGenerated} tokens in ${(latency / 1000).toFixed(1)}s (${tokensPerSec} tok/s)`);
            this.emitEvent('inference_complete', { modelId, latencyMs: latency, tokensGenerated, tokensPerSec: parseFloat(tokensPerSec) });
            // Batch telemetry (new device intelligence)
            this.recordTelemetry({
                latency_ms: latency,
                tokens_generated: tokensGenerated,
                success: true,
                model_id: modelId,
                timestamp: Date.now(),
            });
            // Legacy telemetry (backwards compatible)
            if (this.token) {
                await axios.post(`${this.apiUrl}/api/telemetry`, {
                    device_id: this.deviceId,
                    event_type: 'inference',
                    model_id: modelId,
                    latency_ms: latency,
                    tokens_generated: tokensGenerated,
                    success: true,
                }, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }).catch(() => { });
            }
            return response;
        }
        catch (error) {
            this.emitProgress('error', 0, `Generation failed: ${error.message}`);
            this.emitEvent('error', { stage: 'inference', modelId, error: error.message });
            // Batch telemetry (failure)
            this.recordTelemetry({
                latency_ms: 0,
                tokens_generated: 0,
                success: false,
                model_id: modelId,
                timestamp: Date.now(),
            });
            if (this.token) {
                await axios.post(`${this.apiUrl}/api/telemetry`, {
                    device_id: this.deviceId,
                    event_type: 'inference',
                    model_id: modelId,
                    success: false,
                    error_message: error.message,
                }, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }).catch(() => { });
            }
            throw error;
        }
    }
    // ── Inference: Transcribe ───────────────────────────────────────
    async transcribe(modelId, audioInput, options = {}) {
        if (!this.models.has(modelId)) {
            await this.loadModel(modelId);
        }
        const { pipe, info } = this.models.get(modelId);
        if (info.category !== 'stt') {
            throw new Error(`Model "${modelId}" is not an STT model. Use generate() for LLMs.`);
        }
        this.emitProgress('transcribing', 0, 'Transcribing audio...');
        this.emitEvent('inference_start', { modelId, type: 'transcription' });
        const startTime = Date.now();
        try {
            const result = await pipe(audioInput, {
                language: options.language || 'en',
                return_timestamps: options.returnTimestamps || false,
            });
            const text = result.text;
            const latency = Date.now() - startTime;
            this.emitProgress('ready', 100, `Transcribed in ${(latency / 1000).toFixed(1)}s`);
            this.emitEvent('inference_complete', { modelId, latencyMs: latency, type: 'transcription' });
            if (this.token) {
                await axios.post(`${this.apiUrl}/api/telemetry`, {
                    device_id: this.deviceId,
                    event_type: 'inference',
                    model_id: modelId,
                    latency_ms: latency,
                    success: true,
                }, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }).catch(() => { });
            }
            return text;
        }
        catch (error) {
            this.emitProgress('error', 0, `Transcription failed: ${error.message}`);
            this.emitEvent('error', { stage: 'transcription', modelId, error: error.message });
            if (this.token) {
                await axios.post(`${this.apiUrl}/api/telemetry`, {
                    device_id: this.deviceId,
                    event_type: 'inference',
                    model_id: modelId,
                    success: false,
                    error_message: error.message,
                }, {
                    headers: { Authorization: `Bearer ${this.token}` },
                }).catch(() => { });
            }
            throw error;
        }
    }
    // ── OpenAI Compatibility ────────────────────────────────────────────
    async chatCompletion(modelId, request) {
        try {
            // Convert OpenAI message format to a prompt string
            const prompt = request.messages
                .map(msg => {
                if (msg.role === 'system') {
                    return `System: ${msg.content}`;
                }
                else if (msg.role === 'user') {
                    return `User: ${msg.content}`;
                }
                else {
                    return `Assistant: ${msg.content}`;
                }
            })
                .join('\n\n');
            const response = await this.generate(modelId, prompt, {
                temperature: request.temperature,
                maxTokens: request.max_tokens,
                topP: request.top_p,
            });
            // Estimate token counts (rough approximation: ~4 chars per token)
            const promptTokens = Math.ceil(prompt.length / 4);
            const completionTokens = Math.ceil(response.length / 4);
            return {
                id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: modelId,
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: response,
                        },
                        finish_reason: 'stop',
                    },
                ],
                usage: {
                    prompt_tokens: promptTokens,
                    completion_tokens: completionTokens,
                    total_tokens: promptTokens + completionTokens,
                },
            };
        }
        catch (error) {
            // Fallback to cloud provider if configured
            if (this.fallbackConfig?.provider === 'openai') {
                return this.fallbackToOpenAI(modelId, request);
            }
            else if (this.fallbackConfig?.provider === 'bedrock') {
                return this.fallbackToBedrock(modelId, request);
            }
            throw error;
        }
    }
    // ── AWS Bedrock Compatibility ──────────────────────────────────────
    async bedrockInvoke(modelId, request) {
        try {
            const response = await this.generate(modelId, request.inputText, {
                temperature: request.textGenerationConfig?.temperature,
                maxTokens: request.textGenerationConfig?.maxTokenCount,
                topP: request.textGenerationConfig?.topP,
            });
            // Estimate token counts
            const inputTokens = Math.ceil(request.inputText.length / 4);
            const outputTokens = Math.ceil(response.length / 4);
            return {
                results: [
                    {
                        outputText: response,
                        tokenCount: outputTokens,
                    },
                ],
                input_text_token_count: inputTokens,
            };
        }
        catch (error) {
            // Fallback to cloud provider if configured
            if (this.fallbackConfig?.provider === 'bedrock') {
                return this.fallbackToBedrockCloud(modelId, request);
            }
            else if (this.fallbackConfig?.provider === 'openai') {
                return this.fallbackToOpenAICloud(modelId, request);
            }
            throw error;
        }
    }
    // ── Fallback: OpenAI Cloud ────────────────────────────────────────
    async fallbackToOpenAI(modelId, request) {
        if (!this.fallbackConfig) {
            throw new Error('OpenAI fallback not configured');
        }
        const mappedModel = this.mapModelToOpenAI(modelId);
        const payload = {
            model: this.fallbackConfig.model || mappedModel,
            messages: request.messages,
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            top_p: request.top_p,
            frequency_penalty: request.frequency_penalty,
            presence_penalty: request.presence_penalty,
            stop: request.stop,
        };
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
                headers: {
                    Authorization: `Bearer ${this.fallbackConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            this.emitEvent('fallback_success', { provider: 'openai', originalModel: modelId, mappedModel: this.fallbackConfig.model });
            return response.data;
        }
        catch (error) {
            this.emitProgress('error', 0, `OpenAI fallback failed: ${error.message}`);
            this.emitEvent('fallback_error', { provider: 'openai', error: error.message });
            throw error;
        }
    }
    async fallbackToBedrock(modelId, request) {
        if (!this.fallbackConfig) {
            throw new Error('Bedrock fallback not configured');
        }
        // Convert OpenAI format to Bedrock's expected format (simplified)
        const lastMessage = request.messages[request.messages.length - 1];
        const inputText = lastMessage.content;
        const bedrockResponse = await this.invokeBedrockCloud(inputText, {
            temperature: request.temperature,
            maxTokenCount: request.max_tokens,
            topP: request.top_p,
        });
        // Convert Bedrock response back to OpenAI format
        const promptTokens = Math.ceil(inputText.length / 4);
        const completionTokens = bedrockResponse.results[0].tokenCount;
        this.emitEvent('fallback_success', { provider: 'bedrock', originalModel: modelId, mappedModel: this.fallbackConfig.model });
        return {
            id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: modelId,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: bedrockResponse.results[0].outputText,
                    },
                    finish_reason: 'stop',
                },
            ],
            usage: {
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: promptTokens + completionTokens,
            },
        };
    }
    async fallbackToOpenAICloud(modelId, request) {
        if (!this.fallbackConfig) {
            throw new Error('OpenAI fallback not configured');
        }
        const mappedModel = this.mapModelToOpenAI(modelId);
        const payload = {
            model: this.fallbackConfig.model || mappedModel,
            messages: [{ role: 'user', content: request.inputText }],
            temperature: request.textGenerationConfig?.temperature,
            max_tokens: request.textGenerationConfig?.maxTokenCount,
            top_p: request.textGenerationConfig?.topP,
        };
        try {
            const response = await axios.post('https://api.openai.com/v1/chat/completions', payload, {
                headers: {
                    Authorization: `Bearer ${this.fallbackConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            const outputText = response.data.choices[0].message.content;
            const inputTokens = Math.ceil(request.inputText.length / 4);
            const outputTokens = response.data.usage.completion_tokens;
            this.emitEvent('fallback_success', { provider: 'openai', originalModel: modelId, mappedModel: this.fallbackConfig.model });
            return {
                results: [
                    {
                        outputText,
                        tokenCount: outputTokens,
                    },
                ],
                input_text_token_count: inputTokens,
            };
        }
        catch (error) {
            this.emitProgress('error', 0, `OpenAI fallback failed: ${error.message}`);
            this.emitEvent('fallback_error', { provider: 'openai', error: error.message });
            throw error;
        }
    }
    async fallbackToBedrockCloud(modelId, request) {
        if (!this.fallbackConfig) {
            throw new Error('Bedrock fallback not configured');
        }
        try {
            return await this.invokeBedrockCloud(request.inputText, request.textGenerationConfig);
        }
        catch (error) {
            this.emitProgress('error', 0, `Bedrock fallback failed: ${error.message}`);
            this.emitEvent('fallback_error', { provider: 'bedrock', error: error.message });
            throw error;
        }
    }
    async invokeBedrockCloud(inputText, config) {
        if (!this.fallbackConfig) {
            throw new Error('Bedrock fallback not configured');
        }
        const region = this.fallbackConfig.region || 'us-east-1';
        const model = this.fallbackConfig.model || 'anthropic.claude-3-sonnet-20240229-v1:0';
        // Bedrock endpoint format: https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/invoke
        const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${model}/invoke`;
        const payload = {
            inputText,
            textGenerationConfig: {
                maxTokenCount: config?.maxTokenCount || 256,
                temperature: config?.temperature || 0.7,
                topP: config?.topP || 0.9,
                topK: config?.topK,
                stopSequences: config?.stopSequences,
            },
        };
        try {
            const response = await axios.post(endpoint, payload, {
                headers: {
                    Authorization: `Bearer ${this.fallbackConfig.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Amz-Target': 'AmazonBedrockRuntime.InvokeModel',
                },
            });
            this.emitEvent('fallback_success', { provider: 'bedrock', model });
            return response.data;
        }
        catch (error) {
            throw new Error(`Bedrock invocation failed: ${error.message}`);
        }
    }
    mapModelToOpenAI(slyModelId) {
        const modelMapping = {
            'quantum-1.7b': 'gpt-4o-mini',
            'quantum-3b': 'gpt-4o',
            'quantum-code-3b': 'gpt-4o',
            'quantum-8b': 'gpt-4-turbo',
        };
        return modelMapping[slyModelId] || 'gpt-4o-mini';
    }
    /**
     * Tier 2: Cloud-indexed RAG with local inference.
     * Retrieves relevant chunks from server, generates response locally.
     */
    async ragQuery(options) {
        const startTime = Date.now();
        try {
            if (!this.token)
                throw new Error('Not authenticated. Call init() first.');
            // Step 1: Retrieve relevant chunks from backend
            const searchResponse = await axios.post(`${this.apiUrl}/api/rag/knowledge-bases/${options.knowledgeBaseId}/query`, {
                query: options.query,
                top_k: options.topK || 5,
                model_id: options.modelId
            }, { headers: { Authorization: `Bearer ${this.token}` } });
            let { retrieved_chunks, prompt_template, context } = searchResponse.data;
            // Apply context window limits
            const contextWindow = this.modelContextWindow || 2048;
            const maxContextChars = (contextWindow - 200) * 3; // Rough token-to-char ratio, reserving 200 tokens
            if (context && context.length > maxContextChars) {
                context = context.substring(0, maxContextChars) + '...';
            }
            // Step 2: Generate response locally using the augmented prompt
            const response = await this.generate(options.modelId, prompt_template, {
                temperature: options.temperature,
                maxTokens: options.maxTokens,
            });
            return {
                query: options.query,
                retrievedChunks: retrieved_chunks.map((c) => ({
                    id: c.id,
                    documentId: c.document_id,
                    documentName: c.document_name,
                    content: c.content,
                    similarityScore: c.similarity_score,
                    metadata: c.metadata
                })),
                generatedResponse: response,
                context,
                latencyMs: Date.now() - startTime,
                tierUsed: 2,
            };
        }
        catch (error) {
            this.emitEvent('error', { stage: 'rag_query', error: error.message });
            throw new Error(`RAG query failed: ${error.message}`);
        }
    }
    /**
     * Tier 1: Fully local RAG. Zero network calls.
     * Documents are chunked/embedded on-device, retrieval and generation all local.
     */
    async ragQueryLocal(options) {
        const startTime = Date.now();
        try {
            // Step 1: Load embedding model if needed
            if (!this.localEmbeddingModel) {
                await this.loadEmbeddingModel();
            }
            // Adapt chunk size based on context window for efficiency
            const contextWindow = this.modelContextWindow || 2048;
            const chunkSize = contextWindow <= 1024 ? 256 : contextWindow <= 2048 ? 512 : 1024;
            const overlap = Math.floor(chunkSize / 4);
            // Step 2: Chunk documents if not already chunked
            const allChunks = [];
            for (const doc of options.documents) {
                const chunks = this.chunkTextLocal(doc.content, chunkSize, overlap);
                for (const chunk of chunks) {
                    const embedding = await this.embedTextLocal(chunk);
                    allChunks.push({ content: chunk, documentName: doc.name || 'Document', embedding });
                }
            }
            // Step 3: Embed query
            const queryEmbedding = await this.embedTextLocal(options.query);
            // Step 4: Cosine similarity search
            const scored = allChunks
                .filter(c => c.embedding)
                .map(c => ({
                ...c,
                similarityScore: this.cosineSimilarity(queryEmbedding, c.embedding)
            }))
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, options.topK || 5);
            // Step 5: Build context with size limits
            const maxContextChars = (contextWindow - 200) * 3; // Rough token-to-char ratio, reserving 200 tokens
            let contextLength = 0;
            const contextParts = [];
            for (const c of scored) {
                const part = `[Source: ${c.documentName}]\n${c.content}`;
                if (contextLength + part.length <= maxContextChars) {
                    contextParts.push(part);
                    contextLength += part.length + 10; // Account for separator
                }
                else {
                    break;
                }
            }
            const context = contextParts.join('\n\n---\n\n');
            const prompt = `You are a helpful assistant. Answer based ONLY on the following context:\n\n${context}\n\nQuestion: ${options.query}\n\nAnswer:`;
            // Step 6: Generate locally
            const response = await this.generate(options.modelId, prompt, {
                temperature: options.temperature,
                maxTokens: options.maxTokens,
            });
            return {
                query: options.query,
                retrievedChunks: scored.map((c, i) => ({
                    id: `local-${i}`,
                    documentId: 'local',
                    documentName: c.documentName,
                    content: c.content,
                    similarityScore: c.similarityScore,
                    metadata: {}
                })),
                generatedResponse: response,
                context,
                latencyMs: Date.now() - startTime,
                tierUsed: 1,
            };
        }
        catch (error) {
            this.emitEvent('error', { stage: 'rag_local', error: error.message });
            throw new Error(`Local RAG failed: ${error.message}`);
        }
    }
    /**
     * Tier 3: Offline RAG using a synced knowledge base.
     * First call syncKnowledgeBase(), then use this for offline queries.
     */
    async ragQueryOffline(options) {
        const startTime = Date.now();
        const index = this.offlineIndexes.get(options.knowledgeBaseId);
        if (!index) {
            throw new Error(`Knowledge base "${options.knowledgeBaseId}" not synced. Call syncKnowledgeBase() first.`);
        }
        // Check expiry
        if (new Date(index.metadata.expires_at) < new Date()) {
            throw new Error('Offline index has expired. Please re-sync.');
        }
        try {
            // Load embedding model
            if (!this.localEmbeddingModel) {
                await this.loadEmbeddingModel();
            }
            // Embed query
            const queryEmbedding = await this.embedTextLocal(options.query);
            // Search offline index
            const scored = index.chunks
                .filter(c => c.embedding && c.embedding.length > 0)
                .map(c => ({
                ...c,
                similarityScore: this.cosineSimilarity(queryEmbedding, c.embedding)
            }))
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, options.topK || 5);
            // Build context with size limits
            const contextWindow = this.modelContextWindow || 2048;
            const maxContextChars = (contextWindow - 200) * 3; // Rough token-to-char ratio, reserving 200 tokens
            let contextLength = 0;
            const contextParts = [];
            for (const c of scored) {
                const part = `[Source: ${c.document_name}]\n${c.content}`;
                if (contextLength + part.length <= maxContextChars) {
                    contextParts.push(part);
                    contextLength += part.length + 10; // Account for separator
                }
                else {
                    break;
                }
            }
            const context = contextParts.join('\n\n---\n\n');
            const prompt = `You are a helpful assistant. Answer based ONLY on the following context:\n\n${context}\n\nQuestion: ${options.query}\n\nAnswer:`;
            // Generate locally
            const response = await this.generate(options.modelId, prompt, {
                temperature: options.temperature,
                maxTokens: options.maxTokens,
            });
            return {
                query: options.query,
                retrievedChunks: scored.map(c => ({
                    id: c.id,
                    documentId: c.document_id,
                    documentName: c.document_name,
                    content: c.content,
                    similarityScore: c.similarityScore,
                    metadata: c.metadata
                })),
                generatedResponse: response,
                context,
                latencyMs: Date.now() - startTime,
                tierUsed: 3,
            };
        }
        catch (error) {
            this.emitEvent('error', { stage: 'rag_offline', error: error.message });
            throw new Error(`Offline RAG failed: ${error.message}`);
        }
    }
    /**
     * Sync a knowledge base for offline use (Tier 3).
     * Downloads chunks + embeddings from server, stores locally.
     */
    async syncKnowledgeBase(knowledgeBaseId, deviceId) {
        try {
            if (!this.token)
                throw new Error('Not authenticated. Call init() first.');
            const response = await axios.post(`${this.apiUrl}/api/rag/knowledge-bases/${knowledgeBaseId}/sync`, { device_id: deviceId || this.deviceId || 'sdk-device' }, { headers: { Authorization: `Bearer ${this.token}` } });
            const { sync_package, chunk_count, package_size_mb, expires_at } = response.data;
            this.offlineIndexes.set(knowledgeBaseId, sync_package);
            return {
                chunkCount: chunk_count,
                sizeMb: package_size_mb,
                expiresAt: expires_at
            };
        }
        catch (error) {
            throw new Error(`Sync failed: ${error.message}`);
        }
    }
    // --- RAG Helper Methods ---
    async loadEmbeddingModel() {
        this.emitProgress('downloading', 0, 'Loading embedding model (all-MiniLM-L6-v2)...');
        try {
            const { pipeline } = await import('@huggingface/transformers');
            this.localEmbeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            this.emitProgress('ready', 100, 'Embedding model loaded');
        }
        catch (error) {
            this.emitProgress('error', 0, `Embedding model failed: ${error.message}`);
            throw error;
        }
    }
    async embedTextLocal(text) {
        if (!this.localEmbeddingModel)
            throw new Error('Embedding model not loaded');
        const result = await this.localEmbeddingModel(text, { pooling: 'mean', normalize: true });
        // Handle different tensor output formats (v2 vs v3 of transformers)
        if (result.data)
            return Array.from(result.data);
        if (result.tolist)
            return result.tolist().flat();
        if (Array.isArray(result))
            return result.flat();
        throw new Error('Unexpected embedding output format');
    }
    cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom === 0 ? 0 : dot / denom;
    }
    chunkTextLocal(text, chunkSize = 512, overlap = 128) {
        if (!text || text.length === 0)
            return [];
        if (overlap >= chunkSize)
            overlap = Math.floor(chunkSize * 0.25);
        const chunks = [];
        let start = 0;
        while (start < text.length) {
            let end = start + chunkSize;
            if (end < text.length) {
                const bp = Math.max(text.lastIndexOf('.', end), text.lastIndexOf('\n', end));
                if (bp > start + chunkSize / 2)
                    end = bp + 1;
            }
            const chunk = text.slice(start, end).trim();
            if (chunk.length > 20)
                chunks.push(chunk);
            start = end - overlap;
            if (start >= text.length)
                break;
        }
        return chunks;
    }
    // ── Static OpenAI Compatible Factory ────────────────────────────────
    static openaiCompatible(config) {
        const instance = new SlyOS({
            apiKey: config.apiKey,
            apiUrl: config.apiUrl,
            fallback: { ...config.fallback, provider: config.fallback?.provider || 'openai' },
        });
        return {
            chat: {
                completions: {
                    async create(request) {
                        const { model, ...chatRequest } = request;
                        return instance.chatCompletion(model, chatRequest);
                    },
                },
            },
        };
    }
}
SlyOS.TELEMETRY_BATCH_SIZE = 10;
SlyOS.TELEMETRY_FLUSH_INTERVAL = 60000; // 60 seconds
export default SlyOS;
