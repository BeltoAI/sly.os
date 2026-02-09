'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Terminal, Package, Zap, Play, Monitor, Smartphone, Globe, Mic, Cpu, BarChart3 } from 'lucide-react';

export default function IntegrationPage() {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState('sk_live_your_api_key_here');

  React.useEffect(() => {
    const u = localStorage.getItem('user');
    try {
      const user = u ? JSON.parse(u) : {};
      setApiKey(user.organization?.api_key || 'sk_live_your_api_key_here');
    } catch {}
  }, []);

  const copyCode = (code: string, step: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const llmSteps = [
    { num: 1, title: 'Install SDK', icon: Package, code: 'npm install @emilshirokikh/slyos-sdk' },
    { num: 2, title: 'Initialize with Progress Tracking', icon: Cpu, code: `import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({
  apiKey: '${apiKey}',
  onProgress: (e) => {
    const bar = '█'.repeat(Math.floor(e.progress / 5)).padEnd(20, '░');
    console.log(\`[\${bar}] \${e.progress}% — \${e.message}\`);
  }
});

// Profiles device, authenticates, registers
const device = await sdk.initialize();
console.log(\`\${device.cpuCores} cores, \${Math.round(device.memoryMB / 1024)}GB RAM\`);
console.log(\`Quantization: \${device.recommendedQuant.toUpperCase()}, Context: \${device.maxContextWindow}\`);` },
    { num: 3, title: 'Load Model (Auto-Quantized)', icon: Zap, code: `// Auto-selects best quantization for your device
await sdk.loadModel('quantum-3b');

// Or manually specify: 'q4', 'q8', 'fp16', 'fp32'
// await sdk.loadModel('quantum-3b', { quant: 'q4' });` },
    { num: 4, title: 'Generate', icon: Play, code: `const response = await sdk.generate(
  'quantum-3b',
  'What are your daily specials?',
  { temperature: 0.7, maxTokens: 100 }
);

console.log(response);` },
  ];

  const sttSteps = [
    { num: 5, title: 'Load STT Model', icon: Mic, code: `// STT: speech-to-text (auto-quantized)
await sdk.loadModel('voicecore-base');` },
    { num: 6, title: 'Transcribe Audio', icon: Play, code: `const text = await sdk.transcribe(
  'voicecore-base',
  './audio.wav',
  { language: 'en' }
);

console.log(text);` },
  ];

  const renderSteps = (steps: typeof llmSteps) => (
    <div className="space-y-4">
      {steps.map(({ num, title, icon: Icon, code }) => (
        <div key={num} className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-7 h-7 rounded-lg bg-[#FF4D00] text-white text-xs flex items-center justify-center font-bold">{num}</span>
              <Icon className="w-4.5 h-4.5 text-[#888888]" />
              <h4 className="text-sm font-semibold text-[#EDEDED]">{title}</h4>
            </div>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-3 whitespace-pre-wrap leading-relaxed">
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
  );

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED]">Integration Guide</h1>
        <p className="text-sm text-[#888888] mt-2">Get SlyOS running in your app in under 5 minutes</p>
      </div>

      {/* v1.2 Features Banner */}
      <div className="mb-6 backdrop-blur-xl bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.2)] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-[#4ade80]" />
          <span className="text-xs font-semibold text-[#4ade80]">v1.2 — Progress bars, device profiling, auto-quantization, smart context window</span>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-[#EDEDED] mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#FF4D00]" /> LLM — Text Generation
      </h2>
      {renderSteps(llmSteps)}

      <h2 className="text-lg font-semibold text-[#EDEDED] mt-10 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#FF4D00]" /> STT — Speech-to-Text
      </h2>
      {renderSteps(sttSteps)}

      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden mt-10">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Globe className="w-5 h-5 text-[#FF4D00]" />
            <h3 className="text-base font-semibold text-[#EDEDED]">Platform Requirements</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'iOS', icon: Monitor, reqs: ['iOS 16+', '1GB+ RAM'] },
              { label: 'Android', icon: Smartphone, reqs: ['Android 12+', '1GB+ RAM'] },
              { label: 'Web', icon: Globe, reqs: ['Modern browsers', 'WebGPU / WASM'] },
            ].map(({ label, icon: PIcon, reqs }) => (
              <div key={label} className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-2.5 mb-3">
                  <PIcon className="w-4 h-4 text-[#888888]" />
                  <span className="text-sm font-semibold text-[#EDEDED]">{label}</span>
                </div>
                {reqs.map(r => <div key={r} className="text-xs text-[#666666]">{r}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
