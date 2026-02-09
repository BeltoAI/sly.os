'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Copy, Check, Terminal, Shield } from 'lucide-react';

export default function ApiKeysPage() {
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    try {
      const user = u ? JSON.parse(u) : {};
      setApiKey(user.organization?.api_key || 'sk_live_...');
    } catch {}
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED]">API Keys</h1>
        <p className="text-sm text-[#888888] mt-2">Manage your authentication credentials</p>
      </div>

      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Key className="w-5 h-5 text-[#FF4D00]" />
            <h3 className="text-base font-semibold text-[#EDEDED]">Live API Key</h3>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.3)]">
            <div className="flex-1 px-3 py-2 font-mono text-sm text-[#888888] truncate">{apiKey}</div>
            <Button
              size="sm"
              onClick={copyToClipboard}
              className="gap-2 shrink-0 bg-[#FF4D00]/20 hover:bg-[#FF4D00]/30 text-[#FF4D00] border-0"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-[#666666]">
            <Shield className="w-3.5 h-3.5" />
            Keep this key secret. Do not expose it in client-side code.
          </div>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-[#0A0A0A]/80 border border-[rgba(255,255,255,0.08)] rounded-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <Terminal className="w-5 h-5 text-[#FF4D00]" />
            <h3 className="text-base font-semibold text-[#EDEDED]">Quick Start</h3>
          </div>
          <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#4ade80] overflow-x-auto mb-4 leading-relaxed">
            <span style={{color:'#888888'}}>// Install SDK</span>{'\n'}
            <span style={{color:'#FF4D00'}}>npm install</span> @emilshirokikh/slyos-sdk{'\n\n'}
            <span style={{color:'#888888'}}>// Initialize</span>{'\n'}
            <span style={{color:'#FF4D00'}}>import</span> SlyOS <span style={{color:'#FF4D00'}}>from</span> <span style={{color:'#4ade80'}}>'@emilshirokikh/slyos-sdk'</span>;{'\n'}
            <span style={{color:'#FF4D00'}}>await</span> SlyOS.<span style={{color:'#8be9fd'}}>init</span>({'{'} apiKey: <span style={{color:'#4ade80'}}>'{apiKey.substring(0, 20)}...'</span> {'}'});{'\n\n'}
            <span style={{color:'#888888'}}>// Generate</span>{'\n'}
            <span style={{color:'#FF4D00'}}>const</span> response = <span style={{color:'#FF4D00'}}>await</span> SlyOS.<span style={{color:'#8be9fd'}}>generate</span>(<span style={{color:'#4ade80'}}>'quantum-360m'</span>, <span style={{color:'#4ade80'}}>'Hello!'</span>);
          </div>
          <Button
            className="gap-2 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0"
            onClick={() => window.open('/dashboard/integration', '_self')}
          >
            <Terminal className="w-4 h-4" /> Full Integration Guide
          </Button>
        </div>
      </div>
    </div>
  );
}
