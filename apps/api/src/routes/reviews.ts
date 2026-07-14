import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// POST /api/reviews - Add review for an order
router.post('/', authenticateToken, async (req: any, res: any) => {
  const { orderId, foodRating, deliveryRating, packagingRating, comment, tags } = req.body;

  if (!orderId || !foodRating) {
    return res.status(400).json({ error: 'Order ID and rating are required' });
  }

  try {
    const userId = req.user.userId;

    // Check if order exists and is delivered
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Cannot review another user\'s order' });
    }

    const fRating = parseInt(foodRating);
    const dRating = parseInt(deliveryRating || 5);
    const pRating = parseInt(packagingRating || 5);
    const overall = Math.round((fRating + dRating + pRating) / 3);

    const review = await prisma.review.create({
      data: {
        orderId,
        userId,
        foodRating: fRating,
        deliveryRating: dRating,
        packagingRating: pRating,
        overallRating: overall,
        comment,
        tags: tags || [],
      },
    });

    // Credit student 5 loyalty coins / cashback (simulated wallet top-up)
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (wallet) {
      await prisma.$transaction([
        prisma.wallet.update({
          where: { userId },
          data: { promoBalance: { increment: 5.0 } },
        }),
        prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT_BONUS',
            amount: 5.0,
            description: 'Feedback Review Reward (Promo Balance)',
            balanceAfter: wallet.balance + wallet.promoBalance + 5.0,
          },
        }),
      ]);
    }

    return res.status(201).json(review);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// GET /api/reviews/menu/:menuId - Get reviews for a menu
router.get('/menu/:menuId', authenticateToken, async (req: any, res: any) => {
  const { menuId } = req.params;

  try {
    // Find all reviews where order items belong to this menu's items
    const reviews = await prisma.review.findMany({
      where: {
        order: {
          items: {
            some: {
              menuItem: { menuId },
            },
          },
        },
      },
      include: {
        user: { select: { name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json(reviews);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
