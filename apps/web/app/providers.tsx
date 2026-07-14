'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../lib/context/ThemeContext';
import { ToastProvider } from '../lib/context/ToastContext';
import SplashScreen from '../components/shared/SplashScreen';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes default cache stale time
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Register PWA Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('[PWA SW] Registered scope:', reg.scope))
          .catch((err) => console.error('[PWA SW] Registration failed:', err));
      });
    }

    // 2. Capture Install Prompt Trigger
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
        <SplashScreen>
          {children}
          
          {/* PWA Install Banner overlay */}
          {deferredPrompt && (
            <div className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-6 z-50 bg-gradient-to-r from-primary to-orange-500 text-white p-4.5 rounded-3xl shadow-xl flex items-center justify-between gap-4 max-w-sm border border-white/20 animate-bounce-slow">
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider">Install CampusEat 📱</h4>
                <p className="text-[10px] opacity-90 font-bold">Add to home screen for offline menu orders.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeferredPrompt(null)}
                  className="text-[10px] font-black border border-white/30 px-3 py-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  Later
                </button>
                <button
                  onClick={async () => {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('[PWA] Install user choice outcome:', outcome);
                    setDeferredPrompt(null);
                  }}
                  className="text-[10px] font-black bg-white text-primary px-3.5 py-1.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  Install
                </button>
              </div>
            </div>
          )}
        </SplashScreen>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
