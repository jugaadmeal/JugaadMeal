'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch, getSocket } from '../../../lib/api';
import { OrderDTO } from 'shared-types';
import { Clock, Play, Check, AlertTriangle, ChefHat, Volume2, Sparkles, Trash, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomToast {
  id: string;
  title: string;
  message: string;
  orderNumber: string;
}

export default function KitchenDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState<CustomToast[]>([]);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Capacity threshold variables
  const CAPACITY_LIMIT = 10;

  // Refresh elapsed prep timers dynamically every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'KITCHEN_STAFF' && user?.role !== 'ADMIN') {
      router.push('/home');
      return;
    }

    const loadKitchenOrders = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch('/api/orders');
        setOrders(data);
      } catch (err) {
        console.error('Kitchen orders loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadKitchenOrders();
  }, [isAuthenticated, user, router]);

  // Setup Socket.io listeners for incoming orders
  useEffect(() => {
    const socket = getSocket();

    // Subscribe to kitchen updates
    socket.emit('kitchen:subscribe');

    // Live incoming orders
    socket.on('kitchen:new_order', (data: { order: OrderDTO }) => {
      setOrders((prev) => {
        // Prevent duplicates
        if (prev.some((o) => o.id === data.order.id)) return prev;
        return [data.order, ...prev];
      });

      // Play web audio sound
      if (!isSoundMuted) {
        playNotificationBeep();
      }

      // Add to custom toast notifications
      const newToast: CustomToast = {
        id: Math.random().toString(),
        title: '🔔 New Order Incoming!',
        message: `Order #${data.order.orderNumber} placed for ${data.order.deliveryBlock?.name || 'Hostel Block'}.`,
        orderNumber: data.order.orderNumber,
      };
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    });

    // Clean listeners
    return () => {
      socket.off('kitchen:new_order');
    };
  }, [isSoundMuted]);

  // Synthesize a clean double-pitch audio chime natively
  const playNotificationBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // First high tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(660, ctx.currentTime); // E5 note
      gain1.gain.setValueAtTime(0.12, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Second even higher tone following it
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.25);
      }, 150);
    } catch (err) {
      console.warn('Audio synthesis failed:', err);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderDTO['status']) => {
    try {
      const updated = await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      // Update local state list
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err: any) {
      alert(err.message || 'Status transition failed.');
    }
  };

  // HTML5 Native Drag & Drop actions
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropColumn = async (e: React.DragEvent, targetStatus: OrderDTO['status']) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;

    // Verify if that order exists
    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder) return;
    
    // Only allow logical progression
    if (currentOrder.status === targetStatus) return;
    await handleUpdateStatus(orderId, targetStatus);
  };

  const getTimerColor = (createdAt: string) => {
    const diffMins = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60));
    if (diffMins < 10) return 'text-green-600 bg-green-50 border-green-200';
    if (diffMins < 20) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-red-500 bg-red-50 border-red-200 animate-pulse';
  };

  const getMinutesAgo = (createdAt: string) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60));
  };

  // Parse instructions into individual chips
  const renderInstructionChips = (instructions: string | null) => {
    if (!instructions || !instructions.trim()) return null;
    
    // Split on commas or semi-colons
    const chips = instructions
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    return (
      <div className="flex flex-wrap gap-1 mt-1 pb-1">
        {chips.map((chip, idx) => (
          <span
            key={idx}
            className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm"
          >
            📋 {chip}
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-6 max-w-6xl mx-auto">
        <div className="h-10 bg-surface-dark rounded-md w-1/4 skeleton-shimmer" />
        <div className="grid md:grid-cols-[repeat(3,_minmax(0,_1fr))] gap-6">
          <div className="h-96 bg-surface-dark rounded-lg skeleton-shimmer" />
          <div className="h-96 bg-surface-dark rounded-lg skeleton-shimmer" />
          <div className="h-96 bg-surface-dark rounded-lg skeleton-shimmer" />
        </div>
      </div>
    );
  }

  // Filter orders by column status keys
  const incoming = orders.filter((o) => o.status === 'CONFIRMED');
  const preparing = orders.filter((o) => o.status === 'PREPARING');
  const ready = orders.filter((o) => o.status === 'READY');

  // Compute active prep capacity load
  const activePrepLoad = incoming.length + preparing.length;
  const loadPercentage = Math.min(100, (activePrepLoad / CAPACITY_LIMIT) * 100);
  const isThrottled = activePrepLoad >= 8;

  const renderOrderCard = (order: OrderDTO) => {
    const timeSpent = getMinutesAgo(order.createdAt);
    const colorClass = getTimerColor(order.createdAt);

    return (
      <div
        key={order.id}
        draggable
        onDragStart={(e) => handleDragStart(e, order.id)}
        className="bg-surface-card border border-edge p-4 rounded-lg shadow-sm space-y-3.5 hover:border-primary/30 group relative select-none"
      >
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity text-[8px] font-semibold text-text-muted">
          Drag to Move ⇄
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-black text-secondary text-sm">#{order.orderNumber}</h4>
            <p className="text-[10px] text-text-muted mt-0.5 font-semibold">
              📍 {order.deliveryBlock.name} ({order.deliveryBlock.shortCode}) • Room {(order.deliveryAddress || '').split(',')[0]}
            </p>
          </div>
          <span className={`inline-flex place-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-sm ${colorClass}`}>
            <Clock size={11} />
            <span>{timeSpent}m ago</span>
          </span>
        </div>

        {/* Prominent kitchen instructions */}
        {renderInstructionChips(order.specialInstructions || null)}

        {/* Item checklist */}
        <div className="space-y-1.5 border-t border-b border-edge/60 py-3 text-xs font-semibold text-secondary bg-surface-dark px-2 rounded-lg">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between place-center">
              <span>🍛 {i.menuItem.name}</span>
              <span className="text-primary font-black bg-surface-card px-2 py-0.5 rounded border border-edge shadow-sm text-[10px]">
                x{i.quantity}
              </span>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div>
          {order.status === 'CONFIRMED' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-lg flex place-center place-mid gap-1.5 transition-all border border-primary-hover shadow-sm cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <Play size={12} fill="white" />
              <span>Start Cook Run</span>
            </button>
          )}

          {order.status === 'PREPARING' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'READY')}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2.5 rounded-lg flex place-center place-mid gap-1.5 transition-all border border-green-700 shadow-sm cursor-pointer focus:ring-2 focus:ring-green-500/20 outline-none"
            >
              <Check size={14} />
              <span>Mark Box Ready</span>
            </button>
          )}

          {order.status === 'READY' && (
            <span className="block align-mid text-xs font-semibold text-text-muted bg-surface-dark py-2.5 rounded-lg border border-edge uppercase tracking-widest text-[9px]">
              Waiting for Rider Pickup 🚴
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto p-4 relative">
      {/* Dynamic Floating Toast Alerts container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-secondary text-white p-4 rounded-lg shadow-md border border-secondary-light flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="text-xs font-black text-primary">{t.title}</p>
                <p className="text-[10px] text-zinc-300 font-semibold leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-zinc-400 hover:text-white text-xs font-semibold leading-none p-1"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header and Capacity alerts */}
      <div className="flex flex-col md:flex-row justify-between items-start md:place-center gap-4 border-b border-edge/60 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-secondary tracking-tight">Kitchen live board</h1>
          <p className="text-xs text-text-muted">Drag or tap cards to advance thali boxes to courier dispatch channels.</p>
        </div>
        
        {/* sound controller & capacity limits */}
        <div className="flex place-center gap-4 flex-wrap w-full md:w-auto">
          <button
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className={`p-2.5 rounded-md border flex place-center place-mid cursor-pointer shadow-sm transition-all ${
              isSoundMuted 
                ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100' 
                : 'bg-orange-50 text-primary border-orange-200 hover:bg-orange-100/60'
            }`}
            title={isSoundMuted ? 'Unmute alerts' : 'Mute alerts'}
          >
            <Volume2 size={16} className={isSoundMuted ? 'opacity-50' : 'animate-pulse'} />
          </button>

          <div className="bg-surface-card border border-edge p-3 rounded-lg shadow-sm space-y-1.5 shrink-0 flex-1 md:flex-initial min-w-[200px]">
            <div className="flex justify-between place-center text-[10px] font-black text-secondary uppercase">
              <span>Active Prep Load</span>
              <span className={isThrottled ? 'text-red-500' : 'text-primary'}>
                {activePrepLoad} / {CAPACITY_LIMIT}
              </span>
            </div>
            
            <div className="w-full bg-surface-dark h-2 rounded-full overflow-hidden shadow-inner relative">
              <div 
                className={`h-full transition-all duration-500 ${isThrottled ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${loadPercentage}%` }}
              />
            </div>

            {isThrottled && (
              <span className="text-[8px] text-red-500 font-semibold uppercase animate-pulse block align-mid leading-none mt-1">
                ⚠️ Kitchen Throttled (Capacity Limit Reached)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3 Column Kanban Board */}
      <div className="grid md:grid-cols-[repeat(3,_minmax(0,_1fr))] gap-6 items-start pt-2">
        {/* Column 1: Incoming */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropColumn(e, 'CONFIRMED')}
          className="space-y-4 bg-surface-dark border border-edge p-4 rounded-lg shadow-sm"
        >
          <div className="bg-blue-50 border border-blue-200/50 px-4 py-3 rounded-md flex justify-between place-center text-xs font-semibold">
            <span className="text-blue-800 uppercase tracking-widest text-[10px]">Incoming Orders</span>
            <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex place-center place-mid font-semibold text-[10px] shadow-sm">
              {incoming.length}
            </span>
          </div>
          <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
            {incoming.map(renderOrderCard)}
            {incoming.length === 0 && (
              <div className="align-mid py-10 space-y-2 bg-surface-card rounded-lg border border-dashed border-edge/80 flex flex-col place-center">
                <span className="text-lg">😴</span>
                <p className="text-[10px] text-text-muted uppercase font-semibold">No incoming orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Preparing */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropColumn(e, 'PREPARING')}
          className="space-y-4 bg-surface-dark border border-edge p-4 rounded-lg shadow-sm"
        >
          <div className="bg-orange-50 border border-orange-200/50 px-4 py-3 rounded-md flex justify-between place-center text-xs font-semibold">
            <span className="text-orange-800 uppercase tracking-widest text-[10px]">Preparing</span>
            <span className="bg-orange-500 text-white w-5 h-5 rounded-full flex place-center place-mid font-semibold text-[10px] shadow-sm">
              {preparing.length}
            </span>
          </div>
          <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
            {preparing.map(renderOrderCard)}
            {preparing.length === 0 && (
              <div className="align-mid py-10 space-y-2 bg-surface-card rounded-lg border border-dashed border-edge/80 flex flex-col place-center">
                <span className="text-lg">🍳</span>
                <p className="text-[10px] text-text-muted uppercase font-semibold">No items cooking</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Ready */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropColumn(e, 'READY')}
          className="space-y-4 bg-surface-dark border border-edge p-4 rounded-lg shadow-sm"
        >
          <div className="bg-green-50 border border-green-200/50 px-4 py-3 rounded-md flex justify-between place-center text-xs font-semibold">
            <span className="text-green-800 uppercase tracking-widest text-[10px]">Ready for dispatch</span>
            <span className="bg-green-600 text-white w-5 h-5 rounded-full flex place-center place-mid font-semibold text-[10px] shadow-sm">
              {ready.length}
            </span>
          </div>
          <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
            {ready.map(renderOrderCard)}
            {ready.length === 0 && (
              <div className="align-mid py-10 space-y-2 bg-surface-card rounded-lg border border-dashed border-edge/80 flex flex-col place-center">
                <span className="text-lg">📦</span>
                <p className="text-[10px] text-text-muted uppercase font-semibold">No ready boxes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
