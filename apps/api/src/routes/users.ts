import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

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

// GET /api/users/me - Get current user's profile
router.get('/me', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        wallet: true,
        savedAddresses: true,
        college: {
          include: { settings: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate active streak dynamically for display
    const now = new Date();
    let currentStreak = user.votingStreak || 0;
    if (user.lastVotedAt) {
      const lastVoted = new Date(user.lastVotedAt);
      if (!isToday(lastVoted, now) && !isYesterday(lastVoted, now)) {
        currentStreak = 0;
        // Reset the streak in the database to keep it accurate for leaderboards
        await prisma.user.update({
          where: { id: user.id },
          data: { votingStreak: 0 },
        });
      }
    } else {
      currentStreak = 0;
    }

    return res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      collegeId: user.collegeId,
      rollNumber: user.rollNumber,
      department: user.department,
      semester: user.semester,
      hostelBlock: user.hostelBlock,
      defaultAddress: user.defaultAddress,
      isVerified: user.isVerified,
      walletBalance: (user.wallet?.balance || 0) + (user.wallet?.promoBalance || 0),
      walletRealBalance: user.wallet?.balance || 0,
      walletPromoBalance: user.wallet?.promoBalance || 0,
      collegeSettings: user.college?.settings || null,
      savedAddresses: user.savedAddresses || [],
      votingStreak: currentStreak,
      lastVotedAt: user.lastVotedAt ? user.lastVotedAt.toISOString() : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/users/me - Update current user's profile
router.patch('/me', authenticateToken, async (req: any, res: any) => {
  const { name, department, semester, hostelBlock, defaultAddress, role } = req.body;

  try {
    // Prevent role elevation to admin through this endpoint
    const allowedRoles = ['STUDENT', 'DELIVERY_AGENT', 'KITCHEN_STAFF', 'ADMIN'];
    const newRole = role && allowedRoles.includes(role) ? role : undefined;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name && { name }),
        ...(department && { department }),
        ...(semester !== undefined && { semester: parseInt(semester) }),
        ...(hostelBlock && { hostelBlock }),
        ...(defaultAddress && { defaultAddress }),
        ...(newRole && { role: newRole as any }),
      },
      include: {
        wallet: true,
      },
    });

    return res.json({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      collegeId: user.collegeId,
      rollNumber: user.rollNumber,
      department: user.department,
      semester: user.semester,
      hostelBlock: user.hostelBlock,
      defaultAddress: user.defaultAddress,
      isVerified: user.isVerified,
      walletBalance: (user.wallet?.balance || 0) + (user.wallet?.promoBalance || 0),
      votingStreak: user.votingStreak,
      lastVotedAt: user.lastVotedAt ? user.lastVotedAt.toISOString() : null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/users - List all users (admin only)
router.get('/', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  try {
    const { role, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where = role ? { role: role as any } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          role: true,
          department: true,
          hostelBlock: true,
          isVerified: true,
          createdAt: true,
          wallet: { select: { balance: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users: users.map((u) => ({
        ...u,
        walletBalance: u.wallet?.balance || 0,
      })),
      total,
      page: parseInt(page as string),
      pages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
