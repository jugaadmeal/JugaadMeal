'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch, getSocket } from '../../../lib/api';
import { OrderDTO, PollDTO, MenuDTO } from 'shared-types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  DollarSign, ShoppingBag, Vote, Timer, Star, CheckCircle, HelpCircle, Loader2, 
  LayoutDashboard, Receipt, BookOpen, Ticket, Plus, Trash2, ShieldAlert, 
  TrendingUp, Printer, Check, UserCheck, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'menus' | 'vouchers' | 'polls'>('overview');
  
  // Data States
  const [metrics, setMetrics] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [activePoll, setActivePoll] = useState<PollDTO | null>(null);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [availableMenus, setAvailableMenus] = useState<MenuDTO[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [deliveryAgents, setDeliveryAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Poll creation state
  const [pollTitle, setPollTitle] = useState("What's for tomorrow's lunch? 🍽️");
  const [pollTargetDate, setPollTargetDate] = useState("");
  const [pollMealType, setPollMealType] = useState("LUNCH");
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Menu Creation state
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuDesc, setNewMenuDesc] = useState('');
  const [newMenuMealType, setNewMenuMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS'>('LUNCH');
  const [newMenuBasePrice, setNewMenuBasePrice] = useState('120');
  const [newMenuStudPrice, setNewMenuStudPrice] = useState('99');
  const [newMenuItems, setNewMenuItems] = useState<{ name: string; description: string; isVeg: boolean }[]>([
    { name: '', description: '', isVeg: true }
  ]);
  const [creatingMenu, setCreatingMenu] = useState(false);

  // Voucher Creation state
  const [newCode, setNewCode] = useState('');
  const [newVoucherDesc, setNewVoucherDesc] = useState('');
  const [newDiscType, setNewDiscType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [newDiscVal, setNewDiscVal] = useState('50');
  const [newMinOrder, setNewMinOrder] = useState('100');
  const [newMaxDisc, setNewMaxDisc] = useState('');
  const [newMaxUses, setNewMaxUses] = useState('');
  const [creatingVoucher, setCreatingVoucher] = useState(false);

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<any>(null);
  const [maxPromoCap, setMaxPromoCap] = useState('20');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const PIE_COLORS = ['#FF6B30', '#F7C948', '#22C55E', '#1D2B4A'];

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [met, charts, poll, menusData, ordersData, couponsData, agentsData, settingsData] = await Promise.all([
        apiFetch('/api/admin/analytics/overview'),
        apiFetch('/api/admin/analytics/charts'),
        apiFetch('/api/polls/active').catch(() => null),
        apiFetch('/api/menus'),
        apiFetch('/api/orders'),
        apiFetch('/api/coupons').catch(() => []),
        apiFetch('/api/users?role=DELIVERY_AGENT').catch(() => ({ users: [] })),
        apiFetch('/api/admin/analytics/settings').catch(() => null)
      ]);

      setMetrics(met);
      setChartData(charts);
      setActivePoll(poll);
      setAvailableMenus(menusData || []);
      setOrders(ordersData || []);
      setCoupons(couponsData || []);
      setDeliveryAgents(agentsData.users || []);
      setSettings(settingsData);
      
      if (settingsData) {
        setMaxPromoCap(settingsData.maxPromoDiscountPercent.toString());
      }

      if (menusData && menusData.length >= 4) {
        setSelectedMenus(menusData.slice(0, 4).map((m: any) => m.id));
      }
    } catch (err) {
      console.error('Failed to load admin workspace:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      router.push('/home');
      return;
    }

    loadAllAdminData();
  }, [isAuthenticated, user, router]);

  // Setup Socket.io for live order notifications & status changes
  useEffect(() => {
    const socket = getSocket();
    
    socket.emit('kitchen:subscribe'); // Subscribe to order feeds

    socket.on('kitchen:new_order', (data: { order: OrderDTO }) => {
      setOrders((prev) => [data.order, ...prev]);
      // Increment metric orders count
      setMetrics((prevMetrics: any) => {
        if (!prevMetrics) return null;
        return {
          ...prevMetrics,
          todayOrders: prevMetrics.todayOrders + 1,
          activeOrders: prevMetrics.activeOrders + 1,
        };
      });
    });

    socket.on('order:status_updated', (data: { orderId: string; status: string }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status as any } : o))
      );
      if (selectedOrder && selectedOrder.id === data.orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: data.status as any } : null);
      }
    });

    return () => {
      socket.off('kitchen:new_order');
      socket.off('order:status_updated');
    };
  }, [selectedOrder]);

  const handleFinalizePoll = async () => {
    if (!activePoll) return;
    setFinalizing(true);
    try {
      await apiFetch(`/api/polls/${activePoll.id}/finalize`, {
        method: 'POST',
      });
      alert(`Poll results finalized! Winner has been declared.`);
      loadAllAdminData();
    } catch (e) {
      alert('Failed to finalize poll.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMenus.length !== 4) {
      alert('Exactly 4 menus must be selected.');
      return;
    }

    setCreatingPoll(true);
    try {
      const targetDate = pollTargetDate ? new Date(pollTargetDate).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const payload = {
        title: pollTitle,
        description: 'Cast your daily vote on tomorrow\'s kitchen selection.',
        mealType: pollMealType,
        targetDate,
        menuIds: selectedMenus,
      };

      const response = await apiFetch('/api/polls', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert('Poll launched successfully!');
      setActivePoll(response);
    } catch (e) {
      alert('Failed to launch poll.');
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const emptyItems = newMenuItems.filter(i => !i.name.trim());
    if (emptyItems.length > 0) {
      alert('All menu items must have a name.');
      return;
    }

    setCreatingMenu(true);
    try {
      const payload = {
        name: newMenuName,
        description: newMenuDesc,
        mealType: newMenuMealType,
        basePrice: newMenuBasePrice,
        studentPrice: newMenuStudPrice,
        items: newMenuItems.map(i => ({
          name: i.name,
          description: i.description || 'Fresh ingredients',
          isVeg: i.isVeg,
        })),
      };

      await apiFetch('/api/menus', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert('Thali config added to library!');
      // Reset
      setNewMenuName('');
      setNewMenuDesc('');
      setNewMenuItems([{ name: '', description: '', isVeg: true }]);
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to create menu thali.');
    } finally {
      setCreatingMenu(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    setCreatingVoucher(true);
    try {
      const payload = {
        code: newCode,
        description: newVoucherDesc,
        discountType: newDiscType,
        discountValue: newDiscVal,
        minOrderValue: newMinOrder || '0',
        maxDiscount: newMaxDisc || null,
        maxUses: newMaxUses || null,
      };

      await apiFetch('/api/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert('Discount coupon deployed successfully!');
      setNewCode('');
      setNewVoucherDesc('');
      loadAllAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to deploy coupon.');
    } finally {
      setCreatingVoucher(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSettings(true);
    try {
      const response = await apiFetch('/api/admin/analytics/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          maxPromoDiscountPercent: parseFloat(maxPromoCap),
        }),
      });
      setSettings(response);
      alert('Global settings updated successfully!');
    } catch (err) {
      alert('Failed to update settings.');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const updateOrderStatusHandler = async (orderId: string, status: string) => {
    setUpdatingOrderStatus(status);
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      alert(`Order status updated to ${status}`);
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setUpdatingOrderStatus(null);
    }
  };

  const getOrderStatusBadge = (status: OrderDTO['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'CONFIRMED': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PREPARING': return 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse';
      case 'READY': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'OUT_FOR_DELIVERY': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DELIVERED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-zinc-50 text-zinc-700 border-zinc-200';
    }
  };

  if (isLoading || !metrics || !chartData) {
    return (
      <div className="space-y-6 animate-pulse max-w-7xl mx-auto p-8">
        <div className="h-10 bg-surface-dark rounded-xl w-1/4 skeleton-shimmer" />
        <div className="grid grid-cols-4 gap-6">
          <div className="h-28 bg-surface-dark rounded-xl skeleton-shimmer" />
          <div className="h-28 bg-surface-dark rounded-xl skeleton-shimmer" />
          <div className="h-28 bg-surface-dark rounded-xl skeleton-shimmer" />
          <div className="h-28 bg-surface-dark rounded-xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
      
      {/* Sidebar Workspace Navigation */}
      <div className="w-full md:w-64 shrink-0 space-y-2">
        <div className="p-4 bg-secondary border border-secondary-light rounded-lg text-white">
          <h2 className="text-base font-bold flex place-center gap-1.5 leading-none">
            <span>CampusEat Admin</span>
          </h2>
          <p className="text-[10px] text-orange-100 mt-1 uppercase tracking-wider font-semibold">Central Console</p>
        </div>

        <nav className="flex flex-row md:flex-col overflow-x-auto bg-surface-card border border-edge p-1.5 rounded-lg gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 md:flex-initial flex place-center place-mid md:justify-start gap-2.5 px-4 py-3 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'overview'
                ? 'bg-orange-50/75 text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
            }`}
          >
            <LayoutDashboard size={15} />
            <span className="hidden sm:inline">Overview</span>
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 md:flex-initial flex place-center place-mid md:justify-start gap-2.5 px-4 py-3 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'orders'
                ? 'bg-orange-50/75 text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
            }`}
          >
            <Receipt size={15} />
            <span className="hidden sm:inline">Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('menus')}
            className={`flex-1 md:flex-initial flex place-center place-mid md:justify-start gap-2.5 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'menus'
                ? 'bg-orange-50/75 text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
            }`}
          >
            <BookOpen size={15} />
            <span className="hidden sm:inline">Menu Library</span>
          </button>

          <button
            onClick={() => setActiveTab('vouchers')}
            className={`flex-1 md:flex-initial flex place-center place-mid md:justify-start gap-2.5 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'vouchers'
                ? 'bg-orange-50/75 text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
            }`}
          >
            <Ticket size={15} />
            <span className="hidden sm:inline">Vouchers</span>
          </button>

          <button
            onClick={() => setActiveTab('polls')}
            className={`flex-1 md:flex-initial flex place-center place-mid md:justify-start gap-2.5 px-4 py-3 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'polls'
                ? 'bg-orange-50/75 text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-surface/50'
            }`}
          >
            <Vote size={15} />
            <span className="hidden sm:inline">Poll Config</span>
          </button>
        </nav>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 min-w-0">
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-bold text-secondary tracking-tight">Console Overview</h1>
              <p className="text-xs text-text-muted">Live metrics, hourly orders, and volume trends.</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-edge p-4 rounded-xl shadow-sm space-y-2.5">
                <div className="flex justify-between place-center text-text-muted">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Orders Today</span>
                  <ShoppingBag size={14} className="text-primary" />
                </div>
                <h3 className="text-lg font-bold text-secondary leading-none">{metrics.todayOrders}</h3>
              </div>

              <div className="bg-white border border-edge p-4 rounded-xl shadow-sm space-y-2.5">
                <div className="flex justify-between place-center text-text-muted">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Gross Revenue</span>
                  <DollarSign size={14} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-secondary leading-none">₹{metrics.todayRevenue}</h3>
              </div>

              <div className="bg-white border border-edge p-4 rounded-xl shadow-sm space-y-2.5">
                <div className="flex justify-between place-center text-text-muted">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Active Cooks</span>
                  <Timer size={14} className="text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-secondary leading-none">{metrics.activeOrders}</h3>
              </div>

              <div className="bg-white border border-edge p-4 rounded-xl shadow-sm space-y-2.5">
                <div className="flex justify-between place-center text-text-muted">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Poll Voted %</span>
                  <Vote size={14} className="text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-secondary leading-none">{metrics.pollParticipationRate}%</h3>
              </div>

              <div className="bg-white border border-edge p-4 rounded-xl shadow-sm space-y-2.5 col-span-2 md:col-span-1">
                <div className="flex justify-between place-center text-text-muted">
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Avg Transit</span>
                  <span className="text-xs">🚴</span>
                </div>
                <h3 className="text-lg font-bold text-secondary leading-none">{metrics.averageDeliveryTime} mins</h3>
              </div>
            </div>
                      {/* Graphs Grid */}
            <div className={"grid md:grid-cols-" + "3 gap-6"}>
              <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4 md:col-span-2">
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Hourly order influx</h3>
                <div className="h-64 text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.hourlyOrders}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F4F3EF" />
                      <XAxis dataKey="hour" stroke="#6B6B63" />
                      <YAxis stroke="#6B6B63" />
                      <Tooltip />
                      <Line type="monotone" dataKey="orders" stroke="#FF6B30" strokeWidth={2.5} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4 relative">
                <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">Meal Volume</h3>
                <div className="h-64 flex place-center place-mid text-[10px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.mealBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.mealBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col place-center">
                    <span className="text-[9px] text-text-muted font-semibold uppercase leading-none">Primary</span>
                    <span className="text-base font-semibold text-secondary mt-1 leading-none">Lunch</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Order Activity Feed */}
            <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4">
              <div className="flex justify-between place-center">
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Live order activity stream</h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
              <div className="divide-y divide-edge max-h-72 overflow-y-auto pr-1">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="py-3 flex justify-between place-center text-xs font-semibold">
                    <div className="space-y-1">
                      <p className="text-secondary font-semibold">Order #{o.orderNumber}</p>
                      <p className="text-[10px] text-text-muted">
                        Placed by <span className="font-semibold">{o.user?.name}</span> • {o.deliveryBlock.name} ({o.deliveryBlock.shortCode})
                      </p>
                    </div>
                    <div className="flex place-center gap-3">
                      <span className="font-semibold text-secondary">₹{o.totalAmount}</span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border uppercase ${getOrderStatusBadge(o.status)}`}>
                        {o.status.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="align-mid py-6 text-xs text-text-muted font-semibold">No orders placed today yet.</p>
                )}
              </div>
            </div>

            {/* Global Settings Panel */}
            <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">🔧 Global Platform Settings</h3>
                <p className="text-[10px] text-text-muted">Control burn rates, margins, and operational parameters dynamically.</p>
              </div>
              <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs font-semibold max-w-sm">
                <div className="space-y-1.5">
                  <label className="text-text-muted">Max Promo Coins Cap (% of Order Total)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={maxPromoCap}
                      onChange={(e) => setMaxPromoCap(e.target.value)}
                      className="border border-edge px-3.5 py-2 rounded-xl outline-none focus:border-primary text-xs font-semibold text-secondary w-28 bg-surface/30"
                    />
                    <button
                      type="submit"
                      disabled={updatingSettings}
                      className="bg-secondary hover:bg-secondary-light text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex place-center place-mid gap-1.5"
                    >
                      {updatingSettings && <Loader2 size={12} className="animate-spin" />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                  <p className="text-[9px] text-text-muted">
                    Defines the maximum percentage of any order that a student can cover using review cashback coins (e.g. 20%).
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ORDERS MANAGER */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-bold text-secondary tracking-tight">Orders Manager</h1>
              <p className="text-xs text-text-muted">Real-time status updates and delivery agent tracking.</p>
            </div>

            <div className="bg-surface-card border border-edge rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto show-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-edge bg-surface-dark/40 text-[10px] uppercase text-text-muted font-semibold">
                      <th className="p-4">Order Info</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Delivery To</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 align-mid">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge text-xs font-semibold">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-surface-dark/10 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-secondary">#{o.orderNumber}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-secondary font-semibold">{o.user?.name}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{o.user?.phone}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-secondary font-semibold">{o.deliveryBlock.shortCode}</p>
                          <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[120px]">{o.deliveryAddress}</p>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase ${getOrderStatusBadge(o.status)}`}>
                            {o.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-right font-semibold text-secondary">
                          ₹{o.totalAmount}
                        </td>
                        <td className="p-4 align-mid">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="bg-orange-50 hover:bg-primary hover:text-white border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all shadow-sm flex place-center place-mid gap-1 mx-auto"
                          >
                            <Eye size={12} />
                            <span>Manage</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="align-mid p-8 text-xs text-text-muted font-semibold">
                          No orders in records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MENU LIBRARY */}
        {activeTab === 'menus' && (
          <div className={"grid md:grid-cols-" + "3 gap-6 items-start"}>
            
            {/* Create Thali Form */}
            <div className="bg-surface-card border border-edge p-6 rounded-lg shadow-sm space-y-4 md:col-span-1">
              <h3 className="text-sm font-bold text-secondary">Add new thali combo</h3>
              <p className="text-[10px] text-text-muted">Configure a fresh thali menu choice.</p>

              <form onSubmit={handleCreateMenu} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-text-muted">Thali Combo Name</label>
                  <input
                    type="text"
                    required
                    value={newMenuName}
                    onChange={(e) => setNewMenuName(e.target.value)}
                    placeholder="e.g. Deluxe Paneer Thali"
                    className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-muted">Description</label>
                  <textarea
                    required
                    value={newMenuDesc}
                    onChange={(e) => setNewMenuDesc(e.target.value)}
                    placeholder="Briefly details the items included..."
                    className="w-full border border-edge px-3.5 py-2 rounded-xl outline-none focus:border-primary text-xs h-16 resize-none"
                  />
                </div>

                <div className={"grid grid-cols-" + "3 gap-3"}>
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-text-muted">Meal Type</label>
                    <select
                      value={newMenuMealType}
                      onChange={(e) => setNewMenuMealType(e.target.value as any)}
                      className="w-full border border-edge px-2 py-2.5 rounded-lg bg-surface-card outline-none focus:ring-2 focus:ring-primary/20 text-xs text-secondary"
                    >
                      <option value="LUNCH">Lunch</option>
                      <option value="DINNER">Dinner</option>
                      <option value="BREAKFAST">Breakfast</option>
                      <option value="SNACKS">Snacks</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-text-muted">Base price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newMenuBasePrice}
                      onChange={(e) => setNewMenuBasePrice(e.target.value)}
                      className="w-full border border-edge px-2.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs font-semibold text-secondary"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-text-muted">Student price (₹)</label>
                    <input
                      type="number"
                      required
                      value={newMenuStudPrice}
                      onChange={(e) => setNewMenuStudPrice(e.target.value)}
                      className="w-full border border-edge px-2.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs font-semibold text-gradient-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between place-center">
                    <label className="text-text-muted">Include Combos Items ({newMenuItems.length})</label>
                    <button
                      type="button"
                      onClick={() => setNewMenuItems([...newMenuItems, { name: '', description: '', isVeg: true }])}
                      className="text-[10px] text-primary hover:underline flex place-center gap-0.5"
                    >
                      <Plus size={10} /> Add item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {newMenuItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 place-center bg-surface-dark/40 p-2 rounded-lg border border-edge/60 relative">
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            placeholder="Item Name (e.g. Roti)"
                            value={item.name}
                            onChange={(e) => {
                              const list = [...newMenuItems];
                              list[idx].name = e.target.value;
                              setNewMenuItems(list);
                            }}
                            className="w-full border border-edge px-2 py-1 rounded bg-white text-[10px]"
                          />
                        </div>
                        <select
                          value={item.isVeg ? 'VEG' : 'NONVEG'}
                          onChange={(e) => {
                            const list = [...newMenuItems];
                            list[idx].isVeg = e.target.value === 'VEG';
                            setNewMenuItems(list);
                          }}
                          className="border border-edge px-1.5 py-1 rounded bg-white text-[9px] font-semibold"
                        >
                          <option value="VEG">Veg</option>
                          <option value="NONVEG">Non-Veg</option>
                        </select>
                        {newMenuItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const list = [...newMenuItems];
                              list.splice(idx, 1);
                              setNewMenuItems(list);
                            }}
                            className="text-red-500 hover:text-red-700 shrink-0 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingMenu}
                  className="w-full bg-secondary hover:bg-secondary-light text-white text-xs font-semibold py-3 rounded-xl transition-all shadow-md flex place-center place-mid gap-1.5"
                >
                  {creatingMenu && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Config to Library</span>
                </button>
              </form>
            </div>

            {/* Thali config listing library */}
            <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4 md:col-span-2">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Scheduled library thalis</h3>
              <div className="grid sm:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
                {availableMenus.map((menu) => (
                  <div key={menu.id} className="border border-edge rounded-md p-4 space-y-3 bg-surface-dark">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="font-bold text-secondary text-sm flex place-center gap-1.5">
                          {menu.name}
                          <span className="text-[8px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold uppercase">VEG</span>
                        </h4>
                        <p className="text-[10px] text-text-muted mt-1 leading-tight">{menu.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[8px] bg-orange-100 text-primary px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider leading-none">
                          {menu.mealType}
                        </span>
                        <p className="text-xs font-semibold text-secondary mt-1">₹{menu.studentPrice}</p>
                      </div>
                    </div>

                    <div className="border-t border-edge/60 pt-2.5 space-y-1">
                      <p className="text-[9px] text-text-muted font-semibold uppercase tracking-wider">Combos List:</p>
                      <div className="flex flex-wrap gap-1">
                        {menu.items.map((it) => (
                          <span key={it.id} className="text-[9px] bg-white border border-edge/80 text-secondary px-2 py-0.5 rounded-md font-semibold">
                            {it.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VOUCHERS MANAGER */}
        {activeTab === 'vouchers' && (
          <div className={"grid md:grid-cols-" + "3 gap-6 items-start"}>
            
            {/* Deploy voucher form */}
            <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4 md:col-span-1">
              <div>
                <h3 className="text-sm font-bold text-secondary">Deploy new voucher</h3>
                <p className="text-[10px] text-text-muted">Launch discount promo campaigns.</p>
              </div>

              <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-text-muted">Promo Code</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. STUDENT20"
                    className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs uppercase font-semibold tracking-wider text-secondary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-text-muted">Campaign Description</label>
                  <input
                    type="text"
                    required
                    value={newVoucherDesc}
                    onChange={(e) => setNewVoucherDesc(e.target.value)}
                    placeholder="e.g. ₹50 flat off on first order"
                    className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-text-muted">Discount Type</label>
                    <select
                      value={newDiscType}
                      onChange={(e) => setNewDiscType(e.target.value as any)}
                      className="w-full border border-edge px-3 py-2.5 rounded-xl bg-white outline-none focus:border-primary text-xs"
                    >
                      <option value="FLAT">Flat Price Off</option>
                      <option value="PERCENTAGE">Percentage Off</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-text-muted">Discount Value</label>
                    <input
                      type="number"
                      required
                      value={newDiscVal}
                      onChange={(e) => setNewDiscVal(e.target.value)}
                      className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs font-semibold text-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-text-muted">Min Basket value (₹)</label>
                    <input
                      type="number"
                      required
                      value={newMinOrder}
                      onChange={(e) => setNewMinOrder(e.target.value)}
                      className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-text-muted">Max Uses (optional)</label>
                    <input
                      type="number"
                      value={newMaxUses}
                      onChange={(e) => setNewMaxUses(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingVoucher}
                  className="w-full bg-secondary hover:bg-secondary-light text-white text-xs font-semibold py-3 rounded-xl transition-all shadow-md flex place-center place-mid gap-1.5"
                >
                  {creatingVoucher && <Loader2 size={14} className="animate-spin" />}
                  <span>Deploy Voucher Live</span>
                </button>
              </form>
            </div>

            {/* Voucher listings */}
            <div className="bg-surface-card border border-edge p-5 rounded-lg shadow-sm space-y-4 md:col-span-2">
              <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">Active promo campaigns</h3>
              <div className="grid sm:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-1">
                {coupons.map((c) => (
                  <div key={c.id} className="border border-edge border-dashed rounded-lg p-4 bg-orange-50/20 relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="bg-primary text-white text-xs px-3 py-1 rounded-md font-semibold uppercase tracking-widest border border-primary-hover shadow-sm">
                          {c.code}
                        </span>
                        <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold uppercase">Active</span>
                      </div>
                      <p className="text-xs font-semibold text-secondary mt-1">{c.description}</p>
                      <p className="text-[10px] text-text-muted leading-tight">
                        Valid for Min Order: ₹{c.minOrderValue} • Discount type: {c.discountType}
                      </p>
                    </div>

                    <div className="border-t border-edge/60 pt-2.5 mt-3 text-[10px] text-text-muted flex justify-between place-center">
                      <span>Used: <strong className="text-secondary">{c.usedCount} times</strong></span>
                      <span>Expiry: {new Date(c.validUntil).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {coupons.length === 0 && (
                  <p className="align-mid py-6 text-xs text-text-muted font-semibold col-span-2">No discount vouchers launched.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* POLLS MANAGER */}
        {activeTab === 'polls' && (
          <div className="grid md:grid-cols-2 gap-6 items-start">
            
            {/* Active Poll monitor */}
            <div className="bg-surface-card border border-edge p-6 rounded-lg shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-secondary">Active poll monitor</h3>
              
              {activePoll ? (
                <div className="space-y-4">
                  <div className="bg-surface-dark p-4 rounded-lg border border-edge space-y-2 text-xs font-semibold">
                    <h4 className="text-secondary font-bold">{activePoll.title}</h4>
                    <p className="text-text-muted leading-tight">Meal Category: {activePoll.mealType} | Status: <strong className="text-primary capitalize">{activePoll.status.toLowerCase()}</strong></p>
                    <p className="text-text-muted mt-1 leading-none">Votes Registered: {activePoll.totalVotes}</p>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider pl-0.5">Live Breakdown</p>
                    {activePoll.options.map((opt) => (
                      <div key={opt.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-secondary truncate max-w-[200px]">{opt.menu.name}</span>
                          <span className="text-text-muted">{opt.voteCount} votes ({opt.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-surface-dark h-2 rounded-full overflow-hidden border border-edge/50">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${opt.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {activePoll.status === 'OPEN' && (
                    <button
                      onClick={handleFinalizePoll}
                      disabled={finalizing}
                      className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-md flex place-center place-mid gap-1.5 mt-2"
                    >
                      {finalizing && <Loader2 size={14} className="animate-spin" />}
                      <span>Finalize & Declare Winner thali</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="align-mid p-6 bg-surface-dark/40 border border-edge rounded-lg">
                  <p className="text-xs text-text-muted font-semibold">No active voting poll running. Schedule one below!</p>
                </div>
              )}
            </div>

            {/* Launch Poll form */}
            <div className="bg-surface-card border border-edge p-6 rounded-lg shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-secondary">Launch menu poll</h3>
              <form onSubmit={handleCreatePoll} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-text-muted">Poll Question Title</label>
                  <input
                    type="text"
                    required
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    className="w-full border border-edge px-3.5 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-xs text-secondary bg-surface-dark"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-text-muted">Meal Category</label>
                    <select
                      value={pollMealType}
                      onChange={(e) => setPollMealType(e.target.value)}
                      className="w-full border border-edge px-3.5 py-2.5 rounded-lg bg-surface-card outline-none focus:ring-2 focus:ring-primary/20 text-xs font-semibold text-secondary"
                    >
                      <option value="LUNCH">Lunch Menu</option>
                      <option value="DINNER">Dinner Menu</option>
                      <option value="BREAKFAST">Breakfast Menu</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-text-muted">Target meal Date</label>
                    <input
                      type="date"
                      value={pollTargetDate}
                      onChange={(e) => setPollTargetDate(e.target.value)}
                      className="w-full border border-edge px-3.5 py-2.5 rounded-lg bg-surface-card outline-none focus:ring-2 focus:ring-primary/20 text-xs font-semibold text-secondary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-text-muted">Select Exactly 4 Thali options from library</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <select
                        key={idx}
                        required
                        value={selectedMenus[idx] || ''}
                        onChange={(e) => {
                          const newSelected = [...selectedMenus];
                          newSelected[idx] = e.target.value;
                          setSelectedMenus(newSelected);
                        }}
                        className="w-full border border-edge px-2.5 py-2 rounded-lg bg-surface-card outline-none focus:ring-2 focus:ring-primary/20 text-[10px] font-semibold text-secondary"
                      >
                        <option value="">Choose thali option</option>
                        {availableMenus.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingPoll || selectedMenus.length < 4}
                  className="w-full bg-secondary hover:bg-secondary-light text-white text-xs font-semibold py-2.5 rounded-lg border border-secondary-light shadow-sm transition-all flex place-center place-mid gap-1.5 cursor-pointer focus:ring-2 focus:ring-secondary/20 outline-none"
                >
                  {creatingPoll && <Loader2 size={14} className="animate-spin" />}
                  <span>Launch Live Poll Now</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER / POPUP POPUP FOR ORDER EDIT */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-surface-card h-screen shadow-lg flex flex-col justify-between border-l border-edge"
            >
              {/* Header */}
              <div className="p-4 border-b border-edge flex justify-between place-center bg-surface-dark/40">
                <div className="flex place-center gap-2">
                  <Receipt size={18} className="text-primary" />
                  <div>
                    <h3 className="font-bold text-secondary text-sm">Order Control</h3>
                    <p className="text-[10px] text-text-muted">Manage status & dispatch</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-text-muted hover:text-text-primary p-2 text-xs font-semibold"
                >
                  Close
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs font-semibold">
                
                {/* Details summary */}
                <div className="border border-edge/60 p-4 rounded-xl space-y-3 bg-surface/30">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Order Number</span>
                    <span className="text-secondary font-semibold">#{selectedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Payment status</span>
                    <span className="text-secondary font-semibold uppercase">{selectedOrder.paymentStatus} ({selectedOrder.paymentMethod})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total Amount Paid</span>
                    <span className="text-secondary font-semibold">₹{selectedOrder.totalAmount}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-text-muted">Drop location</span>
                    <span className="text-secondary font-semibold text-right">
                      {selectedOrder.deliveryBlock.name} ({selectedOrder.deliveryBlock.shortCode})<br />
                      <span className="text-[10px] text-text-muted">{selectedOrder.deliveryAddress}</span>
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Thali Combos Items Included</p>
                  <div className="space-y-1.5">
                    {selectedOrder.items.map((it) => (
                      <div key={it.id} className="flex justify-between place-center bg-white border border-edge/60 p-2.5 rounded-lg">
                        <span className="text-secondary font-semibold">{it.menuItem.name}</span>
                        <span className="text-text-muted">Qty: {it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Change Status Workflow */}
                <div className="space-y-3 border border-edge/60 p-4 rounded-xl bg-surface/30">
                  <h4 className="text-xs font-bold text-secondary uppercase tracking-wider pl-0.5">Control Status workflow</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                    <button
                      onClick={() => updateOrderStatusHandler(selectedOrder.id, 'PREPARING')}
                      disabled={updatingOrderStatus === 'PREPARING' || selectedOrder.status === 'PREPARING'}
                      className="bg-white hover:bg-orange-50/50 border border-edge text-secondary p-2.5 rounded-xl transition-all shadow-sm flex place-center place-mid gap-1.5"
                    >
                      <Timer size={12} className="text-orange-500" />
                      <span>Start Preparing</span>
                    </button>

                    <button
                      onClick={() => updateOrderStatusHandler(selectedOrder.id, 'READY')}
                      disabled={updatingOrderStatus === 'READY' || selectedOrder.status === 'READY'}
                      className="bg-white hover:bg-purple-50/50 border border-edge text-secondary p-2.5 rounded-xl transition-all shadow-sm flex place-center place-mid gap-1.5"
                    >
                      <CheckCircle size={12} className="text-purple-500" />
                      <span>Mark Ready</span>
                    </button>

                    <button
                      onClick={() => updateOrderStatusHandler(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                      disabled={updatingOrderStatus === 'OUT_FOR_DELIVERY' || selectedOrder.status === 'OUT_FOR_DELIVERY'}
                      className="bg-white hover:bg-indigo-50/50 border border-edge text-secondary p-2.5 rounded-xl transition-all shadow-sm flex place-center place-mid gap-1.5"
                    >
                      <UserCheck size={12} className="text-indigo-500" />
                      <span>Out for Delivery</span>
                    </button>

                    <button
                      onClick={() => updateOrderStatusHandler(selectedOrder.id, 'DELIVERED')}
                      disabled={updatingOrderStatus === 'DELIVERED' || selectedOrder.status === 'DELIVERED'}
                      className="bg-white hover:bg-green-50/50 border border-edge text-secondary p-2.5 rounded-xl transition-all shadow-sm flex place-center place-mid gap-1.5"
                    >
                      <Check size={12} className="text-green-500" />
                      <span>Mark Delivered</span>
                    </button>
                  </div>
                </div>

                {/* Print Receipt / Slip */}
                <button
                  onClick={() => window.print()}
                  className="w-full bg-white hover:bg-surface-dark border border-edge text-secondary p-3 rounded-xl transition-all shadow-sm flex place-center place-mid gap-2 font-semibold"
                >
                  <Printer size={15} />
                  <span>Print Kitchen KOT Slip</span>
                </button>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
