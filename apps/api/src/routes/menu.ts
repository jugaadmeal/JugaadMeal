import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// GET /api/menus - List menus for the college
router.get('/', authenticateToken, async (req: any, res: any) => {
  const { mealType } = req.query;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.collegeId) {
      return res.status(400).json({ error: 'User does not belong to a college' });
    }

    const menus = await prisma.menu.findMany({
      where: {
        collegeId: user.collegeId,
        isActive: true,
        ...(mealType ? { mealType: mealType as any } : {}),
      },
      include: {
        items: true,
        pricing: true,
      },
    });

    // Map output to MenuDTO structure
    const dtos = menus.map((m: any) => ({
      id: m.id,
      collegeId: m.collegeId,
      name: m.name,
      description: m.description,
      mealType: m.mealType,
      isActive: m.isActive,
      items: m.items,
      basePrice: m.pricing?.basePrice || 100,
      studentPrice: m.pricing?.studentPrice || 80,
      deliveryFee: m.pricing?.deliveryFee || 10,
      packagingFee: m.pricing?.packagingFee || 5,
    }));

    return res.json(dtos);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/menus/today/:mealType - Today's winner/active menu
router.get('/today/:mealType', authenticateToken, async (req: any, res: any) => {
  const { mealType } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.collegeId) {
      return res.status(400).json({ error: 'User does not belong to a college' });
    }

    // Try to find the winner menu for the current day's poll
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activePoll = await prisma.poll.findFirst({
      where: {
        collegeId: user.collegeId,
        mealType: mealType.toUpperCase() as any,
        targetDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        status: 'FINALIZED',
      },
    });

    let menu;
    if (activePoll && activePoll.winnerMenuId) {
      menu = await prisma.menu.findUnique({
        where: { id: activePoll.winnerMenuId },
        include: { items: true, pricing: true },
      });
    }

    // Fallback: If no poll is finalized, find any active menu of this type
    if (!menu) {
      menu = await prisma.menu.findFirst({
        where: {
          collegeId: user.collegeId,
          mealType: mealType.toUpperCase() as any,
          isActive: true,
        },
        include: { items: true, pricing: true },
      });
    }

    if (!menu) {
      return res.status(404).json({ error: 'No menu scheduled for today' });
    }

    const dto = {
      id: menu.id,
      collegeId: menu.collegeId,
      name: menu.name,
      description: menu.description,
      mealType: menu.mealType,
      isActive: menu.isActive,
      items: menu.items,
      basePrice: menu.pricing?.basePrice || 100,
      studentPrice: menu.pricing?.studentPrice || 80,
      deliveryFee: menu.pricing?.deliveryFee || 10,
      packagingFee: menu.pricing?.packagingFee || 5,
    };

    return res.json(dto);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/menus/blocks - Get all blocks in the college
// IMPORTANT: This MUST be before /:id to avoid Express matching "blocks" as an ID param
router.get('/blocks', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.collegeId) {
      return res.status(400).json({ error: 'User does not belong to a college' });
    }

    const blocks = await prisma.block.findMany({
      where: { collegeId: user.collegeId },
      orderBy: { name: 'asc' },
    });

    return res.json(blocks);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/menus/:id - Get details of menu
router.get('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        pricing: true,
      },
    });

    if (!menu) return res.status(404).json({ error: 'Menu not found' });

    const dto = {
      id: menu.id,
      collegeId: menu.collegeId,
      name: menu.name,
      description: menu.description,
      mealType: menu.mealType,
      isActive: menu.isActive,
      items: menu.items,
      basePrice: menu.pricing?.basePrice || 100,
      studentPrice: menu.pricing?.studentPrice || 80,
      deliveryFee: menu.pricing?.deliveryFee || 10,
      packagingFee: menu.pricing?.packagingFee || 5,
    };

    return res.json(dto);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/menus - Admin creates menu
router.post('/', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { name, description, mealType, basePrice, studentPrice, items } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user || !user.collegeId) {
      return res.status(400).json({ error: 'Admin does not belong to a college' });
    }

    const menu = await prisma.menu.create({
      data: {
        collegeId: user.collegeId,
        name,
        description,
        mealType,
        pricing: {
          create: {
            basePrice: parseFloat(basePrice),
            studentPrice: parseFloat(studentPrice),
            deliveryFee: 10,
            packagingFee: 5,
            taxPercent: 5,
          },
        },
        items: {
          create: items.map((i: any) => ({
            name: i.name,
            description: i.description,
            category: i.category || 'Main Course',
            isVeg: i.isVeg ?? true,
            isAvailable: true,
            spiceLevel: i.spiceLevel || 'MEDIUM',
            tags: i.tags || [],
            allergens: i.allergens || [],
          })),
        },
      },
      include: {
        items: true,
        pricing: true,
      },
    });

    return res.status(201).json(menu);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
