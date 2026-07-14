'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch } from '../../../lib/api';
import {
  User, LogOut, Settings2, ShieldAlert, Award, Star, Compass,
  Lock, Bell, Check, Smartphone, MapPin, Sparkles, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const AVATARS = [
  'https://api.dicebear.com/7.x/funventions/svg?seed=CampusSpecial',
  'https://api.dicebear.com/7.x/funventions/svg?seed=RiderHero',
  'https://api.dicebear.com/7.x/funventions/svg?seed=ThaliMaster',
  'https://api.dicebear.com/7.x/funventions/svg?seed=SamosaExpert',
  'https://api.dicebear.com/7.x/funventions/svg?seed=CollegeEater',
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateUser, logout, isAuthenticated } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<'STUDENT' | 'DELIVERY_AGENT' | 'KITCHEN_STAFF' | 'ADMIN' | 'SUPER_ADMIN'>('STUDENT');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [hostelBlock, setHostelBlock] = useState('');
  const [rollNumber, setRollNumber] = useState('');

  // Customization & Preferences
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [pushNotif, setPushNotif] = useState(true);

  // Secure Developer Perspection Gate
  const [devModeUnlocked, setDevModeUnlocked] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);
  const [devCodeInput, setDevCodeInput] = useState('');
  const [devError, setDevError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const syncUserData = async () => {
      try {
        const latest = await apiFetch('/api/users/me');
        updateUser(latest);
      } catch (err) {
        console.error('Failed to sync profile user state:', err);
      }
    };
    syncUserData();

    if (user) {
      setRole(user.role);
      setName(user.name);
      setDepartment(user.department || 'Computer Science Engineering');
      setHostelBlock(user.hostelBlock || 'Hostel 6 (H6)');
      setRollNumber(user.rollNumber || 'CU-2024-CSE-092');
    }
  }, [isAuthenticated, user, router, mounted]);

  const handleRoleChange = async (newRole: any) => {
    setRole(newRole);
    updateUser({ role: newRole });

    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      alert(`Access role changed to ${newRole}. Reloading dashboard.`);
      window.location.reload();
    } catch (e) {
      alert(`Access role changed to ${newRole} (local store fallback).`);
      window.location.reload();
    }
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    updateUser({ avatar: avatarUrl });
    try {
      await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatar: avatarUrl }),
      });
      confetti({ particleCount: 40, spread: 30 });
    } catch (err) {
      console.error('Failed to save avatar choice:', err);
    }
    setShowAvatarSelector(false);
  };

  const handleReplayTour = () => {
    localStorage.removeItem('tour_completed');
    router.push('/home');
    setTimeout(() => {
      window.dispatchEvent(new Event('replay-tour'));
    }, 150);
  };

  const handleDevUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDevError('');
    if (devCodeInput.trim() === '2026' || devCodeInput.trim() === '1234') {
      setDevModeUnlocked(true);
      setShowDevModal(false);
      setDevCodeInput('');
      confetti({ particleCount: 50, spread: 45 });
    } else {
      setDevError('Invalid dev passcode credentials.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse max-w-xl mx-auto p-4">
        <div className="h-10 bg-slate-100 dark:bg-zinc-800 rounded-2xl w-1/4" />
        <div className="h-56 bg-slate-100 dark:bg-zinc-800 rounded-3xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-24 max-w-xl mx-auto p-2"
    >
      {/* Title */}
      <motion.div variants={fadeUp} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary dark:text-white tracking-tight">Student Profile</h1>
          <p className="text-xs text-text-muted">Manage your avatar thali profile and coordinates settings.</p>
        </div>
      </motion.div>

      {/* College Smart ID Card Visual Redesign */}
      <motion.div
        variants={fadeUp}
        className="bg-gradient-to-br from-secondary via-secondary-light to-secondary dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-950 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden border border-white/10 group cursor-pointer"
        onClick={() => setShowAvatarSelector(!showAvatarSelector)}
        title="Tap to change avatar"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[35px] group-hover:scale-110 transition-all duration-700 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4.5">
            <div className="relative group/avatar shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md ring-4 ring-primary/20 hover:scale-105 transition-all"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center font-bold text-xl border-2 border-white/20 shadow-md ring-4 ring-primary/20">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 bg-black/45 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-[8px] font-black uppercase transition-all tracking-wider text-white">
                Change
              </div>
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">{user.name}</h2>
              <p className="text-[9px] text-orange-300 dark:text-primary font-black uppercase tracking-widest">{user.role}</p>
              <p className="text-[10px] text-white/60 mt-0.5">{user.email}</p>
              {user.votingStreak && user.votingStreak > 0 ? (
                <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-[9px] font-black text-orange-200 mt-2">
                  <span>🔥</span>
                  <span>{user.votingStreak} Days</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-left sm:text-right text-[10px] font-semibold text-white/80 space-y-1.5 shrink-0 border-l sm:border-l-0 sm:border-r border-white/15 pl-4 sm:pl-0 sm:pr-0">
            <p><span className="text-white/40">DEP:</span> {department}</p>
            <p><span className="text-white/40">ROLL:</span> {rollNumber}</p>
            <p><span className="text-white/40">HOSTEL:</span> {hostelBlock}</p>
          </div>
        </div>

        {/* Barcode representation */}
        <div className="mt-6 pt-4.5 border-t border-white/10 flex justify-between items-center text-[9px] text-white/40 relative z-10">
          <div className="flex flex-col gap-0.5">
            <div className="h-5 w-28 bg-white/20 rounded opacity-60 flex gap-0.5 p-0.5 overflow-hidden">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="h-full bg-white" style={{ width: `${Math.max(1, Math.random() * 3.5)}px` }} />
              ))}
            </div>
            <span className="font-mono text-[7px] text-white/30 uppercase mt-1">CE-UID-{user.id.slice(-6)}</span>
          </div>
          <span className="text-[8px] text-orange-300 font-extrabold uppercase tracking-widest">CU CAMPUS CARD</span>
        </div>
      </motion.div>

      {/* Avatar Selector Tray */}
      <AnimatePresence>
        {showAvatarSelector && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white dark:bg-zinc-900 border border-edge/60 p-4.5 rounded-[24px] shadow-sm space-y-3"
          >
            <h4 className="text-[10px] font-black text-secondary dark:text-white uppercase tracking-wider text-center">Choose food avatar theme</h4>
            <div className="flex gap-3.5 justify-center">
              {AVATARS.map((av) => (
                <img
                  key={av}
                  src={av}
                  onClick={() => handleAvatarSelect(av)}
                  className="w-12 h-12 rounded-xl border border-edge hover:border-primary cursor-pointer p-1 bg-slate-50 dark:bg-zinc-800 transition-all hover:scale-108"
                  alt="Avatar option"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Navigation Action Grid */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-3 gap-3"
      >
        <button
          onClick={() => router.push('/wallet')}
          className="bg-white dark:bg-zinc-900 border border-edge/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm hover:border-primary transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-lg">💰</span>
          <span className="text-[9px] font-black text-secondary dark:text-white uppercase tracking-wider">Wallet</span>
        </button>
        <button
          onClick={() => router.push('/group')}
          className="bg-white dark:bg-zinc-900 border border-edge/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm hover:border-primary transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-lg">👥</span>
          <span className="text-[9px] font-black text-secondary dark:text-white uppercase tracking-wider">Group Cart</span>
        </button>
        <button
          onClick={() => router.push('/subscriptions')}
          className="bg-white dark:bg-zinc-900 border border-edge/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm hover:border-primary transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-lg">🎫</span>
          <span className="text-[9px] font-black text-secondary dark:text-white uppercase tracking-wider">Thali Pass</span>
        </button>
      </motion.div>

      {/* Preferences Section */}
      <motion.div
        variants={fadeUp}
        className="bg-white dark:bg-zinc-900 border border-edge/50 p-5 rounded-3xl shadow-sm space-y-4"
      >
        <h3 className="text-xs font-black text-secondary dark:text-white flex items-center gap-2 uppercase tracking-wider">
          <Settings2 className="text-primary" size={14} />
          Profile Settings
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs font-semibold text-text-muted space-y-3 pt-1">
          <div className="flex justify-between items-center py-2">
            <div>
              <p className="text-secondary dark:text-white font-bold text-xs">Push Notifications</p>
              <p className="text-[10px] text-text-muted">Receive live socket-based approaching warnings and poll alerts.</p>
            </div>
            <input
              type="checkbox"
              checked={pushNotif}
              onChange={() => setPushNotif(!pushNotif)}
              className="accent-primary w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-secondary dark:text-white font-bold text-xs">Interactive Product Tour</p>
              <p className="text-[10px] text-text-muted">Replay the onboarding thali system coordinate walkthrough guides.</p>
            </div>
            <button
              onClick={handleReplayTour}
              className="text-primary text-[10px] font-black hover:underline cursor-pointer"
            >
              Replay Guide
            </button>
          </div>
        </div>
      </motion.div>

      {/* Smart Timetable shortcuts */}
      {user.role === 'STUDENT' && (
        <motion.div
          variants={fadeUp}
          className="bg-white dark:bg-zinc-900 border border-edge/50 p-5 rounded-3xl shadow-sm space-y-3"
        >
          <h3 className="text-xs font-black text-secondary dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <Compass className="text-primary" size={14} />
            Class Timetable Automation
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            Register your lecture schedule blocks. CampusEat will automatically coordinate checkout slot selections according to your class timings.
          </p>
          <button
            onClick={() => router.push('/timetable')}
            className="w-full border border-edge dark:border-zinc-800 hover:border-primary-light hover:bg-orange-50/20 py-2.5 rounded-xl font-black transition-all text-xs text-secondary dark:text-white flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Manage Timetable Setup
          </button>
        </motion.div>
      )}

      {/* Advanced Collapsible Perspective Switcher Panel */}
      <motion.div
        variants={fadeUp}
        className="bg-orange-50/20 dark:bg-zinc-950 border border-orange-200/50 dark:border-zinc-800 p-5 rounded-3xl space-y-3.5 relative overflow-hidden"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-secondary dark:text-white flex items-center gap-2 uppercase tracking-wider">
            <Sliders className="text-primary animate-pulse" size={14} />
            Advanced Perspectives
          </h3>
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${devModeUnlocked ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {devModeUnlocked ? 'Enabled' : 'Locked'}
          </span>
        </div>

        {!devModeUnlocked ? (
          <div className="space-y-3">
            <p className="text-[11px] text-text-muted leading-relaxed">
              Sandbox role perspective switches are locked. Enter passcode credentials to enable switching screens.
            </p>
            <button
              onClick={() => setShowDevModal(true)}
              className="bg-primary hover:bg-primary-hover text-white font-black text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Enter Dev Passcode
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <p className="text-[11px] text-text-muted">
              Select any workspace panel perspective below to swap dashboard screens:
            </p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {([
                { id: 'STUDENT', label: 'Student 🍱' },
                { id: 'KITCHEN_STAFF', label: 'Kitchen 🧑‍🍳' },
                { id: 'DELIVERY_AGENT', label: 'Rider 🚴' },
                { id: 'ADMIN', label: 'Admin 🛡️' },
              ] as const).map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRoleChange(r.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${role === r.id
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-edge dark:border-zinc-800 bg-white dark:bg-zinc-900 text-text-muted hover:text-text-primary'
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setDevModeUnlocked(false)}
              className="text-[9px] text-text-muted hover:text-primary hover:underline block cursor-pointer font-bold"
            >
              Lock Perspective Controls 🔒
            </button>
          </div>
        )}
      </motion.div>

      {/* Dev Passcode Modal */}
      <AnimatePresence>
        {showDevModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-secondary/40 backdrop-blur-sm"
              onClick={() => setShowDevModal(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-edge/60 p-5.5 rounded-3xl w-full max-w-xs shadow-2xl relative z-10 space-y-4"
            >
              <div className="text-center space-y-1">
                <h3 className="text-xs font-black text-secondary dark:text-white uppercase tracking-wider">Passcode Credentials</h3>
                <p className="text-[9px] text-text-muted">Enter security sandbox credentials key (e.g. 1234 or 2026).</p>
              </div>

              <form onSubmit={handleDevUnlockSubmit} className="space-y-4">
                <input
                  type="password"
                  required
                  placeholder="••••"
                  value={devCodeInput}
                  onChange={(e) => setDevCodeInput(e.target.value)}
                  className="w-full border border-edge px-3.5 py-2.5 rounded-xl outline-none focus:border-primary text-xs font-bold text-secondary text-center tracking-widest bg-slate-50 dark:bg-zinc-800 dark:text-white"
                />

                {devError && <p className="text-[10px] text-red-500 font-bold text-center">{devError}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDevModal(false)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 text-text-muted font-bold text-xs py-2 rounded-xl transition-all border border-edge/50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold text-xs py-2 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Unlock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout button */}
      <motion.button
        variants={fadeUp}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleLogout}
        className="w-full bg-red-50 hover:bg-red-100/80 text-red-600 border border-red-100 font-extrabold py-3.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
      >
        <LogOut size={14} />
        <span>Log Out Session</span>
      </motion.button>
    </motion.div>
  );
}
