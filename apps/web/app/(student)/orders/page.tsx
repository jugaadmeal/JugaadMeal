'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch } from '../../../lib/api';
import { OrderDTO } from 'shared-types';
import { ShoppingBag, ChevronRight, Clock, MapPin, CheckCircle, HelpCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function OrdersHistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadOrders = async () => {
      setIsLoading(true);
      try {
        const data = await apiFetch('/api/orders');
        setOrders(data);
      } catch (err) {
        console.error('Failed to load orders history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-surface-dark rounded-xl w-1/3 skeleton-shimmer" />
        <div className="space-y-4">
          <div className="h-20 bg-surface-dark rounded-xl skeleton-shimmer" />
          <div className="h-20 bg-surface-dark rounded-xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const getStatusColor = (status: OrderDTO['status']) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600 bg-yellow-50/50 border-yellow-200';
      case 'CONFIRMED': return 'text-blue-600 bg-blue-50/50 border-blue-200';
      case 'PREPARING': return 'text-orange-600 bg-orange-50/50 border-orange-200 animate-pulse';
      case 'READY': return 'text-purple-600 bg-purple-50/50 border-purple-200';
      case 'OUT_FOR_DELIVERY': return 'text-indigo-600 bg-indigo-50/50 border-indigo-200 animate-bounce';
      case 'DELIVERED': return 'text-green-600 bg-green-50/50 border-green-200';
      case 'CANCELLED': return 'text-red-600 bg-red-50/50 border-red-200';
      default: return 'text-text-muted bg-surface-dark border-edge';
    }
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20"
    >
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-extrabold text-secondary tracking-tight">Order History</h1>
        <p className="text-sm text-text-muted">Track active orders or view past campus meals.</p>
      </motion.div>

      {orders.length > 0 ? (
        <motion.div variants={stagger} className="space-y-4">
          {orders.map((order) => (
            <motion.div key={order.id} variants={fadeUp}>
              <Link
                href={`/orders/${order.id}`}
                className="block bg-white border border-edge p-5 rounded-2xl shadow-sm hover-scale transition-all"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-secondary text-sm">#{order.orderNumber}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider backdrop-blur-sm ${getStatusColor(order.status)}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 text-xs text-text-muted font-medium">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {order.deliveryBlock.name} ({order.deliveryBlock.shortCode})
                      </span>
                    </div>

                    <p className="text-xs font-bold text-text-primary">
                      {order.items.map((i) => `${i.menuItem.name} (x${i.quantity})`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-edge">
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-[10px] text-text-muted uppercase font-bold leading-none">Total Amount</p>
                      <p className="text-base font-extrabold text-gradient-primary mt-1">₹{order.totalAmount}</p>
                    </div>
                    <ChevronRight size={18} className="text-text-muted shrink-0" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          variants={fadeUp}
          className="border border-dashed border-edge rounded-2xl p-16 text-center space-y-3 bg-white max-w-sm mx-auto"
        >
          <div className="w-12 h-12 bg-surface-dark rounded-xl flex items-center justify-center mx-auto text-text-muted">
            <ShoppingBag size={24} />
          </div>
          <h3 className="text-lg font-bold text-secondary">No orders yet</h3>
          <p className="text-xs text-text-muted">
            Hungry? Head over to the menu page and choose a delicious combo meal thali to order!
          </p>
          <Link
            href="/menu"
            className="inline-block bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all"
          >
            Browse Menu
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}
