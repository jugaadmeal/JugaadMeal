import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient, Role, BlockType, MealType, SpiceLevel, PollStatus, DiscountType, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PostgreSQL database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.address.deleteMany();
  await prisma.menuPricing.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.block.deleteMany();
  await prisma.user.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.collegeSettings.deleteMany();
  await prisma.college.deleteMany();

  // 1. Create College
  const college = await prisma.college.create({
    data: {
      name: 'Chandigarh University',
      shortName: 'CU',
      city: 'Mohali',
      state: 'Punjab',
      settings: {
        create: {
          deliveryStartTime: '07:30',
          deliveryEndTime: '21:00',
          pollOpenTime: '18:00',
          pollCloseTime: '21:00',
          maxOrdersPerSlot: 50,
          deliverySlotDuration: 30,
          platformFeePercent: 5.0,
        },
      },
    },
  });

  console.log(`Created College: ${college.name}`);

  // 2. Create Blocks
  const blocksData = [
    { name: 'Block A', shortCode: 'BLK-A', blockType: BlockType.ACADEMIC, latitude: 30.7678, longitude: 76.5754 },
    { name: 'Block B', shortCode: 'BLK-B', blockType: BlockType.ACADEMIC, latitude: 30.7681, longitude: 76.5759 },
    { name: 'CSE Block', shortCode: 'CSE', blockType: BlockType.ACADEMIC, latitude: 30.7692, longitude: 76.5768 },
    { name: 'Hostel 1', shortCode: 'H1', blockType: BlockType.HOSTEL, latitude: 30.7712, longitude: 76.5742 },
    { name: 'Hostel 6', shortCode: 'H6', blockType: BlockType.HOSTEL, latitude: 30.7725, longitude: 76.5731 },
    { name: 'Food Court', shortCode: 'FC', blockType: BlockType.CAFETERIA, latitude: 30.7685, longitude: 76.5752 },
    { name: 'Sports Complex', shortCode: 'SPORTS', blockType: BlockType.SPORTS, latitude: 30.7701, longitude: 76.5781 },
  ];

  const blocks = await Promise.all(
    blocksData.map((b) =>
      prisma.block.create({
        data: {
          ...b,
          collegeId: college.id,
        },
      })
    )
  );

  console.log(`Created ${blocks.length} Blocks`);

  // 3. Create Users
  const student = await prisma.user.create({
    data: {
      email: 'student@cu.edu',
      phone: '9876543210',
      name: 'Arjun Verma',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
      role: Role.STUDENT,
      collegeId: college.id,
      rollNumber: 'CU-2022-CSE-0012',
      department: 'Computer Science',
      semester: 6,
      hostelBlock: 'H6',
      defaultAddress: 'Hostel 6, Room 304, Third Floor',
      isVerified: true,
      wallet: {
        create: {
          balance: 1000.0,
          transactions: {
            create: {
              type: TransactionType.CREDIT_TOPUP,
              amount: 1000.0,
              description: 'Initial Wallet Topup (Welcome Bonus)',
              balanceAfter: 1000.0,
            },
          },
        },
      },
      savedAddresses: {
        create: {
          label: 'Hostel Room',
          floorNumber: '3rd',
          roomNumber: '304',
          landmark: 'Near Lift',
          isDefault: true,
        },
      },
    },
  });

  const agent = await prisma.user.create({
    data: {
      email: 'agent@cu.edu',
      phone: '8765432109',
      name: 'Raman Preet',
      role: Role.DELIVERY_AGENT,
      collegeId: college.id,
      isVerified: true,
      wallet: { create: { balance: 0 } },
    },
  });

  const kitchen = await prisma.user.create({
    data: {
      email: 'kitchen@cu.edu',
      phone: '7654321098',
      name: 'Chef Harpal',
      role: Role.KITCHEN_STAFF,
      collegeId: college.id,
      isVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cu.edu',
      phone: '6543210987',
      name: 'Dean Office',
      role: Role.ADMIN,
      collegeId: college.id,
      isVerified: true,
    },
  });

  console.log('Created Users: Student, Agent, Kitchen, Admin');

  // 4. Create Menus & Menu Items
  // Menu 1: North Indian Thali
  const menu1 = await prisma.menu.create({
    data: {
      collegeId: college.id,
      name: 'North Indian Thali',
      description: 'Authentic rich flavors of North India in a single platter.',
      mealType: MealType.LUNCH,
      pricing: {
        create: {
          basePrice: 150.0,
          studentPrice: 120.0,
          deliveryFee: 10.0,
          packagingFee: 5.0,
          taxPercent: 5.0,
        },
      },
      items: {
        create: [
          {
            name: 'Dal Makhani',
            description: 'Slow-cooked black lentils in rich creamy butter gravy',
            category: 'Main Course',
            isVeg: true,
            allergens: ['dairy'],
            spiceLevel: SpiceLevel.MEDIUM,
            tags: ['creamy', 'popular'],
          },
          {
            name: 'Paneer Butter Masala',
            description: 'Cottage cheese cubes in tomato-butter emulsion',
            category: 'Main Course',
            isVeg: true,
            allergens: ['dairy', 'nuts'],
            spiceLevel: SpiceLevel.MEDIUM,
            tags: ['chef-special'],
          },
          {
            name: 'Jeera Rice & Roti',
            description: 'Basmati rice tempered with cumin and two butter rotis',
            category: 'Bread & Rice',
            isVeg: true,
            allergens: ['gluten'],
            spiceLevel: SpiceLevel.MILD,
            tags: [],
          },
          {
            name: 'Gulab Jamun',
            description: 'Deep-fried milk dumplings dipped in sugar syrup',
            category: 'Dessert',
            isVeg: true,
            allergens: ['dairy', 'gluten'],
            spiceLevel: SpiceLevel.MILD,
            tags: ['sweet'],
          },
        ],
      },
    },
  });

  // Menu 2: South Indian Special
  const menu2 = await prisma.menu.create({
    data: {
      collegeId: college.id,
      name: 'South Special Dosa & Idli',
      description: 'Crispy Butter Masala Dosa served with soft steamed Idlis.',
      mealType: MealType.LUNCH,
      pricing: {
        create: {
          basePrice: 120.0,
          studentPrice: 99.0,
          deliveryFee: 10.0,
          packagingFee: 5.0,
          taxPercent: 5.0,
        },
      },
      items: {
        create: [
          {
            name: 'Butter Masala Dosa',
            description: 'Crisp crepe stuffed with spiced potato filling',
            category: 'Main Course',
            isVeg: true,
            allergens: [],
            spiceLevel: SpiceLevel.MILD,
            tags: ['crispy'],
          },
          {
            name: 'Steamed Idlis',
            description: 'Fluffy fermented rice cakes (2 pcs)',
            category: 'Appetizer',
            isVeg: true,
            allergens: [],
            spiceLevel: SpiceLevel.MILD,
            tags: [],
          },
          {
            name: 'Sambar & Chutneys',
            description: 'Lentil stew with coconut and tomato chutneys',
            category: 'Sides',
            isVeg: true,
            allergens: ['nuts'],
            spiceLevel: SpiceLevel.SPICY,
            tags: [],
          },
        ],
      },
    },
  });

  // Menu 3: Punjabi Chole Bhature
  const menu3 = await prisma.menu.create({
    data: {
      collegeId: college.id,
      name: 'Amritsari Chole Bhature',
      description: 'Fluffy large bhatures served with dark spiced chickpeas.',
      mealType: MealType.LUNCH,
      pricing: {
        create: {
          basePrice: 110.0,
          studentPrice: 89.0,
          deliveryFee: 10.0,
          packagingFee: 5.0,
          taxPercent: 5.0,
        },
      },
      items: {
        create: [
          {
            name: 'Spiced Chickpeas (Chole)',
            description: 'Dark, spicy and tangy chickpea curry cooked with raw spices',
            category: 'Main Course',
            isVeg: true,
            allergens: [],
            spiceLevel: SpiceLevel.SPICY,
            tags: ['spicy', 'popular'],
          },
          {
            name: 'Paneer Bhatura (2 pcs)',
            description: 'Leavened fried breads stuffed with hints of grated paneer',
            category: 'Breads',
            isVeg: true,
            allergens: ['gluten', 'dairy'],
            spiceLevel: SpiceLevel.MILD,
            tags: [],
          },
        ],
      },
    },
  });

  // Menu 4: Healthy Salad & Grilled Wrap
  const menu4 = await prisma.menu.create({
    data: {
      collegeId: college.id,
      name: 'Fitness Special Meal',
      description: 'High-protein paneer wrap with sprout salad and lime beverage.',
      mealType: MealType.LUNCH,
      pricing: {
        create: {
          basePrice: 160.0,
          studentPrice: 139.0,
          deliveryFee: 10.0,
          packagingFee: 5.0,
          taxPercent: 5.0,
        },
      },
      items: {
        create: [
          {
            name: 'Grilled Paneer Wrap',
            description: 'Whole wheat wrap with grilled paneer, peppers and mint chutney',
            category: 'Main Course',
            isVeg: true,
            allergens: ['gluten', 'dairy'],
            spiceLevel: SpiceLevel.MEDIUM,
            tags: ['high-protein', 'healthy'],
          },
          {
            name: 'Mixed Sprout Salad',
            description: 'Steamed sprouts with chopped tomatoes, cucumber and lemon squeeze',
            category: 'Salad',
            isVeg: true,
            allergens: [],
            spiceLevel: SpiceLevel.MILD,
            tags: ['clean-eating'],
          },
        ],
      },
    },
  });

  console.log('Created 4 Menus with MenuItems and Pricing');

  // 5. Create a Poll for Tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);

  const openAt = new Date();
  openAt.setHours(18, 0, 0, 0); // 6 PM today
  const closeAt = new Date();
  closeAt.setHours(21, 0, 0, 0); // 9 PM today

  const poll = await prisma.poll.create({
    data: {
      collegeId: college.id,
      title: "What's for lunch tomorrow?",
      description: 'Vote for your favorite lunch menu! The winner option will be prepared in our kitchen tomorrow.',
      mealType: MealType.LUNCH,
      targetDate: tomorrow,
      status: PollStatus.OPEN,
      openAt,
      closeAt,
      options: {
        create: [
          { menuId: menu1.id, voteCount: 45, percentage: 37.5 },
          { menuId: menu2.id, voteCount: 30, percentage: 25.0 },
          { menuId: menu3.id, voteCount: 35, percentage: 29.17 },
          { menuId: menu4.id, voteCount: 10, percentage: 8.33 },
        ],
      },
      totalVotes: 120,
    },
  });

  console.log(`Created open Poll for tomorrow (Target date: ${tomorrow.toLocaleDateString()})`);

  // Create a coupon code
  await prisma.coupon.create({
    data: {
      code: 'FIRSTEAT',
      description: 'Flat ₹50 discount for first time users',
      discountType: DiscountType.FLAT,
      discountValue: 50.0,
      minOrderValue: 100.0,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      applicableFor: [MealType.LUNCH],
    },
  });

  console.log('Created Coupon: FIRSTEAT');
  console.log('Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
