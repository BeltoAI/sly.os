'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BookOpen, ChevronRight, Search, Cpu, Globe, Smartphone, Server,
  Key, Shield, Zap, Database, Code, Terminal, Box, Layers,
  FileText, Mic, Brain, HardDrive, Activity, CreditCard, Users,
  Radio, ChevronDown, Copy, Check, ExternalLink
} from 'lucide-react';

// ─── Table of Contents Structure ───────────────────────────────────────────

interface TocItem {
  id: string;
  title: string;
  level: number;
  icon?: any;
}

const tocSections: TocItem[] = [
  { id: 'abstract', title: 'Abstract', level: 1, icon: BookOpen },
  { id: 'architecture', title: '1. System Architecture', level: 1, icon: Layers },
  { id: 'arch-overview', title: '1.1 Overview', level: 2 },
  { id: 'arch-components', title: '1.2 Core Components', level: 2 },
  { id: 'arch-data-flow', title: '1.3 Data Flow', level: 2 },
  { id: 'authentication', title: '2. Authentication', level: 1, icon: Key },
  { id: 'auth-flow', title: '2.1 Authentication Flow', level: 2 },
  { id: 'auth-sdk', title: '2.2 SDK Authentication', level: 2 },
  { id: 'auth-google', title: '2.3 Google OAuth', level: 2 },
  { id: 'sdk-reference', title: '3. SDK Reference', level: 1, icon: Code },
  { id: 'sdk-js', title: '3.1 JavaScript/TypeScript', level: 2 },
  { id: 'sdk-swift', title: '3.2 Swift (iOS/macOS)', level: 2 },
  { id: 'sdk-kotlin', title: '3.3 Kotlin (Android)', level: 2 },
  { id: 'sdk-models', title: '3.4 Model Registry', level: 2 },
  { id: 'api-endpoints', title: '4. API Endpoints', level: 1, icon: Server },
  { id: 'api-auth', title: '4.1 Auth Endpoints', level: 2 },
  { id: 'api-devices', title: '4.2 Device Management', level: 2 },
  { id: 'api-models', title: '4.3 Models', level: 2 },
  { id: 'api-telemetry', title: '4.4 Telemetry & Analytics', level: 2 },
  { id: 'api-rag', title: '4.5 RAG / Knowledge Bases', level: 2 },
  { id: 'api-billing', title: '4.6 Billing', level: 2 },
  { id: 'api-widget', title: '4.7 Widget / Embedded Chat', level: 2 },
  { id: 'api-ideas', title: '4.8 Ideas', level: 2 },
  { id: 'device-intelligence', title: '5. Device Intelligence', level: 1, icon: Brain },
  { id: 'di-scoring', title: '5.1 SlyOS Score', level: 2 },
  { id: 'di-profiling', title: '5.2 Device Profiling', level: 2 },
  { id: 'di-capabilities', title: '5.3 Capability Detection', level: 2 },
  { id: 'rag-system', title: '6. RAG System', level: 1, icon: Database },
  { id: 'rag-architecture', title: '6.1 Architecture', level: 2 },
  { id: 'rag-documents', title: '6.2 Document Processing', level: 2 },
  { id: 'rag-search', title: '6.3 Vector Search', level: 2 },
  { id: 'rag-sync', title: '6.4 Device Sync', level: 2 },
  { id: 'inference', title: '7. Inference Pipeline', level: 1, icon: Zap },
  { id: 'inf-ondevice', title: '7.1 On-Device Inference', level: 2 },
  { id: 'inf-whisper', title: '7.2 Speech-to-Text (Whisper)', level: 2 },
  { id: 'inf-fallback', title: '7.3 Cloud Fallback', level: 2 },
  { id: 'billing', title: '8. Billing & Subscriptions', level: 1, icon: CreditCard },
  { id: 'bill-plans', title: '8.1 Plans', level: 2 },
  { id: 'bill-stripe', title: '8.2 Stripe Integration', level: 2 },
  { id: 'bill-discounts', title: '8.3 Discount Codes', level: 2 },
  { id: 'telemetry', title: '9. Telemetry & Metrics', level: 1, icon: Activity },
  { id: 'tel-batching', title: '9.1 Batching Strategy', level: 2 },
  { id: 'tel-metrics', title: '9.2 Device Metrics', level: 2 },
  { id: 'tel-analytics', title: '9.3 Analytics Overview', level: 2 },
  { id: 'database', title: '10. Database Schema', level: 1, icon: HardDrive },
  { id: 'db-core', title: '10.1 Core Tables', level: 2 },
  { id: 'db-rag', title: '10.2 RAG Tables', level: 2 },
  { id: 'db-billing', title: '10.3 Billing Tables', level: 2 },
  { id: 'error-handling', title: '11. Error Handling', level: 1, icon: Shield },
  { id: 'err-codes', title: '11.1 HTTP Status Codes', level: 2 },
  { id: 'err-billing', title: '11.2 Billing Errors', level: 2 },
];

// ─── Code Block Component ──────────────────────────────────────────────────

