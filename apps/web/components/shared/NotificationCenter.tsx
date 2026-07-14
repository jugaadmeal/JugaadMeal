'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckSquare, Trash2, ShoppingBag, Vote, Coins, Flame, Info } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ORDERS' | 'POLLS' | 'WALLET'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch('/api/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Poll every 20 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getUnreadCount = () => {
    return notifications.filter((n) => !n.isRead).length;
  };

  const getFilteredNotifications = () => {
    return notifications.filter((n) => {
      if (filter === 'ALL') return true;
      if (filter === 'ORDERS') return n.type.startsWith('ORDER_');
      if (filter === 'POLLS') return n.type.startsWith('POLL_');
      if (filter === 'WALLET') return n.type === 'WALLET_CREDITED' || n.type === 'WALLET_DEBITED' || n.type === 'COUPON_UNLOCKED';
      return true;
    });
  };

  const getIcon = (type: string) => {
    if (type.startsWith('ORDER_')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-orange-50 text-primary flex items-center justify-center shrink-0">
          <ShoppingBag size={14} />
        </div>
      );
    }
    if (type.startsWith('POLL_')) {
      return (
        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <Vote size={14} />
        </div>
      );
    }
    if (type === 'WALLET_CREDITED' || type === 'WALLET_DEBITED' || type === 'COUPON_UNLOCKED') {
      return (
        <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
          <Coins size={14} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        <Info size={14} />
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-text-muted hover:text-primary transition-all p-2 rounded-xl hover:bg-surface-dark/50 hover:scale-105 cursor-pointer"
        title="Notifications Log"
      >
        <Bell size={18} />
        {getUnreadCount() > 0 && (
          <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center border border-white animate-pulse">
            {getUnreadCount()}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3.5 w-[330px] sm:w-[360px] bg-white border border-edge/70 rounded-3xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-surface/10">
              <div>
                <h4 className="text-xs font-black uppercase text-secondary tracking-wider">Notifications</h4>
                <p className="text-[9px] text-text-muted font-semibold">{getUnreadCount()} unread notifications</p>
              </div>
              {getUnreadCount() > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-primary hover:text-primary-hover font-black flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                >
                  <CheckSquare size={12} />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-100 bg-surface/5 px-2 py-1.5 gap-1">
              {(['ALL', 'ORDERS', 'POLLS', 'WALLET'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                    filter === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-secondary'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 scrollbar-none">
              {getFilteredNotifications().length === 0 ? (
                <div className="p-10 text-center text-text-muted space-y-2">
                  <span className="text-2xl">🔔</span>
                  <p className="text-[10px] font-bold">No notifications found here.</p>
                </div>
              ) : (
                getFilteredNotifications().map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 flex gap-3 transition-colors hover:bg-slate-50 relative group ${
                      !notif.isRead ? 'bg-orange-50/20' : ''
                    }`}
                  >
                    {getIcon(notif.type)}
                    <div className="space-y-0.5 min-w-0 flex-1 pr-4">
                      <h5 className="text-[11px] font-extrabold text-secondary leading-normal">{notif.title}</h5>
                      <p className="text-[10px] text-text-muted leading-relaxed font-medium">{notif.body}</p>
                      <p className="text-[8px] text-text-muted/70 font-semibold uppercase mt-0.5">
                        {new Date(notif.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="absolute right-2 top-3 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
