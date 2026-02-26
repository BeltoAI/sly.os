'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBillingStatus, createCheckout, openBillingPortal, validateDiscount, createCheckoutWithDiscount, getCreditsBalance } from '@/lib/api';
import {
  CreditCard, Zap, Shield, Check, AlertTriangle, Loader2, X, TrendingUp, Coins, Tag
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [creditsBalance, setCreditsBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [validateLoading, setValidateLoading] = useState(false);

  useEffect(() => {
    loadBillingStatus();
    loadCreditsBalance();

    // Check for success/canceled params
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setNotification({ type: 'success', message: 'Payment successful! Your subscription is now active.' });
    } else if (canceled === 'true') {
      setNotification({ type: 'error', message: 'Payment was canceled. Please try again.' });
    }
  }, [searchParams]);

  const loadBillingStatus = async () => {
    try {
      const data = await getBillingStatus();
      setBillingStatus(data);
      // Store plan type in localStorage for other pages to access
      if (data?.plan_type) {
        localStorage.setItem('userPlan', data.plan_type);
      }
    } catch (err) {
      console.error('Failed to load billing status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditsBalance = async () => {
    try {
      const data = await getCreditsBalance();
      setCreditsBalance(data);
    } catch (err) {
      console.error('Failed to load credits balance:', err);
    }
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

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const session = appliedDiscount
        ? await createCheckoutWithDiscount(appliedDiscount.code)
        : await createCheckout();
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
  const planType = billingStatus?.plan_type || 'pure_edge'; // 'trial', 'pure_edge', 'hybrid_rag'

  // Pricing tiers
  const plans = {
    pure_edge: { name: 'Pure Edge', price: 0.15 },
    hybrid_rag: { name: 'Hybrid RAG', price: 0.45 }
  };

  const costPerDevice = plans[planType as keyof typeof plans]?.price || plans.pure_edge.price;
  const totalMonthlyCost = billableDevices * costPerDevice;

  return (
    <div className="max-w-4xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#EDEDED] flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-[#FF4D00]" />
          Billing & Subscription
        </h1>
        <p className="text-sm text-[#555555] mt-2">Manage your subscription and billing information</p>
      </div>

      {notification && <NotificationBanner notification={notification} />}

      {/* Trial Days Remaining Card */}
      {billingStatus?.subscription_status === 'trial' && billingStatus?.trial_days_remaining !== undefined && (
        <div className="mb-6 p-6 rounded-lg bg-gradient-to-r from-[#3b82f6]/10 to-[#FF4D00]/10 border border-[#3b82f6]/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-3">Trial Days Remaining</p>
              <p className="text-5xl font-bold text-[#EDEDED]">{billingStatus.trial_days_remaining}</p>
              <p className="text-xs text-[#888888] mt-2">Days left in your free trial</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-3">Trial Progress</p>
              <div className="space-y-3">
                <div className="w-full h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#3b82f6] to-[#FF4D00] transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((billingStatus.trial_days_total - billingStatus.trial_days_remaining) / billingStatus.trial_days_total) * 100))}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#888888]">
                  <span>{billingStatus.trial_days_total - billingStatus.trial_days_remaining} of {billingStatus.trial_days_total} days used</span>
                  <span>Trial ends: {billingStatus.trial_end_date ? new Date(billingStatus.trial_end_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Subscription Status Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-[#FF4D00]" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                isTrialActive || isActive
                  ? 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20'
                  : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isTrialActive || isActive ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
                }`} />
                {isTrialActive ? 'Free Trial' : isActive ? 'Active' : 'Expired'}
              </div>
            </div>

            {/* Trial Information */}
            {isTrialActive && billingStatus?.trial_end_date && (
              <div className="p-4 rounded-lg bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.1)]">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-1">Trial Remaining</p>
                    <p className="text-2xl font-bold text-[#EDEDED]">{billingStatus.trial_days_remaining || 0} days</p>
                  </div>
                  <div className="text-sm text-[#888888]">
                    <p>Trial ends: <span className="text-[#EDEDED] font-medium">{new Date(billingStatus.trial_end_date).toLocaleDateString()}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Subscription Information */}
            {isActive && billingStatus?.next_billing_date && (
              <div className="p-4 rounded-lg bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.1)]">
                <div className="space-y-2">
                  <p className="text-xs text-[#555555] uppercase tracking-wider font-medium">Next Billing Date</p>
                  <p className="text-lg font-semibold text-[#EDEDED]">{new Date(billingStatus.next_billing_date).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            {/* Expired/Canceled Information */}
            {isExpired && (
              <div className="p-4 rounded-lg bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.1)]">
                <p className="text-sm text-[#ef4444]">Your subscription has expired. Subscribe now to continue using all features.</p>
              </div>
            )}

            {/* Current Plan */}
            {(isTrialActive || isActive) && (
              <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
                <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-3">Current Plan</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#EDEDED]">${costPerDevice}</span>
                  <span className="text-[#888888]">/device/month</span>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!isActive && !isExpired && isTrialActive && (
              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <Button
                  onClick={handleSubscribe}
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
              </div>
            )}

            {isExpired && (
              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <Button
                  onClick={handleSubscribe}
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
              </div>
            )}

            {isActive && (
              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Selector Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-[#FF4D00]" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium">Your Plan</p>
              <div className="p-4 rounded-lg bg-[rgba(255,77,0,0.08)] border border-[rgba(255,77,0,0.2)]">
                <p className="text-lg font-bold text-[#EDEDED]">{plans[planType as keyof typeof plans]?.name}</p>
                <p className="text-xs text-[#888888] mt-1">${plans[planType as keyof typeof plans]?.price}/device/month</p>
              </div>
            </div>
            <div className="text-xs text-[#666666] space-y-2 pt-2 border-t border-[rgba(255,255,255,0.06)]">
              {planType === 'pure_edge' && (
                <>
                  <p className="font-semibold text-[#EDEDED]">Pure Edge includes:</p>
                  <ul className="space-y-1 text-[#888888]">
                    <li>• Edge inference on device</li>
                    <li>• Model zoo access</li>
                    <li>• Device profiling & analytics</li>
                    <li>• Email support</li>
                  </ul>
                </>
              )}
              {planType === 'hybrid_rag' && (
                <>
                  <p className="font-semibold text-[#EDEDED]">Hybrid RAG includes:</p>
                  <ul className="space-y-1 text-[#888888]">
                    <li>• Everything in Pure Edge</li>
                    <li>• RAG knowledge bases</li>
                    <li>• Vector search</li>
                    <li>• Document management</li>
                    <li>• URL scraping & offline sync</li>
                  </ul>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Discount Code Card */}
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

        {/* Free Inferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="w-4 h-4 text-[#FF4D00]" />
              Free Inferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-2">
                {creditsBalance?.is_subscribed ? 'Subscription Status' : 'Free Inferences Remaining'}
              </p>
              {creditsBalance?.is_subscribed ? (
                <>
                  <p className="text-3xl font-bold text-[#22c55e]">Unlimited</p>
                  <p className="text-xs text-[#4ade80] mt-1">Active subscription — no limits</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-[#EDEDED]">
                    {typeof creditsBalance?.balance === 'number' ? creditsBalance.balance : 100}
                  </p>
                  <p className="text-xs text-[#888888] mt-1">of 100 free inferences</p>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF4D00] to-[#FF6B35] transition-all"
                      style={{ width: `${Math.max(0, Math.min(100, ((typeof creditsBalance?.balance === 'number' ? creditsBalance.balance : 100) / 100) * 100))}%` }}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-3">How it works</p>
              <div className="space-y-2 text-sm text-[#888888]">
                <p>Every new account gets <span className="text-[#EDEDED] font-semibold">100 free inferences</span> to try SlyOS.</p>
                {!creditsBalance?.is_subscribed && (
                  <p>After that, subscribe to Pure Edge or Hybrid RAG for <span className="text-[#FF4D00] font-semibold">unlimited inferences</span>. No per-inference charges ever.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-[#FF4D00]" />
              Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-2">Enabled Devices</p>
              <p className="text-3xl font-bold text-[#EDEDED]">{enabledDevices}</p>
              <p className="text-xs text-[#888888] mt-1">All devices billable</p>
            </div>
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-3">Monthly Cost</p>
              <div className="space-y-2">
                {billableDevices > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#888888]">{billableDevices} device{billableDevices > 1 ? 's' : ''} × ${costPerDevice}</span>
                    <span className="text-[#EDEDED] font-semibold">${totalMonthlyCost.toFixed(2)}</span>
                  </div>
                )}
                {billableDevices === 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#888888]">No enabled devices</span>
                    <span className="text-[#EDEDED] font-semibold">$0.00</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#EDEDED] font-semibold">Total</span>
                  <span className="text-[#EDEDED] font-bold text-lg">${totalMonthlyCost.toFixed(2)}/mo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Plans Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-[#FF4D00]" />
            Pricing Plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pure Edge Plan */}
            <div className={`rounded-2xl p-6 border-2 transition-all ${
              planType === 'pure_edge'
                ? 'bg-[rgba(255,77,0,0.08)] border-[#22c55e]'
                : 'bg-[rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.1)]'
            }`}>
              {planType === 'pure_edge' && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#EDEDED]">Pure Edge</h3>
                  <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-3 py-1 rounded-full font-semibold">Current Plan</span>
                </div>
              )}
              {planType !== 'pure_edge' && (
                <h3 className="text-lg font-bold text-[#EDEDED] mb-4">Pure Edge</h3>
              )}
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
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">Edge inference on device</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">Model zoo access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">Device profiling & analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">Email support</span>
                  </li>
                </ul>
              </div>
              {planType !== 'pure_edge' && (
                <Button variant="outline" className="w-full gap-2">
                  Downgrade to Pure Edge
                </Button>
              )}
            </div>

            {/* Hybrid RAG Plan */}
            <div className={`rounded-2xl p-6 border-2 transition-all ${
              planType === 'hybrid_rag'
                ? 'bg-[rgba(255,77,0,0.08)] border-[#22c55e]'
                : 'bg-[rgba(0,0,0,0.2)] border-[rgba(255,255,255,0.1)]'
            }`}>
              {planType === 'hybrid_rag' && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#EDEDED]">Hybrid RAG</h3>
                  <span className="text-xs bg-[#22c55e]/20 text-[#22c55e] px-3 py-1 rounded-full font-semibold">Current Plan</span>
                </div>
              )}
              {planType !== 'hybrid_rag' && (
                <h3 className="text-lg font-bold text-[#EDEDED] mb-4">Hybrid RAG</h3>
              )}
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
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">RAG knowledge bases</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">Vector search</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">Document management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#EDEDED]">URL scraping & offline sync</span>
                  </li>
                </ul>
              </div>
              {planType !== 'hybrid_rag' && (
                <Button className="w-full gap-2 bg-[#FF4D00] hover:bg-[#E63F00]">
                  Upgrade to Hybrid RAG
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6 p-4 bg-[rgba(255,77,0,0.05)] border border-[rgba(255,77,0,0.1)] rounded-lg">
            <p className="text-xs text-[#888888]">
              <span className="text-[#EDEDED] font-semibold">Billing & Trial:</span> All new accounts start with a free trial. After the trial ends, billing is per-device per-month. Cancel anytime, no contracts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
