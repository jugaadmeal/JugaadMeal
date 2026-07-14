import prisma from '../lib/prisma';

export async function runSubscriptionAutoOrderJob() {
  console.log('[Subscription Job] Starting automatic thali pass ordering checks...');
  try {
    const now = new Date();
    const todayStr = now.toDateString();

    // Fetch all active subscriptions
    const activeSubs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        user: true,
        menu: { include: { items: true } },
      },
    });

    console.log(`[Subscription Job] Found ${activeSubs.length} active subscription passes.`);

    for (const sub of activeSubs) {
      // 1. Check if we already auto-placed an order for this subscription today
      if (sub.lastOrderedDate) {
        const lastOrderedStr = new Date(sub.lastOrderedDate).toDateString();
        if (lastOrderedStr === todayStr) {
          console.log(`[Subscription Job] Skip: user ${sub.user.name} already received auto-order today.`);
          continue;
        }
      }

      // Check for any orders linked to this subscription created today
      const alreadyPlacedToday = await prisma.order.count({
        where: {
          subscriptionId: sub.id,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      if (alreadyPlacedToday > 0) {
        console.log(`[Subscription Job] Skip: order count is greater than 0 today for sub ${sub.id}.`);
        continue;
      }

      // 2. Auto-place order
      const itemsToOrder = sub.menu.items.map((item: any) => ({
        menuItemId: item.id,
        quantity: 1,
        unitPrice: 0.0, // Prepaid thali pass order
        totalPrice: 0.0,
      }));

      if (itemsToOrder.length === 0) {
        console.log(`[Subscription Job] Warning: no items in menu thali for sub ${sub.id}. Skipping.`);
        continue;
      }

      const generatedOrderNum = `CE-SUB-${Date.now().toString().slice(-6)}`;
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
      const scheduledFor = new Date();
      
      // Parse slot time (e.g. "12:30") and set it for delivery time today
      if (sub.preferredSlot && sub.preferredSlot !== 'ASAP') {
        const [hours, minutes] = sub.preferredSlot.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          scheduledFor.setHours(hours, minutes, 0, 0);
        }
      } else {
        scheduledFor.setMinutes(scheduledFor.getMinutes() + 30);
      }

      await prisma.$transaction(async (tx: any) => {
        // Place the prepaid order
        const order = await tx.order.create({
          data: {
            orderNumber: generatedOrderNum,
            userId: sub.userId,
            deliveryBlockId: sub.deliveryBlockId,
            deliveryAddress: sub.deliveryAddress,
            scheduledFor,
            subtotal: 0.0,
            deliveryFee: 0.0,
            packagingFee: 0.0,
            tax: 0.0,
            totalAmount: 0.0,
            paymentMethod: 'WALLET',
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            specialInstructions: `🎫 Auto-Placed prepaid Daily Pass thali. Delivery slot: ${sub.preferredSlot}`,
            verificationCode,
            subscriptionId: sub.id,
            items: {
              create: itemsToOrder,
            },
            statusHistory: {
              create: {
                status: 'CONFIRMED',
                note: 'Prepaid thali pass auto-scheduled successfully',
              },
            },
          },
        });

        // Update last ordered timestamp on subscription
        await tx.subscription.update({
          where: { id: sub.id },
          data: { lastOrderedDate: now },
        });

        // Notify user about placement
        await tx.notification.create({
          data: {
            userId: sub.userId,
            type: 'ORDER_CONFIRMED',
            title: '🎫 Thali Pass Order Placed!',
            body: `Your prepaid daily pass order has been scheduled for delivery at ${sub.preferredSlot} to room ${sub.deliveryAddress}!`,
          },
        });

        console.log(`[Subscription Job] Placed thali order ${generatedOrderNum} for subscriber ${sub.user.name}`);
      });
    }

    console.log('[Subscription Job] Finished thali pass checks successfully.');
  } catch (error) {
    console.error('[Subscription Job] Fatal scheduler error:', error);
  }
}
