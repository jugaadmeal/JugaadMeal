import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(notifications);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authenticateToken, async (req: any, res: any) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const notif = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    if (notif.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this notification' });
    }

    await prisma.notification.delete({
      where: { id: req.params.id },
    });

    return res.json({ message: 'Notification deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