function CodeBlock({ code, language = 'typescript' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0D0D0D] border border-[rgba(255,255,255,0.08)] border-b-0 rounded-t-lg">
        <span className="text-[10px] font-mono text-[#555555] uppercase tracking-wider">{language}</span>
        <button onClick={handleCopy} className="text-[#555555] hover:text-[#EDEDED] transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="bg-[#0D0D0D] border border-[rgba(255,255,255,0.08)] rounded-b-lg p-4 overflow-x-auto">
        <code className="text-[13px] font-mono text-[#e2e8f0] leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

// ─── Endpoint Row Component ────────────────────────────────────────────────

function Endpoint({ method, path, auth, description }: { method: string; path: string; auth: boolean; description: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/20',
    POST: 'bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/20',
    PUT: 'bg-[#eab308]/15 text-[#eab308] border-[#eab308]/20',
    DELETE: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20',
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${methodColors[method] || ''} shrink-0 mt-0.5`}>
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <code className="text-sm font-mono text-[#EDEDED]">{path}</code>
        <p className="text-xs text-[#888888] mt-0.5">{description}</p>
      </div>
      {auth && (
        <span className="text-[9px] font-mono text-[#FF4D00] bg-[rgba(255,77,0,0.1)] px-1.5 py-0.5 rounded shrink-0 mt-0.5">AUTH</span>
      )}
    </div>
  );
}

// ─── Section Heading Component ─────────────────────────────────────────────

function SectionHeading({ id, title, icon: Icon, level = 1 }: { id: string; title: string; icon?: any; level?: number }) {
  const Tag = level === 1 ? 'h2' : 'h3';
  const styles = level === 1
    ? 'text-xl font-bold text-[#EDEDED] flex items-center gap-3 pt-12 pb-4 border-b border-[rgba(255,255,255,0.06)] mb-6'
    : 'text-base font-semibold text-[#EDEDED] flex items-center gap-2 pt-8 pb-3 mb-4';
  return (
    <Tag id={id} className={styles}>
      {Icon && <Icon className={`${level === 1 ? 'w-5 h-5' : 'w-4 h-4'} text-[#FF4D00]`} />}
      {title}
    </Tag>
  );
}

// ─── Table Component ───────────────────────────────────────────────────────

function DocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-[rgba(255,255,255,0.08)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[rgba(255,255,255,0.03)]">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2.5 text-[11px] font-mono font-semibold text-[#888888] uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.02)]">
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2 ${j === 0 ? 'font-mono text-[#EDEDED] text-xs' : 'text-[#888888] text-xs'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Paragraph Component ───────────────────────────────────────────────────

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#888888] leading-relaxed mb-4">{children}</p>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="text-xs font-mono text-[#FF4D00] bg-[rgba(255,77,0,0.08)] px-1.5 py-0.5 rounded">{children}</code>;
}

// ─── Main Documentation Page ───────────────────────────────────────────────

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('abstract');
  const [searchQuery, setSearchQuery] = useState('');
  const [tocCollapsed, setTocCollapsed] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0.1 }
    );

    const sections = document.querySelectorAll('[data-section]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  const filteredToc = searchQuery
    ? tocSections.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tocSections;

  const toggleSection = (id: string) => {
    setTocCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="animate-fade-in flex gap-8">
      {/* ─── LEFT: Table of Contents ─────────────────────────────────── */}
      <aside className="w-[280px] shrink-0 sticky top-0 h-[calc(100vh-64px)] overflow-y-auto pb-12 pr-4 border-r border-[rgba(255,255,255,0.06)]">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-[#FF4D00]" />
            <h1 className="text-lg font-bold text-[#EDEDED]">Documentation</h1>
          </div>
          <div className="text-[10px] font-mono text-[#555555] mb-4">SlyOS Platform Reference v1.4.1</div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555]" />
            <input
              type="text"
              placeholder="Search sections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-[#EDEDED] placeholder:text-[#555555] focus:outline-none focus:border-[#FF4D00] transition-colors"
            />
          </div>
        </div>

        {/* TOC Items */}
        <nav className="space-y-0.5">
          {filteredToc.map((item) => {
            const isActive = activeSection === item.id;
            const isParent = item.level === 1;
            const Icon = item.icon;

            // Check if this parent's children should be hidden
            if (item.level === 2) {
              const parentIdx = tocSections.findIndex((s, i) => {
                const nextParent = tocSections.findIndex((ss, ii) => ii > i && ss.level === 1);
                const itemIdx = tocSections.indexOf(item);
                return s.level === 1 && itemIdx > i && (nextParent === -1 || itemIdx < nextParent);
              });
              const parent = tocSections[parentIdx];
              if (parent && tocCollapsed[parent.id]) return null;
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  scrollToSection(item.id);
                  if (isParent) toggleSection(item.id);
                }}
                className={`w-full text-left flex items-center gap-2 rounded-md transition-all duration-150 ${
                  item.level === 1 ? 'px-3 py-2 text-xs font-semibold' : 'pl-8 pr-3 py-1.5 text-[11px]'
                } ${
                  isActive
                    ? 'bg-[rgba(255,77,0,0.1)] text-[#FF4D00] border-l-2 border-[#FF4D00]'
                    : 'text-[#888888] hover:text-[#EDEDED] hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{item.title}</span>
                {isParent && (
                  <ChevronDown className={`w-3 h-3 ml-auto shrink-0 transition-transform ${tocCollapsed[item.id] ? '-rotate-90' : ''}`} />
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ─── RIGHT: Content ──────────────────────────────────────────── */}
      <div ref={contentRef} className="flex-1 min-w-0 pb-24 max-w-4xl">

        {/* ─── ABSTRACT ─────────────────────────────────────────────── */}
        <div id="abstract" data-section className="mb-8">
          <div className="bg-gradient-to-br from-[rgba(255,77,0,0.12)] to-[rgba(255,77,0,0.03)] border border-[rgba(255,77,0,0.15)] rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#FF4D00]" />
              <span className="text-[10px] font-mono text-[#FF4D00] uppercase tracking-widest">SlyOS Platform</span>
            </div>
            <h1 className="text-2xl font-bold text-[#EDEDED] mb-4">Technical Documentation</h1>
            <P>
              SlyOS is an on-device AI infrastructure platform that enables developers to deploy inference
              directly to end-user devices — phones, laptops, and IoT hardware — without cloud dependency.
              This document provides a comprehensive technical reference covering the system architecture,
              SDK integration, API endpoints, device intelligence system, RAG pipeline, billing model, and
              database schema.
            </P>
            <div className="flex gap-3 mt-4">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[#888888]">v1.4.1</span>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[#888888]">3 SDKs</span>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[#888888]">ONNX Runtime</span>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-[#888888]">pgvector RAG</span>
            </div>
          </div>
        </div>

        {/* ─── 1. SYSTEM ARCHITECTURE ───────────────────────────────── */}
        <div id="architecture" data-section>
          <SectionHeading id="architecture" title="1. System Architecture" icon={Layers} />
        </div>

        <div id="arch-overview" data-section>
          <SectionHeading id="arch-overview" title="1.1 Overview" level={2} />
          <P>
            SlyOS operates as a three-tier architecture: the <strong className="text-[#EDEDED]">Client SDKs</strong> (JavaScript, Swift, Kotlin)
            run inference on-device using ONNX Runtime, the <strong className="text-[#EDEDED]">Backend API</strong> (Node.js/Express on Elastic Beanstalk)
            handles authentication, device registration, telemetry, and billing, and the <strong className="text-[#EDEDED]">Dashboard</strong> (Next.js on Vercel)
            provides a management interface for developers.
          </P>
          <CodeBlock language="text" code={`┌──────────────────────────────────────────────────────┐
│                    SlyOS Platform                     │
├──────────────┬──────────────────┬─────────────────────┤
│  Client SDK  │   Backend API    │     Dashboard       │
│  (On-Device) │   (Express.js)   │     (Next.js)       │
├──────────────┼──────────────────┼─────────────────────┤
│ JS/TS SDK    │ Auth & JWT       │ Device Management   │
│ Swift SDK    │ Device Registry  │ Model Deployment    │
│ Kotlin SDK   │ Telemetry Ingest │ Analytics & Metrics │
│ ONNX Runtime │ RAG Pipeline     │ Knowledge Bases     │
│ HF Models    │ Stripe Billing   │ Billing & Settings  │
└──────────────┴──────────────────┴─────────────────────┘
        │                │                  │
        │    PostgreSQL + pgvector          │
        │         Stripe API               │
        └──────────────────────────────────┘`} />
        </div>

        <div id="arch-components" data-section>
          <SectionHeading id="arch-components" title="1.2 Core Components" level={2} />
          <DocTable
            headers={['Component', 'Technology', 'Hosting', 'Purpose']}
            rows={[
              ['Backend API', 'Node.js / Express', 'AWS Elastic Beanstalk', 'Auth, devices, telemetry, RAG, billing'],
              ['Dashboard', 'Next.js 16 / React 19', 'Vercel', 'Developer management interface'],
              ['JS/TS SDK', 'TypeScript / Transformers.js', 'npm registry', 'Web & Node.js inference'],
              ['Swift SDK', 'Swift / ONNX Runtime', 'Swift Package Manager', 'iOS 16+ / macOS 13+ inference'],
              ['Kotlin SDK', 'Kotlin / ONNX Runtime Android', 'Gradle / GitHub', 'Android 7.0+ (API 24) inference'],
              ['Database', 'PostgreSQL + pgvector', 'AWS RDS', 'All persistent data + vector embeddings'],
              ['Payments', 'Stripe', 'Stripe-hosted', 'Subscriptions, checkout, webhooks'],
            ]}
          />
        </div>

        <div id="arch-data-flow" data-section>
          <SectionHeading id="arch-data-flow" title="1.3 Data Flow" level={2} />
          <P>
            The typical integration lifecycle: (1) Developer registers, gets API key from dashboard.
            (2) SDK initializes with API key, authenticates via <Mono>POST /api/auth/sdk</Mono>, receives JWT.
            (3) SDK profiles device hardware (CPU, RAM, GPU) and registers via <Mono>POST /api/devices/register</Mono>.
            (4) SDK downloads ONNX model from HuggingFace Hub, caches locally.
            (5) Inference runs entirely on-device via ONNX Runtime.
            (6) Telemetry (latency, tokens, success) batched and flushed to <Mono>POST /api/devices/telemetry</Mono>.
          </P>
        </div>

        {/* ─── 2. AUTHENTICATION ────────────────────────────────────── */}
        <div id="authentication" data-section>
          <SectionHeading id="authentication" title="2. Authentication" icon={Key} />
        </div>

        <div id="auth-flow" data-section>
          <SectionHeading id="auth-flow" title="2.1 Authentication Flow" level={2} />
          <P>
            SlyOS uses JWT-based authentication. Tokens are issued on login/register with a 7-day expiration
            and must be passed as <Mono>Authorization: Bearer &lt;token&gt;</Mono> on all authenticated endpoints.
            Passwords are hashed with bcrypt (cost factor 12).
          </P>
          <CodeBlock language="typescript" code={`// Register a new account
const res = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Your Name',
    email: 'you@example.com',
    password: 'min8chars',
    organizationName: 'My Company'
  })
});
const { token, user, organization } = await res.json();
// Use token for all subsequent requests`} />
        </div>

        <div id="auth-sdk" data-section>
          <SectionHeading id="auth-sdk" title="2.2 SDK Authentication" level={2} />
          <P>
            SDKs authenticate using the organization API key (found in Dashboard → Settings → API Keys).
            The key is exchanged for a JWT via <Mono>POST /api/auth/sdk</Mono>. This token is then used
            for device registration and telemetry reporting.
          </P>
          <CodeBlock language="typescript" code={`// SDK authenticates automatically on initialize()
const slyos = new SlyOS({ apiKey: 'sk_live_...' });
const profile = await slyos.initialize();
// JWT obtained internally, device registered`} />
        </div>

        <div id="auth-google" data-section>
          <SectionHeading id="auth-google" title="2.3 Google OAuth" level={2} />
          <P>
            Google Sign-In is supported via <Mono>POST /api/auth/google</Mono>. The frontend sends the
            Google ID token, which is verified server-side. If the email is new, an organization and user
            are auto-created. If existing, the user is logged in and a new JWT issued.
          </P>
        </div>

        {/* ─── 3. SDK REFERENCE ─────────────────────────────────────── */}
        <div id="sdk-reference" data-section>
          <SectionHeading id="sdk-reference" title="3. SDK Reference" icon={Code} />
        </div>

        <div id="sdk-js" data-section>
          <SectionHeading id="sdk-js" title="3.1 JavaScript / TypeScript SDK" level={2} />
          <P>
            The JS SDK (<Mono>@emilshirokikh/slyos-sdk</Mono>) runs in browsers and Node.js using
            Hugging Face Transformers.js with ONNX/WASM backend. Install via npm:
          </P>
          <CodeBlock language="bash" code={`npm install @emilshirokikh/slyos-sdk`} />

          <DocTable
            headers={['Method', 'Signature', 'Description']}
            rows={[
              ['initialize()', 'async initialize(): Promise<DeviceProfile>', 'Auth, profile device, register with backend'],
              ['loadModel()', 'async loadModel(modelId: string, options?): Promise<void>', 'Download & load ONNX model via Transformers.js pipeline'],
              ['generate()', 'async generate(modelId: string, prompt: string, options?): Promise<string>', 'Run text generation inference on-device'],
              ['transcribe()', 'async transcribe(modelId: string, audio: Blob, options?): Promise<string>', 'Whisper speech-to-text on audio input'],
              ['chatCompletion()', 'async chatCompletion(modelId: string, request: ChatCompletionRequest): Promise<ChatCompletionResponse>', 'OpenAI-compatible chat completion interface'],
              ['analyzeDevice()', 'analyzeDevice(): DeviceProfile', 'Get device hardware capabilities'],
              ['recommendModel()', 'recommendModel(category?: string): ModelRecommendation', 'Get best model for this device\'s hardware'],
              ['unloadModel()', 'async unloadModel(modelId: string): Promise<void>', 'Release model from memory'],
            ]}
          />

          <CodeBlock language="typescript" code={`import SlyOS from '@emilshirokikh/slyos-sdk';

const slyos = new SlyOS({
  apiKey: 'sk_live_...',
  apiUrl: 'https://your-backend.com',  // optional
});

// Initialize (auth + device profiling)
const profile = await slyos.initialize();

// Load a model
await slyos.loadModel('quantum-1.7b', { quant: 'q4' });

// Generate text
const response = await slyos.generate('quantum-1.7b', 'Explain edge AI', {
  maxTokens: 256,
  temperature: 0.7,
});

// OpenAI-compatible chat
const chat = await slyos.chatCompletion('quantum-3b', {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is SlyOS?' }
  ],
  max_tokens: 512,
  temperature: 0.8,
});`} />
        </div>

        <div id="sdk-swift" data-section>
          <SectionHeading id="sdk-swift" title="3.2 Swift SDK (iOS / macOS)" level={2} />
          <P>
            The Swift SDK uses ONNX Runtime with Core ML acceleration on Apple Silicon and A-series chips.
            Models are downloaded from HuggingFace Hub and cached locally. Requires iOS 16+ or macOS 13+.
          </P>
          <CodeBlock language="swift" code={`// Package.swift dependency
.package(url: "https://github.com/BeltoAI/sly.os", from: "1.4.0")`} />

          <DocTable
            headers={['Class', 'Purpose']}
            rows={[
              ['SlyOS', 'Main SDK class — initialize, loadModel, generate, transcribe, chatCompletion'],
              ['OnnxInferenceEngine', 'ONNX Runtime session management, autoregressive generation, Whisper decode'],
              ['ModelDownloader', 'HuggingFace Hub model download with local caching (~/.cache/SlyOS/)'],
              ['SlyOSTokenizer', 'HuggingFace swift-transformers tokenizer wrapper with ChatML support'],
              ['AudioProcessor', 'AVFoundation audio loading + Accelerate vDSP mel spectrogram for Whisper'],
              ['DeviceProfiler', 'Metal GPU detection, CPU/RAM/storage profiling, persistent Keychain device ID'],
            ]}
          />

          <CodeBlock language="swift" code={`import SlyOS

let sdk = SlyOS(config: SlyOSConfig(apiKey: "sk_live_..."))
let profile = try await sdk.initialize()

// Load model (downloads from HuggingFace, caches locally)
try await sdk.loadModel("quantum-1.7b", quant: .q4)

// Generate text (runs on-device via ONNX Runtime + Core ML)
let response = try await sdk.generate("quantum-1.7b",
    prompt: "Explain edge computing",
    options: GenerateOptions(maxTokens: 256, temperature: 0.7)
)

// Transcribe audio (Whisper STT)
let transcription = try await sdk.transcribe("voicecore-base",
    audioURL: audioFileURL, language: "en"
)`} />
        </div>

        <div id="sdk-kotlin" data-section>
          <SectionHeading id="sdk-kotlin" title="3.3 Kotlin SDK (Android)" level={2} />
          <P>
            The Kotlin SDK uses ONNX Runtime Android with NNAPI hardware acceleration. Tokenization
            is handled by DJL HuggingFace Tokenizers (Rust JNI backend). Requires Android 7.0+ (API 24).
          </P>

          <DocTable
            headers={['Class', 'Purpose']}
            rows={[
              ['SlyOS', 'Main SDK class — initialize, loadModel, generate, transcribe, chatCompletion'],
              ['OnnxInferenceEngine', 'ONNX Runtime + NNAPI, autoregressive generation, Whisper decode'],
              ['ModelDownloader', 'OkHttp streaming download from HuggingFace with app cache storage'],
              ['SlyOSTokenizer', 'DJL HuggingFaceTokenizer (Rust-backed JNI) with ChatML templates'],
              ['AudioProcessor', 'MediaCodec audio decoding + mel spectrogram computation'],
              ['DeviceProfiler', 'GLES31 GPU detection, SharedPreferences device ID, SHA256 fingerprint'],
            ]}
          />

          <CodeBlock language="kotlin" code={`val slyos = SlyOS(context, SlyOSConfig(apiKey = "sk_live_..."))
val profile = slyos.initialize()

// Load model
slyos.loadModel("quantum-1.7b", QuantizationLevel.Q4)

// Generate text (ONNX Runtime + NNAPI acceleration)
val response = slyos.generate("quantum-1.7b",
    prompt = "Explain edge computing",
    options = GenerateOptions(maxTokens = 256, temperature = 0.7f)
)

// Transcribe audio
val text = slyos.transcribe("voicecore-base", audioUri)`} />
        </div>

        <div id="sdk-models" data-section>
          <SectionHeading id="sdk-models" title="3.4 Model Registry" level={2} />
          <P>
            All SDKs share the same ONNX model registry. Models are downloaded from HuggingFace Hub on first use
            and cached locally. Quantization is auto-selected based on device RAM.
          </P>
          <DocTable
            headers={['Model ID', 'Parameters', 'Type', 'HuggingFace ID', 'Sizes (Q4/Q8/FP16)']}
            rows={[
              ['quantum-1.7b', '1.7B', 'Text LLM', 'HuggingFaceTB/SmolLM2-1.7B-Instruct', '900MB / 1.8GB / 3.4GB'],
              ['quantum-3b', '3B', 'Text LLM', 'Qwen/Qwen2.5-3B-Instruct', '1.6GB / 3.2GB / 6GB'],
              ['quantum-code-3b', '3B', 'Code LLM', 'Qwen/Qwen2.5-Coder-3B-Instruct', '1.6GB / 3.2GB / 6GB'],
              ['quantum-8b', '8B', 'Text LLM', 'meta-llama/Llama-3.1-8B-Instruct', '4.5GB / 8.5GB / 16GB'],
              ['voicecore-base', '74M', 'Whisper STT', 'openai/whisper-base', '150MB / 290MB / —'],
              ['voicecore-small', '244M', 'Whisper STT', 'openai/whisper-small', '480MB / 960MB / —'],
            ]}
          />
          <P>
            <strong className="text-[#EDEDED]">Auto-quantization rules:</strong> Devices with ≤4GB RAM use Q4,
            4–8GB use Q8, 8GB+ can use FP16. These are recommendations — developers can override via
            the <Mono>quant</Mono> option on <Mono>loadModel()</Mono>.
          </P>
        </div>

        {/* ─── 4. API ENDPOINTS ─────────────────────────────────────── */}
        <div id="api-endpoints" data-section>
          <SectionHeading id="api-endpoints" title="4. API Endpoints" icon={Server} />
          <P>
            All API endpoints are served from the backend Express.js server. Authenticated endpoints require
            a valid JWT in the <Mono>Authorization: Bearer</Mono> header. Responses are JSON.
          </P>
        </div>

        <div id="api-auth" data-section>
          <SectionHeading id="api-auth" title="4.1 Auth Endpoints" level={2} />
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="POST" path="/api/auth/register" auth={false} description="Create account with name, email, password, organizationName. Returns JWT + user + org." />
              <Endpoint method="POST" path="/api/auth/login" auth={false} description="Login with email + password. Returns JWT + user object." />
              <Endpoint method="POST" path="/api/auth/google" auth={false} description="Google OAuth login with ID token credential. Auto-creates org if new." />
              <Endpoint method="POST" path="/api/auth/sdk" auth={false} description="SDK auth with API key. Returns JWT + organization." />
              <Endpoint method="POST" path="/api/auth/forgot-password" auth={false} description="Request password reset email. Rate limited: 5/15min per email." />
              <Endpoint method="POST" path="/api/auth/reset-password" auth={false} description="Reset password with token + newPassword. Token expires in 1 hour." />
              <Endpoint method="GET" path="/api/auth/me" auth={true} description="Get current user profile with organization details." />
              <Endpoint method="PUT" path="/api/auth/profile" auth={true} description="Update name and/or email." />
              <Endpoint method="PUT" path="/api/auth/password" auth={true} description="Change password. Requires currentPassword + newPassword." />
              <Endpoint method="PUT" path="/api/auth/organization" auth={true} description="Update organization name." />
            </CardContent>
          </Card>
        </div>

        <div id="api-devices" data-section>
          <SectionHeading id="api-devices" title="4.2 Device Management" level={2} />
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="POST" path="/api/devices/register" auth={true} description="Register or update a device. Accepts full device profile + intelligence fields." />
              <Endpoint method="GET" path="/api/devices" auth={true} description="List all devices for the organization with metrics." />
              <Endpoint method="PUT" path="/api/devices/:deviceId/toggle" auth={true} description="Enable or disable a device. Disabled devices are blocked from SDK auth." />
              <Endpoint method="PUT" path="/api/devices/:deviceId/name" auth={true} description="Rename a device." />
              <Endpoint method="DELETE" path="/api/devices/:deviceId" auth={true} description="Delete a device and all associated metrics/capabilities." />
              <Endpoint method="POST" path="/api/devices/telemetry" auth={true} description="Submit batch telemetry: array of {timestamp, latency_ms, tokens_generated, success}." />
              <Endpoint method="GET" path="/api/devices/:deviceId/score" auth={true} description="Get SlyOS Score breakdown: capability, performance, reliability, engagement." />
              <Endpoint method="GET" path="/api/devices/:deviceId/metrics" auth={true} description="Get hourly metrics for a device. Query param: ?days=N (default 7)." />
              <Endpoint method="GET" path="/api/devices/:deviceId/details" auth={true} description="Full device object with capabilities and intelligence fields." />
            </CardContent>
          </Card>
        </div>

        <div id="api-models" data-section>
          <SectionHeading id="api-models" title="4.3 Models" level={2} />
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="GET" path="/api/models" auth={true} description="List all enabled models with ID, name, description, tier, and parameters." />
            </CardContent>
          </Card>
        </div>

        <div id="api-telemetry" data-section>
          <SectionHeading id="api-telemetry" title="4.4 Telemetry & Analytics" level={2} />
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="POST" path="/api/telemetry" auth={true} description="Submit single telemetry event: device_id, event_type, model_id, latency_ms, tokens, success." />
              <Endpoint method="GET" path="/api/analytics/overview" auth={true} description="Full analytics: device counts, today's stats, all-time totals, model distribution, cost savings." />
            </CardContent>
          </Card>
        </div>

        <div id="api-rag" data-section>
          <SectionHeading id="api-rag" title="4.5 RAG / Knowledge Bases" level={2} />
          <P>
            RAG endpoints require the <strong className="text-[#EDEDED]">Hybrid RAG</strong> subscription plan ($0.45/device/month).
            Pure Edge subscribers will receive a 403 with a billing upgrade prompt.
          </P>
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="POST" path="/api/rag/knowledge-bases" auth={true} description="Create a knowledge base with name, description, tier, chunk config, model, prompt." />
              <Endpoint method="GET" path="/api/rag/knowledge-bases" auth={true} description="List all knowledge bases with document and chunk counts." />
              <Endpoint method="GET" path="/api/rag/knowledge-bases/:kbId" auth={true} description="Get KB details including documents and query counts." />
              <Endpoint method="PUT" path="/api/rag/knowledge-bases/:kbId" auth={true} description="Update KB settings (name, model, prompt, chunking config)." />
              <Endpoint method="DELETE" path="/api/rag/knowledge-bases/:kbId" auth={true} description="Delete KB and all associated documents/chunks." />
              <Endpoint method="POST" path="/api/rag/knowledge-bases/:kbId/documents/upload" auth={true} description="Upload documents (txt, md, csv, pdf, docx). Max 200MB per file, 10 files per request." />
              <Endpoint method="POST" path="/api/rag/knowledge-bases/:kbId/documents/scrape" auth={true} description="Scrape a URL and index as document. SSRF protection enabled." />
              <Endpoint method="GET" path="/api/rag/knowledge-bases/:kbId/documents" auth={true} description="List all documents in a knowledge base." />
              <Endpoint method="DELETE" path="/api/rag/knowledge-bases/:kbId/documents/:docId" auth={true} description="Delete a document and its chunks." />
              <Endpoint method="POST" path="/api/rag/knowledge-bases/:kbId/search" auth={true} description="Vector similarity search. Returns ranked chunks with scores." />
              <Endpoint method="POST" path="/api/rag/knowledge-bases/:kbId/query" auth={true} description="Full RAG query: search → context assembly → prompt template → response." />
              <Endpoint method="POST" path="/api/rag/knowledge-bases/:kbId/sync" auth={true} description="Sync KB chunks to device for offline RAG. Returns paginated sync package." />
            </CardContent>
          </Card>
        </div>

        <div id="api-billing" data-section>
          <SectionHeading id="api-billing" title="4.6 Billing" level={2} />
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="GET" path="/api/billing/status" auth={true} description="Subscription status, plan type, trial info, device count, monthly cost." />
              <Endpoint method="POST" path="/api/billing/create-checkout" auth={true} description="Create Stripe checkout session for pure_edge or hybrid_rag plan." />
              <Endpoint method="POST" path="/api/billing/portal" auth={true} description="Generate Stripe customer portal URL for subscription management." />
              <Endpoint method="POST" path="/api/billing/validate-discount" auth={true} description="Validate a discount code without applying it." />
              <Endpoint method="POST" path="/api/billing/webhook" auth={false} description="Stripe webhook receiver (checkout.session.completed, subscription.updated, etc.)." />
            </CardContent>
          </Card>
        </div>

        <div id="api-widget" data-section>
          <SectionHeading id="api-widget" title="4.7 Widget / Embedded Chat" level={2} />
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="POST" path="/api/widget/config" auth={false} description="Get widget configuration by widget ID." />
              <Endpoint method="GET" path="/api/widget/:orgApiKey/chat" auth={false} description="Get org info + available models for embedded chat widget." />
              <Endpoint method="POST" path="/api/widget/:orgApiKey/generate" auth={false} description="Generate response in widget context. Body: message, model, sessionId." />
            </CardContent>
          </Card>
        </div>

        <div id="api-ideas" data-section>
          <SectionHeading id="api-ideas" title="4.8 Ideas / Feature Requests" level={2} />
          <Card className="border-[rgba(255,255,255,0.08)]">
            <CardContent className="pt-4">
              <Endpoint method="GET" path="/api/ideas" auth={true} description="List ideas. Query: ?sort=newest|votes, ?category=X." />
              <Endpoint method="POST" path="/api/ideas" auth={true} description="Submit new idea with title, description, optional category." />
              <Endpoint method="POST" path="/api/ideas/:ideaId/vote" auth={true} description="Toggle vote on an idea. Body: { vote: 0 | 1 }." />
              <Endpoint method="DELETE" path="/api/ideas/:ideaId" auth={true} description="Delete an idea (author only)." />
            </CardContent>
          </Card>
        </div>

        {/* ─── 5. DEVICE INTELLIGENCE ───────────────────────────────── */}
        <div id="device-intelligence" data-section>
          <SectionHeading id="device-intelligence" title="5. Device Intelligence" icon={Brain} />
        </div>

        <div id="di-scoring" data-section>
          <SectionHeading id="di-scoring" title="5.1 SlyOS Score" level={2} />
          <P>
            Every registered device receives a composite <strong className="text-[#EDEDED]">SlyOS Score</strong> (0–100)
            that quantifies its ability to run on-device inference. The score is a weighted combination of four dimensions:
          </P>
          <DocTable
            headers={['Dimension', 'Weight', 'Inputs']}
            rows={[
              ['Capability', '30%', 'CPU cores, RAM, GPU presence, VRAM, display resolution'],
              ['Performance', '35%', 'Average inference latency (lower is better)'],
              ['Reliability', '25%', 'Success rate percentage across all inferences'],
              ['Engagement', '10%', 'Total inferences, recency, model diversity'],
            ]}
          />
          <DocTable
            headers={['Score Range', 'Tier', 'Description']}
            rows={[
              ['90–100', 'Power User', 'High-end device, excellent for 8B models'],
              ['75–89', 'Advanced', 'Strong device, good for 3B models'],
              ['60–74', 'Standard', 'Average device, 1.7B models recommended'],
              ['40–59', 'Limited', 'Low-end device, smallest models only'],
              ['0–39', 'Baseline', 'Minimal capabilities, cloud fallback recommended'],
            ]}
          />
        </div>

        <div id="di-profiling" data-section>
          <SectionHeading id="di-profiling" title="5.2 Device Profiling" level={2} />
          <P>
            SDKs collect hardware capabilities on initialization. This data is sent during device registration
            and used for model recommendation, quantization selection, and scoring.
          </P>
          <DocTable
            headers={['Field', 'JS SDK', 'Swift SDK', 'Kotlin SDK']}
            rows={[
              ['CPU Cores', 'navigator.hardwareConcurrency', 'ProcessInfo.processorCount', 'Runtime.availableProcessors()'],
              ['RAM (MB)', 'navigator.deviceMemory * 1024', 'ProcessInfo.physicalMemory', 'ActivityManager.memoryInfo'],
              ['GPU', 'WebGL renderer string', 'MTLCreateSystemDefaultDevice()', 'GLES31 GL_RENDERER'],
              ['Storage', 'navigator.storage.estimate()', 'FileManager attributesOfFileSystem', 'StatFs availableBytes'],
              ['Screen', 'window.screen width/height', 'UIScreen / NSScreen', 'DisplayMetrics'],
              ['Device ID', 'localStorage / ~/.slyos/', 'Keychain', 'SharedPreferences'],
              ['Fingerprint', 'SHA256 of hardware signals', 'SHA256 via CommonCrypto', 'SHA256 via MessageDigest'],
            ]}
          />
        </div>

        <div id="di-capabilities" data-section>
          <SectionHeading id="di-capabilities" title="5.3 Capability Detection" level={2} />
          <P>
            The backend stores per-device capability flags in the <Mono>device_capabilities</Mono> table.
            These are used to determine which models and quantizations a device can handle.
          </P>
          <DocTable
            headers={['Capability', 'Type', 'Description']}
            rows={[
              ['wasm_available', 'Boolean', 'WebAssembly support (JS SDK only)'],
              ['webgpu_available', 'Boolean', 'WebGPU support for GPU-accelerated inference (JS SDK)'],
              ['max_model_size_mb', 'Integer', 'Maximum model file size the device can load'],
              ['supported_quants', 'Text[]', 'Array of supported quantization levels'],
              ['can_run_1b / 3b / 8b', 'Boolean', 'Whether the device can run models of that size class'],
              ['recommended_tier', 'Integer', 'Recommended model tier (1=small, 2=medium, 3=large)'],
            ]}
          />
        </div>

        {/* ─── 6. RAG SYSTEM ────────────────────────────────────────── */}
        <div id="rag-system" data-section>
          <SectionHeading id="rag-system" title="6. RAG System" icon={Database} />
        </div>

        <div id="rag-architecture" data-section>
          <SectionHeading id="rag-architecture" title="6.1 Architecture" level={2} />
          <P>
            SlyOS provides a full Retrieval-Augmented Generation pipeline built on PostgreSQL with the
            pgvector extension. Documents are chunked, embedded with <Mono>all-MiniLM-L6-v2</Mono> (384-dim vectors),
            and stored for cosine similarity search. The pipeline supports two tiers:
          </P>
          <DocTable
            headers={['Tier', 'Name', 'Features']}
            rows={[
              ['Tier 2', 'Cloud RAG', 'Upload documents, chunk, embed, vector search, query with context'],
              ['Tier 3', 'Device Sync', 'Everything in Tier 2 + sync chunks to device for offline RAG'],
            ]}
          />
        </div>

        <div id="rag-documents" data-section>
          <SectionHeading id="rag-documents" title="6.2 Document Processing" level={2} />
          <P>
            Supported file types: <Mono>.txt</Mono>, <Mono>.md</Mono>, <Mono>.csv</Mono>, <Mono>.pdf</Mono> (via pdf-parse),
            <Mono>.docx</Mono> (via mammoth), and URL scraping. Documents are split into chunks using configurable
            size (default 512 tokens) and overlap (default 128 tokens), with sentence boundary detection.
            Each chunk is embedded and stored with the full vector for similarity search.
          </P>
        </div>

        <div id="rag-search" data-section>
          <SectionHeading id="rag-search" title="6.3 Vector Search" level={2} />
          <P>
            Search uses cosine distance via pgvector's <Mono>&lt;=&gt;</Mono> operator. The query is embedded
            with the same model, then matched against stored chunk embeddings. Top-K results (default 5,
            configurable per KB) are returned ranked by similarity. A keyword fallback (<Mono>ILIKE</Mono>)
            activates if the embedding pipeline encounters an error.
          </P>
          <CodeBlock language="sql" code={`-- Vector similarity search (internal)
SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM document_chunks
WHERE knowledge_base_id = $2
ORDER BY embedding <=> $1
LIMIT $3`} />
        </div>

        <div id="rag-sync" data-section>
          <SectionHeading id="rag-sync" title="6.4 Device Sync" level={2} />
          <P>
            Tier 3 enables syncing knowledge base chunks to devices for fully offline RAG. The sync endpoint
            returns a paginated package of chunks with a sync token that expires after 7 days. Devices
            can re-sync to get updated content.
          </P>
        </div>

        {/* ─── 7. INFERENCE PIPELINE ────────────────────────────────── */}
        <div id="inference" data-section>
          <SectionHeading id="inference" title="7. Inference Pipeline" icon={Zap} />
        </div>

        <div id="inf-ondevice" data-section>
          <SectionHeading id="inf-ondevice" title="7.1 On-Device Inference" level={2} />
          <P>
            All three SDKs run inference entirely on-device using ONNX Runtime. The pipeline:
            (1) Tokenize input with HuggingFace tokenizer, (2) Create input tensors (input_ids + attention_mask),
            (3) Run autoregressive generation loop with configurable sampling (temperature, top-p, top-k, repetition penalty),
            (4) Decode output tokens back to text.
          </P>
          <DocTable
            headers={['Platform', 'Runtime', 'Accelerator', 'Tokenizer']}
            rows={[
              ['Web / Node.js', 'Transformers.js (ONNX/WASM)', 'WebGPU (if available)', '@huggingface/transformers'],
              ['iOS / macOS', 'ONNX Runtime Swift 1.20+', 'Core ML EP (Apple Neural Engine)', 'swift-transformers 0.1.17+'],
              ['Android', 'ONNX Runtime Android 1.19', 'NNAPI EP (NPU/DSP)', 'DJL tokenizers 0.29 (Rust JNI)'],
            ]}
          />
          <P>
            <strong className="text-[#EDEDED]">Sampling parameters:</strong> <Mono>temperature</Mono> (0.0–2.0, default 0.7),
            <Mono>topP</Mono> (nucleus sampling, default 0.9), <Mono>topK</Mono> (default 50),
            <Mono>repetitionPenalty</Mono> (default 1.1), <Mono>maxTokens</Mono> (default 256).
          </P>
        </div>

        <div id="inf-whisper" data-section>
          <SectionHeading id="inf-whisper" title="7.2 Speech-to-Text (Whisper)" level={2} />
          <P>
            Whisper STT is supported across all SDKs via the <Mono>transcribe()</Mono> method. Audio is loaded,
            resampled to 16kHz mono, converted to an 80-channel mel spectrogram, then processed through the
            Whisper encoder-decoder architecture. Supported models: <Mono>voicecore-base</Mono> (74M params)
            and <Mono>voicecore-small</Mono> (244M params).
          </P>
          <DocTable
            headers={['Platform', 'Audio Loading', 'FFT', 'Supported Formats']}
            rows={[
              ['JS/TS', 'Web Audio API / AudioContext', 'Built into Transformers.js', 'WAV, MP3, WebM, OGG'],
              ['Swift', 'AVAudioFile + AVAudioConverter', 'Accelerate vDSP FFT', 'WAV, MP3, M4A, CAF'],
              ['Kotlin', 'MediaExtractor + MediaCodec', 'Naive DFT (N=400)', 'WAV, MP3, M4A, OGG, FLAC'],
            ]}
          />
        </div>

        <div id="inf-fallback" data-section>
          <SectionHeading id="inf-fallback" title="7.3 Cloud Fallback" level={2} />
          <P>
            All SDKs support optional cloud fallback to OpenAI or AWS Bedrock APIs when on-device inference
            fails or isn't available. Fallback is configured at SDK initialization via <Mono>openaiConfig</Mono> or
            <Mono>bedrockConfig</Mono>. The fallback is triggered automatically on inference errors.
          </P>
          <CodeBlock language="typescript" code={`const slyos = new SlyOS({
  apiKey: 'sk_live_...',
  openaiConfig: {
    apiKey: 'sk-openai-...',
    model: 'gpt-4o-mini'  // fallback model
  },
  bedrockConfig: {
    region: 'us-east-1',
    accessKeyId: '...',
    secretAccessKey: '...',
  }
});`} />
        </div>

        {/* ─── 8. BILLING ───────────────────────────────────────────── */}
        <div id="billing" data-section>
          <SectionHeading id="billing" title="8. Billing & Subscriptions" icon={CreditCard} />
        </div>

        <div id="bill-plans" data-section>
          <SectionHeading id="bill-plans" title="8.1 Plans" level={2} />
          <P>
            SlyOS uses device-based subscription pricing. Every enabled device counts toward the monthly bill.
            New organizations start with a 30-day free trial with full access to all features.
          </P>
          <DocTable
            headers={['Plan', 'Price', 'Features']}
            rows={[
              ['Trial', 'Free (30 days)', 'All features — Pure Edge + Hybrid RAG'],
              ['Pure Edge', '$0.15/device/month', 'On-device inference, model zoo, analytics, device management'],
              ['Hybrid RAG', '$0.45/device/month', 'Everything in Pure Edge + RAG, vector search, document management, device sync'],
            ]}
          />
        </div>

        <div id="bill-stripe" data-section>
          <SectionHeading id="bill-stripe" title="8.2 Stripe Integration" level={2} />
          <P>
            Billing is handled via Stripe Checkout and the Customer Portal. The webhook endpoint processes
            subscription lifecycle events: <Mono>checkout.session.completed</Mono>, <Mono>customer.subscription.updated</Mono>,
            <Mono>customer.subscription.deleted</Mono>, and <Mono>invoice.payment_failed</Mono>.
          </P>
        </div>

        <div id="bill-discounts" data-section>
          <SectionHeading id="bill-discounts" title="8.3 Discount Codes" level={2} />
          <P>
            Discount codes can be applied during checkout. Each code has a percentage discount, optional max uses, and
            optional expiration date. Codes are validated via <Mono>POST /api/billing/validate-discount</Mono> before
            being applied as Stripe coupons (3-month repeating duration).
          </P>
        </div>

        {/* ─── 9. TELEMETRY ─────────────────────────────────────────── */}
        <div id="telemetry" data-section>
          <SectionHeading id="telemetry" title="9. Telemetry & Metrics" icon={Activity} />
        </div>

        <div id="tel-batching" data-section>
          <SectionHeading id="tel-batching" title="9.1 Batching Strategy" level={2} />
          <P>
            All SDKs batch telemetry events locally and flush them periodically to minimize network overhead.
            The batch is flushed when either condition is met: <strong className="text-[#EDEDED]">10 events</strong> accumulated,
            or <strong className="text-[#EDEDED]">60 seconds</strong> since last flush. Events include inference latency,
            tokens generated, success/failure status, and model ID.
          </P>
        </div>

        <div id="tel-metrics" data-section>
          <SectionHeading id="tel-metrics" title="9.2 Device Metrics" level={2} />
          <P>
            Device metrics are aggregated into hourly buckets in the <Mono>device_metrics</Mono> table. Each
            bucket tracks inference count, total tokens, average latency, error count, and success count.
            Running statistics on the <Mono>devices</Mono> table (total_inferences, avg_latency_ms, success_rate)
            are updated on each telemetry submission.
          </P>
        </div>

        <div id="tel-analytics" data-section>
          <SectionHeading id="tel-analytics" title="9.3 Analytics Overview" level={2} />
          <P>
            The <Mono>GET /api/analytics/overview</Mono> endpoint returns a dashboard-ready analytics payload
            including: total and active device counts, today's inference/token counts, all-time totals,
            model distribution breakdown, 24-hour activity histogram, and estimated cost savings
            (calculated at $0.01 per 1K tokens compared to cloud API pricing).
          </P>
        </div>

        {/* ─── 10. DATABASE SCHEMA ──────────────────────────────────── */}
        <div id="database" data-section>
          <SectionHeading id="database" title="10. Database Schema" icon={HardDrive} />
          <P>
            SlyOS uses PostgreSQL with the pgvector extension for vector embeddings. The schema consists of
            15 tables organized into core, RAG, and billing domains.
          </P>
        </div>

        <div id="db-core" data-section>
          <SectionHeading id="db-core" title="10.1 Core Tables" level={2} />
          <DocTable
            headers={['Table', 'Key Columns', 'Purpose']}
            rows={[
              ['users', 'id, email, password_hash, organization_id, role', 'User accounts with bcrypt passwords'],
              ['organizations', 'id, name, api_key, stripe_customer_id, subscription_status, plan_type, trial_ends_at', 'Tenant organizations with billing state'],
              ['devices', 'id, device_id, platform, os_version, total_memory_mb, cpu_cores, gpu_renderer, slyos_score, ...', 'Registered devices with intelligence fields'],
              ['device_capabilities', 'device_id, wasm_available, webgpu_available, max_model_size_mb, supported_quants', 'Per-device capability flags'],
              ['device_metrics', 'device_id, metric_hour, inference_count, total_tokens, avg_latency_ms', 'Hourly aggregated inference metrics'],
              ['telemetry_events', 'device_id, model_id, event_type, latency_ms, tokens_generated, success', 'Raw telemetry event log'],
              ['analytics_daily', 'organization_id, date, total_inferences, total_tokens_generated', 'Daily org-level aggregates'],
              ['models', 'model_id, name, tier, parameters_b, recommended, enabled', 'Available model definitions'],
              ['device_models', 'device_id, model_id, total_inferences', 'Per-device model usage tracking'],
              ['ideas', 'id, title, description, category, vote_count, status', 'Community feature requests'],
              ['idea_votes', 'idea_id, user_id, vote', 'User votes on ideas'],
            ]}
          />
        </div>

        <div id="db-rag" data-section>
          <SectionHeading id="db-rag" title="10.2 RAG Tables" level={2} />
          <DocTable
            headers={['Table', 'Key Columns', 'Purpose']}
            rows={[
              ['knowledge_bases', 'id, name, tier, model_id, chunk_size, chunk_overlap, embedding_model', 'Knowledge base configurations'],
              ['rag_documents', 'id, knowledge_base_id, name, file_type, content, chunk_count', 'Uploaded/scraped documents'],
              ['document_chunks', 'id, document_id, content, embedding (vector 384), metadata', 'Chunked text with pgvector embeddings'],
              ['rag_queries', 'knowledge_base_id, query_text, retrieved_chunks, latency_ms', 'Query audit log'],
              ['device_rag_sync', 'device_id, knowledge_base_id, sync_token, chunk_count, expires_at', 'Device sync state (7-day expiry)'],
            ]}
          />
        </div>

        <div id="db-billing" data-section>
          <SectionHeading id="db-billing" title="10.3 Billing Tables" level={2} />
          <DocTable
            headers={['Table', 'Key Columns', 'Purpose']}
            rows={[
              ['discount_codes', 'code, percent_off, max_uses, times_used, expires_at, active', 'Reusable discount codes for checkout'],
              ['credit_ledger', 'organization_id, amount, reason', 'Legacy credit transaction log'],
            ]}
          />
        </div>

        {/* ─── 11. ERROR HANDLING ───────────────────────────────────── */}
        <div id="error-handling" data-section>
          <SectionHeading id="error-handling" title="11. Error Handling" icon={Shield} />
        </div>

        <div id="err-codes" data-section>
          <SectionHeading id="err-codes" title="11.1 HTTP Status Codes" level={2} />
          <DocTable
            headers={['Code', 'Meaning', 'Common Causes']}
            rows={[
              ['200', 'Success', 'Request completed successfully'],
              ['201', 'Created', 'Resource created (user, device, KB, idea)'],
              ['400', 'Bad Request', 'Missing required fields, validation errors'],
              ['401', 'Unauthorized', 'Missing or invalid JWT token'],
              ['402', 'Payment Required', 'Subscription expired, trial ended'],
              ['403', 'Forbidden', 'Wrong plan tier, device disabled, not owner'],
              ['404', 'Not Found', 'Resource doesn\'t exist or wrong organization'],
              ['409', 'Conflict', 'Duplicate email on registration'],
              ['413', 'Payload Too Large', 'File upload exceeds 200MB limit'],
              ['429', 'Too Many Requests', 'Rate limit exceeded (20/15min auth, 200/60s API)'],
              ['500', 'Server Error', 'Unexpected internal error'],
            ]}
          />
        </div>

        <div id="err-billing" data-section>
          <SectionHeading id="err-billing" title="11.2 Billing Errors" level={2} />
          <P>
            Billing-related errors return structured responses with a <Mono>billing_url</Mono> field
            pointing to the upgrade page, and a <Mono>required_plan</Mono> field indicating which plan
            is needed. RAG endpoints return 403 with <Mono>required_plan: "hybrid_rag"</Mono> for
            Pure Edge subscribers.
          </P>
          <CodeBlock language="json" code={`{
  "error": "RAG features unavailable",
  "message": "RAG features require the Hybrid RAG plan...",
  "billing_url": "/dashboard/billing",
  "required_plan": "hybrid_rag"
}`} />
        </div>

        {/* ─── Footer ───────────────────────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#555555]">SlyOS Platform Documentation</div>
              <div className="text-[10px] font-mono text-[#555555] mt-1">v1.4.1 — Belto Inc. All rights reserved.</div>
            </div>
            <div className="text-[10px] font-mono text-[#555555]">
              Proprietary and confidential
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
