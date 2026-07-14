import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// In-memory mapping of voted device fingerprints to detect voting fraud (pollId -> Map<fingerprint, userId>)
const pollFingerprints = new Map<string, Map<string, string>>();

function isToday(date: Date, now = new Date()) {
  return date.getFullYear() === now.getFullYear() &&
         date.getMonth() === now.getMonth() &&
         date.getDate() === now.getDate();
}

function isYesterday(date: Date, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return date.getFullYear() === yesterday.getFullYear() &&
         date.getMonth() === yesterday.getMonth() &&
         date.getDate() === yesterday.getDate();
}

// Helper to format a full poll object
const formatPoll = (poll: any) => {
  if (!poll) return null;
  return {
    ...poll,
    options: poll.options.map((o: any) => ({
      id: o.id,
      pollId: o.pollId,
      menuId: o.menuId,
      voteCount: o.voteCount,
      percentage: o.percentage,
      isWinner: o.isWinner,
      menu: o.menu ? {
        id: o.menu.id,
        collegeId: o.menu.collegeId,
        name: o.menu.name,
        description: o.menu.description,
        mealType: o.menu.mealType,
        isActive: o.menu.isActive,
        items: o.menu.items || [],
        basePrice: o.menu.pricing?.basePrice || 100,
        studentPrice: o.menu.pricing?.studentPrice || 80,
        deliveryFee: o.menu.pricing?.deliveryFee || 10,
        packagingFee: o.menu.pricing?.packagingFee || 5,
      } : null,
    })),
  };
};

// GET /api/polls - Get poll list
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.collegeId) {
      return res.status(400).json({ error: 'User does not belong to a college' });
    }

    const polls = await prisma.poll.findMany({
      where: { collegeId: user.collegeId },
      include: {
        options: {
          include: { menu: { include: { items: true, pricing: true } } },
        },
      },
      orderBy: { targetDate: 'desc' },
    });

    return res.json(polls.map(formatPoll));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/polls/active - Get current open poll
