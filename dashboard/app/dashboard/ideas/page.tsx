'use client';
import { useEffect, useState } from 'react';
import { getIdeas, createIdea, voteIdea, deleteIdea } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, ChevronUp, Plus, X, Check, Trash2,
  TrendingUp, Clock, Flame, MessageSquare, Tag, AlertTriangle
} from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All Ideas', icon: Lightbulb },
  { value: 'feature', label: 'Features', icon: Plus },
  { value: 'improvement', label: 'Improvements', icon: TrendingUp },
  { value: 'bug', label: 'Bug Reports', icon: AlertTriangle },
  { value: 'general', label: 'General', icon: MessageSquare },
];

const categoryColors: Record<string, string> = {
  feature: '#4ade80',
  improvement: '#60a5fa',
  bug: '#ef4444',
  general: '#a78bfa',
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'top' | 'newest'>('top');
  const [category, setCategory] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newCategory, setNewCategory] = useState('feature');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setCurrentUser(JSON.parse(userData));
  }, []);

  const loadIdeas = () => {
    setLoading(true);
    getIdeas(sort, category)
      .then(setIdeas)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadIdeas(); }, [sort, category]);

  const handleVote = async (ideaId: string, currentVote: number) => {
    setVotingId(ideaId);
    try {
      const newVote = currentVote === 1 ? 0 : 1;
      const result = await voteIdea(ideaId, newVote);
      setIdeas(prev => prev.map(idea =>
        idea.id === ideaId
          ? { ...idea, vote_count: result.vote_count, user_vote: result.user_vote }
          : idea
      ));
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to vote' });
    } finally {
      setVotingId(null);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      const idea = await createIdea(title.trim(), description.trim(), newCategory);
      setIdeas(prev => [idea, ...prev]);
      setTitle('');
      setDescription('');
      setShowCreate(false);
      setNotification({ type: 'success', message: 'Idea posted! Others can now vote on it.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create idea' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ideaId: string) => {
    try {
      await deleteIdea(ideaId);
      setIdeas(prev => prev.filter(i => i.id !== ideaId));
      setNotification({ type: 'success', message: 'Idea removed.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete idea' });
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#EDEDED]">Ideas</h1>
          <p className="text-sm text-[#888888] mt-2">
            Share ideas, report bugs, and vote on what matters most. The best ideas rise to the top.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-white px-4 py-2 rounded-xl gap-2"
        >
          <Plus className="w-4 h-4" />
          New Idea
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

      {/* Create Idea Form */}
      {showCreate && (
        <div className="backdrop-blur-xl bg-[#0A0A0A]/90 border border-[rgba(255,77,0,0.2)] rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#EDEDED] mb-4">Share your idea</h2>
          <input
            className="w-full bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]/50 mb-3"
            placeholder="Give it a clear, catchy title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={255}
          />
          <textarea
            className="w-full bg-[#111] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]/50 mb-3 min-h-[100px] resize-y"
            placeholder="Describe your idea, what problem it solves, or what annoys you..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            {/* Category selector */}
            <div className="flex gap-2">
              {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setNewCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    newCategory === cat.value
                      ? 'border text-[#EDEDED]'
                      : 'text-[#666666] hover:text-[#888888] bg-[rgba(255,255,255,0.03)]'
                  }`}
                  style={newCategory === cat.value ? {
                    backgroundColor: `${categoryColors[cat.value]}15`,
                    borderColor: `${categoryColors[cat.value]}30`,
                    color: categoryColors[cat.value],
                  } : {}}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}
                className="text-[#888888] hover:text-[#EDEDED]">Cancel</Button>
              <Button size="sm" onClick={handleCreate}
                disabled={submitting || !title.trim() || !description.trim()}
                className="bg-[#FF4D00] hover:bg-[#FF4D00]/90 text-white px-4 rounded-lg">
                {submitting ? 'Posting...' : 'Post Idea'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Sort */}
        <div className="flex bg-[rgba(255,255,255,0.03)] rounded-lg p-0.5 border border-[rgba(255,255,255,0.06)]">
          <button
            onClick={() => setSort('top')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              sort === 'top' ? 'bg-[rgba(255,77,0,0.15)] text-[#FF4D00]' : 'text-[#666666] hover:text-[#888888]'
            }`}
          >
            <Flame className="w-3 h-3 inline mr-1.5" />Top
          </button>
          <button
            onClick={() => setSort('newest')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              sort === 'newest' ? 'bg-[rgba(255,77,0,0.15)] text-[#FF4D00]' : 'text-[#666666] hover:text-[#888888]'
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1.5" />New
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                category === cat.value
                  ? 'bg-[rgba(255,255,255,0.08)] text-[#EDEDED] border border-[rgba(255,255,255,0.1)]'
                  : 'text-[#555555] hover:text-[#888888]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Count */}
        <span className="text-[11px] text-[#444444] ml-auto">{ideas.length} idea{ideas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Ideas List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-20">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-[#333333]" />
          <p className="text-[#555555] text-sm mb-2">No ideas yet.</p>
          <p className="text-[#444444] text-xs">Be the first to share what you think!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea, index) => {
            const isAuthor = currentUser?.id === idea.author_id;
            const hasVoted = idea.user_vote === 1;
            const catColor = categoryColors[idea.category] || '#a78bfa';

            return (
              <div
                key={idea.id}
                className="flex gap-4 backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.06)] rounded-xl p-4 hover:border-[rgba(255,255,255,0.1)] transition-all"
              >
                {/* Vote Button */}
                <div className="flex flex-col items-center gap-1 min-w-[48px]">
                  <button
                    onClick={() => handleVote(idea.id, idea.user_vote || 0)}
                    disabled={votingId === idea.id}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      hasVoted
                        ? 'bg-[#FF4D00]/15 border border-[#FF4D00]/30 text-[#FF4D00]'
                        : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#555555] hover:text-[#FF4D00] hover:border-[#FF4D00]/20'
                    }`}
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <span className={`text-sm font-bold ${hasVoted ? 'text-[#FF4D00]' : 'text-[#888888]'}`}>
                    {idea.vote_count || 0}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Rank badge for top 3 */}
                        {sort === 'top' && index < 3 && (
                          <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-[#facc15]/15 text-[#facc15]' :
                            index === 1 ? 'bg-[#94a3b8]/15 text-[#94a3b8]' :
                            'bg-[#cd7f32]/15 text-[#cd7f32]'
                          }`}>
                            {index + 1}
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-[#EDEDED]">{idea.title}</h3>
                      </div>
                      <p className="text-xs text-[#888888] leading-relaxed mb-2 line-clamp-3">
                        {idea.description}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                          style={{ backgroundColor: `${catColor}12`, color: catColor, border: `1px solid ${catColor}25` }}>
                          {idea.category}
                        </span>
                        <span className="text-[10px] text-[#444444]">
                          by <span className="text-[#666666]">{idea.author_name}</span>
                        </span>
                        <span className="text-[10px] text-[#333333]">&middot;</span>
                        <span className="text-[10px] text-[#444444]">
                          {new Date(idea.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Delete (author only) */}
                    {isAuthor && (
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="text-[#333333] hover:text-[#ef4444] transition-colors p-1"
                        title="Delete your idea"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
