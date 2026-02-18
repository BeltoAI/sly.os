'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowLeft, Rocket, Download, Play, Zap, Terminal, Sparkles, MessageCircle } from 'lucide-react';

export default function GetStartedPage() {
  const router = useRouter();
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [user, setUser] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'easy' | 'code'>('easy');

  const apiKey = user.organization?.api_key || 'YOUR_API_KEY';

  useEffect(() => {
    const savedModelId = localStorage.getItem('primaryModel');
    const savedModelName = localStorage.getItem('primaryModelName');
    if (!savedModelId) { router.push('/dashboard/models'); return; }
    setModelId(savedModelId);
    setModelName(savedModelName || savedModelId);

    const u = localStorage.getItem('user');
    if (u) try { setUser(JSON.parse(u)); } catch {}
  }, [router]);

  const copyCode = (code: string, step: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // Option A: One-click chatbot command
  const oneLiner = `curl -sL https://raw.githubusercontent.com/BeltoAI/sly.os/main/sdk/create-chatbot.sh | bash -s -- --api-key ${apiKey} --model ${modelId}`;

  // Option B: Manual step-by-step
  const installCode = `npm install @emilshirokikh/slyos-sdk`;
  const appCode = `import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({
  apiKey: '${apiKey}',
  onProgress: (e) => console.log(\`[\${e.progress}%] \${e.message}\`)
});

await sdk.initialize();
await sdk.loadModel('${modelId}');

const response = await sdk.generate('${modelId}', 'Hello!');
console.log(response);`;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-7 h-7 text-[#FF4D00]" />
          <h1 className="text-3xl font-bold text-[#EDEDED]">Get Started</h1>
        </div>
        <p className="text-[#888888] mt-2">
          Running <span className="text-[#FF4D00] font-semibold">{modelName || modelId}</span> on your computer
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('easy')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'easy'
              ? 'bg-[#FF4D00] text-white'
              : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          One-Click Setup
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'code'
              ? 'bg-[#FF4D00] text-white'
              : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Step-by-Step
        </button>
      </div>

      {/* ============= OPTION A: ONE-CLICK ============= */}
      {activeTab === 'easy' && (
        <div className="space-y-6">
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B35] text-white flex items-center justify-center">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EDEDED]">Instant AI Chatbot</h2>
                  <p className="text-sm text-[#888888]">One command. Working chatbot in 60 seconds.</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* What you need */}
                <div className="p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] rounded-xl">
                  <p className="text-sm font-semibold text-[#EDEDED] mb-2">Before you start, make sure you have:</p>
                  <div className="space-y-1.5">
                    <p className="text-sm text-[#888888] flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4ade80]" /> <a href="https://nodejs.org" target="_blank" className="text-[#4ade80] underline">Node.js</a> installed (free, takes 2 min)
                    </p>
                    <p className="text-sm text-[#888888] flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4ade80]" /> A terminal app (Terminal on Mac, PowerShell on Windows)
                    </p>
                  </div>
                </div>

                {/* The command */}
                <div>
                  <p className="text-sm text-[#EDEDED] font-semibold mb-3">Open your terminal and paste this:</p>
                  <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto whitespace-pre-wrap leading-relaxed break-all">
                    {oneLiner}
                  </div>
                </div>

                <Button
                  className="w-full gap-2 h-12 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold text-base"
                  onClick={() => copyCode(oneLiner, 1)}
                >
                  {copiedStep === 1 ? <><Check className="w-5 h-5" /> Copied to Clipboard!</> : <><Copy className="w-5 h-5" /> Copy Command</>}
                </Button>
              </div>
            </div>
          </div>

          {/* What happens */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#EDEDED] mb-4">What happens when you run it:</h3>
            <div className="space-y-3">
              {[
                { icon: '1', text: 'Creates a new folder called slyos-chatbot' },
                { icon: '2', text: 'Installs the SlyOS SDK automatically' },
                { icon: '3', text: 'Downloads your AI model (first time only, ~900MB)' },
                { icon: '4', text: 'Opens an interactive chatbot — just start typing!' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {step.icon}
                  </div>
                  <p className="text-sm text-[#888888]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What it looks like */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#EDEDED] mb-3">What you'll see:</h3>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#AAAAAA] whitespace-pre leading-relaxed overflow-x-auto">
{`  ╔═══════════════════════════════════╗
  ║  🔥 SlyOS Chatbot                ║
  ║  Model: ${modelId.padEnd(24)}║
  ║  Type 'exit' to quit             ║
  ╚═══════════════════════════════════╝

You > Hello!
AI  > Hi there! How can I help you today?

You > What is machine learning?
AI  > Machine learning is a branch of AI that
     enables computers to learn from data...

You > exit
Goodbye! 👋`}
            </div>
          </div>
        </div>
      )}

      {/* ============= OPTION B: STEP-BY-STEP ============= */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.2)] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h2 className="text-lg font-bold text-[#EDEDED]">Install the SDK</h2>
                <p className="text-xs text-[#888888]">Open your terminal and paste this</p>
              </div>
            </div>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-sm text-[#4ade80] mb-3">
              {installCode}
            </div>
            <Button
              variant="ghost" size="sm"
              className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
              onClick={() => copyCode(installCode, 10)}
            >
              {copiedStep === 10 ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </Button>
          </div>

          {/* Step 2 */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h2 className="text-lg font-bold text-[#EDEDED]">Create a file called app.mjs</h2>
                <p className="text-xs text-[#888888]">Paste this code into it — your API key is already filled in</p>
              </div>
            </div>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto whitespace-pre leading-relaxed mb-3">
              {appCode}
            </div>
            <Button
              variant="ghost" size="sm"
              className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
              onClick={() => copyCode(appCode, 11)}
            >
              {copiedStep === 11 ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
            </Button>
            <div className="mt-4 p-3 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] rounded-lg">
              <p className="text-xs text-[#888888]"><span className="text-[#EDEDED] font-semibold">What this does:</span> Connects to SlyOS, downloads the AI model to your computer (first time only), and generates a response.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h2 className="text-lg font-bold text-[#EDEDED]">Run it</h2>
                <p className="text-xs text-[#888888]">In the same folder, type this</p>
              </div>
            </div>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-sm text-[#4ade80] mb-3">
              node app.mjs
            </div>
            <Button
              variant="ghost" size="sm"
              className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
              onClick={() => copyCode('node app.mjs', 12)}
            >
              {copiedStep === 12 ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </Button>
          </div>
        </div>
      )}

      {/* FAQ Section — always visible */}
      <div className="mt-8 backdrop-blur-xl bg-[rgba(255,77,0,0.03)] border border-[rgba(255,77,0,0.15)] rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#EDEDED] mb-4">Common Questions</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Download className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">Do I need to re-download the model every time?</p>
              <p className="text-xs text-[#888888] mt-1">No. The model downloads once (~900MB) and stays on your computer. After that, it starts in seconds.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Play className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">What happens when I close the terminal?</p>
              <p className="text-xs text-[#888888] mt-1">The AI stops running, but your model files stay saved. Just run the command again to restart instantly.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">Does it run on my computer or in the cloud?</p>
              <p className="text-xs text-[#888888] mt-1">100% on your computer. Your data never leaves your machine. That's the whole point of SlyOS.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 mb-8">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="h-11 bg-transparent border-[rgba(255,255,255,0.1)] text-[#EDEDED] hover:bg-[rgba(255,255,255,0.05)] gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
