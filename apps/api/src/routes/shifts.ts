import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// GET /api/shifts - View shifts (auto seeds defaults if none exist)
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    let shifts = await prisma.agentShift.findMany({
      include: {
        assignments: {
          include: {
            agent: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Auto-seed default shifts if database has none
    if (shifts.length === 0) {
      const today = new Date();
      
      const shiftData = [
        {
          name: 'Morning Breakfast Run 🍳',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 30),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30),
          maxAgents: 5,
          maxConcurrentOrders: 3,
        },
        {
          name: 'Lunch Hour Rush 🍱',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 45),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 45),
          maxAgents: 6,
          maxConcurrentOrders: 2,
        },
        {
          name: 'Dinner Delivery Shift 🌙',
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 30),
          maxAgents: 4,
          maxConcurrentOrders: 4,
        },
      ];

      for (const sd of shiftData) {
        await prisma.agentShift.create({ data: sd });
      }

      shifts = await prisma.agentShift.findMany({
        include: {
          assignments: {
            include: {
              agent: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      });
    }

    return res.json(shifts);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/shifts - Create a shift (Admin only)
router.post('/', authenticateToken, async (req: any, res: any) => {
  const { name, startTime, endTime, maxAgents, maxConcurrentOrders } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ error: 'Only admins can create shifts' });
    }

    const shift = await prisma.agentShift.create({
      data: {
        name,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        maxAgents: parseInt(maxAgents) || 5,
        maxConcurrentOrders: parseInt(maxConcurrentOrders) || 3,
      },
    });

    return res.json(shift);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/shifts/:id/claim - Claim a shift (Riders)
router.post('/:id/claim', authenticateToken, async (req: any, res: any) => {
  const shiftId = req.params.id;
  const agentId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: agentId } });
    if (!user || (user.role !== 'DELIVERY_AGENT' && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only delivery agents can claim shifts' });
    }

    const shift = await prisma.agentShift.findUnique({
      where: { id: shiftId },
      include: { assignments: true },
    });

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Check if already claimed
    if (shift.assignments.some((a) => a.agentId === agentId)) {
      return res.status(400).json({ error: 'You have already claimed this shift' });
    }

    // Check capacity limits
    if (shift.assignments.length >= shift.maxAgents) {
      return res.status(400).json({ error: 'Shift capacity has been reached. Select another slot.' });
    }

    const assignment = await prisma.shiftAssignment.create({
      data: {
        shiftId,
        agentId,
      },
      include: {
        shift: true,
      },
    });

    return res.json(assignment);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/shifts/earnings - Aggregate shift payout details for Recharts bar charts
router.get('/earnings', authenticateToken, async (req: any, res: any) => {
  const agentId = req.user.userId;

  try {
    // Verify deliveries completed by agent
    const deliveries = await prisma.order.findMany({
      where: {
        agentId,
        status: 'DELIVERED',
      },
      orderBy: { actualDelivery: 'desc' },
    });

    // Payout incentives per delivery is ₹15.00
    const PAYOUT_INCENTIVE = 15.0;
    const ledger = deliveries.map((d) => ({
      id: d.id,
      orderNumber: d.orderNumber,
      amount: PAYOUT_INCENTIVE,
      deliveredAt: d.actualDelivery || d.updatedAt,
    }));

    // Aggregate daily earnings for the last 7 days
    const chartData = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toDateString();
      const dayName = daysOfWeek[date.getDay()];

      // Count deliveries completed on this date
      const count = deliveries.filter((d) => {
        const delDate = new Date(d.actualDelivery || d.updatedAt);
        return delDate.toDateString() === dateString;
      }).length;

      chartData.push({
        name: dayName,
        amount: count * PAYOUT_INCENTIVE,
        deliveriesCount: count,
      });
    }

    const totalEarnings = ledger.reduce((sum, item) => sum + item.amount, 0);

    return res.json({
      ledger,
      chartData,
      totalEarnings,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