router.get('/active', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.collegeId) {
      return res.status(400).json({ error: 'User does not belong to a college' });
    }

    const activePoll = await prisma.poll.findFirst({
      where: {
        collegeId: user.collegeId,
        status: 'OPEN',
      },
      include: {
        options: {
          include: { menu: { include: { items: true, pricing: true } } },
        },
      },
    });

    if (!activePoll) {
      return res.status(404).json({ message: 'No active poll open at this time' });
    }

    // Check if user has already voted
    const userVote = await prisma.vote.findUnique({
      where: {
        pollId_userId: {
          pollId: activePoll.id,
          userId: user.id,
        },
      },
    });

    const dto = formatPoll(activePoll);

    return res.json({
      ...dto,
      userVotedOptionId: userVote?.optionId || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/polls/leaderboard - Get leaderboard for user's hostel block
router.get('/leaderboard', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    const hostelBlock = (req.query.hostelBlock as string) || user?.hostelBlock;

    if (!hostelBlock) {
      return res.json({ hostelBlock: null, leaderboard: [] });
    }

    // Dynamic clean up: reset streaks for users in this block whose lastVotedAt is older than yesterday
    const now = new Date();
    const staleUsers = await prisma.user.findMany({
      where: {
        hostelBlock,
        votingStreak: { gt: 0 },
        lastVotedAt: { not: null },
      },
    });

    for (const u of staleUsers) {
      if (u.lastVotedAt) {
        const lastVoted = new Date(u.lastVotedAt);
        if (!isToday(lastVoted, now) && !isYesterday(lastVoted, now)) {
          await prisma.user.update({
            where: { id: u.id },
            data: { votingStreak: 0 },
          });
        }
      }
    }

    const leaderboardUsers = await prisma.user.findMany({
      where: {
        hostelBlock,
        votingStreak: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        votingStreak: true,
        hostelBlock: true,
      },
      orderBy: {
        votingStreak: 'desc',
      },
      take: 10,
    });

    return res.json({
      hostelBlock,
      leaderboard: leaderboardUsers,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/polls/trigger-nudge-job - Admin route to manually trigger personalized nudges
router.post('/trigger-nudge-job', authenticateToken, async (req: any, res: any) => {
  try {
    const { runNudgeJob } = require('../jobs/nudgeJob');
    const result = await runNudgeJob();
    return res.json({ message: 'Nudge job executed successfully', ...result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/polls/:id - Get specific poll details
router.get('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: {
        options: {
          include: { menu: { include: { items: true, pricing: true } } },
        },
      },
    });

    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    // Check if user has already voted
    const userVote = await prisma.vote.findUnique({
      where: {
        pollId_userId: {
          pollId: poll.id,
          userId: req.user.userId,
        },
      },
    });

    const dto = formatPoll(poll);

    return res.json({
      ...dto,
      userVotedOptionId: userVote?.optionId || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/polls/:id/vote - Cast a vote
router.post('/:id/vote', authenticateToken, async (req: any, res: any) => {
  const pollId = req.params.id;
  const { optionId } = req.body;

  if (!optionId) return res.status(400).json({ error: 'Option ID is required' });

  const fingerprint = req.body.fingerprint || req.headers['x-device-fingerprint'];

  try {
    const userId = req.user.userId;

    // Check if poll exists and is open
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.status !== 'OPEN') return res.status(400).json({ error: 'Poll is closed' });

    // Enforce device fingerprint check to prevent double voting fraud
    if (fingerprint) {
      const activeFingerprintVotes = pollFingerprints.get(pollId) || new Map<string, string>();
      const existingUserForFingerprint = activeFingerprintVotes.get(fingerprint);
      if (existingUserForFingerprint && existingUserForFingerprint !== userId) {
        return res.status(403).json({ error: 'Blocked: This device has already voted in this poll under another student account.' });
      }
      activeFingerprintVotes.set(fingerprint, userId);
      pollFingerprints.set(pollId, activeFingerprintVotes);
    }

    // Use transaction to ensure thread-safe increment / vote switching
    const voteResult = await prisma.$transaction(async (tx: any) => {
      // Check if already voted
      const existingVote = await tx.vote.findUnique({
        where: {
          pollId_userId: { pollId, userId },
        },
      });

      if (existingVote) {
        if (existingVote.optionId === optionId) {
          throw new Error('You have already casted your vote for this menu thali.');
        }

        // Switching vote!
        // Decrement old option
        await tx.pollOption.update({
          where: { id: existingVote.optionId },
          data: { voteCount: { decrement: 1 } },
        });

        // Increment new option
        await tx.pollOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } },
        });

        // Update vote relation
        const vote = await tx.vote.update({
          where: { id: existingVote.id },
          data: { optionId },
        });

        // Fetch poll options to update percentages (total votes remains unchanged)
        const currentPoll = await tx.poll.findUnique({
          where: { id: pollId },
          include: { options: true },
        });
        const total = currentPoll?.totalVotes || 0;

        for (const opt of currentPoll?.options || []) {
          const pct = total > 0 ? (opt.voteCount / total) * 100 : 0;
          await tx.pollOption.update({
            where: { id: opt.id },
            data: { percentage: parseFloat(pct.toFixed(2)) },
          });
        }

        return { vote, total };
      }

      // First time voting!
      // Calculate voting streak
      const now = new Date();
      let newStreak = 1;

      const userRecord = await tx.user.findUnique({
        where: { id: userId },
      });

      if (userRecord) {
        if (userRecord.lastVotedAt) {
          const lastVoted = new Date(userRecord.lastVotedAt);
          if (isToday(lastVoted, now)) {
            newStreak = userRecord.votingStreak || 1;
          } else if (isYesterday(lastVoted, now)) {
            newStreak = (userRecord.votingStreak || 0) + 1;
          } else {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
      }

      // Update User votingStreak and lastVotedAt
      await tx.user.update({
        where: { id: userId },
        data: {
          votingStreak: newStreak,
          lastVotedAt: now,
        },
      });

      // Credit ₹50.00 Cashback on 7-day milestones
      let cashbackCredited = false;
      const cashbackAmount = 50.0;
      if (newStreak > 0 && newStreak % 7 === 0) {
        let wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId, balance: 0.0 },
          });
        }

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: cashbackAmount } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CASHBACK' as any,
            amount: cashbackAmount,
            description: `🎉 Streak Milestone! ${newStreak}-day voting streak cashback reward`,
            balanceAfter: updatedWallet.balance,
          },
        });

        cashbackCredited = true;
      }

      // Create vote record
      const vote = await tx.vote.create({
        data: {
          pollId,
          optionId,
          userId,
        },
      });

      // Increment voteCount for chosen option
      await tx.pollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      });

      // Increment totalVotes on Poll
      const updatedPoll = await tx.poll.update({
        where: { id: pollId },
        data: { totalVotes: { increment: 1 } },
        include: { options: true },
      });

      // Recalculate percentages
      const total = updatedPoll.totalVotes;
      for (const opt of updatedPoll.options) {
        const pct = total > 0 ? (opt.voteCount / total) * 100 : 0;
        await tx.pollOption.update({
          where: { id: opt.id },
          data: { percentage: parseFloat(pct.toFixed(2)) },
        });
      }

      if (cashbackCredited) {
        await tx.notification.create({
          data: {
            userId,
            type: 'WALLET_CREDITED',
            title: '🔥 Streak Cashback! 💰',
            body: `You hit a ${newStreak}-day voting streak milestone! ₹${cashbackAmount.toFixed(2)} cashback has been credited to your wallet.`,
          },
        });
      }

      return { vote, total, newStreak, cashbackCredited };
    });

    // Re-fetch updated options for broadcasting
    const updatedPollDetails = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: { menu: { include: { items: true, pricing: true } } },
        },
      },
    });

    const dto = formatPoll(updatedPollDetails);

    // Broadcast via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('poll:vote_cast', {
        pollId,
        optionId,
        totalVotes: voteResult.total,
        poll: dto,
      });
    }

    return res.json({
      message: 'Vote cast successfully',
      userVotedOptionId: optionId,
      votingStreak: voteResult.newStreak,
      cashbackCredited: voteResult.cashbackCredited,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// POST /api/polls/:id/finalize - Finalize a poll winner (Admin)
router.post('/:id/finalize', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const pollId = req.params.id;

  try {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true },
    });

    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.options.length === 0) {
      return res.status(400).json({ error: 'Poll has no options' });
    }

    // Find option with max voteCount
    const sortedOptions = [...poll.options].sort((a, b) => b.voteCount - a.voteCount);
    const winnerOption = sortedOptions[0];

    // Mark winner
    await prisma.$transaction(async (tx: any) => {
      await tx.pollOption.update({
        where: { id: winnerOption.id },
        data: { isWinner: true },
      });

      await tx.poll.update({
        where: { id: pollId },
        data: {
          status: 'FINALIZED',
          winnerMenuId: winnerOption.menuId,
          finalizedAt: new Date(),
        },
      });
    });

    // Re-fetch finalized poll details
    const finalizedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: { menu: { include: { items: true, pricing: true } } },
        },
      },
    });

    const dto = formatPoll(finalizedPoll);

    // Broadcast close event
    const io = req.app.get('io');
    if (io) {
      io.emit('poll:closed', {
        pollId,
        winnerId: winnerOption.id,
        winnerMenuId: winnerOption.menuId,
        poll: dto,
      });
    }

    // Send in-app notification to all college students
    const students = await prisma.user.findMany({
      where: { collegeId: poll.collegeId, role: 'STUDENT' },
    });

    const winningMenu = await prisma.menu.findUnique({
      where: { id: winnerOption.menuId },
    });

    await prisma.notification.createMany({
      data: students.map((s: any) => ({
        userId: s.id,
        type: 'POLL_RESULT',
        title: '🎉 Tomorrow\'s Lunch Winner Selected!',
        body: `"${winningMenu?.name}" won with ${winnerOption.percentage}% votes! Order now for tomorrow.`,
        data: { pollId, winnerMenuId: winnerOption.menuId },
      })),
    });

    return res.json({ message: 'Poll finalized successfully', winnerMenuId: winnerOption.menuId, poll: dto });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/polls - Create a new poll (Admin)
