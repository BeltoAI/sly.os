'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase } from '@/lib/rag-api';
import {
  Plus, Trash2, X, Check, AlertTriangle, BookOpen, FileText,
  ArrowRight, Sparkles, ChevronRight, Cpu
} from 'lucide-react';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create flow state
  const [showCreate, setShowCreate] = useState(false);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    model: 'quantum-3b',
  });

  const models = [
    { id: 'quantum-1.7b', name: 'Quantum 1.7B', desc: 'Fastest — great for quick Q&A', speed: 'Fast', quality: 'Good' },
    { id: 'quantum-3b', name: 'Quantum 3B', desc: 'Balanced speed and intelligence', speed: 'Medium', quality: 'Great' },
    { id: 'quantum-code-3b', name: 'Quantum Code 3B', desc: 'Optimized for code and technical docs', speed: 'Medium', quality: 'Great' },
    { id: 'quantum-8b', name: 'Quantum 8B', desc: 'Most capable — best for complex analysis', speed: 'Slower', quality: 'Best' },
  ];

  const loadKBs = () => {
    getKnowledgeBases()
      .then(setKbs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadKBs(); }, []);
  useEffect(() => { if (notification) { const t = setTimeout(() => setNotification(null), 4000); return () => clearTimeout(t); } }, [notification]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const kb = await createKnowledgeBase({
        name: form.name,
        description: form.description,
        tier: 2,
        chunk_size: 512,
        chunk_overlap: 128,
        model_id: form.model,
      });
      // Navigate directly to the new KB with the selected model
      router.push(`/dashboard/knowledge-base/${kb.id}?model=${form.model}`);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create' });
      setCreating(false);
    }
  };

  const handleDelete = async (kbId: string) => {
    setDeleting(true);
    try {
      await deleteKnowledgeBase(kbId);
      setConfirmDelete(null);
      loadKBs();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${
          notification.type === 'success' ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <p className="text-sm flex-1">{notification.message}</p>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4 opacity-70" /></button>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF4D00]/10 border border-[#FF4D00]/20 text-[#FF4D00] text-xs font-medium mb-4">
          <Sparkles className="w-3 h-3" /> Local RAG
        </div>
        <h1 className="text-3xl font-bold text-[#EDEDED] mb-2">Knowledge Base</h1>
        <p className="text-[#888888] text-sm max-w-md mx-auto">
          Upload your documents, select a model, and build a RAG database — all running locally on your device.
        </p>
      </div>

      {/* Create New — Big Card */}
      <button
        onClick={() => { setShowCreate(true); setStep(1); setForm({ name: '', description: '', model: 'quantum-3b' }); }}
        className="w-full mb-8 p-8 border-2 border-dashed border-[rgba(255,255,255,0.08)] rounded-2xl hover:border-[#FF4D00]/40 hover:bg-[#FF4D00]/5 transition-all duration-300 group"
      >
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#FF4D00]/10 flex items-center justify-center group-hover:bg-[#FF4D00]/20 transition-colors">
            <Plus className="w-6 h-6 text-[#FF4D00]" />
          </div>
          <div className="text-left">
            <p className="text-[#EDEDED] font-semibold">Create new knowledge base</p>
            <p className="text-xs text-[#888888]">Select a model, upload sources, configure your deployment</p>
          </div>
        </div>
      </button>

      {/* Existing KBs */}
      {kbs.length > 0 && (
        <div>
          <p className="text-xs text-[#555555] uppercase tracking-wider font-semibold mb-4">Your Knowledge Bases</p>
          <div className="space-y-3">
            {kbs.map((kb) => (
              <div
                key={kb.id}
                className="group backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(255,77,0,0.2)] transition-all duration-200 cursor-pointer flex items-center gap-4"
                onClick={() => router.push(`/dashboard/knowledge-base/${kb.id}`)}
              >
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF4D00]/20 to-[#FF4D00]/5 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-[#FF4D00]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#EDEDED] font-semibold truncate">{kb.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-[#888888]">
                      <FileText className="w-3 h-3" /> {kb.document_count || 0} sources
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#888888]">
                      <Cpu className="w-3 h-3" /> {kb.model_id || 'quantum-3b'}
                    </span>
                    <span className="text-xs text-[#555555]">
                      {new Date(kb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {confirmDelete === kb.id ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-xs text-[#888888]" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                      <Button variant="ghost" size="sm" className="text-xs text-[#ef4444]" disabled={deleting} onClick={() => handleDelete(kb.id)}>Delete</Button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(kb.id)} className="opacity-0 group-hover:opacity-100 text-[#555555] hover:text-[#ef4444] transition-all p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#555555] group-hover:text-[#FF4D00] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal — 2 step wizard */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#0A0A0A]/95 border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg overflow-hidden">
            {/* Progress */}
            <div className="flex border-b border-[rgba(255,255,255,0.06)]">
              <div className={`flex-1 px-4 py-3 text-xs font-semibold text-center transition-colors ${step >= 1 ? 'text-[#FF4D00] border-b-2 border-[#FF4D00]' : 'text-[#555555]'}`}>
                1. Name your project
              </div>
              <div className={`flex-1 px-4 py-3 text-xs font-semibold text-center transition-colors ${step >= 2 ? 'text-[#FF4D00] border-b-2 border-[#FF4D00]' : 'text-[#555555]'}`}>
                2. Choose a model
              </div>
            </div>

            <div className="p-6">
              {/* Step 1: Name */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-[#EDEDED] mb-1">Name your knowledge base</h2>
                  <p className="text-sm text-[#888888] mb-6">Give it a name so you can find it later.</p>

                  <input
                    type="text"
                    placeholder="e.g., Product docs, Company wiki, Research papers..."
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoFocus
                    className="w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00] mb-3"
                    onKeyDown={(e) => { if (e.key === 'Enter' && form.name.trim()) setStep(2); }}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00] resize-none h-16"
                  />

                  <div className="flex gap-3 mt-6">
                    <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button className="flex-1 gap-2" disabled={!form.name.trim()} onClick={() => setStep(2)}>
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Model Selection */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-[#EDEDED] mb-1">Choose your model</h2>
                  <p className="text-sm text-[#888888] mb-6">This model will run locally on your device for inference.</p>

                  <div className="space-y-2 mb-6">
                    {models.map((m) => (
                      <label
                        key={m.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          form.model === m.id
                            ? 'border-[#FF4D00]/50 bg-[#FF4D00]/5'
                            : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="model"
                          value={m.id}
                          checked={form.model === m.id}
                          onChange={() => setForm({ ...form, model: m.id })}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          form.model === m.id ? 'border-[#FF4D00]' : 'border-[#555555]'
                        }`}>
                          {form.model === m.id && <div className="w-2 h-2 rounded-full bg-[#FF4D00]" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#EDEDED]">{m.name}</p>
                          <p className="text-xs text-[#888888]">{m.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-[#555555]">Speed: {m.speed}</p>
                          <p className="text-[10px] text-[#555555]">Quality: {m.quality}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                    <Button className="flex-1 gap-2" disabled={creating} onClick={handleCreate}>
                      {creating ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                      ) : (
                        <>Create & Add Sources <ArrowRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
