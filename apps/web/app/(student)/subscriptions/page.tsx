'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch } from '../../../lib/api';
import { Calendar, HelpCircle, Loader2, Award, Compass, Play, Pause, Check, ShieldAlert, Sparkles, MapPin, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../lib/context/ToastContext';

interface AutoOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface SubscriptionDetails {
  id: string;
  planType: 'WEEKLY' | 'MONTHLY';
  menuId: string;
  menu: { name: string };
  deliveryBlockId: string;
  deliveryBlock: { name: string; shortCode: string };
  deliveryAddress: string;
  preferredSlot: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';
  startDate: string;
  endDate: string;
  lastOrderedDate: string | null;
  autoOrders: AutoOrder[];
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

interface Menu {
  id: string;
  name: string;
  items: MenuItem[];
}

interface Block {
  id: string;
  name: string;
  shortCode: string;
}

const PLAN_PRICES = {
  WEEKLY: 500.0,
  MONTHLY: 1800.0,
};

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { showConfirm } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<SubscriptionDetails | null>(null);
  
  // Selection states for new purchase
  const [selectedPlan, setSelectedPlan] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [menus, setMenus] = useState<Menu[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('12:30');
  
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadPageData = async () => {
      setIsLoading(true);
      try {
        // Fetch active subscription
        const sub = await apiFetch('/api/subscriptions/active');
        setActiveSub(sub);

        // Fetch menus and blocks for purchasing setup
        const fetchedMenus = await apiFetch('/api/menus?mealType=LUNCH').catch(() => []);
        setMenus(fetchedMenus);
        if (fetchedMenus.length > 0) setSelectedMenuId(fetchedMenus[0].id);

        const fetchedBlocks = await apiFetch('/api/menus/blocks').catch(() => []);
        setBlocks(fetchedBlocks);
        if (fetchedBlocks.length > 0) setSelectedBlockId(fetchedBlocks[0].id);

        // Auto-fill address from user model
        if (user) {
          setAddressDetail(user.defaultAddress || '');
        }
      } catch (err) {
        console.error('Failed to load subscription data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPageData();
  }, [isAuthenticated, router]);

  // Handle pass purchase
  const handlePurchaseSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuId || !selectedBlockId || !addressDetail.trim() || !preferredSlot) return;

    setPurchaseLoading(true);
    setPurchaseError('');
    try {
      const sub = await apiFetch('/api/subscriptions/purchase', {
        method: 'POST',
        body: JSON.stringify({
          planType: selectedPlan,
          menuId: selectedMenuId,
          deliveryBlockId: selectedBlockId,
          deliveryAddress: addressDetail.trim(),
          preferredSlot,
        }),
      });

      setActiveSub(sub);
      confetti({ particleCount: 120, spread: 80 });
    } catch (err: any) {
      setPurchaseError(err.message || 'Pass purchase failed. Verify wallet balance.');
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Toggle Pause/Resume
  const handleTogglePause = async () => {
    if (!activeSub) return;
    setActionLoading(true);
    try {
      const updated = await apiFetch('/api/subscriptions/toggle-pause', { method: 'POST' });
      setActiveSub({ ...activeSub, status: updated.status });
      confetti({ particleCount: 40, spread: 30 });
    } catch (err: any) {
      alert(err.message || 'Failed to toggle pass status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Pass
  const handleCancelSub = async () => {
    if (!activeSub) return;
    const confirmed = await showConfirm('Are you sure you want to cancel your prepaid thali pass? Note: refunds are calculated by admin.');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      await apiFetch('/api/subscriptions/cancel', { method: 'POST' });
      setActiveSub(null);
      alert('Subscription pass successfully cancelled.');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel pass.');
    } finally {
      setActionLoading(false);
    }
  };

  // Compute days remaining
  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-2xl mx-auto p-4">
        <div className="h-44 bg-slate-100 rounded-3xl skeleton-shimmer" />
        <div className="h-60 bg-slate-100 rounded-3xl skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-secondary tracking-tight">Prepaid Thali Pass</h1>
        <p className="text-xs text-text-muted">Prepay for your daily meals, skip checkouts, and automate delivery coordinates.</p>
      </div>

      <AnimatePresence mode="wait">
        {activeSub ? (
          /* SECTION 1: Active Pass Dashboard */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Active Pass Card Details */}
            <div className="bg-gradient-to-br from-secondary via-[#1E294B] to-zinc-950 text-white p-6 rounded-[28px] shadow-lg border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
              
              <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] font-black bg-primary text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {activeSub.planType} PASS
                  </span>
                  <h2 className="text-lg font-bold mt-1">Prepaid Thali Subscription</h2>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${activeSub.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                  {activeSub.status}
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-4 mt-6 border-t border-white/10 pt-4 text-xs font-semibold text-gray-300">
                <div className="space-y-0.5">
                  <span className="text-[8px] text-gray-400 font-bold uppercase block">Time Slot</span>
                  <span className="text-white text-sm font-bold">⏰ {activeSub.preferredSlot} PM</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[8px] text-gray-400 font-bold uppercase block">Thali Package</span>
                  <span className="text-white text-sm font-bold truncate block">🍱 {activeSub.menu?.name || 'Lunch Thali'}</span>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <span className="text-[8px] text-gray-400 font-bold uppercase block">Delivery Destination</span>
                  <span className="text-white text-xs font-bold leading-tight">
                    📍 {activeSub.deliveryBlock?.name || 'Block'} • {activeSub.deliveryAddress}
                  </span>
                </div>
              </div>

              {/* Stats progress section */}
              <div className="relative z-10 mt-6 bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-inner">
                <div className="space-y-1">
                  <span className="text-[8px] text-gray-400 font-bold uppercase">Days Remaining</span>
                  <h3 className="text-2xl font-black text-primary leading-none tracking-tight">
                    {getDaysRemaining(activeSub.endDate)} Days
                  </h3>
                </div>
                <div className="text-right text-[9px] text-gray-400">
                  <p>Starts: {new Date(activeSub.startDate).toLocaleDateString()}</p>
                  <p>Expires: {new Date(activeSub.endDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Subscriptions management actions */}
            <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4">
              <h3 className="text-xs font-black text-secondary uppercase tracking-wider border-b border-slate-100 pb-3">
                Pass Management Controls
              </h3>

              <div className="flex gap-3">
                {activeSub.status === 'ACTIVE' ? (
                  <button
                    onClick={handleTogglePause}
                    disabled={actionLoading}
                    className="flex-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-primary py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Pause size={14} />}
                    <span>Pause Deliveries</span>
                  </button>
                ) : (
                  <button
                    onClick={handleTogglePause}
                    disabled={actionLoading}
                    className="flex-1 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    <span>Resume Pass</span>
                  </button>
                )}

                <button
                  onClick={handleCancelSub}
                  disabled={actionLoading}
                  className="flex-1 bg-white hover:bg-red-50 text-text-muted hover:text-red-500 border border-edge hover:border-red-200 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  <span>Cancel Lunch Pass</span>
                </button>
              </div>
            </div>

            {/* Auto-placements logs ledger */}
            <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4">
              <h3 className="text-xs font-black text-secondary uppercase tracking-wider border-b border-slate-100 pb-3">
                Auto-Order Placements Ledger
              </h3>

              {activeSub.autoOrders && activeSub.autoOrders.length > 0 ? (
                <div className="divide-y divide-slate-100 text-xs font-semibold text-text-muted">
                  {activeSub.autoOrders.map((ord) => (
                    <div key={ord.id} className="py-3 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-xl transition-colors">
                      <div className="space-y-0.5">
                        <span className="text-secondary font-bold">Order {ord.orderNumber}</span>
                        <p className="text-[9px] text-text-muted">
                          {new Date(ord.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[9px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase">
                          Prepaid (₹0.00)
                        </span>
                        <p className="text-[9px] text-text-muted font-bold uppercase">{ord.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2 flex flex-col items-center">
                  <span className="text-2xl animate-pulse">⏰</span>
                  <p className="text-xs text-text-muted font-bold">No orders placed yet. First placement triggers tomorrow!</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* SECTION 2: Pass Purchase Page */
          <motion.div
            key="purchase"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid md:grid-cols-2 gap-6 items-start"
          >
            {/* Purchase Form Card */}
            <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4">
              <h3 className="text-xs font-black text-secondary uppercase tracking-wider pl-0.5">Purchase Pass</h3>

              <form onSubmit={handlePurchaseSub} className="space-y-4">
                {/* Plan Selection Buttons */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('WEEKLY')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${selectedPlan === 'WEEKLY' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-edge hover:border-text-muted bg-white text-text-muted'}`}
                  >
                    <span className="text-xs font-black">Weekly Pass</span>
                    <span className="text-[9px] font-bold text-text-muted mt-0.5">₹{PLAN_PRICES.WEEKLY.toFixed(2)} (7 days)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlan('MONTHLY')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all text-center ${selectedPlan === 'MONTHLY' ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-edge hover:border-text-muted bg-white text-text-muted'}`}
                  >
                    <span className="text-xs font-black">Monthly Pass</span>
                    <span className="text-[9px] font-bold text-text-muted mt-0.5">₹{PLAN_PRICES.MONTHLY.toFixed(2)} (30 days)</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase">Select Thali Menu</label>
                  <select
                    value={selectedMenuId}
                    onChange={(e) => setSelectedMenuId(e.target.value)}
                    className="w-full border border-edge px-3.5 py-3 rounded-xl bg-white text-xs outline-none focus-ring-primary font-bold text-secondary shadow-sm"
                  >
                    {menus.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase">Campus Block / Hostel</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full border border-edge px-3.5 py-3 rounded-xl bg-white text-xs outline-none focus-ring-primary font-bold text-secondary shadow-sm"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.shortCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase">Room Details</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 304, 3rd Floor"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    className="w-full border border-edge px-3.5 py-3 rounded-xl text-xs outline-none focus-ring-primary font-bold text-secondary bg-slate-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase">Preferred Daily Time Slot</label>
                  <select
                    value={preferredSlot}
                    onChange={(e) => setPreferredSlot(e.target.value)}
                    className="w-full border border-edge px-3.5 py-3 rounded-xl bg-white text-xs outline-none focus-ring-primary font-bold text-secondary shadow-sm"
                  >
                    <option value="12:00">12:00 PM</option>
                    <option value="12:30">12:30 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="13:30">1:30 PM</option>
                  </select>
                </div>

                {purchaseError && (
                  <div className="bg-red-50 text-red-600 border border-red-100/60 p-3.5 rounded-2xl flex items-start gap-2 text-[9px] font-bold">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-500 animate-pulse" />
                    <span>{purchaseError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={purchaseLoading}
                  className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 disabled:from-slate-200 disabled:to-slate-300 disabled:text-text-muted text-white py-3.5 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  {purchaseLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Activate Prepaid Pass</span>
                </button>
              </form>
            </div>

            {/* Informational Card details */}
            <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4">
              <div className="space-y-2">
                <span className="text-[8px] font-black bg-orange-50 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                  How it works
                </span>
                <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Lunch Pass Benefits</h3>
              </div>

              <div className="space-y-4 text-xs font-semibold text-text-muted leading-relaxed">
                <div className="flex gap-3">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="text-secondary font-bold">Heavily Discounted Pricing</p>
                    <p className="text-[10px] text-text-muted leading-normal">
                      Weekly passes save you up to 15% on individual meal checkout overheads. Monthly thali pass saves up to 25%!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className="text-secondary font-bold">Automatic Order Placements</p>
                    <p className="text-[10px] text-text-muted leading-normal">
                      Our daily automated BullMQ job places your thali order each morning for delivery at your preferred slot to your hostel block coordinates.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-xl">⏸️</span>
                  <div>
                    <p className="text-secondary font-bold">Pause/Resume Anytime</p>
                    <p className="text-[10px] text-text-muted leading-normal">
                      Going home for the weekend? Pause your thali pass inside this dashboard to halt auto-orders, and resume when you are back on campus.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
