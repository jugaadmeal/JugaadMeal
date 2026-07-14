import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// GET /api/wallet - Get user wallet detail and balance with referral info
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0.0 },
        include: { transactions: true },
      });
    }

    // Sync referral code (self-healing for legacy users)
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && !user.referralCode) {
      const cleanName = user.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 4);
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const code = `CE-${cleanName || 'MEAL'}-${randomPart}`;
      
      user = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
    }

    return res.json({
      ...wallet,
      referralCode: user?.referralCode || '',
      referredById: user?.referredById || null,
      referralUsed: user?.referralUsed || false,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/topup - Simulates adding money via UPI/Cards
router.post('/topup', authenticateToken, async (req: any, res: any) => {
  const { amount, paymentMethod } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid deposit amount required' });
  }

  try {
    const userId = req.user.userId;

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0.0 },
      });
    }

    const updatedWallet = await prisma.$transaction(async (tx: any) => {
      const w = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: numAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: 'CREDIT_TOPUP',
          amount: numAmount,
          description: `Loaded balance via ${paymentMethod || 'UPI'}`,
          balanceAfter: w.balance,
        },
      });

      return w;
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        type: 'WALLET_CREDITED',
        title: '💰 Wallet Credited!',
        body: `₹${numAmount.toFixed(2)} added successfully. New Balance: ₹${updatedWallet.balance.toFixed(2)}`,
      },
    });

    return res.json(updatedWallet);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/wallet/transactions - List all wallet transactions
router.get('/transactions', authenticateToken, async (req: any, res: any) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
    });

    if (!wallet) {
      return res.json([]);
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(transactions);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/withdraw - Withdraw funds from wallet
router.post('/withdraw', authenticateToken, async (req: any, res: any) => {
  const { amount, upiId } = req.body;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid withdrawal amount required' });
  }

  if (!upiId || !upiId.trim()) {
    return res.status(400).json({ error: 'UPI ID is required for withdrawal routing' });
  }

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
    });

    if (!wallet || wallet.balance < numAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance for withdrawal' });
    }

    const updatedWallet = await prisma.$transaction(async (tx: any) => {
      const updated = await tx.wallet.update({
        where: { userId: req.user.userId },
        data: { balance: { decrement: numAmount } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT_WITHDRAW' as any,
          amount: numAmount,
          description: `Withdrawal transfer to UPI (${upiId.trim()})`,
          balanceAfter: wallet.balance - numAmount,
        },
      });

      return updated;
    });

    return res.json(updatedWallet);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/apply-referral - Apply a friend's referral code
router.post('/apply-referral', authenticateToken, async (req: any, res: any) => {
  const { code } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Referral code is required' });
  }

  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.referredById) return res.status(400).json({ error: 'You have already applied a referral code.' });

    // Check if they already placed an order (cannot apply referral retroactively after buying)
    const orderCount = await prisma.order.count({
      where: { userId, status: { not: 'CANCELLED' } }
    });
    if (orderCount > 0) {
      return res.status(400).json({ error: 'Referral codes can only be applied before placing your first order.' });
    }

    // Find the referring user
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code.trim().toUpperCase() }
    });

    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code. Please check and try again.' });
    }
    if (referrer.id === userId) {
      return res.status(400).json({ error: 'You cannot refer yourself.' });
    }

    // Link referredById
    await prisma.user.update({
      where: { id: userId },
      data: { referredById: referrer.id },
    });

    return res.json({ 
      message: 'Referral code applied successfully!', 
      referredByName: referrer.name 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/sign-payment - Generate signed payment session
router.post('/sign-payment', authenticateToken, async (req: any, res: any) => {
  const { amount } = req.body;
  const userId = req.user.userId;

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount required' });
  }

  try {
    const transactionId = `TXN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const payload = JSON.stringify({ userId, amount: numAmount.toFixed(2), transactionId });
    const signature = require('crypto').createHmac('sha256', 'campuseats-webhook-secret-key-999').update(payload).digest('hex');

    return res.json({
      userId,
      amount: numAmount.toFixed(2),
      transactionId,
      signature,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/wallet/webhook - Credit wallet only with validated payment signatures
router.post('/webhook', async (req: any, res: any) => {
  const signature = req.headers['x-payment-signature'];
  const { userId, amount, transactionId } = req.body;

  if (!signature) {
    return res.status(400).json({ error: 'Webhook payment signature header required' });
  }

  try {
    const payload = JSON.stringify({ userId, amount: parseFloat(amount).toFixed(2), transactionId });
    const expectedSignature = require('crypto')
      .createHmac('sha256', 'campuseats-webhook-secret-key-999')
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(403).json({ error: 'Invalid payment webhook signature signature check failed' });
    }

    // Check if transaction was already processed (idempotency safety)
    const existingTx = await prisma.walletTransaction.findFirst({
      where: { description: { contains: transactionId } },
    });
    if (existingTx) {
      return res.status(400).json({ error: 'Transaction has already been processed' });
    }

    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0.0 },
      });
    }

    const updatedWallet = await prisma.$transaction(async (tx: any) => {
      const w = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: parseFloat(amount) } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          type: 'CREDIT_TOPUP',
          amount: parseFloat(amount),
          description: `Loaded balance via Webhook Payment: #${transactionId}`,
          balanceAfter: w.balance,
        },
      });

      return w;
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId,
        type: 'WALLET_CREDITED',
        title: '💰 Wallet Top-up Verified!',
        body: `₹${parseFloat(amount).toFixed(2)} credited successfully via signed payment gateway. New Balance: ₹${updatedWallet.balance.toFixed(2)}`,
      },
    });

    return res.json({ status: 'success', wallet: updatedWallet });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
