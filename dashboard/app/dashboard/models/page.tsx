'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getModels } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Mic, Star, Check, HardDrive, Cpu, Zap, Smartphone, ArrowRight, Search, Globe, FolderOpen, Sparkles, Loader2, ExternalLink } from 'lucide-react';

type CategoryKey = 'llm' | 'stt';
type TabKey = 'recommended' | 'huggingface' | 'local';

const categoryMeta: Record<CategoryKey, { label: string; description: string; icon: typeof Brain }> = {
  llm: { label: 'Language Models (LLM)', description: 'Text generation and code completion', icon: Brain },
  stt: { label: 'Speech-to-Text (STT)', description: 'Audio transcription and recognition', icon: Mic },
};

const capabilityToCategory: Record<string, CategoryKey> = {
  language: 'llm',
  code: 'llm',
  vision: 'llm',
  speech: 'stt',
};

interface HFModel {
  id: string;
  modelId: string;
  downloads: number;
  likes: number;
  pipeline_tag?: string;
  tags?: string[];
}

export default function ModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<any[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>('recommended');

  // HuggingFace search state
  const [hfQuery, setHfQuery] = useState('');
  const [hfResults, setHfResults] = useState<HFModel[]>([]);
  const [hfLoading, setHfLoading] = useState(false);
  const [hfError, setHfError] = useState('');

  // Local model state
  const [localPath, setLocalPath] = useState('');
  const [localModelName, setLocalModelName] = useState('');

  useEffect(() => {
    getModels().then(setModels).catch(console.error);
    const saved = localStorage.getItem('selectedModels');
    if (saved) {
      try { setSelectedModels(new Set(JSON.parse(saved))); } catch {}
    }
  }, []);

  const selectModel = (modelId: string, modelName: string, extra?: any) => {
    const newSet = new Set(selectedModels);
    newSet.add(modelId);
    setSelectedModels(newSet);
    localStorage.setItem('selectedModels', JSON.stringify([...newSet]));
    localStorage.setItem('primaryModel', modelId);
    localStorage.setItem('primaryModelName', modelName);
    if (extra) localStorage.setItem(`modelMeta-${modelId}`, JSON.stringify(extra));
    router.push('/dashboard/configure');
  };

  // HuggingFace search
  const searchHuggingFace = useCallback(async () => {
    if (!hfQuery.trim()) return;
    setHfLoading(true);
    setHfError('');
    try {
      const res = await fetch(
        `https://huggingface.co/api/models?search=${encodeURIComponent(hfQuery)}&limit=12&sort=downloads&direction=-1&filter=text-generation,automatic-speech-recognition`
      );
      if (!res.ok) throw new Error('HuggingFace API error');
      const data: HFModel[] = await res.json();
      setHfResults(data);
    } catch (err: any) {
      setHfError('Failed to search HuggingFace. Please try again.');
      setHfResults([]);
    } finally {
      setHfLoading(false);
    }
  }, [hfQuery]);

  // Filter out <1B models and group by category
  const filtered = models.filter((m) => {
    const id = (m.model_id || '').toLowerCase();
    return !id.includes('135m') && !id.includes('360m') && !id.includes('voicecore-tiny');
  });

  const grouped: Record<CategoryKey, any[]> = { llm: [], stt: [] };
  for (const m of filtered) {
    const cat = capabilityToCategory[m.capability] || 'llm';
    grouped[cat].push(m);
  }

  const tabs = [
    { key: 'recommended' as TabKey, label: 'Recommended', icon: Sparkles, desc: 'Optimized models tested for SlyOS' },
    { key: 'huggingface' as TabKey, label: 'HuggingFace', icon: Globe, desc: 'Search 500K+ models on HuggingFace' },
    { key: 'local' as TabKey, label: 'Local Model', icon: FolderOpen, desc: 'Load a model from your device' },
  ];

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#EDEDED]">Model Zoo</h1>
          <p className="text-sm text-[#888888] mt-2">Select an optimized model or bring your own</p>
        </div>
        {selectedModels.size > 0 && (
          <Button onClick={() => router.push('/dashboard/configure')} className="gap-2 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0">
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-8 p-1.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-2xl">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === key
                ? 'bg-[#FF4D00] text-white shadow-lg shadow-[#FF4D00]/20'
                : 'text-[#888888] hover:text-[#EDEDED] hover:bg-[rgba(255,255,255,0.05)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── RECOMMENDED TAB ──────────────────────────────────────── */}
      {activeTab === 'recommended' && (
        <>
          {(Object.keys(categoryMeta) as CategoryKey[]).map((catKey) => {
            const catModels = grouped[catKey];
            if (catModels.length === 0) return null;
            const meta = categoryMeta[catKey];
            const CatIcon = meta.icon;

            return (
              <div key={catKey} className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(255,77,0,0.15)] flex items-center justify-center">
                    <CatIcon className="w-4.5 h-4.5 text-[#FF4D00]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#EDEDED]">{meta.label}</h2>
                    <p className="text-xs text-[#666666]">{meta.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {catModels.map((m: any) => {
                    const isSelected = selectedModels.has(m.model_id);
                    return (
                      <div
                        key={m.id}
                        className={`group backdrop-blur-xl bg-[#0A0A0A]/80 border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                          m.recommended ? 'border-[rgba(255,77,0,0.3)]' : 'border-[rgba(255,255,255,0.08)]'
                        } ${isSelected ? 'border-[#4ade80]/30 bg-[#4ade80]/5 shadow-lg shadow-[#4ade80]/10' : 'hover:border-[rgba(255,255,255,0.12)] hover:shadow-lg hover:shadow-[rgba(0,0,0,0.3)]'}`}
                        onClick={() => selectModel(m.model_id, m.display_name || m.name)}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-xl ${
                                isSelected ? 'bg-[#4ade80]/20' : 'bg-[rgba(255,77,0,0.15)]'
                              }`}>
                                <CatIcon className={`w-5 h-5 ${isSelected ? 'text-[#4ade80]' : 'text-[#FF4D00]'}`} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-[#EDEDED]">{m.display_name || m.name}</div>
                                <div className="text-[11px] text-[#666666] font-mono">{m.base_model}</div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5 items-end">
                              {m.recommended && (
                                <span className="text-[10px] bg-[#FF4D00]/20 text-[#FF4D00] px-2 py-1 rounded-lg font-semibold flex items-center gap-1">
                                  <Star className="w-3 h-3" /> Recommended
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] bg-[#4ade80]/20 text-[#4ade80] px-2 py-1 rounded-lg font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Selected
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2.5 mb-5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#888888] flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Size</span>
                              <span className="text-[#EDEDED] font-mono font-semibold">{m.size_q4}MB</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#888888] flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> Memory</span>
                              <span className="text-[#EDEDED] font-mono font-semibold">{m.memory_required}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#888888] flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Speed</span>
                              <span className="text-[#EDEDED] font-mono font-semibold">{m.tokens_per_sec}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#888888] flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> Devices</span>
                              <span className="text-[#EDEDED] font-mono font-semibold">{m.device_count || 0}</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] mb-5">
                            <div className="text-[10px] text-[#666666] uppercase tracking-wider mb-1 font-semibold">Best for</div>
                            <div className="text-xs text-[#AAAAAA]">{m.use_case}</div>
                          </div>

                          {!isSelected ? (
                            <Button className="w-full gap-2 h-9 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0" size="sm">
                              Select Model <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              className="w-full gap-2 h-9 bg-[#4ade80]/20 hover:bg-[#4ade80]/30 text-[#4ade80] border-[#4ade80]/20"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); selectModel(m.model_id, m.display_name || m.name); }}
                            >
                              Configure <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ─── HUGGINGFACE SEARCH TAB ───────────────────────────────── */}
      {activeTab === 'huggingface' && (
        <div>
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <Globe className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="text-lg font-semibold text-[#EDEDED]">Search HuggingFace Models</h2>
            </div>
            <p className="text-xs text-[#888888] mb-4">
              Find any text-generation or speech-recognition model from HuggingFace's library.
              The SDK will download and run it on-device via ONNX/WASM.
            </p>
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] group-focus-within:text-[#FF4D00]" />
                <Input
                  value={hfQuery}
                  onChange={(e) => setHfQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchHuggingFace()}
                  placeholder="e.g. SmolLM2, Whisper, Qwen, phi-3..."
                  className="pl-12 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#666666] rounded-xl focus:border-[#FF4D00] focus:outline-none focus:ring-0"
                />
              </div>
              <Button
                onClick={searchHuggingFace}
                className="gap-2 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0 px-6"
                disabled={hfLoading || !hfQuery.trim()}
              >
                {hfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </Button>
            </div>
          </div>

          {hfError && (
            <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-[#FF6B6B] px-4 py-3 rounded-xl text-sm mb-6">
              {hfError}
            </div>
          )}

          {hfResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {hfResults.map((m) => {
                const isSelected = selectedModels.has(m.id);
                const isLLM = m.pipeline_tag === 'text-generation' || m.tags?.includes('text-generation');
                const CatIcon = isLLM ? Brain : Mic;

                return (
                  <div
                    key={m.id}
                    className={`group backdrop-blur-xl bg-[#0A0A0A]/80 border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                      isSelected ? 'border-[#4ade80]/30 bg-[#4ade80]/5' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]'
                    }`}
                    onClick={() => selectModel(
                      `hf:${m.id}`,
                      m.id.split('/').pop() || m.id,
                      { hfModel: m.id, task: m.pipeline_tag || 'text-generation', source: 'huggingface' }
                    )}
                  >
                    <div className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-[rgba(255,77,0,0.15)] flex items-center justify-center flex-shrink-0">
                          <CatIcon className="w-5 h-5 text-[#FF4D00]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#EDEDED] truncate">{m.id.split('/').pop()}</div>
                          <div className="text-[11px] text-[#666666] font-mono truncate">{m.id}</div>
                        </div>
                      </div>

                      <div className="flex gap-3 mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-[#888888]">
                          <HardDrive className="w-3.5 h-3.5" />
                          <span className="font-mono">{formatNumber(m.downloads)} downloads</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#888888]">
                          <Star className="w-3.5 h-3.5" />
                          <span className="font-mono">{formatNumber(m.likes)} likes</span>
                        </div>
                      </div>

                      {m.pipeline_tag && (
                        <div className="mb-4">
                          <span className="text-[10px] bg-[rgba(255,255,255,0.06)] text-[#AAAAAA] px-2.5 py-1 rounded-lg font-mono">
                            {m.pipeline_tag}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button className="flex-1 gap-2 h-9 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0" size="sm">
                          Select <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3 text-[#888888] hover:text-[#EDEDED] hover:bg-[rgba(255,255,255,0.05)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://huggingface.co/${m.id}`, '_blank');
                          }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hfResults.length === 0 && !hfLoading && hfQuery && (
            <div className="text-center py-16 text-[#666666]">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Search for a model to see results</p>
            </div>
          )}

          {!hfQuery && (
            <div className="text-center py-16 text-[#666666]">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm mb-2">Search for any model on HuggingFace</p>
              <p className="text-xs text-[#555555]">Try: "SmolLM2", "Whisper", "Qwen", "Phi-3", "TinyLlama"</p>
            </div>
          )}
        </div>
      )}

      {/* ─── LOCAL MODEL TAB ──────────────────────────────────────── */}
      {activeTab === 'local' && (
        <div>
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <FolderOpen className="w-5 h-5 text-[#FF4D00]" />
              <h2 className="text-lg font-semibold text-[#EDEDED]">Load Local Model</h2>
            </div>
            <p className="text-xs text-[#888888] mb-6">
              Point to a local ONNX model directory or a HuggingFace model ID you've already downloaded.
              The SDK will load it directly from disk without downloading.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#AAAAAA] mb-2 uppercase tracking-widest">Model Name</label>
                <Input
                  value={localModelName}
                  onChange={(e) => setLocalModelName(e.target.value)}
                  placeholder="e.g. My Custom LLM"
                  className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#666666] rounded-xl focus:border-[#FF4D00] focus:outline-none focus:ring-0"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#AAAAAA] mb-2 uppercase tracking-widest">Model Path or HuggingFace ID</label>
                <Input
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="e.g. /models/my-llm or username/model-name"
                  className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#666666] rounded-xl focus:border-[#FF4D00] focus:outline-none focus:ring-0"
                />
              </div>

              <Button
                onClick={() => {
                  if (!localPath.trim() || !localModelName.trim()) return;
                  selectModel(
                    `local:${localPath}`,
                    localModelName,
                    { hfModel: localPath, task: 'text-generation', source: 'local' }
                  );
                }}
                className="w-full gap-2 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0 h-11"
                disabled={!localPath.trim() || !localModelName.trim()}
              >
                <FolderOpen className="w-4 h-4" /> Load Model
              </Button>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[#EDEDED] mb-3">Supported Formats</h3>
            <div className="space-y-2">
              {[
                { format: 'ONNX', desc: 'Optimized for WASM inference (recommended)' },
                { format: 'HuggingFace Hub', desc: 'Any model ID — will be cached locally after first download' },
                { format: 'GGUF (coming soon)', desc: 'llama.cpp format for native CPU inference — v1.3' },
              ].map(({ format, desc }) => (
                <div key={format} className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                  <div className="w-2 h-2 rounded-full bg-[#FF4D00] mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[#EDEDED]">{format}</div>
                    <div className="text-[11px] text-[#666666]">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
