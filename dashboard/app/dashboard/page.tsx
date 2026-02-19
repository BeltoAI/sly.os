'use client';
// Dashboard overview — v2.0 (Value-Driven Redesign)
import { useEffect, useState } from 'react';
import { getAnalytics, getDevices, getModels, getBillingStatus, getCreditsBalance } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Smartphone, Zap, Brain, DollarSign, Rocket, Monitor, Globe,
  Cpu, ArrowRight, Activity, TrendingUp, ChevronRight, Flame, Award,
  Plus, Users, Code, Check, Lock, Zap as ZapIcon, BarChart3
} from 'lucide-react';

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

  // Cost calculations
  const allTimeTokens = analytics.allTime?.total_tokens || 0;
  const costSaved = parseFloat(analytics.costSavings?.estimatedCostSaved || 0);
  const cloudAPIEstimate = (allTimeTokens / 1000) * 0.01; // $0.01 per 1K tokens for GPT-4

  // Trial status
  const isOnTrial = billing?.subscription_status === 'trial';
  const trialDaysRemaining = billing?.trial_days_remaining || 0;

  // Weekly goal calculation (last 7 days inferences vs 100 target)
  const weeklyInferences = analytics.allTime?.total_inferences || 0;
  const weeklyGoal = 100;
  const weeklyProgress = Math.min((weeklyInferences / weeklyGoal) * 100, 100);

  const platformIcon = (platform: string) => {
    if (platform === 'ios') return <Monitor className="w-4 h-4" />;
    if (platform === 'android') return <Smartphone className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  // Score calculation (0-100 based on activity)
  const calculateScore = () => {
    let score = 50; // baseline
    if (activeDevices > 0) score += 10;
    if (devices.length > 2) score += 10;
    if (analytics.today?.total_inferences > 10) score += 15;
    if (costSaved > 5) score += 15;
    return Math.min(score, 100);
  };

  const slyosScore = calculateScore();

  return (
    <div className="animate-fade-in">
      {/* SECTION 1: VALUE HERO */}
      <div className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Welcome & Value Prop */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-[rgba(255,77,0,0.15)] to-[rgba(255,77,0,0.05)] border border-[rgba(255,77,0,0.2)] rounded-2xl p-8">
              <h1 className="text-4xl font-bold text-[#EDEDED] mb-2">
                Welcome back, {firstName}
              </h1>
              <p className="text-[#888888] text-lg mb-6">
                You're running AI on YOUR devices. Faster inference, zero data leakage, serious cost savings.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button onClick={() => router.push('/dashboard/models')} className="gap-2 bg-[#FF4D00] hover:bg-[#E63F00]">
                  <Rocket className="w-4 h-4" /> Deploy a Model
                </Button>
                <Button onClick={() => router.push('/dashboard/devices')} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Device
                </Button>
              </div>
            </div>
          </div>

          {/* SlyOS Score & Credits */}
          <div className="space-y-4">
            {/* Score Card */}
            <Card className="bg-gradient-to-br from-[rgba(255,77,0,0.1)] to-transparent border-[rgba(255,77,0,0.2)]">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF6B1F] flex items-center justify-center mb-3 shadow-lg">
                    <span className="text-3xl font-bold text-white">{slyosScore}</span>
                  </div>
                  <p className="text-[#888888] text-sm">Your SlyOS Score</p>
                  <p className="text-[#555555] text-xs mt-1">Activity • Efficiency • Value</p>
                </div>
              </CardContent>
            </Card>

            {/* Free Inferences Card */}
            <Card className="bg-gradient-to-br from-[rgba(34,197,94,0.1)] to-transparent border-[rgba(34,197,94,0.2)]">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[#888888] text-sm font-medium">Free Inferences</span>
                  <Award className="w-4 h-4 text-[#22c55e]" />
                </div>
                <p className="text-3xl font-bold text-[#EDEDED] mb-3">
                  {credits?.is_subscribed ? '∞' : (typeof credits?.balance === 'number' ? credits.balance : 100)}
                </p>
                {credits?.is_subscribed ? (
                  <p className="text-xs text-[#22c55e]">Unlimited — active subscription</p>
                ) : (
                  <Button size="sm" onClick={() => router.push('/dashboard/billing')} className="w-full gap-1 text-xs bg-[#22c55e] hover:bg-[#16a34a]">
                    Subscribe for Unlimited <ArrowRight className="w-3 h-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trial Banner */}
        {isOnTrial && (
          <div className="mt-6 bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.3)] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-[#eab308]" />
              <div>
                <p className="text-[#EDEDED] font-medium text-sm">Trial Ending Soon</p>
                <p className="text-[#888888] text-xs">{trialDaysRemaining} days remaining to upgrade</p>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push('/dashboard/billing')} className="gap-1">
              Upgrade <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* SECTION 2: COST SAVINGS CALCULATOR (THE MAIN VALUE PROP) */}
      <Card className="mb-8 border-[rgba(255,77,0,0.3)] bg-gradient-to-br from-[rgba(255,77,0,0.05)] to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="w-5 h-5 text-[#FF4D00]" />
            Your Real Savings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* All-Time Tokens */}
            <div className="p-6 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
              <p className="text-[#888888] text-sm mb-2">Total Tokens Generated</p>
              <p className="text-3xl font-bold text-[#EDEDED]">
                {(allTimeTokens / 1000000).toFixed(1)}M
              </p>
              <p className="text-[#555555] text-xs mt-1">All-time with SlyOS</p>
            </div>

            {/* What You Would Have Paid */}
            <div className="p-6 rounded-xl bg-[rgba(220,38,38,0.05)] border border-[rgba(220,38,38,0.2)]">
              <p className="text-[#888888] text-sm mb-2">Cloud API Cost</p>
              <p className="text-3xl font-bold text-[#EDEDED]">
                ${cloudAPIEstimate.toFixed(2)}
              </p>
              <p className="text-[#888888] text-xs mt-1">OpenAI GPT-4 pricing</p>
            </div>

            {/* Your Actual Cost */}
            <div className="p-6 rounded-xl bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.2)]">
              <p className="text-[#888888] text-sm mb-2">Your Actual Cost</p>
              <p className="text-3xl font-bold text-[#22c55e]">
                ${costSaved.toFixed(2)}
              </p>
              <p className="text-[#888888] text-xs mt-1">Running on your devices</p>
            </div>
          </div>

          {/* Big Savings Callout */}
          <div className="bg-gradient-to-r from-[rgba(34,197,94,0.15)] to-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.2)] rounded-xl p-6 text-center">
            <p className="text-[#888888] text-sm mb-1">Total Savings</p>
            <p className="text-5xl font-bold text-[#22c55e] mb-2">
              ${(cloudAPIEstimate - costSaved).toFixed(2)}
            </p>
            <p className="text-[#888888] text-sm">
              {costSaved === 0 ? (
                <>Deploy a model and start saving. Average SlyOS user saves $200+ per month.</>
              ) : (
                <>You've saved this amount by keeping AI local and private.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: QUICK STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card glass-card p-5 border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase tracking-wider">Devices</span>
            <Smartphone className="w-4 h-4 text-[#FF4D00]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{devices.length}</div>
          <p className="text-xs text-[#555555] mt-1">{activeDevices} active</p>
        </div>

        <div className="stat-card glass-card p-5 border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase tracking-wider">Today</span>
            <Zap className="w-4 h-4 text-[#eab308]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{analytics.today?.total_inferences || 0}</div>
          <p className="text-xs text-[#555555] mt-1">Inferences</p>
        </div>

        <div className="stat-card glass-card p-5 border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase tracking-wider">Free Inferences</span>
            <Award className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">{credits?.is_subscribed ? '∞' : (typeof credits?.balance === 'number' ? credits.balance : 100)}</div>
          <p className="text-xs text-[#555555] mt-1">{credits?.is_subscribed ? 'Unlimited' : 'of 100 free'}</p>
        </div>

        <div className="stat-card glass-card p-5 border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#888888] uppercase tracking-wider">Monthly Cost</span>
            <DollarSign className="w-4 h-4 text-[#3b82f6]" />
          </div>
          <div className="text-2xl font-bold text-[#EDEDED]">${billing?.monthly_cost || 0}</div>
          <p className="text-xs text-[#555555] mt-1">{billing?.subscription_status || 'N/A'}</p>
        </div>
      </div>

      {/* SECTION 4: WEEKLY CHALLENGE / ENGAGEMENT */}
      <Card className="mb-8 border-[rgba(234,179,8,0.2)] bg-gradient-to-br from-[rgba(234,179,8,0.05)] to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#eab308]" />
            This Week's Challenge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#EDEDED] font-medium">Run 100 Inferences</span>
                <span className="text-sm text-[#888888]">{weeklyInferences} / {weeklyGoal}</span>
              </div>
              <div className="w-full bg-[rgba(255,255,255,0.05)] rounded-full h-3 overflow-hidden border border-[rgba(255,255,255,0.1)]">
                <div
                  className="h-full bg-gradient-to-r from-[#FF4D00] to-[#FF6B1F] rounded-full transition-all"
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-[rgba(255,77,0,0.1)] rounded-lg border border-[rgba(255,77,0,0.2)]">
              <Award className="w-5 h-5 text-[#FF4D00]" />
              <div>
                <p className="text-sm font-medium text-[#EDEDED]">Complete to earn 50 bonus credits</p>
                <p className="text-xs text-[#888888]">Reward unlocks when you hit the goal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 5: QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button
          onClick={() => router.push('/dashboard/models')}
          className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-[rgba(255,77,0,0.1)] hover:bg-[rgba(255,77,0,0.15)] text-[#FF4D00] border border-[rgba(255,77,0,0.3)]"
          variant="outline"
        >
          <Rocket className="w-5 h-5" />
          <span className="text-sm font-medium">Deploy Model</span>
        </Button>

        <Button
          onClick={() => router.push('/dashboard/devices')}
          className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-[rgba(34,197,94,0.1)] hover:bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.3)]"
          variant="outline"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Add Device</span>
        </Button>

        <Button
          onClick={() => router.push('/get-started')}
          className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-[rgba(59,130,246,0.1)] hover:bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border border-[rgba(59,130,246,0.3)]"
          variant="outline"
        >
          <Code className="w-5 h-5" />
          <span className="text-sm font-medium">Embed Widget</span>
        </Button>

        <Button
          onClick={() => router.push('/dashboard/settings')}
          className="h-auto py-4 flex flex-col items-center justify-center gap-2 bg-[rgba(168,85,247,0.1)] hover:bg-[rgba(168,85,247,0.15)] text-[#a855f7] border border-[rgba(168,85,247,0.3)]"
          variant="outline"
        >
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">Invite Team</span>
        </Button>
      </div>

      {/* SECTION 6: RECENT ACTIVITY FEED */}
      <Card className="mb-8">
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
                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-all">
                  <div className="w-2 h-2 rounded-full bg-[#FF4D00] mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#EDEDED] truncate">{activity.description || activity.type}</p>
                    <p className="text-xs text-[#555555] mt-1">
                      {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ZapIcon className="w-8 h-8 text-[#333] mx-auto mb-2" />
              <p className="text-sm text-[#555555]">No activity yet. Deploy a model to get started!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 7: ACTIVE DEPLOYMENTS */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#FF4D00]" />
              Active Deployments
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/models')} className="gap-1">
              Manage <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedModels.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[rgba(255,255,255,0.08)] rounded-xl">
              <Brain className="w-10 h-10 text-[#333] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[#888888] mb-1">No Models Deployed</h3>
              <p className="text-xs text-[#555555] mb-4">Select AI models to deploy to your edge devices</p>
              <Button size="sm" onClick={() => router.push('/dashboard/models')} className="gap-2">
                Browse Models <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedModels.map(modelId => {
                const model = models.find(m => m.model_id === modelId);
                if (!model) return null;
                return (
                  <div key={modelId} className="flex items-center justify-between p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,77,0,0.15)] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[rgba(255,77,0,0.1)] flex items-center justify-center">
                        <Brain className="w-5 h-5 text-[#FF4D00]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#EDEDED]">{model.display_name || model.name}</div>
                        <div className="text-xs text-[#555555] font-mono">{model.size_q4}MB &middot; {model.device_count || 0} devices</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                        <span className="text-xs text-[#22c55e] font-medium">Active</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/models')}>
                        Configure
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 8: PLATFORM STATS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#FF4D00]" />
            Platform Reach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
              <Code className="w-6 h-6 text-[#3b82f6] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#EDEDED] mb-1">Node.js SDK</p>
              <p className="text-xs text-[#555555]">JavaScript & TypeScript</p>
            </div>
            <div className="p-6 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
              <Monitor className="w-6 h-6 text-[#22c55e] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#EDEDED] mb-1">iOS SDK</p>
              <p className="text-xs text-[#555555]">Swift & Objective-C</p>
            </div>
            <div className="p-6 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-center">
              <Smartphone className="w-6 h-6 text-[#FF4D00] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#EDEDED] mb-1">Android SDK</p>
              <p className="text-xs text-[#555555]">Java & Kotlin</p>
            </div>
          </div>
          <p className="text-xs text-[#555555] text-center mt-6">
            SlyOS runs on 3 platforms • Ship AI to all devices
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
