'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '../../../../lib/stores/authStore';
import { apiFetch, getSocket } from '../../../../lib/api';
import { OrderDTO } from 'shared-types';
import { CheckCircle2, ChevronRight, Phone, Clock, Star, MapPin, Compass, ArrowLeft, Info, HelpCircle, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderTrackingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, isAuthenticated, updateUser } = useAuthStore();

  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentLocation, setAgentLocation] = useState<{ lat: number; lng: number; eta: string } | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  
  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [foodRating, setFoodRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [packagingRating, setPackagingRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadOrderDetails = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch(`/api/orders/${orderId}`);
        setOrder(data);
        setQueuePosition(data.queuePosition || null);
        if (data.status === 'DELIVERED') {
          setShowReviewForm(!data.review);
        }
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderDetails();
  }, [isAuthenticated, orderId, router]);

  // Socket.io listeners for real-time tracking
  useEffect(() => {
    if (!order) return;

    const socket = getSocket();

    // Join room for this order
    socket.emit('subscribe:order', { orderId: order.id });

    // Listen status change
    socket.on('order:status_updated', (data: { orderId: string; status: any; order: any }) => {
      if (data.orderId === order.id) {
        setOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.status,
            ...data.order,
          };
        });

        if (data.status === 'DELIVERED') {
          setShowReviewForm(true);
          confetti({ particleCount: 100, spread: 60 });
        }
      }
    });

    // Listen agent coordinates
    socket.on('order:agent_location', (data: { orderId: string; lat: number; lng: number; eta: string }) => {
      if (data.orderId === order.id) {
        setAgentLocation({ lat: data.lat, lng: data.lng, eta: data.eta });
      }
    });

    // Listen to queue updates
    socket.on('order:queue_update', (data: { orderId: string; queuePosition: number }) => {
      if (data.orderId === order.id) {
        setQueuePosition(data.queuePosition);
      }
    });

    return () => {
      socket.off('order:status_updated');
      socket.off('order:agent_location');
      socket.off('order:queue_update');
    };
  }, [order]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewLoading(true);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          orderId,
          foodRating,
          deliveryRating,
          packagingRating,
          comment,
        }),
      });

      setReviewSubmitted(true);
      setShowReviewForm(false);
      
      // Update wallet locally for review incentive
      if (user) {
        updateUser({
          walletBalance: (user.walletBalance || 0) + 5.0,
        });
      }

      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-surface-dark rounded-xl w-1/4 skeleton-shimmer" />
        <div className="h-40 bg-surface-dark rounded-2xl skeleton-shimmer" />
        <div className="h-64 bg-surface-dark rounded-2xl skeleton-shimmer" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-10">
        <p className="text-text-muted">Order not found.</p>
        <Link href="/orders" className="text-primary font-bold">Go Back</Link>
      </div>
    );
  }

  const steps = [
    { label: 'Confirmed', status: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Preparing', status: ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Ready', status: ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'En Route', status: ['OUT_FOR_DELIVERY', 'DELIVERED'] },
    { label: 'Delivered', status: ['DELIVERED'] },
  ];

  const getStepIndex = () => {
    if (order.status === 'PENDING') return -1;
    if (order.status === 'CONFIRMED') return 0;
    if (order.status === 'PREPARING') return 1;
    if (order.status === 'READY') return 2;
    if (order.status === 'OUT_FOR_DELIVERY') return 3;
    if (order.status === 'DELIVERED') return 4;
    return -1;
  };

  const activeIndex = getStepIndex();

  return (
    <div className="space-y-8 pb-20 max-w-3xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/orders" className="text-text-muted hover:text-text-primary p-2.5 border border-edge bg-white rounded-xl shadow-sm transition-all hover:scale-105">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-secondary tracking-tight">Order Tracking</h1>
          <p className="text-xs text-text-muted">Order #{order.orderNumber} • {order.deliveryBlock.name}</p>
        </div>
      </div>

      {/* Queue position transparency indicator */}
      {queuePosition !== null && (order.status === 'CONFIRMED' || order.status === 'PREPARING' || order.status === 'PENDING') && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50/50 border border-orange-100 p-5 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-800 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-primary/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-xl animate-bounce">⏱️</span>
            <div>
              <p className="font-black text-secondary leading-none">Queue Transparency Status</p>
              <p className="text-[10px] text-text-muted mt-1 leading-normal uppercase">
                Your order is <strong className="text-primary font-black">#{queuePosition}</strong> in the kitchen prep queue.
              </p>
            </div>
          </div>
          <span className="bg-primary text-white border border-primary/20 px-3 py-1 rounded-xl font-extrabold text-[10px] uppercase shadow-sm shrink-0 tracking-wider relative z-10">
            Queue #{queuePosition}
          </span>
        </div>
      )}

      {/* 1. Status Progress Tracker */}
      <div className="bg-white border border-edge p-6 rounded-2xl shadow-sm space-y-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary to-orange-400" />
        
        <div className="flex justify-between items-center text-xs font-bold text-text-muted">
          <span>Jugaadmeal Kitchen</span>
          <span className="text-primary font-extrabold flex items-center gap-1 bg-orange-50 px-2.5 py-1 rounded-lg">
            <Clock size={14} className="animate-pulse" />
            Est. Arrival: {agentLocation?.eta || '15 mins'}
          </span>
        </div>

        {/* Timeline dots */}
        <div className="flex justify-between items-center relative px-2 pt-2">
          {/* Connector bar background */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-3 bg-edge h-[4px] rounded-full -z-10" />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activeIndex >= 0 ? (activeIndex / 4) * 94 : 0}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="absolute left-6 top-1/2 -translate-y-3 bg-gradient-to-r from-primary to-orange-400 h-[4px] rounded-full -z-10"
          />

          {steps.map((step, idx) => {
            const isCompleted = activeIndex >= idx;
            const isCurrent = activeIndex === idx;

            return (
              <div key={idx} className="flex flex-col items-center gap-2 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                    isCompleted
                      ? 'bg-gradient-to-br from-primary to-orange-500 border-primary text-white scale-110 shadow-lg shadow-primary/20'
                      : 'bg-white border-edge text-text-muted'
                  } ${isCurrent ? 'ring-4 ring-primary-glow animate-pulse' : ''}`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className={`text-[10px] font-extrabold ${isCompleted ? 'text-primary' : 'text-text-muted'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1.5 Secure Verification PIN */}
      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.verificationCode && (
        <div className="bg-orange-50/50 border border-orange-200/60 p-5 rounded-2xl shadow-sm text-center space-y-2.5">
          <div className="flex justify-center items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <ShieldAlert size={14} />
            <span>Secure Delivery PIN</span>
          </div>
          <div className="text-2xl font-extrabold text-secondary tracking-widest bg-white w-fit mx-auto px-6 py-2 rounded-xl border border-orange-100 shadow-inner">
            {order.verificationCode}
          </div>
          <p className="text-[11px] text-text-muted max-w-xs mx-auto leading-relaxed">
            Please share this 4-digit PIN with the delivery rider upon arrival. They must input this code to verify drop-off.
          </p>
        </div>
      )}

      {/* Locker Pickup Secure Collection Pass */}
      {order.isLockerPickup && order.status === 'DELIVERED' && (order as any).lockerPasscode && (
        <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50/30 border border-orange-200 p-6 rounded-3xl shadow-md text-center space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
          
          <div className="space-y-1.5 relative z-10">
            <span className="text-2xl">🔐</span>
            <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Locker Collection Pass</h3>
            <p className="text-[10px] text-text-muted leading-relaxed max-w-xs mx-auto">
              Scan the QR Code below at the block locker screen or use the passcode to retrieve your thali box.
            </p>
          </div>

          <div className="relative z-10 py-2">
            {/* Inline SVG QR Passcode */}
            <svg className="w-32 h-32 mx-auto bg-white p-2 rounded-2xl border border-orange-100 shadow-inner" viewBox="0 0 100 100">
              <rect x="5" y="5" width="25" height="25" fill="#FF6B30" />
              <rect x="10" y="10" width="15" height="15" fill="white" />
              <rect x="13" y="13" width="9" height="9" fill="#FF6B30" />
              
              <rect x="70" y="5" width="25" height="25" fill="#FF6B30" />
              <rect x="75" y="10" width="15" height="15" fill="white" />
              <rect x="78" y="13" width="9" height="9" fill="#FF6B30" />
              
              <rect x="5" y="70" width="25" height="25" fill="#FF6B30" />
              <rect x="10" y="75" width="15" height="15" fill="white" />
              <rect x="13" y="78" width="9" height="9" fill="#FF6B30" />

              <rect x="40" y="10" width="5" height="10" fill="#1E293B" />
              <rect x="50" y="5" width="10" height="5" fill="#1E293B" />
              <rect x="45" y="20" width="15" height="5" fill="#1E293B" />
              <rect x="10" y="40" width="10" height="5" fill="#1E293B" />
              <rect x="25" y="45" width="5" height="15" fill="#1E293B" />
              <rect x="40" y="40" width="20" height="20" fill="#1E293B" />
              <rect x="45" y="45" width="10" height="10" fill="white" />
              <rect x="70" y="40" width="10" height="5" fill="#1E293B" />
              <rect x="80" y="45" width="15" height="10" fill="#1E293B" />
              <rect x="75" y="60" width="5" height="15" fill="#1E293B" />
              <rect x="10" y="60" width="5" height="5" fill="#1E293B" />
              <rect x="40" y="70" width="15" height="10" fill="#1E293B" />
              <rect x="50" y="85" width="20" height="5" fill="#1E293B" />
              <rect x="80" y="80" width="10" height="10" fill="#1E293B" />
            </svg>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl max-w-xs mx-auto grid grid-cols-2 gap-3 text-center relative z-10 select-all">
            <div className="space-y-0.5 border-r border-slate-200">
              <span className="text-[8px] text-text-muted font-bold uppercase block">Locker Box</span>
              <span className="text-xs font-black text-secondary">
                {(order as any).locker?.code || 'LK-H6-02'}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] text-text-muted font-bold uppercase block">Collect PIN</span>
              <span className="text-xs font-black text-primary tracking-widest font-mono">
                {(order as any).lockerPasscode}
              </span>
            </div>
          </div>
          
          <div className="h-[1px] border-b border-dashed border-slate-200 max-w-xs mx-auto relative z-10" />
          <p className="text-[9px] text-text-muted uppercase font-bold relative z-10">
            📍 Location: {order.deliveryBlock.name} Locker Bay
          </p>
        </div>
      )}

      {/* 2. SVG Campus Block Map view */}
      {order.status === 'OUT_FOR_DELIVERY' && (
        <div className="bg-white border border-edge p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-secondary flex items-center gap-2">
            <Compass className="text-primary animate-spin" size={16} style={{ animationDuration: '6s' }} />
            🚴 Live Delivery Agent Location
          </h3>
          <div className="bg-gradient-to-br from-orange-50/20 to-white border border-orange-100 rounded-xl aspect-[16/9] flex items-center justify-center relative overflow-hidden shadow-inner">
            <svg className="w-full h-full opacity-35 absolute inset-0 pointer-events-none" viewBox="0 0 400 200">
              <path d="M50 20 L350 20 L350 180 L50 180 Z" fill="none" stroke="#FF6B30" strokeWidth="2" strokeDasharray="6,6" />
              <line x1="200" y1="20" x2="200" y2="180" stroke="#FF6B30" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="50" y1="100" x2="350" y2="100" stroke="#FF6B30" strokeWidth="1" strokeDasharray="3,3" />
            </svg>

            {/* User Target Block Icon */}
            <div className="absolute left-[70%] top-[30%] flex flex-col items-center animate-bounce">
              <div className="w-6 h-6 bg-secondary text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-md border border-white">
                📍
              </div>
              <span className="text-[9px] bg-secondary text-white px-2 py-0.5 rounded font-extrabold mt-1 shadow-sm border border-slate-700">
                {order.deliveryBlock.shortCode}
              </span>
            </div>

            {/* Food Court Kitchen source */}
            <div className="absolute left-[20%] top-[65%] flex flex-col items-center">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-[10px] shadow-md border border-white">
                🍳
              </div>
              <span className="text-[9px] bg-green-600 text-white px-2 py-0.5 rounded font-extrabold mt-1 shadow-sm border border-green-700">
                Kitchen
              </span>
            </div>

            {/* Delivery Agent Pin creeping closer */}
            <motion.div
              animate={{
                left: agentLocation ? '55%' : '35%',
                top: agentLocation ? '40%' : '55%',
              }}
              transition={{ type: 'spring', damping: 20 }}
              className="absolute bg-primary text-white p-2.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-pulse"
            >
              🚴
            </motion.div>
            
            <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur border border-edge px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-text-muted shadow-sm">
              Raman Preet is en route to {order.deliveryBlock.name}
            </span>
          </div>
        </div>
      )}

      {/* 3. Review Form Overlay Modal */}
      <AnimatePresence>
        {showReviewForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 p-6 rounded-2xl shadow-md space-y-6"
          >
            <div className="text-center space-y-1.5">
              <span className="text-3xl">😋</span>
              <h3 className="text-lg font-bold text-secondary">How was your lunch thali?</h3>
              <p className="text-xs text-text-muted">
                Review your meal to help improve tomorrow&apos;s votes. Earn <strong className="text-primary">₹5.00 wallet cashback</strong> instantly!
              </p>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Food Rating */}
                <div className="space-y-1.5 bg-white/60 p-3 rounded-xl border border-orange-200/40">
                  <label className="text-text-muted uppercase text-[9px] block">Food Quality</label>
                  <div className="flex justify-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFoodRating(star)}
                        className={`text-xl transition-transform hover:scale-125 ${star <= foodRating ? 'text-primary' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delivery Rating */}
                <div className="space-y-1.5 bg-white/60 p-3 rounded-xl border border-orange-200/40">
                  <label className="text-text-muted uppercase text-[9px] block">Delivery Speed</label>
                  <div className="flex justify-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDeliveryRating(star)}
                        className={`text-xl transition-transform hover:scale-125 ${star <= deliveryRating ? 'text-primary' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Packaging Rating */}
                <div className="space-y-1.5 bg-white/60 p-3 rounded-xl border border-orange-200/40">
                  <label className="text-text-muted uppercase text-[9px] block">Packaging</label>
                  <div className="flex justify-center space-x-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setPackagingRating(star)}
                        className={`text-xl transition-transform hover:scale-125 ${star <= packagingRating ? 'text-primary' : 'text-gray-300'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted pl-1">Comment (Optional)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus-ring-primary bg-white text-xs"
                  placeholder="Tasty paneer thali, dal makhani was rich!"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={reviewLoading}
                className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 text-white py-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center text-xs shadow-primary/10 hover:shadow-xl"
              >
                <span>{reviewLoading ? 'Submitting...' : 'Submit Feedback & Claim ₹5'}</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {reviewSubmitted && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center text-green-700 text-xs font-bold flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          <span>Feedback review submitted successfully! ₹5.00 credited.</span>
        </div>
      )}

      {/* 4. Order Details Card */}
      <div className="bg-white border border-edge p-6 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        <h3 className="text-sm font-bold text-secondary">Receipt Items Summary</h3>
        <div className="divide-y divide-edge text-xs font-semibold">
          {order.items.map((i) => (
            <div key={i.id} className="py-3 flex justify-between items-center bg-surface/10 px-2 rounded-lg my-1">
              <span>{i.menuItem.name} (x{i.quantity})</span>
              <span className="text-secondary">₹{i.totalPrice}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-edge pt-4 space-y-2.5 text-xs font-semibold text-text-muted">
          <div className="flex justify-between">
            <span className="text-text-muted">Subtotal</span>
            <span className="text-secondary">₹{order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Delivery Fee</span>
            <span className="text-secondary">₹{order.deliveryFee}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Packaging Fee</span>
            <span className="text-secondary">₹{order.packagingFee}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Taxes (5%)</span>
            <span className="text-secondary">₹{order.tax}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600 font-bold">
              <span>Promo Discount</span>
              <span>-₹{order.discount}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-extrabold pt-2.5 border-t border-edge text-secondary">
            <span>Grand Total</span>
            <span className="text-gradient-primary text-base">₹{order.totalAmount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
