'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getProfile, updateProfile, changePassword, updateOrganization } from '@/lib/api';
import {
  User, Mail, Building2, Lock, Shield, Save, Loader2, Check, AlertCircle, Key, Calendar
} from 'lucide-react';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Org form
  const [orgName, setOrgName] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMsg, setOrgMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setOrgName(data.organization?.name || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await updateProfile({ name, email });
      // Update localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, name: updated.name, email: updated.email }));
      setProfileMsg({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleOrgSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgSaving(true);
    setOrgMsg(null);
    try {
      const updated = await updateOrganization({ name: orgName });
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.organization) {
        user.organization.name = updated.name;
        localStorage.setItem('user', JSON.stringify(user));
      }
      setOrgMsg({ type: 'success', text: 'Organization updated successfully' });
    } catch (err: any) {
      setOrgMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update organization' });
    } finally {
      setOrgSaving(false);
    }
  };

  const StatusMessage = ({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) => {
    if (!msg) return null;
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm mt-4 ${
        msg.type === 'success'
          ? 'bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]'
          : 'bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444]'
      }`}>
        {msg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
        {msg.text}
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#EDEDED]">Account Settings</h1>
        <p className="text-sm text-[#555555] mt-1">Manage your profile, security, and organization</p>
      </div>

      {/* Profile Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-[#FF4D00]" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#888888] mb-2 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
                <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-10" placeholder="Your name" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888888] mb-2 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="Email address" />
              </div>
            </div>

            {profile && (
              <div className="flex items-center gap-4 pt-2 text-xs text-[#555555]">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  <span>Role: <span className="text-[#EDEDED] font-medium capitalize">{profile.role}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>Joined: <span className="text-[#888888]">{new Date(profile.created_at).toLocaleDateString()}</span></span>
                </div>
              </div>
            )}

            <StatusMessage msg={profileMsg} />

            <Button type="submit" size="sm" disabled={profileSaving} className="gap-2">
              {profileSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="w-4 h-4 text-[#FF4D00]" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#888888] mb-2 uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-10" placeholder="Enter current password" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888888] mb-2 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10" placeholder="Min 8 characters" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888888] mb-2 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" placeholder="Confirm new password" required />
              </div>
            </div>

            <StatusMessage msg={passwordMsg} />

            <Button type="submit" size="sm" disabled={passwordSaving} className="gap-2">
              {passwordSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Organization Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4 text-[#FF4D00]" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOrgSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#888888] mb-2 uppercase tracking-wider">Organization Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555]" />
                <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="pl-10" placeholder="Organization name" />
              </div>
            </div>

            {profile?.organization && (
              <div className="p-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-3 h-3 text-[#555555]" />
                  <span className="text-xs text-[#555555] uppercase tracking-wider font-medium">API Key</span>
                </div>
                <div className="font-mono text-xs text-[#888888] break-all">{profile.organization.api_key}</div>
              </div>
            )}

            <StatusMessage msg={orgMsg} />

            <Button type="submit" size="sm" disabled={orgSaving || profile?.role !== 'admin'} className="gap-2">
              {orgSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Organization
            </Button>
            {profile?.role !== 'admin' && (
              <p className="text-xs text-[#555555]">Only admins can update organization settings.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
