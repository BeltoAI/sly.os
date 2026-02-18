'use client';
import { useEffect, useState } from 'react';
import { getDevices, toggleDevice, removeDevice } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Smartphone, Monitor, Globe, Cpu, Activity, Clock,
  Power, PowerOff, Trash2, AlertTriangle, X, Check, Shield
} from 'lucide-react';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadDevices = () => {
    getDevices()
      .then(setDevices)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDevices(); }, []);

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
      setNotification({ type: 'success', message: 'Device removed permanently. It will no longer count toward billing.' });
      loadDevices();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to remove device' });
    } finally {
      setActionLoading(null);
    }
  };

  const enabledCount = devices.filter(d => d.enabled !== false).length;
  const disabledCount = devices.filter(d => d.enabled === false).length;
  const billableCount = Math.max(enabledCount - 1, 0);

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

      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1">Enabled Devices</p>
          <p className="text-2xl font-bold text-[#EDEDED]">{enabledCount}</p>
        </div>
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3 h-3 text-[#4ade80]" />
            <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold">1st Device</p>
          </div>
          <p className="text-2xl font-bold text-[#4ade80]">Free</p>
        </div>
        <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
          <p className="text-[10px] text-[#555555] uppercase tracking-wider font-semibold mb-1">Monthly Cost</p>
          <p className="text-2xl font-bold text-[#EDEDED]">
            ${billableCount * 10}
            <span className="text-sm font-normal text-[#555555] ml-1">
              {billableCount > 0 ? `(${billableCount} × $10)` : ''}
            </span>
          </p>
        </div>
      </div>

      {/* Device Table */}
      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.4)]">
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Device ID</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Platform</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Memory</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">CPU</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Models</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Last Seen</th>
                <th className="text-right py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, index) => {
                const isEnabled = device.enabled !== false;
                const isFirstEnabled = index === devices.findIndex(d => d.enabled !== false);
                return (
                  <tr key={device.id} className={`border-b border-[rgba(255,255,255,0.04)] transition-colors duration-200 ${
                    !isEnabled ? 'opacity-50' : 'hover:bg-[rgba(255,255,255,0.02)]'
                  }`}>
                    <td className="py-4 px-6 font-mono text-xs text-[#EDEDED]">
                      {device.device_id?.substring(0, 20)}...
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        {platformIcon(device.platform)}
                        <span className="text-[#EDEDED] text-xs capitalize">{device.platform}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-[#AAAAAA]">{device.total_memory_mb}MB</td>
                    <td className="py-4 px-6 text-xs text-[#AAAAAA]">{device.cpu_cores} cores</td>
                    <td className="py-4 px-6 text-xs text-[#AAAAAA]">{device.model_count || 0}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1.5 ${
                        isEnabled
                          ? 'bg-[#4ade80]/15 text-[#4ade80]'
                          : 'bg-[#ef4444]/15 text-[#ef4444]'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-[#4ade80]' : 'bg-[#ef4444]'}`} />
                        {isEnabled ? (isFirstEnabled ? 'Active (Free)' : 'Active') : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-[#666666] font-mono">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(device.last_seen).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Enable/Disable */}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === device.id}
                          className={`h-8 px-3 text-xs gap-1.5 ${
                            isEnabled
                              ? 'text-[#ef4444] hover:bg-[#ef4444]/10'
                              : 'text-[#4ade80] hover:bg-[#4ade80]/10'
                          }`}
                          onClick={() => handleToggle(device.id, isEnabled)}
                        >
                          {isEnabled ? <><PowerOff className="w-3.5 h-3.5" /> Disable</> : <><Power className="w-3.5 h-3.5" /> Enable</>}
                        </Button>

                        {/* Delete */}
                        {confirmDelete === device.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 px-2 text-xs text-[#ef4444] hover:bg-[#ef4444]/10"
                              disabled={actionLoading === device.id}
                              onClick={() => handleRemove(device.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              className="h-8 px-2 text-xs text-[#888888] hover:bg-[rgba(255,255,255,0.05)]"
                              onClick={() => setConfirmDelete(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 px-2 text-[#555555] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
                            onClick={() => setConfirmDelete(device.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
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

      {/* Info box */}
      <div className="mt-6 p-4 bg-[rgba(255,77,0,0.03)] border border-[rgba(255,77,0,0.12)] rounded-xl">
        <p className="text-xs text-[#888888]">
          <span className="text-[#EDEDED] font-semibold">How billing works:</span> Your first device is always free.
          Each additional enabled device is $10/month. Disabling a device stops its SDK access and removes it from billing.
          Removing a device deletes it permanently.
        </p>
      </div>
    </div>
  );
}
