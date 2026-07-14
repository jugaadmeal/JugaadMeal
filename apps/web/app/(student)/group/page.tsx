'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch } from '../../../lib/api';
import { Users, Plus, Minus, ArrowRight, Share2, Copy, Check, LogOut, ShieldAlert, Sparkles, Loader2, ShoppingBag, MapPin, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useToast } from '../../../lib/context/ToastContext';

interface GroupMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    wallet?: {
      balance: number;
    };
  };
  items: {
    id: string;
    menuItemId: string;
    quantity: number;
    menuItem: {
      id: string;
      name: string;
      category: string;
      isVeg: boolean;
    };
  }[];
}

interface GroupCartDetails {
  id: string;
  joinCode: string;
  initiatorId: string;
  initiator: { id: string; name: string };
  menuId: string;
  deliveryBlockId: string | null;
  deliveryBlock?: { id: string; name: string; shortCode: string };
  deliveryAddress: string | null;
  members: GroupMember[];
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
}

interface Block {
  id: string;
  name: string;
  shortCode: string;
}

export default function GroupOrderingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { showConfirm } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [group, setGroup] = useState<GroupCartDetails | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // Creation States
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Joining States
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Checkout States
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // UI Utilities
  const [copiedCode, setCopiedCode] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Load Active Group, Blocks & Menus on mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch blocks
        const fetchedBlocks = await apiFetch('/api/menus/blocks').catch(() => []);
        setBlocks(fetchedBlocks);
        if (fetchedBlocks.length > 0) setSelectedBlockId(fetchedBlocks[0].id);

        // Fetch menus to get list of items
        const menus = await apiFetch('/api/menus?mealType=LUNCH').catch(() => []);
        if (menus.length > 0) {
          setSelectedMenuId(menus[0].id);
          setMenuItems(menus[0].items || []);
        }

        // Check if user has an active group cart session
        const activeGroup = await apiFetch('/api/group/active');
        if (activeGroup) {
          setGroup(activeGroup);
          setupSocketConnection(activeGroup.id);
        }
      } catch (err) {
        console.error('Failed to load initial group order data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, router]);

  // Establish live socket connection
  const setupSocketConnection = (groupCartId: string) => {
    disconnectSocket();

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    console.log(`[Socket] Connecting to ${socketUrl} for group cart ${groupCartId}...`);
    
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected. Joining group room...');
      socket.emit('subscribe:group', { groupCartId });
    });

    socket.on('group:updated', (updatedDetails: GroupCartDetails) => {
      console.log('[Socket] Group updated broadcast received:', updatedDetails);
      setGroup(updatedDetails);
    });

    socket.on('group:disbanded', (data: { message: string }) => {
      alert(data.message || 'The group order has been closed by the initiator.');
      setGroup(null);
      disconnectSocket();
    });

    socket.on('group:ordered', (data: { orderId: string }) => {
      confetti({ particleCount: 100, spread: 60 });
      router.push(`/orders?id=${data.orderId}`);
    });
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // Create Group Cart
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenuId || !selectedBlockId || !addressDetail.trim()) return;

    setCreateLoading(true);
    try {
      const activeGroup = await apiFetch('/api/group/create', {
        method: 'POST',
        body: JSON.stringify({
          menuId: selectedMenuId,
          deliveryBlockId: selectedBlockId,
          deliveryAddress: addressDetail.trim(),
        }),
      });

      setGroup(activeGroup);
      setupSocketConnection(activeGroup.id);
      confetti({ particleCount: 40, spread: 30 });
    } catch (err: any) {
      alert(err.message || 'Failed to create group cart.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Join Group Cart
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setJoinLoading(true);
    setJoinError('');
    try {
      const activeGroup = await apiFetch('/api/group/join', {
        method: 'POST',
        body: JSON.stringify({
          joinCode: joinCodeInput.trim().toUpperCase(),
        }),
      });

      setGroup(activeGroup);
      setupSocketConnection(activeGroup.id);
      
      // Auto-load items belonging to that menu
      const menus = await apiFetch(`/api/menus?mealType=LUNCH`).catch(() => []);
      const matchedMenu = menus.find((m: any) => m.id === activeGroup.menuId) || menus[0];
      if (matchedMenu) {
        setMenuItems(matchedMenu.items || []);
      }

      confetti({ particleCount: 45, spread: 35 });
    } catch (err: any) {
      setJoinError(err.message || 'Invalid join code. Please check and try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  // Manage individual items in the group cart
  const handleUpdateItemQty = async (menuItemId: string, currentQty: number, delta: number) => {
    if (!group) return;
    const nextQty = Math.max(0, currentQty + delta);

    try {
      const updatedGroup = await apiFetch('/api/group/items', {
        method: 'POST',
        body: JSON.stringify({
          groupCartId: group.id,
          menuItemId,
          quantity: nextQty,
        }),
      });
      setGroup(updatedGroup);
    } catch (err: any) {
      console.error('Item qty update error:', err);
    }
  };

  // Leave Group Cart
  const handleLeaveGroup = async () => {
    if (!group) return;
    const confirmed = await showConfirm('Are you sure you want to leave this group order?');
    if (!confirmed) return;

    try {
      await apiFetch('/api/group/leave', {
        method: 'POST',
        body: JSON.stringify({ groupCartId: group.id }),
      });
      setGroup(null);
      disconnectSocket();
    } catch (err: any) {
      alert(err.message || 'Failed to leave group.');
    }
  };

  // Checkout Group Cart (Initiator only)
  const handleCheckoutGroup = async () => {
    if (!group) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const finalOrder = await apiFetch('/api/group/checkout', {
        method: 'POST',
        body: JSON.stringify({
          groupCartId: group.id,
        }),
      });
      confetti({ particleCount: 150, spread: 80 });
      router.push(`/orders?id=${finalOrder.id}`);
    } catch (err: any) {
      setCheckoutError(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Copy join code
  const handleCopyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Calculate pricing indicators
  const getBillingSplit = () => {
    if (!group) return { totalSubtotal: 0, delivery: 0, packaging: 0, tax: 0, totalAmount: 0, members: [] };

    // Standard static pricing calculations matching orders route
    const baseThaliPrice = 80.0;
    const unitPrice = baseThaliPrice / (menuItems.length || 1);

    let totalSubtotal = 0;
    const memberShares = group.members.map((m) => {
      let sub = 0;
      m.items.forEach((item) => {
        sub += unitPrice * item.quantity;
      });
      totalSubtotal += sub;
      return {
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        subtotal: sub,
        walletBalance: m.user.wallet?.balance || 0,
      };
    });

    const delivery = totalSubtotal > 0 ? 10.0 : 0.0;
    const packaging = totalSubtotal > 0 ? 5.0 : 0.0;
    const tax = parseFloat((totalSubtotal * 0.05).toFixed(2));
    const totalOverhead = delivery + packaging + tax;

    const sharesWithOverhead = memberShares.map((m) => {
      const proportion = totalSubtotal > 0 ? m.subtotal / totalSubtotal : 0;
      const shareOverhead = parseFloat((totalOverhead * proportion).toFixed(2));
      const totalDue = parseFloat((m.subtotal + shareOverhead).toFixed(2));
      const hasSufficient = m.walletBalance >= totalDue;

      return {
        ...m,
        overhead: shareOverhead,
        totalDue,
        hasSufficient,
      };
    });

    return {
      totalSubtotal,
      delivery,
      packaging,
      tax,
      totalAmount: totalSubtotal + totalOverhead,
      members: sharesWithOverhead,
    };
  };

  const billing = getBillingSplit();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto p-4">
        <div className="h-44 bg-surface-dark rounded-lg skeleton-shimmer" />
        <div className="h-64 bg-surface-dark rounded-lg skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-secondary tracking-tight">Hostel group ordering</h1>
        <p className="text-xs text-text-muted">Invite roommates, select items, and pay split wallet shares atomically.</p>
      </div>

      <AnimatePresence mode="wait">
        {!group ? (
          /* SECTION 1: Create or Join active group */
          <motion.div
            key="join-create"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* Create Card */}
            <div className="bg-surface-card border border-edge p-6 rounded-lg shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded bg-primary-light flex place-center place-mid text-primary font-semibold border border-primary/10">
                  ➕
                </div>
                <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Start a group order</h3>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Be the host. Define delivery hostel block & room coordinates, get split bills, and place the combined order.
                </p>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-3.5 pt-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase">Select Block</label>
                  <select
                    value={selectedBlockId}
                    onChange={(e) => setSelectedBlockId(e.target.value)}
                    className="w-full border border-edge px-3.5 py-3 rounded-lg bg-surface-card text-xs outline-none focus:ring-2 focus:ring-primary/20 font-semibold text-secondary"
                  >
                    {blocks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.shortCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase">Room & Floor Details</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 408, 4th Floor"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    className="w-full border border-edge px-3.5 py-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-semibold text-secondary bg-surface-card"
                  />
                </div>                 <button
                  type="submit"
                  disabled={createLoading || !addressDetail}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-lg text-xs font-semibold transition-all border border-primary-hover shadow-sm flex place-center place-mid gap-1.5 cursor-pointer mt-1 focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {createLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Start Group Session</span>
                </button>
              </form>
            </div>

            {/* Join Card */}
            <div className="bg-surface-card border border-edge p-6 rounded-lg shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded bg-primary-light flex place-center place-mid text-primary font-semibold border border-primary/10">
                  🔗
                </div>
                <h3 className="text-sm font-black text-secondary uppercase tracking-wider">Join room order</h3>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Enter the 6-character room code shared by your friend to join the cart, select items, and pay from your wallet.
                </p>
              </div>

              <form onSubmit={handleJoinGroup} className="space-y-4 pt-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-text-muted uppercase">Enter Room Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. CE49B1"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    className="w-full border border-edge px-3.5 py-3 rounded-lg align-mid text-base font-black tracking-widest outline-none focus:ring-2 focus:ring-primary/20 uppercase text-secondary bg-surface-dark font-mono shadow-sm"
                  />
                </div>

                {joinError && <p className="text-[10px] text-red-500 font-semibold align-mid">{joinError}</p>}

                <button
                  type="submit"
                  disabled={joinLoading || !joinCodeInput}
                  className="w-full bg-secondary hover:bg-secondary-light text-white py-3 rounded-lg text-xs font-semibold transition-all flex place-center place-mid gap-1.5 cursor-pointer mt-1 focus:ring-2 focus:ring-secondary/20 outline-none"
                >
                  {joinLoading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  <span>Join Room Cart</span>
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          /* SECTION 2: Active Group Order View */
          <motion.div
            key="group-active"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Group Session Status Hero */}
            <div className="bg-secondary text-white p-6 rounded-lg shadow-sm border border-secondary-light relative overflow-hidden flex flex-col md:flex-row md:place-center justify-between gap-4">
                   
              <div className="space-y-2 relative z-10">
                <div className="flex place-center gap-2">
                  <span className="text-[9px] font-black bg-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Live Session
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold">
                    Delivery Coordinate: 📍 {group.deliveryBlock?.name || 'Block'} • {group.deliveryAddress}
                  </span>
                </div>
                <h2 className="text-base font-bold flex place-center gap-1.5">
                  Initiated by <span className="text-primary font-black">{group.initiator.name}</span>
                </h2>
                <p className="text-[10px] text-zinc-300">
                  Room contains {group.members.length} members. Do not leave the browser until host checkouts.
                </p>
              </div>

              {/* Room Invite Code Card */}
              <div className="bg-white/15 backdrop-blur border border-white/15 p-4 rounded-lg flex flex-col place-center gap-2.5 shrink-0 select-none relative z-10">
                <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Share Invite Code</span>
                <div className="flex place-center gap-2">
                  <span className="text-xl font-black text-white font-mono tracking-widest">{group.joinCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                {copiedCode && <span className="text-[7px] text-green-400 font-semibold leading-none animate-pulse">Copied code!</span>}
              </div>
            </div>

            {/* Split billing Receipt & Live members list */}
            <div className="grid md:grid-cols-[repeat(3,_minmax(0,_1fr))] gap-6 items-start">
              {/* Member lists & balance checkers */}
              <div className="space-y-4 md:col-span-2">
                <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4">
                  <div className="flex justify-between place-center border-b border-edge/60 pb-3">
                    <h3 className="text-xs font-black text-secondary uppercase tracking-wider">Active group members</h3>
                    <span className="text-[9px] bg-primary-light border border-primary/10 text-primary px-2.5 py-0.5 rounded-full font-semibold">
                      {group.members.length} Joined
                    </span>
                  </div>

                  <div className="divide-y divide-edge/60">
                    {billing.members.map((m) => {
                      const isSelf = m.userId === user?.id;
                      return (
                        <div key={m.id} className="py-3 flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex place-center gap-1.5">
                              <span className="text-xs font-semibold text-secondary">
                                {m.name} {isSelf && '(You)'}
                              </span>
                              {m.userId === group.initiatorId && (
                                <span className="text-[7px] bg-secondary text-white font-black px-1.5 py-0.5 rounded uppercase">Host</span>
                              )}
                            </div>
                            
                            {/* Items listed for member */}
                            {m.subtotal > 0 ? (
                              <div className="text-[9px] text-text-muted space-y-0.5 font-semibold uppercase font-sans">
                                {group.members.find(x => x.id === m.id)?.items.map((it) => (
                                  <div key={it.id}>
                                    • {it.menuItem.name} x {it.quantity}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[9px] text-text-muted italic">No items selected</span>
                            )}
                          </div>

                          <div className="text-right space-y-1.5 shrink-0">
                            <p className="text-xs font-black text-secondary">₹{m.totalDue.toFixed(2)}</p>
                            
                            {/* Balance indicator */}
                            <div className="flex place-center justify-end gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${m.hasSufficient ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                              <span className="text-[8px] font-semibold text-text-muted uppercase">
                                {m.hasSufficient ? 'Balance Ready' : 'Insufficient Wallet'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Personal Items Picker Selector */}
                <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4">
                  <div className="border-b border-edge/60 pb-3 flex place-center justify-between">
                    <h3 className="text-xs font-black text-secondary uppercase tracking-wider">Select thali components</h3>
                    <span className="text-[8px] bg-surface-dark text-text-muted px-2 py-0.5 rounded-full font-semibold">LUNCH PACKAGES</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {menuItems.map((item) => {
                      const myMemberRecord = group.members.find((m) => m.userId === user?.id);
                      const myItemRecord = myMemberRecord?.items.find((it) => it.menuItemId === item.id);
                      const itemQty = myItemRecord?.quantity || 0;

                      return (
                        <div key={item.id} className="border border-edge/60 p-3 rounded-lg flex justify-between place-center gap-3 bg-surface-dark hover:border-primary/20 transition-all group">
                          <div className="space-y-1">
                            <div className="flex place-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-xs font-semibold text-secondary leading-tight">{item.name}</span>
                            </div>
                            <span className="text-[9px] text-text-muted font-semibold uppercase">{item.category}</span>
                          </div>

                          <div className="flex place-center bg-surface-card border border-edge/60 rounded-md p-0.5 shadow-sm shrink-0">
                            <button
                              onClick={() => handleUpdateItemQty(item.id, itemQty, -1)}
                              className="w-6 h-6 rounded bg-surface-dark border border-edge/50 hover:border-primary text-text-muted hover:text-primary flex place-center place-mid transition-all shadow-sm"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-black w-6 align-mid text-secondary">{itemQty}</span>
                            <button
                              onClick={() => handleUpdateItemQty(item.id, itemQty, 1)}
                              className="w-6 h-6 rounded bg-surface-dark border border-edge/50 hover:border-primary text-text-muted hover:text-primary flex place-center place-mid transition-all shadow-sm"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dynamic split invoice ledger card */}
              <div className="space-y-4">
                <div className="bg-surface-card border border-edge p-5 rounded-lg space-y-4 relative overflow-hidden shadow-sm">
                  <div className="flex place-center gap-1.5 border-b border-edge/60 pb-3 mb-1">
                    <span>🧾</span>
                    <h3 className="text-xs font-black text-secondary uppercase tracking-wider">Split Invoice</h3>
                  </div>

                  <div className="space-y-2.5 text-xs font-semibold text-text-muted">
                    <div className="flex justify-between place-center">
                      <span>Group Subtotal</span>
                      <span className="text-secondary font-semibold">₹{billing.totalSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between place-center">
                      <span>Delivery Split</span>
                      <span className="text-secondary font-semibold">₹{billing.delivery.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between place-center">
                      <span>Packaging Split</span>
                      <span className="text-secondary font-semibold">₹{billing.packaging.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between place-center">
                      <span>GST (5%)</span>
                      <span className="text-secondary font-semibold">₹{billing.tax.toFixed(2)}</span>
                    </div>
                    
                    <div className="h-[1px] border-b border-dashed border-edge/60 my-3" />
                    <div className="flex justify-between place-center text-sm font-semibold text-secondary">
                      <span>Group Total Due</span>
                      <span className="text-primary text-base font-black">₹{billing.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Actions checklist panel */}
                  <div className="pt-3 space-y-3">
                    {checkoutError && (
                      <div className="bg-red-500/10 text-red-600 border border-red-200/20 p-3 rounded-lg flex items-start gap-2.5 text-[9px] font-semibold shadow-sm">
                        <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-500 animate-pulse" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    {group.initiatorId === user?.id ? (
                      /* INITIATOR CONTROLS */
                      <button
                        onClick={handleCheckoutGroup}
                        disabled={checkoutLoading || billing.members.some(m => !m.hasSufficient) || billing.totalSubtotal === 0}
                        className="w-full bg-primary hover:bg-primary-hover disabled:bg-surface-dark disabled:text-text-muted text-white py-3 rounded-lg text-xs font-semibold transition-all border border-primary-hover shadow-sm flex place-center place-mid gap-1.5 cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
                      >
                        {checkoutLoading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingBag size={14} />}
                        <span>{checkoutLoading ? 'Processing split order...' : 'Checkout Group Split'}</span>
                      </button>
                    ) : (
                      /* MEMBER CONTROLS */
                      <div className="bg-surface-dark border border-edge/60 p-3 rounded-lg align-mid space-y-1.5">
                        <Loader2 size={16} className="mx-auto text-primary animate-spin" />
                        <p className="text-[9px] font-semibold text-text-muted uppercase">
                          Waiting for host ({group.initiator.name}) to checkout...
                        </p>
                      </div>
                    )}

                    {/* Leave Room Cart Button */}
                    <button
                      onClick={handleLeaveGroup}
                      className="w-full bg-surface-card hover:bg-red-500/10 text-text-muted hover:text-red-500 border border-edge hover:border-red-200/40 py-3 rounded-lg text-xs font-semibold transition-all flex place-center place-mid gap-1.5 cursor-pointer active:scale-[0.99] focus:ring-2 focus:ring-red-500/20 outline-none"
                    >
                      <LogOut size={14} />
                      <span>{group.initiatorId === user?.id ? 'Disband Group Order' : 'Leave Group Order'}</span>
                    </button>
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
