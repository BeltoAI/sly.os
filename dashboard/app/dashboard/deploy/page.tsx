'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Copy,
  Check,
  Terminal,
  Globe,
  Code2,
  Smartphone,
  Sparkles,
  Download,
  Play,
  Zap,
  Settings,
  MessageSquare,
  Palette,
} from 'lucide-react';

export default function DeployPage() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'widget' | 'sdk' | 'mobile'>(
    'terminal'
  );
  const [mobileTab, setMobileTab] = useState<'android' | 'ios'>('android');
  const [os, setOs] = useState<'windows' | 'unix'>('windows');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState('sk_live_your_api_key_here');
  const [modelId, setModelId] = useState('quantum-3b');
  const [kbId, setKbId] = useState('');

  // Widget customization state
  const [widgetPosition, setWidgetPosition] = useState<
    'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  >('bottom-right');
  const [widgetColor, setWidgetColor] = useState('#FF4D00');
  const [widgetTitle, setWidgetTitle] = useState('AI Assistant');
  const [widgetWelcome, setWidgetWelcome] = useState('Hi! How can I help you?');
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [widgetTheme, setWidgetTheme] = useState<'dark' | 'light' | 'auto'>('dark');

  useEffect(() => {
    const u = localStorage.getItem('user');
    const m = localStorage.getItem('primaryModel');
    const kb = localStorage.getItem('activeKbId');

    try {
      const user = u ? JSON.parse(u) : {};
      setApiKey(user.organization?.api_key || 'sk_live_your_api_key_here');
    } catch {}

    if (m) setModelId(m);
    if (kb) setKbId(kb);
  }, []);

  const copyCode = (code: string, step: number) => {
    navigator.clipboard.writeText(code);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // ============= CODE SNIPPETS =============

  // Terminal — Unix (curl | bash)
  const oneLiner = `curl -sL https://raw.githubusercontent.com/BeltoAI/sly.os/master/sdk/create-chatbot.sh | bash -s -- --api-key ${apiKey} --model ${modelId}${kbId ? ` --kb-id ${kbId}` : ''}`;

  // Terminal — Windows PowerShell full chatbot (pure PS, no Node.js needed)
  const psOneLiner = `$k="${apiKey}"; $m="${modelId}"; $b="https://api.slyos.world"; $s=[guid]::NewGuid().ToString(); cls; Write-Host "\`n  SlyOS AI Chatbot" -ForegroundColor Cyan; Write-Host "  Model: $m  |  type 'exit' to quit\`n" -ForegroundColor DarkGray; try { $null=irm "$b/api/widget/$k/generate" -Method POST -ContentType "application/json" -Body (ConvertTo-Json @{message="hello";model=$m;sessionId=$s}) -EA Stop; Write-Host "  Connected! Start chatting.\`n" -ForegroundColor Green } catch { Write-Host "  Cannot connect: $($_.Exception.Message)" -ForegroundColor Red; pause; exit }; while($true) { $i=Read-Host "\`n  You"; if(!$i -or $i -match "^(exit|quit|bye|q)$") { Write-Host "\`n  Goodbye!\`n"; break }; try { $r=irm "$b/api/widget/$k/generate" -Method POST -ContentType "application/json" -Body (ConvertTo-Json @{message=$i;model=$m;sessionId=$s}); $t=@($r.response,$r.text,$r.message,$r.content)|?{$_}|select -First 1; Write-Host "\`n  AI: $t" -ForegroundColor Magenta } catch { Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red } }`;

  const downloadBatLauncher = () => {
    // ── app.mjs — cloud API chatbot (no local model download, starts instantly) ──
    // Uses Node.js built-in fetch to call SlyOS API directly.
    // Written as string array so it can be safely base64-encoded for PowerShell.
    const appMjsLines = [
      "import 'dotenv/config';",
      "import readline from 'readline';",
      "",
      "const API_KEY = process.env.SLYOS_API_KEY;",
      "const MODEL   = process.env.SLYOS_MODEL || 'quantum-3b';",
      "const BASE    = (process.env.SLYOS_SERVER || 'https://api.slyos.world').replace(/\\/+$/, '');",
      "const SESSION = Math.random().toString(36).slice(2) + Date.now().toString(36);",
      "",
      "const C = { r:'\\x1b[0m', b:'\\x1b[1m', c:'\\x1b[36m', g:'\\x1b[32m', e:'\\x1b[31m', m:'\\x1b[35m', d:'\\x1b[2m' };",
      "const rl = readline.createInterface({ input: process.stdin, output: process.stdout });",
      "",
      "async function callAPI(message) {",
      "  const url = BASE + '/api/widget/' + API_KEY + '/generate';",
      "  const res = await fetch(url, {",
      "    method: 'POST',",
      "    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },",
      "    body: JSON.stringify({ message: message, model: MODEL, sessionId: SESSION })",
      "  });",
      "  if (!res.ok) {",
      "    const txt = await res.text().catch(() => res.statusText);",
      "    throw new Error('HTTP ' + res.status + ' — ' + txt.slice(0, 200));",
      "  }",
      "  const data = await res.json();",
      "  return data.response || data.text || data.message || data.content || data.reply || JSON.stringify(data);",
      "}",
      "",
      "async function main() {",
      "  console.clear();",
      "  console.log(C.b + C.c + '\\n  ╔══════════════════════════════╗');",
      "  console.log('  ║     SlyOS AI Chatbot          ║');",
      "  console.log('  ╚══════════════════════════════╝' + C.r + '\\n');",
      "  console.log(C.d + '  Model: ' + MODEL + '   |   type exit to quit' + C.r + '\\n');",
      "  process.stdout.write('  Connecting to SlyOS...');",
      "  try {",
      "    const ping = await callAPI('Hello');",
      "    console.log('\\r  ' + C.g + '✓ Connected! Start chatting below.' + C.r + '                    \\n');",
      "  } catch(e) {",
      "    console.log('\\n  ' + C.e + '✗ Connection failed: ' + e.message + C.r);",
      "    console.log('  → Check your API key and internet connection, then re-run.');",
      "    process.exit(1);",
      "  }",
      "  const ask = () => rl.question('  ' + C.c + 'You: ' + C.r, async function(raw) {",
      "    var input = raw.trim();",
      "    if (!input) return ask();",
      "    if (/^(exit|quit|bye|q)$/i.test(input)) { console.log('\\n  Goodbye!\\n'); process.exit(0); }",
      "    process.stdout.write('\\n  ' + C.m + 'AI:  ' + C.r);",
      "    try {",
      "      var reply = await callAPI(input);",
      "      console.log(reply);",
      "    } catch(e) {",
      "      console.log(C.e + 'Error: ' + e.message + C.r);",
      "    }",
      "    console.log('');",
      "    ask();",
      "  });",
      "  process.on('SIGINT', function() { console.log('\\n  Goodbye!\\n'); process.exit(0); });",
      "  ask();",
      "}",
      "",
      "main().catch(function(e) { console.error('\\n  ' + C.e + 'Fatal: ' + e.message + C.r); process.exit(1); });",
    ];
    const appMjsContent = appMjsLines.join('\n');

    // Base64-encode app.mjs as UTF-8 bytes (PowerShell decodes → WriteAllBytes → no PS parsing)
    const utf8Bytes: number[] = [];
    for (let i = 0; i < appMjsContent.length; i++) {
      const c = appMjsContent.charCodeAt(i);
      if (c < 128) { utf8Bytes.push(c); }
      else if (c < 2048) { utf8Bytes.push((c >> 6) | 192, (c & 63) | 128); }
      else { utf8Bytes.push((c >> 12) | 224, ((c >> 6) & 63) | 128, (c & 63) | 128); }
    }
    let b64App = '';
    const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    for (let i = 0; i < utf8Bytes.length; i += 3) {
      const b0 = utf8Bytes[i], b1 = utf8Bytes[i+1] ?? 0, b2 = utf8Bytes[i+2] ?? 0;
      b64App += b64Chars[b0 >> 2] + b64Chars[((b0 & 3) << 4) | (b1 >> 4)]
             + (i+1 < utf8Bytes.length ? b64Chars[((b1 & 15) << 2) | (b2 >> 6)] : '=')
             + (i+2 < utf8Bytes.length ? b64Chars[b2 & 63] : '=');
    }

    // ── PowerShell setup script ──────────────────────────────────────────────
    const psScript = [
      '$ErrorActionPreference = "Continue"',
      '$dir = Join-Path $env:USERPROFILE "Desktop\\slyos-chatbot"',
      'Write-Host ""',
      'Write-Host "  SlyOS Chatbot Setup" -ForegroundColor Cyan',
      'try { $nv = (& node --version 2>&1); Write-Host ("  Node.js " + $nv + " detected") -ForegroundColor DarkGray }',
      'catch { Write-Host "  Node.js not found — install from https://nodejs.org" -ForegroundColor Red; Read-Host "Press Enter to exit"; exit 1 }',
      'if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }',
      'Set-Location $dir',
      'Write-Host ("  Folder: " + $dir) -ForegroundColor DarkGray',
      '[System.IO.File]::WriteAllText((Join-Path $dir "package.json"), \'{"name":"slyos-chatbot","version":"1.0.0","type":"module"}\', [System.Text.Encoding]::UTF8)',
      `[System.IO.File]::WriteAllText((Join-Path $dir ".env"), "SLYOS_API_KEY=${apiKey}\`nSLYOS_MODEL=${modelId}\`nSLYOS_SERVER=https://api.slyos.world${kbId ? `\`nSLYOS_KB_ID=${kbId}` : ''}", [System.Text.Encoding]::UTF8)`,
      `$b64 = "${b64App}"`,
      '$appBytes = [System.Convert]::FromBase64String($b64)',
      '[System.IO.File]::WriteAllBytes((Join-Path $dir "app.mjs"), $appBytes)',
      'if (-not (Test-Path (Join-Path $dir "node_modules\\dotenv"))) {',
      '  Write-Host "  Installing dotenv..." -ForegroundColor Cyan',
      '  & npm install dotenv --save 2>&1 | Out-Null',
      '  Write-Host "  Ready!" -ForegroundColor Green',
      '}',
      'Write-Host ""',
      '& node app.mjs',
    ].join('\n');

    // Encode entire PS script as UTF-16LE base64 for -EncodedCommand
    const psBytes: number[] = [];
    for (let i = 0; i < psScript.length; i++) {
      const c = psScript.charCodeAt(i);
      psBytes.push(c & 0xff, (c >> 8) & 0xff);
    }
    let encodedPS = '';
    for (let i = 0; i < psBytes.length; i += 3) {
      const b0 = psBytes[i], b1 = psBytes[i+1] ?? 0, b2 = psBytes[i+2] ?? 0;
      encodedPS += b64Chars[b0 >> 2] + b64Chars[((b0 & 3) << 4) | (b1 >> 4)]
                + (i+1 < psBytes.length ? b64Chars[((b1 & 15) << 2) | (b2 >> 6)] : '=')
                + (i+2 < psBytes.length ? b64Chars[b2 & 63] : '=');
    }

    const bat = '@echo off\r\ntitle SlyOS Chatbot\r\npowershell -NoExit -ExecutionPolicy Bypass -EncodedCommand ' + encodedPS + '\r\n';

    const blob = new Blob([bat], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slyos-chatbot.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Widget
  const widgetCode = `<!-- SlyOS AI Widget -->
<script>
  window.SlyOSWidget = {
    apiKey: '${apiKey}',
    model: '${modelId}',${kbId ? `\n    knowledgeBaseId: '${kbId}',` : ''}
    position: '${widgetPosition}',
    primaryColor: '${widgetColor}',
    title: '${widgetTitle}',
    welcomeMessage: '${widgetWelcome}',
    theme: '${widgetTheme}'
  };
</script>
<script src="https://cdn.slyos.world/widget.js" async><\/script>`;

  // SDK Steps
  const sdkSteps = [
    {
      num: 1,
      title: 'Install SDK',
      icon: Copy,
      code: 'npm install @beltoinc/slyos-sdk',
    },
    {
      num: 2,
      title: 'Initialize with Progress Tracking',
      icon: Code2,
      code: `import SlyOS from '@beltoinc/slyos-sdk';

const sdk = new SlyOS({
  apiKey: '${apiKey}',
  onProgress: (e) => {
    const bar = '█'.repeat(Math.floor(e.progress / 5)).padEnd(20, '░');
    console.log(\`[\${bar}] \${e.progress}% — \${e.message}\`);
  }
});

// Profiles device, authenticates, registers
const device = await sdk.initialize();
console.log(\`\${device.cpuCores} cores, \${Math.round(device.memoryMB / 1024)}GB RAM\`);`,
    },
    {
      num: 3,
      title: 'Load Model (Auto-Quantized)',
      icon: Zap,
      code: `// Auto-selects best quantization for your device
await sdk.loadModel('${modelId}');

// Or manually specify: 'q4', 'q8', 'fp16', 'fp32'
// await sdk.loadModel('${modelId}', { quant: 'q4' });`,
    },
    {
      num: 4,
      title: 'Generate',
      icon: Play,
      code: `const response = await sdk.generate(
  '${modelId}',
  'What are your daily specials?',
  { temperature: 0.7, maxTokens: 100 }
);

console.log(response);`,
    },
  ];

  // Mobile - Android
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
${kbId ? `
    // RAG query with your knowledge base
    val result = sdk.ragQuery(
      knowledgeBaseId = "${kbId}",
      query = "What does the documentation say about...?",
      modelId = "${modelId}",
      topK = 5
    )
    Log.d("SlyOS", result.generatedResponse)` : `
    val response = sdk.generate("${modelId}", "Hello!")
    Log.d("SlyOS", response)`}
  }
}`;

  // Mobile - iOS
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
${kbId ? `
    // RAG query with your knowledge base
    let result = try await sdk.ragQuery(
      knowledgeBaseId: "${kbId}",
      query: "What does the documentation say about...?",
      modelId: "${modelId}",
      topK: 5
    )
    print(result.generatedResponse)` : `
    let response = try await sdk.generate("${modelId}", prompt: "Hello!")
    print(response)`}
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
    <div className="animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[#EDEDED] mb-2">Deploy</h1>
        <p className="text-sm text-[#888888]">
          Integrate SlyOS into your app with 4 deployment methods
        </p>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-[rgba(255,255,255,0.06)]">
        {[
          { id: 'terminal', label: 'Terminal', icon: Terminal },
          { id: 'widget', label: 'Web Widget', icon: Globe },
          { id: 'sdk', label: 'Node.js SDK', icon: Code2 },
          { id: 'mobile', label: 'Mobile', icon: Smartphone },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap relative ${
              activeTab === id ? 'text-[#EDEDED]' : 'text-[#888888] hover:text-[#EDEDED]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4D00]" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: Terminal */}
      {activeTab === 'terminal' && (
        <div className="space-y-6">
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl p-8">
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap gap-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF4D00] to-[#FF6B35] text-white flex items-center justify-center">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#EDEDED]">Instant AI Chatbot</h2>
                  <p className="text-sm text-[#888888]">One command. Working chatbot in 60 seconds.</p>
                </div>
              </div>
              {/* OS toggle */}
              <div className="flex items-center bg-[#050505] border border-[rgba(255,255,255,0.08)] rounded-xl p-1 gap-1">
                <button
                  onClick={() => setOs('windows')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    os === 'windows'
                      ? 'bg-[#FF4D00] text-white'
                      : 'text-[#888888] hover:text-[#EDEDED]'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 5.557L10.333 4.5V11.5H3V5.557zM11.333 4.357L21 3v8.5H11.333V4.357zM3 12.5H10.333V19.5L3 18.443V12.5zM11.333 12.5H21V21L11.333 19.643V12.5z"/>
                  </svg>
                  Windows
                </button>
                <button
                  onClick={() => setOs('unix')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    os === 'unix'
                      ? 'bg-[#FF4D00] text-white'
                      : 'text-[#888888] hover:text-[#EDEDED]'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                  </svg>
                  Mac / Linux
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="p-4 bg-[rgba(74,222,128,0.05)] border border-[rgba(74,222,128,0.15)] rounded-xl">
                <p className="text-sm font-semibold text-[#EDEDED] mb-2">Before you start:</p>
                <div className="space-y-1.5">
                  <p className="text-sm text-[#888888] flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#4ade80]" />
                    Node.js installed (free, takes 2 min)
                  </p>
                  {os === 'windows' ? (
                    <p className="text-sm text-[#888888] flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4ade80]" />
                      Windows 10/11 — PowerShell is already installed
                    </p>
                  ) : (
                    <p className="text-sm text-[#888888] flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#4ade80]" />
                      Terminal app (macOS Terminal, iTerm, or any Linux shell)
                    </p>
                  )}
                </div>
              </div>

              {os === 'windows' ? (
                <>
                  {/* Windows: Launch button first */}
                  <div className="p-5 bg-[rgba(255,77,0,0.06)] border border-[rgba(255,77,0,0.2)] rounded-xl">
                    <p className="text-sm font-semibold text-[#EDEDED] mb-1 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#FF4D00]" />
                      One-click launch
                    </p>
                    <p className="text-xs text-[#888888] mb-4">
                      Download the launcher — double-click it and PowerShell opens. Chatbot connects instantly via cloud API, no model download needed.
                    </p>
                    <Button
                      className="w-full gap-2 h-12 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold text-base"
                      onClick={downloadBatLauncher}
                    >
                      <Download className="w-5 h-5" /> Download slyos-chatbot.bat
                    </Button>
                    <p className="text-[11px] text-[#555555] mt-2 text-center">
                      Save anywhere → double-click → chatbot starts instantly in PowerShell
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
                    <span className="text-xs text-[#555555]">or chat instantly in PowerShell — no install needed</span>
                    <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
                  </div>

                  <div>
                    <p className="text-sm text-[#EDEDED] font-semibold mb-1">
                      Instant PowerShell Chatbot
                    </p>
                    <p className="text-xs text-[#555555] mb-3">
                      Press <kbd className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] px-1.5 py-0.5 rounded text-[#888888] font-mono">Win</kbd> + <kbd className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] px-1.5 py-0.5 rounded text-[#888888] font-mono">X</kbd> → Terminal (PowerShell) → paste and hit Enter — chatbot starts immediately
                    </p>
                    <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto whitespace-pre-wrap leading-relaxed break-all">
                      {psOneLiner}
                    </div>
                    <p className="text-[11px] text-[#555555] mt-2">Pure PowerShell — no Node.js or installs needed. Just paste and chat.</p>
                  </div>

                  <Button
                    className="w-full gap-2 h-10 bg-transparent border border-[rgba(255,255,255,0.1)] text-[#EDEDED] hover:bg-[rgba(255,255,255,0.05)] font-semibold"
                    onClick={() => copyCode(psOneLiner, 1)}
                  >
                    {copiedStep === 1 ? (
                      <><Check className="w-4 h-4 text-[#4ade80]" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy Chatbot Command</>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-[#EDEDED] font-semibold mb-3">
                      Open your terminal and paste this:
                    </p>
                    <div className="bg-[#050505] border border-[rgba(255,77,0,0.15)] rounded-xl p-4 font-mono text-xs text-[#4ade80] overflow-x-auto whitespace-pre-wrap leading-relaxed break-all">
                      {oneLiner}
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2 h-12 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold"
                    onClick={() => copyCode(oneLiner, 1)}
                  >
                    {copiedStep === 1 ? (
                      <><Check className="w-5 h-5" /> Copied to Clipboard!</>
                    ) : (
                      <><Copy className="w-5 h-5" /> Copy Command</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#EDEDED] mb-4">What happens:</h3>
            <div className="space-y-3">
              {[
                { icon: '1', text: 'Creates a new folder called slyos-chatbot' },
                { icon: '2', text: 'Installs the SlyOS SDK automatically' },
                { icon: '3', text: 'Downloads your AI model (first time only, ~900MB)' },
                { icon: '4', text: 'Opens an interactive chatbot — just start typing!' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] flex items-center justify-center font-bold text-xs">
                    {step.icon}
                  </div>
                  <p className="text-sm text-[#888888]">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Web Widget */}
      {activeTab === 'widget' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customization Panel */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sticky top-20 space-y-6">
              <h3 className="text-lg font-bold text-[#EDEDED] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#FF4D00]" />
                Customize
              </h3>

              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-3">Position</label>
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

              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-3">Color</label>
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

              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-2">Title</label>
                <input
                  type="text"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#EDEDED] text-sm focus:border-[#FF4D00] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-2">Welcome Message</label>
                <textarea
                  value={widgetWelcome}
                  onChange={(e) => setWidgetWelcome(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#EDEDED] text-sm focus:border-[#FF4D00] focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-[#EDEDED] block mb-3">Size</label>
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

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 h-fit">
              <h3 className="text-lg font-bold text-[#EDEDED] mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FF4D00]" />
                Preview
              </h3>
              <div className="bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 h-96 relative flex items-center justify-center overflow-hidden">
                <div
                  className={`absolute ${getPositionPreview()} ${getSizeClass()} bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-xl border border-[rgba(255,255,255,0.1)] shadow-2xl flex flex-col overflow-hidden transition-all duration-300`}
                >
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

          {/* Code */}
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
                Paste into your HTML file's <code className="bg-[#050505] px-2 py-1 rounded">{'<body>'}</code> tag
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Node.js SDK */}
      {activeTab === 'sdk' && (
        <div className="space-y-4">
          {sdkSteps.map(({ num, title, icon: Icon, code }) => (
            <div key={num} className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-lg bg-[#FF4D00] text-white text-xs flex items-center justify-center font-bold">
                    {num}
                  </span>
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
                  {copiedStep === num ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Mobile */}
      {activeTab === 'mobile' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            {[
              { id: 'android', label: 'Android (Kotlin)', icon: Smartphone },
              { id: 'ios', label: 'iOS (Swift)', icon: Smartphone },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMobileTab(id as typeof mobileTab)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  mobileTab === id
                    ? 'bg-[#FF4D00] text-white'
                    : 'bg-[#0A0A0A] text-[#888888] border border-[rgba(255,255,255,0.08)] hover:text-[#EDEDED]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {mobileTab === 'android' && (
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-[#EDEDED] flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-[#FF4D00]" />
                Android SDK (Kotlin)
              </h2>

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
          )}

          {mobileTab === 'ios' && (
            <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.25)] rounded-2xl p-6 space-y-6">
              <h2 className="text-xl font-bold text-[#EDEDED] flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-[#FF4D00]" />
                iOS SDK (Swift)
              </h2>

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
          )}
        </div>
      )}

      {/* RAG SECTION */}
      <div className="mt-16 space-y-6">
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
                    { num: '4', text: 'Get SDK snippets to query your RAG database' },
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
  knowledgeBaseId: '${kbId || 'YOUR_KB_ID'}',
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
  knowledgeBaseId: '${kbId || 'YOUR_KB_ID'}',
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
await sdk.syncKnowledgeBase('${kbId || 'YOUR_KB_ID'}');
const result = await sdk.ragQueryOffline({
  knowledgeBaseId: '${kbId || 'YOUR_KB_ID'}',
  query: 'What are the key findings?',
  modelId: '${modelId}',
});`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-[#FF4D00] hover:bg-[#FF4D00]/10"
                    onClick={() => copyCode(`// Tier 3: Offline (sync first, then query anywhere)
await sdk.syncKnowledgeBase('${kbId || 'YOUR_KB_ID'}');
const result = await sdk.ragQueryOffline({
  knowledgeBaseId: '${kbId || 'YOUR_KB_ID'}',
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

      {/* FAQ SECTION */}
      <div className="mt-12 backdrop-blur-xl bg-[rgba(255,77,0,0.03)] border border-[rgba(255,77,0,0.15)] rounded-2xl p-6">
        <h3 className="text-base font-bold text-[#EDEDED] mb-4">Common Questions</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Download className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">Do I need to re-download the model?</p>
              <p className="text-xs text-[#888888] mt-1">
                No. The model downloads once (~900MB) and stays on your device. After that, it starts in seconds.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Play className="w-5 h-5 text-[#FF4D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-[#EDEDED] font-semibold">Does it work offline?</p>
              <p className="text-xs text-[#888888] mt-1">
                Yes! Once the model is downloaded, everything runs locally. No internet required after setup.
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

      {/* Spacing */}
      <div className="mt-12" />
    </div>
  );
}
