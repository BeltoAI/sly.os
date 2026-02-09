'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Thermometer, Hash, Target, MessageCircle, ArrowLeft, ArrowRight, Code } from 'lucide-react';

export default function ConfigurePage() {
  const router = useRouter();
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [config, setConfig] = useState({
    temperature: 0.7, maxTokens: 100, topP: 0.9, contextWindow: 2048,
    systemPrompt: "You are a helpful AI assistant. Be concise and accurate."
  });

  useEffect(() => {
    const savedModelId = localStorage.getItem('primaryModel');
    const savedModelName = localStorage.getItem('primaryModelName');
    if (!savedModelId) { router.push('/dashboard/models'); return; }
    setModelId(savedModelId);
    setModelName(savedModelName || savedModelId);
    const savedConfig = localStorage.getItem(`config-${savedModelId}`);
    if (savedConfig) {
      try {
        setConfig({ ...config, ...JSON.parse(savedConfig) });
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
  }, [router]);

  const saveAndContinue = () => {
    localStorage.setItem(`config-${modelId}`, JSON.stringify(config));
    router.push('/dashboard/get-started');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED]">Configure {modelName}</h1>
        <p className="text-sm text-[#888888] mt-2">Customize model behavior and parameters</p>
      </div>

      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.2)] rounded-2xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-[#FF4D00]" />
            <h3 className="text-base font-semibold text-[#EDEDED]">System Prompt</h3>
            <span className="text-[10px] bg-[#FF4D00]/20 text-[#FF4D00] px-2.5 py-1 rounded-lg font-semibold">Important</span>
          </div>
          <textarea
            rows={5}
            value={config.systemPrompt}
            onChange={(e) => setConfig({...config, systemPrompt: e.target.value})}
            className="w-full p-4 rounded-xl bg-[#050505] border border-[rgba(255,255,255,0.08)] text-sm text-[#EDEDED] font-mono placeholder:text-[#555555] resize-none focus:outline-none focus:border-[rgba(255,77,0,0.3)] focus:ring-2 focus:ring-[rgba(255,77,0,0.1)] transition-all"
            placeholder="Define the AI's role, tasks, tone, and limitations..."
          />
          <p className="text-xs text-[#666666] mt-3">Define the AI's role, tasks, tone, and limitations for your use case.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Temperature', icon: Thermometer, key: 'temperature', step: 0.1, min: 0, max: 2, desc: '0.0 = deterministic, 2.0 = creative' },
          { label: 'Max Tokens', icon: Hash, key: 'maxTokens', step: 10, min: 10, max: 2000, desc: 'Maximum response length' },
          { label: 'Top P', icon: Target, key: 'topP', step: 0.1, min: 0, max: 1, desc: 'Nucleus sampling threshold' },
          { label: 'Context Window', icon: MessageCircle, key: 'contextWindow', step: 512, min: 512, max: 8192, desc: 'Conversation memory size' },
        ].map(({ label, icon: Icon, key, step, min, max, desc }) => (
          <div key={key} className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <Icon className="w-4.5 h-4.5 text-[#FF4D00]" />
              <h4 className="text-sm font-semibold text-[#EDEDED]">{label}</h4>
            </div>
            <Input
              type="number"
              step={step}
              min={min}
              max={max}
              value={(config as any)[key]}
              onChange={(e) => setConfig({...config, [key]: parseFloat(e.target.value) || 0})}
              className="bg-[#050505] border-[rgba(255,255,255,0.08)] text-[#EDEDED] placeholder:text-[#555555] focus:border-[rgba(255,77,0,0.3)] focus:ring-2 focus:ring-[rgba(255,77,0,0.1)]"
            />
            <p className="text-[11px] text-[#666666] mt-3">{desc}</p>
          </div>
        ))}
      </div>

      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.2)] rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <Code className="w-5 h-5 text-[#FF4D00]" />
          <h3 className="text-base font-semibold text-[#EDEDED]">Configuration Preview</h3>
        </div>
        <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#4ade80] overflow-x-auto">
{`{
  "systemPrompt": "${(config.systemPrompt).substring(0, 60)}...",
  "temperature": ${config.temperature},
  "maxTokens": ${config.maxTokens},
  "topP": ${config.topP},
  "contextWindow": ${config.contextWindow}
}`}
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/models')}
          className="flex-1 h-10 bg-transparent border-[rgba(255,255,255,0.1)] text-[#EDEDED] hover:bg-[rgba(255,255,255,0.05)] gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button
          onClick={saveAndContinue}
          className="flex-1 h-10 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0 gap-2"
        >
          Save & Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
