'use client';
// Dashboard overview — v1.2.1
import { useEffect, useState } from 'react';
import { getAnalytics, getDevices, getModels } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Smartphone, Zap, Brain, DollarSign, Rocket, Monitor, Globe,
  Cpu, ArrowRight, Activity, TrendingUp, ChevronRight
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [user, setUser] = useState<any>({});

  useEffect(() => {
    getAnalytics().then(setAnalytics).catch(console.error);
    getDevices().then(setDevices).catch(console.error);
    getModels().then(setModels).catch(console.error);

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

  const stats = [
    { label: 'Total Devices', value: analytics.devices?.total || 0, sub: `${activeDevices} active`, icon: Smartphone, color: '#FF4D00' },
    { label: 'Active Devices', value: analytics.devices?.active || 0, sub: 'Last 24 hours', icon: Activity, color: '#22c55e' },
    { label: 'Inferences Today', value: analytics.today?.total_inferences || 0, sub: 'AI generations', icon: Zap, color: '#eab308' },
    { label: 'Cost Savings', value: `$${parseFloat(analytics.costSavings?.estimatedCostSaved || 0).toFixed(2)}`, sub: 'vs cloud API pricing', icon: DollarSign, color: '#3b82f6' },
  ];

  const platformIcon = (platform: string) => {
    if (platform === 'ios') return <Monitor className="w-4 h-4" />;
    if (platform === 'android') return <Smartphone className="w-4 h-4" />;
    return <Globe className="w-4 h-4" />;
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#EDEDED]">
            Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-[#555555] mt-1">Here's what's happening with your edge AI fleet</p>
        </div>
        <Button onClick={() => router.push('/dashboard/models')} className="gap-2">
          <Rocket className="w-4 h-4" /> Deploy Model
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#888888] uppercase tracking-wider">{stat.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#EDEDED]">{stat.value}</div>
            <p className="text-xs text-[#555555] mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Deployments */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-[#FF4D00]" />
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
                      <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/configure')}>
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

      {/* Recent Devices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#FF4D00]" />
              Recent Devices
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/devices')} className="gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-center text-sm text-[#555555] py-8">No devices registered yet</p>
          ) : (
            <div className="space-y-2">
              {devices.slice(0, 5).map(device => (
                <div key={device.id} className="flex items-center justify-between p-3 rounded-lg border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center text-[#888888]">
                      {platformIcon(device.platform)}
                    </div>
                    <div>
                      <div className="text-sm font-mono text-[#EDEDED]">{device.device_id?.substring(0, 24)}...</div>
                      <div className="text-xs text-[#555555]">
                        {device.platform} &middot; {device.total_memory_mb}MB &middot; {device.cpu_cores} cores
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      device.status === 'active'
                        ? 'bg-[#22c55e]/10 text-[#22c55e]'
                        : 'bg-[rgba(255,255,255,0.04)] text-[#555555]'
                    }`}>
                      {device.status}
                    </span>
                    <span className="text-[11px] text-[#555555] font-mono">
                      {new Date(device.last_seen).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
