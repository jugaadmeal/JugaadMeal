# 🍱 CampusEats — Full Stack Application Development Prompt

## Project Identity

**Product Name:** CampusEats (or your preferred name)  
**Tagline:** "Your Campus. Your Menu. Your Choice."  
**Target:** Private college students (initial focus: large universities like Chandigarh University)  
**Business Model:** Own kitchen + delivery, off-campus to on-campus growth  
**Design Philosophy:** Premium, warm, human — think Swiggy meets Notion meets Linear. Not "startup template." Not "bootstrap theme." A product that feels like it was designed by a team of 20 designers at a billion-dollar company.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Framer Motion (animations)
- **UI Components:** Shadcn/ui (customized, not default)
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React + custom SVGs
- **Fonts:** - Display: Cal Sans or Clash Display (headings)
  - Body: Inter or Plus Jakarta Sans

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js or Hono (lightweight, fast)
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL (primary) + Redis (caching, sessions, real-time)
- **Authentication:** NextAuth.js or Clerk
- **File Storage:** Cloudinary (food images, receipts)
- **Real-time:** Socket.io (order tracking, live poll updates)
- **Background Jobs:** BullMQ with Redis (scheduled polls, notifications)
- **Email:** Resend + React Email templates

### Infrastructure
- **Hosting (Frontend):** Vercel
- **Hosting (Backend):** Railway or Render
- **Database Hosting:** Supabase (managed PostgreSQL)
- **CDN:** Cloudflare
- **Monitoring:** Sentry (error tracking)
- **Analytics:** PostHog (self-hosted or cloud)

---

## Design System

### Color Palette
- **Primary:** `#FF6B35` (Warm Orange — energy, appetite, action)
- **Secondary:** `#1A1A2E` (Deep Navy — trust, premium feel)
- **Accent:** `#F7C948` (Golden Yellow — highlight, poll results, badges)
- **Success:** `#22C55E` (Green — order confirmed, delivered)
- **Surface:** `#FAFAF8` (Warm White — backgrounds, not pure white)
- **Surface-2:** `#F4F3EF` (Warm Gray — cards, sections)
- **Text-Primary:** `#111110` (Near Black — readable, warm)
- **Text-Muted:** `#6B6B63` (Warm Gray — secondary text)
- **Border:** `#E8E6E1` (Subtle warm border)

### Typography Scale
- **Display XL:** 72px / Cal Sans Bold — Hero headlines
- **Display L:** 48px / Cal Sans Bold — Section headers
- **Heading 1:** 36px / Plus Jakarta 700 — Page titles
- **Heading 2:** 28px / Plus Jakarta 700 — Card titles
- **Heading 3:** 22px / Plus Jakarta 600 — Sub-sections
- **Body L:** 18px / Inter 400 — Long-form text
- **Body:** 16px / Inter 400 — Default body
- **Body S:** 14px / Inter 400 — Secondary info
- **Caption:** 12px / Inter 500 — Labels, timestamps

### Design Tokens
**Border Radius:** - `sm`: 8px (tags, badges)
- `md`: 12px (inputs, small cards)
- `lg`: 16px (cards)
- `xl`: 24px (modals, large cards)
- `2xl`: 32px (hero sections, feature blocks)

**Shadows:**
- `sm`: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)`
- `md`: `0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)`
- `lg`: `0 8px 32px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)`
- `xl`: `0 20px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06)`

**Spacing Scale (8px base):**
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px`

