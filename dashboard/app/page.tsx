'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login } from '@/lib/api';
import Link from 'next/link';
import { Flame, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-[Inter]">
      {/* Glassmorphic background gradient effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#FF4D00] opacity-[0.03] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-[#FF4D00] opacity-[0.02] blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10 px-4 py-12">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#FF4D00] flex items-center justify-center shadow-[0_0_40px_-8px_rgba(255,77,0,0.5)]">
              <Flame className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-3">SlyOS</h1>
          <p className="text-base font-medium text-[#EDEDED] mb-2">Welcome back</p>
          <p className="text-sm text-[#888888]">Sign in to your Mission Control dashboard</p>
        </div>

        {/* Glassmorphic Card */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-8 shadow-[0_8px_32px_-8px_rgba(255,77,0,0.15)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#AAAAAA] mb-3 uppercase tracking-widest">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] group-focus-within:text-[#FF4D00] transition-colors duration-200" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-12 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#666666] rounded-xl focus:border-[#FF4D00] focus:bg-[rgba(255,255,255,0.08)] focus:outline-none focus:ring-0 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#AAAAAA] mb-3 uppercase tracking-widest">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666] group-focus-within:text-[#FF4D00] transition-colors duration-200" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-12 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white placeholder-[#666666] rounded-xl focus:border-[#FF4D00] focus:bg-[rgba(255,255,255,0.08)] focus:outline-none focus:ring-0 transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-[#FF4D00] hover:text-[#FF6B35] font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] text-[#FF6B6B] px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 mt-8 gap-2 bg-[#FF4D00] hover:bg-[#E64400] text-white font-semibold rounded-xl transition-all duration-200 shadow-[0_8px_24px_-4px_rgba(255,77,0,0.3)] hover:shadow-[0_12px_32px_-6px_rgba(255,77,0,0.4)]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Register Link */}
        <div className="text-center mt-8">
          <p className="text-sm text-[#777777]">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-[#FF4D00] font-semibold hover:text-[#FF6B35] transition-colors duration-200"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
