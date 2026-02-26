'use client';
import { useEffect, useState } from 'react';
import { getAnalytics, getDevices, getModels, getBillingStatus, getCreditsBalance } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Smartphone, Zap, Brain, ArrowRight, Activity, Plus, Award } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [user, setUser] = useState<any>({});
  const [billing, setBilling] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getAnalytics().then(setAnalytics).catch(console.error),
      getDevices().then(setDevices).catch(console.error),
      getModels().then(setModels).catch(console.error),
      getBillingStatus().then(setBilling).catch(console.error),
      getCreditsBalance().then(setCredits).catch(console.error),
    ]);

    const saved = localStorage.getItem('selectedModels');
    if (saved) setSelectedModels(JSON.parse(saved));

    const u = localStorage.getItem('user');
    if (u) try { setUser(JSON.parse(u)); } catch {}
  }, []);

  if (!analytics) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const activeDevices = devices.filter(d => d.status === 'active').length;
  const firstName = user.name ? user.name.split(' ')[0] : 'there';
  const hasDeployments = selectedModels.length > 0;

  return (
    <div className="animate-fade-in">
      {/* WELCOME HERO */}
      <div className="mb-8 bg-gradient-to-br from-[rgba(255,77,0,0.15)] to-[rgba(255,77,0,0.05)] border border-[rgba(255,77,0,0.2)] rounded-2xl p-8">
        <h1 className="text-4xl font-bold text-[#EDEDED] mb-2">
          Welcome back, {firstName}
        </h1>
        <div className="inline-block px-3 py-1 rounded-full bg-[rgba(255,77,0,0.2)] border border-[rgba(255,77,0,0.3)] text-xs text-[#FF4D00] font-medium mb-6">
          {billing?.plan_type === 'hybrid_rag' ? 'Hybrid RAG' : billing?.plan_type === 'pure_edge' ? 'Pure Edge' : 'Trial'}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => router.push('/dashboard/models')} className="bg-[#FF4D00] hover:bg-[#E63F00]">
            Browse Models
          </Button>
          <Button onClick={() => router.push('/dashboard/models')} variant="outline">
            Deploy
          </Button>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase">Devices</span>
            <Smartphone className="w-4 h-4 text-[#FF4D00]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{devices.length}</div>
          <p className="text-xs text-[#555555] mt-1">{activeDevices} active</p>
        </div>

        <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase">Today</span>
            <Zap className="w-4 h-4 text-[#eab308]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{analytics.today?.total_inferences || 0}</div>
          <p className="text-xs text-[#555555] mt-1">Inferences</p>
        </div>

        <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase">Plan</span>
            <Award className="w-4 h-4 text-[#FF4D00]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{billing?.plan_type === 'hybrid_rag' ? 'Hybrid RAG' : billing?.plan_type === 'pure_edge' ? 'Pure Edge' : 'Trial'}</div>
          <p className="text-xs text-[#555555] mt-1">Current</p>
        </div>

        <div className="p-5 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase">Credits</span>
            <Award className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{credits?.is_subscribed ? '∞' : (typeof credits?.balance === 'number' ? credits.balance : 100)}</div>
          <p className="text-xs text-[#555555] mt-1">{credits?.is_subscribed ? 'Unlimited' : 'remaining'}</p>
        </div>
      </div>

      {/* ONBOARDING BANNER */}
      {!hasDeployments && (
        <Card className="mb-8 border-[rgba(255,77,0,0.2)] bg-[rgba(255,77,0,0.05)]">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#EDEDED] mb-1">Get started in 3 steps</p>
                <p className="text-xs text-[#888888]">1. Pick a model → 2. Configure → 3. Deploy</p>
              </div>
              <Button size="sm" onClick={() => router.push('/dashboard/models')} className="gap-2">
                Browse Models <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACTIVE DEPLOYMENTS */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#FF4D00]" />
            Active Deployments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedModels.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[rgba(255,255,255,0.08)] rounded-xl">
              <Brain className="w-10 h-10 text-[#333] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[#888888] mb-1">No models deployed yet</h3>
              <Button size="sm" onClick={() => router.push('/dashboard/models')} className="mt-4 gap-2">
                Browse Models <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedModels.map(modelId => {
                const model = models.find(m => m.model_id === modelId);
                if (!model) return null;
                return (
                  <div key={modelId} className="flex items-center justify-between p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[rgba(255,77,0,0.1)] flex items-center justify-center">
                        <Brain className="w-5 h-5 text-[#FF4D00]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#EDEDED]">{model.display_name || model.name}</div>
                        <div className="text-xs text-[#555555]">{model.size_q4}MB • {model.device_count || 0} devices</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      <span className="text-xs text-[#22c55e] font-medium">Active</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RECENT ACTIVITY */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#FF4D00]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentActivity.slice(0, 5).map((activity: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg border border-[rgba(255,255,255,0.04)]">
                  <div className="w-2 h-2 rounded-full bg-[#FF4D00] mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-[#EDEDED]">{activity.description || activity.type}</p>
                    <p className="text-xs text-[#555555] mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[#555555]">Deploy a model to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
