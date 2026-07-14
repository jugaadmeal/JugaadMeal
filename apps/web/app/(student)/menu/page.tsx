'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { useCartStore } from '../../../lib/stores/cartStore';
import { apiFetch } from '../../../lib/api';
import { MenuDTO, MenuItemDTO } from 'shared-types';
import { ShoppingCart, ShoppingBag, Plus, Minus, Trash2, X, Wallet, Tag, CreditCard, ChevronRight, AlertCircle, HelpCircle, Check, MapPin, Sparkles, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface Lecture {
  day: string;
  period: string;
  block: string;
  room: string;
  timeSlot: string;
}

const getTimetableSuggestion = (blocks: any[]): { blockId: string; address: string; message: string } | null => {
  if (typeof window === 'undefined' || blocks.length === 0) return null;
  const saved = localStorage.getItem('ce_timetable');
  if (!saved) return null;

  try {
    const lectures: Lecture[] = JSON.parse(saved);
    const now = new Date();
    
    // Day helper
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    
    // Find lectures for today
    const todaysLectures = lectures.filter(l => l.day.toLowerCase() === currentDay.toLowerCase());
    
    if (todaysLectures.length === 0) {
      // If no class today (weekend), suggest the first class of the week
      const firstLec = lectures[0];
      const matchBlock = blocks.find(b => 
        b.name.toLowerCase().includes(firstLec.block.toLowerCase()) || 
        firstLec.block.toLowerCase().includes(b.shortCode.toLowerCase())
      );
      if (matchBlock) {
        return {
          blockId: matchBlock.id,
          address: `${firstLec.room} (Suggested for ${firstLec.day})`,
          message: `Schedule suggestion: Deliver to **${matchBlock.name} (${firstLec.room})** for your upcoming **${firstLec.day}** class?`
        };
      }
      return null;
    }

    // Convert "10:30 AM" to minutes
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Check if user is currently in a class
    for (const lec of todaysLectures) {
      const [startStr, endStr] = lec.timeSlot.split(' - ');
      const startMin = parseTime(startStr);
      const endMin = parseTime(endStr);
      
      if (currentMinutes >= startMin && currentMinutes <= endMin) {
        const matchBlock = blocks.find(b => 
          b.name.toLowerCase().includes(lec.block.toLowerCase()) || 
          lec.block.toLowerCase().includes(b.shortCode.toLowerCase())
        );
        if (matchBlock) {
          return {
            blockId: matchBlock.id,
            address: `${lec.room} (${lec.period})`,
            message: `You are currently in **${lec.period}** at **${matchBlock.name} (${lec.room})**. Deliver here?`
          };
        }
      }
    }

    // 2. Check if user has a class starting soon today
    const nextLec = todaysLectures.find(l => {
      const [startStr] = l.timeSlot.split(' - ');
      return parseTime(startStr) > currentMinutes;
    });

    if (nextLec) {
      const matchBlock = blocks.find(b => 
        b.name.toLowerCase().includes(nextLec.block.toLowerCase()) || 
        nextLec.block.toLowerCase().includes(b.shortCode.toLowerCase())
      );
      if (matchBlock) {
        return {
          blockId: matchBlock.id,
          address: `${nextLec.room} (Next Class)`,
          message: `Next class is **${nextLec.period}** starting soon at **${matchBlock.name} (${nextLec.room})**. Deliver there?`
        };
      }
    }

    // 3. Fallback to first class of today
    const firstLec = todaysLectures[0];
    const matchBlock = blocks.find(b => 
      b.name.toLowerCase().includes(firstLec.block.toLowerCase()) || 
      firstLec.block.toLowerCase().includes(b.shortCode.toLowerCase())
    );
    if (matchBlock) {
      return {
        blockId: matchBlock.id,
        address: `${firstLec.room} (${firstLec.period})`,
        message: `Today's schedule suggestion: Deliver to **${matchBlock.name} (${firstLec.room})** for your **${firstLec.period}** class?`
      };
    }
  } catch (err) {
    console.error('Error parsing timetable for suggestions:', err);
  }

  return null;
};

export default function MenuBrowsePage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const cart = useCartStore();

  const [menus, setMenus] = useState<MenuDTO[]>([]);
  const [mealTab, setMealTab] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS'>('LUNCH');
  const [blocks, setBlocks] = useState<{ id: string; name: string; shortCode: string }[]>([]);
  
  const [selectedItem, setSelectedItem] = useState<MenuItemDTO | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  
  const [cartOpen, setCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [promoError, setPromoError] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscountVal, setPromoDiscountVal] = useState(0);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('ASAP');
  
  // Timetable suggestion states
  const [timetableSuggestion, setTimetableSuggestion] = useState<{ blockId: string; address: string; message: string } | null>(null);

  // Locker pickup states
  const [isLockerPickup, setIsLockerPickup] = useState(false);
  const [selectedLockerId, setSelectedLockerId] = useState('');
  const [lockers, setLockers] = useState<any[]>([]);

  // Offline Order Queue states
  const [hasPendingOrderSync, setHasPendingOrderSync] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasPendingOrderSync(!!localStorage.getItem('ce_pending_order'));
    }

    const handleOnline = async () => {
      const pendingOrder = localStorage.getItem('ce_pending_order');
      if (pendingOrder) {
        try {
          const { payload, totals } = JSON.parse(pendingOrder);
          const response = await apiFetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          
          if (payload.paymentMethod === 'WALLET' && user) {
            updateUser({
              walletBalance: (user.walletBalance || 0) - totals.total,
            });
          }

          localStorage.removeItem('ce_pending_order');
          setHasPendingOrderSync(false);
          alert('Offline order successfully placed and synced!');
          router.push(`/orders/${response.id}`);
        } catch (e: any) {
          console.error('Offline order sync failed:', e);
          alert('⚠️ Offline order sync failed: ' + e.message);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [router, user, updateUser]);

  useEffect(() => {
    if (isAuthenticated && cartOpen) {
      apiFetch('/api/lockers')
        .then((data) => setLockers(data))
        .catch((err) => console.error('Locker fetch error:', err));
    }
  }, [isAuthenticated, cartOpen]);

  // Auto-seed timetable mock data if none exists
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('ce_timetable')) {
      const defaultTimetable = [
        { day: 'Monday', period: 'Period 3', block: 'CSE Block', room: 'Room 201', timeSlot: '10:30 AM - 12:00 PM' },
        { day: 'Tuesday', period: 'Period 2', block: 'Block A', room: 'Room 105', timeSlot: '09:00 AM - 10:30 AM' },
        { day: 'Wednesday', period: 'Period 4', block: 'CSE Block', room: 'Room 304', timeSlot: '12:00 PM - 01:30 PM' },
        { day: 'Thursday', period: 'Period 3', block: 'Block B', room: 'Room 210', timeSlot: '10:30 AM - 12:00 PM' },
        { day: 'Friday', period: 'Period 5', block: 'Food Court', room: 'First Floor', timeSlot: '01:30 PM - 03:00 PM' },
      ];
      localStorage.setItem('ce_timetable', JSON.stringify(defaultTimetable));
    }
  }, []);

  // Update suggestions dynamically when cart opens or blocks list loads
  useEffect(() => {
    if (cartOpen && blocks.length > 0) {
      const suggestion = getTimetableSuggestion(blocks);
      setTimetableSuggestion(suggestion);
    }
  }, [cartOpen, blocks]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadMenuData = async () => {
      setIsLoading(true);
      try {
        const fetchedMenus = await apiFetch(`/api/menus?mealType=${mealTab}`);
        setMenus(fetchedMenus);

        // Fetch blocks list for address mapping
        const fetchedBlocks = await apiFetch('/api/menus/blocks').catch(() => []);
        setBlocks(fetchedBlocks);

        if (user && fetchedBlocks.length > 0) {
          const cartState = useCartStore.getState();
          const isValidBlock = fetchedBlocks.some((b: any) => b.id === cartState.deliveryBlockId);
          if (!isValidBlock) {
            const defaultBlock = fetchedBlocks.find((b: any) => b.shortCode === user.hostelBlock)
              || fetchedBlocks.find((b: any) => b.shortCode === 'H6')
              || fetchedBlocks[0];
            cartState.setDeliveryBlockId(defaultBlock.id);
            cartState.setDeliveryAddress(user.defaultAddress || '');
          }
        }
      } catch (error) {
        console.error('Error fetching menus:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMenuData();
  }, [isAuthenticated, mealTab, router, user?.id]);

  const handleAddItem = (menuId: string, item: MenuItemDTO) => {
    cart.addItem(menuId, item);
    setAddedItemId(item.id);
    setTimeout(() => setAddedItemId(null), 800);
  };

  const handleApplyPromo = async () => {
    setPromoError('');
    setPromoApplied(false);
    setPromoDiscountVal(0);

    if (!cart.couponCode.trim()) {
      setPromoError('Please enter a coupon code');
      return;
    }

    try {
      const result = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: cart.couponCode.trim(),
          orderAmount: getSubtotal(),
        }),
      });

      if (result.valid) {
        setPromoApplied(true);
        setPromoDiscountVal(result.discountAmount);
      }
    } catch (err: any) {
      setPromoError(err.message || 'Invalid coupon code');
    }
  };

  const getSubtotal = () => {
    return cart.items.reduce((sum, item) => sum + item.quantity * (selectedMenu()?.studentPrice || 80) / (selectedMenu()?.items.length || 1), 0);
  };

  const selectedMenu = () => {
    return menus.find((m) => m.id === cart.menuId) || menus[0];
  };

  const getCartTotals = () => {
    const subtotal = getSubtotal();
    const menu = selectedMenu();
    const delivery = menu?.deliveryFee || 10;
    const packaging = menu?.packagingFee || 5;
    const tax = subtotal * 0.05;
    const discount = promoApplied ? promoDiscountVal : 0;
    const total = Math.max(0, subtotal + delivery + packaging + tax - discount);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      delivery,
      packaging,
      tax: parseFloat(tax.toFixed(2)),
      discount,
      total: parseFloat(total.toFixed(2)),
    };
  };

  const handleCheckout = async () => {
    if (isLockerPickup && !selectedLockerId) {
      alert('Please select a locker cell for pickup.');
      return;
    }
    if (!isLockerPickup && (!cart.deliveryBlockId || !cart.deliveryAddress)) {
      alert('Please fill out delivery block and room number.');
      return;
    }

    setOrderPlacing(true);
    const totals = getCartTotals();

    const orderPayload = {
      menuId: cart.menuId,
      items: cart.items.map((i) => ({
        menuItemId: i.menuItem.id,
        quantity: i.quantity,
      })),
      deliveryBlockId: cart.deliveryBlockId,
      deliveryAddress: isLockerPickup ? 'Locker Pickup' : cart.deliveryAddress,
      paymentMethod: cart.paymentMethod,
      couponCode: promoApplied ? cart.couponCode : null,
      isLockerPickup,
      lockerId: isLockerPickup ? selectedLockerId : null,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      localStorage.setItem('ce_pending_order', JSON.stringify({ payload: orderPayload, totals }));
      setHasPendingOrderSync(true);
      alert('🛜 You are offline. Your order has been queued and will automatically place when connection returns!');
      cart.clearCart();
      setCartOpen(false);
      setOrderPlacing(false);
      return;
    }

    try {
      const response = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      if (cart.paymentMethod === 'WALLET' && user) {
        updateUser({
          walletBalance: (user.walletBalance || 0) - totals.total,
        });
      }

      cart.clearCart();
      setCartOpen(false);
      router.push(`/orders/${response.id}`);
    } catch (err: any) {
      alert(err.message || 'Checkout failed.');
    } finally {
      setOrderPlacing(false);
    }
  };

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex justify-between place-center"
      >
        <div>
          <h1 className="text-2xl font-bold text-secondary tracking-tight">Today&apos;s menu listings</h1>
          <p className="text-sm text-text-muted">Fresh meals prepared by our main campus kitchen.</p>
          {hasPendingOrderSync && (
            <div className="inline-flex place-center gap-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
              <span>Pending Order Sync</span>
            </div>
          )}
        </div>

        {/* Float Cart Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCartOpen(true)}
          className="relative bg-primary hover:bg-primary-hover text-white p-3 py-2.5 rounded-lg border border-primary-hover shadow-sm transition-all flex place-center gap-2 font-semibold text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <ShoppingCart size={18} />
          {cart.items.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-white text-primary text-[10px] w-5 h-5 rounded-full flex place-center place-mid font-semibold shadow-sm"
            >
              {cart.items.reduce((sum, i) => sum + i.quantity, 0)}
            </motion.span>
          )}
          <span className="hidden sm:inline">View Cart</span>
        </motion.button>
      </motion.div>

      {/* Tabs Menu */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex bg-surface-card p-1 rounded-lg border border-edge shadow-sm overflow-x-auto"
      >
        {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMealTab(tab)}
            className={`flex-1 min-w-[90px] align-mid py-2.5 text-xs font-semibold rounded-md transition-all ${
              mealTab === tab
                ? 'bg-primary text-white shadow-sm border border-primary-hover'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-dark/50'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </motion.div>

      {/* Grid List */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface-card rounded-lg skeleton-shimmer border border-edge" />
          <div className="h-64 bg-surface-card rounded-lg skeleton-shimmer border border-edge" />
        </div>
      ) : menus.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {menus.map((menu, menuIdx) => (
            <motion.div
              key={menu.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: menuIdx * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="bg-surface-card border border-edge rounded-lg overflow-hidden shadow-sm flex flex-col justify-between hover:border-primary/20 transition-all duration-300"
            >
              {/* Thali Header */}
              <div className="p-6 border-b border-edge space-y-2 bg-surface-dark/40 relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-secondary flex place-center gap-2">
                      {menu.name}
                      <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-semibold uppercase">Veg</span>
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{menu.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted line-through">₹{menu.basePrice}</p>
                    <p className="text-base font-black text-primary">₹{menu.studentPrice}</p>
                  </div>
                </div>
              </div>

              {/* Thali Items list */}
              <div className="p-6 space-y-4 flex-1">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Combos Included</p>
                <div className="space-y-3">
                  {menu.items.map((item) => (
                    <div key={item.id} className="flex justify-between place-center gap-4 bg-surface/30 p-2.5 rounded-lg border border-edge/60 hover:border-primary/30 transition-colors">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-semibold text-secondary">{item.name}</h4>
                        <p className="text-[11px] text-text-muted leading-tight">{item.description}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAddItem(menu.id, item)}
                        className={`p-1.5 rounded-lg transition-all flex place-center place-mid shrink-0 ${
                          addedItemId === item.id
                            ? 'bg-green-500 text-white border border-green-500'
                            : 'bg-orange-50 text-primary border border-orange-200 hover:bg-primary hover:text-white hover:border-primary'
                        }`}
                        title="Add Item"
                      >
                        {addedItemId === item.id ? <Check size={16} /> : <Plus size={16} />}
                      </motion.button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-edge rounded-lg p-16 align-mid space-y-3 bg-surface-card max-w-md mx-auto">
          <span className="text-4xl">🍽️</span>
          <h3 className="text-lg font-bold text-secondary">No menus scheduled</h3>
          <p className="text-xs text-text-muted">
            There are no menus ready for {mealTab.toLowerCase()} today. Make sure to vote on open polls.
          </p>
        </div>
      )}

      {/* Cart Drawer Slide-out overlay */}
      <AnimatePresence>
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex items-end place-mid overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-secondary/50 backdrop-blur-md"
              onClick={() => setCartOpen(false)}
            />

            {/* Cart panel (Animated Bottom Sheet Redesign) */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="relative w-full max-w-xl bg-surface shadow-md flex flex-col justify-between border-t border-edge z-10 rounded-t-xl h-[85vh] overflow-hidden"
            >
              {/* Drag handle pill */}
              <div className="flex place-mid py-3 shrink-0 bg-surface-card border-b border-edge">
                <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full cursor-pointer hover:bg-zinc-300 transition-colors" onClick={() => setCartOpen(false)} />
              </div>
              
              {/* Header */}
              <div className="p-5 border-b border-edge/60 flex justify-between place-center bg-surface-card shrink-0">
                <div className="flex place-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary flex place-center place-mid border border-primary-hover shadow-sm">
                    <ShoppingBag size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-secondary text-sm uppercase tracking-wide">Secure Checkout</h3>
                    <p className="text-[10px] text-text-muted font-semibold">CAMPUS EAT • STUDENT PORTAL</p>
                  </div>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="text-text-muted hover:text-text-primary p-2.5 rounded-md hover:bg-primary-light dark:hover:bg-zinc-800 transition-all hover:rotate-90 duration-300"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                {cart.items.length === 0 ? (
                  <div className="align-mid py-24 space-y-4 flex flex-col place-center place-mid">
                    <div className="w-20 h-20 bg-primary-light border border-primary/10 rounded-full flex place-center place-mid relative">
                      <span className="text-4xl">🍕</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-secondary text-base">Your cart is empty</h4>
                      <p className="text-xs text-text-muted max-w-[220px] mx-auto leading-relaxed">Browse tomorrow's menus to schedule your next meal slot.</p>
                    </div>
                    <button
                      onClick={() => setCartOpen(false)}
                      className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg text-xs font-semibold border border-primary-hover shadow-sm transition-all"
                    >
                      Browse Items
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Discount Coupon Progress Meter */}
                    {getSubtotal() < 100 && (
                      <div className="bg-primary-light border border-primary/10 p-4 rounded-lg text-[10px] font-semibold text-primary flex flex-col gap-2.5 shadow-sm">
                        <div className="flex justify-between place-center">
                          <span>Add ₹{(100 - getSubtotal()).toFixed(2)} more to qualify for the FIRSTEAT promo discount.</span>
                          <span className="text-xs">🎁</span>
                        </div>
                        <div className="w-full bg-orange-100/50 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-500" style={{ width: `${Math.min(100, (getSubtotal() / 100) * 100)}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Item list */}
                    <div className="space-y-3">
                      <div className="flex justify-between place-center pl-1">
                        <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider">Items in Order</h4>
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-black">
                          {cart.items.length} {cart.items.length === 1 ? 'Item' : 'Items'}
                        </span>
                      </div>
                      
                      {cart.items.map((item, idx) => (
                        <motion.div
                          key={item.menuItem.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex justify-between place-center gap-4 border border-edge/70 p-4 rounded-lg bg-surface-card transition-all group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex place-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 border ${item.menuItem.isVeg ? 'bg-green-500 border-green-600' : 'bg-red-500 border-red-600'}`} />
                              <h5 className="text-sm font-semibold text-secondary line-clamp-1">{item.menuItem.name}</h5>
                            </div>
                            <div className="flex place-center gap-2">
                              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md ${item.menuItem.isVeg ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                {item.menuItem.isVeg ? 'VEG' : 'NON-VEG'}
                              </span>
                              <span className="text-[9px] text-text-muted font-semibold">Standard Meal</span>
                            </div>
                          </div>

                          <div className="flex place-center gap-3 shrink-0">
                            {/* Tactile quantity controls */}
                            <div className="flex place-center bg-surface-dark border border-edge/60 rounded-lg p-1">
                              <button
                                onClick={() => cart.updateQuantity(item.menuItem.id, item.quantity - 1)}
                                className="w-7 h-7 rounded-md bg-white border border-edge/50 hover:border-primary text-text-muted hover:text-primary flex place-center place-mid transition-all shadow-sm active:scale-90"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="text-xs font-black w-6 align-mid text-secondary">{item.quantity}</span>
                              <button
                                onClick={() => cart.updateQuantity(item.menuItem.id, item.quantity + 1)}
                                className="w-7 h-7 rounded-md bg-white border border-edge/50 hover:border-primary text-text-muted hover:text-primary flex place-center place-mid transition-all shadow-sm active:scale-90"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            {/* Trash button */}
                            <button
                              onClick={() => cart.removeItem(item.menuItem.id)}
                              className="text-text-muted hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors active:scale-90"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Timetable Smart Suggestion */}
                    {timetableSuggestion && (
                      <div className="bg-primary-light border border-primary/15 p-5 rounded-lg relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black px-3 py-1 rounded-bl-md uppercase tracking-widest shadow-sm">
                          Timetable suggestion
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded bg-primary-light border border-primary/20 flex place-center place-mid shrink-0">
                            <Sparkles size={18} className="text-primary animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-secondary uppercase tracking-wider">Timetable Match</h4>
                            <p className="text-[11px] text-text-muted leading-relaxed" dangerouslySetInnerHTML={{ __html: timetableSuggestion.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            cart.setDeliveryBlockId(timetableSuggestion.blockId);
                            cart.setDeliveryAddress(timetableSuggestion.address);
                            confetti({
                              particleCount: 55,
                              spread: 45,
                              origin: { y: 0.8 }
                            });
                          }}
                          className="w-full mt-3.5 bg-primary hover:bg-primary-hover text-white py-2.5 rounded-lg text-xs font-semibold transition-all flex place-center place-mid gap-1.5 border border-primary-hover shadow-sm cursor-pointer active:scale-[0.99]"
                        >
                          <span>Apply Suggested Canteen Location</span>
                        </button>
                      </div>
                    )}

                    {/* Delivery details */}
                    <div className="border border-edge/60 p-5 rounded-lg space-y-4 bg-surface-card">
                      <div className="flex place-center gap-2 pl-0.5 border-b border-edge/60 pb-2.5">
                        <MapPin size={16} className="text-primary animate-bounce-slow" />
                        <h4 className="text-xs font-black text-secondary uppercase tracking-wider">Delivery Method & Location</h4>
                      </div>

                      {/* Delivery Mode Toggles */}
                      <div className="flex gap-2 p-1 bg-surface-dark border border-edge rounded-md text-[10px] font-semibold uppercase align-mid">
                        <button
                          type="button"
                          onClick={() => setIsLockerPickup(false)}
                          className={`flex-1 py-2 rounded transition-all cursor-pointer ${!isLockerPickup ? 'bg-surface-card text-secondary border border-edge shadow-sm font-semibold' : 'text-text-muted hover:text-secondary'}`}
                        >
                          Room Drop-off 🚪
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsLockerPickup(true)}
                          className={`flex-1 py-2 rounded transition-all cursor-pointer ${isLockerPickup ? 'bg-surface-card text-secondary border border-edge shadow-sm font-semibold' : 'text-text-muted hover:text-secondary'}`}
                        >
                          Locker Pickup 🔐
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-text-muted uppercase pl-0.5">Target Hostel Block</label>
                          <select
                            value={cart.deliveryBlockId || ''}
                            onChange={(e) => {
                              cart.setDeliveryBlockId(e.target.value);
                              setSelectedLockerId(''); // Reset locker choice when block changes
                            }}
                            className="w-full border border-edge px-3.5 py-3 rounded-lg bg-surface-card text-xs outline-none focus:ring-2 focus:ring-primary/20 font-semibold text-secondary"
                          >
                            <option value="" disabled>-- Choose Hostel Block --</option>
                            {blocks.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name} ({b.shortCode})
                              </option>
                            ))}
                          </select>
                        </div>

                        {!isLockerPickup ? (
                          <div className="space-y-1.5 animate-fade-in-up">
                            <label className="text-[10px] font-black text-text-muted uppercase pl-0.5">Room Number & Floor Details</label>
                            <input
                              type="text"
                              value={cart.deliveryAddress}
                              onChange={(e) => cart.setDeliveryAddress(e.target.value)}
                              className="w-full border border-edge px-3.5 py-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-semibold text-secondary bg-surface-card"
                              placeholder="e.g. Room 304, 3rd Floor"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1.5 animate-fade-in-up">
                            <label className="text-[10px] font-black text-text-muted uppercase pl-0.5">Select Available Locker Cell</label>
                            {cart.deliveryBlockId ? (
                              (() => {
                                const blockLockers = lockers.filter(
                                  (lk) => lk.blockId === cart.deliveryBlockId && !lk.isOccupied
                                );
                                if (blockLockers.length === 0) {
                                  return (
                                    <div className="bg-red-55/10 text-red-600 border border-red-200/20 p-3 rounded-lg text-[9px] font-semibold">
                                      ⚠️ No empty locker cells available in this block. Choose room drop-off or another block.
                                    </div>
                                  );
                                }
                                return (
                                  <select
                                    value={selectedLockerId}
                                    onChange={(e) => setSelectedLockerId(e.target.value)}
                                    className="w-full border border-edge px-3.5 py-3 rounded-lg bg-surface-card text-xs outline-none focus:ring-2 focus:ring-primary/20 font-semibold text-secondary"
                                  >
                                    <option value="" disabled>-- Select Locker Box --</option>
                                    {blockLockers.map((lk) => (
                                      <option key={lk.id} value={lk.id}>
                                        {lk.code} (Unoccupied)
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()
                            ) : (
                              <p className="text-[10px] text-text-muted italic pl-0.5">
                                Select target block first to view available locker list.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Preferred Timing Selector */}
                    <div className="border border-edge/60 p-5 rounded-lg space-y-3.5 bg-surface-card">
                      <h4 className="text-xs font-black text-secondary uppercase tracking-wider pl-0.5">Preferred Slot</h4>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {[
                          { id: 'ASAP', label: '🚀 ASAP (30m)' },
                          { id: '12:30', label: '12:30 PM' },
                          { id: '13:00', label: '1:00 PM' },
                          { id: '13:30', label: '1:30 PM' },
                        ].map((slot) => {
                          const isSelected = selectedSlot === slot.id;
                          return (
                            <button
                              type="button"
                              key={slot.id}
                              onClick={() => setSelectedSlot(slot.id)}
                              className={`px-4 py-2.5 rounded-lg text-[10px] font-semibold border transition-all shrink-0 cursor-pointer ${
                                isSelected
                                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20 font-black'
                                  : 'border-edge bg-surface-card text-text-muted hover:border-text-muted'
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Kitchen Instructions Selector */}
                    <div className="border border-edge/60 p-5 rounded-lg space-y-3 bg-surface-card">
                      <div className="flex justify-between place-center border-b border-edge/60 pb-2.5">
                        <h4 className="text-xs font-black text-secondary uppercase tracking-wider pl-0.5">Kitchen Instructions 🧑‍🍳</h4>
                        <span className="text-[9px] bg-surface-dark text-text-muted px-2 py-0.5 rounded-full font-semibold uppercase font-sans">Food Preferences</span>
                      </div>
                      
                      <textarea
                        value={cart.specialInstructions}
                        onChange={(e) => cart.setSpecialInstructions(e.target.value)}
                        className="w-full border border-edge px-3.5 py-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-semibold text-secondary bg-surface-dark border border-edge resize-none h-20 placeholder-gray-400"
                        placeholder="e.g. No onion, make it extra spicy..."
                      />

                      {/* Quick templates tag chips */}
                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {[
                          { emoji: '🧅', label: 'No onion' },
                          { emoji: '🌶️', label: 'Extra spicy' },
                          { emoji: '🧄', label: 'No garlic' },
                          { emoji: '🧂', label: 'Extra masala' },
                        ].map((chip) => (
                          <button
                            type="button"
                            key={chip.label}
                            onClick={() => {
                              const spacer = cart.specialInstructions ? ', ' : '';
                              cart.setSpecialInstructions(cart.specialInstructions + spacer + chip.emoji + ' ' + chip.label);
                            }}
                            className="bg-surface-card hover:bg-primary-light border border-edge hover:border-primary/20 text-text-muted hover:text-primary px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all flex place-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <span>{chip.emoji}</span>
                            <span>{chip.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Selection Cards */}
                    <div className="border border-edge/60 p-5 rounded-lg space-y-4 bg-surface-card">
                      <h4 className="text-xs font-black text-secondary uppercase tracking-wider pl-0.5">Select Payment Mode</h4>
                      
                      <div className="grid grid-cols-[repeat(3,_minmax(0,_1fr))] gap-3 align-mid">
                        {/* Campus Wallet */}
                        <button
                          type="button"
                          onClick={() => cart.setPaymentMethod('WALLET')}
                          className={`relative flex flex-col place-center place-mid gap-2.5 p-3 rounded-lg border-2 transition-all ${
                            cart.paymentMethod === 'WALLET'
                              ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20 font-black'
                              : 'border-edge hover:border-text-muted bg-surface-card text-text-muted'
                          }`}
                        >
                          {cart.paymentMethod === 'WALLET' && (
                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                              <Check size={8} strokeWidth={4} />
                            </div>
                          )}
                          <div className={`p-2.5 rounded-md transition-all ${cart.paymentMethod === 'WALLET' ? 'bg-primary/10 text-primary' : 'bg-surface-dark text-text-muted'}`}>
                            <Wallet size={18} />
                          </div>
                          <span className="text-xs font-semibold">Wallet</span>
                          <span className="text-[9px] font-semibold text-text-muted leading-none mt-0.5">
                            ₹{(user?.walletBalance || 0).toFixed(2)}
                          </span>
                        </button>

                        {/* UPI */}
                        <button
                          type="button"
                          onClick={() => cart.setPaymentMethod('UPI')}
                          className={`relative flex flex-col place-center place-mid gap-2.5 p-3 rounded-lg border-2 transition-all ${
                            cart.paymentMethod === 'UPI'
                              ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20 font-black'
                              : 'border-edge hover:border-text-muted bg-surface-card text-text-muted'
                          }`}
                        >
                          {cart.paymentMethod === 'UPI' && (
                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                              <Check size={8} strokeWidth={4} />
                            </div>
                          )}
                          <div className={`p-2.5 rounded-md transition-all ${cart.paymentMethod === 'UPI' ? 'bg-primary/10 text-primary' : 'bg-surface-dark text-text-muted'}`}>
                            <Smartphone size={18} />
                          </div>
                          <span className="text-xs font-semibold">UPI QR</span>
                          <span className="text-[9px] font-semibold text-text-muted leading-none mt-0.5">Instant Pay</span>
                        </button>

                        {/* COD */}
                        <button
                          type="button"
                          onClick={() => cart.setPaymentMethod('CASH_ON_DELIVERY')}
                          className={`relative flex flex-col place-center place-mid gap-2.5 p-3 rounded-lg border-2 transition-all ${
                            cart.paymentMethod === 'CASH_ON_DELIVERY'
                              ? 'border-primary bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20 font-black'
                              : 'border-edge hover:border-text-muted bg-surface-card text-text-muted'
                          }`}
                        >
                          {cart.paymentMethod === 'CASH_ON_DELIVERY' && (
                            <div className="absolute top-1 right-1 bg-primary text-white rounded-full p-0.5 shadow-sm">
                              <Check size={8} strokeWidth={4} />
                            </div>
                          )}
                          <div className={`p-2.5 rounded-md transition-all ${cart.paymentMethod === 'CASH_ON_DELIVERY' ? 'bg-primary/10 text-primary' : 'bg-surface-dark text-text-muted'}`}>
                            <CreditCard size={18} />
                          </div>
                          <span className="text-xs font-semibold">Cash/COD</span>
                          <span className="text-[9px] font-semibold text-text-muted leading-none mt-0.5">On Drop</span>
                        </button>
                      </div>
                    </div>

                    {/* Voucher / Promo Coupons */}
                    <div className="border border-edge/40 border-dashed p-5 rounded-lg space-y-3.5 bg-surface-card shadow-sm">
                      <div className="flex place-center gap-1.5 pl-0.5">
                        <Tag size={16} className="text-primary animate-pulse" />
                        <h4 className="text-xs font-black text-secondary uppercase tracking-wider">Coupon Discount</h4>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cart.couponCode}
                          onChange={(e) => cart.setCouponCode(e.target.value)}
                          className="flex-1 border border-edge px-3.5 py-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 font-semibold uppercase tracking-wider text-secondary bg-surface-dark"
                          placeholder="e.g. FIRSTEAT"
                        />
                        <button
                          onClick={handleApplyPromo}
                          className="bg-secondary hover:bg-secondary-light text-white text-xs font-semibold px-5 py-2.5 rounded-lg border border-secondary-light shadow-sm transition-all cursor-pointer active:scale-95 focus:ring-2 focus:ring-secondary/20 outline-none"
                        >
                          Apply
                        </button>
                      </div>
                      {promoError && <p className="text-[10px] text-red-500 font-semibold pl-0.5">{promoError}</p>}
                      {promoApplied && <p className="text-[10px] text-green-600 font-semibold pl-0.5">Code applied successfully! (₹50 discount saved)</p>}
                    </div>

                    {/* Detailed Dynamic Coins Breakdown Card */}
                    {cart.paymentMethod === 'WALLET' && user && (
                      <div className="bg-surface-card border border-edge p-5 rounded-lg space-y-3.5 shadow-sm relative overflow-hidden">
                        <div className="flex place-center gap-2">
                          <span className="text-lg">🪙</span>
                          <div>
                            <h4 className="text-xs font-black text-secondary uppercase tracking-wider">Loyalty Splits</h4>
                            <p className="text-[9px] text-text-muted">Capped at {user.collegeSettings?.maxPromoDiscountPercent ?? 20.0}% using coins.</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs font-semibold text-text-muted border-t border-edge/60 pt-2.5">
                          <div className="flex justify-between place-center">
                            <span>Deposited Balance Deducted</span>
                            <span className="text-secondary font-semibold">
                              ₹{Math.max(0, getCartTotals().total - Math.min(user.walletPromoBalance || 0, getCartTotals().total * ((user.collegeSettings?.maxPromoDiscountPercent ?? 20.0) / 100))).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between place-center text-primary">
                            <span className="flex place-center gap-1">
                              <span className="inline-block">🪙</span>
                              <span>Promo Cashback Coins</span>
                            </span>
                            <span className="font-black">
                              -₹{Math.min(user.walletPromoBalance || 0, getCartTotals().total * ((user.collegeSettings?.maxPromoDiscountPercent ?? 20.0) / 100)).toFixed(2)}
                            </span>
                          </div>
                          <div className="h-[1px] border-b border-dashed border-orange-100 my-2" />
                          <div className="flex justify-between place-center text-[10px] text-text-muted">
                            <span>Remaining Coins Balance</span>
                            <span>₹{(user.walletPromoBalance || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pricing receipt card */}
                    <div className="border border-edge/60 p-5 rounded-lg space-y-3.5 bg-surface-card shadow-sm">
                      <div className="flex place-center gap-1.5 border-b border-edge/60 pb-2.5 mb-1">
                        <span className="text-xs">🧾</span>
                        <h4 className="text-xs font-black text-secondary uppercase tracking-wider">Digital Receipt</h4>
                      </div>
                      
                      <div className="space-y-2 text-xs font-semibold text-text-muted">
                        <div className="flex justify-between place-center">
                          <span>Items Subtotal</span>
                          <span className="text-secondary font-semibold">₹{getCartTotals().subtotal}</span>
                        </div>
                        <div className="flex justify-between place-center">
                          <span>Delivery Charge</span>
                          <span className="text-secondary font-semibold">₹{getCartTotals().delivery}</span>
                        </div>
                        <div className="flex justify-between place-center">
                          <span>Kitchen Packaging Fee</span>
                          <span className="text-secondary font-semibold">₹{getCartTotals().packaging}</span>
                        </div>
                        <div className="flex justify-between place-center">
                          <span>GST & Taxes (5%)</span>
                          <span className="text-secondary font-semibold">₹{getCartTotals().tax}</span>
                        </div>
                        {promoApplied && (
                          <div className="flex justify-between place-center text-green-600 font-semibold bg-green-50 px-2 py-1 rounded border border-green-100">
                            <span>Voucher Savings</span>
                            <span>-₹{getCartTotals().discount}</span>
                          </div>
                        )}
                        <div className="h-[1px] border-b border-dashed border-edge/60 my-3" />
                        <div className="flex justify-between place-center text-sm font-semibold text-secondary">
                          <span>Total Amount Due</span>
                          <span className="text-primary text-lg font-black font-sans">₹{getCartTotals().total}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sticky checkout trigger */}
              {cart.items.length > 0 && (
                <div className="p-5 border-t border-edge bg-surface-card flex flex-col gap-2.5 shrink-0">
                  {cart.paymentMethod === 'WALLET' && user && (user.walletBalance || 0) < getCartTotals().total && (
                    <div className="bg-red-50 text-red-600 border border-red-100/60 p-3 rounded-lg flex items-start gap-2.5 text-[10px] font-semibold shadow-sm">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500 animate-pulse" />
                      <span>Insufficient Wallet balance. Needs ₹{getCartTotals().total.toFixed(2)} (Available: ₹{(user.walletBalance || 0).toFixed(2)}). Select COD/UPI payment.</span>
                    </div>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckout}
                    disabled={orderPlacing || !!(cart.paymentMethod === 'WALLET' && user && (user.walletBalance || 0) < getCartTotals().total)}
                    className="w-full bg-primary hover:bg-primary-hover disabled:bg-surface-dark disabled:text-text-muted text-white font-semibold py-4 rounded-lg transition-all flex place-center place-mid gap-2 text-sm border border-primary-hover shadow-sm cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <ShoppingCart size={16} />
                    <span>{orderPlacing ? 'Processing Securely...' : `Place Order (Pay: ₹${getCartTotals().total})`}</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Cart Button for Mobile/Desktop */}
      <AnimatePresence>
        {cart.items.length > 0 && !cartOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 bg-primary hover:bg-primary-hover text-white p-4 rounded-full shadow-lg flex place-center place-mid gap-2.5 font-semibold cursor-pointer transition-all border border-primary-hover focus:ring-2 focus:ring-primary/20 outline-none"
          >
            <div className="relative">
              <ShoppingCart size={20} />
              <span className="absolute -top-3 -right-3 bg-white text-primary text-[10px] w-5 h-5 rounded-full flex place-center place-mid font-semibold shadow-md border border-orange-100 animate-bounce">
                {cart.items.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </div>
            <span className="text-xs tracking-wide pr-1 font-semibold uppercase hidden sm:inline-block">Checkout Cart</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

