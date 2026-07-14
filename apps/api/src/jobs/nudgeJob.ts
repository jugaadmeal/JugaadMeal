import prisma from '../lib/prisma';

export async function runNudgeJob() {
  console.log('[Job] Starting personalized poll nudge job...');
  let nudgedCount = 0;
  const details: string[] = [];

  try {
    // 1. Fetch the currently active open poll
    const activePoll = await prisma.poll.findFirst({
      where: { status: 'OPEN' },
      include: {
        options: {
          include: {
            menu: {
              include: {
                items: true,
              },
            },
          },
        },
      },
    });

    if (!activePoll) {
      console.log('[Job] No active open poll found. Skipping nudges.');
      return { status: 'skipped', message: 'No active open poll found', nudgedCount };
    }

    // 2. Identify the options (menu names and items names) on today's poll
    const pollChoices: { menuId: string; menuName: string; itemNames: string[] }[] = [];
    for (const option of activePoll.options) {
      const menuName = option.menu.name;
      const itemNames = option.menu.items.map((i: any) => i.name.toLowerCase());
      pollChoices.push({
        menuId: option.menuId,
        menuName: menuName.toLowerCase(),
        itemNames,
      });
    }

    // 3. Find students who have NOT yet voted in today's poll
    const votes = await prisma.vote.findMany({
      where: { pollId: activePoll.id },
      select: { userId: true },
    });
    const votedUserIds = votes.map((v: any) => v.userId);

    const usersToNudge = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        id: { notIn: votedUserIds },
      },
    });

    console.log(`[Job] Found ${usersToNudge.length} students who have not voted yet.`);

    // 4. Personalized cross-reference for each user
    for (const user of usersToNudge) {
      // Find past orders (delivered) for this user
      const orderItems = await prisma.orderItem.findMany({
        where: {
          order: {
            userId: user.id,
            status: 'DELIVERED',
          },
        },
        select: {
          menuItem: {
            select: {
              name: true,
            },
          },
        },
      });
      const orderedItemNames = new Set(orderItems.map((oi: any) => oi.menuItem.name.toLowerCase()));

      // Find past votes for this user
      const pastVotes = await prisma.vote.findMany({
        where: { userId: user.id },
        select: {
          option: {
            select: {
              menu: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
      const votedMenuNames = new Set(pastVotes.map((v: any) => v.option.menu.name.toLowerCase()));

      // Match item names or menu names
      let matchedChoice: string | null = null;

      for (const choice of pollChoices) {
        // Check if user voted for this menu in the past
        if (votedMenuNames.has(choice.menuName)) {
          matchedChoice = choice.menuName;
          break;
        }
        // Check if user ordered any item in this menu in the past
        for (const itemName of choice.itemNames) {
          if (orderedItemNames.has(itemName)) {
            matchedChoice = itemName;
            break;
          }
        }
        if (matchedChoice) break;
      }

      // If matched, send nudge notification
      if (matchedChoice) {
        // Proper capitalization helper
        const formattedChoice = matchedChoice.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        // Check if we already nudged them recently for today's poll to prevent duplicates
        const existingNudge = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'POLL_REMINDER',
            body: { contains: formattedChoice },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24h
            },
          },
        });

        if (!existingNudge) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'POLL_REMINDER',
              title: '🗳️ Personalized Poll Nudge!',
              body: `You loved ${formattedChoice} — it's on today's poll. Cast your vote now!`,
            },
          });
          nudgedCount++;
          details.push(`Nudged user "${user.name}" (${user.email}) because they loved "${formattedChoice}"`);
        }
      }
    }

    console.log(`[Job] Finished nudge job. Nudged ${nudgedCount} users.`);
    return { status: 'success', nudgedCount, details };
  } catch (error: any) {
    console.error('[Job] Error in nudge job:', error);
    return { status: 'error', error: error.message };
  }
}
