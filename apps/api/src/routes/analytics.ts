import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// GET /api/admin/analytics/overview - General metrics summary
router.get('/overview', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's total orders
    const todayOrdersCount = await prisma.order.count({
      where: { createdAt: { gte: today } },
    });

    // Today's total revenue
    const todayOrders = await prisma.order.findMany({
      where: { createdAt: { gte: today }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      select: { totalAmount: true },
    });
    const todayRevenue = todayOrders.reduce((sum: any, o: any) => sum + o.totalAmount, 0);

    // Active orders (pending, confirmed, preparing, ready, out for delivery)
    const activeOrdersCount = await prisma.order.count({
      where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } },
    });

    // Poll participation rate
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const latestPoll = await prisma.poll.findFirst({
      where: { status: 'OPEN' },
      select: { totalVotes: true },
    });
    const pollRate = totalStudents > 0 && latestPoll ? (latestPoll.totalVotes / totalStudents) * 100 : 85; // mock default if no poll

    return res.json({
      todayOrders: todayOrdersCount,
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      activeOrders: activeOrdersCount,
      pollParticipationRate: parseFloat(pollRate.toFixed(1)),
      averageDeliveryTime: 18, // 18 mins average
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/charts - Data for graph visualizations
router.get('/charts', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  try {
    // Hourly orders mock-aggregated data
    const hourlyOrders = [
      { hour: '08:00', orders: 12 },
      { hour: '10:00', orders: 8 },
      { hour: '12:00', orders: 48 }, // peak lunch
      { hour: '14:00', orders: 32 },
      { hour: '16:00', orders: 15 },
      { hour: '18:00', orders: 25 },
      { hour: '20:00', orders: 40 }, // peak dinner
    ];

    // Revenue weekly breakdown
    const weeklyRevenue = [
      { day: 'Mon', revenue: 4200 },
      { day: 'Tue', revenue: 3800 },
      { day: 'Wed', revenue: 4800 },
      { day: 'Thu', revenue: 5100 },
      { day: 'Fri', revenue: 6200 },
      { day: 'Sat', revenue: 3100 },
      { day: 'Sun', revenue: 2400 },
    ];

    // Meal type breakdown
    const mealBreakdown = [
      { name: 'Breakfast', value: 15 },
      { name: 'Lunch', value: 50 },
      { name: 'Dinner', value: 25 },
      { name: 'Snacks', value: 10 },
    ];

    // Popular items
    const popularItems = [
      { name: 'Dal Makhani', orders: 125 },
      { name: 'Butter Masala Dosa', orders: 98 },
      { name: 'Amritsari Chole Bhature', orders: 84 },
      { name: 'Paneer Butter Masala', orders: 76 },
    ];

    return res.json({
      hourlyOrders,
      weeklyRevenue,
      mealBreakdown,
      popularItems,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/analytics/settings - Fetch college settings
router.get('/settings', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!adminUser || !adminUser.collegeId) {
      return res.status(400).json({ error: 'Admin does not belong to a college' });
    }

    let settings = await prisma.collegeSettings.findUnique({
      where: { collegeId: adminUser.collegeId },
    });

    if (!settings) {
      settings = await prisma.collegeSettings.create({
        data: {
          collegeId: adminUser.collegeId,
          deliveryStartTime: '07:30',
          deliveryEndTime: '21:00',
          pollOpenTime: '18:00',
          pollCloseTime: '21:00',
          maxOrdersPerSlot: 50,
          deliverySlotDuration: 30,
          platformFeePercent: 5.0,
          maxPromoDiscountPercent: 20.0,
        },
      });
    }

    return res.json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/analytics/settings - Update college settings
router.patch('/settings', authenticateToken, async (req: any, res: any) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const { maxPromoDiscountPercent, deliveryStartTime, deliveryEndTime, platformFeePercent } = req.body;

  try {
    const adminUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!adminUser || !adminUser.collegeId) {
      return res.status(400).json({ error: 'Admin does not belong to a college' });
    }

    const settings = await prisma.collegeSettings.update({
      where: { collegeId: adminUser.collegeId },
      data: {
        ...(maxPromoDiscountPercent !== undefined && { maxPromoDiscountPercent: parseFloat(maxPromoDiscountPercent) }),
        ...(deliveryStartTime && { deliveryStartTime }),
        ...(deliveryEndTime && { deliveryEndTime }),
        ...(platformFeePercent !== undefined && { platformFeePercent: parseFloat(platformFeePercent) }),
      },
    });

    return res.json(settings);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
