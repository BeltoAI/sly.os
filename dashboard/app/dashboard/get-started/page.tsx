'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowLeft, ArrowRight, Rocket, Mic, Package, Terminal, Zap, Play, Cpu, HardDrive, Activity, BarChart3 } from 'lucide-react';

export default function GetStartedPage() {
  const router = useRouter();
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [config, setConfig] = useState<any>({});
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [user, setUser] = useState<any>({});

  const apiKey = user.organization?.api_key || 'sk_live_your_api_key_here';

  useEffect(() => {
    const savedModelId = localStorage.getItem('primaryModel');
    const savedModelName = localStorage.getItem('primaryModelName');
    if (!savedModelId) { router.push('/dashboard/models'); return; }
    setModelId(savedModelId);
    setModelName(savedModelName || savedModelId);
    const savedConfig = localStorage.getItem(`config-${savedModelId}`);
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    const u = localStorage.getItem('user');
    if (u) try { setUser(JSON.parse(u)); } catch {}
  }, [router]);

  const copyCode = (code: string, step: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const isSTT = modelId.startsWith('voicecore');

  const installCode = `npm install @emilshirokikh/slyos-sdk`;

  const initCode = `import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({
  apiKey: '${apiKey}',
  onProgress: (event) => {
    // Real-time progress: stage, progress %, message
    const bar = '█'.repeat(Math.floor(event.progress / 5)).padEnd(20, '░');
    console.log(\`[\${bar}] \${event.progress}% — \${event.message}\`);
  },
  onEvent: (event) => {
    // Lifecycle events: auth, device_profiled, model_loaded, etc.
    console.log(\`[EVENT] \${event.type}\`, event.data);
  }
});

// Initialize — profiles device, authenticates, registers
const device = await sdk.initialize();
console.log(\`Device: \${device.cpuCores} cores, \${Math.round(device.memoryMB / 1024)}GB RAM\`);
console.log(\`Recommended: \${device.recommendedQuant.toUpperCase()} quantization, \${device.maxContextWindow} ctx\`);`;

  const loadCode = `// Auto-selects best quantization for your device
await sdk.loadModel('${modelId}');

// Or manually specify quantization level
// await sdk.loadModel('${modelId}', { quant: 'q4' });`;

  const useCode = isSTT
    ? `const text = await sdk.transcribe('${modelId}', './audio.wav', {
  language: 'en'
});
console.log(text);`
    : `const response = await sdk.generate('${modelId}', 'Hello!', {
  temperature: ${config.temperature || 0.7},
  maxTokens: ${config.maxTokens || 100},
  topP: ${config.topP || 0.9}
});
console.log(response);`;

  const fullCode = isSTT
    ? `import SlyOS from '@emilshirokikh/slyos-sdk';

async function main() {
  const sdk = new SlyOS({
    apiKey: '${apiKey}',
    onProgress: (e) => {
      const bar = '█'.repeat(Math.floor(e.progress / 5)).padEnd(20, '░');
      console.log(\`[\${bar}] \${e.progress}% — \${e.message}\`);
    }
  });

  // 1. Initialize — detects device, authenticates, registers
  const device = await sdk.initialize();
  console.log(\`\\nDevice: \${device.cpuCores} cores, \${Math.round(device.memoryMB / 1024)}GB RAM\`);
  console.log(\`Quant: \${device.recommendedQuant.toUpperCase()}, Context: \${device.maxContextWindow}\\n\`);

  // 2. Check if model can run on this device
  const check = sdk.canRunModel('${modelId}');
  if (!check.canRun) { console.error(check.reason); return; }

  // 3. Load model — auto-selects best quantization
  await sdk.loadModel('${modelId}');

  // 4. Transcribe
  const text = await sdk.transcribe('${modelId}', './audio.wav', {
    language: 'en'
  });

  console.log('\\nTranscription:', text);
}

main();`
    : `import SlyOS from '@emilshirokikh/slyos-sdk';

async function main() {
  const sdk = new SlyOS({
    apiKey: '${apiKey}',
    onProgress: (e) => {
      const bar = '█'.repeat(Math.floor(e.progress / 5)).padEnd(20, '░');
      console.log(\`[\${bar}] \${e.progress}% — \${e.message}\`);
    }
  });

  // 1. Initialize — detects device, authenticates, registers
  const device = await sdk.initialize();
  console.log(\`\\nDevice: \${device.cpuCores} cores, \${Math.round(device.memoryMB / 1024)}GB RAM\`);
  console.log(\`Quant: \${device.recommendedQuant.toUpperCase()}, Context: \${device.maxContextWindow}\\n\`);

  // 2. Check if model can run on this device
  const check = sdk.canRunModel('${modelId}');
  if (!check.canRun) { console.error(check.reason); return; }

  // 3. Load model — auto-selects best quantization
  await sdk.loadModel('${modelId}');

  // 4. Generate
  const response = await sdk.generate('${modelId}', 'Hello!', {
    temperature: ${config.temperature || 0.7},
    maxTokens: ${config.maxTokens || 100},
    topP: ${config.topP || 0.9}
  });

  console.log('\\nResponse:', response);
}

main();`;

  const steps = [
    { num: 1, title: 'Install the SDK', icon: Package, code: installCode, desc: 'Add SlyOS to your project' },
    { num: 2, title: 'Initialize with Device Profiling', icon: Cpu, code: initCode, desc: 'Auto-detects RAM, CPU, storage → selects optimal quantization' },
    { num: 3, title: 'Load Model (Auto-Quantized)', icon: Zap, code: loadCode, desc: `Downloads ${modelName} at the best precision for your device` },
    { num: 4, title: isSTT ? 'Transcribe' : 'Generate', icon: Play, code: useCode, desc: isSTT ? 'Transcribe audio to text with progress tracking' : 'Generate your first response with progress tracking' },
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED]">Get Started with {modelName}</h1>
        <p className="text-sm text-[#888888] mt-2">
          {isSTT ? 'From install to transcription in 4 steps' : 'From install to first response in 4 steps'}
        </p>
      </div>

      {/* What's New Banner */}
      <div className="mb-6 backdrop-blur-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.2)] rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <Activity className="w-4.5 h-4.5 text-[#4ade80]" />
          <h3 className="text-sm font-semibold text-[#4ade80]">v1.2 — Smart Device Optimization</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BarChart3, label: 'Progress Bars', desc: 'Real-time download & inference tracking' },
            { icon: Cpu, label: 'Device Profiling', desc: 'Auto-detects RAM, CPU, storage' },
            { icon: HardDrive, label: 'Auto Quantization', desc: 'Picks Q4/Q8/FP16 for your device' },
            { icon: Terminal, label: 'Smart Context', desc: 'Context window sized to your RAM' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              <Icon className="w-4 h-4 text-[#4ade80] mb-1.5" />
              <div className="text-[11px] font-semibold text-[#EDEDED]">{label}</div>
              <div className="text-[10px] text-[#666666] mt-0.5">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-step */}
      <div className="space-y-4 mb-8">
        {steps.map(({ num, title, icon: Icon, code, desc }) => (
          <div key={num} className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="w-7 h-7 rounded-lg bg-[#FF4D00] text-white text-xs flex items-center justify-center font-bold">{num}</span>
                <Icon className="w-4 h-4 text-[#888888]" />
                <h4 className="text-sm font-semibold text-[#EDEDED]">{title}</h4>
              </div>
              <p className="text-xs text-[#666666] ml-10 mb-4">{desc}</p>
              <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-3 whitespace-pre leading-relaxed">
                {code}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                onClick={() => copyCode(code, num)}
              >
                {copiedStep === num ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Full example */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.2)] rounded-2xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-4">
            {isSTT ? <Mic className="w-5 h-5 text-[#FF4D00]" /> : <Rocket className="w-5 h-5 text-[#FF4D00]" />}
            <h3 className="text-base font-semibold text-[#EDEDED]">Complete Working Example</h3>
            <span className="text-[10px] bg-[#FF4D00]/20 text-[#FF4D00] px-2 py-1 rounded-lg font-semibold">Copy & Run</span>
          </div>
          <p className="text-xs text-[#888888] mb-4">Includes device profiling, auto-quantization, progress bars, and feasibility check</p>
          <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-4 whitespace-pre leading-relaxed">
            {fullCode}
          </div>
          <Button
            className="gap-2 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0"
            onClick={() => copyCode(fullCode, 99)}
          >
            {copiedStep === 99 ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Full Example</>}
          </Button>
        </div>
      </div>

      {/* Expected Output Preview */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Terminal className="w-5 h-5 text-[#888888]" />
            <h3 className="text-base font-semibold text-[#EDEDED]">Expected Terminal Output</h3>
          </div>
          <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#AAAAAA] overflow-x-auto whitespace-pre leading-relaxed">
{`[████░░░░░░░░░░░░░░░░]  20% — Detected: 10 CPU cores, 16GB RAM, 234GB storage
[████████░░░░░░░░░░░░]  40% — Authenticating with API key...
[████████████░░░░░░░░]  60% — Authenticated successfully
[██████████████░░░░░░]  70% — Registering device...
[████████████████████] 100% — SlyOS ready — recommended quantization: FP16

Device: 10 cores, 16GB RAM
Quant: FP16, Context: 8192

[░░░░░░░░░░░░░░░░░░░░]   0% — Auto-selected FP16 quantization for your device
[░░░░░░░░░░░░░░░░░░░░]   0% — Downloading ${modelId} (FP16, ~3400MB)...
[██░░░░░░░░░░░░░░░░░░]  12% — Downloading: 408MB / 3400MB
[████████░░░░░░░░░░░░]  45% — Downloading: 1530MB / 3400MB
[██████████████░░░░░░]  78% — Downloading: 2652MB / 3400MB
[████████████████████] 100% — ${modelId} loaded (FP16, 42.3s, ctx: 8192)

[████████████████████] 100% — Generated 23 tokens in 4.2s (5.5 tok/s)

Response: Hello! I'm a helpful AI assistant...`}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/configure')}
          className="flex-1 h-10 bg-transparent border-[rgba(255,255,255,0.1)] text-[#EDEDED] hover:bg-[rgba(255,255,255,0.05)] gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          onClick={() => router.push('/dashboard')}
          className="flex-1 h-10 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0 gap-2"
        >
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
