'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getProfile, updateProfile, changePassword, updateOrganization,
  getBillingStatus, createCheckout, openBillingPortal, validateDiscount, createCheckoutWithDiscount, getSubscriptionStatus
} from '@/lib/api';
import {
  User, Mail, Building2, Lock, Shield, Save, Loader2, Check, AlertCircle, Key, Calendar,
  CreditCard, Zap, Copy, Terminal, AlertTriangle, X, TrendingUp, Tag
} from 'lucide-react';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');

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

  // API Keys
  const [apiKey, setApiKey] = useState('');
  const [apiCopied, setApiCopied] = useState(false);

  // Billing
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [validateLoading, setValidateLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pure_edge' | 'hybrid_rag'>('pure_edge');

  useEffect(() => {
    const tab = searchParams.get('tab') || 'account';
    setActiveTab(tab);
    loadProfile();
    if (tab === 'billing') {
      loadBillingStatus();
      loadSubscriptionInfo();
    }
  }, [searchParams]);

  const loadProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setOrgName(data.organization?.name || '');
      setApiKey(data.organization?.api_key || 'sk_live_...');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBillingStatus = async () => {
    try {
      const data = await getBillingStatus();
      setBillingStatus(data);
      if (data?.plan_type) {
        localStorage.setItem('userPlan', data.plan_type);
      }
    } catch (err) {
      console.error('Failed to load billing status:', err);
    }
  };

  const loadSubscriptionInfo = async () => {
    try {
      const data = await getSubscriptionStatus();
      setSubscriptionInfo(data);
    } catch (err) {
      console.error('Failed to load subscription info:', err);
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

  const copyApiKeyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setApiCopied(true);
    setTimeout(() => setApiCopied(false), 2000);
  };

  const handleValidateDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code');
      return;
    }

    setValidateLoading(true);
    setDiscountError('');

    try {
      const result = await validateDiscount(discountCode);
      setAppliedDiscount(result);
      setDiscountCode('');
      setNotification({ type: 'success', message: `Discount applied: ${result.percent_off}% OFF` });
    } catch (err: any) {
      setDiscountError(err.response?.data?.error || 'Invalid discount code');
      setAppliedDiscount(null);
    } finally {
      setValidateLoading(false);
    }
  };

  const handleSubscribe = async (plan?: 'pure_edge' | 'hybrid_rag') => {
    const choosePlan = plan || selectedPlan;
    setCheckoutLoading(true);
    try {
      const session = appliedDiscount
        ? await createCheckoutWithDiscount(choosePlan, appliedDiscount.code)
        : await createCheckout(choosePlan);
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to create checkout session'
      });
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const portal = await openBillingPortal();
      if (portal.url) {
        window.location.href = portal.url;
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.error || 'Failed to open billing portal'
      });
      setPortalLoading(false);
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

  const NotificationBanner = ({ notification }: { notification: any }) => {
    if (!notification) return null;
    return (
      <div className={`flex items-start gap-3 px-4 py-4 rounded-lg border mb-6 ${
        notification.type === 'success'
          ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]'
          : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'
      }`}>
        <div className="flex-1">
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
        </div>
        <p className="text-sm font-medium flex-1">{notification.message}</p>
        <button
          onClick={() => setNotification(null)}
          className="text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isTrialActive = billingStatus?.subscription_status === 'trial';
  const isActive = billingStatus?.subscription_status === 'active';
  const isExpired = billingStatus?.subscription_status === 'expired' || billingStatus?.subscription_status === 'canceled';
  const deviceCount = billingStatus?.device_count || 0;
  const enabledDevices = billingStatus?.enabled_devices || deviceCount;
  const billableDevices = billingStatus?.billable_devices ?? enabledDevices;
  const planType = billingStatus?.plan_type || 'pure_edge';

  const plans = {
    pure_edge: { name: 'Pure Edge', price: 0.15 },
    hybrid_rag: { name: 'Hybrid RAG', price: 0.45 }
  };

  const costPerDevice = plans[planType as keyof typeof plans]?.price || plans.pure_edge.price;
  const totalMonthlyCost = billableDevices * costPerDevice;

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#EDEDED]">Settings</h1>
        <p className="text-sm text-[#555555] mt-1">Manage your account, organization, API keys, and billing</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 border-b border-[rgba(255,255,255,0.06)]">
        {[
          { id: 'account', label: 'Account', icon: User },
          { id: 'organization', label: 'Organization', icon: Building2 },
          { id: 'api-keys', label: 'API Keys', icon: Key },
          { id: 'billing', label: 'Billing', icon: CreditCard }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === id
                ? 'text-[#FF4D00]'
                : 'text-[#888888] hover:text-[#EDEDED]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {activeTab === id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4D00]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Account */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Profile Section */}
      <Card>
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
      <Card>
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
        </div>
      )}

      {/* Tab 2: Organization */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <Card>
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
      )}

      {/* Tab 3: API Keys */}
      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="w-4 h-4 text-[#FF4D00]" />
                Live API Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.3)]">
                <div className="flex-1 px-3 py-2 font-mono text-sm text-[#888888] truncate">{apiKey}</div>
                <Button
                  size="sm"
                  onClick={copyApiKeyToClipboard}
                  className="gap-2 shrink-0 bg-[#FF4D00]/20 hover:bg-[#FF4D00]/30 text-[#FF4D00] border-0"
                >
                  {apiCopied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#666666]">
                <Shield className="w-3.5 h-3.5" />
                Keep this key secret. Do not expose it in client-side code.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="w-4 h-4 text-[#FF4D00]" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-[#050505] border border-[rgba(255,255,255,0.06)] rounded-lg p-4 font-mono text-xs text-[#4ade80] overflow-x-auto leading-relaxed">
                <span style={{color:'#888888'}}>// Install SDK</span>{'\n'}
                <span style={{color:'#FF4D00'}}>npm install</span> @emilshirokikh/slyos-sdk{'\n\n'}
                <span style={{color:'#888888'}}>// Initialize</span>{'\n'}
                <span style={{color:'#FF4D00'}}>import</span> SlyOS <span style={{color:'#FF4D00'}}>from</span> <span style={{color:'#4ade80'}}>'@emilshirokikh/slyos-sdk'</span>;{'\n'}
                <span style={{color:'#FF4D00'}}>await</span> SlyOS.<span style={{color:'#8be9fd'}}>init</span>({'{'} apiKey: <span style={{color:'#4ade80'}}>'{apiKey.substring(0, 20)}...'</span> {'}'});{'\n\n'}
                <span style={{color:'#888888'}}>// Generate</span>{'\n'}
                <span style={{color:'#FF4D00'}}>const</span> response = <span style={{color:'#FF4D00'}}>await</span> SlyOS.<span style={{color:'#8be9fd'}}>generate</span>(<span style={{color:'#4ade80'}}>'quantum-1.7b'</span>, <span style={{color:'#4ade80'}}>'Hello!'</span>);
              </div>
              <Button
                className="gap-2 bg-[#FF4D00] hover:bg-[#E84300] text-white border-0"
                onClick={() => window.open('/dashboard/deploy', '_self')}
              >
                <Terminal className="w-4 h-4" /> View Deploy Guide
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Billing */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {notification && <NotificationBanner notification={notification} />}

          {/* Section 1: Current Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4 text-[#FF4D00]" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-[#EDEDED]">{plans[planType as keyof typeof plans]?.name}</h3>
                    <span className="text-xs bg-[#FF4D00]/20 text-[#FF4D00] px-3 py-1 rounded-full font-semibold">Current</span>
                  </div>
                  <p className="text-sm text-[#888888]">${plans[planType as keyof typeof plans]?.price}/device/month</p>
                </div>

                {isTrialActive && billingStatus?.trial_days_remaining !== undefined && (
                  <div className="p-4 rounded-lg bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.1)]">
                    <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-2">Trial Days Remaining</p>
                    <p className="text-3xl font-bold text-[#EDEDED] mb-3">{billingStatus.trial_days_remaining}</p>
                    <div className="w-full h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#3b82f6] to-[#FF4D00] transition-all duration-300"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((billingStatus.trial_days_total - billingStatus.trial_days_remaining) / billingStatus.trial_days_total) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {!isActive && isTrialActive && (
                <Button
                  onClick={() => handleSubscribe()}
                  disabled={checkoutLoading}
                  className="w-full gap-2 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              )}

              {isActive && (
                <Button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Manage Subscription
                    </>
                  )}
                </Button>
              )}

              {isExpired && (
                <Button
                  onClick={() => handleSubscribe()}
                  disabled={checkoutLoading}
                  className="w-full gap-2 bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] hover:from-[#FF5C1A] hover:to-[#FF7A4A] text-white font-semibold"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Reactivate Subscription
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Plan Selection */}
          {!isActive && (
            <p className="text-xs text-[#888888] mb-2">Select a plan, then click Subscribe below.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pure Edge Plan */}
            <div
              onClick={() => !isActive && setSelectedPlan('pure_edge')}
              className={`rounded-2xl p-6 border-2 transition-all ${!isActive ? 'cursor-pointer' : ''} ${
              isActive && planType === 'pure_edge'
                ? 'bg-[rgba(255,77,0,0.08)] border-[#22c55e]'
                : !isActive && selectedPlan === 'pure_edge'
                ? 'bg-[rgba(255,77,0,0.08)] border-[#FF4D00]'
                : 'bg-[rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#EDEDED]">Pure Edge</h3>
                {isActive && planType === 'pure_edge' && <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded-full">Active</span>}
                {!isActive && selectedPlan === 'pure_edge' && <span className="text-xs bg-[#FF4D00]/20 text-[#FF4D00] px-2 py-0.5 rounded-full">Selected</span>}
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-[#FF4D00]">$0.15</span>
                  <span className="text-[#888888]">/device/month</span>
                </div>
                <p className="text-xs text-[#555555]">Edge-first inference on your devices</p>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-xs text-[#555555] uppercase font-semibold">Features included:</p>
                <ul className="space-y-2">
                  {['Edge inference on device', 'Model zoo access', 'Device profiling & analytics', 'Email support'].map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#EDEDED]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {!isActive && selectedPlan === 'pure_edge' && (
                <Button
                  onClick={(e) => { e.stopPropagation(); handleSubscribe('pure_edge'); }}
                  disabled={checkoutLoading}
                  className="w-full gap-2 bg-[#FF4D00] hover:bg-[#E63F00] text-white"
                >
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Subscribe to Pure Edge
                </Button>
              )}
            </div>

            {/* Hybrid RAG Plan */}
            <div
              onClick={() => !isActive && setSelectedPlan('hybrid_rag')}
              className={`rounded-2xl p-6 border-2 transition-all ${!isActive ? 'cursor-pointer' : ''} ${
              isActive && planType === 'hybrid_rag'
                ? 'bg-[rgba(255,77,0,0.08)] border-[#22c55e]'
                : !isActive && selectedPlan === 'hybrid_rag'
                ? 'bg-[rgba(255,77,0,0.08)] border-[#FF4D00]'
                : 'bg-[rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#EDEDED]">Hybrid RAG</h3>
                {isActive && planType === 'hybrid_rag' && <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-2 py-0.5 rounded-full">Active</span>}
                {!isActive && selectedPlan === 'hybrid_rag' && <span className="text-xs bg-[#FF4D00]/20 text-[#FF4D00] px-2 py-0.5 rounded-full">Selected</span>}
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold text-[#FF4D00]">$0.45</span>
                  <span className="text-[#888888]">/device/month</span>
                </div>
                <p className="text-xs text-[#555555]">Edge inference + RAG knowledge bases</p>
              </div>
              <div className="space-y-3 mb-6">
                <p className="text-xs text-[#555555] uppercase font-semibold">Everything in Pure Edge, plus:</p>
                <ul className="space-y-2">
                  {['RAG knowledge bases', 'Vector search', 'Document management', 'URL scraping & offline sync'].map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                      <span className="text-sm text-[#EDEDED]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {!isActive && selectedPlan === 'hybrid_rag' && (
                <Button
                  onClick={(e) => { e.stopPropagation(); handleSubscribe('hybrid_rag'); }}
                  disabled={checkoutLoading}
                  className="w-full gap-2 bg-[#FF4D00] hover:bg-[#E63F00] text-white"
                >
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Subscribe to Hybrid RAG
                </Button>
              )}
            </div>
          </div>

          {/* Section 3: Subscription Status & Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Zap className="w-4 h-4 text-[#FF4D00]" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-2">Status</p>
                  {subscriptionInfo?.is_subscribed ? (
                    <>
                      <p className="text-3xl font-bold text-[#22c55e]">Active</p>
                      <p className="text-xs text-[#4ade80] mt-1">Unlimited inferences — {subscriptionInfo?.plan_type === 'hybrid_rag' ? 'Hybrid RAG' : 'Pure Edge'} plan</p>
                    </>
                  ) : isTrialActive ? (
                    <>
                      <p className="text-3xl font-bold text-[#60a5fa]">Trial</p>
                      <p className="text-xs text-[#888888] mt-1">{billingStatus?.trial_days_remaining} days remaining</p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-[#ef4444]">Inactive</p>
                      <p className="text-xs text-[#888888] mt-1">Subscribe to use SlyOS</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Discount Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="w-4 h-4 text-[#FF4D00]" />
                  Discount Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!appliedDiscount ? (
                  <>
                    <div>
                      <label className="text-xs text-[#555555] uppercase tracking-wider font-medium block mb-2">
                        Enter Discount Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={discountCode}
                          onChange={(e) => {
                            setDiscountCode(e.target.value.toUpperCase());
                            setDiscountError('');
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && handleValidateDiscount()}
                          placeholder="Enter code"
                          className="flex-1 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-[#FF4D00]/30 focus:bg-[rgba(255,255,255,0.06)] transition-colors text-sm"
                        />
                        <Button
                          onClick={handleValidateDiscount}
                          disabled={validateLoading || !discountCode.trim()}
                          className="bg-[#FF4D00] hover:bg-[#FF5C1A] text-white font-semibold h-9"
                        >
                          {validateLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Apply'
                          )}
                        </Button>
                      </div>
                    </div>
                    {discountError && (
                      <p className="text-xs text-[#ef4444]">{discountError}</p>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-[#555555] uppercase tracking-wider font-medium">Applied Discount</p>
                          <p className="text-lg font-bold text-[#EDEDED] mt-1">{appliedDiscount.percent_off}% OFF</p>
                          <p className="text-xs text-[#888888] mt-1">Code: {appliedDiscount.code}</p>
                        </div>
                        <Check className="w-5 h-5 text-[#4ade80]" />
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setAppliedDiscount(null);
                        setDiscountCode('');
                      }}
                      variant="outline"
                      className="w-full text-sm"
                    >
                      Remove Discount
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
