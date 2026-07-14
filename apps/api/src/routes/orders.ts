import { Router } from 'express';
import { OrderStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// Helper to generate a unique order number
const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `CE-${year}-${rand}`;
};

// Helper to verify if an agent exceeds concurrent orders cap of their active shift
const checkShiftOrderCap = async (agentId: string) => {
  const now = new Date();
  
  // Find if agent is on any active shift right now
  const activeAssignment = await prisma.shiftAssignment.findFirst({
    where: {
      agentId,
      shift: {
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
    include: { shift: true },
  });

  if (!activeAssignment) {
    return { allowed: true };
  }

  const shift = activeAssignment.shift;
  const maxCap = shift.maxConcurrentOrders;

  // Count active claimed/delivering orders for this agent
  const activeOrdersCount = await prisma.order.count({
    where: {
      agentId,
      status: { in: ['READY', 'OUT_FOR_DELIVERY'] },
    },
  });

  if (activeOrdersCount >= maxCap) {
    return {
      allowed: false,
      message: `You have reached the concurrent order cap of ${maxCap} for your current active shift "${shift.name}". Complete active deliveries before claiming more!`,
    };
  }

  return { allowed: true };
};

// GET /api/orders - Get orders (role-based)
router.get('/', authenticateToken, async (req: any, res: any) => {
  try {
    const { userId, role } = req.user;

    let orders;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      orders = await prisma.order.findMany({
        include: {
          user: { select: { name: true, email: true, phone: true } },
          deliveryBlock: true,
          items: { include: { menuItem: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'KITCHEN_STAFF') {
      // Kitchen wants orders that are confirmed, preparing, or ready
      orders = await prisma.order.findMany({
        where: {
          status: { in: ['CONFIRMED', 'PREPARING', 'READY'] },
        },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          deliveryBlock: true,
          items: { include: { menuItem: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    } else if (role === 'DELIVERY_AGENT') {
      // Agent wants orders assigned to them, or ready for pickup
      orders = await prisma.order.findMany({
        where: {
          OR: [
            { agentId: userId },
            { status: 'READY' },
          ],
        },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          deliveryBlock: true,
          items: { include: { menuItem: true } },
        },
        orderBy: { scheduledFor: 'asc' },
      });
    } else {
      // Student
      orders = await prisma.order.findMany({
        where: { userId },
        include: {
          deliveryBlock: true,
          items: { include: { menuItem: true } },
          agent: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const activeStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING'];
    const enrichedOrders = await Promise.all(
      orders.map(async (o) => {
        let queuePosition = null;
        if (activeStatuses.includes(o.status)) {
          queuePosition = await prisma.order.count({
            where: {
              status: { in: activeStatuses },
              createdAt: { lt: o.createdAt },
            },
          }) + 1;
        }
        return {
          ...o,
          queuePosition,
        };
      })
    );

    return res.json(enrichedOrders);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:id - Get details of order
router.get('/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        deliveryBlock: true,
        items: { include: { menuItem: true } },
        agent: { select: { name: true, phone: true } },
        statusHistory: true,
      },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Enforce role checks
    if (
      req.user.role === 'STUDENT' &&
      order.userId !== req.user.userId
    ) {
      return res.status(403).json({ error: 'Unauthorized to view this order' });
    }

    const activeStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING'];
    let queuePosition = null;
    if (activeStatuses.includes(order.status)) {
      queuePosition = await prisma.order.count({
        where: {
          status: { in: activeStatuses },
          createdAt: { lt: order.createdAt },
        },
      }) + 1;
    }

    return res.json({
      ...order,
      queuePosition,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/orders - Place order
router.post('/', authenticateToken, async (req: any, res: any) => {
  const {
    menuId,
    items, // Array of { menuItemId, quantity }
    deliveryBlockId,
    deliveryAddress,
    paymentMethod,
    couponCode,
    specialInstructions,
    isLockerPickup,
    lockerId,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    const userId = req.user.userId;

    // Validate payment method
    const validPaymentMethods = ['WALLET', 'UPI', 'CASH_ON_DELIVERY'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method: ${paymentMethod}. Must be WALLET, UPI, or CASH_ON_DELIVERY.` });
    }

    // Validate block
    const block = await prisma.block.findUnique({
      where: { id: deliveryBlockId },
    });
    if (!block) return res.status(400).json({ error: 'Invalid delivery block' });

    // Validate and fetch pricing
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: { pricing: true, items: true },
    });

    if (!menu) return res.status(404).json({ error: 'Menu not found' });

    // Calculate pricing based on items
    let subtotal = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      const dbItem = menu.items.find((i) => i.id === item.menuItemId);
      if (!dbItem || !dbItem.isAvailable) {
        return res.status(400).json({ error: `Item ${item.menuItemId} is not available` });
      }

      // Base menu item calculation
      const price = menu.pricing?.studentPrice || 80;
      const unitPrice = price / menu.items.length; // Split thali price per item
      const itemTotalPrice = unitPrice * item.quantity;
      subtotal += itemTotalPrice;

      orderItemsToCreate.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        totalPrice: parseFloat(itemTotalPrice.toFixed(2)),
      });
    }

    const deliveryFee = menu.pricing?.deliveryFee || 10;
    const packagingFee = menu.pricing?.packagingFee || 5;
    const tax = parseFloat((subtotal * 0.05).toFixed(2)); // 5% tax

    let discount = 0;
    let couponId = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive && new Date() < coupon.validUntil && subtotal >= coupon.minOrderValue) {
        couponId = coupon.id;
        if (coupon.discountType === 'FLAT') {
          discount = coupon.discountValue;
        } else if (coupon.discountType === 'PERCENTAGE') {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        }
      }
    }

    const totalAmount = parseFloat(Math.max(0, subtotal + deliveryFee + packagingFee + tax - discount).toFixed(2));

    // Handle Wallet Payment (Allow max coverage from promoBalance based on college settings, rest from main balance)
    if (paymentMethod === 'WALLET') {
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        return res.status(400).json({ error: 'Wallet not found' });
      }

      // Fetch college settings for promo cap limits
      const studentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { college: { include: { settings: true } } },
      });
      const maxPromoPercent = studentUser?.college?.settings?.maxPromoDiscountPercent ?? 20.0;
      const promoFactor = maxPromoPercent / 100;

      const maxPromoDeduct = parseFloat((totalAmount * promoFactor).toFixed(2));
      const promoDeducted = parseFloat(Math.min(wallet.promoBalance, maxPromoDeduct).toFixed(2));
      const realDeducted = parseFloat((totalAmount - promoDeducted).toFixed(2));

      if (wallet.balance < realDeducted) {
        return res.status(400).json({ 
          error: `Insufficient wallet balance. Real Cash required: ₹${realDeducted.toFixed(2)} (Available: ₹${wallet.balance.toFixed(2)}). You can cover up to ${maxPromoPercent}% using promo coins: ₹${maxPromoDeduct.toFixed(2)}.` 
        });
      }

      // Deduct balances
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId },
          data: { 
            balance: { decrement: realDeducted },
            promoBalance: { decrement: promoDeducted }
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'DEBIT_ORDER',
            amount: totalAmount,
            description: `Order Payment (Real: ₹${realDeducted.toFixed(2)}, Coins: ₹${promoDeducted.toFixed(2)})`,
            balanceAfter: (wallet.balance - realDeducted) + (wallet.promoBalance - promoDeducted),
          },
        });
      });
    }

    // Create Order
    const scheduledFor = new Date();
    scheduledFor.setMinutes(scheduledFor.getMinutes() + 30); // Est slot: next 30 mins

    const orderNum = generateOrderNumber();
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNum,
        userId,
        deliveryBlockId,
        deliveryAddress,
        scheduledFor,
        subtotal,
        deliveryFee,
        packagingFee,
        discount,
        tax,
        totalAmount,
        paymentMethod: paymentMethod as any,
        paymentStatus: paymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
        status: paymentMethod === 'WALLET' ? 'CONFIRMED' : 'PENDING',
        specialInstructions,
        couponId,
        verificationCode,
        isLockerPickup: isLockerPickup || false,
        lockerId: isLockerPickup ? lockerId : null,
        items: {
          create: orderItemsToCreate,
        },
        statusHistory: {
          create: {
            status: paymentMethod === 'WALLET' ? 'CONFIRMED' : 'PENDING',
            note: 'Order placed successfully',
          },
        },
      },
      include: {
        deliveryBlock: true,
        items: { include: { menuItem: true } },
      },
    });

    // Notify kitchen via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('kitchen:new_order', { order });
    }

    // Check and trigger referral code cashback on first successful order
    try {
      const studentUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (studentUser && studentUser.referredById && !studentUser.referralUsed) {
        // Double check they have no other non-cancelled orders
        const previousOrders = await prisma.order.count({
          where: { 
            userId, 
            id: { not: order.id },
            status: { not: 'CANCELLED' } 
          }
        });

        if (previousOrders === 0) {
          const referrerId = studentUser.referredById;

          // 1. Reward Referee (first order cashback of ₹50.00)
          const refereeWallet = await prisma.wallet.findUnique({ where: { userId } });
          if (refereeWallet) {
            const updatedRefWallet = await prisma.wallet.update({
              where: { id: refereeWallet.id },
              data: { balance: { increment: 50.0 } }
            });
            await prisma.walletTransaction.create({
              data: {
                walletId: refereeWallet.id,
                type: 'CASHBACK',
                amount: 50.0,
                description: `🎉 First order referral cashback reward!`,
                balanceAfter: updatedRefWallet.balance,
                referenceId: order.id
              }
            });
            await prisma.notification.create({
              data: {
                userId,
                type: 'WALLET_CREDITED',
                title: '🎉 Referral Cashback Credited! 💰',
                body: 'You received ₹50.00 cashback in your wallet for using a referral code!',
              }
            });
          }

          // 2. Reward Referrer (referral bonus of ₹50.00)
          const referrerWallet = await prisma.wallet.findUnique({ where: { userId: referrerId } });
          if (referrerWallet) {
            const updatedRefWallet = await prisma.wallet.update({
              where: { id: referrerWallet.id },
              data: { balance: { increment: 50.0 } }
            });
            await prisma.walletTransaction.create({
              data: {
                walletId: referrerWallet.id,
                type: 'CASHBACK',
                amount: 50.0,
                description: `🎉 Referral bonus for referring a friend!`,
                balanceAfter: updatedRefWallet.balance,
                referenceId: order.id
              }
            });
            await prisma.notification.create({
              data: {
                userId: referrerId,
                type: 'WALLET_CREDITED',
                title: '🎉 Referral Bonus Received! 💰',
                body: `${studentUser.name} placed their first order! ₹50.00 cashback has been credited.`,
              }
            });
          }

          // 3. Mark referral as used
          await prisma.user.update({
            where: { id: userId },
            data: { referralUsed: true }
          });
        }
      }
    } catch (refError) {
      console.error('[Referral System] Error processing referral rewards:', refError);
    }

    return res.status(201).json(order);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/status - Update order status (Kitchen / Delivery Agent / Admin)
router.patch('/:id/status', authenticateToken, async (req: any, res: any) => {
  const { status, note } = req.body;
  const orderId = req.params.id;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Validate role permissions from Database (to allow dynamic role switching)
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!dbUser || dbUser.role === 'STUDENT') {
      return res.status(403).json({ error: 'Students cannot modify order status' });
    }
    const { role, id: userId } = dbUser;

    let updateData: any = { status: status as any };

    // Auto assign delivery agent if status changes to OUT_FOR_DELIVERY and no agent is assigned
    if (status === 'OUT_FOR_DELIVERY' && !order.agentId) {
      // Find a delivery agent ( Raman Preet seeded or any agent )
      const deliveryAgent = await prisma.user.findFirst({
        where: { role: 'DELIVERY_AGENT' },
      });
      if (deliveryAgent) {
        updateData.agentId = deliveryAgent.id;
        updateData.estimatedDelivery = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
      }
    }

    if (status === 'DELIVERED') {
      const { code } = req.body;
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        if (order.verificationCode && order.verificationCode !== code) {
          return res.status(400).json({ error: 'Invalid delivery verification PIN. Please verify code with the student.' });
        }
      }
      updateData.actualDelivery = new Date();
      updateData.paymentStatus = 'PAID'; // Paid on cash delivery

      // Credit rider's wallet
      const riderId = order.agentId || userId; // fallback to current user if no agent pre-assigned
      if (riderId) {
        let riderWallet = await prisma.wallet.findUnique({
          where: { userId: riderId },
        });
        if (!riderWallet) {
          riderWallet = await prisma.wallet.create({
            data: { userId: riderId, balance: 0.0 },
          });
        }

        await prisma.$transaction([
          prisma.wallet.update({
            where: { userId: riderId },
            data: { balance: { increment: 15.0 } },
          }),
          prisma.walletTransaction.create({
            data: {
              walletId: riderWallet.id,
              type: 'CREDIT_BONUS',
              amount: 15.0,
              description: `Rider payout: order delivery #${order.orderNumber}`,
              balanceAfter: riderWallet.balance + 15.0,
            },
          }),
        ]);
      }
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...updateData,
        statusHistory: {
          create: {
            status: status as any,
            note: note || `Status updated to ${status.toLowerCase().replace(/_/g, ' ')}`,
            updatedBy: userId,
          },
        },
      },
      include: {
        deliveryBlock: true,
        items: { include: { menuItem: true } },
        agent: { select: { name: true, phone: true } },
      },
    });

    // Create Notification type matching enums
    let notifType: any = 'SYSTEM_ANNOUNCEMENT';
    let notifTitle = 'Order Update';
    let notifBody = `Your order ${order.orderNumber} is now ${status.toLowerCase()}`;

    if (status === 'CONFIRMED') {
      notifType = 'ORDER_CONFIRMED';
      notifTitle = '🍽️ Order Confirmed';
      notifBody = `Your payment for order ${order.orderNumber} has been received.`;
    } else if (status === 'PREPARING') {
      notifType = 'ORDER_PREPARING';
      notifTitle = '🔥 Order Preparing';
      notifBody = `The kitchen is preparing your delicious meal.`;
    } else if (status === 'READY') {
      notifType = 'SYSTEM_ANNOUNCEMENT'; // fallback or order ready
      notifTitle = '📦 Order Ready';
      notifBody = `Your order ${order.orderNumber} is ready for pickup!`;
    } else if (status === 'OUT_FOR_DELIVERY') {
      notifType = 'ORDER_OUT_FOR_DELIVERY';
      notifTitle = '🚴 Out for Delivery';
      const agentName = updatedOrder?.agent?.name || 'our agent';
      notifBody = `${agentName} has picked up your order and is heading to your block.`;
    } else if (status === 'DELIVERED') {
      notifType = 'ORDER_DELIVERED';
      notifTitle = '😋 Delivered!';
      notifBody = `Bon appétit! Your order was delivered at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
    } else if (status === 'CANCELLED') {
      notifType = 'ORDER_CANCELLED';
      notifTitle = '❌ Order Cancelled';
      notifBody = `Your order ${order.orderNumber} was cancelled. Refund processed if paid.`;
    }

    // Insert Notification
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: notifType,
        title: notifTitle,
        body: notifBody,
        data: { orderId },
      },
    });

    // Send Real-time Socket.io update
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status_updated', {
        orderId,
        status,
        timestamp: new Date().toISOString(),
        order: updatedOrder,
      });

      // Broadcast updated queue positions to all active orders
      const activeStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING'];
      prisma.order.findMany({
        where: { status: { in: activeStatuses } },
        orderBy: { createdAt: 'asc' },
      }).then((activeOrders) => {
        activeOrders.forEach((o, index) => {
          io.emit('order:queue_update', {
            orderId: o.id,
            queuePosition: index + 1,
          });
        });
      }).catch((err) => {
        console.error('Error broadcasting queue updates:', err);
      });

      // Simulate live agent movement if out for delivery
      if (status === 'OUT_FOR_DELIVERY') {
        let mins = 15;
        const interval = setInterval(async () => {
          mins -= 2;
          if (mins <= 0) {
            clearInterval(interval);
            return;
          }
          const baseLat = 30.7685;
          const baseLng = 76.5752;
          io.emit('order:agent_location', {
            orderId,
            lat: baseLat + Math.random() * 0.002,
            lng: baseLng + Math.random() * 0.002,
            eta: `${mins} mins`,
          });
        }, 10000); // every 10 secs
      }
    }

    return res.json(updatedOrder);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:id/claim - Claim delivery of an order (Rider Only)
router.post('/:id/claim', authenticateToken, async (req: any, res: any) => {
  const orderId = req.params.id;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!dbUser || (dbUser.role !== 'DELIVERY_AGENT' && dbUser.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only delivery agents can claim orders' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.agentId) return res.status(400).json({ error: 'Order has already been claimed by another rider' });

    // Shift concurrency order cap check
    const shiftCheck = await checkShiftOrderCap(dbUser.id);
    if (!shiftCheck.allowed) {
      return res.status(400).json({ error: shiftCheck.message });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        agentId: dbUser.id,
        estimatedDelivery: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
        statusHistory: {
          create: {
            status: order.status,
            note: `Rider ${dbUser.name} claimed this order for delivery`,
            updatedBy: dbUser.id,
          },
        },
      },
      include: {
        deliveryBlock: true,
        items: { include: { menuItem: true } },
        agent: { select: { name: true, phone: true } },
      },
    });

    // Notify student about rider assignment
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'ORDER_OUT_FOR_DELIVERY',
        title: '🚴 Rider Assigned!',
        body: `Rider ${dbUser.name} has claimed your order and will drop it off at ${updatedOrder.deliveryBlock.name} shortly!`,
      },
    });

    // Send Real-time Socket.io update
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status_updated', {
        orderId,
        status: updatedOrder.status,
        timestamp: new Date().toISOString(),
        order: updatedOrder,
      });
    }

    return res.json(updatedOrder);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:id/locker-drop - Drop off order in campus locker cell (Rider Only)
router.post('/:id/locker-drop', authenticateToken, async (req: any, res: any) => {
  const orderId = req.params.id;
  const { lockerId, passcode } = req.body;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!dbUser || (dbUser.role !== 'DELIVERY_AGENT' && dbUser.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only delivery agents can execute locker drop-offs' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { deliveryBlock: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.agentId !== dbUser.id && dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not the assigned rider for this order' });
    }

    // Check locker
    const locker = await prisma.locker.findUnique({
      where: { id: lockerId },
    });
    if (!locker) return res.status(400).json({ error: 'Locker cell not found' });
    if (locker.isOccupied) return res.status(400).json({ error: 'Locker cell is already occupied' });

    // Generate random 4-digit collection PIN if none provided
    const collectionPIN = passcode || Math.floor(1000 + Math.random() * 9000).toString();

    // Fetch rider wallet
    let riderWallet = await prisma.wallet.findUnique({
      where: { userId: dbUser.id },
    });
    if (!riderWallet) {
      riderWallet = await prisma.wallet.create({
        data: { userId: dbUser.id, balance: 0.0 },
      });
    }

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          isLockerPickup: true,
          lockerId,
          lockerPasscode: collectionPIN,
          lockerDroppedAt: new Date(),
          actualDelivery: new Date(),
          paymentStatus: 'PAID',
          statusHistory: {
            create: {
              status: 'DELIVERED',
              note: `Locker drop-off completed in cell ${locker.code} with collect PIN ${collectionPIN}`,
              updatedBy: dbUser.id,
            },
          },
        },
        include: {
          deliveryBlock: true,
          items: { include: { menuItem: true } },
          agent: { select: { name: true, phone: true } },
        },
      }),
      prisma.locker.update({
        where: { id: lockerId },
        data: { isOccupied: true },
      }),
      prisma.wallet.update({
        where: { userId: dbUser.id },
        data: { balance: { increment: 15.0 } },
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: riderWallet.id,
          type: 'CREDIT_BONUS',
          amount: 15.0,
          description: `Rider payout: locker drop-off order #${order.orderNumber}`,
          balanceAfter: riderWallet.balance + 15.0,
        },
      }),
    ]);

    // Send notification
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'ORDER_DELIVERED',
        title: '🍱 Dropped in Locker!',
        body: `Your thali has been dropped off at locker ${locker.code} in ${order.deliveryBlock.name}. Collect code: ${collectionPIN}.`,
      },
    });

    // Send Real-time Socket.io update
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status_updated', {
        orderId,
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        order: updatedOrder,
      });
    }

    return res.json(updatedOrder);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/:id/cancel - Cancel order
router.post('/:id/cancel', authenticateToken, async (req: any, res: any) => {
  const orderId = req.params.id;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Restrict student cancellation to pending/confirmed only
    if (req.user.role === 'STUDENT') {
      if (order.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized to cancel this order' });
      }
      if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
        return res.status(400).json({ error: 'Cannot cancel order once preparation has started' });
      }
    }

    // Perform cancel & refund
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus as any,
          statusHistory: {
            create: {
              status: 'CANCELLED',
              note: 'Order cancelled by user',
              updatedBy: req.user.userId,
            },
          },
        },
      });

      // If user paid from wallet, refund
      if (order.paymentMethod === 'WALLET' && order.paymentStatus === 'PAID') {
        const wallet = await tx.wallet.findUnique({
          where: { userId: order.userId },
        });
        if (wallet) {
          await tx.wallet.update({
            where: { userId: order.userId },
            data: { balance: { increment: order.totalAmount } },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'CREDIT_REFUND',
              amount: order.totalAmount,
              description: `Refund for cancelled order ${order.orderNumber}`,
              balanceAfter: wallet.balance + order.totalAmount,
            },
          });
        }
      }
    });

    // Notify user
    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: 'ORDER_CANCELLED',
        title: '❌ Order Cancelled',
        body: `Order ${order.orderNumber} has been successfully cancelled and refunded.`,
        data: { orderId },
      },
    });

    // Socket.io emit
    const io = req.app.get('io');
    if (io) {
      io.emit('order:status_updated', {
        orderId,
        status: 'CANCELLED',
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({ message: 'Order cancelled and refunded successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
