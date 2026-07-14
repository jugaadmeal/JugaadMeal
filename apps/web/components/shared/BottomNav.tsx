'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/authStore';
import { Home, Compass, BarChart3, ShoppingBag, User2, ChefHat, Bike, Shield } from 'lucide-react';

export default function BottomNav() {
  const { user, isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!isAuthenticated || !user) return null;

  let links: { href: string; label: string; icon: any }[] = [];

  if (user.role === 'STUDENT') {
    links = [
      { href: '/home', label: 'Home', icon: Home },
      { href: '/menu', label: 'Menu', icon: Compass },
      { href: '/poll', label: 'Poll', icon: BarChart3 },
      { href: '/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/profile', label: 'Profile', icon: User2 },
    ];
  } else if (user.role === 'KITCHEN_STAFF') {
    links = [
      { href: '/kitchen', label: 'Kanban', icon: ChefHat },
      { href: '/profile', label: 'Profile', icon: User2 },
    ];
  } else if (user.role === 'DELIVERY_AGENT') {
    links = [
      { href: '/deliveries', label: 'Assigned', icon: Bike },
      { href: '/profile', label: 'Profile', icon: User2 },
    ];
  } else {
    // Admin
    links = [
      { href: '/admin', label: 'Dashboard', icon: Shield },
      { href: '/kitchen', label: 'Kitchen', icon: ChefHat },
      { href: '/deliveries', label: 'Deliveries', icon: Bike },
      { href: '/profile', label: 'Profile', icon: User2 },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-white/20 shadow-lg md:hidden">
      {/* Gradient accent line at top */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="flex justify-around items-center h-16 px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {/* Active pill indicator */}
              {isActive && (
                <span className="absolute top-1.5 w-10 h-1 bg-gradient-to-r from-primary to-orange-400 rounded-full" />
              )}
              
              <div className={`relative p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-primary/8' : ''
              }`}>
                <Icon
                  size={20}
                  className={`transition-all ${
                    isActive ? 'stroke-[2.5px] scale-110' : 'stroke-[1.8px]'
                  }`}
                />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight transition-all ${
                isActive ? 'font-extrabold' : 'font-bold'
              }`}>
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
