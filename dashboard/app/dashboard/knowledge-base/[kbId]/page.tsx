'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  getKnowledgeBase, getDocuments, uploadDocuments, deleteDocument, scrapeUrl,
  updateKnowledgeBase, deleteKnowledgeBase
} from '@/lib/rag-api';
import {
  Upload, Trash2, AlertTriangle, X, Check, Loader, FileText, File, Globe,
  ArrowLeft, Settings, BookOpen, Copy, Code2, ChevronDown, ChevronUp,
  HardDrive, Database, Zap, Save, Cpu
} from 'lucide-react';

const MODELS = [
  { id: 'quantum-1.7b', name: 'Quantum 1.7B', desc: 'Fastest — great for quick Q&A' },
  { id: 'quantum-3b', name: 'Quantum 3B', desc: 'Balanced speed and intelligence' },
  { id: 'quantum-code-3b', name: 'Quantum Code 3B', desc: 'Optimized for code and technical docs' },
  { id: 'quantum-8b', name: 'Quantum 8B', desc: 'Most capable — best for complex analysis' },
];

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return <FileText className="w-5 h-5 text-red-400" />;
  if (['txt', 'md'].includes(ext || '')) return <File className="w-5 h-5 text-blue-400" />;
  if (['doc', 'docx'].includes(ext || '')) return <File className="w-5 h-5 text-blue-600" />;
  if (['csv'].includes(ext || '')) return <File className="w-5 h-5 text-green-400" />;
  if (['url'].includes(ext || '')) return <Globe className="w-5 h-5 text-orange-400" />;
  return <File className="w-5 h-5 text-gray-400" />;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export default function KBDetailPage() {
  const params = useParams();
  const router = useRouter();
  const kbId = params.kbId as string;

  const [kb, setKb] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scrape
  const [scrapeUrl_, setScrapeUrl] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);

  // LM Configuration (editable)
  const [configModel, setConfigModel] = useState('quantum-3b');
  const [configPrompt, setConfigPrompt] = useState('');
  const [configTemp, setConfigTemp] = useState(0.7);
  const [configTopK, setConfigTopK] = useState(5);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  // UI
  const [showCode, setShowCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showDeleteKb, setShowDeleteKb] = useState(false);
  const [deletingKb, setDeletingKb] = useState(false);

  const loadData = async () => {
    try {
      const [kbData, docsData] = await Promise.all([
        getKnowledgeBase(kbId),
        getDocuments(kbId),
      ]);
      setKb(kbData);
      setDocuments(docsData);
      // Initialize config from KB data
      setConfigModel(kbData.model_id || 'quantum-3b');
      setConfigPrompt(kbData.system_prompt || '');
      setConfigTemp(parseFloat(kbData.temperature) || 0.7);
      setConfigTopK(parseInt(kbData.top_k) || 5);
      setConfigDirty(false);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [kbId]);
  useEffect(() => { if (notification) { const t = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(t); } }, [notification]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await uploadDocuments(kbId, files);
      setNotification({ type: 'success', message: `${files.length} source(s) added — indexing in progress` });
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(Array.from(e.dataTransfer.files));
  };

  const handleDeleteDocument = async (docId: string) => {
    setActionLoading(docId);
    try {
      await deleteDocument(kbId, docId);
      setConfirmDelete(null);
      setNotification({ type: 'success', message: 'Source removed' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to remove source' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleScrapeUrl = async () => {
    if (!scrapeUrl_.trim()) return;
    setScrapingUrl(true);
    try {
      await scrapeUrl(kbId, scrapeUrl_);
      setNotification({ type: 'success', message: 'Website scraped and added' });
      setScrapeUrl('');
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to scrape' });
    } finally {
      setScrapingUrl(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const updated = await updateKnowledgeBase(kbId, {
        model_id: configModel,
        system_prompt: configPrompt,
        temperature: configTemp,
        top_k: configTopK,
      });
      setKb(updated);
      setConfigDirty(false);
      setNotification({ type: 'success', message: 'Configuration saved' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to save configuration' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDeleteKb = async () => {
    setDeletingKb(true);
    try {
      await deleteKnowledgeBase(kbId);
      router.push('/dashboard/knowledge-base');
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete' });
      setDeletingKb(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const markDirty = () => setConfigDirty(true);

  const indexedCount = documents.filter(d => d.indexed).length;
  const totalChunks = documents.reduce((sum: number, d: any) => sum + (d.chunk_count || 0), 0);

  // Code snippets — use live config values
  const sysPromptArg = configPrompt ? `\n  systemPrompt: \`${configPrompt.slice(0, 60)}${configPrompt.length > 60 ? '...' : ''}\`,` : '';
  const tier2Code = `import SlyOS from '@emilshirokikh/slyos-sdk';

const slyos = new SlyOS({ apiKey: 'YOUR_API_KEY' });
await slyos.initialize();

// Query your knowledge base
const result = await slyos.ragQuery({
  knowledgeBaseId: '${kbId}',
  modelId: '${configModel}',
  query: 'What does the document say about...?',
  topK: ${configTopK},
  temperature: ${configTemp},${sysPromptArg}
});

console.log(result.generatedResponse);
console.log(result.retrievedChunks);`;

  const tier1Code = `// Tier 1: Fully local — zero network calls
const result = await slyos.ragQueryLocal({
  modelId: '${configModel}',
  query: 'Your question here',
  topK: ${configTopK},
  temperature: ${configTemp},${sysPromptArg}
  documents: [
    { content: '...', name: 'doc.pdf' }
  ],
});`;

  const tier3Code = `// Tier 3: Sync once, query offline forever
await slyos.syncKnowledgeBase('${kbId}');

const result = await slyos.ragQueryOffline({
  knowledgeBaseId: '${kbId}',
  modelId: '${configModel}',
  query: 'Works without internet',
  topK: ${configTopK},
  temperature: ${configTemp},${sysPromptArg}
});`;

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border mb-4 ${
          notification.type === 'success' ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'
        }`}>
          {notification.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <p className="text-xs flex-1">{notification.message}</p>
          <button onClick={() => setNotification(null)}><X className="w-3.5 h-3.5 opacity-70" /></button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/dashboard/knowledge-base')} className="text-[#555555] hover:text-[#EDEDED] transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#EDEDED]">{kb?.name}</h1>
          {kb?.description && <p className="text-sm text-[#555555] mt-0.5">{kb.description}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Sources', value: documents.length, icon: <HardDrive className="w-4 h-4 text-[#3b82f6]" /> },
          { label: 'Indexed', value: `${indexedCount}/${documents.length}`, icon: <Check className="w-4 h-4 text-[#4ade80]" /> },
          { label: 'Chunks', value: totalChunks, icon: <Database className="w-4 h-4 text-[#a855f7]" /> },
          { label: 'Model', value: (kb?.model_id || configModel).replace('quantum-', '').toUpperCase(), icon: <Zap className="w-4 h-4 text-[#FF4D00]" /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              {stat.icon}
              <span className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-[#EDEDED]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ═══ Upload Section ═══ */}
      <div className="bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-[#EDEDED] mb-4">Add Sources</h2>

        {/* File Upload */}
        <div
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-4 ${
            dragActive ? 'border-[#FF4D00] bg-[rgba(255,77,0,0.08)]' : 'border-[rgba(255,255,255,0.1)] hover:border-[#FF4D00]/40 hover:bg-[rgba(255,77,0,0.03)]'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-3">
              <Loader className="w-6 h-6 animate-spin text-[#FF4D00]" />
              <span className="text-sm text-[#888888]">Uploading and indexing...</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-3 text-[#555555]" />
              <p className="text-sm text-[#EDEDED] font-medium mb-1">
                Drop files here or <span className="text-[#FF4D00]">click to browse</span>
              </p>
              <p className="text-xs text-[#555555]">
                Supports PDF, DOCX, TXT, Markdown, CSV — up to 50MB per file
              </p>
            </>
          )}
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.csv"
            onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
            className="hidden" disabled={uploading} />
        </div>

        {/* URL Scraper */}
        <div>
          <label className="text-xs text-[#888888] font-medium mb-2 block">Add website URL</label>
          <div className="flex gap-2">
            <input
              type="url" placeholder="https://docs.example.com/page"
              value={scrapeUrl_} onChange={(e) => setScrapeUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleScrapeUrl(); }}
              className="flex-1 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]"
              disabled={scrapingUrl}
            />
            <Button onClick={handleScrapeUrl} disabled={scrapingUrl || !scrapeUrl_.trim()} className="gap-2 px-5">
              {scrapingUrl ? <Loader className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              {scrapingUrl ? 'Scraping...' : 'Add URL'}
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ Sources List ═══ */}
      <div className="bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#EDEDED]">Sources</h2>
          <span className="text-xs text-[#555555]">{documents.length} total</span>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-[#333333]" />
            <p className="text-sm text-[#555555]">No sources yet</p>
            <p className="text-xs text-[#444444] mt-1">Upload documents or add URLs above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id}
                className="flex items-center gap-4 p-4 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.04)] rounded-xl hover:border-[rgba(255,255,255,0.08)] transition-all group"
              >
                {getFileIcon(doc.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#EDEDED] font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[#555555]">{doc.file_type?.toUpperCase()}</span>
                    <span className="text-xs text-[#555555]">{formatBytes(doc.file_size_bytes)}</span>
                    <span className="text-xs text-[#555555]">{doc.chunk_count || 0} chunks</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {doc.indexed ? (
                    <span className="flex items-center gap-1.5 text-xs text-[#4ade80] bg-[#4ade80]/10 px-2.5 py-1 rounded-lg">
                      <Check className="w-3 h-3" /> Indexed
                    </span>
                  ) : doc.indexing_error ? (
                    <span className="flex items-center gap-1.5 text-xs text-[#ef4444] bg-[#ef4444]/10 px-2.5 py-1 rounded-lg">
                      <AlertTriangle className="w-3 h-3" /> Failed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-[#888888] bg-[rgba(255,255,255,0.05)] px-2.5 py-1 rounded-lg">
                      <Loader className="w-3 h-3 animate-spin" /> Indexing
                    </span>
                  )}
                  {confirmDelete === doc.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#555555] hover:text-[#EDEDED] px-2 py-1">Cancel</button>
                      <button onClick={() => handleDeleteDocument(doc.id)} disabled={actionLoading === doc.id}
                        className="text-xs text-[#ef4444] hover:text-[#ff6666] px-2 py-1">Remove</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(doc.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#555555] hover:text-[#ef4444] transition-all p-1.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ LM Configuration (Editable) ═══ */}
      <div className="bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#FF4D00]" />
            <h2 className="text-lg font-semibold text-[#EDEDED]">Configure Deployment</h2>
          </div>
          {configDirty && (
            <Button onClick={handleSaveConfig} disabled={savingConfig} className="gap-2 text-xs">
              {savingConfig ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {savingConfig ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>

        {/* Model Selector */}
        <div className="mb-5">
          <label className="text-xs text-[#888888] font-medium mb-2 block">Language Model</label>
          <div className="grid grid-cols-2 gap-2">
            {MODELS.map((m) => (
              <button key={m.id}
                onClick={() => { setConfigModel(m.id); markDirty(); }}
                className={`text-left p-3 rounded-xl border transition-all ${
                  configModel === m.id
                    ? 'border-[#FF4D00]/50 bg-[#FF4D00]/5'
                    : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-[#FF4D00]" />
                  <p className="text-sm font-semibold text-[#EDEDED]">{m.name}</p>
                </div>
                <p className="text-xs text-[#555555] mt-0.5 ml-5.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt */}
        <div className="mb-5">
          <label className="text-xs text-[#888888] font-medium mb-2 block">System Prompt</label>
          <textarea
            value={configPrompt}
            onChange={(e) => { setConfigPrompt(e.target.value); markDirty(); }}
            placeholder="You are a helpful assistant that answers questions based on the provided documents..."
            className="w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00] resize-none h-24"
          />
        </div>

        {/* Temperature + Top-K + KB Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-2 block">
              Temperature: {configTemp}
            </label>
            <input type="range" min="0" max="2" step="0.1"
              value={configTemp}
              onChange={(e) => { setConfigTemp(parseFloat(e.target.value)); markDirty(); }}
              className="w-full accent-[#FF4D00]"
            />
            <div className="flex justify-between text-[10px] text-[#444444] mt-1">
              <span>Precise</span><span>Creative</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-2 block">
              Top-K Results: {configTopK}
            </label>
            <input type="range" min="1" max="20" step="1"
              value={configTopK}
              onChange={(e) => { setConfigTopK(parseInt(e.target.value)); markDirty(); }}
              className="w-full accent-[#FF4D00]"
            />
            <div className="flex justify-between text-[10px] text-[#444444] mt-1">
              <span>Focused</span><span>Broad</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1">Chunk Size</p>
            <p className="text-sm text-[#EDEDED] font-medium">{kb?.chunk_size || 512} tokens</p>
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1 mt-2">Overlap</p>
            <p className="text-sm text-[#EDEDED] font-medium">{kb?.chunk_overlap || 128} tokens</p>
          </div>
          <div>
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1">Knowledge Base ID</p>
            <button onClick={() => copyCode(kbId, 'kbid')} className="flex items-center gap-1.5 text-sm text-[#FF4D00] font-mono hover:underline">
              {kbId.slice(0, 8)}...
              {copiedCode === 'kbid' ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
            </button>
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1 mt-2">Embedding</p>
            <p className="text-sm text-[#EDEDED] font-medium">all-MiniLM-L6-v2</p>
          </div>
        </div>
      </div>

      {/* ═══ SDK Integration ═══ */}
      <div className="bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 mb-6">
        <button onClick={() => setShowCode(!showCode)} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-[#FF4D00]" />
            <h2 className="text-lg font-semibold text-[#EDEDED]">SDK Integration</h2>
          </div>
          {showCode ? <ChevronUp className="w-5 h-5 text-[#555555]" /> : <ChevronDown className="w-5 h-5 text-[#555555]" />}
        </button>

        {showCode && (
          <div className="mt-4 space-y-4">
            {[
              { id: 'tier2', label: 'Tier 2 — Cloud-indexed + Local Inference', color: 'text-[#3b82f6]', code: tier2Code },
              { id: 'tier1', label: 'Tier 1 — Fully Local (Air-Gapped)', color: 'text-[#4ade80]', code: tier1Code },
              { id: 'tier3', label: 'Tier 3 — Offline (Sync & Go)', color: 'text-[#a855f7]', code: tier3Code },
            ].map((tier) => (
              <div key={tier.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-xs font-semibold ${tier.color}`}>{tier.label}</p>
                  <button onClick={() => copyCode(tier.code, tier.id)} className="flex items-center gap-1 text-xs text-[#555555] hover:text-[#EDEDED]">
                    {copiedCode === tier.id ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                    {copiedCode === tier.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 text-xs text-[#AAAAAA] overflow-x-auto">
                  <code>{tier.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Danger Zone ═══ */}
      <div className="bg-[#0A0A0A]/80 border border-[rgba(239,68,68,0.15)] rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-[#ef4444] mb-2">Danger Zone</h2>
        <p className="text-xs text-[#555555] mb-4">Permanently delete this knowledge base and all its sources, chunks, and configuration. This action cannot be undone.</p>
        {showDeleteKb ? (
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteKb(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleDeleteKb} disabled={deletingKb}
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs gap-2">
              {deletingKb ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {deletingKb ? 'Deleting...' : 'Yes, delete this knowledge base'}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowDeleteKb(true)} variant="ghost"
            className="text-[#ef4444] hover:text-[#ff6666] hover:bg-[#ef4444]/10 text-xs gap-2">
            <Trash2 className="w-3.5 h-3.5" /> Delete Knowledge Base
          </Button>
        )}
      </div>
    </div>
  );
}
