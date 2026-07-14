'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoIcon } from './Logo';

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing student sandbox...');

  useEffect(() => {
    // Check if app has already been loaded on this device
    const isLoaded = localStorage.getItem('app_loaded');
    if (isLoaded) {
      setShow(false);
      return;
    }

    // Progress charging timeline (highly optimized for instant opening)
    const duration = 300; 
    const intervalTime = 15;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            localStorage.setItem('app_loaded', 'true');
            setShow(false);
          }, 50); 
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Update status messages dynamically as progress increases
  useEffect(() => {
    if (progress < 25) {
      setStatusText('Initializing secure student sandbox...');
    } else if (progress < 50) {
      setStatusText('Loading campus coordinates...');
    } else if (progress < 75) {
      setStatusText('Synchronizing wallet credits...');
    } else if (progress < 95) {
      setStatusText('Hacking today\'s menu...');
    } else {
      setStatusText('Ready! 🚀');
    }
  }, [progress]);

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface dark:bg-surface-card transition-colors duration-300"
          >
            <div className="flex flex-col items-center max-w-sm px-6 text-center space-y-8 select-none">
              {/* Pulsing glowing brand logo */}
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                  filter: [
                    'drop-shadow(0 0 10px rgba(255, 107, 48, 0.15))',
                    'drop-shadow(0 0 25px rgba(255, 107, 48, 0.35))',
                    'drop-shadow(0 0 10px rgba(255, 107, 48, 0.15))',
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="bg-surface-dark dark:bg-surface/5 p-8 rounded-full border border-edge/30 dark:border-white/5 shadow-2xl flex items-center justify-center"
              >
                <LogoIcon size={80} />
              </motion.div>

              {/* Title & Slogan */}
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-secondary dark:text-white font-sans">
                  Jugaad<span className="text-primary">meal</span>
                </h1>
                <p className="text-xs uppercase tracking-widest text-text-muted/80 dark:text-gray-400 font-extrabold">
                  campus food, finally hacked
                </p>
              </div>

              {/* Progress bar container */}
              <div className="w-64 space-y-3 pt-4">
                <div className="h-1.5 w-full bg-edge dark:bg-border-warm/30 rounded-full overflow-hidden relative shadow-inner">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full shadow-md"
                    style={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
                
                {/* Dynamically updated status indicator */}
                <div className="flex justify-between items-center text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  <span className="animate-pulse">{statusText}</span>
                  <span className="text-secondary dark:text-white font-black">{Math.round(progress)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render children only when loading is done, or always under the overlay to pre-render the app */}
      {children}
    </>
  );
}
