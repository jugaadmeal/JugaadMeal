'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Step {
  targetId: string;
  title: string;
  description: string;
  fallbackText: string;
}

const steps: Step[] = [
  {
    targetId: 'tour-header',
    title: 'Welcome to Jugaadmeal! 🍽️',
    description: 'This is your campus dining dashboard. From here, you can track daily thalis, active order deliveries, and cast menu votes.',
    fallbackText: 'Welcome to Jugaadmeal! Manage all your daily meals, balances, and orders right here.',
  },
  {
    targetId: 'tour-wallet',
    title: 'Jugaadmeal Pay & Balance 🪙',
    description: 'Track your deposited cash and promo cashbacks. Tap to view ledger logs, claim coupons, and add funds instantly.',
    fallbackText: 'Check your digital cash balances, review card statements, and top-up secure funds.',
  },
  {
    targetId: 'tour-orders',
    title: 'Real-Time Order Tracking 📦',
    description: 'When you order combos or snacks, an active tracker card pops up here. Track preparation, packaging, and agent delivery status live.',
    fallbackText: 'Review ongoing kitchen orders, contact delivery agents, and track preparation status.',
  },
  {
    targetId: 'tour-menu',
    title: 'Daily Meal Choices 🍱',
    description: 'Browse today\'s breakfast, lunch, dinner, or snacks. Tap "Add" on any item to build your cart without leaving the page.',
    fallbackText: 'Explore today\'s thalis, combos, and items. Build your custom plate in seconds.',
  },
  {
    targetId: 'tour-poll',
    title: 'Decide Tomorrow\'s Lunch! 🗳️',
    description: 'Every evening, cast votes on competing lunch thalis. The winner combo gets prepared in the kitchen tomorrow. Your voice rules the menu!',
    fallbackText: 'Cast votes on menu proposals, track closed polls, and see what the kitchen will prepare.',
  },
];

export default function TourGuide() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Only run on client side and check if tour was completed
    const completed = localStorage.getItem('tour_completed');
    if (!completed) {
      // Trigger tour with a small delay so initial page animations complete
      const timer = setTimeout(() => {
        setActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const step = steps[currentStep];
    const el = document.getElementById(step.targetId);

    if (el) {
      // Smooth scroll target element into center of viewport
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight target element by applying custom classes
      el.classList.add(
        'ring-4',
        'ring-primary',
        'ring-offset-4',
        'dark:ring-offset-slate-900',
        'z-50',
        'relative',
        'transition-all',
        'duration-300'
      );
    }

    return () => {
      // Remove highlight classes on clean up
      if (el) {
        el.classList.remove(
          'ring-4',
          'ring-primary',
          'ring-offset-4',
          'dark:ring-offset-slate-900',
          'z-50',
          'relative'
        );
      }
    };
  }, [active, currentStep]);

  // Listen to profile custom event to replay the tour
  useEffect(() => {
    const handleReplayTour = () => {
      localStorage.removeItem('tour_completed');
      setCurrentStep(0);
      setActive(true);
    };

    window.addEventListener('replay-tour', handleReplayTour);
    return () => window.removeEventListener('replay-tour', handleReplayTour);
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tour_completed', 'true');
    setActive(false);
    
    // Trigger celebratory confetti burst!
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#FF6B30', '#F7C948', '#22C55E', '#1D2B4A'],
    });
  };

  const handleSkip = () => {
    localStorage.setItem('tour_completed', 'true');
    setActive(false);
  };

  if (!active) return null;

  const current = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Semi-transparent dark overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px]"
        />

        {/* Guided Tour Tooltip Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 180 }}
          className="relative z-50 w-full max-w-sm bg-white dark:bg-surface-card border border-edge dark:border-white/10 p-6 rounded-2xl shadow-2xl space-y-5 text-secondary dark:text-white"
        >
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Jugaadmeal Guide</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-text-muted hover:text-primary transition-colors p-1 hover:bg-surface-dark/50 rounded-lg"
              title="Close Tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body content */}
          <div className="space-y-2">
            <h3 className="text-lg font-black tracking-tight">{current.title}</h3>
            <p className="text-xs text-text-muted dark:text-gray-300 leading-relaxed font-semibold">
              {current.description}
            </p>
          </div>

          {/* Indicator & Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-edge dark:border-white/5">
            {/* Step indicators */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-5 bg-primary'
                      : 'w-1.5 bg-edge dark:bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="p-2 border border-edge dark:border-white/10 hover:bg-surface-dark/50 rounded-xl transition-all text-text-muted hover:text-text-primary"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1 shadow-md shadow-primary/10"
              >
                <span>{currentStep === steps.length - 1 ? 'Get Started! 🚀' : 'Next'}</span>
                {currentStep < steps.length - 1 && <ChevronRight size={14} />}
              </button>
            </div>
          </div>

          {/* Helper link */}
          <button
            onClick={handleSkip}
            className="w-full text-center text-[10px] text-text-muted hover:text-primary transition-colors font-bold uppercase tracking-wider block"
          >
            Skip Product Walkthrough
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
