'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/authStore';
import { Wallet, LogOut, Coffee, MapPin, User, BarChart2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../lib/context/ThemeContext';
import Logo from './Logo';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isAuthenticated || !user) {
    return (
      <>
        {/* Desktop Header */}
        <header className="sticky top-0 z-40 w-full glass-nav border-b border-white/20 shadow-sm hidden md:block animate-fade-in-down">
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient bg-200" />
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center group transition-all hover:scale-[1.02]">
              <Logo iconSize={42} />
            </Link>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="text-text-muted hover:text-primary transition-all p-2 rounded-xl hover:bg-surface-dark/50 hover:scale-105"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link
                href="/login"
                className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Log In
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile Sticky Header */}
        <header className="sticky top-0 z-40 w-full glass-nav border-b border-white/10 shadow-sm md:hidden animate-fade-in-down">
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient bg-200" />
          <div className="flex items-center justify-between h-14 px-4">
            <Link href="/" className="flex items-center group transition-all hover:scale-[1.02]">
              <Logo iconSize={28} />
            </Link>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleTheme}
                className="text-text-muted hover:text-primary transition-all p-2 rounded-xl hover:bg-surface-dark/50 hover:scale-105"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <Link
                href="/login"
                className="bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                Log In
              </Link>
            </div>
          </div>
        </header>
      </>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/home', label: 'Home', roles: ['STUDENT'] },
    { href: '/menu', label: 'Browse Menu', roles: ['STUDENT'] },
    { href: '/poll', label: 'Menu Polls', roles: ['STUDENT'] },
    { href: '/orders', label: 'My Orders', roles: ['STUDENT'] },
    { href: '/kitchen', label: 'Kitchen Board', roles: ['KITCHEN_STAFF', 'ADMIN'] },
    { href: '/deliveries', label: 'Deliveries', roles: ['DELIVERY_AGENT', 'ADMIN'] },
    { href: '/admin', label: 'Admin Panel', roles: ['ADMIN', 'SUPER_ADMIN'] },
  ];

  const filteredLinks = navLinks.filter((link) => link.roles.includes(user.role));

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 w-full glass-nav border-b border-white/20 shadow-sm hidden md:block animate-fade-in-down">
        {/* Gradient accent line at top */}
        <div className="h-[2px] w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient bg-200" />
        
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center group transition-all hover:scale-[1.02]">
            <Logo iconSize={42} />
          </Link>

          {/* Navigation links */}
          <nav className="flex space-x-1">
            {filteredLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-semibold text-sm transition-all relative px-4 py-2 rounded-lg ${
                    isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-dark/50'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-primary to-orange-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User context action details */}
          <div className="flex items-center space-x-4">
            {user.role === 'STUDENT' && (
              <Link
                href="/wallet"
                className="flex items-center space-x-2 bg-white/60 px-3.5 py-1.5 rounded-xl hover:bg-orange-50 hover:text-primary transition-all border border-edge/50 shadow-sm hover:shadow-md group"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                  <Wallet size={12} className="text-white" />
                </div>
                <span className="text-sm font-bold">₹{user.walletBalance?.toFixed(2) || '0.00'}</span>
              </Link>
            )}

            <NotificationCenter />

            <button
              onClick={toggleTheme}
              className="text-text-muted hover:text-primary transition-all p-2 rounded-xl hover:bg-surface-dark/50 hover:scale-105"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="flex items-center space-x-3 pl-3 border-l border-edge/50">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-primary/10"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-primary/10">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-bold text-text-primary leading-tight">{user.name}</p>
                <p className="text-xs text-text-muted leading-tight capitalize">{user.role.toLowerCase().replace(/_/g, ' ')}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-text-muted hover:text-red-500 transition-all p-2 rounded-xl hover:bg-red-50 hover:scale-105"
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-40 w-full glass-nav border-b border-white/10 shadow-sm md:hidden animate-fade-in-down">
        <div className="h-[2px] w-full bg-gradient-to-r from-primary via-accent to-primary animate-gradient bg-200" />
        
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link href="/home" className="flex items-center group transition-all hover:scale-[1.02]">
            <Logo iconSize={28} />
          </Link>

          {/* Quick Stats & Avatar */}
          <div className="flex items-center space-x-3">
            {user.role === 'STUDENT' && (
              <Link
                href="/wallet"
                className="flex items-center space-x-1 bg-white/60 px-2.5 py-1 rounded-xl border border-edge/50 shadow-sm hover:shadow-md transition-all text-[11px] font-extrabold text-secondary"
              >
                <Wallet size={11} className="text-primary" />
                <span>₹{user.walletBalance?.toFixed(0) || '0'}</span>
              </Link>
            )}
            
            <NotificationCenter />

            <button
              onClick={toggleTheme}
              className="text-text-muted hover:text-primary transition-all p-1.5 rounded-xl hover:bg-surface-dark/50 hover:scale-105"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            
            <Link href="/profile" className="block">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-white shadow ring-2 ring-primary/10"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center text-white font-extrabold text-[10px] shadow ring-2 ring-primary/10">
                  {user.name.charAt(0)}
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
