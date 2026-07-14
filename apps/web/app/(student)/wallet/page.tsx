'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch } from '../../../lib/api';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Calendar, HelpCircle, Loader2, Copy, Gift, Check, Share2, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import Logo, { LogoIcon } from '../../../components/shared/Logo';
import VirtualList from '../../../components/shared/VirtualList';

interface Transaction {
  id: string;
  type: 'CREDIT_TOPUP' | 'CREDIT_REFUND' | 'CREDIT_BONUS' | 'DEBIT_ORDER' | 'DEBIT_PENALTY' | 'CASHBACK';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// Animated counter component
function AnimatedCounter({ value, prefix = '₹' }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = count;
    let end = value;
    if (start === end) return;
    
    let startTime: number | null = null;
    const duration = 800; // ms

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(start + progress * (end - start));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{prefix}{count.toFixed(2)}</span>;
}

export default function StudentWalletPage() {
  const router = useRouter();
  const { user, updateUser, isAuthenticated } = useAuthStore();

  const [balance, setBalance] = useState(0);
  const [promoBalance, setPromoBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Referral states
  const [referralCode, setReferralCode] = useState('');
  const [referredById, setReferredById] = useState<string | null>(null);
  const [referralUsed, setReferralUsed] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyError, setApplyError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    setRotateX(-y / 8);
    setRotateY(x / 8);
  };
  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const loadWalletData = async () => {
    try {
      const wallet = await apiFetch('/api/wallet');
      setBalance(wallet.balance);
      setPromoBalance(wallet.promoBalance || 0);
      setTransactions(wallet.transactions || []);
      setReferralCode(wallet.referralCode || '');
      setReferredById(wallet.referredById || null);
      setReferralUsed(wallet.referralUsed || false);
    } catch (err) {
      console.error('Wallet fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadWalletData();
  }, [isAuthenticated, router]);

  const handleQuickAdd = (value: number) => {
    setAmount(value.toString());
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const topupAmount = parseFloat(amount);
    if (isNaN(topupAmount) || topupAmount <= 0) return;

    setTopupLoading(true);
    try {
      const response = await apiFetch('/api/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({
          amount: topupAmount,
          paymentMethod: 'UPI Sandbox',
        }),
      });

      // Update local state
      setBalance(response.balance);
      setPromoBalance(response.promoBalance || 0);
      
      // Update global auth store balance
      if (user) {
        updateUser({
          walletBalance: response.balance + (response.promoBalance || 0),
        });
      }

      // Re-fetch transactions
      const tx = await apiFetch('/api/wallet/transactions');
      setTransactions(tx);

      // Reset input
      setAmount('');

      // Celebration
      confetti({
        particleCount: 80,
        spread: 50,
      });
    } catch (err) {
      alert('Failed to process sandbox payment.');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCode.trim()) return;

