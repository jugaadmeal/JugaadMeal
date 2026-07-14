import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from './auth';

const router = Router();

// Generate a random 6-character uppercase alphanumeric join code
function generateJoinCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper to broadcast socket updates to a group room
function broadcastGroupUpdate(app: any, groupCartId: string, event: string, data: any) {
  const io = app.get('io');
  if (io) {
    io.to(`group:${groupCartId}`).emit(event, data);
    console.log(`[Socket] Broadcasted ${event} to group:${groupCartId}`);
  }
}

// Helper to get group details
async function getGroupDetails(groupCartId: string) {
  return await prisma.groupCart.findUnique({
    where: { id: groupCartId },
    include: {
      initiator: { select: { id: true, name: true } },
      deliveryBlock: true,
      members: {
        include: {
          user: { select: { id: true, name: true, wallet: true } },
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      },
    },
  });
}

// 1. POST /api/group/create - Create a group cart
router.post('/create', authenticateToken, async (req: any, res: any) => {
  const { menuId, deliveryBlockId, deliveryAddress } = req.body;

  if (!menuId) {
    return res.status(400).json({ error: 'Menu ID is required' });
  }

  try {
    const userId = req.user.userId;

    // Check if user is already in an active group
    const activeMembership = await prisma.groupMember.findFirst({
      where: {
        userId,
        groupCart: { isActive: true },
      },
    });

    if (activeMembership) {
      return res.status(400).json({ 
        error: 'You are already in an active group cart. Leave your current group first.',
        groupCartId: activeMembership.groupCartId
      });
    }

    // Generate unique code
    let joinCode = generateJoinCode();
    let existing = await prisma.groupCart.findUnique({ where: { joinCode } });
    while (existing) {
      joinCode = generateJoinCode();
      existing = await prisma.groupCart.findUnique({ where: { joinCode } });
    }

    // Create group cart
    const groupCart = await prisma.groupCart.create({
      data: {
        joinCode,
        initiatorId: userId,
        menuId,
        deliveryBlockId,
        deliveryAddress,
        members: {
          create: {
            userId,
          },
        },
      },
    });

    const details = await getGroupDetails(groupCart.id);
    return res.status(201).json(details);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/group/join - Join a group cart via join code
router.post('/join', authenticateToken, async (req: any, res: any) => {
  const { joinCode } = req.body;

  if (!joinCode || !joinCode.trim()) {
    return res.status(400).json({ error: 'Join code is required' });
  }

  try {
    const userId = req.user.userId;

    const groupCart = await prisma.groupCart.findFirst({
      where: { 
        joinCode: joinCode.trim().toUpperCase(),
        isActive: true 
      },
    });

    if (!groupCart) {
      return res.status(404).json({ error: 'Active group cart not found' });
    }

    // Check if already a member
    let member = await prisma.groupMember.findFirst({
      where: {
        groupCartId: groupCart.id,
        userId,
      },
    });

    if (!member) {
      // Check if user is in *another* active group
      const otherMembership = await prisma.groupMember.findFirst({
        where: {
          userId,
          groupCart: { isActive: true },
        },
      });

      if (otherMembership) {
        return res.status(400).json({ 
          error: 'You are in another active group. Leave it before joining this one.',
          groupCartId: otherMembership.groupCartId
        });
      }

      member = await prisma.groupMember.create({
        data: {
          groupCartId: groupCart.id,
          userId,
        },
      });
    }

    const details = await getGroupDetails(groupCart.id);
    
    // Broadcast socket update
    broadcastGroupUpdate(req.app, groupCart.id, 'group:updated', details);

    return res.json(details);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 2.5 GET /api/group/active - Check if user has an active group cart session
router.get('/active', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const activeMember = await prisma.groupMember.findFirst({
      where: {
        userId,
        groupCart: { isActive: true },
      },
    });

    if (!activeMember) {
      return res.json(null);
    }

    const details = await getGroupDetails(activeMember.groupCartId);
    return res.json(details);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/group/details/:id - Fetch current group cart details
router.get('/details/:id', authenticateToken, async (req: any, res: any) => {
  try {
    const details = await getGroupDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Group cart not found' });
    }
    return res.json(details);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/group/items - Add / update items in the group cart
router.post('/items', authenticateToken, async (req: any, res: any) => {
  const { groupCartId, menuItemId, quantity } = req.body;

  if (!groupCartId || !menuItemId || quantity === undefined) {
    return res.status(400).json({ error: 'Group ID, Item ID, and quantity required' });
  }

  try {
    const userId = req.user.userId;

    const member = await prisma.groupMember.findFirst({
      where: {
        groupCartId,
        userId,
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this group cart' });
    }

    if (quantity <= 0) {
      // Remove item
      await prisma.groupCartItem.deleteMany({
        where: {
          groupMemberId: member.id,
          menuItemId,
        },
      });
    } else {
      // Upsert item
      const existingItem = await prisma.groupCartItem.findFirst({
        where: {
          groupMemberId: member.id,
          menuItemId,
        },
      });

      if (existingItem) {
        await prisma.groupCartItem.update({
          where: { id: existingItem.id },
          data: { quantity },
        });
      } else {
        await prisma.groupCartItem.create({
          data: {
            groupMemberId: member.id,
            menuItemId,
            quantity,
          },
        });
      }
    }

    const details = await getGroupDetails(groupCartId);
    
    // Broadcast updates
    broadcastGroupUpdate(req.app, groupCartId, 'group:updated', details);

    return res.json(details);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/group/leave - Leave the group cart
router.post('/leave', authenticateToken, async (req: any, res: any) => {
  const { groupCartId } = req.body;

  if (!groupCartId) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  try {
    const userId = req.user.userId;

    const group = await prisma.groupCart.findUnique({
      where: { id: groupCartId }
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.initiatorId === userId) {
      // Initiator leaves -> Close/deactivate group
      await prisma.groupCart.update({
        where: { id: groupCartId },
        data: { isActive: false },
      });

      broadcastGroupUpdate(req.app, groupCartId, 'group:disbanded', { message: 'Initiator closed the group.' });
    } else {
      // Regular member leaves -> delete member record
      await prisma.groupMember.deleteMany({
        where: {
          groupCartId,
          userId,
        },
      });

      const details = await getGroupDetails(groupCartId);
      broadcastGroupUpdate(req.app, groupCartId, 'group:updated', details);
    }

    return res.json({ message: 'Successfully left the group cart' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/group/checkout - Atomically split wallet payment & place combined order
router.post('/checkout', authenticateToken, async (req: any, res: any) => {
  const { groupCartId, deliveryBlockId, deliveryAddress } = req.body;

  if (!groupCartId) {
    return res.status(400).json({ error: 'Group ID is required' });
  }

  try {
    const userId = req.user.userId;

    const group = await prisma.groupCart.findUnique({
      where: { id: groupCartId },
      include: {
        deliveryBlock: true,
        menu: { include: { pricing: true } }
      }
    });

    if (!group || !group.isActive) {
      return res.status(400).json({ error: 'Active group cart not found' });
    }

    if (group.initiatorId !== userId) {
      return res.status(403).json({ error: 'Only the initiator can checkout the group cart' });
    }

    const details = await getGroupDetails(groupCartId);
    if (!details || details.members.length === 0) {
      return res.status(400).json({ error: 'No members in group cart' });
    }

    // Determine final delivery details
    const finalBlockId = deliveryBlockId || group.deliveryBlockId;
    const finalAddress = deliveryAddress || group.deliveryAddress;

    if (!finalBlockId || !finalAddress) {
      return res.status(400).json({ error: 'Delivery destination coordinates (Block + Address) required' });
    }

    // 1. Calculate pricing breakdown per member
    let totalSubtotal = 0;
    const memberBillShares: { 
      userId: string; 
      name: string; 
      subtotal: number;
      walletId: string;
      availableBalance: number;
      items: { menuItemId: string; quantity: number; unitPrice: number; totalPrice: number }[]
    }[] = [];

    const menuPricing = group.menu.pricing;
    const baseThaliPrice = menuPricing?.studentPrice || 80.0;
    const itemsCount = await prisma.menuItem.count({ where: { menuId: group.menuId } });
    const unitPrice = baseThaliPrice / (itemsCount || 1);

    for (const m of details.members) {
      let memberSubtotal = 0;
      const mItems: any[] = [];

      for (const ci of m.items) {
        const itemTotalPrice = unitPrice * ci.quantity;
        memberSubtotal += itemTotalPrice;
        mItems.push({
          menuItemId: ci.menuItemId,
          quantity: ci.quantity,
          unitPrice: parseFloat(unitPrice.toFixed(2)),
          totalPrice: parseFloat(itemTotalPrice.toFixed(2)),
        });
      }

      if (memberSubtotal > 0) {
        totalSubtotal += memberSubtotal;
        const wallet = m.user.wallet;
        if (!wallet) {
          return res.status(400).json({ error: `Wallet for member ${m.user.name} not found.` });
        }
        memberBillShares.push({
          userId: m.user.id,
          name: m.user.name,
          subtotal: memberSubtotal,
          walletId: wallet.id,
          availableBalance: wallet.balance,
          items: mItems,
        });
      }
    }

    if (memberBillShares.length === 0) {
      return res.status(400).json({ error: 'Group cart is empty. No items to check out.' });
    }

    // Overhead costs (Delivery fee, packaging, tax) split evenly or proportionally among participating members
    const deliveryFee = menuPricing?.deliveryFee || 10.0;
    const packagingFee = menuPricing?.packagingFee || 5.0;
    const tax = parseFloat((totalSubtotal * 0.05).toFixed(2));
    const totalOverhead = deliveryFee + packagingFee + tax;

    // Verify sufficient balance for all members
    const transactionDeductions: { walletId: string; userId: string; amount: number; description: string }[] = [];
    let cumulativeCheckoutTotal = 0;

    for (const share of memberBillShares) {
      // Proportional billing
      const proportion = share.subtotal / totalSubtotal;
      const memberOverhead = parseFloat((totalOverhead * proportion).toFixed(2));
      const memberTotal = parseFloat((share.subtotal + memberOverhead).toFixed(2));
      
      cumulativeCheckoutTotal += memberTotal;

      if (share.availableBalance < memberTotal) {
        return res.status(400).json({
          error: `Insufficient balance for group member: ${share.name}`,
          details: `Requires ₹${memberTotal.toFixed(2)}, has ₹${share.availableBalance.toFixed(2)}.`
        });
      }

      transactionDeductions.push({
        walletId: share.walletId,
        userId: share.userId,
        amount: memberTotal,
        description: dedDescription(share.subtotal, memberOverhead)
      });
    }

    function dedDescription(sub: number, over: number): string {
      return `Split Group Payment (Subtotal: ₹${sub.toFixed(2)}, Overhead share: ₹${over.toFixed(2)})`;
    }

    // 2. Perform Atomic Split Payment Wallet Deductions & Place Single Order in transaction
    const orderItemsToCreate = memberBillShares.flatMap((share) => 
      share.items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        customizations: `Ordered by ${share.name}`
      }))
    );

    const generatedOrderNum = `CE-GRP-${Date.now().toString().slice(-6)}`;
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const scheduledFor = new Date();
    scheduledFor.setMinutes(scheduledFor.getMinutes() + 30);

    const finalOrder = await prisma.$transaction(async (tx) => {
      // Debit wallets
      for (const ded of transactionDeductions) {
        const w = await tx.wallet.update({
          where: { userId: ded.userId },
          data: { balance: { decrement: ded.amount } }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: ded.walletId,
            type: 'DEBIT_ORDER',
            amount: ded.amount,
            description: ded.description,
            balanceAfter: w.balance
          }
        });

        await tx.notification.create({
          data: {
            userId: ded.userId,
            type: 'WALLET_DEBITED',
            title: 'Split Order Payment Debited 💸',
            body: `₹${ded.amount.toFixed(2)} debited for split group checkout ${generatedOrderNum}.`
          }
        });
      }

      // Close group cart
      await tx.groupCart.update({
        where: { id: groupCartId },
        data: { isActive: false }
      });

      // Create main Order
      return await tx.order.create({
        data: {
          orderNumber: generatedOrderNum,
          userId, // Initiator
          deliveryBlockId: finalBlockId,
          deliveryAddress: finalAddress,
          scheduledFor,
          subtotal: totalSubtotal,
          deliveryFee,
          packagingFee,
          tax,
          totalAmount: cumulativeCheckoutTotal,
          paymentMethod: 'WALLET',
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
          specialInstructions: `Group split order. Initiator: ${details.initiator.name}`,
          verificationCode,
          groupCartId,
          items: {
            create: orderItemsToCreate
          },
          statusHistory: {
            create: {
              status: 'CONFIRMED',
              note: 'Group split order paid and confirmed successfully'
            }
          }
        },
        include: {
          deliveryBlock: true,
          items: true
        }
      });
    });

    // Notify kitchen
    const io = req.app.get('io');
    if (io) {
      io.emit('kitchen:new_order', { order: finalOrder });
    }

    // Broadcast redirect to group cart socket room
    broadcastGroupUpdate(req.app, groupCartId, 'group:ordered', { orderId: finalOrder.id });

    return res.status(201).json(finalOrder);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
