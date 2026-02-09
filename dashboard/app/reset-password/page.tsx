'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Flame, Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-[#FF6B6B] mb-4">Invalid reset link. No token provided.</p>
        <Link href="/forgot-password">
          <Button className="gap-2 bg-[#FF4D00] hover:bg-[#E64400] text-white rounded-xl">
            Request New Link
          </Button>
        </Link>
      </div>
    );
  }

  return success ? (
    <div className="text-center py-4">
      <CheckCircle className="w-12 h-12 text-[#4ade80] mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-[#EDEDED] mb-2">Password Reset!</h3>
      <p className="text-sm text-[#888888] mb-6">Your password has been updated. You can now sign in.</p>
      <Link href="/">
        <Button className="w-full gap-2 bg-[#FF4D00] hover:bg-[#E64400] text-white rounded-xl">
          Sign In
        </Button>
      </Link>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-[#AAAAAA] mb-3 uppercase tracking-widest">New Password</label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] group-focus-within:text-[#FF4D00] transition-colors duration-200" />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="pl-12 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#666666] rounded-xl focus:border-[#FF4D00] focus:bg-[rgba(255,255,255,0.08)] focus:outline-none focus:ring-0 transition-all duration-200"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#AAAAAA] mb-3 uppercase tracking-widest">Confirm Password</label>
        <div className="relative group">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] group-focus-within:text-[#FF4D00] transition-colors duration-200" />
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm your password"
            className="pl-12 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#666666] rounded-xl focus:border-[#FF4D00] focus:bg-[rgba(255,255,255,0.08)] focus:outline-none focus:ring-0 transition-all duration-200"
            required
          />
        </div>
      </div>

      {error && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-[#FF6B6B] px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 gap-2 bg-[#FF4D00] hover:bg-[#E64400] text-white font-semibold rounded-xl transition-all duration-200 shadow-[0_8px_24px_-4px_rgba(255,77,0,0.3)]"
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-[Inter]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#FF4D00] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-[0_0_40px_-8px_rgba(255,77,0,0.5)]">
              <Flame className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-3">New Password</h1>
          <p className="text-sm text-[#888888]">Choose a strong password for your account</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-8 shadow-[0_8px_32px_-8px_rgba(255,77,0,0.15)]">
          <Suspense fallback={<div className="text-center text-[#888]">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-sm text-[#777777] hover:text-[#FF4D00] transition-colors flex items-center justify-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
