'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, Thermometer, Hash, Target, MessageCircle, ArrowLeft, ArrowRight, Code,
  Upload, Loader, FileText, File, Globe, Trash2, Check, X, AlertTriangle, BookOpen,
  Database, ChevronDown, ChevronUp, Copy, Code2, HardDrive
} from 'lucide-react';
import {
  getKnowledgeBases, createKnowledgeBase, getDocuments, uploadDocuments,
  deleteDocument, scrapeUrl, deleteKnowledgeBase
} from '@/lib/rag-api';

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return <FileText className="w-4 h-4 text-red-400" />;
  if (['txt', 'md'].includes(ext || '')) return <File className="w-4 h-4 text-blue-400" />;
  if (['doc', 'docx'].includes(ext || '')) return <File className="w-4 h-4 text-blue-600" />;
  if (['csv'].includes(ext || '')) return <File className="w-4 h-4 text-green-400" />;
  return <Globe className="w-4 h-4 text-orange-400" />;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

export default function ConfigurePage() {
  const router = useRouter();
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [config, setConfig] = useState({
    temperature: 0.7, maxTokens: 100, topP: 0.9, contextWindow: 2048,
    systemPrompt: "You are a helpful AI assistant. Be concise and accurate."
  });

  // RAG state
  const [kb, setKb] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [ragLoading, setRagLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scrapeUrl_, setScrapeUrl] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showRag, setShowRag] = useState(true);

  useEffect(() => {
    const savedModelId = localStorage.getItem('primaryModel');
    const savedModelName = localStorage.getItem('primaryModelName');
    if (!savedModelId) { router.push('/dashboard/models'); return; }
    setModelId(savedModelId);
    setModelName(savedModelName || savedModelId);
    const savedConfig = localStorage.getItem(`config-${savedModelId}`);
    if (savedConfig) {
      try { setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) })); } catch (e) {}
    }
    // Load or create KB for this model
    loadOrCreateKB(savedModelId);
  }, [router]);

  useEffect(() => {
    if (notification) { const t = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(t); }
  }, [notification]);

  const loadOrCreateKB = async (mId: string) => {
    setRagLoading(true);
    try {
      const kbs = await getKnowledgeBases();
      // Find KB matching this model deployment
      let existing = kbs.find((k: any) => k.model_id === mId);
      if (!existing && kbs.length > 0) existing = kbs[0]; // fallback to first KB

      if (existing) {
        setKb(existing);
        const docs = await getDocuments(existing.id);
        setDocuments(docs);
      }
      // If no KB exists, that's fine — we'll create one on first upload
    } catch (err) {
      console.error('Failed to load RAG data:', err);
    } finally {
      setRagLoading(false);
    }
  };

  const ensureKB = async (): Promise<string> => {
    if (kb) return kb.id;
    // Auto-create KB on first upload
    const newKb = await createKnowledgeBase({
      name: `${modelName} RAG`,
      description: `Knowledge base for ${modelName} deployment`,
      model_id: modelId,
      tier: 2,
      chunk_size: 512,
      chunk_overlap: 128,
    });
    setKb(newKb);
    return newKb.id;
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const kbId = await ensureKB();
      const result = await uploadDocuments(kbId, files);
      const noTextDocs = result?.documents?.filter((d: any) => d.chunks === 0) || [];
      if (noTextDocs.length > 0) {
        setNotification({ type: 'error', message: `${noTextDocs.map((d: any) => d.name).join(', ')}: No text extracted — likely scanned/image-based PDF` });
      } else {
        setNotification({ type: 'success', message: `${files.length} source(s) added — ${result?.documents?.reduce((sum: number, d: any) => sum + d.chunks, 0) || 0} chunks created` });
      }
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const docs = await getDocuments(kbId);
      setDocuments(docs);
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
    if (!kb) return;
    setDeletingDoc(true);
    try {
      await deleteDocument(kb.id, docId);
      setConfirmDeleteDoc(null);
      setNotification({ type: 'success', message: 'Source removed' });
      const docs = await getDocuments(kb.id);
      setDocuments(docs);
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to remove source' });
    } finally {
      setDeletingDoc(false);
    }
  };

  const handleScrapeUrl = async () => {
    if (!scrapeUrl_.trim()) return;
    setScrapingUrl(true);
    try {
      const kbId = await ensureKB();
      await scrapeUrl(kbId, scrapeUrl_);
      setNotification({ type: 'success', message: 'Website scraped and added' });
      setScrapeUrl('');
      const docs = await getDocuments(kbId);
      setDocuments(docs);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to scrape' });
    } finally {
      setScrapingUrl(false);
    }
  };

  const saveAndContinue = () => {
    localStorage.setItem(`config-${modelId}`, JSON.stringify(config));
    if (kb) localStorage.setItem('activeKbId', kb.id);
    router.push('/dashboard/get-started');
  };

  const indexedCount = documents.filter(d => d.indexed).length;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED]">Configure {modelName}</h1>
        <p className="text-sm text-[#888888] mt-2">Customize model behavior, upload RAG data, and set parameters</p>
      </div>

      {/* ═══ System Prompt ═══ */}
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
          <p className="text-xs text-[#666666] mt-3">Define the AI&apos;s role, tasks, tone, and limitations for your use case.</p>
        </div>
      </div>

      {/* ═══ RAG Data Upload ═══ */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden mb-6">
        <button onClick={() => setShowRag(!showRag)} className="w-full p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-[#FF4D00]" />
            <h3 className="text-base font-semibold text-[#EDEDED]">RAG Knowledge Base</h3>
            <span className="text-[10px] bg-[rgba(255,255,255,0.06)] text-[#888888] px-2.5 py-1 rounded-lg font-semibold">
              {documents.length > 0 ? `${documents.length} source${documents.length !== 1 ? 's' : ''}` : 'Optional'}
            </span>
          </div>
          {showRag ? <ChevronUp className="w-5 h-5 text-[#555555]" /> : <ChevronDown className="w-5 h-5 text-[#555555]" />}
        </button>

        {showRag && (
          <div className="px-6 pb-6 -mt-2">
            <p className="text-xs text-[#666666] mb-4">Upload documents to give your model context. Files are chunked, embedded, and stored as a vector database for retrieval.</p>

            {ragLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 animate-spin text-[#FF4D00]" />
              </div>
            ) : (
              <>
                {/* File Upload Drop Zone */}
                <div
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 mb-4 ${
                    dragActive ? 'border-[#FF4D00] bg-[rgba(255,77,0,0.08)]' : 'border-[rgba(255,255,255,0.1)] hover:border-[#FF4D00]/40 hover:bg-[rgba(255,77,0,0.03)]'
                  }`}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader className="w-5 h-5 animate-spin text-[#FF4D00]" />
                      <span className="text-sm text-[#888888]">Uploading and indexing...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 mx-auto mb-2 text-[#555555]" />
                      <p className="text-sm text-[#EDEDED] font-medium mb-1">
                        Drop files here or <span className="text-[#FF4D00]">click to browse</span>
                      </p>
                      <p className="text-xs text-[#555555]">PDF, DOCX, TXT, Markdown, CSV — up to 50MB</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.csv"
                    onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
                    className="hidden" disabled={uploading} />
                </div>

                {/* URL Scraper */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="url" placeholder="https://docs.example.com/page"
                    value={scrapeUrl_} onChange={(e) => setScrapeUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleScrapeUrl(); }}
                    className="flex-1 bg-[#050505] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2.5 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]"
                    disabled={scrapingUrl}
                  />
                  <Button onClick={handleScrapeUrl} disabled={scrapingUrl || !scrapeUrl_.trim()} className="gap-2 px-4">
                    {scrapingUrl ? <Loader className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    {scrapingUrl ? 'Scraping...' : 'Add URL'}
                  </Button>
                </div>

                {/* Sources List */}
                {documents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#555555] font-semibold uppercase tracking-wider">Sources</span>
                      <span className="text-xs text-[#555555]">{indexedCount}/{documents.length} indexed</span>
                    </div>
                    {documents.map((doc) => (
                      <div key={doc.id}
                        className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.04)] rounded-lg hover:border-[rgba(255,255,255,0.08)] transition-all group"
                      >
                        {getFileIcon(doc.name)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#EDEDED] truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#555555]">{doc.file_type?.toUpperCase()}</span>
                            <span className="text-[10px] text-[#555555]">{formatBytes(doc.file_size_bytes)}</span>
                            <span className="text-[10px] text-[#555555]">{doc.chunk_count || 0} chunks</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.indexed ? (
                            <span className="text-[10px] text-[#4ade80]"><Check className="w-3 h-3" /></span>
                          ) : doc.indexing_error ? (
                            <span className="text-[10px] text-[#ef4444]"><AlertTriangle className="w-3 h-3" /></span>
                          ) : (
                            <Loader className="w-3 h-3 animate-spin text-[#888888]" />
                          )}
                          {confirmDeleteDoc === doc.id ? (
                            <div className="flex gap-1.5 items-center">
                              <button onClick={() => setConfirmDeleteDoc(null)}
                                className="text-xs text-[#888888] hover:text-[#EDEDED] px-2 py-1 rounded bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] transition-all">Cancel</button>
                              <button onClick={() => handleDeleteDocument(doc.id)} disabled={deletingDoc}
                                className="text-xs text-white bg-[#ef4444] hover:bg-[#dc2626] px-2 py-1 rounded transition-all disabled:opacity-50">
                                {deletingDoc ? 'Removing...' : 'Remove'}
                              </button>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteDoc(doc.id); }}
                              className="text-[#666666] hover:text-[#ef4444] transition-all p-1 rounded hover:bg-[rgba(239,68,68,0.1)]">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ Parameters ═══ */}
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

      {/* ═══ Config Preview ═══ */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,77,0,0.2)] rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2.5 mb-4">
          <Code className="w-5 h-5 text-[#FF4D00]" />
          <h3 className="text-base font-semibold text-[#EDEDED]">Configuration Preview</h3>
        </div>
        <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#4ade80] overflow-x-auto">
{`{
  "model": "${modelId}",
  "systemPrompt": "${(config.systemPrompt).substring(0, 60)}...",
  "temperature": ${config.temperature},
  "maxTokens": ${config.maxTokens},
  "topP": ${config.topP},
  "contextWindow": ${config.contextWindow}${kb ? `,\n  "knowledgeBaseId": "${kb.id}",\n  "ragSources": ${documents.length}` : ''}
}`}
        </div>
      </div>

      {/* ═══ Navigation ═══ */}
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
