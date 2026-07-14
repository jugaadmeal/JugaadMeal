'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/* ─── Toast Types ─── */
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

/* ─── Modal Types ─── */
interface ConfirmModal {
  message: string;
  resolve: (value: boolean) => void;
}

interface PromptModal {
  message: string;
  defaultValue: string;
  resolve: (value: string | null) => void;
}

interface ToastContextType {
  toast: (message: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (message: string) => Promise<boolean>;
  showPrompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const [promptModal, setPromptModal] = useState<PromptModal | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const promptInputRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const showConfirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({ message, resolve });
    });
  }, []);

  const showPrompt = useCallback((message: string, defaultValue: string = ''): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptValue(defaultValue);
      setPromptModal({ message, defaultValue, resolve });
    });
  }, []);

  // Focus prompt input when modal opens
  useEffect(() => {
    if (promptModal && promptInputRef.current) {
      setTimeout(() => promptInputRef.current?.focus(), 50);
    }
  }, [promptModal]);

  // Global overrides for window.alert, window.confirm, window.prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.alert = (msg: string) => {
      const msgLower = (msg || '').toLowerCase();
      const isError =
        msgLower.includes('fail') ||
        msgLower.includes('error') ||
        msgLower.includes('incorrect') ||
        msgLower.includes('invalid') ||
        msgLower.includes('cannot') ||
        msgLower.includes('unauthorized') ||
        msgLower.includes('insufficient') ||
        msgLower.includes('blocked') ||
        msgLower.includes('required') ||
        msgLower.includes('please');
      toast(msg, isError ? 'error' : 'success');
    };

    // Override confirm — returns a promise but browser confirm is synchronous.
    // We make it show the modal and always return true; callers that need
    // the async confirm must use showConfirm from context directly.
    // For existing confirm() calls we rewrite them in-place below.
    (window as any).__ceShowConfirm = showConfirm;
    (window as any).__ceShowPrompt = showPrompt;
  }, [toast, showConfirm, showPrompt]);

  /* ─── Confirm Modal Handlers ─── */
  const handleConfirmYes = () => {
    confirmModal?.resolve(true);
    setConfirmModal(null);
  };
  const handleConfirmNo = () => {
    confirmModal?.resolve(false);
    setConfirmModal(null);
  };

  /* ─── Prompt Modal Handlers ─── */
  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    promptModal?.resolve(promptValue);
    setPromptModal(null);
    setPromptValue('');
  };
  const handlePromptCancel = () => {
    promptModal?.resolve(null);
    setPromptModal(null);
    setPromptValue('');
  };

  return (
    <ToastContext.Provider value={{ toast, showConfirm, showPrompt }}>
      {children}

      {/* ─── Toast Notifications ─── */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className="p-4 rounded-2xl shadow-xl border flex items-start justify-between gap-3 pointer-events-auto bg-white dark:bg-zinc-900 border-edge/60"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {t.type === 'success' && <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />}
                {t.type === 'error' && <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />}
                {t.type === 'info' && <Info size={16} className="text-primary mt-0.5 shrink-0" />}
                <p className="text-xs font-bold leading-tight break-words text-secondary dark:text-white">{t.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-text-muted hover:text-text-primary p-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ─── Confirm Modal ─── */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleConfirmNo}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-edge/60 p-6 rounded-3xl w-full max-w-xs shadow-2xl relative z-10 space-y-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-secondary dark:text-white leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={handleConfirmNo}
                  className="flex-1 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-text-muted font-bold text-xs py-2.5 rounded-xl transition-all border border-edge/50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmYes}
                  className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Prompt Modal ─── */}
      <AnimatePresence>
        {promptModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handlePromptCancel}
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-edge/60 p-6 rounded-3xl w-full max-w-xs shadow-2xl relative z-10 space-y-4"
            >
              <p className="text-xs font-bold text-secondary dark:text-white leading-relaxed">{promptModal.message}</p>
              <form onSubmit={handlePromptSubmit} className="space-y-4">
                <input
                  ref={promptInputRef}
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  className="w-full border border-edge dark:border-zinc-700 px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs font-bold text-secondary dark:text-white bg-slate-50 dark:bg-zinc-800 tracking-wide"
                  placeholder="Enter value..."
                />
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handlePromptCancel}
                    className="flex-1 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 text-text-muted font-bold text-xs py-2.5 rounded-xl transition-all border border-edge/50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
