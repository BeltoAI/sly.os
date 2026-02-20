'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  getKnowledgeBase, getDocuments, uploadDocuments, deleteDocument, scrapeUrl, ragQuery
} from '@/lib/rag-api';
import {
  Upload, Trash2, AlertTriangle, X, Check, Send, ChevronDown, ChevronUp, Loader,
  FileText, File, Zap, Link as LinkIcon
} from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  promptTemplate?: string;
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext || '')) return <FileText className="w-4 h-4 text-red-400" />;
  if (['txt', 'md'].includes(ext || '')) return <File className="w-4 h-4 text-blue-400" />;
  if (['doc', 'docx'].includes(ext || '')) return <File className="w-4 h-4 text-blue-600" />;
  if (['html', 'htm'].includes(ext || '')) return <LinkIcon className="w-4 h-4 text-orange-400" />;
  return <File className="w-4 h-4 text-gray-400" />;
};

export default function KBDetailPage() {
  const params = useParams();
  const kbId = params.kbId as string;

  const [kb, setKb] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Chat state
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('quantum-1.7b');
  const [topK, setTopK] = useState(5);
  const [querying, setQuerying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scrape state
  const [scrapeUrl_, setScrapeUrl] = useState('');
  const [scrapingUrl, setScrapingUrl] = useState(false);

  // Collapsed state
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [expandedPrompt, setExpandedPrompt] = useState<Set<string>>(new Set());

  const models = ['quantum-1.7b', 'quantum-3b', 'quantum-code-3b', 'quantum-8b'];

  const loadData = async () => {
    try {
      const [kbData, docsData] = await Promise.all([
        getKnowledgeBase(kbId),
        getDocuments(kbId),
      ]);
      setKb(kbData);
      setDocuments(docsData);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [kbId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      await uploadDocuments(kbId, files);
      setNotification({ type: 'success', message: `${files.length} document(s) uploaded successfully` });
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
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleUpload(files);
  };

  const handleDeleteDocument = async (docId: string) => {
    setActionLoading(docId);
    try {
      await deleteDocument(kbId, docId);
      setConfirmDelete(null);
      setNotification({ type: 'success', message: 'Document deleted successfully' });
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Delete failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleScrapeUrl = async () => {
    if (!scrapeUrl_.trim()) {
      setNotification({ type: 'error', message: 'Please enter a URL' });
      return;
    }

    setScrapingUrl(true);
    try {
      await scrapeUrl(kbId, scrapeUrl_);
      setNotification({ type: 'success', message: 'URL scraped and added successfully' });
      setScrapeUrl('');
      loadData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Scraping failed' });
    } finally {
      setScrapingUrl(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQuery = query;
    setQuery('');
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: userQuery }]);
    setQuerying(true);

    try {
      const response = await ragQuery(kbId, userQuery, selectedModel, topK);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.context || 'No relevant content found',
        sources: response.retrieved_chunks || [],
        promptTemplate: response.prompt_template || '',
      }]);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Query failed' });
    } finally {
      setQuerying(false);
    }
  };

  const toggleSources = (msgId: string) => {
    const newSet = new Set(expandedSources);
    if (newSet.has(msgId)) newSet.delete(msgId);
    else newSet.add(msgId);
    setExpandedSources(newSet);
  };

  const togglePrompt = (msgId: string) => {
    const newSet = new Set(expandedPrompt);
    if (newSet.has(msgId)) newSet.delete(msgId);
    else newSet.add(msgId);
    setExpandedPrompt(newSet);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-fade-in h-[calc(100vh-200px)] flex flex-col gap-6">
      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          notification.type === 'success'
            ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
            : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <p className="text-sm flex-1">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Left Panel: Documents (40%) */}
        <div className="w-2/5 backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#EDEDED]">{kb?.name}</h2>
            {kb?.description && <p className="text-xs text-[#888888] mt-1">{kb.description}</p>}
            <div className="flex gap-4 mt-4 text-xs">
              <div>
                <p className="text-[#555555] uppercase tracking-wider font-semibold">Documents</p>
                <p className="text-lg font-bold text-[#EDEDED]">{documents.length}</p>
              </div>
              <div>
                <p className="text-[#555555] uppercase tracking-wider font-semibold">Chunks</p>
                <p className="text-lg font-bold text-[#EDEDED]">{kb?.chunk_count || 0}</p>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="mb-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-[#FF4D00] bg-[rgba(255,77,0,0.1)]'
                  : 'border-[rgba(255,255,255,0.08)] hover:border-[#FF4D00]/50'
              }`}
            >
              <Upload className="w-5 h-5 mx-auto mb-2 text-[#555555]" />
              <p className="text-xs text-[#888888]">Drag files or <span className="text-[#FF4D00]">click to upload</span></p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
                className="hidden"
                disabled={uploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-[10px] text-[#555555] hover:text-[#EDEDED] mt-2 block w-full"
              >
                {uploading ? 'Uploading...' : 'Select files'}
              </button>
            </div>
          </div>

          {/* Scrape URL */}
          <div className="mb-6">
            <label className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-2 block">Scrape URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com"
                value={scrapeUrl_}
                onChange={(e) => setScrapeUrl(e.target.value)}
                className="flex-1 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]"
                disabled={scrapingUrl}
              />
              <Button
                size="sm"
                onClick={handleScrapeUrl}
                disabled={scrapingUrl || !scrapeUrl_.trim()}
              >
                {scrapingUrl ? <Loader className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-3">Documents ({documents.length})</p>
            <div className="space-y-2">
              {documents.length === 0 ? (
                <p className="text-xs text-[#555555] text-center py-4">No documents yet</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.04)] rounded-lg hover:border-[rgba(255,255,255,0.08)] transition-all group"
                  >
                    {getFileIcon(doc.name)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#EDEDED] truncate font-medium">{doc.name}</p>
                      <p className="text-[10px] text-[#555555]">{doc.chunk_count || 0} chunks</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {doc.indexed ? (
                        <Check className="w-3 h-3 text-[#4ade80]" />
                      ) : (
                        <Loader className="w-3 h-3 text-[#AAAAAA] animate-spin" />
                      )}
                    </div>
                    {confirmDelete === doc.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-[#ef4444] hover:bg-[#ef4444]/10"
                        disabled={actionLoading === doc.id}
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        Confirm
                      </Button>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(doc.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#555555] hover:text-[#ef4444] transition-all p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Chat (60%) */}
        <div className="w-3/5 backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 overflow-y-auto flex flex-col">
          {/* Top Controls */}
          <div className="flex gap-4 mb-4 pb-4 border-b border-[rgba(255,255,255,0.08)]">
            <div>
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1 block">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] focus:outline-none focus:border-[#FF4D00]"
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1 block">Top K: {topK}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-32 h-2 bg-[rgba(0,0,0,0.4)] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-[#555555]" />
                  <p className="text-sm text-[#888888]">Ask your documents anything</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${
                      msg.role === 'user'
                        ? 'bg-[#FF4D00]/20 border border-[#FF4D00]/30'
                        : 'bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.08)]'
                    } rounded-lg px-4 py-2`}>
                      <p className="text-sm text-[#EDEDED]">{msg.content}</p>

                      {/* Augmented Prompt */}
                      {msg.promptTemplate && (
                        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                          <button
                            onClick={() => togglePrompt(msg.id)}
                            className="flex items-center gap-2 text-[10px] text-[#888888] hover:text-[#EDEDED] transition-colors"
                          >
                            {expandedPrompt.has(msg.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Augmented Prompt
                          </button>
                          {expandedPrompt.has(msg.id) && (
                            <pre className="mt-2 bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] rounded p-2 text-[9px] text-[#AAAAAA] overflow-x-auto max-h-32">
                              {msg.promptTemplate}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-2 text-[10px] text-[#888888] hover:text-[#EDEDED] transition-colors"
                          >
                            {expandedSources.has(msg.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Sources ({msg.sources.length})
                          </button>
                          {expandedSources.has(msg.id) && (
                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                              {msg.sources.map((source, idx) => (
                                <div
                                  key={idx}
                                  className="bg-[rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] rounded p-2"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="text-[10px] font-semibold text-[#00d4ff]">
                                      {source.metadata?.source || 'Unknown'} {source.similarity_score && `(${(source.similarity_score * 100).toFixed(1)}%)`}
                                    </p>
                                  </div>
                                  <p className="text-[9px] text-[#AAAAAA] line-clamp-3">{source.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {querying && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 px-4 py-2 text-xs text-[#888888]">
                      <Loader className="w-3 h-3 animate-spin" />
                      Processing...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleQuery} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask your documents anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={querying}
              className="flex-1 bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-lg px-4 py-2 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]"
            />
            <Button
              type="submit"
              disabled={querying || !query.trim()}
              className="gap-2"
            >
              {querying ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
