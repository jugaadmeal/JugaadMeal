'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch } from '../../../lib/api';
import { ArrowRight, Mail, Phone, Lock, Sparkles, AlertCircle, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo, { LogoIcon } from '../../../components/shared/Logo';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();

  const [inputVal, setInputVal] = useState('');
  const [isEmail, setIsEmail] = useState(true);
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [otpVal, setOtpVal] = useState<string[]>(Array(6).fill(''));
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null);

  const otpRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/home');
    }
  }, [isAuthenticated, router]);

  // Request OTP trigger
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal) return;

    setErrorMsg('');
    setIsLoading(true);

    try {
      const email = isEmail ? inputVal : null;
      const phone = !isEmail ? inputVal : null;

      const response = await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, phone }),
      });

      setOtpExpiry(response.expiresAt);
      setStep('verify');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP trigger
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOtp = otpVal.join('');
    if (finalOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const email = isEmail ? inputVal : null;
      const phone = !isEmail ? inputVal : null;

      const response = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, phone, otp: finalOtp }),
      });

      // Successful verification
      login(response.token, response.user);

      // Route based on verified status
      if (response.user.rollNumber) {
        router.push('/home');
      } else {
        router.push('/register');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP key stroke actions
  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;

    const newOtp = [...otpVal];
    newOtp[index] = val.substring(val.length - 1);
    setOtpVal(newOtp);

    // Auto-focus next field
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpVal[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background decorations */}
      <div className="absolute inset-0 bg-mesh-hero opacity-60" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-float" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/8 rounded-full blur-[80px] animate-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/4 right-1/4 w-3 h-3 rounded-full bg-primary/20 animate-dot-pulse" />
      <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-accent/30 animate-dot-pulse" style={{ animationDelay: '0.5s' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row w-full max-w-4xl bg-white/40 dark:bg-slate-950/40 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/20 dark:border-white/10 z-10"
      >
        {/* Left Side: Premium Brand Visuals (Desktop only) */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-secondary via-[#1C2740] to-secondary text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          {/* Decorative glows */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-orange-400" />
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-[40px] animate-float" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-accent/20 rounded-full blur-[40px] animate-float" style={{ animationDelay: '2.5s' }} />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-12">
            <Logo iconSize={42} />
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                <Sparkles size={12} className="text-primary animate-pulse" />
                <span>campus food, finally hacked</span>
              </div>
              <h2 className="text-3xl font-extrabold leading-tight">
                Decide your meals.<br />
                Skip the lines.<br />
                Eat on your schedule.
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed max-w-sm">
                Join Chandigarh University students who vote on daily menu polls and get fresh meals delivered directly to their hostel block.
              </p>
            </div>
            
            <div className="text-[10px] text-gray-400 border-t border-white/10 pt-4 flex items-center justify-between">
              <span>Jugaadmeal v1.2</span>
              <span>Secure Verification Login</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative bg-white/75 dark:bg-slate-900/60">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary animate-gradient bg-200 md:hidden" />
          
          <div className="space-y-6">
            {/* Brand header for mobile */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center md:text-left space-y-2"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse-glow md:hidden mx-auto mb-3">
                <LogoIcon size={42} className="text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-secondary dark:text-white font-sans tracking-tight mt-3">Welcome to Jugaadmeal</h2>
              <p className="text-sm text-text-muted">
                {step === 'request'
                  ? 'Enter details to verify your identity'
                  : `Enter the code sent to ${inputVal}`}
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="bg-red-50 dark:bg-red-950/30 text-red-600 border border-red-100 dark:border-red-900/30 rounded-xl p-3 flex items-start space-x-2.5 text-sm"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step === 'request' ? (
                <motion.form
                  key="request-form"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleRequestOtp}
                  className="space-y-4"
                >
                  {/* Type Switcher */}
                  <div className="flex bg-surface-dark dark:bg-slate-800 p-1 rounded-xl border border-edge/50 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmail(true);
                        setInputVal('');
                        setErrorMsg('');
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        isEmail ? 'bg-white dark:bg-slate-900 shadow-md text-primary' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      College Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmail(false);
                        setInputVal('');
                        setErrorMsg('');
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                        !isEmail ? 'bg-white dark:bg-slate-900 shadow-md text-primary' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Phone Number
                    </button>
                  </div>

                  {/* Input field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-muted dark:text-gray-300 block">
                      {isEmail ? 'Email Address' : 'Phone Number'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                        {isEmail ? <Mail size={16} /> : <Phone size={16} />}
                      </div>
                      <input
                        type={isEmail ? 'email' : 'tel'}
                        required
                        placeholder={isEmail ? 'yourname@cu.edu' : '98765 43210'}
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-edge dark:border-slate-800 outline-none focus-ring-primary transition-all text-sm bg-white/60 dark:bg-slate-950/40"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 disabled:from-orange-300 disabled:to-orange-300 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm group"
                  >
                    <span>{isLoading ? 'Sending...' : 'Request Verification OTP'}</span>
                    {!isLoading && <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />}
                  </button>

                  <div className="text-center">
                    <span className="text-[10px] text-text-muted flex items-center justify-center gap-1.5 bg-surface-dark/50 dark:bg-slate-800/40 px-3 py-1.5 rounded-full mx-auto w-fit">
                      <Shield size={10} className="text-primary" />
                      Test Credentials: Use any email with OTP 123456
                    </span>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="verify-form"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleVerifyOtp}
                  className="space-y-6"
                >
                  {/* OTP code grid */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-text-muted dark:text-gray-300 block text-center">
                      6-Digit OTP Code
                    </label>
                    <div className="flex justify-between items-center gap-2">
                      {otpVal.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            if (el) otpRefs.current[idx] = el;
                          }}
                          type="text"
                          maxLength={1}
                          required
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className={`w-12 h-14 text-center text-lg font-bold border-2 rounded-xl outline-none transition-all bg-white/60 dark:bg-slate-950/40 ${
                            digit ? 'border-primary shadow-glow' : 'border-edge dark:border-slate-800 focus:border-primary focus:shadow-glow'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary-hover hover:to-orange-600 disabled:from-orange-300 disabled:to-orange-300 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 text-sm"
                  >
                    <span>{isLoading ? 'Verifying...' : 'Verify & Continue'}</span>
                  </button>

                  <div className="text-center flex flex-col space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('request');
                        setOtpVal(Array(6).fill(''));
                        setErrorMsg('');
                      }}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Change identity identifier
                    </button>
                    <span className="text-[10px] text-text-muted bg-surface-dark/50 dark:bg-slate-800/40 px-3 py-1.5 rounded-full mx-auto w-fit">
                      Use 123456 to verify easily.
                    </span>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
