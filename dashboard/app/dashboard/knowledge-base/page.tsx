'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase } from '@/lib/rag-api';
import {
  Plus, Trash2, AlertTriangle, X, Check, BookOpen, Database, HardDrive, Calendar
} from 'lucide-react';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    tier: 1,
    chunk_size: 512,
    chunk_overlap: 50,
  });

  const loadKBs = () => {
    getKnowledgeBases()
      .then(setKbs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadKBs(); }, []);

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setNotification({ type: 'error', message: 'Knowledge Base name is required' });
      return;
    }

    setActionLoading('create');
    try {
      await createKnowledgeBase({
        name: createForm.name,
        description: createForm.description,
        tier: createForm.tier,
        chunk_size: createForm.chunk_size,
        chunk_overlap: createForm.chunk_overlap,
      });
      setNotification({ type: 'success', message: 'Knowledge Base created successfully' });
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', tier: 1, chunk_size: 512, chunk_overlap: 50 });
      loadKBs();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create Knowledge Base' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (kbId: string) => {
    setActionLoading(kbId);
    try {
      await deleteKnowledgeBase(kbId);
      setConfirmDelete(null);
      setNotification({ type: 'success', message: 'Knowledge Base deleted successfully' });
      loadKBs();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete Knowledge Base' });
    } finally {
      setActionLoading(null);
    }
  };

  const getTierBadge = (tier: number) => {
    const tiers: Record<number, { label: string; color: string; bg: string }> = {
      1: { label: 'Tier 1 - Local', color: 'text-[#4ade80]', bg: 'bg-[#4ade80]/15' },
      2: { label: 'Tier 2 - Cloud', color: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/15' },
      3: { label: 'Tier 3 - Hybrid', color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/15' },
    };
    const config = tiers[tier] || tiers[1];
    return <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold ${config.bg} ${config.color}`}>{config.label}</span>;
  };

  const totalDocs = kbs.reduce((sum, kb) => sum + (kb.document_count || 0), 0);
  const totalChunks = kbs.reduce((sum, kb) => sum + (kb.chunk_count || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#EDEDED]">Knowledge Base</h1>
          <p className="text-sm text-[#888888] mt-2">
            {kbs.length} knowledge base{kbs.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" />
          Create New
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-6 ${
          notification.type === 'success'
            ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
            : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <p className="text-sm flex-1">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1">Total Knowledge Bases</p>
          <p className="text-2xl font-bold text-[#EDEDED]">{kbs.length}</p>
        </div>
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <HardDrive className="w-3 h-3 text-[#3b82f6]" />
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">Total Documents</p>
          </div>
          <p className="text-2xl font-bold text-[#EDEDED]">{totalDocs}</p>
        </div>
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Database className="w-3 h-3 text-[#a855f7]" />
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">Total Chunks</p>
          </div>
          <p className="text-2xl font-bold text-[#EDEDED]">{totalChunks}</p>
        </div>
      </div>

      {/* Empty State */}
      {kbs.length === 0 ? (
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-[#555555]" />
          <p className="text-[#EDEDED] font-semibold mb-2">No Knowledge Bases Yet</p>
          <p className="text-sm text-[#888888] mb-6">Create your first Knowledge Base to start managing documents and running RAG queries.</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Knowledge Base
          </Button>
        </div>
      ) : (
        /* KB Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kbs.map((kb) => (
            <div
              key={kb.id}
              className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-5 hover:border-[rgba(255,77,0,0.2)] transition-all duration-200 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#EDEDED] font-semibold truncate cursor-pointer hover:text-[#FF4D00] transition-colors" onClick={() => router.push(`/dashboard/knowledge-base/${kb.id}`)}>
                    {kb.name}
                  </h3>
                  {kb.description && <p className="text-xs text-[#888888] mt-1 line-clamp-2">{kb.description}</p>}
                </div>
              </div>

              {/* Tier Badge */}
              <div className="mb-4">
                {getTierBadge(kb.tier || 1)}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-[rgba(0,0,0,0.3)] rounded-lg">
                <div>
                  <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">Documents</p>
                  <p className="text-lg font-bold text-[#EDEDED]">{kb.document_count || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">Chunks</p>
                  <p className="text-lg font-bold text-[#EDEDED]">{kb.chunk_count || 0}</p>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-1.5 text-xs text-[#666666] mb-4">
                <Calendar className="w-3 h-3" />
                {new Date(kb.created_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => router.push(`/dashboard/knowledge-base/${kb.id}`)}
                >
                  Open
                </Button>
                {confirmDelete === kb.id ? (
                  <div className="flex gap-1 flex-1">
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1 text-xs"
                      disabled={actionLoading === kb.id}
                      onClick={() => handleDelete(kb.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setConfirmDelete(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#555555] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
                    onClick={() => setConfirmDelete(kb.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-[#0A0A0A]/95 border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#EDEDED]">Create Knowledge Base</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#555555] hover:text-[#EDEDED] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 mb-6">
              {/* Name */}
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-2 block">Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Product Documentation"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-2 block">Description</label>
                <textarea
                  placeholder="Optional description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00] resize-none h-20"
                />
              </div>

              {/* Tier Selection */}
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-3 block">Tier</label>
                <div className="space-y-2">
                  {[
                    { value: 1, label: 'Tier 1 - Local', desc: 'Store documents locally' },
                    { value: 2, label: 'Tier 2 - Cloud', desc: 'Store in cloud' },
                    { value: 3, label: 'Tier 3 - Hybrid', desc: 'Local + cloud sync' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3 p-3 border border-[rgba(255,255,255,0.08)] rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <input
                        type="radio"
                        name="tier"
                        value={option.value}
                        checked={createForm.tier === option.value}
                        onChange={(e) => setCreateForm({ ...createForm, tier: parseInt(e.target.value) })}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="text-xs font-semibold text-[#EDEDED]">{option.label}</p>
                        <p className="text-[10px] text-[#555555]">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chunk Size */}
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-2 block">Chunk Size: {createForm.chunk_size}</label>
                <input
                  type="range"
                  min="128"
                  max="2048"
                  step="128"
                  value={createForm.chunk_size}
                  onChange={(e) => setCreateForm({ ...createForm, chunk_size: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[rgba(0,0,0,0.4)] rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-[#555555] mt-1">Optimal: 512-1024 tokens</p>
              </div>

              {/* Chunk Overlap */}
              <div>
                <label className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-2 block">Chunk Overlap: {createForm.chunk_overlap}</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="10"
                  value={createForm.chunk_overlap}
                  onChange={(e) => setCreateForm({ ...createForm, chunk_overlap: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[rgba(0,0,0,0.4)] rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-[10px] text-[#555555] mt-1">Tokens: {createForm.chunk_overlap}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowCreateModal(false)}
                disabled={actionLoading === 'create'}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={actionLoading === 'create'}
              >
                {actionLoading === 'create' ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