router.post('/', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { title, description, mealType, targetDate, menuIds } = req.body;

  if (!menuIds || menuIds.length !== 4) {
    return res.status(400).json({ error: 'Exactly 4 menu choices must be specified' });
  }

  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!adminUser || !adminUser.collegeId) {
      return res.status(400).json({ error: 'Admin must belong to a college' });
    }

    const openAt = new Date();
    const closeAt = new Date(openAt.getTime() + 3 * 60 * 60 * 1000); // Closes in 3 hours by default

    // Create poll
    const poll = await prisma.poll.create({
      data: {
        collegeId: adminUser.collegeId,
        title,
        description,
        mealType,
        targetDate: new Date(targetDate),
        status: 'OPEN',
        openAt,
        closeAt,
        options: {
          create: menuIds.map((mId: string) => ({
            menuId: mId,
            voteCount: 0,
            percentage: 0,
          })),
        },
      },
      include: {
        options: {
          include: { menu: { include: { items: true, pricing: true } } },
        },
      },
    });

    const dto = formatPoll(poll);

    // Notify students
    const students = await prisma.user.findMany({
      where: { collegeId: adminUser.collegeId, role: 'STUDENT' },
    });

    await prisma.notification.createMany({
      data: students.map((s: any) => ({
        userId: s.id,
        type: 'POLL_OPENED',
        title: '🗳️ New Menu Poll Live!',
        body: `Vote now! Decide tomorrow's ${mealType.toLowerCase()} menu.`,
        data: { pollId: poll.id },
      })),
    });

    // Broadcast new poll via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('poll:opened', { poll: dto });
    }

    return res.status(201).json(dto);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
