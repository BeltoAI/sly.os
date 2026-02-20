'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Smartphone, Bot, Key, BookOpen, Settings, LogOut, Flame, ChevronRight, CreditCard, Database
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/devices', label: 'Devices', icon: Smartphone },
  { href: '/dashboard/knowledge-base', label: 'Knowledge Base', icon: Database },
  { href: '/dashboard/models', label: 'Models', icon: Bot },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/get-started', label: 'Integration', icon: BookOpen },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) { router.push('/'); return; }
    if (userData) setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => { localStorage.clear(); router.push('/'); };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#050505]">
      {/* Sidebar */}
      <aside className="w-[260px] border-r border-[rgba(255,255,255,0.06)] bg-[#050505] flex flex-col fixed h-screen">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[rgba(255,255,255,0.06)]">
          <div className="w-8 h-8 rounded-lg bg-[#FF4D00] flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">SlyOS</span>
          <span className="ml-auto text-[10px] font-mono text-[#555555] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded">v1.0</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));
            return (
              <Link key={href} href={href}>
                <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-[rgba(255,77,0,0.1)] text-[#FF4D00] border border-[rgba(255,77,0,0.2)]'
                    : 'text-[#888888] hover:text-[#EDEDED] hover:bg-[rgba(255,255,255,0.04)]'
                }`}>
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="text-sm font-medium">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[rgba(255,77,0,0.15)] flex items-center justify-center text-[#FF4D00] text-xs font-bold">
              {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#EDEDED] truncate">{user.name || 'User'}</div>
              <div className="text-[11px] text-[#555555] truncate">{user.email}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2 text-[#555555] hover:text-[#ef4444]">
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-[260px]">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
