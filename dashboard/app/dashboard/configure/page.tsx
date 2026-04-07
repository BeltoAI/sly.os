'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare, Thermometer, Hash, Target, MessageCircle, ArrowLeft, ArrowRight, Code,
  Upload, Loader, FileText, File, Globe, Trash2, Check, X, AlertTriangle, BookOpen,
  Database, ChevronDown, ChevronUp, Lock, Search, RefreshCw, Layers, Sliders, Zap
} from 'lucide-react';
import {
  getKnowledgeBases, createKnowledgeBase, getDocuments, uploadDocuments,
  deleteDocument, scrapeUrl, updateKnowledgeBase, ragSearch
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
  const [userPlan, setUserPlan] = useState<string>('pure_edge');

  // RAG advanced config
  const [ragConfig, setRagConfig] = useState({ chunkSize: 512, chunkOverlap: 128, topK: 5 });
  const [showRagConfig, setShowRagConfig] = useState(false);
  const [savingRagConfig, setSavingRagConfig] = useState(false);

  // RAG test search
  const [showRagTest, setShowRagTest] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  // Auto-refresh for pending docs
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    // Load user plan from localStorage (set by billing page)
    const savedPlan = localStorage.getItem('userPlan');
    if (savedPlan) setUserPlan(savedPlan);
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
      let existing = kbs.find((k: any) => k.model_id === mId);
      if (!existing && kbs.length > 0) existing = kbs[0];

      if (existing) {
        setKb(existing);
        if (existing.chunk_size) setRagConfig(prev => ({
          ...prev,
          chunkSize: existing.chunk_size,
          chunkOverlap: existing.chunk_overlap ?? 128,
          topK: existing.top_k ?? 5,
        }));
        const docs = await getDocuments(existing.id);
        setDocuments(docs);
        scheduleRefreshIfPending(docs, existing.id);
      }
    } catch (err) {
      console.error('Failed to load RAG data:', err);
    } finally {
      setRagLoading(false);
    }
  };

  // Auto-refresh docs while any are still indexing
  const scheduleRefreshIfPending = useCallback((docs: any[], kbId: string) => {
    const hasPending = docs.some(d => !d.indexed && !d.indexing_error);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    if (hasPending) {
      refreshTimerRef.current = setTimeout(async () => {
        try {
          const updated = await getDocuments(kbId);
          setDocuments(updated);
          scheduleRefreshIfPending(updated, kbId);
        } catch {}
      }, 4000);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => { return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); }; }, []);

  const saveRagConfig = async () => {
    if (!kb) return;
    setSavingRagConfig(true);
    try {
      await updateKnowledgeBase(kb.id, {
        chunk_size: ragConfig.chunkSize,
        chunk_overlap: ragConfig.chunkOverlap,
        top_k: ragConfig.topK,
      });
      setNotification({ type: 'success', message: 'RAG configuration saved' });
    } catch {
      setNotification({ type: 'error', message: 'Failed to save RAG config' });
    } finally {
      setSavingRagConfig(false);
    }
  };

  const handleTestSearch = async () => {
    if (!kb || !testQuery.trim()) return;
    setTesting(true);
    setTestResults([]);
    try {
      const res = await ragSearch(kb.id, testQuery, ragConfig.topK);
      setTestResults(res.results || res.chunks || []);
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Search failed — ' + (err.response?.data?.error || err.message) });
    } finally {
      setTesting(false);
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
      scheduleRefreshIfPending(docs, kbId);
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
      scheduleRefreshIfPending(docs, kbId);
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
  const pendingCount = documents.filter(d => !d.indexed && !d.indexing_error).length;
  const errorCount = documents.filter(d => d.indexing_error).length;
  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

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

      {/* ═══ RAG Knowledge Base ═══ */}
      <div className={`backdrop-blur-xl bg-[#0A0A0A]/80 border rounded-2xl overflow-hidden mb-6 ${
        userPlan === 'pure_edge' ? 'border-[rgba(255,77,0,0.3)]' : 'border-[rgba(255,255,255,0.08)]'
      }`}>
        {userPlan === 'pure_edge' && (
          <div className="p-4 bg-[rgba(255,77,0,0.08)] border-b border-[rgba(255,77,0,0.2)] flex items-start gap-3">
            <Lock className="w-4 h-4 text-[#FF4D00] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#EDEDED] mb-1">Upgrade to Hybrid RAG</p>
              <p className="text-xs text-[#888888]">RAG knowledge bases are only available on the Hybrid RAG plan. Upgrade now to add documents and use vector search.</p>
              <a href="/dashboard/billing" className="text-xs text-[#FF4D00] hover:text-[#FF6B35] font-semibold mt-2 inline-block">
                View Plans & Upgrade
              </a>
            </div>
          </div>
        )}

        {/* Header toggle */}
        <button onClick={() => setShowRag(!showRag)} className="w-full p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-[#FF4D00]" />
            <h3 className="text-base font-semibold text-[#EDEDED]">RAG Knowledge Base</h3>
            {documents.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-[rgba(74,222,128,0.12)] text-[#4ade80] px-2 py-0.5 rounded font-semibold">{indexedCount} ready</span>
                {pendingCount > 0 && <span className="text-[10px] bg-[rgba(251,191,36,0.12)] text-[#fbbf24] px-2 py-0.5 rounded font-semibold">{pendingCount} indexing</span>}
                {errorCount > 0 && <span className="text-[10px] bg-[rgba(239,68,68,0.12)] text-[#ef4444] px-2 py-0.5 rounded font-semibold">{errorCount} failed</span>}
              </div>
            ) : (
              <span className="text-[10px] bg-[rgba(255,255,255,0.06)] text-[#888888] px-2.5 py-1 rounded-lg font-semibold">Optional</span>
            )}
          </div>
          {showRag ? <ChevronUp className="w-5 h-5 text-[#555555]" /> : <ChevronDown className="w-5 h-5 text-[#555555]" />}
        </button>

        {showRag && (
          <div className="px-6 pb-6 -mt-2">

            {/* Stats bar */}
            {documents.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Sources', value: documents.length },
                  { label: 'Total Chunks', value: totalChunks.toLocaleString() },
                  { label: 'Top-K Retrieval', value: ragConfig.topK },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-[#EDEDED]">{value}</div>
                    <div className="text-[10px] text-[#555555] mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}

            {userPlan === 'pure_edge' && (
              <div className="p-3 bg-[rgba(255,77,0,0.08)] border border-[rgba(255,77,0,0.15)] rounded-lg mb-4">
                <p className="text-xs text-[#FF4D00]">RAG features require the Hybrid RAG plan. <a href="/dashboard/billing" className="underline hover:no-underline">Upgrade now</a></p>
              </div>
            )}

            {ragLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 animate-spin text-[#FF4D00]" />
              </div>
            ) : (
              <>
                {/* File Upload Drop Zone */}
                <div
                  onDragEnter={userPlan === 'hybrid_rag' ? handleDrag : undefined}
                  onDragLeave={userPlan === 'hybrid_rag' ? handleDrag : undefined}
                  onDragOver={userPlan === 'hybrid_rag' ? handleDrag : undefined}
                  onDrop={userPlan === 'hybrid_rag' ? handleDrop : undefined}
                  onClick={() => userPlan === 'hybrid_rag' && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 mb-4 ${
                    userPlan === 'pure_edge'
                      ? 'border-[rgba(255,77,0,0.2)] bg-[rgba(255,77,0,0.05)] cursor-not-allowed opacity-60'
                      : dragActive ? 'border-[#FF4D00] bg-[rgba(255,77,0,0.08)] cursor-pointer' : 'border-[rgba(255,255,255,0.1)] hover:border-[#FF4D00]/40 hover:bg-[rgba(255,77,0,0.03)] cursor-pointer'
                  }`}
                >
                  {userPlan === 'pure_edge' ? (
                    <>
                      <Lock className="w-7 h-7 mx-auto mb-2 text-[#FF4D00]" />
                      <p className="text-sm text-[#EDEDED] font-medium mb-1">RAG features require Hybrid RAG plan</p>
                      <p className="text-xs text-[#888888]">Upgrade to unlock knowledge bases and document upload</p>
                    </>
                  ) : uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader className="w-5 h-5 animate-spin text-[#FF4D00]" />
                      <span className="text-sm text-[#888888]">Uploading and chunking...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 mx-auto mb-2 text-[#555555]" />
                      <p className="text-sm text-[#EDEDED] font-medium mb-1">
                        Drop files here or <span className="text-[#FF4D00]">click to browse</span>
                      </p>
                      <p className="text-xs text-[#555555]">PDF, DOCX, TXT, Markdown, CSV — up to 50MB per file</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.md,.csv"
                    onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
                    className="hidden" disabled={uploading || userPlan === 'pure_edge'} />
                </div>

                {/* URL Scraper */}
                <div className="flex gap-2 mb-5">
                  <input
                    type="url" placeholder="https://docs.example.com/page — scrape any public URL"
                    value={scrapeUrl_} onChange={(e) => setScrapeUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && userPlan === 'hybrid_rag') handleScrapeUrl(); }}
                    className={`flex-1 bg-[#050505] border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all ${
                      userPlan === 'pure_edge'
                        ? 'border-[rgba(255,77,0,0.2)] text-[#888888] placeholder-[#555555]/50 cursor-not-allowed opacity-50'
                        : 'border-[rgba(255,255,255,0.08)] text-[#EDEDED] placeholder-[#555555] focus:border-[#FF4D00]'
                    }`}
                    disabled={scrapingUrl || userPlan === 'pure_edge'}
                  />
                  <Button onClick={handleScrapeUrl} disabled={scrapingUrl || !scrapeUrl_.trim() || userPlan === 'pure_edge'} className="gap-2 px-4">
                    {scrapingUrl ? <Loader className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    {scrapingUrl ? 'Scraping...' : 'Add URL'}
                  </Button>
                </div>

                {/* Sources List */}
                {documents.length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#555555] font-semibold uppercase tracking-wider">Sources</span>
                      <div className="flex items-center gap-2">
                        {pendingCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-[#fbbf24]">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Auto-refreshing
                          </span>
                        )}
                        <span className="text-xs text-[#555555]">{indexedCount}/{documents.length} indexed · {totalChunks.toLocaleString()} chunks</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div key={doc.id}
                          className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.04)] rounded-lg hover:border-[rgba(255,255,255,0.08)] transition-all group"
                        >
                          {getFileIcon(doc.name)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#EDEDED] truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {doc.file_type && <span className="text-[10px] text-[#555555]">{doc.file_type.toUpperCase()}</span>}
                              {doc.file_size_bytes > 0 && <span className="text-[10px] text-[#555555]">{formatBytes(doc.file_size_bytes)}</span>}
                              <span className="text-[10px] text-[#555555]">{doc.chunk_count || 0} chunks</span>
                              {doc.indexing_error && (
                                <span className="text-[10px] text-[#ef4444] truncate max-w-[120px]" title={doc.indexing_error}>
                                  {doc.indexing_error.substring(0, 30)}...
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.indexed ? (
                              <span className="flex items-center gap-1 text-[10px] text-[#4ade80]"><Check className="w-3 h-3" /> Ready</span>
                            ) : doc.indexing_error ? (
                              <span className="flex items-center gap-1 text-[10px] text-[#ef4444]"><AlertTriangle className="w-3 h-3" /> Failed</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-[#fbbf24]"><Loader className="w-3 h-3 animate-spin" /> Indexing</span>
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
                  </div>
                )}

                {/* RAG Advanced Config */}
                {userPlan === 'hybrid_rag' && (
                  <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden mb-4">
                    <button
                      onClick={() => setShowRagConfig(!showRagConfig)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#FF4D00]" />
                        <span className="text-sm font-medium text-[#EDEDED]">Retrieval Settings</span>
                        <span className="text-[10px] text-[#555555]">chunk size, overlap, top-K</span>
                      </div>
                      {showRagConfig ? <ChevronUp className="w-4 h-4 text-[#555555]" /> : <ChevronDown className="w-4 h-4 text-[#555555]" />}
                    </button>

                    {showRagConfig && (
                      <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.06)]">
                        <p className="text-xs text-[#555555] mt-3 mb-4">
                          These settings apply when re-indexing new documents. Smaller chunks = more precise retrieval; larger = more context per result.
                        </p>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {[
                            { label: 'Chunk Size', key: 'chunkSize', min: 128, max: 2048, step: 128, hint: 'tokens per chunk' },
                            { label: 'Chunk Overlap', key: 'chunkOverlap', min: 0, max: 512, step: 32, hint: 'token overlap' },
                            { label: 'Top-K Results', key: 'topK', min: 1, max: 20, step: 1, hint: 'chunks retrieved' },
                          ].map(({ label, key, min, max, step, hint }) => (
                            <div key={key}>
                              <label className="text-[10px] text-[#888888] font-semibold uppercase tracking-wider">{label}</label>
                              <input
                                type="number" min={min} max={max} step={step}
                                value={(ragConfig as any)[key]}
                                onChange={(e) => setRagConfig(prev => ({ ...prev, [key]: parseInt(e.target.value) || min }))}
                                className="w-full mt-1.5 bg-[#050505] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#EDEDED] focus:outline-none focus:border-[rgba(255,77,0,0.4)] transition-all"
                              />
                              <p className="text-[10px] text-[#444444] mt-1">{hint}</p>
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={saveRagConfig}
                          disabled={savingRagConfig || !kb}
                          size="sm"
                          className="gap-2 bg-[rgba(255,77,0,0.15)] hover:bg-[rgba(255,77,0,0.25)] text-[#FF4D00] border border-[rgba(255,77,0,0.3)] hover:border-[rgba(255,77,0,0.5)]"
                        >
                          {savingRagConfig ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save Retrieval Config
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* RAG Test Search */}
                {userPlan === 'hybrid_rag' && documents.some(d => d.indexed) && (
                  <div className="border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowRagTest(!showRagTest)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#FF4D00]" />
                        <span className="text-sm font-medium text-[#EDEDED]">Test Retrieval</span>
                        <span className="text-[10px] text-[#555555]">preview what chunks your query would fetch</span>
                      </div>
                      {showRagTest ? <ChevronUp className="w-4 h-4 text-[#555555]" /> : <ChevronDown className="w-4 h-4 text-[#555555]" />}
                    </button>

                    {showRagTest && (
                      <div className="px-4 pb-4 border-t border-[rgba(255,255,255,0.06)]">
                        <div className="flex gap-2 mt-3 mb-3">
                          <input
                            type="text"
                            placeholder="Enter a test query..."
                            value={testQuery}
                            onChange={(e) => setTestQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleTestSearch(); }}
                            className="flex-1 bg-[#050505] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[rgba(255,77,0,0.4)] transition-all"
                          />
                          <Button onClick={handleTestSearch} disabled={testing || !testQuery.trim()} size="sm" className="gap-2 px-4">
                            {testing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            Search
                          </Button>
                        </div>

                        {testResults.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] text-[#555555] font-semibold uppercase tracking-wider mb-2">{testResults.length} chunks retrieved</p>
                            {testResults.map((r: any, i: number) => (
                              <div key={i} className="p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-lg">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] text-[#888888] truncate max-w-[200px]">{r.document_name || r.source || `Chunk ${i + 1}`}</span>
                                  {r.score !== undefined && (
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                      r.score > 0.8 ? 'bg-[rgba(74,222,128,0.12)] text-[#4ade80]' :
                                      r.score > 0.5 ? 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24]' :
                                      'bg-[rgba(255,255,255,0.06)] text-[#888888]'
                                    }`}>
                                      {(r.score * 100).toFixed(0)}% match
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#888888] leading-relaxed line-clamp-4">{r.content || r.text || r.chunk}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {!testing && testQuery && testResults.length === 0 && (
                          <p className="text-xs text-[#555555] text-center py-4">No results — try a different query or check that documents are indexed.</p>
                        )}
                      </div>
                    )}
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
