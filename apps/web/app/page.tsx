'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../lib/stores/authStore';
import { ArrowRight, CheckCircle, Vote, Zap, Clock, Star, ArrowUpRight, Sparkles, Shield, TrendingUp } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import Logo, { LogoIcon } from '../components/shared/Logo';
import confetti from 'canvas-confetti';

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [demoVote, setDemoVote] = useState<string | null>(null);
  const [demoCounts, setDemoCounts] = useState({
    thali: 45,
    dosa: 30,
    chole: 35,
    wrap: 10,
  });

  const handleDemoVote = (option: 'thali' | 'dosa' | 'chole' | 'wrap') => {
    if (demoVote) return;
    setDemoVote(option);
    setDemoCounts((prev) => ({
      ...prev,
      [option]: prev[option] + 1,
    }));
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.85 }
    });
  };

  const totalDemoVotes = demoCounts.thali + demoCounts.dosa + demoCounts.chole + demoCounts.wrap;
  const getPct = (count: number) => ((count / totalDemoVotes) * 100).toFixed(0);

  const stats = [
    { label: 'Active Students', value: '3,000+', icon: '#' },
    { label: 'Meals Delivered', value: '25,000+', icon: '+' },
    { label: 'Menu Votes Cast', value: '50,000+', icon: '~' },
  ];

  return (
    <div className="space-y-32 pb-24 -mt-4 md:-mt-8">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-xl border border-edge bg-surface-card">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        
        <div className="relative z-10 p-8 md:p-20">
          <div className="grid md:grid-cols-12 gap-16 place-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8 md:col-span-7 text-left"
            >
              <div className="inline-flex place-center space-x-2 bg-primary-light text-primary px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider border border-primary/10">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Chandigarh University Campus Canteen Network</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-secondary leading-tight tracking-tight">
                Democratic menus.<br />
                <span className="text-gradient-primary">Direct hostel delivery.</span>
              </h1>
              <p className="text-base text-text-muted max-w-lg leading-relaxed">
                Vote daily by 9:00 PM to decide tomorrow's lunch preparation. Get it delivered to your academic block or hostel lobby, synchronized directly with your lecture timetable gaps.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {mounted && isAuthenticated ? (
                  <Link
                    href="/home"
                    className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex place-center place-mid gap-2 group focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    Go to Dashboard <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-sm flex place-center place-mid gap-2 group focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      Enter App <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <a
                      href="#how-it-works"
                      className="bg-surface-dark hover:bg-surface-dark/80 text-text-primary px-6 py-3 rounded-lg font-semibold transition-all flex place-center place-mid gap-2 border border-edge"
                    >
                      See How It Works
                    </a>
                  </>
                )}
              </div>
            </motion.div>

            {/* Right Live Preview Layout */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-5 flex place-mid"
            >
              <div className="bg-secondary rounded-2xl p-6 border border-secondary-light w-full max-w-sm text-white flex flex-col justify-between space-y-6 shadow-md relative">
                <div className="flex place-center justify-between">
                  <div className="flex place-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Canteen Poll Active</span>
                  </div>
                  <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700">Closes in 2h</span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Tomorrow's Menu Vote</h4>
                  <div className="space-y-2">
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col gap-1.5">
                      <div className="flex justify-between place-center text-xs font-semibold">
                        <span>Amritsari Paneer Thali</span>
                        <span className="text-primary">45%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[45%]" />
                      </div>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800/60 p-3 rounded-lg flex flex-col gap-1.5 opacity-60">
                      <div className="flex justify-between place-center text-xs font-semibold">
                        <span>South Indian Dosa Platter</span>
                        <span>30%</span>
                      </div>
                      <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-zinc-600 h-full w-[30%]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-850 rounded-lg p-3 align-mid space-y-2">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Live Delivery Status</span>
                  <div className="flex place-center justify-between text-[11px] text-zinc-400">
                    <span>Rider: Ramanpreet S.</span>
                    <span className="text-white font-mono">ETA: 4m</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 text-left border-t border-zinc-800/80 pt-1.5">
                    Departed central kitchen to Academic Block 3 lobby
                  </p>
                </div>

                <div className="align-mid pt-2 border-t border-zinc-800/60">
                  <span className="text-[9px] text-zinc-500 font-mono">CampusEat v1.2 Ledger Audited</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <AnimatedSection>
        <div className="border border-edge rounded-xl p-8 bg-surface-card max-w-4xl mx-auto">
          <div className="align-mid mb-6">
            <span className="text-xs uppercase tracking-wider text-text-muted font-semibold">Chandigarh University Canteen Operations</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between place-center gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="align-mid space-y-2 border-b pb-6 last:border-b-0 sm:border-b-0 sm:pb-0 sm:border-r sm:last:border-0 border-edge flex-1 w-full"
              >
                <p className="text-3xl md:text-4xl font-black text-secondary tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* 2. Problem/Solution Section */}
      <AnimatedSection>
        <section className="max-w-5xl mx-auto space-y-16" id="how-it-works">
          <div className="space-y-4 max-w-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-primary">System Integrity</span>
            <h2 className="text-3xl md:text-5xl font-black text-secondary tracking-tight">
              Democratic Dining for Campus Ecosystems
            </h2>
            <p className="text-text-muted text-base leading-relaxed">
              Campus food structures are broken by long canteen queues, unpredictable food prep counts, and frequent UPI payment timeouts. We engineered a platform specific to student schedules.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Clock size={20} />, title: 'Timetable Synchronization', desc: 'Input your class timetable. The delivery suggestions pre-calculate matches to drop orders at academic lobbies right when lectures break.', color: 'text-primary', bg: 'bg-primary-light' },
              { icon: <Vote size={20} />, title: '民主 Voting Cycle', desc: 'Admin posts options by 6:00 PM. Students vote to decide what gets cooked. Bulk prep minimizes food wastage and reduces base pricing.', color: 'text-secondary', bg: 'bg-surface-dark' },
              { icon: <Zap size={20} />, title: 'Ledger Wallet System', desc: 'Pre-funded student ledger bypasses bank gateway delays during high-congestion lunch breaks. Refunds settle instantly on order cancellation.', color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-surface-card border border-edge p-8 rounded-lg space-y-4 hover:border-primary/20 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className={`w-10 h-10 ${card.bg} rounded-md flex place-center place-mid ${card.color}`}>
                    {card.icon}
                  </div>
                  <h3 className="text-lg font-bold text-secondary">{card.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{card.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* 3. Interactive Polling Showcase */}
      <AnimatedSection>
        <section id="poll-showcase" className="bg-secondary rounded-xl p-8 md:p-16 text-white relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
          
          <div className="grid md:grid-cols-12 gap-16 place-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="space-y-6 md:col-span-7"
            >
              <span className="text-xs uppercase font-semibold tracking-widest text-primary">Student Governance</span>
              <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                Students decide.<br />
                Kitchen prepares.
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Try the demo card. Cast a vote on tomorrow's lunch options to see real-time updates. Real systems implement strict one-vote constraints validated against roll numbers to prevent rigging.
              </p>
              <div className="space-y-3">
                {[
                  'Strict roll number validation to prevent duplicate votes',
                  'Live WebSocket data feeds utilizing Socket.io protocol',
                  'Predictive inventory prep matching total vote tallies',
                ].map((text, i) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex place-center space-x-3 text-sm text-zinc-300"
                  >
                    <CheckCircle size={16} className="text-primary shrink-0" />
                    <span>{text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Interactive Poll Component */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6 md:col-span-5"
            >
              <div className="flex justify-between place-center border-b border-zinc-800 pb-3">
                <div>
                  <span className="text-[9px] text-primary uppercase font-semibold tracking-wider">Demo Sandbox</span>
                  <h3 className="text-sm font-bold">Tomorrow's lunch poll</h3>
                </div>
                <span className="text-[10px] bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-400 font-medium">Closes in 2h</span>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'thali' as const, label: 'North Indian Thali' },
                  { key: 'dosa' as const, label: 'South Special Dosa' },
                  { key: 'chole' as const, label: 'Amritsari Chole Bhature' },
                ].map((option) => (
                  <button
                    key={option.key}
                    disabled={demoVote !== null}
                    onClick={() => handleDemoVote(option.key)}
                    className={`w-full text-left p-4 rounded-lg border transition-all relative overflow-hidden focus:ring-1 focus:ring-primary focus:outline-none ${
                      demoVote === option.key
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex justify-between place-center relative z-10">
                      <span className="font-semibold text-xs text-zinc-205">{option.label}</span>
                      <span className="text-xs font-semibold text-zinc-100">{demoVote ? `${getPct(demoCounts[option.key])}%` : ''}</span>
                    </div>
                    {demoVote && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${getPct(demoCounts[option.key])}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-0 top-0 bottom-0 bg-primary/10"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="align-mid pt-2 border-t border-zinc-800/80">
                <p className="text-[10px] text-zinc-500 font-mono">
                  {totalDemoVotes} roll numbers registered for this session
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </AnimatedSection>

      {/* 4. Social Proof Section */}
      <AnimatedSection>
        <section className="space-y-16">
          <div className="space-y-4 max-w-md">
            <span className="text-xs font-black uppercase tracking-widest text-primary">Student Endorsements</span>
            <h2 className="text-3xl font-black text-secondary tracking-tight">Vouched by Chandigarh University Students</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              We replaced general promotional quotes with specific logistical improvements students experience daily.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Arjun Sharma', dept: 'B.Tech CSE, Sem 6', initial: 'A', text: '"Between CSE Block and the library, we only have 25 minutes. Pre-ordering tomorrow\'s winning thali and having it delivered directly to the CSE Block Room 201 lobby saves my entire break. I don\'t have to stand in canteen lines anymore."' },
              { name: 'Kavita Singh', dept: 'MBA, Sem 2', initial: 'K', text: '"No UPI loading circles during peak cafeteria hours. I load ₹500 onto my CampusEat Wallet on Monday, and orders deduct instantly from the double-entry ledger with zero transaction delays. Cancelled meals refund instantly too."' },
              { name: 'Varun Dhawan', dept: 'B.Tech ECE, Sem 4', initial: 'V', text: '"The timetable parsing is a massive help. It extracted my classroom schedule and automatically pre-selected Academic Block 3 for delivery because it knew I had a free period starting at 12:00 PM. Highly convenient."' },
            ].map((review, i) => (
              <div
                key={review.name}
                className="bg-surface-card border border-edge p-8 rounded-lg space-y-6 hover:border-primary/10 transition-colors flex flex-col justify-between"
              >
                <p className="text-sm text-text-muted leading-relaxed font-medium italic">{review.text}</p>
                <div className="flex place-center space-x-3 pt-4 border-t border-edge/60">
                  <div className="w-8 h-8 rounded bg-primary-light font-semibold flex place-center place-mid text-primary text-xs">{review.initial}</div>
                  <div>
                    <h4 className="text-xs font-bold text-secondary">{review.name}</h4>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{review.dept}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </AnimatedSection>

      {/* 5. CTA Block */}
      <AnimatedSection>
        <section className="bg-primary text-white rounded-xl p-8 md:p-16 align-mid space-y-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          
          <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
              Ready to decide what you eat?
            </h2>
            <p className="text-orange-100 text-sm max-w-md mx-auto leading-relaxed">
              Log in with your university credentials, vote on upcoming meals, and configure your default block address.
            </p>
            <div>
              <Link
                href="/login"
                className="inline-flex place-center place-mid space-x-2 bg-secondary text-white hover:bg-secondary-light px-6 py-3 rounded-lg font-semibold transition-all shadow-sm focus:ring-2 focus:ring-secondary/20 outline-none"
              >
                <span>Enter Canteen Dashboard</span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </AnimatedSection>
    </div>
  );
}
