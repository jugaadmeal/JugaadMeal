import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Route imports
import authRouter from './routes/auth';
import menuRouter from './routes/menu';
import pollRouter from './routes/polls';
import orderRouter from './routes/orders';
import walletRouter from './routes/wallet';
import reviewRouter from './routes/reviews';
import notificationRouter from './routes/notifications';
import analyticsRouter from './routes/analytics';
import couponRouter from './routes/coupons';
import userRouter from './routes/users';
import groupRouter from './routes/group';
import subscriptionsRouter from './routes/subscriptions';
import lockersRouter from './routes/lockers';
import shiftsRouter from './routes/shifts';

const app = express();
const PORT = process.env.PORT || 5000;

// Custom Helmet-equivalent Security Headers Middleware
const securityHeaders = (req: any, res: any, next: any) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' *;"
  );
  next();
};

// Custom HTML Stripper Input Sanitization Middleware
const sanitizeString = (str: string): string => {
  return str.replace(/<[^>]*>/g, '').trim();
};

const sanitizeObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object') {
      obj[key] = sanitizeObject(obj[key]);
    }
  }
  return obj;
};

const sanitizeMiddleware = (req: any, res: any, next: any) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  next();
};

// CORS Allowlist origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://campuseat.vercel.app',
  'https://jugaadmeal.vercel.app',
];

const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by security CORS policy'));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint', 'X-Payment-Signature'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(securityHeaders);
app.use(sanitizeMiddleware);

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store io instance on app context to make it accessible in routes
app.set('io', io);

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Subscribe to specific rooms
  socket.on('subscribe:order', ({ orderId }) => {
    socket.join(`order:${orderId}`);
    console.log(`[Socket] Client ${socket.id} subscribed to order:${orderId}`);
  });

  socket.on('subscribe:poll', ({ pollId }) => {
    socket.join(`poll:${pollId}`);
    console.log(`[Socket] Client ${socket.id} subscribed to poll:${pollId}`);
  });

  socket.on('subscribe:group', ({ groupCartId }) => {
    socket.join(`group:${groupCartId}`);
    console.log(`[Socket] Client ${socket.id} joined group room: group:${groupCartId}`);
  });

  socket.on('kitchen:subscribe', () => {
    socket.join('kitchen:orders');
    console.log(`[Socket] Kitchen dashboard joined kitchen:orders`);
  });

  socket.on('agent:location_update', ({ orderId, lat, lng }) => {
    // Broadcast location update to all listening clients for this order
    io.to(`order:${orderId}`).emit('order:agent_location', {
      orderId,
      lat,
      lng,
      eta: '5 mins',
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/menus', menuRouter);
app.use('/api/polls', pollRouter);
app.use('/api/orders', orderRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/reviews', reviewRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/users', userRouter);
app.use('/api/group', groupRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/lockers', lockersRouter);
app.use('/api/shifts', shiftsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('[Error Middleware]', err.stack || err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

import { runNudgeJob } from './jobs/nudgeJob';
import { runSubscriptionAutoOrderJob } from './jobs/subscriptionJob';

// Start listening
httpServer.listen(PORT, () => {
  console.log(`🚀 CampusEats API Server running on port ${PORT}`);
  
  // Start personalized poll nudge job to run every 12 hours
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await runNudgeJob();
    } catch (err) {
      console.error('[Scheduler] Error running personalized nudge job:', err);
    }
  }, TWELVE_HOURS);

  // Start daily subscription thali pass placement checks every 1 hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await runSubscriptionAutoOrderJob();
    } catch (err) {
      console.error('[Scheduler] Error running subscription pass checks:', err);
    }
  }, ONE_HOUR);
  
  // Run once on startup after 30 seconds
  setTimeout(async () => {
    try {
      await runNudgeJob();
      await runSubscriptionAutoOrderJob();
    } catch (err) {
      console.error('[Scheduler] Initial job execution error on startup:', err);
    }
  }, 15000);
});
