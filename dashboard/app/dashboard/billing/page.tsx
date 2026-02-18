'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getBillingStatus, createCheckout, openBillingPortal } from '@/lib/api';
import {
  CreditCard, Zap, Shield, Check, AlertTriangle, Loader2, X, TrendingUp
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadBillingStatus();

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
    } catch (err) {
      console.error('Failed to load billing status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const session = await createCheckout();
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
  const billableDevices = billingStatus?.billable_devices ?? Math.max(enabledDevices - 1, 0);
  const costPerDevice = 10;
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
                    <p className="text-2xl font-bold text-[#EDEDED]">{billingStatus.days_remaining || 0} days</p>
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
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-2">Total Devices</p>
              <p className="text-3xl font-bold text-[#EDEDED]">{enabledDevices}</p>
              <p className="text-xs text-[#4ade80] mt-1">1st device is free</p>
            </div>
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-[#555555] uppercase tracking-wider font-medium mb-3">Monthly Cost</p>
              <div className="space-y-2">
                {enabledDevices > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#4ade80]">1st device</span>
                    <span className="text-[#4ade80] font-semibold">Free</span>
                  </div>
                )}
                {billableDevices > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#888888]">{billableDevices} extra × ${costPerDevice}</span>
                    <span className="text-[#EDEDED] font-semibold">${totalMonthlyCost}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-[rgba(255,255,255,0.06)]">
                  <span className="text-[#EDEDED] font-semibold">Total</span>
                  <span className="text-[#EDEDED] font-bold text-lg">${totalMonthlyCost}/mo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4 text-[#FF4D00]" />
            Pro Plan Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-[#555555] uppercase tracking-wider font-medium mb-4">What's Included</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#EDEDED]">Unlimited inferences per device</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#EDEDED]">Access to all AI models</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#EDEDED]">Device profiling and analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#EDEDED]">Advanced analytics dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[#22c55e] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#EDEDED]">Email support</span>
                </li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#FF4D00]/5 to-[#FF6B35]/5 rounded-lg p-6 border border-[#FF4D00]/10">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <p className="text-sm text-[#555555] uppercase tracking-wider font-medium mb-3">Pricing</p>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-[#4ade80]">Free</span>
                    </div>
                    <p className="text-xs text-[#888888]">Your 1st device — always free, no card needed</p>
                  </div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-[#FF4D00]">$10</span>
                      <span className="text-[#888888]">/device/month</span>
                    </div>
                    <p className="text-xs text-[#555555]">Each additional device, billed monthly</p>
                  </div>
                </div>
                <div className="text-xs text-[#555555] space-y-1">
                  <p>First device always free — no credit card required</p>
                  <p>30-day free trial when adding more devices</p>
                  <p>Cancel anytime, no long-term contracts</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