    setApplyLoading(true);
    setApplyError('');
    setApplyMessage('');
    try {
      const res = await apiFetch('/api/wallet/apply-referral', {
        method: 'POST',
        body: JSON.stringify({ code: friendCode }),
      });
      setApplyMessage(res.message);
      setReferredById('applied'); // Update UI local state
      confetti({
        particleCount: 60,
        spread: 40,
      });
      // Refresh wallet details to verify
      await loadWalletData();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to apply referral code.');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    confetti({
      particleCount: 20,
      spread: 20,
      origin: { y: 0.8 }
    });
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4 max-w-4xl mx-auto">
        <div className="h-40 bg-slate-100 rounded-3xl skeleton-shimmer" />
        <div className="h-60 bg-slate-100 rounded-3xl skeleton-shimmer" />
      </div>
    );
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    if (type === 'CASHBACK') {
      return (
        <div className="w-9 h-9 rounded-xl bg-orange-50 text-primary flex items-center justify-center shadow-sm">
          <Award size={18} />
        </div>
      );
    }
    if (type.startsWith('CREDIT')) {
      return (
        <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shadow-sm">
          <ArrowDownLeft size={18} />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-sm">
        <ArrowUpRight size={18} />
      </div>
    );
  };

  // Group transactions by day
  const groupTransactions = (txList: Transaction[]) => {
    const groups: { [key: string]: Transaction[] } = {};
    txList.forEach((tx) => {
      const date = new Date(tx.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dayKey = '';
      if (date.toDateString() === today.toDateString()) {
        dayKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dayKey = 'Yesterday';
      } else {
        dayKey = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
      }

      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(tx);
    });
    return groups;
  };

  const groupedTx = groupTransactions(transactions);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20 max-w-4xl mx-auto px-4"
    >
      <motion.div variants={fadeUp} className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-secondary tracking-tight">Campus Wallet</h1>
          <p className="text-xs text-text-muted">Instant split checkouts, thali passes & friend cashback.</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-primary font-bold">
          🪙
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Wallet Balance Hero Card (Metallic 3D layout) */}
        <motion.div
          variants={fadeUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={!isTouchDevice ? {
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: 'transform 0.1s ease',
          } : undefined}
          className="bg-gradient-to-br from-secondary via-[#1E294B] to-zinc-950 text-white p-6 rounded-[28px] shadow-xl md:col-span-1 min-h-[220px] w-full flex flex-col justify-between relative overflow-hidden group cursor-pointer border border-white/10"
        >
          {/* Glowing mesh background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-primary/10 opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-300 font-bold uppercase tracking-widest leading-none">CampusEat Wallet</span>
              <span className="text-[7px] text-gray-400 font-medium tracking-tight mt-0.5">STUDENT BENEFIT CARD</span>
            </div>
            <LogoIcon size={36} className="text-white" />
          </div>

          <div className="relative z-10 flex items-center justify-between mt-4">
            {/* Gold metallic chip */}
            <svg className="w-9 h-7 rounded-md bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 p-1 flex flex-col justify-between overflow-hidden shadow-inner border border-amber-600/20" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="36" height="26" rx="3" stroke="#9A3412" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="12" y1="2" x2="12" y2="28" stroke="#9A3412" strokeWidth="1" />
              <line x1="28" y1="2" x2="28" y2="28" stroke="#9A3412" strokeWidth="1" />
              <line x1="2" y1="15" x2="38" y2="15" stroke="#9A3412" strokeWidth="1" />
            </svg>

            {/* Contactless wave icon */}
            <svg className="w-5 h-5 text-white/50 group-hover:text-white transition-colors animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" d="M12 18a6 6 0 0 0-6-6M15 15a9 9 0 0 0-9-9M18 12A12 12 0 0 0 6 0" />
            </svg>
          </div>

          {/* Account Balance Display */}
          <div className="relative z-10 space-y-1 mt-4">
            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-none">Available Balance</span>
            <div className="flex flex-wrap items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-sans leading-none tracking-tight">
                <AnimatedCounter value={balance} />
              </span>
              {promoBalance > 0 && (
                <span className="text-[9px] text-primary font-black bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-0.5 animate-pulse">
                  +₹{(promoBalance).toFixed(0)} coins
                </span>
              )}
            </div>
          </div>

          {/* Cardholder details */}
          <div className="relative z-10 flex justify-between items-end border-t border-white/10 pt-3 mt-3">
            <div className="space-y-0.5">
              <span className="text-[6px] text-gray-400 font-semibold uppercase leading-none block">Student Holder</span>
              <span className="text-xs font-bold tracking-wide uppercase leading-none truncate max-w-[120px] block">{user?.name}</span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[6px] text-gray-400 font-semibold uppercase leading-none block">Block</span>
              <span className="text-xs font-bold uppercase leading-none block">{user?.hostelBlock || 'CSE'}</span>
            </div>
          </div>
        </motion.div>

        {/* Add Money Form (Redesigned with grid) */}
        <motion.div
          variants={fadeUp}
          className="bg-white border border-edge p-6 rounded-[28px] shadow-sm md:col-span-2 space-y-5"
        >
          <h3 className="text-xs font-black text-secondary uppercase tracking-wider">Top-up Wallet</h3>
          
          <form onSubmit={handleTopup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase pl-0.5">Enter Amount (INR)</label>
              <div className="flex gap-2.5">
                <input
                  type="number"
                  required
                  placeholder="e.g. ₹200"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 border border-edge px-4 py-3 rounded-xl outline-none focus-ring-primary text-xs font-black bg-slate-50 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={topupLoading || !amount}
                  className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 disabled:from-slate-200 disabled:to-slate-300 disabled:text-text-muted text-white font-black px-6 py-3 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {topupLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>{topupLoading ? 'Adding...' : 'Add Balance'}</span>
                </button>
              </div>
            </div>

            {/* Quick selectors Grid with thali indicators */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-text-muted uppercase pl-0.5">Quick Selectors</span>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                {[
                  { val: 50, label: '☕ Snacks' },
                  { val: 100, label: '🍳 Breakfast' },
                  { val: 200, label: '🍱 Lunch Thali' },
                  { val: 500, label: '🎫 Weekly Pass' },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleQuickAdd(item.val)}
                    className="bg-slate-50 hover:bg-orange-50/50 border border-slate-200 hover:border-primary text-text-muted hover:text-primary py-2.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-0.5"
                  >
                    <span className="font-extrabold text-secondary group-hover:text-primary">₹{item.val}</span>
                    <span className="text-[7px] text-text-muted leading-none font-bold uppercase">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Referral Sharing Panel */}
        <motion.div
          variants={fadeUp}
          className="bg-gradient-to-br from-orange-50/50 via-white to-white border border-primary/10 p-6 rounded-[28px] shadow-sm md:col-span-1 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-primary animate-bounce-slow" />
            <h3 className="text-xs font-black text-secondary uppercase tracking-wider">Referral Program</h3>
          </div>

          <div className="bg-orange-50/50 p-4 rounded-2xl border border-dashed border-primary/20 space-y-2.5 text-center relative overflow-hidden">
            <p className="text-[10px] text-text-muted leading-relaxed">
              Share code with friends. You <strong>both</strong> receive <strong>₹50.00 Cashback</strong> in wallet upon their first thali purchase!
            </p>
            <div className="bg-white border border-edge px-3.5 py-2.5 rounded-xl flex justify-between items-center shadow-sm">
              <span className="text-xs font-black tracking-widest text-secondary font-mono select-all">
                {referralCode || 'CE-LOADING'}
              </span>
              <button
                onClick={handleCopyCode}
                className="text-primary hover:text-primary-hover p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                title="Copy code"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
            {copied && <span className="text-[8px] text-green-600 font-bold">Referral link copied to clipboard!</span>}
          </div>

          {/* Apply friend code */}
          {!referredById ? (
            <form onSubmit={handleApplyReferral} className="space-y-2.5 pt-2 border-t border-slate-100">
              <span className="text-[9px] font-black text-text-muted uppercase pl-0.5">Invited by a friend?</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Referral Code"
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  className="flex-1 border border-edge px-3 py-2 rounded-xl outline-none focus-ring-primary text-[10px] font-black uppercase text-secondary font-mono bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={applyLoading || !friendCode}
                  className="bg-secondary hover:bg-secondary-light text-white text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  {applyLoading ? 'Applying...' : 'Apply'}
                </button>
              </div>
              {applyError && <p className="text-[9px] text-red-500 font-bold pl-0.5">{applyError}</p>}
            </form>
          ) : (
            <div className="bg-green-50/50 border border-green-200/50 p-3 rounded-2xl text-[9px] font-bold text-green-700 flex items-center justify-between gap-1 shadow-sm">
              <span>🎉 Friend referral code applied! Cashback ready.</span>
              <Check size={12} className="shrink-0 text-green-600" />
            </div>
          )}
        </motion.div>

        {/* Dynamic ledger history grouped by day */}
        <motion.div
          variants={fadeUp}
          className="bg-white border border-edge p-6 rounded-[28px] shadow-sm md:col-span-2 space-y-4"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black text-secondary uppercase tracking-wider pl-0.5">Transaction Ledger</h3>
            <span className="text-[9px] bg-slate-100 text-text-muted px-2.5 py-0.5 rounded-full font-bold">
              {transactions.length} Transactions
            </span>
          </div>

          {transactions.length > 0 ? (
            <VirtualList
              items={transactions}
              itemHeight={64}
              windowHeight={380}
              renderItem={(tx: Transaction) => (
                <div key={tx.id} className="py-3 flex justify-between items-center gap-4 hover:bg-slate-50/40 transition-colors px-3 rounded-2xl border-b border-slate-100 last:border-0 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {getTransactionIcon(tx.type)}
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-secondary leading-tight truncate" title={tx.description}>
                        {tx.description}
                      </h4>
                      <p className="text-[9px] text-text-muted mt-0.5 leading-none flex items-center gap-1">
                        <span>Time:</span>
                        <span>{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-extrabold ${tx.type.startsWith('CREDIT') || tx.type === 'CASHBACK' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type.startsWith('CREDIT') || tx.type === 'CASHBACK' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-text-muted mt-0.5 leading-none font-medium">
                      Bal: ₹{tx.balanceAfter.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="text-center py-12 space-y-3 flex flex-col items-center justify-center">
              <span className="text-3xl animate-float">💸</span>
              <p className="text-xs text-text-muted font-bold">No ledger logs. Top-up to get started!</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
