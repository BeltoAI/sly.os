'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Check,
  ArrowLeft,
  Rocket,
  Download,
  Play,
  Zap,
  Terminal,
  Sparkles,
  MessageCircle,
  Globe,
  Smartphone,
  Code2,
  Settings,
  Palette,
  MessageSquare,
} from 'lucide-react';

export default function GetStartedPage() {
  const router = useRouter();
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [user, setUser] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'terminal' | 'embed' | 'frontend' | 'mobile'>(
    'terminal'
  );
  const [mobileTab, setMobileTab] = useState<'android' | 'ios'>('android');

  // Widget customization state
  const [widgetPosition, setWidgetPosition] = useState<
    'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  >('bottom-right');
  const [widgetColor, setWidgetColor] = useState('#FF4D00');
  const [widgetTitle, setWidgetTitle] = useState('AI Assistant');
  const [widgetWelcome, setWidgetWelcome] = useState('Hi! How can I help you?');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [widgetTheme, setWidgetTheme] = useState<'dark' | 'light' | 'auto'>('dark');

  const apiKey = user.organization?.api_key || 'YOUR_API_KEY';

  useEffect(() => {
    const savedModelId = localStorage.getItem('primaryModel');
    const savedModelName = localStorage.getItem('primaryModelName');
    if (!savedModelId) {
      router.push('/dashboard/models');
      return;
    }
    setModelId(savedModelId);
    setModelName(savedModelName || savedModelId);

    const u = localStorage.getItem('user');
    if (u) try {
      setUser(JSON.parse(u));
    } catch {}
  }, [router]);

  const copyCode = (code: string, step: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // Terminal Chatbot
  const oneLiner = `curl -sL https://raw.githubusercontent.com/BeltoAI/sly.os/main/sdk/create-chatbot.sh | bash -s -- --api-key ${apiKey} --model ${modelId}`;
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

  // Widget embed code
  const widgetCode = `<!-- SlyOS AI Widget -->
<script>
  window.SlyOSWidget = {
    apiKey: '${apiKey}',
    model: '${modelId}',
    position: '${widgetPosition}',
    primaryColor: '${widgetColor}',
    title: '${widgetTitle}',
    welcomeMessage: '${widgetWelcome}',
    theme: '${widgetTheme}'
  };
</script>
<script src="https://cdn.slyos.world/widget.js" async><\/script>`;

  // Frontend command
  const frontendCommand = `npx create-slyos-app my-ai-chat --api-key ${apiKey} --model ${modelId}`;

  // Android Kotlin
  const androidCode = `// build.gradle
dependencies {
  implementation("com.slyos:slyos-sdk:1.0.0")
}

// MainActivity.kt
import com.slyos.SlyOS
import com.slyos.SlyOSConfig

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val sdk = SlyOS(SlyOSConfig(apiKey = "${apiKey}"))
    val profile = sdk.initialize()
    sdk.loadModel("${modelId}")
    val response = sdk.generate("${modelId}", "Hello!")
    Log.d("SlyOS", response)
  }
}`;

  // iOS Swift
  const iosCode = `// Package.swift
let package = Package(
  name: "MyAIChat",
  dependencies: [
    .package(url: "https://github.com/BeltoAI/slyos-swift.git", from: "1.0.0")
  ]
)

// ViewController.swift
import SlyOS

class ChatViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()

    let sdk = SlyOS(config: .init(apiKey: "${apiKey}"))
    let profile = try await sdk.initialize()
    try await sdk.loadModel("${modelId}")
    let response = try await sdk.generate("${modelId}", prompt: "Hello!")
    print(response)
  }
}`;

  const getPositionPreview = () => {
    const positions: Record<string, string> = {
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
    };
    return positions[widgetPosition] || 'bottom-4 right-4';
  };

  const getSizeClass = () => {
    const sizes: Record<string, string> = {
      small: 'w-64 h-80',
      medium: 'w-80 h-96',
      large: 'w-96 h-[500px]',
    };
    return sizes[widgetSize] || 'w-80 h-96';
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-7 h-7 text-[#FF4D00]" />
          <h1 className="text-3xl font-bold text-[#EDEDED]">Get Started</h1>
        </div>
        <p className="text-[#888888] mt-2">
          Running <span className="text-[#FF4D00] font-semibold">{modelName || modelId}</span> — Choose
          your deployment method
        </p>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'terminal'
              ? 'bg-[#FF4D00] text-white'
              : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Terminal Chatbot
        </button>
        <button
          onClick={() => setActiveTab('embed')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'embed'
              ? 'bg-[#FF4D00] text-white'
              : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
          }`}
        >
          <Globe className="w-4 h-4" />
          Embed on Website
        </button>
        <button
          onClick={() => setActiveTab('frontend')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'frontend'
              ? 'bg-[#FF4D00] text-white'
              : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
          }`}
        >
          <Code2 className="w-4 h-4" />
          SlyOS Frontend
        </button>
        <button
          onClick={() => setActiveTab('mobile')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'mobile'
              ? 'bg-[#FF4D00] text-white'
              : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Mobile SDK
        </button>
      </div>

      {/* ============= TAB 1: TERMINAL CHATBOT ============= */}
      {activeTab === 'terminal' && (
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
                <div className="p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] rounded-xl">
                  <p className="text-sm font-semibold text-[#EDEDED] mb-2">Before you start:</p>
                  <div className="space-y-1.5">
                    <p className="text-sm text-[#888888] flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4ade80]" />
                      <a
                        href="https://nodejs.org"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4ade80] underline"
                      >
                        Node.js
                      </a>
                      installed (free, takes 2 min)
                    </p>
                    <p className="text-sm text-[#888888] flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4ade80]" /> A terminal app (Terminal on Mac,
                      PowerShell on Windows)
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-[#EDEDED] font-semibold mb-3">
                    Open your terminal and paste this:
                  </p>
                  <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto whitespace-pre-wrap leading-relaxed break-all">
                    {oneLiner}
                  </div>
                </div>

                <Button
                  className="w-full gap-2 h-12 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold text-base"
                  onClick={() => copyCode(oneLiner, 1)}
                >
                  {copiedStep === 1 ? (
                    <>
                      <Check className="w-5 h-5" /> Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" /> Copy Command
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

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

      {/* ============= TAB 2: EMBED ON WEBSITE ============= */}
      {activeTab === 'embed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customization Panel */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sticky top-20 space-y-6">
              <h3 className="text-lg font-bold text-[#EDEDED] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#FF4D00]" />
                Customize Widget
              </h3>

              {/* Position */}
              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-3">Widget Position</label>
                <div className="space-y-2">
                  {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setWidgetPosition(pos)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        widgetPosition === pos
                          ? 'bg-[#FF4D00] text-white'
                          : 'bg-[#050505] text-[#888888] hover:text-[#EDEDED]'
                      }`}
                    >
                      {pos.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-3">Primary Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={widgetColor}
                    onChange={(e) => setWidgetColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#EDEDED] text-sm font-mono"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-2">Widget Title</label>
                <input
                  type="text"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#EDEDED] text-sm focus:border-[#FF4D00] focus:outline-none"
                />
              </div>

              {/* Welcome Message */}
              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-2">Welcome Message</label>
                <textarea
                  value={widgetWelcome}
                  onChange={(e) => setWidgetWelcome(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#EDEDED] text-sm focus:border-[#FF4D00] focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              {/* Size */}
              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-3">Widget Size</label>
                <div className="space-y-2">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setWidgetSize(size)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all capitalize ${
                        widgetSize === size
                          ? 'bg-[#FF4D00] text-white'
                          : 'bg-[#050505] text-[#888888] hover:text-[#EDEDED]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-3">Theme</label>
                <div className="space-y-2">
                  {(['dark', 'light', 'auto'] as const).map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setWidgetTheme(theme)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all capitalize ${
                        widgetTheme === theme
                          ? 'bg-[#FF4D00] text-white'
                          : 'bg-[#050505] text-[#888888] hover:text-[#EDEDED]'
                      }`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview Pane */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold text-[#EDEDED] mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FF4D00]" />
                Live Preview
              </h3>
              <div className="bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 h-96 relative flex items-center justify-center overflow-hidden">
                <div className={`absolute ${getPositionPreview()} ${getSizeClass()} bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-xl border border-[rgba(255,255,255,0.1)] shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}>
                  <div
                    className="px-4 py-3 text-white flex items-center justify-between"
                    style={{ backgroundColor: widgetColor }}
                  >
                    <span className="text-sm font-bold">{widgetTitle}</span>
                    <button className="text-lg leading-none hover:opacity-80">×</button>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    <div className="bg-[#2a2a2a] text-[#EDEDED] text-xs px-3 py-2 rounded-lg max-w-xs">
                      {widgetWelcome}
                    </div>
                  </div>
                  <div className="p-4 border-t border-[rgba(255,255,255,0.1)]">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="w-full bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-xs text-[#EDEDED] placeholder-[#666666] focus:outline-none"
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Snippet */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.2)] rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold text-[#EDEDED] mb-4 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#FF4D00]" />
                Embed Code
              </h3>
              <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-3 font-mono text-xs text-[#4ade80] overflow-x-auto mb-4 max-h-64 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed">
                {widgetCode}
              </div>
              <Button
                className="w-full gap-2 h-10 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold"
                onClick={() => copyCode(widgetCode, 20)}
              >
                {copiedStep === 20 ? (
                  <>
                    <Check className="w-4 h-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Code
                  </>
                )}
              </Button>
              <p className="text-xs text-[#888888] mt-3">
                Paste this into your HTML file's{' '}
                <code className="bg-[#050505] px-2 py-1 rounded">{'<body>'}</code> tag to add the
                widget to your website.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============= TAB 3: SLYOS FRONTEND ============= */}
      {activeTab === 'frontend' && (
        <div className="space-y-6">
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B35] text-white flex items-center justify-center">
                <Code2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#EDEDED]">Beautiful React Chat App</h2>
                <p className="text-sm text-[#888888]">Full-featured frontend with real-time inference</p>
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-sm text-[#EDEDED] font-semibold">Run this command to create a new app:</p>
              <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-4 font-mono text-sm text-[#4ade80] overflow-x-auto whitespace-pre-wrap leading-relaxed break-all">
                {frontendCommand}
              </div>

              <Button
                className="w-full gap-2 h-12 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold text-base"
                onClick={() => copyCode(frontendCommand, 30)}
              >
                {copiedStep === 30 ? (
                  <>
                    <Check className="w-5 h-5" /> Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" /> Copy Command
                  </>
                )}
              </Button>

              <div className="p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] rounded-xl">
                <p className="text-xs text-[#888888]">
                  <span className="text-[#EDEDED] font-semibold">What this creates:</span> A beautiful
                  React chat application with SlyOS-styled dark theme, real-time inference, conversation
                  history, and model switching.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
              <h3 className="text-base font-semibold text-[#EDEDED] mb-4">What you'll get:</h3>
              <div className="space-y-3">
                {[
                  'Professional dark theme UI',
                  'Real-time text streaming',
                  'Conversation history',
                  'Model switcher',
                  'Copy message functionality',
                  'Responsive design',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-[#FF4D00]/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#FF4D00]" />
                    </div>
                    <p className="text-sm text-[#888888]">{feature}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 flex items-center justify-center min-h-64">
              <div className="w-full space-y-2">
                <div className="bg-[#050505] border border-[rgba(255,77,0,0.25)] rounded-lg p-4 h-12 flex items-end">
                  <div className="flex-1 h-2 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] rounded" />
                </div>
                <div className="space-y-1 text-xs text-[#888888]">
                  <p>Welcome to SlyOS Chat</p>
                  <p>Ready to chat...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============= TAB 4: MOBILE SDK ============= */}
      {activeTab === 'mobile' && (
        <div className="space-y-6">
          {/* Mobile Tab Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setMobileTab('android')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                mobileTab === 'android'
                  ? 'bg-[#FF4D00] text-white'
                  : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Android (Kotlin)
            </button>
            <button
              onClick={() => setMobileTab('ios')}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                mobileTab === 'ios'
                  ? 'bg-[#FF4D00] text-white'
                  : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              iOS (Swift)
            </button>
          </div>

          {/* Android Tab */}
          {mobileTab === 'android' && (
            <div className="space-y-6">
              <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl p-6">
                <h2 className="text-xl font-bold text-[#EDEDED] mb-6 flex items-center gap-2">
                  <Smartphone className="w-6 h-6 text-[#FF4D00]" />
                  Android SDK (Kotlin)
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[#EDEDED] mb-3">Add to build.gradle:</p>
                    <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-3">
                      implementation("com.slyos:slyos-sdk:1.0.0")
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                      onClick={() => copyCode('implementation("com.slyos:slyos-sdk:1.0.0")', 40)}
                    >
                      {copiedStep === 40 ? (
                        <>
                          <Check className="w-4 h-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#EDEDED] mb-3">MainActivity.kt:</p>
                    <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto max-h-96 overflow-y-auto mb-3 whitespace-pre-wrap break-words leading-relaxed">
                      {androidCode}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                      onClick={() => copyCode(androidCode, 41)}
                    >
                      {copiedStep === 41 ? (
                        <>
                          <Check className="w-4 h-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* iOS Tab */}
          {mobileTab === 'ios' && (
            <div className="space-y-6">
              <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl p-6">
                <h2 className="text-xl font-bold text-[#EDEDED] mb-6 flex items-center gap-2">
                  <Smartphone className="w-6 h-6 text-[#FF4D00]" />
                  iOS SDK (Swift)
                </h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-[#EDEDED] mb-3">Package.swift:</p>
                    <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-3">
                      .package(url: "https://github.com/BeltoAI/slyos-swift.git", from: "1.0.0")
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                      onClick={() =>
                        copyCode(
                          '.package(url: "https://github.com/BeltoAI/slyos-swift.git", from: "1.0.0")',
                          42
                        )
                      }
                    >
                      {copiedStep === 42 ? (
                        <>
                          <Check className="w-4 h-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#EDEDED] mb-3">ViewController.swift:</p>
                    <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto max-h-96 overflow-y-auto mb-3 whitespace-pre-wrap break-words leading-relaxed">
                      {iosCode}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                      onClick={() => copyCode(iosCode, 43)}
                    >
                      {copiedStep === 43 ? (
                        <>
                          <Check className="w-4 h-4" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============= RAG SECTION ============= */}
      <div className="mt-12 space-y-6">
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B35] text-white flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#EDEDED]">Local RAG — Knowledge Base</h2>
                <p className="text-sm text-[#888888]">Build intelligent retrieval-augmented generation with your documents</p>
              </div>
            </div>

            <div className="space-y-6 mt-6">
              <div className="p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] rounded-xl">
                <p className="text-sm font-semibold text-[#EDEDED] mb-2">Workflow Overview:</p>
                <div className="space-y-2">
                  {[
                    { num: '1', text: 'Select your model' },
                    { num: '2', text: 'Upload documents to Knowledge Base (dashboard or API)' },
                    { num: '3', text: 'Configure: system prompt, temperature, top-K' },
                    { num: '4', text: 'Get SDK snippets or use the dashboard chat' },
                  ].map((step) => (
                    <p key={step.num} className="text-sm text-[#888888] flex items-center gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#FF4D00]/20 text-[#FF4D00] flex items-center justify-center text-xs font-bold">
                        {step.num}
                      </span>
                      {step.text}
                    </p>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#EDEDED] mb-3">Tier 2: Cloud-indexed retrieval + local inference</h3>
                  <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-3 whitespace-pre-wrap break-words leading-relaxed">
{`// Tier 2: Cloud-indexed retrieval + local inference
const result = await sdk.ragQuery({
  knowledgeBaseId: 'YOUR_KB_ID',
  query: 'What does the warranty cover?',
  modelId: '${modelId}',
  topK: 5,
});
console.log(result.generatedResponse);
console.log(result.retrievedChunks);`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                    onClick={() => copyCode(`// Tier 2: Cloud-indexed retrieval + local inference
const result = await sdk.ragQuery({
  knowledgeBaseId: 'YOUR_KB_ID',
  query: 'What does the warranty cover?',
  modelId: '${modelId}',
  topK: 5,
});
console.log(result.generatedResponse);
console.log(result.retrievedChunks);`, 50)}
                  >
                    {copiedStep === 50 ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Code
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#EDEDED] mb-3">Tier 1: Fully local, zero network</h3>
                  <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-3 whitespace-pre-wrap break-words leading-relaxed">
{`// Tier 1: Fully local, zero network
const result = await sdk.ragQueryLocal({
  knowledgeBaseId: 'local',
  query: 'Summarize this document',
  modelId: '${modelId}',
  documents: [{ content: 'Your document text...', name: 'report.pdf' }],
});`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                    onClick={() => copyCode(`// Tier 1: Fully local, zero network
const result = await sdk.ragQueryLocal({
  knowledgeBaseId: 'local',
  query: 'Summarize this document',
  modelId: '${modelId}',
  documents: [{ content: 'Your document text...', name: 'report.pdf' }],
});`, 51)}
                  >
                    {copiedStep === 51 ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Code
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-[#EDEDED] mb-3">Tier 3: Offline (sync first, then query anywhere)</h3>
                  <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-3 whitespace-pre-wrap break-words leading-relaxed">
{`// Tier 3: Offline (sync first, then query anywhere)
await sdk.syncKnowledgeBase('YOUR_KB_ID');
const result = await sdk.ragQueryOffline({
  knowledgeBaseId: 'YOUR_KB_ID',
  query: 'What are the key findings?',
  modelId: '${modelId}',
});`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                    onClick={() => copyCode(`// Tier 3: Offline (sync first, then query anywhere)
await sdk.syncKnowledgeBase('YOUR_KB_ID');
const result = await sdk.ragQueryOffline({
  knowledgeBaseId: 'YOUR_KB_ID',
  query: 'What are the key findings?',
  modelId: '${modelId}',
});`, 52)}
                  >
                    {copiedStep === 52 ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section — always visible */}
      <div className="mt-12 backdrop-blur-xl bg-[rgba(255,77,0,0.03)] border border-[rgba(255,77,0,0.15)] rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#EDEDED] mb-4">Common Questions</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Download className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">Do I need to re-download the model?</p>
              <p className="text-xs text-[#888888] mt-1">
                No. The model downloads once (~900MB) and stays on your device. After that, it starts in
                seconds.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Play className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">Does it work offline?</p>
              <p className="text-xs text-[#888888] mt-1">
                Yes! Once the model is downloaded, everything runs locally. No internet required after
                setup.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">Is my data private?</p>
              <p className="text-xs text-[#888888] mt-1">
                100% private. Your data never leaves your machine. That's the whole point of SlyOS.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 mb-8">
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
