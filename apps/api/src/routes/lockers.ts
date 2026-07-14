import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// GET /api/lockers - List all lockers
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const lockers = await prisma.locker.findMany({
      include: {
        block: { select: { id: true, name: true, shortCode: true } },
      },
      orderBy: { code: 'asc' },
    });
    return res.json(lockers);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/lockers/seed - Admin helper to seed lockers across blocks
router.post('/seed', authenticateToken, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only admins can seed lockers' });
    }

    const blocks = await prisma.block.findMany();
    if (blocks.length === 0) {
      return res.status(400).json({ error: 'No blocks found. Seed blocks first.' });
    }

    const createdLockers = [];

    for (const block of blocks) {
      // Create 5 lockers per block
      for (let i = 1; i <= 5; i++) {
        const code = `LK-${block.shortCode}-${i.toString().padStart(2, '0')}`;
        
        // Prevent duplicate seeding
        const existing = await prisma.locker.findUnique({
          where: {
            blockId_code: {
              blockId: block.id,
              code,
            },
          },
        });

        if (!existing) {
          const locker = await prisma.locker.create({
            data: {
              blockId: block.id,
              code,
              isOccupied: false,
            },
          });
          createdLockers.push(locker);
        }
      }
    }

    return res.json({
      message: `Successfully seeded lockers!`,
      count: createdLockers.length,
      lockers: createdLockers,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
