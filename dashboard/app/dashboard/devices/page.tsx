'use client';
import { useEffect, useState } from 'react';
import { getDevices } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Monitor, Globe, Cpu, HardDrive, Activity, Clock } from 'lucide-react';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDevices()
      .then(setDevices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const platformIcon = (platform: string) => {
    const iconClass = "w-4 h-4";
    if (platform === 'ios') return <Monitor className={`${iconClass} text-blue-400`} />;
    if (platform === 'android') return <Smartphone className={`${iconClass} text-green-400`} />;
    if (platform === 'web') return <Globe className={`${iconClass} text-purple-400`} />;
    if (platform === 'nodejs') return <Cpu className={`${iconClass} text-orange-400`} />;
    return <Activity className={`${iconClass} text-gray-400`} />;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED]">Devices</h1>
        <p className="text-sm text-[#888888] mt-2">{devices.length} registered device{devices.length !== 1 ? 's' : ''} in your fleet</p>
      </div>

      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.4)]">
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Device ID</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Platform</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Memory</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">CPU</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">GPU</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Models</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-[11px] font-semibold text-[#888888] uppercase tracking-wider">Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-200">
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
                  <td className="py-4 px-6">
                    <span className={`text-xs font-medium ${device.has_gpu ? 'text-[#4ade80]' : 'text-[#555555]'}`}>
                      {device.has_gpu ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-[#AAAAAA]">{device.model_count || 0}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold inline-flex items-center gap-1.5 ${
                      device.status === 'active'
                        ? 'bg-[#4ade80]/15 text-[#4ade80]'
                        : 'bg-[rgba(255,255,255,0.06)] text-[#888888]'
                    }`}>
                      {device.status === 'active' && <div className="w-1.5 h-1.5 bg-[#4ade80] rounded-full" />}
                      {device.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-xs text-[#666666] font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(device.last_seen).toLocaleDateString()}
                  </td>
                </tr>
              ))}
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
  );
}
