'use client';
import { useEffect, useState } from 'react';
import { getDevices, toggleDevice, removeDevice, getDeviceDetails, getDeviceScore, getDeviceMetrics, updateDeviceName } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Smartphone, Monitor, Globe, Cpu, Activity, Clock,
  Power, PowerOff, Trash2, AlertTriangle, X, Check,
  ChevronRight, Wifi, Zap, Shield, BarChart3, Pencil,
  Monitor as ScreenIcon, HardDrive, Timer, TrendingUp
} from 'lucide-react';

// Score color helper
function scoreColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  if (score >= 40) return '#fb923c';
  return '#ef4444';
}

function scoreTier(score: number): string {
  if (score >= 90) return 'Power';
  if (score >= 75) return 'Advanced';
  if (score >= 60) return 'Standard';
  if (score >= 40) return 'Limited';
  return 'Baseline';
}

function relativeTime(dateStr: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [deviceScore, setDeviceScore] = useState<any>(null);
  const [deviceMetrics, setDeviceMetrics] = useState<any[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');

  const loadDevices = () => {
    getDevices()
      .then(setDevices)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDevices(); }, []);

  const openDeviceDetail = async (device: any) => {
    setSelectedDevice(device);
    setDeviceScore(null);
    setDeviceMetrics([]);
    try {
      const [score, metrics] = await Promise.all([
        getDeviceScore(device.id).catch(() => null),
        getDeviceMetrics(device.id, 7).catch(() => []),
      ]);
      setDeviceScore(score);
      setDeviceMetrics(metrics);
    } catch {}
  };

  const handleToggle = async (deviceId: string, currentEnabled: boolean) => {
    setActionLoading(deviceId);
    try {
      await toggleDevice(deviceId, !currentEnabled);
      setNotification({
        type: 'success',
        message: `Device ${!currentEnabled ? 'enabled' : 'disabled'} successfully${currentEnabled ? '. SDK access revoked.' : '.'}`
      });
      loadDevices();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to update device' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (deviceId: string) => {
    setActionLoading(deviceId);
    try {
      await removeDevice(deviceId);
      setConfirmDelete(null);
      if (selectedDevice?.id === deviceId) setSelectedDevice(null);
      setNotification({ type: 'success', message: 'Device removed permanently.' });
      loadDevices();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to remove device' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveName = async (deviceId: string) => {
    if (!nameInput.trim()) return;
    try {
      await updateDeviceName(deviceId, nameInput.trim());
      setEditingName(null);
      loadDevices();
    } catch {}
  };

  const enabledCount = devices.filter(d => d.enabled !== false).length;
  const disabledCount = devices.filter(d => d.enabled === false).length;
  const avgScore = devices.length > 0
    ? (devices.reduce((sum, d) => sum + (parseFloat(d.slyos_score) || 0), 0) / devices.length)
    : 0;

  const platformIcon = (platform: string) => {
    const iconClass = "w-4 h-4";
    if (platform === 'ios') return <Monitor className={`${iconClass} text-blue-400`} />;
    if (platform === 'android') return <Smartphone className={`${iconClass} text-green-400`} />;
    if (platform === 'web') return <Globe className={`${iconClass} text-purple-400`} />;
    if (platform === 'nodejs') return <Cpu className={`${iconClass} text-orange-400`} />;
    return <Activity className={`${iconClass} text-gray-400`} />;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED]">Devices</h1>
        <p className="text-sm text-[#888888] mt-2">
          {devices.length} device{devices.length !== 1 ? 's' : ''} total
          {enabledCount > 0 && <> &middot; <span className="text-[#4ade80]">{enabledCount} active</span></>}
          {disabledCount > 0 && <> &middot; <span className="text-[#ef4444]">{disabledCount} disabled</span></>}
          {avgScore > 0 && <> &middot; Avg Score: <span style={{ color: scoreColor(avgScore) }}>{avgScore.toFixed(0)}</span></>}
        </p>
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

      <div className="flex gap-6">
        {/* Device Table */}
        <div className={`${selectedDevice ? 'flex-1 min-w-0' : 'w-full'} transition-all`}>
          <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.4)]">
                    <th className="text-left py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Device</th>
                    <th className="text-left py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Platform</th>
                    <th className="text-left py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Score</th>
                    <th className="text-left py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Hardware</th>
                    <th className="text-left py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Inferences</th>
                    <th className="text-left py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Last Active</th>
                    <th className="text-right py-4 px-4 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => {
                    const isEnabled = device.enabled !== false;
                    const score = parseFloat(device.slyos_score) || 0;
                    const isSelected = selectedDevice?.id === device.id;
                    return (
                      <tr
                        key={device.id}
                        onClick={() => openDeviceDetail(device)}
                        className={`border-b border-[rgba(255,255,255,0.04)] transition-colors duration-200 cursor-pointer ${
                          isSelected ? 'bg-[rgba(255,77,0,0.05)]' :
                          !isEnabled ? 'opacity-50' : 'hover:bg-[rgba(255,255,255,0.02)]'
                        }`}
                      >
                        {/* Device name/ID */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-[#EDEDED]">
                              {device.device_name || device.device_id?.substring(0, 16) + '...'}
                            </span>
                            {device.device_fingerprint && (
                              <span className="text-[10px] text-[#555555] font-mono mt-0.5">
                                {device.device_fingerprint.substring(0, 8)}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Platform + Browser */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {platformIcon(device.platform)}
                            <div className="flex flex-col">
                              <span className="text-[#EDEDED] text-xs capitalize">{device.platform}</span>
                              {device.browser_name && (
                                <span className="text-[10px] text-[#555555]">{device.browser_name} {device.browser_version?.split('.')[0]}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* SlyOS Score */}
                        <td className="py-3 px-4">
                          {score > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                                style={{ backgroundColor: `${scoreColor(score)}15`, color: scoreColor(score) }}>
                                {score.toFixed(0)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#444444]">--</span>
                          )}
                        </td>
                        {/* Hardware summary */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-[#AAAAAA]">
                              {device.cpu_cores} cores &middot; {device.total_memory_mb >= 1024
                                ? `${(device.total_memory_mb / 1024).toFixed(1)}GB`
                                : `${device.total_memory_mb}MB`}
                            </span>
                            <span className="text-[10px] text-[#555555]">
                              {device.gpu_renderer
                                ? device.gpu_renderer.substring(0, 24)
                                : 'No GPU'}
                            </span>
                          </div>
                        </td>
                        {/* Inferences */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-[#EDEDED] font-medium">
                              {parseInt(device.total_inferences) > 0 ? parseInt(device.total_inferences).toLocaleString() : '0'}
                            </span>
                            {device.avg_latency_ms && (
                              <span className="text-[10px] text-[#555555]">
                                {parseFloat(device.avg_latency_ms).toFixed(0)}ms avg
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Status */}
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1.5 ${
                            isEnabled
                              ? 'bg-[#4ade80]/15 text-[#4ade80]'
                              : 'bg-[#ef4444]/15 text-[#ef4444]'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-[#4ade80]' : 'bg-[#ef4444]'}`} />
                            {isEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        {/* Last Active */}
                        <td className="py-3 px-4 text-xs text-[#666666]">
                          {relativeTime(device.last_inference_at || device.last_seen)}
                        </td>
                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost" size="sm"
                              disabled={actionLoading === device.id}
                              className={`h-7 px-2 text-[10px] gap-1 ${
                                isEnabled
                                  ? 'text-[#ef4444] hover:bg-[#ef4444]/10'
                                  : 'text-[#4ade80] hover:bg-[#4ade80]/10'
                              }`}
                              onClick={() => handleToggle(device.id, isEnabled)}
                            >
                              {isEnabled ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                            </Button>
                            {confirmDelete === device.id ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-[#ef4444] hover:bg-[#ef4444]/10"
                                  disabled={actionLoading === device.id} onClick={() => handleRemove(device.id)}>Yes</Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-[#888888] hover:bg-[rgba(255,255,255,0.05)]"
                                  onClick={() => setConfirmDelete(null)}>No</Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[#555555] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
                                onClick={() => setConfirmDelete(device.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-[#333333]" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-sm text-[#555555]">
                        <Activity className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        No devices registered yet. Install the SDK to start connecting devices.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Device Detail Drawer */}
        {selectedDevice && (
          <div className="w-[380px] shrink-0 backdrop-blur-xl bg-[#0A0A0A]/90 border border-[rgba(255,255,255,0.08)] rounded-2xl p-5 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 min-w-0">
                {editingName === selectedDevice.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="bg-[#111] border border-[rgba(255,255,255,0.15)] rounded-lg px-2 py-1 text-sm text-[#EDEDED] w-full"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveName(selectedDevice.id)}
                      autoFocus
                    />
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[#4ade80]" onClick={() => handleSaveName(selectedDevice.id)}>
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#EDEDED] truncate">
                      {selectedDevice.device_name || 'Unnamed Device'}
                    </h2>
                    <button
                      className="text-[#555555] hover:text-[#FF4D00] transition-colors"
                      onClick={() => { setEditingName(selectedDevice.id); setNameInput(selectedDevice.device_name || ''); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-[#555555] font-mono mt-1">{selectedDevice.device_id}</p>
                {selectedDevice.device_fingerprint && (
                  <p className="text-[10px] text-[#444444] font-mono">FP: {selectedDevice.device_fingerprint.substring(0, 16)}</p>
                )}
              </div>
              <button onClick={() => setSelectedDevice(null)} className="text-[#555555] hover:text-[#EDEDED] ml-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* SlyOS Score */}
            {deviceScore && (
              <div className="mb-5 p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider">SlyOS Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold" style={{ color: scoreColor(deviceScore.slyos_score) }}>
                      {deviceScore.slyos_score.toFixed(0)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                      style={{ backgroundColor: `${scoreColor(deviceScore.slyos_score)}15`, color: scoreColor(deviceScore.slyos_score) }}>
                      {deviceScore.tier}
                    </span>
                  </div>
                </div>
                {/* Score breakdown bars */}
                {['capability', 'performance', 'reliability', 'engagement'].map((key) => (
                  <div key={key} className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#666666] capitalize">{key} ({(deviceScore.weights[key] * 100).toFixed(0)}%)</span>
                      <span className="text-[10px] text-[#AAAAAA] font-medium">{deviceScore.breakdown[key].toFixed(0)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${deviceScore.breakdown[key]}%`,
                          backgroundColor: scoreColor(deviceScore.breakdown[key]),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hardware Specs */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">Hardware</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                  <Cpu className="w-3.5 h-3.5 text-[#FF4D00] mb-1" />
                  <p className="text-xs text-[#EDEDED] font-medium">{selectedDevice.cpu_cores} Cores</p>
                  <p className="text-[10px] text-[#555555]">CPU</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                  <HardDrive className="w-3.5 h-3.5 text-[#FF4D00] mb-1" />
                  <p className="text-xs text-[#EDEDED] font-medium">
                    {selectedDevice.total_memory_mb >= 1024
                      ? `${(selectedDevice.total_memory_mb / 1024).toFixed(1)} GB`
                      : `${selectedDevice.total_memory_mb} MB`}
                  </p>
                  <p className="text-[10px] text-[#555555]">RAM</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                  <Zap className="w-3.5 h-3.5 text-[#FF4D00] mb-1" />
                  <p className="text-xs text-[#EDEDED] font-medium truncate" title={selectedDevice.gpu_renderer || 'None'}>
                    {selectedDevice.gpu_renderer ? selectedDevice.gpu_renderer.substring(0, 18) : 'None'}
                  </p>
                  <p className="text-[10px] text-[#555555]">GPU{selectedDevice.gpu_vram_mb ? ` (${selectedDevice.gpu_vram_mb}MB)` : ''}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                  <ScreenIcon className="w-3.5 h-3.5 text-[#FF4D00] mb-1" />
                  <p className="text-xs text-[#EDEDED] font-medium">
                    {selectedDevice.screen_width && selectedDevice.screen_height
                      ? `${selectedDevice.screen_width}x${selectedDevice.screen_height}`
                      : 'N/A'}
                  </p>
                  <p className="text-[10px] text-[#555555]">Screen{selectedDevice.pixel_ratio ? ` @${selectedDevice.pixel_ratio}x` : ''}</p>
                </div>
              </div>
            </div>

            {/* Environment */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">Environment</h3>
              <div className="space-y-2">
                {[
                  { icon: <Globe className="w-3.5 h-3.5" />, label: 'Platform', value: `${selectedDevice.platform}${selectedDevice.browser_name ? ' / ' + selectedDevice.browser_name + ' ' + (selectedDevice.browser_version?.split('.')[0] || '') : ''}` },
                  { icon: <Wifi className="w-3.5 h-3.5" />, label: 'Network', value: selectedDevice.network_type || 'Unknown' },
                  { icon: <Timer className="w-3.5 h-3.5" />, label: 'API Latency', value: selectedDevice.latency_to_api_ms ? `${selectedDevice.latency_to_api_ms}ms` : 'N/A' },
                  { icon: <Clock className="w-3.5 h-3.5" />, label: 'Timezone', value: selectedDevice.timezone || 'Unknown' },
                  { icon: <Shield className="w-3.5 h-3.5" />, label: 'SDK', value: selectedDevice.sdk_version || 'Pre-1.4' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
                    <div className="flex items-center gap-2 text-[#666666]">
                      {item.icon}
                      <span className="text-[11px]">{item.label}</span>
                    </div>
                    <span className="text-[11px] text-[#AAAAAA] font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Stats */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">Performance</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                  <p className="text-sm font-bold text-[#EDEDED]">
                    {parseInt(selectedDevice.total_inferences) > 0 ? parseInt(selectedDevice.total_inferences).toLocaleString() : '0'}
                  </p>
                  <p className="text-[10px] text-[#555555]">Inferences</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                  <p className="text-sm font-bold text-[#EDEDED]">
                    {selectedDevice.avg_latency_ms ? `${parseFloat(selectedDevice.avg_latency_ms).toFixed(0)}ms` : '--'}
                  </p>
                  <p className="text-[10px] text-[#555555]">Avg Latency</p>
                </div>
                <div className="text-center p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)]">
                  <p className="text-sm font-bold" style={{ color: selectedDevice.success_rate ? scoreColor(parseFloat(selectedDevice.success_rate)) : '#EDEDED' }}>
                    {selectedDevice.success_rate ? `${parseFloat(selectedDevice.success_rate).toFixed(0)}%` : '--'}
                  </p>
                  <p className="text-[10px] text-[#555555]">Success</p>
                </div>
              </div>
            </div>

            {/* 7-Day Activity */}
            {deviceMetrics.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">7-Day Activity</h3>
                <div className="flex items-end gap-1 h-16">
                  {(() => {
                    // Group by day
                    const daily: Record<string, number> = {};
                    deviceMetrics.forEach((m: any) => {
                      const day = new Date(m.metric_hour).toLocaleDateString();
                      daily[day] = (daily[day] || 0) + (m.inference_count || 0);
                    });
                    const values = Object.values(daily);
                    const max = Math.max(...values, 1);
                    return Object.entries(daily).slice(-7).map(([day, count], i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm bg-[#FF4D00]/60 transition-all min-h-[2px]"
                          style={{ height: `${(count / max) * 100}%` }}
                          title={`${day}: ${count} inferences`}
                        />
                        <span className="text-[8px] text-[#444444]">
                          {new Date(day).toLocaleDateString('en', { weekday: 'narrow' })}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Capabilities */}
            <div>
              <h3 className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3">Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {selectedDevice.wasm_available && (
                  <span className="text-[10px] px-2 py-1 rounded-md bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">WebAssembly</span>
                )}
                {selectedDevice.webgpu_available && (
                  <span className="text-[10px] px-2 py-1 rounded-md bg-[#60a5fa]/10 text-[#60a5fa] border border-[#60a5fa]/20">WebGPU</span>
                )}
                {selectedDevice.recommended_tier && (
                  <span className="text-[10px] px-2 py-1 rounded-md bg-[#FF4D00]/10 text-[#FF4D00] border border-[#FF4D00]/20">
                    Tier {selectedDevice.recommended_tier}
                  </span>
                )}
                {selectedDevice.model_count > 0 && (
                  <span className="text-[10px] px-2 py-1 rounded-md bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20">
                    {selectedDevice.model_count} model{selectedDevice.model_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 p-4 bg-[rgba(255,77,0,0.03)] border border-[rgba(255,77,0,0.12)] rounded-xl">
        <p className="text-xs text-[#888888]">
          <span className="text-[#EDEDED] font-semibold">Device intelligence:</span> SlyOS profiles each device to optimize model selection and inference.
          Click any device row to see its full hardware profile, SlyOS Score, and performance history.
          Manage billing in <a href="/dashboard/settings?tab=billing" className="text-[#FF4D00] hover:underline">Settings</a>.
        </p>
      </div>
    </div>
  );
}
