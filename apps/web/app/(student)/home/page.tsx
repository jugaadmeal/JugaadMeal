'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch } from '../../../lib/api';
import { OrderDTO, PollDTO, MenuDTO } from 'shared-types';
import { Vote, ShoppingBag, Wallet, Timer, ArrowRight, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import TourGuide from '../../../components/shared/TourGuide';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function StudentHomePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [activeOrder, setActiveOrder] = useState<OrderDTO | null>(null);
  const [activePoll, setActivePoll] = useState<PollDTO | null>(null);
  const [todayMenu, setTodayMenu] = useState<MenuDTO | null>(null);
  const [mealTab, setMealTab] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS'>('LUNCH');
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuLoading, setIsMenuLoading] = useState(false);

  // Fetch initial base overview stats (active order & poll) once on auth mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchBaseData = async () => {
      setIsLoading(true);
      try {
        const [orders, poll] = await Promise.all([
          apiFetch('/api/orders'),
          apiFetch('/api/polls/active').catch(() => null)
        ]);

        const active = orders.find((o: OrderDTO) =>
          ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
        );
        setActiveOrder(active || null);
        setActivePoll(poll);
      } catch (err) {
        console.error('Failed to load home page base data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBaseData();
  }, [isAuthenticated, router]);

  // Fetch menu when tab changes without resetting the overview states
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMenu = async () => {
      setIsMenuLoading(true);
      try {
        const menu = await apiFetch(`/api/menus/today/${mealTab}`).catch(() => null);
        setTodayMenu(menu);
      } catch (err) {
        console.error('Failed to load menu for tab:', err);
      } finally {
        setIsMenuLoading(false);
      }
    };

    fetchMenu();
  }, [isAuthenticated, mealTab]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-surface-dark rounded-xl w-3/4 skeleton-shimmer" />
        <div className="h-28 bg-surface-dark rounded-xl skeleton-shimmer" />
        <div className="h-48 bg-surface-dark rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* 1. Header & Welcome */}
      <motion.div id="tour-header" variants={fadeUp} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-secondary tracking-tight">
            {getGreeting()}, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-text-muted">
            Hostel Block {user?.hostelBlock || 'H6'} • {user?.rollNumber || 'No roll number'}
          </p>
        </div>
        <Link
          id="tour-wallet"
          href="/wallet"
          className="flex items-center gap-3 panel px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all group hover-scale"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-md">
            <Wallet size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase font-bold leading-tight">Wallet Balance</p>
            <p className="text-sm font-extrabold text-secondary leading-tight">₹{user?.walletBalance?.toFixed(2) || '0.00'}</p>
          </div>
          <ChevronRight size={16} className="text-text-muted group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </motion.div>

      {/* 2. Active Order Banner */}
      {activeOrder && (
        <motion.div id="tour-orders" variants={fadeUp}>
          <Link
            href={`/orders/${activeOrder.id}`}
            className="block bg-gradient-to-r from-orange-500 via-primary to-orange-500 animate-gradient bg-200 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group hover-scale"
          >
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-white/10 select-none">
              <ShoppingBag size={120} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                  Active Order Tracking
                </span>
                <h3 className="text-lg font-bold">Order {activeOrder.orderNumber}</h3>
                <p className="text-xs text-orange-50 font-medium">
                  Status: <span className="underline font-bold capitalize">{activeOrder.status.toLowerCase().replace(/_/g, ' ')}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-bold w-fit">
                <Timer size={16} />
                <span>Est. Delivery: 15 mins</span>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* 3. Active Poll Banner */}
      {activePoll && !activePoll.userVotedOptionId && (
        <motion.div id="tour-poll" variants={fadeUp}>
          <div className="bg-secondary text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative z-10 space-y-2">
              <div className="inline-flex items-center gap-1 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-sm">
                <Vote size={12} />
                <span>Active Vote</span>
              </div>
              <h3 className="text-lg font-bold">{activePoll.title}</h3>
              <p className="text-xs text-gray-400">
                Your voice matters! Decide what the kitchen cooks tomorrow.
              </p>
            </div>
            <Link
              href="/poll"
              className="relative z-10 bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 group w-full md:w-auto text-sm shadow-lg"
            >
              Vote Now <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>
      )}

      {/* 4. Daily Menu Tabs & Listings */}
      <motion.div id="tour-menu" variants={fadeUp} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-secondary tracking-tight">Today&apos;s Menu Choices</h2>
          <span className="text-xs text-primary font-bold bg-orange-50 border border-orange-100 px-3 py-1 rounded-full uppercase">
            {mealTab} Selection
          </span>
        </div>

        {/* Meal Selector Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-edge shadow-sm overflow-x-auto">
          {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMealTab(tab)}
              className={`flex-1 min-w-[90px] text-center py-2.5 text-xs font-bold rounded-lg transition-all ${
                mealTab === tab
                  ? 'bg-gradient-to-r from-primary to-orange-500 text-white shadow-md'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-dark/50'
              }`}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {isMenuLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-28 bg-surface-dark rounded-2xl skeleton-shimmer" />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="h-24 bg-surface-dark rounded-xl skeleton-shimmer" />
              <div className="h-24 bg-surface-dark rounded-xl skeleton-shimmer" />
            </div>
          </div>
        ) : todayMenu ? (
          <div className="bg-white border border-edge rounded-2xl overflow-hidden shadow-sm hover-lift">
            {/* Menu Header Card */}
            <div className="p-6 border-b border-edge space-y-4 bg-gradient-to-b from-surface-dark/60 to-white relative overflow-hidden">
              <div className="absolute inset-0 bg-mesh-gradient opacity-40" />
              <div className="relative z-10">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-secondary">{todayMenu.name}</h3>
                      <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                        🏆 Popular Winner
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{todayMenu.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted line-through">₹{todayMenu.basePrice}</p>
                    <p className="text-lg font-extrabold text-gradient-primary">₹{todayMenu.studentPrice}</p>
                  </div>
                </div>

                <Link
                  href="/menu"
                  className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 text-sm mt-4"
                >
                  <ShoppingBag size={16} />
                  <span>Go to Menu and Order</span>
                </Link>
              </div>
            </div>

            {/* Menu Items Preview */}
            <div className="p-6 grid sm:grid-cols-2 gap-4">
              {todayMenu.items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="border border-edge p-4 rounded-xl flex justify-between items-center gap-4 bg-surface/30 hover:bg-orange-50/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="font-bold text-sm text-secondary">{item.name}</span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-tight">{item.description}</p>
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-[9px] bg-surface-dark text-text-muted px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-edge rounded-2xl p-10 text-center space-y-3 bg-white">
            <div className="w-14 h-14 bg-gradient-to-br from-surface-dark to-edge text-text-muted rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle size={24} />
            </div>
            <h4 className="font-bold text-secondary">No active menu for {mealTab.toLowerCase()}</h4>
            <p className="text-xs text-text-muted max-w-xs mx-auto">
              Tomorrow&apos;s menu details are currently being voted on. Vote now to choose the items!
            </p>
          </div>
        )}
      </motion.div>
      <TourGuide />
    </motion.div>
  );
}
