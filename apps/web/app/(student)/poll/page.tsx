'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/stores/authStore';
import { apiFetch, getSocket } from '../../../lib/api';
import { PollDTO } from 'shared-types';
import { Vote, Users, Clock, CheckCircle2, AlertCircle, Share2, Sparkles, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Logo, { LogoIcon } from '../../../components/shared/Logo';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function PollPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser } = useAuthStore();

  const [poll, setPoll] = useState<PollDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [copied, setCopied] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{ hostelBlock: string | null; leaderboard: any[] }>({
    hostelBlock: null,
    leaderboard: [],
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  // Sync check on mount and online listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasPendingSync(!!localStorage.getItem('ce_pending_vote'));
    }

    const handleOnline = async () => {
      const pendingVote = localStorage.getItem('ce_pending_vote');
      if (pendingVote) {
        setIsSyncing(true);
        try {
          const { pollId, optionId } = JSON.parse(pendingVote);
          await apiFetch(`/api/polls/${pollId}/vote`, {
            method: 'POST',
            body: JSON.stringify({ optionId, fingerprint: 'mock-device-fp-999' }),
          });
          localStorage.removeItem('ce_pending_vote');
          setHasPendingSync(false);
          
          // Fetch updated details
          const pollData = await apiFetch('/api/polls/active');
          setPoll(pollData);

          alert('🎉 Offline vote successfully synced!');
          confetti({ particleCount: 50, spread: 30 });
        } catch (e) {
          console.error('Offline vote sync failed:', e);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      
      // Load active poll
      try {
        const pollData = await apiFetch('/api/polls/active');
        setPoll(pollData);
      } catch (err) {
        console.error('Active poll fetch error:', err);
      }

      // Load leaderboard
      try {
        const leaderboard = await apiFetch('/api/polls/leaderboard');
        setLeaderboardData(leaderboard);
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      }

      // Sync user data for streak
      try {
        const latestUser = await apiFetch('/api/users/me');
        updateUser(latestUser);
      } catch (err) {
        console.error('User sync fetch error:', err);
      }

      setIsLoading(false);
    };

    loadData();
  }, [isAuthenticated, router]);

  // Setup Socket.io live updates for poll results
  useEffect(() => {
    if (!poll) return;

    const socket = getSocket();

    // Subscribe to this specific poll updates
    socket.emit('subscribe:poll', { pollId: poll.id });

    // Handle vote cast
    socket.on('poll:vote_cast', (data: { pollId: string; optionId: string; totalVotes: number; poll: any }) => {
      if (data.pollId === poll.id) {
        setPoll((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            totalVotes: data.totalVotes,
            options: data.poll.options,
          };
        });
      }
    });

    // Handle poll close
    socket.on('poll:closed', (data: { pollId: string; winnerId: string; winnerMenuId: string }) => {
      if (data.pollId === poll.id) {
        // Reload details to show finalized results
        apiFetch(`/api/polls/${poll.id}`).then(setPoll);
      }
    });

    return () => {
      socket.off('poll:vote_cast');
      socket.off('poll:closed');
    };
  }, [poll]);

  // Countdown timer
  useEffect(() => {
    if (!poll || poll.status !== 'OPEN') return;

    const updateTimer = () => {
      const diff = new Date(poll.closeAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Voting closed');
        return;
      }

      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [poll]);

  const handleVoteSubmit = async (optionId: string) => {
    if (!poll || isVoting) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      localStorage.setItem('ce_pending_vote', JSON.stringify({ pollId: poll.id, optionId }));
      setHasPendingSync(true);
      
      // Update local state to show selection instantly
      setPoll((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          userVotedOptionId: optionId,
        };
      });
      alert('🛜 You are offline. Your vote is queued and will sync automatically when you reconnect!');
      return;
    }

    setIsVoting(true);
    try {
      const res = await apiFetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId, fingerprint: 'mock-device-fp-999' }),
      });

      // Local state update
      setPoll((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          userVotedOptionId: optionId,
        };
      });

      // Sync user profile to refresh streak and leaderboard
      try {
        const latestUser = await apiFetch('/api/users/me');
        updateUser(latestUser);
        const latestLeaderboard = await apiFetch('/api/polls/leaderboard');
        setLeaderboardData(latestLeaderboard);
      } catch (e) {
        console.error('Error syncing streak/leaderboard after vote:', e);
      }

      if (res.cashbackCredited) {
        alert('🎉 7-Day Voting Streak Milestone! ₹50.00 Cashback has been credited to your wallet!');
      }

      // Celebration
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch (err: any) {
      alert(err.message || 'Failed to submit vote.');
    } finally {
      setIsVoting(false);
    }
  };

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-surface-dark rounded-xl w-1/2 skeleton-shimmer" />
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface-dark rounded-2xl skeleton-shimmer" />
          <div className="h-64 bg-surface-dark rounded-2xl skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="border border-dashed border-edge rounded-2xl p-16 text-center space-y-4 bg-white max-w-md mx-auto animate-scale-in">
        <span className="text-4xl">🗳️</span>
        <h3 className="text-lg font-bold text-secondary">No Active Polls</h3>
        <p className="text-xs text-text-muted">
          There are no daily menu polls open for voting at this hour. Check back at 6:00 PM for tomorrow&apos;s lunch vote.
        </p>
        <Link
          href="/home"
          className="inline-block bg-primary hover:bg-primary-hover text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg transition-all"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  const userVoted = !!poll.userVotedOptionId;

  // Determine leading option dynamically
  const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
  const leadOption = sortedOptions[0];
  const secondOption = sortedOptions[1];

  let leadingText = 'No votes registered yet!';
  if (poll.totalVotes > 0 && leadOption) {
    if (secondOption && leadOption.voteCount === secondOption.voteCount) {
      leadingText = `It's currently a tie between ${leadOption.menu.name} and ${secondOption.menu.name}!`;
    } else {
      const margin = secondOption ? (leadOption.percentage - secondOption.percentage) : leadOption.percentage;
      leadingText = `${leadOption.menu.name} is leading by ${margin}%`;
    }
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-20"
    >
      {/* Header and Countdown */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-white to-surface border border-edge p-6 rounded-2xl shadow-sm relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-primary/5 select-none pointer-events-none opacity-[0.4]">
          <LogoIcon size={70} />
        </div>
        <div className="space-y-1 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse" />
              Decide Tomorrow&apos;s Lunch Menu
            </span>
            {user?.votingStreak && user.votingStreak > 0 ? (
              <span className="text-[9px] bg-orange-100 text-primary border border-orange-200 px-2 py-0.5 rounded-full font-black flex items-center gap-0.5 animate-pulse">
                <span>🔥</span>
                <span>{user.votingStreak} Day Streak</span>
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-extrabold text-secondary dark:text-white tracking-tight">{poll.title.replace('🍽️', '')}</h1>
          <p className="text-xs text-text-muted">{poll.description}</p>
          {hasPendingSync && (
            <div className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
              <span>Pending Sync</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {poll.status === 'OPEN' ? (
            <div className="flex items-center gap-2 bg-orange-50 text-primary border border-orange-100 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm animate-pulse-glow">
              <Clock size={16} />
              <span>Closes in: {timeLeft}</span>
            </div>
          ) : (
            <span className="bg-slate-100 text-text-muted px-4 py-2.5 rounded-xl text-sm font-bold uppercase">Poll Closed</span>
          )}

          <button
            onClick={handleShare}
            className="border border-edge hover:bg-surface-dark p-2.5 rounded-xl transition-colors text-text-muted flex items-center gap-2 text-xs font-bold"
            title="Share Poll"
          >
            <Share2 size={16} />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </motion.div>

      {/* Main 2x2 Grid of Option Cards */}
      <motion.div variants={stagger} className="grid md:grid-cols-2 gap-6">
        {poll.options.map((option, idx) => {
          const isVoted = poll.userVotedOptionId === option.id;
          const isWinner = option.isWinner;

          return (
            <motion.div
              key={option.id}
              variants={fadeUp}
              className={`bg-white border rounded-2xl overflow-hidden shadow-sm hover-lift flex flex-col justify-between relative ${isVoted
                ? 'border-primary ring-2 ring-primary/10'
                : isWinner
                  ? 'border-yellow-400 ring-2 ring-yellow-400/20'
                  : 'border-edge'
                }`}
            >
              {/* Option metadata Header */}
              <div className="p-6 border-b border-edge bg-gradient-to-b from-surface-dark/30 to-white space-y-4 flex-1">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-secondary flex items-center gap-1.5 flex-wrap">
                      <span>{option.menu.name}</span>
                      {isVoted && <CheckCircle2 size={16} className="text-primary shrink-0" />}
                      {isWinner && (
                        <span className="bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 uppercase tracking-wider shrink-0 border border-yellow-300 dark:border-yellow-700/30">
                          👑 Winner
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">{option.menu.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-gradient-primary">₹{option.menu.studentPrice}</span>
                  </div>
                </div>

                {/* Combos list */}
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Combo Items</p>
                  <div className="flex flex-wrap gap-1.5">
                    {option.menu.items.map((i) => (
                      <span
                        key={i.id}
                        className="text-[10px] bg-surface-dark border border-edge px-2 py-0.5 rounded font-semibold text-text-primary"
                      >
                        {i.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vote percentages and buttons footer */}
              <div className="p-6 border-t border-edge bg-surface-dark/10 space-y-4">
                {userVoted || poll.status === 'CLOSED' || poll.status === 'FINALIZED' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-secondary">
                      <span>{option.voteCount} votes</span>
                      <span>{option.percentage}%</span>
                    </div>
                    {/* Animated Progress Bar */}
                    <div className="w-full bg-edge h-3 rounded-full overflow-hidden border border-edge">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${option.percentage}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full ${isWinner ? 'bg-yellow-400' : isVoted ? 'bg-primary' : 'bg-secondary/40'
                          }`}
                      />
                    </div>

                    {/* Dynamic Re-voting Switcher */}
                    {poll.status === 'OPEN' && !isVoted && (
                      <button
                        onClick={() => handleVoteSubmit(option.id)}
                        disabled={isVoting}
                        className="w-full text-center mt-2 bg-white/60 hover:bg-orange-50 text-[10px] font-extrabold text-primary hover:text-primary-hover border border-orange-100 hover:border-orange-200 py-1.5 rounded-lg transition-all shadow-sm hover:shadow flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Change vote to this thali</span>
                        <span>🔄</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleVoteSubmit(option.id)}
                    disabled={isVoting}
                    className="w-full bg-gradient-to-r from-white to-surface hover:from-orange-50 hover:to-orange-100 border border-primary text-primary hover:text-primary-hover font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    <Vote size={16} />
                    <span>Cast Vote</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Aggregate Details and Info Callouts */}
      <motion.div
        variants={fadeUp}
        className="bg-white border border-edge p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-around items-center gap-6 text-center text-sm font-semibold text-text-muted"
      >
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <span>Total Votes: <strong className="text-secondary">{poll.totalVotes}</strong></span>
        </div>
        <div className="flex items-center gap-2 md:border-l md:border-edge md:pl-6">
          <TrendingUp size={18} className="text-green-600" />
          <span>{leadingText}</span>
        </div>
      </motion.div>

      {/* Hostel Block Leaderboard Section */}
      {leaderboardData.hostelBlock && (
        <motion.div
          variants={fadeUp}
          className="bg-gradient-to-br from-white to-surface border border-edge p-6 rounded-2xl shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-secondary flex items-center gap-2">
              <span>🏆</span>
              <span>{leaderboardData.hostelBlock} Leaderboard</span>
            </h3>
            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Top Voters
            </span>
          </div>

          {leaderboardData.leaderboard.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">No votes logged yet in this block. Be the first to start a streak! 🚀</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {leaderboardData.leaderboard.map((u, i) => (
                <div
                  key={u.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    u.id === user?.id
                      ? 'bg-orange-50/50 border-primary shadow-sm ring-1 ring-primary/20'
                      : 'bg-white border-edge'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black w-5 text-center ${
                      i === 0 ? 'text-yellow-500 text-sm' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-text-muted'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center font-bold text-xs text-primary">
                        {u.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-secondary truncate max-w-[120px]">
                        {u.name} {u.id === user?.id && <span className="text-[8px] bg-primary text-white px-1 rounded">You</span>}
                      </p>
                      <p className="text-[9px] text-text-muted font-semibold truncate max-w-[120px]">{u.hostelBlock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-primary">
                    <span>🔥</span>
                    <span>{u.votingStreak}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
