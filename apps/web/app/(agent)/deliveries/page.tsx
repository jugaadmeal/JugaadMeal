'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch, getSocket } from '../../../lib/api';
import { OrderDTO } from 'shared-types';
import { MapPin, Phone, CheckSquare, Bike, DollarSign, Award, ChevronRight, CheckCircle2, Compass, Loader2, Play, Sparkles, Navigation, Plus, Lock, Clock, Calendar, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '../../../lib/context/ToastContext';

interface Waypoint {
  orderId: string;
  orderNumber: string;
  blockName: string;
  shortCode: string;
  latitude: number;
  longitude: number;
  address: string;
}

export default function DeliveryAgentPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { showPrompt } = useToast();

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY_JOBS' | 'AVAILABLE_JOBS' | 'BATCH_ROUTE' | 'SHIFTS_EARNINGS'>('MY_JOBS');
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [withdrawing, setWithdrawing] = useState(false);

  // Shifts and Lockers states
  const [shifts, setShifts] = useState<any[]>([]);
  const [earningsData, setEarningsData] = useState<any>({ ledger: [], chartData: [], totalEarnings: 0 });
  const [lockers, setLockers] = useState<any[]>([]);
  const [lockerDropOrder, setLockerDropOrder] = useState<OrderDTO | null>(null);
  const [selectedLockerId, setSelectedLockerId] = useState('');
  const [customPasscode, setCustomPasscode] = useState('');
  const [submittingDrop, setSubmittingDrop] = useState(false);

  // Background GPS simulation timer every 30s for active OUT_FOR_DELIVERY orders
  useEffect(() => {
    const interval = setInterval(() => {
      const activeRuns = orders.filter(
        (o) => o.status === 'OUT_FOR_DELIVERY' && o.agentId === user?.id
      );

      if (activeRuns.length === 0) return;

      const socket = getSocket();
      activeRuns.forEach((o) => {
        const destLat = (o.deliveryBlock as any).latitude || 30.7685;
        const destLng = (o.deliveryBlock as any).longitude || 76.5752;

        // Perform a small random step towards the destination coordinate
        const currentLat = 30.7685 + (destLat - 30.7685) * 0.5;
        const currentLng = 76.5752 + (destLng - 76.5752) * 0.5;

        console.log(`[Auto GPS] Broadcasting ping for order #${o.orderNumber}:`, { currentLat, currentLng });
        socket.emit('agent:location_update', {
          orderId: o.id,
          lat: currentLat,
          lng: currentLng,
          eta: '7 mins',
        });
      });
    }, 30000); // 30 seconds pings

    return () => clearInterval(interval);
  }, [orders, user]);

  const loadDeliveries = async () => {
    try {
      const data = await apiFetch('/api/orders');
      setOrders(data);

      const wallet = await apiFetch('/api/wallet').catch(() => null);
      if (wallet) {
        setWalletBalance(wallet.balance);
      }

      // Fetch shifts, earnings, and lockers lists
      const shiftsList = await apiFetch('/api/shifts').catch(() => []);
      setShifts(shiftsList);

      const earnings = await apiFetch('/api/shifts/earnings').catch(() => null);
      if (earnings) {
        setEarningsData(earnings);
      }

      const lockersList = await apiFetch('/api/lockers').catch(() => []);
      setLockers(lockersList);
    } catch (err) {
      console.error('Failed to load deliveries list:', err);
    }
  };

  const handleClaimShift = async (shiftId: string) => {
    try {
      await apiFetch(`/api/shifts/${shiftId}/claim`, { method: 'POST' });
      await loadDeliveries();
      alert('Shift successfully claimed! Have a safe run!');
      confetti({ particleCount: 40, spread: 30 });
    } catch (err: any) {
      alert(err.message || 'Failed to claim shift.');
    }
  };

  const handleConfirmLockerDrop = async () => {
    if (!lockerDropOrder || !selectedLockerId) return;
    setSubmittingDrop(true);
    try {
      await apiFetch(`/api/orders/${lockerDropOrder.id}/locker-drop`, {
        method: 'POST',
        body: JSON.stringify({
          lockerId: selectedLockerId,
          passcode: customPasscode.trim() || undefined,
        }),
      });
      await loadDeliveries();
      setLockerDropOrder(null);
      setSelectedLockerId('');
      setCustomPasscode('');
      alert('Locker deposit complete. Student has been notified!');
      confetti({ particleCount: 50, spread: 35 });
    } catch (err: any) {
      alert(err.message || 'Failed to complete locker drop-off.');
    } finally {
      setSubmittingDrop(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'DELIVERY_AGENT' && user?.role !== 'ADMIN') {
      router.push('/home');
      return;
    }

    setIsLoading(true);
    loadDeliveries().finally(() => setIsLoading(false));
  }, [isAuthenticated, user, router]);

  // Claims an unclaimed READY order
  const handleClaimOrder = async (orderId: string) => {
    try {
      await apiFetch(`/api/orders/${orderId}/claim`, { method: 'POST' });
      await loadDeliveries();
      confetti({ particleCount: 40, spread: 30 });
    } catch (err: any) {
      alert(err.message || 'Failed to claim order. Please try again.');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderDTO['status']) => {
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await loadDeliveries();
    } catch (e) {
      alert('Failed to update rider status.');
    }
  };

  const handleWithdrawFunds = async () => {
    if (walletBalance <= 0) {
      alert('You have no earnings available to withdraw.');
      return;
    }

    const upiId = await showPrompt('Enter your UPI ID (e.g. rider@paytm) for instant payout transfer:');
    if (upiId === null) return;
    if (!upiId.trim()) {
      alert('UPI ID is required to process payout transfer.');
      return;
    }

    const withdrawAmt = await showPrompt(`Enter amount to withdraw (Max: ₹${walletBalance.toFixed(2)}):`, walletBalance.toString());
    if (withdrawAmt === null) return;
    
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt <= 0 || amt > walletBalance) {
      alert('Please enter a valid amount within your balance limit.');
      return;
    }

    setWithdrawing(true);
    try {
      await apiFetch('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          upiId: upiId.trim(),
        }),
      });

      alert(`₹${amt.toFixed(2)} payout successfully transferred to ${upiId}!`);
      const wallet = await apiFetch('/api/wallet').catch(() => null);
      if (wallet) {
        setWalletBalance(wallet.balance);
      }
    } catch (err: any) {
      alert(err.message || 'Withdrawal processing failed.');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    const pin = await showPrompt('Ask the student for their 4-digit secure Delivery PIN and enter it below:');
    if (pin === null) return;
    if (!pin.trim()) {
      alert('Delivery PIN is required to complete verification.');
      return;
    }

    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DELIVERED', code: pin.trim() }),
      });

      await loadDeliveries();
      alert('Order successfully verified and delivered!');
      confetti({ particleCount: 60, spread: 45 });
    } catch (err: any) {
      alert(err.message || 'Incorrect PIN code. Delivery verification failed.');
    }
  };

  // Fast-Forward GPS route simulation path
  const handleSimulateGPS = (order: OrderDTO) => {
    setSimulatingId(order.id);
    const socket = getSocket();
    
    const destLat = (order.deliveryBlock as any).latitude || 30.7685;
    const destLng = (order.deliveryBlock as any).longitude || 76.5752;

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      const baseLat = 30.7685;
      const baseLng = 76.5752;

      // Linear interpolation to make it look realistic
      const currentLat = baseLat + (destLat - baseLat) * (step / 4);
      const currentLng = baseLng + (destLng - baseLng) * (step / 4);

      socket.emit('agent:location_update', {
        orderId: order.id,
        lat: currentLat,
        lng: currentLng,
        eta: `${5 - step} mins`,
      });

      if (step >= 4) {
        clearInterval(interval);
        setSimulatingId(null);
        alert('Destination block reached!');
      }
    }, 2000);
  };

  // Construct clickable Google Maps link
  const getGoogleMapsLink = (order: OrderDTO) => {
    const block = order.deliveryBlock as any;
    if (block.latitude && block.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${block.latitude},${block.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(block.name + ' Chandigarh University')}`;
  };

  // Optimized Nearest-Neighbor Routing Algorithm Heuristic
  const getOptimizedBatchRoute = () => {
    const eligibleOrders = orders.filter(
      (o) => (o.status === 'READY' || o.status === 'OUT_FOR_DELIVERY') && o.agentId === user?.id
    );

    if (eligibleOrders.length === 0) return [];

    const startPoint = { latitude: 30.7685, longitude: 76.5752, name: 'Kitchen' };
    const route: Waypoint[] = [];
    const unvisited = eligibleOrders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      blockName: o.deliveryBlock.name,
      shortCode: o.deliveryBlock.shortCode,
      latitude: (o.deliveryBlock as any).latitude || 30.7685,
      longitude: (o.deliveryBlock as any).longitude || 76.5752,
      address: o.deliveryAddress || '',
    }));

    let current = startPoint;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDist = Infinity;

      unvisited.forEach((waypoint, idx) => {
        // Euclidean distance over latitude/longitude coordinates (mapX, mapY coordinates equivalents)
        const dist = Math.sqrt(
          Math.pow(waypoint.latitude - current.latitude, 2) +
            Math.pow(waypoint.longitude - current.longitude, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = idx;
        }
      });

      const nextWaypoint = unvisited[nearestIdx];
      route.push(nextWaypoint);
      current = {
        latitude: nextWaypoint.latitude,
        longitude: nextWaypoint.longitude,
        name: nextWaypoint.blockName,
      };
      unvisited.splice(nearestIdx, 1);
    }

    return route;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4 max-w-4xl mx-auto">
        <div className="h-10 bg-slate-100 rounded-xl w-1/4 skeleton-shimmer" />
        <div className="h-44 bg-slate-100 rounded-3xl skeleton-shimmer" />
      </div>
    );
  }

  // Filter lists
  const myClaimedJobs = orders.filter(
    (o) => o.agentId === user?.id && o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  );
  const availableJobs = orders.filter(
    (o) => o.status === 'READY' && !o.agentId
  );
  const completedJobs = orders.filter(
    (o) => o.agentId === user?.id && o.status === 'DELIVERED'
  );

  const optimizedRoute = getOptimizedBatchRoute();

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-secondary tracking-tight">Delivery Tasks Feed</h1>
          <p className="text-xs text-text-muted">Claim campus courier runs, view optimized routes, and trigger status updates.</p>
        </div>

        {/* Payout summaries & withdrawal grids */}
        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
          <div className="bg-white border border-edge px-4 py-3 rounded-2xl shadow-sm flex items-center gap-3">
            <DollarSign className="text-green-600 shrink-0 animate-pulse" size={18} />
            <div className="space-y-0.5">
              <p className="text-[9px] text-text-muted font-bold leading-none uppercase">Payout Balance</p>
              <p className="text-sm font-black text-secondary">₹{walletBalance.toFixed(2)}</p>
            </div>
            <button
              disabled={withdrawing || walletBalance <= 0}
              onClick={handleWithdrawFunds}
              className="ml-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border bg-green-50 text-green-700 hover:bg-green-100 border-green-200 shadow-sm cursor-pointer disabled:bg-slate-50 disabled:text-gray-400 disabled:border-slate-200"
            >
              {withdrawing ? '...' : 'Withdraw'}
            </button>
          </div>

          <div className="bg-white border border-edge px-4 py-3 rounded-2xl shadow-sm flex items-center gap-2">
            <Award className="text-primary" size={18} />
            <div className="space-y-0.5">
              <p className="text-[9px] text-text-muted font-bold leading-none uppercase">Runs Done</p>
              <p className="text-sm font-black text-secondary">{completedJobs.length} Runs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-edge pb-1 gap-6 text-xs font-black uppercase">
        <button
          onClick={() => setActiveTab('MY_JOBS')}
          className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'MY_JOBS' ? 'text-primary' : 'text-text-muted hover:text-secondary'}`}
        >
          <span>My Claimed Jobs ({myClaimedJobs.length})</span>
          {activeTab === 'MY_JOBS' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('AVAILABLE_JOBS')}
          className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'AVAILABLE_JOBS' ? 'text-primary' : 'text-text-muted hover:text-secondary'}`}
        >
          <span>Available Jobs ({availableJobs.length})</span>
          {activeTab === 'AVAILABLE_JOBS' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('BATCH_ROUTE')}
          className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'BATCH_ROUTE' ? 'text-primary' : 'text-text-muted hover:text-secondary'}`}
        >
          <span className="flex items-center gap-1.5">
            <span>Batch Route Optimizer 🗺️</span>
            {optimizedRoute.length > 0 && (
              <span className="bg-primary text-white text-[8px] px-1.5 py-0.5 rounded-full">
                {optimizedRoute.length} stops
              </span>
            )}
          </span>
          {activeTab === 'BATCH_ROUTE' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('SHIFTS_EARNINGS')}
          className={`pb-3 relative transition-colors cursor-pointer ${activeTab === 'SHIFTS_EARNINGS' ? 'text-primary' : 'text-text-muted hover:text-secondary'}`}
        >
          <span>Shifts & Earnings 📊</span>
          {activeTab === 'SHIFTS_EARNINGS' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Active Tab contents */}
      <AnimatePresence mode="wait">
        {activeTab === 'MY_JOBS' && (
          /* TAB 1: My active jobs list */
          <motion.div
            key="my-jobs"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {myClaimedJobs.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {myClaimedJobs.map((order) => {
                  const isEnRoute = order.status === 'OUT_FOR_DELIVERY';
                  return (
                    <div
                      key={order.id}
                      className={`border p-5 rounded-[28px] shadow-sm flex flex-col justify-between space-y-4 transition-all relative overflow-hidden bg-white ${
                        isEnRoute ? 'border-primary shadow-md' : 'border-edge'
                      }`}
                    >
                      {isEnRoute && (
                        <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider animate-pulse">
                          En Route 🚴
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between items-start pr-12">
                          <div>
                            <h4 className="font-black text-secondary text-sm">Order #{order.orderNumber}</h4>
                            <p className="text-[10px] text-text-muted font-bold mt-0.5 uppercase">
                              ⏰ Slot: {order.scheduledFor || 'ASAP'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-text-muted font-semibold">
                          <p className="flex items-center gap-1">
                            <MapPin size={13} className="text-primary shrink-0" />
                            <span>Address: {order.deliveryAddress} ({order.deliveryBlock.name})</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Phone size={13} className="text-primary shrink-0" />
                            <span>
                              Contact: <a href={`tel:${order.user?.phone}`} className="underline font-bold text-secondary">{order.user?.phone || '9876543210'}</a> ({order.user?.name})
                            </span>
                          </p>
                          <p className="text-[10px] text-secondary font-bold uppercase mt-1 pl-0.5">
                            Items: {order.items.map((i) => `${i.menuItem.name} x${i.quantity}`).join(', ')}
                          </p>
                        </div>
                      </div>

                      {/* Deep Link Directions & Action triggers */}
                      <div className="space-y-2.5 pt-2">
                        <a
                          href={getGoogleMapsLink(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full border border-edge hover:border-primary text-text-muted hover:text-primary py-2.5 rounded-xl transition-all font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-white shadow-sm"
                        >
                          <Navigation size={13} />
                          <span>Google Maps Directions</span>
                        </a>

                        {!isEnRoute ? (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                            className="w-full bg-secondary hover:bg-secondary-light text-white text-xs font-black py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Bike size={14} />
                            <span>Start Out-for-Delivery Run</span>
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              disabled={simulatingId === order.id}
                              onClick={() => handleSimulateGPS(order)}
                              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-black py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                            >
                              {simulatingId === order.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Compass size={13} />
                              )}
                              <span>{simulatingId === order.id ? 'Simulating...' : 'Simulate GPS'}</span>
                            </button>

                            {order.isLockerPickup ? (
                              <button
                                onClick={() => {
                                  setLockerDropOrder(order);
                                  setSelectedLockerId('');
                                  setCustomPasscode('');
                                }}
                                className="bg-primary hover:bg-primary-hover text-white text-xs font-black py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shadow-primary/10 animate-pulse"
                              >
                                <Lock size={14} />
                                <span>Locker Deposit 🔐</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkAsDelivered(order.id)}
                                className="bg-primary hover:bg-primary-hover text-white text-xs font-black py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shadow-primary/10"
                              >
                                <CheckSquare size={14} />
                                <span>Verify PIN Drop</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3 flex flex-col items-center bg-white border border-edge p-6 rounded-[28px] shadow-sm">
                <span className="text-2xl animate-bounce">📦</span>
                <p className="text-xs text-text-muted font-black uppercase">No active claimed runs.</p>
                <button
                  onClick={() => setActiveTab('AVAILABLE_JOBS')}
                  className="bg-primary text-white font-black text-xs px-4 py-2.5 rounded-xl hover:bg-primary-hover transition-colors cursor-pointer"
                >
                  Browse Available Jobs Feed
                </button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'AVAILABLE_JOBS' && (
          /* TAB 2: Available jobs list */
          <motion.div
            key="available-jobs"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {availableJobs.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {availableJobs.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-edge p-5 rounded-[28px] shadow-sm flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <h4 className="font-black text-secondary text-sm">Order #{order.orderNumber}</h4>
                        <span className="text-[9px] bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-lg font-black uppercase shadow-sm">
                          Ready for Rider
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-text-muted font-semibold">
                        <p className="flex items-center gap-1">
                          <MapPin size={13} className="text-primary shrink-0" />
                          <span>Deliver to: {order.deliveryBlock.name} ({order.deliveryBlock.shortCode})</span>
                        </p>
                        <p className="text-[10px] text-secondary font-bold uppercase mt-1 pl-0.5">
                          Items: {order.items.map((i) => `${i.menuItem.name} (x${i.quantity})`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaimOrder(order.id)}
                      className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-black py-2.5 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                    >
                      <Plus size={13} />
                      <span>Claim Delivery Run (+₹15)</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 space-y-2 flex flex-col items-center bg-white border border-edge p-6 rounded-[28px] shadow-sm">
                <span className="text-2xl animate-pulse">⏰</span>
                <p className="text-xs text-text-muted font-black uppercase">No ready packages at the food court counter.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'BATCH_ROUTE' && (
          /* TAB 3: Batch route list optimized using Nearest-Neighbor heuristic */
          <motion.div
            key="batch-route"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid md:grid-cols-3 gap-6 items-start"
          >
            {/* Sequence waypoints timeline card */}
            <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4 md:col-span-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <span>🗺️</span>
                  <span>Optimal Delivery Run Path</span>
                </h3>
                <span className="text-[8px] bg-orange-50 text-primary px-2.5 py-0.5 rounded-full font-bold">
                  NEAREST-NEIGHBOR TSP SOLVER
                </span>
              </div>

              {optimizedRoute.length > 0 ? (
                <div className="relative pl-6 space-y-6 pt-2 select-none">
                  {/* Waypoint timeline bar */}
                  <div className="absolute left-[9px] top-4 bottom-4 w-[2.5px] bg-gradient-to-b from-green-500 via-primary to-orange-500 rounded-full" />

                  {/* Start Point Waypoint (Food Court) */}
                  <div className="relative flex gap-3.5 items-start">
                    <span className="absolute -left-[23px] top-0.5 w-[13px] h-[13px] rounded-full bg-green-500 border-2 border-white shadow-md flex items-center justify-center text-[7px]" />
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-secondary uppercase leading-none">1. Kitchen Depot (Food Court)</h4>
                      <p className="text-[9px] text-text-muted">Coordinate: (30.7685, 76.5752) • Load up thali package boxes</p>
                    </div>
                  </div>

                  {/* Dynamically optimized Nearest-Neighbor waypoints */}
                  {optimizedRoute.map((wp, idx) => (
                    <div key={wp.orderId} className="relative flex gap-3.5 items-start">
                      <span className="absolute -left-[23px] top-0.5 w-[13px] h-[13px] rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center text-[7px]" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-secondary uppercase leading-none">
                            {idx + 2}. Drop off at {wp.shortCode}
                          </h4>
                          <span className="text-[8px] bg-secondary text-white font-black px-1.5 py-0.5 rounded">
                            Order #{wp.orderNumber}
                          </span>
                        </div>
                        <p className="text-[9px] text-text-muted leading-tight">
                          Destination: Room {wp.address} ({wp.blockName})<br />
                          Coordinates: ({wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 space-y-2 flex flex-col items-center">
                  <span className="text-xl">😴</span>
                  <p className="text-xs text-text-muted font-black uppercase">No active claimed orders to route.</p>
                </div>
              )}
            </div>

            {/* Informational batch metrics */}
            <div className="bg-white border border-edge p-5 rounded-[28px] shadow-sm space-y-4">
              <h3 className="text-xs font-black text-secondary uppercase tracking-wider border-b border-slate-100 pb-3 pl-0.5">
                Batch Run Metrics
              </h3>

              <div className="space-y-4 text-xs font-semibold text-text-muted">
                <div className="flex justify-between items-center">
                  <span>Routing Strategy</span>
                  <span className="text-secondary font-black bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-[10px]">
                    Greedy TSP
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Total Scheduled Stops</span>
                  <span className="text-secondary font-black">{optimizedRoute.length} Delivery Stops</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Earned Incentives</span>
                  <span className="text-green-600 font-black">+₹{optimizedRoute.length * 15} Payout</span>
                </div>

                <div className="border-t border-dashed border-slate-200/80 my-3 pt-3 space-y-2 text-[10px] text-text-muted leading-relaxed">
                  <p>
                    💡 <strong>Heuristic Rule:</strong> The solver computes Euclidean distances across campus map coordinates to minimize routing delays and avoid double back steps.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'SHIFTS_EARNINGS' && (
          <motion.div
            key="shifts-earnings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* 1. Shift Claiming Board Section */}
            <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5 pl-0.5">
                  <Calendar size={14} className="text-primary animate-pulse" />
                  <span>Agent Duty Shifts Board</span>
                </h3>
                <span className="text-[8px] bg-slate-100 text-text-muted px-2 py-0.5 rounded-full font-bold uppercase">
                  Schedule Claims
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {shifts.map((sh) => {
                  const isClaimed = sh.assignments.some((a: any) => a.agentId === user?.id);
                  const isFull = sh.assignments.length >= sh.maxAgents;
                  const startTimeStr = new Date(sh.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const endTimeStr = new Date(sh.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={sh.id} className={`border p-4.5 rounded-2xl flex flex-col justify-between space-y-4 bg-slate-50/50 ${isClaimed ? 'border-green-300 bg-green-50/10' : 'border-slate-200/60'}`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-primary" />
                          <h4 className="font-extrabold text-secondary text-xs">{sh.name}</h4>
                        </div>
                        <p className="text-[10px] text-text-muted leading-none font-bold">
                          ⏱️ Time: {startTimeStr} - {endTimeStr}
                        </p>
                        <p className="text-[10px] font-bold text-text-muted">
                          👥 Cap: {sh.assignments.length} / {sh.maxAgents} Riders Joined
                        </p>
                        <p className="text-[9px] bg-white border border-slate-100 px-2 py-1 rounded-lg w-fit text-text-muted font-bold">
                          ⚡ Concurrent Order Cap: <span className="text-secondary font-black">{sh.maxConcurrentOrders} orders</span>
                        </p>
                      </div>

                      {isClaimed ? (
                        <div className="text-center bg-green-100 text-green-700 font-black text-[10px] py-2 rounded-xl border border-green-200">
                          Joined Shift ✅
                        </div>
                      ) : isFull ? (
                        <button
                          disabled
                          className="w-full text-center bg-slate-200 text-slate-400 font-black text-[10px] py-2 rounded-xl border border-slate-350"
                        >
                          Shift Full 🚫
                        </button>
                      ) : (
                        <button
                          onClick={() => handleClaimShift(sh.id)}
                          className="w-full bg-primary hover:bg-primary-hover text-white font-black text-[10px] py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          Claim Slot 🚴
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Earnings Graphical Dashboard */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Earnings Bar Chart (Recharts) */}
              <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4 md:col-span-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 pl-0.5">
                  <h3 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <span>📈</span>
                    <span>Weekly Payout Progression</span>
                  </h3>
                  <span className="text-[9px] text-text-muted font-bold">₹15 Delivery Incentive</span>
                </div>
                
                <div className="h-48 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={earningsData.chartData}>
                      <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '9px' }} />
                      <Bar dataKey="amount" fill="#FF6B30" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Earnings Payout statistics metrics */}
              <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-secondary uppercase tracking-wider border-b border-slate-100 pb-3 pl-0.5">
                    Earnings Summary
                  </h3>
                  
                  <div className="space-y-3.5 text-xs font-semibold text-text-muted">
                    <div className="flex justify-between items-center">
                      <span>Total Earnings</span>
                      <span className="text-secondary font-black text-sm">₹{(earningsData.totalEarnings || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Completed Deliveries</span>
                      <span className="text-secondary font-black">{earningsData.ledger?.length || 0} Runs</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Payout Rate</span>
                      <span className="text-green-600 font-bold">₹15.00 / drop</span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={withdrawing || walletBalance <= 0}
                  onClick={handleWithdrawFunds}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <DollarSign size={14} />
                  <span>Withdraw Earnings</span>
                </button>
              </div>
            </div>

            {/* 3. Delivery Payout Ledger list */}
            <div className="bg-white border border-edge p-6 rounded-[28px] shadow-sm space-y-4">
              <h3 className="text-xs font-black text-secondary uppercase tracking-wider border-b border-slate-100 pb-3 pl-0.5">
                Delivery Payout Ledger
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-text-muted">
                  <thead>
                    <tr className="border-b border-slate-100 uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 pl-1">Order Ref</th>
                      <th className="py-2.5">Delivered Time</th>
                      <th className="py-2.5 text-right pr-1">Incentive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {earningsData.ledger && earningsData.ledger.length > 0 ? (
                      earningsData.ledger.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-extrabold text-secondary pl-1">#{item.orderNumber}</td>
                          <td className="py-3 text-[10px] font-medium">
                            {new Date(item.deliveredAt).toLocaleString()}
                          </td>
                          <td className="py-3 text-right pr-1 font-black text-green-600">+₹{item.amount.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-text-muted font-bold uppercase text-[10px]">
                          No completed runs in ledger database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Locker drop-off dialog overlay */}
      {lockerDropOrder && (
        <div className="fixed inset-0 bg-secondary/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-edge p-6 rounded-[28px] max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden"
          >
            <div className="space-y-1.5 border-b border-slate-100 pb-3 relative">
              <span className="text-2xl">🔐</span>
              <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Campus Locker Deposit</h3>
              <p className="text-[10px] text-text-muted leading-relaxed">
                Rider Deposit flow for order <strong>#{lockerDropOrder.orderNumber}</strong>. Choose the locker cell code where you are depositing the thali box.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase pl-0.5">Choose Locker Cell</label>
                {(() => {
                  const blockLockers = lockers.filter(
                    (lk) => lk.blockId === lockerDropOrder.deliveryBlockId && !lk.isOccupied
                  );
                  if (blockLockers.length === 0) {
                    return (
                      <div className="bg-red-50 text-red-600 border border-red-100/60 p-3.5 rounded-xl text-[9px] font-bold">
                        ⚠️ No unoccupied cells found in {lockerDropOrder.deliveryBlock.name} Locker Bay.
                      </div>
                    );
                  }
                  return (
                    <select
                      value={selectedLockerId}
                      onChange={(e) => setSelectedLockerId(e.target.value)}
                      className="w-full border border-edge px-3.5 py-3 rounded-xl bg-white text-xs outline-none focus-ring-primary font-bold text-secondary shadow-sm"
                    >
                      <option value="" disabled>-- Choose Cell Slot --</option>
                      {blockLockers.map((lk) => (
                        <option key={lk.id} value={lk.id}>
                          ⚡ {lk.code} (Empty)
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase pl-0.5">Collect Passcode PIN (Optional)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={customPasscode}
                  onChange={(e) => setCustomPasscode(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-edge px-3.5 py-3 rounded-xl text-xs outline-none focus-ring-primary font-bold text-secondary bg-white shadow-sm font-mono tracking-widest"
                  placeholder="e.g. 4921 (Leave blank to auto-generate)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2.5">
              <button
                onClick={() => setLockerDropOrder(null)}
                className="border border-edge hover:border-text-muted text-text-muted hover:text-secondary text-xs font-black py-3 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={submittingDrop || !selectedLockerId}
                onClick={handleConfirmLockerDrop}
                className="bg-primary hover:bg-primary-hover disabled:bg-slate-200 text-white text-xs font-black py-3 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submittingDrop ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckSquare size={13} />
                )}
                <span>Deposit & Lock</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
