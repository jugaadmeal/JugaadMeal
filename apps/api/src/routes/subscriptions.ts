import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// Price matrices for subscription plans
const PLAN_PRICES = {
  WEEKLY: 500.0,
  MONTHLY: 1800.0,
};

// 1. POST /api/subscriptions/purchase - Purchase a subscription pass
router.post('/purchase', authenticateToken, async (req: any, res: any) => {
  const { planType, menuId, deliveryBlockId, deliveryAddress, preferredSlot } = req.body;

  if (!planType || !PLAN_PRICES[planType as keyof typeof PLAN_PRICES]) {
    return res.status(400).json({ error: 'Invalid or missing subscription plan type. Must be WEEKLY or MONTHLY.' });
  }
  if (!menuId || !deliveryBlockId || !deliveryAddress || !preferredSlot) {
    return res.status(400).json({ error: 'Menu ID, delivery block, address, and preferred delivery slot are required.' });
  }

  try {
    const userId = req.user.userId;

    // Check if user already has an active or paused subscription
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    if (existingSub) {
      return res.status(400).json({ error: 'You already have an active or paused lunch pass subscription.' });
    }

    const price = PLAN_PRICES[planType as keyof typeof PLAN_PRICES];

    // Verify wallet balance
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < price) {
      return res.status(400).json({ error: `Insufficient wallet balance. Pass cost: ₹${price.toFixed(2)} (Available: ₹${(wallet?.balance || 0).toFixed(2)})` });
    }

    const startDate = new Date();
    const endDate = new Date();
    if (planType === 'WEEKLY') {
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate.setDate(endDate.getDate() + 30);
    }

    // Atomically debit wallet and create subscription
    const subscription = await prisma.$transaction(async (tx) => {
      const w = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: price } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT_ORDER',
          amount: price,
          description: `Prepaid Lunch Pass Purchase (${planType})`,
          balanceAfter: w.balance,
        },
      });

      return await tx.subscription.create({
        data: {
          userId,
          planType: planType as any,
          menuId,
          deliveryBlockId,
          deliveryAddress,
          preferredSlot,
          status: 'ACTIVE',
          startDate,
          endDate,
        },
        include: {
          menu: { select: { name: true } },
          deliveryBlock: { select: { name: true } },
        },
      });
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        type: 'WALLET_DEBITED',
        title: '🎫 Lunch Pass Activated!',
        body: `Your prepaid ${planType.toLowerCase()} lunch pass is now active until ${endDate.toLocaleDateString()}. Enjoy automatic slot placement!`,
      },
    });

    return res.status(201).json(subscription);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/subscriptions/active - Fetch active subscription pass details
router.get('/active', authenticateToken, async (req: any, res: any) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: {
        userId: req.user.userId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      include: {
        menu: { select: { name: true } },
        deliveryBlock: { select: { name: true, shortCode: true } },
        autoOrders: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return res.json(sub || null);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/subscriptions/toggle-pause - Pause or resume the pass
router.post('/toggle-pause', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const sub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    if (!sub) {
      return res.status(404).json({ error: 'No active or paused subscription pass found.' });
    }

    const nextStatus = sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: nextStatus },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: nextStatus === 'ACTIVE' ? '🎫 Lunch Pass Resumed!' : '⏸️ Lunch Pass Paused',
        body: nextStatus === 'ACTIVE' 
          ? 'Your lunch pass auto-scheduler has been resumed.' 
          : 'Your lunch pass is paused. Auto-ordering is temporarily suspended.',
      },
    });

    return res.json(updatedSub);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/subscriptions/cancel - Cancel active pass
router.post('/cancel', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    const sub = await prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    if (!sub) {
      return res.status(404).json({ error: 'No active subscription pass found.' });
    }

    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED' },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: '🛑 Lunch Pass Cancelled',
        body: 'Your prepaid lunch pass subscription has been cancelled. No further auto-placements will trigger.',
      },
    });

    return res.json(updatedSub);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
