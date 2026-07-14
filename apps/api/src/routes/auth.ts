import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'campuseats-super-secret-key-123';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'campuseats-refresh-token-secret-999';

// Map to store verification codes in-memory (OTP)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

// In-memory rate limiting map for OTP requests
const otpLimitStore = new Map<string, { count: number; lastRequestedAt: number; lockedUntil: number }>();

// In-memory JWT refresh tokens families store
export const refreshTokensStore = new Map<string, { userId: string; familyId: string; isUsed: boolean; expiresAt: number }>();

// 1. Send OTP (with rate limits + lockout)
router.post('/send-otp', async (req: any, res: any) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone number is required' });
  }

  const key = email || phone;
  const now = Date.now();

  // Rate limit and lockout check
  const rateLimit = otpLimitStore.get(key) || { count: 0, lastRequestedAt: 0, lockedUntil: 0 };
  
  if (rateLimit.lockedUntil > now) {
    const remainingTime = Math.ceil((rateLimit.lockedUntil - now) / (60 * 1000));
    return res.status(429).json({ error: `Too many attempts. You are locked out for another ${remainingTime} minutes.` });
  }

  // Check requests window (sliding 10 mins)
  if (now - rateLimit.lastRequestedAt < 10 * 60 * 1000) {
    if (rateLimit.count >= 5) {
      rateLimit.lockedUntil = now + 15 * 60 * 1000; // 15 mins lockout
      rateLimit.count = 0;
      otpLimitStore.set(key, rateLimit);
      return res.status(429).json({ error: 'Too many OTP requests. Locked out for 15 minutes.' });
    }
    rateLimit.count += 1;
  } else {
    rateLimit.count = 1;
  }
  rateLimit.lastRequestedAt = now;
  otpLimitStore.set(key, rateLimit);

  const otp = '123456'; // Default OTP for development convenience
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes expiry

  otpStore.set(key, { code: otp, expiresAt });

  console.log(`[OTP] Generated verification code for ${key}: ${otp}`);

  // Return success
  return res.json({
    message: 'OTP sent successfully (Use 123456 for testing)',
    expiresAt,
  });
});

// 2. Verify OTP
router.post('/verify-otp', async (req: any, res: any) => {
  const { email, phone, otp, name, role } = req.body;

  if ((!email && !phone) || !otp) {
    return res.status(400).json({ error: 'Identity identifier and OTP are required' });
  }

  const key = email || phone;
  const record = otpStore.get(key);

  if (!record) {
    return res.status(400).json({ error: 'OTP not requested or expired' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return res.status(400).json({ error: 'OTP expired' });
  }

  if (otp !== record.code) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Clear OTP on success
  otpStore.delete(key);

  // Fetch or create user
  let user = await prisma.user.findFirst({
    where: email ? { email } : { phone },
    include: { wallet: true },
  });

  if (user && !user.collegeId) {
    const college = await prisma.college.findFirst();
    if (college) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { collegeId: college.id },
        include: { wallet: true },
      });
    }
  }

  if (!user) {
    // Determine a default college
    const college = await prisma.college.findFirst();
    const collegeId = college ? college.id : undefined;

    user = await prisma.user.create({
      data: {
        email: email || `${phone}@mock.edu`,
        phone: phone || null,
        name: name || (email ? email.split('@')[0] : 'User'),
        role: role || 'STUDENT',
        collegeId,
        isVerified: true,
        wallet: {
          create: {
            balance: 500.0, // Welcome bonus of ₹500
          },
        },
      },
      include: { wallet: true },
    });

    // Create wallet transaction
    await prisma.walletTransaction.create({
      data: {
        walletId: user.wallet!.id,
        type: 'CREDIT_TOPUP',
        amount: 500.0,
        description: 'Welcome Sign Up Bonus',
        balanceAfter: 500.0,
      },
    });
  }

  // Generate short-lived access token and a long-lived refresh token
  const familyId = Math.random().toString(36).substring(7);
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id, familyId },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Store refresh token
  refreshTokensStore.set(refreshToken, {
    userId: user.id,
    familyId,
    isUsed: false,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return res.json({
    token,
    refreshToken,
    user: {
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
    },
  });
});

// POST /api/auth/refresh - Rotate JWT access & refresh tokens with reuse detection
router.post('/refresh', async (req: any, res: any) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    // 1. Verify refresh token signature
    const decoded: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    
    // 2. Fetch record from store
    const record = refreshTokensStore.get(refreshToken);
    if (!record) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // 3. Token Reuse Detection!
    if (record.isUsed) {
      console.warn(`[Security Alert] Refresh token reuse detected for family: ${record.familyId}! Invaliding all tokens.`);
      
      // Revoke all tokens in this family chain
      for (const [token, details] of refreshTokensStore.entries()) {
        if (details.familyId === record.familyId || details.userId === record.userId) {
          refreshTokensStore.delete(token);
        }
      }
      return res.status(403).json({ error: 'Security alert: Refresh token reuse detected. Revoked all sessions. Please log in again.' });
    }

    // 4. Mark old token as used
    record.isUsed = true;
    refreshTokensStore.set(refreshToken, record);

    // 5. Fetch user details to generate a fresh token
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // 6. Issue rotated pair
    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const newRefreshToken = jwt.sign(
      { userId: user.id, familyId: record.familyId },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Store the new refresh token
    refreshTokensStore.set(newRefreshToken, {
      userId: user.id,
      familyId: record.familyId,
      isUsed: false,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

// Middleware to protect routes and inject user
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

export default router;
