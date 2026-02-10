'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowLeft, ArrowRight, Rocket, Download, Code2, Play, Zap, MessageCircle, Mic, Globe } from 'lucide-react';

export default function GetStartedPage() {
  const router = useRouter();
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [user, setUser] = useState<any>({});

  const apiKey = user.organization?.api_key || 'sk_live_your_api_key_here';

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

  const installCode = `npm install @emilshirokikh/slyos-sdk`;

  const simpleCode = `import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({
  apiKey: '${apiKey}',
  onProgress: (e) => console.log(\`[\${e.progress}%] \${e.message}\`)
});

const device = await sdk.initialize();
console.log(\`Device: \${device.cpuCores} cores, \${Math.round(device.memoryMB / 1024)}GB RAM\`);

await sdk.loadModel('${modelId}');

const response = await sdk.generate('${modelId}', 'Say hi!');
console.log(response);`;

  const openaiCode = `import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({
  apiKey: '${apiKey}',
  openaiCompatible: true
});

const response = await sdk.chatCompletion({
  model: '${modelId}',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);`;

  const browserCode = `// In your React component
import SlyOS from '@emilshirokikh/slyos-sdk';

const sdk = new SlyOS({ apiKey: '${apiKey}' });
await sdk.initialize();
await sdk.loadModel('${modelId}');

const response = await sdk.generate('${modelId}', userMessage);`;

  const transcribeCode = `const text = await sdk.transcribe('${modelId}', './audio.wav');
console.log('Transcribed:', text);`;

  const expectedOutput = `[  0%] Analyzing your computer...
[ 20%] Found 8 cores and 16GB memory
[ 40%] Checking API key...
[ 60%] Ready! Downloading AI model...
[ 80%] Got 2.4GB of the model
[100%] Model loaded! Ready to use

Device: 8 cores, 16GB RAM

[  0%] Starting first AI response...
[ 20%] Thinking...
[ 50%] Generating words...
[100%] Done!

Response: Hi there! How can I help you today?`;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-6 h-6 text-[#FF4D00]" />
          <h1 className="text-4xl font-bold text-[#EDEDED]">Get Started in 3 Steps</h1>
        </div>
        <p className="text-[#888888] mt-2">Your first AI app will be running in about 5 minutes</p>
      </div>

      {/* STEP 1: Install */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.2)] rounded-2xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold text-lg">1</div>
            <h2 className="text-2xl font-bold text-[#EDEDED]">Install the SDK</h2>
          </div>
          <p className="text-[#888888] ml-16 mb-6">Open your terminal and paste this command</p>

          <div className="ml-16 bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-sm text-[#4ade80] overflow-x-auto mb-4 whitespace-pre leading-relaxed">
            {installCode}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="ml-16 gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
            onClick={() => copyCode(installCode, 1)}
          >
            {copiedStep === 1 ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Command</>}
          </Button>

          <div className="mt-6 ml-16 p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.2)] rounded-lg">
            <p className="text-sm text-[#EDEDED]">What to expect</p>
            <p className="text-xs text-[#888888] mt-2">Your terminal will show status messages. When done, you'll see "added X packages" - that's success!</p>
          </div>
        </div>
      </div>

      {/* STEP 2: Create App */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold text-lg">2</div>
            <h2 className="text-2xl font-bold text-[#EDEDED]">Create Your First App</h2>
          </div>
          <p className="text-[#888888] ml-16 mb-6">Create a file called <code className="bg-[#050505] px-2 py-1 rounded text-[#4ade80]">app.mjs</code> and paste this:</p>

          <div className="ml-16 bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-4 whitespace-pre leading-relaxed">
            {simpleCode}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="ml-16 gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
            onClick={() => copyCode(simpleCode, 2)}
          >
            {copiedStep === 2 ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Code</>}
          </Button>

          <div className="mt-6 ml-16 p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.2)] rounded-lg">
            <p className="text-sm text-[#EDEDED]">What this code does</p>
            <ul className="text-xs text-[#888888] mt-2 space-y-1">
              <li>• Checks your computer's specs (cores, memory)</li>
              <li>• Authenticates with your API key</li>
              <li>• Downloads the AI model (one-time only)</li>
              <li>• Generates a response from your question</li>
            </ul>
          </div>
        </div>
      </div>

      {/* STEP 3: Run It */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden mb-8">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold text-lg">3</div>
            <h2 className="text-2xl font-bold text-[#EDEDED]">Run Your App</h2>
          </div>
          <p className="text-[#888888] ml-16 mb-6">In the same folder as your file, run:</p>

          <div className="ml-16 bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-sm text-[#4ade80] overflow-x-auto mb-4 whitespace-pre leading-relaxed">
            node app.mjs
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="ml-16 gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
            onClick={() => copyCode('node app.mjs', 3)}
          >
            {copiedStep === 3 ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Command</>}
          </Button>

          <div className="mt-6 ml-16 p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.2)] rounded-lg">
            <p className="text-sm text-[#EDEDED]">Here's what you'll see:</p>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 font-mono text-xs text-[#AAAAAA] mt-3 whitespace-pre leading-relaxed overflow-x-auto">
              {expectedOutput}
            </div>
          </div>
        </div>
      </div>

      {/* SDK Persistence Info */}
      <div className="backdrop-blur-xl bg-[rgba(255,77,0,0.05)] border border-[rgba(255,77,0,0.2)] rounded-2xl overflow-hidden mb-8">
        <div className="p-8">
          <h3 className="text-lg font-bold text-[#EDEDED] mb-4">What Happens When I Close My App?</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <Download className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#EDEDED] font-semibold">Models are saved on your computer</p>
                <p className="text-[#888888]">After the first download (~900MB), the model stays on your disk. It's not deleted when you close the app.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Zap className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#EDEDED] font-semibold">Restarting is super fast</p>
                <p className="text-[#888888]">Next time you run your app, it only takes a few seconds to start. No re-downloading needed.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Play className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#EDEDED] font-semibold">The SDK runs with your app</p>
                <p className="text-[#888888]">When your app is running, the SDK runs. When you stop your app, the SDK stops too.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#EDEDED] mb-4">What's Next?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* OpenAI Format */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-5 h-5 text-[#FF4D00]" />
              <h4 className="font-bold text-[#EDEDED]">Use OpenAI Format</h4>
            </div>
            <p className="text-xs text-[#888888] mb-4">Drop-in replacement for OpenAI's API. Your code stays the same.</p>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 font-mono text-[10px] text-[#4ade80] overflow-x-auto whitespace-pre leading-relaxed mb-3">
              {openaiCode}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-[#FF4D00] hover:bg-[#FF4D00]/10"
              onClick={() => copyCode(openaiCode, 10)}
            >
              {copiedStep === 10 ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
          </div>

          {/* Browser */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-[#FF4D00]" />
              <h4 className="font-bold text-[#EDEDED]">Add to Your Website</h4>
            </div>
            <p className="text-xs text-[#888888] mb-4">Run AI directly in the browser with WebAssembly.</p>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 font-mono text-[10px] text-[#4ade80] overflow-x-auto whitespace-pre leading-relaxed mb-3">
              {browserCode}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-[#FF4D00] hover:bg-[#FF4D00]/10"
              onClick={() => copyCode(browserCode, 11)}
            >
              {copiedStep === 11 ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
          </div>

          {/* Speech-to-Text */}
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-5 h-5 text-[#FF4D00]" />
              <h4 className="font-bold text-[#EDEDED]">Speech to Text</h4>
            </div>
            <p className="text-xs text-[#888888] mb-4">Transcribe audio files directly on your computer.</p>
            <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-3 font-mono text-[10px] text-[#4ade80] overflow-x-auto whitespace-pre leading-relaxed mb-3">
              {transcribeCode}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-[#FF4D00] hover:bg-[#FF4D00]/10"
              onClick={() => copyCode(transcribeCode, 12)}
            >
              {copiedStep === 12 ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          className="flex-1 h-11 bg-transparent border-[rgba(255,255,255,0.1)] text-[#EDEDED] hover:bg-[rgba(255,255,255,0.05)] gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