### Animation Principles
- All transitions: 200-350ms duration
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` — snappy, premium feel
- Hover states: subtle scale (1.01-1.02), shadow lift
- Page transitions: fade + slight upward slide (y: 8px → 0)
- Loading states: skeleton screens (never spinners alone)
- Micro-interactions on every clickable element
- Staggered list animations (children delay: 50ms each)
- Framer Motion layout animations for reordering (poll results live update)

---

## Application Architecture

### User Roles & Permissions
1. **STUDENT:** Orders food, votes in polls, tracks orders, manages profile
2. **DELIVERY_AGENT:** Sees assigned orders, updates delivery status, navigates to blocks
3. **KITCHEN_STAFF:** Sees incoming orders, marks as preparing/ready
4. **ADMIN:** Full control: menu, polls, orders, analytics, users, settings
5. **SUPER_ADMIN:** Multi-campus management (future scale)

---

## Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USERS ───────────────────────────────────────────────────────────────────

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  phone           String?   @unique
  name            String
  avatar          String?
  role            Role      @default(STUDENT)
  collegeId       String?
  college         College?  @relation(fields: [collegeId], references: [id])
  rollNumber      String?
  department      String?
  semester        Int?
  hostelBlock     String?
  defaultAddress  String?
  
  // Relations
  orders          Order[]
  votes           Vote[]
  wallet          Wallet?
  notifications   Notification[]
  reviews         Review[]
  savedAddresses  Address[]
  
  // Metadata
  isVerified      Boolean   @default(false)
  isActive        Boolean   @default(true)
  lastLoginAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([email, role])
}

enum Role {
  STUDENT
  DELIVERY_AGENT
  KITCHEN_STAFF
  ADMIN
  SUPER_ADMIN
}

// ─── COLLEGE ─────────────────────────────────────────────────────────────────

model College {
  id          String    @id @default(cuid())
  name        String
  shortName   String
  city        String
  state       String
  campusMap   Json?     // GeoJSON of campus blocks
  blocks      Block[]
  users       User[]
  menus       Menu[]
  polls       Poll[]
  settings    CollegeSettings?
  createdAt   DateTime  @default(now())
}

model CollegeSettings {
  id                    String   @id @default(cuid())
  collegeId             String   @unique
  college               College  @relation(fields: [collegeId], references: [id])
  deliveryStartTime     String   // "07:30"
  deliveryEndTime       String   // "21:00"
  pollOpenTime          String   // "18:00" (6 PM previous day)
  pollCloseTime         String   // "21:00" (9 PM previous day)
  maxOrdersPerSlot      Int      @default(50)
  deliverySlotDuration  Int      @default(30) // minutes
  platformFeePercent    Float    @default(5.0)
}

model Block {
  id          String   @id @default(cuid())
  collegeId   String
  college     College  @relation(fields: [collegeId], references: [id])
  name        String   // "Block A", "CSE Block", "Hostel 6"
  shortCode   String   // "BLK-A", "CSE", "H6"
  blockType   BlockType
  latitude    Float?
  longitude   Float?
  orders      Order[]
}

enum BlockType {
  ACADEMIC
  HOSTEL
  CAFETERIA
  ADMIN
  SPORTS
}

// ─── MENU & ITEMS ─────────────────────────────────────────────────────────────

model Menu {
  id          String      @id @default(cuid())
  collegeId   String
  college     College     @relation(fields: [collegeId], references: [id])
  name        String      // "North Indian Thali", "South Special"
  description String?
  mealType    MealType
  isActive    Boolean     @default(true)
  items       MenuItem[]
  polls       PollOption[]
  scheduledFor DateTime?  // if fixed for a specific date
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACKS
}

model MenuItem {
  id           String     @id @default(cuid())
  menuId       String
  menu         Menu       @relation(fields: [menuId], references: [id])
  name         String
  description  String?
  image        String?    // Cloudinary URL
  category     String     // "Main Course", "Starter", "Dessert", "Beverage"
  isVeg        Boolean    @default(true)
  isAvailable  Boolean    @default(true)
  allergens    String[]   // ["gluten", "dairy", "nuts"]
  nutritionInfo Json?     // {calories, protein, carbs, fat}
  spiceLevel   SpiceLevel @default(MEDIUM)
  tags         String[]   // ["popular", "chef-special", "new"]
  orderItems   OrderItem[]
}

enum SpiceLevel {
  MILD
  MEDIUM
  SPICY
  EXTRA_SPICY
}

// ─── PRICING ─────────────────────────────────────────────────────────────────

model MenuPricing {
  id          String   @id @default(cuid())
  menuId      String   @unique
  basePrice   Float    // Full meal price
  studentPrice Float   // Discounted for verified students
  deliveryFee Float    @default(10)
  packagingFee Float   @default(5)
  taxPercent  Float    @default(5)
}

// ─── POLLS ───────────────────────────────────────────────────────────────────

model Poll {
  id           String       @id @default(cuid())
  collegeId    String
  college      College      @relation(fields: [collegeId], references: [id])
  title        String       // "What's for lunch tomorrow? 🍽️"
  description  String?
  mealType     MealType
  targetDate   DateTime     // The date this poll is for
  status       PollStatus   @default(DRAFT)
  openAt       DateTime
  closeAt      DateTime
  
  options      PollOption[]
  votes        Vote[]
  winnerMenuId String?
  
  // Result transparency
  resultsPublic Boolean     @default(true)
  showLiveCount Boolean     @default(true)
  totalVotes    Int         @default(0)
  
  createdAt    DateTime     @default(now())
  finalizedAt  DateTime?
  
  @@index([collegeId, targetDate, mealType])
}

enum PollStatus {
  DRAFT
  OPEN
  CLOSED
  FINALIZED
}

model PollOption {
  id          String   @id @default(cuid())
  pollId      String
  poll        Poll     @relation(fields: [pollId], references: [id])
  menuId      String
  menu        Menu     @relation(fields: [menuId], references: [id])
  voteCount   Int      @default(0)
  percentage  Float    @default(0)
  votes       Vote[]
  isWinner    Boolean  @default(false)
  
  @@unique([pollId, menuId])
}

model Vote {
  id           String     @id @default(cuid())
  pollId       String
  poll         Poll       @relation(fields: [pollId], references: [id])
  optionId     String
  option       PollOption @relation(fields: [optionId], references: [id])
  userId       String
  user         User       @relation(fields: [userId], references: [id])
  votedAt      DateTime   @default(now())
  
  @@unique([pollId, userId]) // One vote per poll per user
  @@index([pollId, optionId])
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

model Order {
  id              String        @id @default(cuid())
  orderNumber     String        @unique // "CE-2024-00234"
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  
  // Delivery info
  deliveryBlockId String
  deliveryBlock   Block         @relation(fields: [deliveryBlockId], references: [id])
  deliveryAddress String        // specific room/floor/landmark
  scheduledFor    DateTime      // delivery time slot chosen
  
  // Items
  items           OrderItem[]
  
  // Status
  status          OrderStatus   @default(PENDING)
  statusHistory   OrderStatusHistory[]
  
  // Assignment
  agentId         String?
  agent           User?         @relation("AgentOrders", fields: [agentId], references: [id])
  estimatedDelivery DateTime?
  actualDelivery  DateTime?
  
  // Payment
  paymentMethod   PaymentMethod
  paymentStatus   PaymentStatus @default(PENDING)
  paymentId       String?       // Razorpay payment ID
  
  // Amounts
  subtotal        Float
  deliveryFee     Float
  packagingFee    Float
  discount        Float         @default(0)
  tax             Float
  totalAmount     Float
  
  // Coupon
  couponId        String?
  coupon          Coupon?       @relation(fields: [couponId], references: [id])
  
  // Feedback
  review          Review?
  
  // Special instructions
  specialInstructions String?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@index([userId, status])
  @@index([agentId, status])
}

model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  menuItemId  String
  menuItem    MenuItem @relation(fields: [menuItemId], references: [id])
  quantity    Int
  unitPrice   Float
  totalPrice  Float
  customizations String? // special requests for this item
}

model OrderStatusHistory {
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id])
  status    OrderStatus
  note      String?
  updatedBy String?     // userId who changed status
  timestamp DateTime    @default(now())
}

enum OrderStatus {
  PENDING           // Just placed, payment pending
  CONFIRMED         // Payment done, order confirmed
  PREPARING         // Kitchen is making it
  READY             // Ready for pickup by delivery agent
  OUT_FOR_DELIVERY  // Agent picked up, en route
  DELIVERED         // Successfully delivered
  CANCELLED         // Cancelled (with reason)
  REFUNDED          // Refund processed
}

enum PaymentMethod {
  WALLET
  UPI
  CARD
  CASH_ON_DELIVERY
  NETBANKING
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

// ─── WALLET ──────────────────────────────────────────────────────────────────

model Wallet {
  id           String            @id @default(cuid())
  userId       String            @unique
  user         User              @relation(fields: [userId], references: [id])
  balance      Float             @default(0)
  transactions WalletTransaction[]
  updatedAt    DateTime          @updatedAt
}

model WalletTransaction {
  id          String            @id @default(cuid())
  walletId    String
  wallet      Wallet            @relation(fields: [walletId], references: [id])
  type        TransactionType
  amount      Float
  description String
  referenceId String?           // orderId or topup reference
  balanceAfter Float
  createdAt   DateTime          @default(now())
}

enum TransactionType {
  CREDIT_TOPUP
  CREDIT_REFUND
  CREDIT_BONUS
  DEBIT_ORDER
  DEBIT_PENALTY
}

// ─── COUPONS ─────────────────────────────────────────────────────────────────

model Coupon {
  id              String       @id @default(cuid())
  code            String       @unique
  description     String
  discountType    DiscountType
  discountValue   Float        // amount or percentage
  minOrderValue   Float        @default(0)
  maxDiscount     Float?       // cap for percentage discounts
  usageLimit      Int?
  usedCount       Int          @default(0)
  validFrom       DateTime
  validUntil      DateTime
  isActive        Boolean      @default(true)
  applicableFor   MealType[]   // empty = all meal types
  orders          Order[]
  createdAt       DateTime     @default(now())
}

enum DiscountType {
  FLAT
  PERCENTAGE
  FREE_DELIVERY
  BUY_ONE_GET_ONE
}

// ─── REVIEWS ─────────────────────────────────────────────────────────────────

model Review {
  id           String   @id @default(cuid())
  orderId      String   @unique
  order        Order    @relation(fields: [orderId], references: [id])
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  
  foodRating      Int   // 1-5
  deliveryRating  Int   // 1-5
  packagingRating Int   // 1-5
  overallRating   Int   // calculated average
  
  comment      String?
  images       String[] // cloudinary URLs
  tags         String[] // ["hot-food", "on-time", "good-packaging"]
  
  isPublic     Boolean  @default(true)
  adminReply   String?
  
  createdAt    DateTime @default(now())
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id])
  type      NotificationType
  title     String
  body      String
  data      Json?            // extra payload (orderId, pollId etc.)
  isRead    Boolean          @default(false)
  readAt    DateTime?
  createdAt DateTime         @default(now())
  
  @@index([userId, isRead])
}

enum NotificationType {
  ORDER_CONFIRMED
  ORDER_PREPARING
  ORDER_OUT_FOR_DELIVERY
  ORDER_DELIVERED
  ORDER_CANCELLED
  POLL_OPENED
  POLL_RESULT
  POLL_REMINDER
  WALLET_CREDITED
  WALLET_DEBITED
  COUPON_UNLOCKED
  SYSTEM_ANNOUNCEMENT
}

// ─── ADDRESS ─────────────────────────────────────────────────────────────────

model Address {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  label       String   // "Hostel Room", "CSE Lab", "Library"
  blockId     String?
  floorNumber String?
  roomNumber  String?
  landmark    String?
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
}