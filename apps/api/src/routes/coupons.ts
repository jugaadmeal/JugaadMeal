import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// POST /api/coupons/validate - Validate a coupon code
router.post('/validate', authenticateToken, async (req: any, res: any) => {
  const { code, orderAmount } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ error: 'This coupon is no longer active' });
    }

    const now = new Date();
    if (now < coupon.validFrom) {
      return res.status(400).json({ error: 'Coupon is not valid yet' });
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    if (orderAmount !== undefined && coupon.minOrderValue && orderAmount < coupon.minOrderValue) {
      return res.status(400).json({
        error: `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'FLAT') {
      discountAmount = coupon.discountValue;
    } else if (coupon.discountType === 'PERCENTAGE') {
      const pct = coupon.discountValue / 100;
      discountAmount = orderAmount ? orderAmount * pct : 0;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    }

    return res.json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/coupons - List all active coupons (admin only)
router.get('/', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(coupons);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/coupons - Create a new coupon (admin only)
router.post('/', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { code, description, discountType, discountValue, minOrderValue, maxDiscount, maxUses, validUntilDays } = req.body;

  try {
    const validUntil = validUntilDays
      ? new Date(Date.now() + validUntilDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType: discountType || 'FLAT',
        discountValue: parseFloat(discountValue),
        minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
        usageLimit: maxUses ? parseInt(maxUses) : undefined,
        validFrom: new Date(),
        validUntil,
        isActive: true,
      },
    });

    return res.status(201).json(coupon);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A coupon with this code already exists' });
    }
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/coupons/:id - Update coupon (admin only)
router.patch('/:id', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  try {
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.json(coupon);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
