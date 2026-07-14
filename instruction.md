Complete Feature Specification
🏠 Feature 1: Authentication & Onboarding
Student Onboarding Flow
Step 1: Phone/Email entry → OTP verification (SMS via Twilio or MSG91) → College email preferred (.edu or specific domain validation)

Step 2: Profile Setup → Name, Roll Number (optional but verified badge if added) → Department, Semester selection → Profile photo upload

Step 3: Campus Setup → College selection (searchable dropdown) → Default delivery location (hostel block, room number) → Timetable upload (optional — for smart delivery suggestions)

Step 4: Preferences → Veg / Non-veg preference → Spice level preference → Allergen alerts setup

Step 5: Wallet Setup → Add ₹0-500 optional first top-up → UPI link for quick payments

Welcome screen: Animated confetti, personalized greeting

UI Components Needed
SplitScreen layout (visual left, form right on desktop)

OTP input: 6-box animated input with auto-advance

Progress indicator: step dots with animated fill

Smooth step transitions with Framer Motion

Camera/gallery upload for avatar with crop

College search with fuzzy matching

Timetable upload: drag-drop PDF/image with parse preview

🗳️ Feature 2: The Polling System (CORE DIFFERENTIATOR)
Poll Lifecycle
6:00 PM: Admin creates tomorrow's poll (4 menu options selected).

6:00 PM: Poll goes LIVE — push notification sent to all students "🗳️ Vote now! What should tomorrow's lunch be?"

9:00 PM: Voting closes automatically (BullMQ scheduled job).

9:01 PM: Results calculated, winner announced. Push notification: "🎉 [Option Name] won with 47% votes!" Winner menu finalized for next day lunch.

Next Day: Winning menu visible to students when they open app → Students can now place orders for that menu.

Poll UI (Most Impressive Screen — Build This Best)
Layout: Full-screen poll card

Header:

"Tomorrow's Lunch Vote" with date

Countdown timer (live: "Closes in 2h 34m 19s")

Total votes cast (live updating via Socket.io)

Your vote status badge if already voted

Option Cards (4 cards in 2x2 grid on desktop, vertical stack on mobile):
Each card contains:

Food photography (high quality image)

Menu name (bold)

3-4 key items listed (dal makhani, roti, rice, salad...)

Veg/Non-veg indicator

Price of this option

Vote count + animated progress bar

Percentage shown

States:

Default: hover glow, subtle shadow lift on hover

Selected: orange border glow, checkmark badge, background shifts to warm orange tint

After voting: bars animate to show live percentages, winner bar glows gold

Disabled (after closed): greyed but still shows results

Animations:

On vote: selected card "pulses" — scale 1.0 → 1.03 → 1.0

Percentage bars: smooth width transition (300ms ease)

Vote count: number increments with subtle counter animation

Winner announcement: confetti burst + golden crown icon appears

Live update: when someone else votes, bars shift smoothly

Transparency Features:

"View full breakdown" expands vote history (anonymized — "247 students voted for this")

Share poll: copy link, share to WhatsApp group

"Why this option won" — admin can add a note post-result

Poll History Page
Calendar view of past polls

Each day: what options were, vote counts, winner

Trend charts: "Paneer dishes always win on Mondays"

Student's own voting history

🍽️ Feature 3: Menu & Ordering
Home Screen Layout
Top Section:

Personalized greeting ("Good morning, Arjun 👋")

Current meal type based on time (Breakfast / Lunch / Dinner)

Active poll teaser if voting is open ("Vote closes in 1h!")

Active Order Banner (if order placed):

Mini tracker card (status + estimated time)

Tap to expand full tracking

Today's Menu Section:

Meal type tabs: Breakfast | Lunch | Dinner | Snacks

Active poll winner highlighted with "🏆 Students' Choice"

Menu cards with:

Full-bleed food image (16:9 ratio)

Veg/Non-veg pill badge

Price (student price highlighted if applicable)

Popularity tag ("🔥 47 orders today")

"Add to cart" CTA

Explore Section:

"Try something different" — off-menu specials

"Coming tomorrow" — next day's poll winner preview

"Most loved this week" — top-rated items

Menu Item Detail (Bottom Sheet on mobile, Modal on desktop)
Full-bleed image header with parallax scroll

Item name, description

Nutritional info accordion (calories, protein, carbs, fat)

Allergen warnings (pill badges in warning yellow)

Spice level indicator (chili icons)

Customization options:

"Extra spicy?" toggle

"No onion/garlic" toggle

Special instructions text field

Portion size selector (if applicable)

Quantity selector (- / count / +)

"Add to Order" sticky bottom button with price

Reviews section (3 most recent, see all)

Cart & Checkout
Cart Drawer (slide-in from right):

Item list with quantity controls

Subtotal live calculation

Coupon code input with validation animation

Delivery slot selector:

Time slots shown as pills (10:30, 11:00, 11:30, 12:00...)

Slots with < 5 spots show "Almost full!" warning

Full slots are disabled

Delivery location:

Block selector (dropdown or campus map tap)

Room/floor text input

Saved addresses quick-select

Order Summary:

Subtotal

Delivery fee (₹10)

Packaging (₹5)

Discount (coupon applied)

Tax (5%)

Total (bold)

Payment method selector:

CampusEats Wallet (balance shown)

UPI (Google Pay / PhonePe / Paytm icons)

Card

Cash on Delivery

"Place Order" button → confirmation animation

Order Confirmation Screen
Large animated checkmark (Lottie animation)

Order number

Estimated delivery time

Quick summary of what was ordered

"Track your order" CTA

"Share with friends" (for group orders feature, future)

📍 Feature 4: Real-Time Order Tracking
Student Tracking View
Progress Steps (horizontal on desktop, vertical on mobile):
[Confirmed] → [Preparing] → [Ready] → [On the Way] → [Delivered]

Each step:

Icon (customized, not generic)

Timestamp when it reached that step

Animated pulse on current step

Checkmark + green fill on completed steps

Map View:

Campus block map (simplified SVG or Mapbox)

Delivery agent pin (animated movement)

Your delivery location pin

Estimated time (dynamically updated)

"Your delivery agent is 3 minutes away" text

Agent Info Card (when Out for Delivery):

Agent photo, name

Rating (4.8 ⭐)

"Call Agent" button (tel: link)

"Chat" button (future feature placeholder)

Live ETA:

Socket.io pushes ETA updates every 30 seconds

"Order will arrive by 1:15 PM" → updates in real time

Kitchen Staff View
Kanban Board Layout:
Columns: Incoming | Preparing | Ready for Pickup

Each order card:

Order number + student name

Items list (clear, large text — kitchen is messy!)

Time since order placed (color coded: green < 10min, orange 10-20, red > 20)

Special instructions highlighted in yellow

Drag card across columns OR tap status buttons

Auto-alert when order has been in Preparing > 20 minutes

Delivery Agent View
My Deliveries Screen:

List of assigned orders (sorted by delivery time)

Each: Order number, delivery block, items count, student phone

"Navigate" button (opens Google Maps with delivery block coords)

Status update buttons: [Picked Up] → [Delivered] → (triggers student notification)

Delivery earnings counter for the day

Route optimization hint (if multiple deliveries, suggested sequence)

📊 Feature 5: Admin Dashboard
Overview Page
Top Metrics Row (animated number counters on load):

Today's orders (vs yesterday)

Revenue today (vs yesterday)

Active orders right now

Poll participation rate

Average delivery time

Charts:

Hourly orders chart (line graph — peak hours visible)

Revenue this week (bar chart)

Meal type breakdown (donut chart)

Popular items this week (horizontal bar chart)

Live Feed:

Real-time order activity stream

"Order #CE-234 placed by Arjun — ₹89 — Block C"

New entries animate in from top

Poll Management
Create Poll Screen:

Date picker for target meal date

Meal type selector

Drag-drop 4 options from menu library into slots

Preview how it'll look to students

Schedule opening/closing time (pre-filled from settings)

Toggle: "Show live counts to voters" (transparency setting)

"Launch Poll" button → confirmation dialog

Active Poll Monitor:

Live vote counts (updates every 5 seconds)

Bar chart of option performance

"Force Close" option (with reason required)

Early winner prediction note ("Option B is currently leading")

Results Page:

Winner announcement compose (admin writes a note)

Finalize and notify students button

Export results CSV

Menu Management
Menu Library:

Grid of all menus/items

Filters: meal type, veg/non-veg, active/inactive

Search

Add/Edit Menu Item:

Image upload with preview + crop

All fields from schema

Nutritional info form (structured input)

Pricing by meal type

Availability toggle (can disable quickly if item unavailable)

Schedule Menu:

Calendar view

Drag existing menus onto calendar days

"Use poll winner" auto-assign for lunch

Orders Management
Orders Table:

Columns: Order#, Student, Block, Items, Total, Status, Agent, Time

Filters: status, date, block, agent

Bulk actions: assign agent, mark delivered, export

Click row → full order detail modal

Order Detail Modal:

All order info

Status timeline

Change status manually

Assign/reassign delivery agent

Issue refund button (with amount override)

Print order slip (for kitchen)

Analytics Page
Sections:

Revenue Analytics: Daily/Weekly/Monthly revenue chart, Average order value trend, Revenue by meal type, Top earning days heatmap (calendar).

Food Analytics: Most ordered items (ranked list), Food wastage estimate (poll prediction vs actual orders), Poll accuracy: "When X wins poll, we get Y% more orders", Popularity trends by day of week.

Delivery Analytics: Average delivery time by block, Agent performance table, Peak delivery hours, Delay reasons breakdown (pie chart).

Student Analytics: Daily active users, Retention rate (how many order > 3x/week), New vs returning breakdown, Top ordering students (loyalty insights).

💰 Feature 6: Wallet System
Student Wallet Screen
Header:

Current balance (large, prominent)

"Add Money" CTA button

Quick Add Amounts: ₹50 | ₹100 | ₹200 | ₹500 | Custom

Transaction History:

Chronological list with filters (credits/debits/all)

Each transaction: Icon (order icon for debit, topup icon for credit), Description, Amount (green for credit, red for debit), Balance after, Date/time, "View Order" link if related to order.

Rewards/Bonus Section:

"Invite a friend, both get ₹25 credit"

Referral code display + share button

Cashback offers (if any active)

🔔 Feature 7: Notifications
Notification Center (in-app)
Grouped by date ("Today", "Yesterday", "This Week")

Each notification: icon, title, body, timestamp, read/unread indicator

Swipe to dismiss (mobile)

Mark all as read button

Notification preferences link

Push Notification System
Events that trigger push:

Poll opens for voting

Poll closes — winner announced

Order confirmed (with order number)

Order being prepared

Order out for delivery (with agent name)

Order delivered

Order cancelled (with refund info)

Wallet credited (with amount)

New coupon unlocked

"Lunch poll closes in 30 minutes!" reminder

Implementation:

Web: Firebase Cloud Messaging (FCM) for PWA

Mobile: FCM (Android) + APNs (iOS)

SMS fallback for critical order updates via MSG91

Email for receipts, weekly summary

⭐ Feature 8: Review & Rating System
Post-Delivery Review Flow
Triggered: 30 minutes after order marked delivered

Review Screen:

"How was your order?" header

3 separate star ratings: Food Quality (⭐⭐⭐⭐⭐), Delivery Speed (⭐⭐⭐⭐⭐), Packaging (⭐⭐⭐⭐⭐)

Quick tags (tap to add): ["Delicious", "Hot & fresh", "On time", "Good packaging", "Could be hotter", "Late delivery", "Wrong item"]

Comment box (optional)

Photo upload (optional — "Show off your meal 📸")

Submit → thank you animation + "You earned 5 CampusCoins!"

Display:

On menu pages: aggregate ratings + recent reviews

On admin dashboard: all reviews with reply option

Flagging system for inappropriate reviews

🎯 Feature 9: Smart Recommendations
Algorithm (rule-based first, ML later):

Time-based: show breakfast items in morning, etc.

History-based: "You usually order this on Tuesdays"

Trending: what's popular among students right now

Poll affinity: if you always vote for vegetarian options, prioritize veg menus in recommendations

Weather-based (future): hot weather → cold beverages promoted

UI:

"Recommended for you" horizontal scroll row

"Trending right now 🔥" section

"Based on your last order..." suggestion

📅 Feature 10: Timetable Integration (Smart Delivery)
Upload:

Student uploads timetable (PDF or photo)

OCR extraction (Google Vision API or Tesseract)

Manual override/correction UI

Result: "Monday Period 3: Block C Room 201 (10:30 AM - 12:00 PM)"

Smart Suggestion:

When ordering lunch for Monday:
→ "Deliver to CSE Block Room 201 at 12:00 PM (your free period)? ✓"

Auto-fill delivery location + time slot from timetable

Student can override anytime

Privacy:

Timetable data encrypted at rest

Never shared with third parties

Deletable anytime from settings

Page-by-Page UI Specifications
Pages List
Plaintext
PUBLIC (unauthenticated):
  /                    — Landing page
  /login               — Auth page
  /register            — Registration flow (multi-step)

STUDENT (authenticated):
  /home                — Home / dashboard
  /menu                — Full menu browse
  /menu/[id]           — Item detail
  /poll                — Active poll
  /poll/history        — Past polls
  /poll/[id]           — Specific poll result
  /cart                — Cart (or drawer component)
  /checkout            — Checkout flow
  /orders              — My orders list
  /orders/[id]         — Order detail + tracking
  /wallet              — Wallet screen
  /profile             — Profile & settings
  /notifications       — Notification center
  /timetable           — Timetable management

KITCHEN STAFF:
  /kitchen             — Live order kanban board

DELIVERY AGENT:
  /deliveries          — My assigned deliveries

ADMIN:
  /admin               — Overview dashboard
  /admin/orders        — Orders management
  /admin/menu          — Menu management
  /admin/polls         — Poll management
  /admin/analytics     — Analytics
  /admin/students      — User management
  /admin/agents        — Delivery agent management
  /admin/wallet        — Wallet & transactions
  /admin/coupons       — Coupon management
  /admin/settings      — College settings
Landing Page (/)
Section 1 — Hero:

Full-width, warm gradient background (#FFF8F3 to #FFEEDD)

Headline: "Your campus lunch,\nyour rules." (Cal Sans, 72px)

Sub: "Vote. Order. Get it delivered to your block."

CTAs: "Order Now" (primary orange) | "See How It Works" (ghost)

Right side: Phone mockup showing the app (animated, floating)

Background: subtle food illustration pattern (low opacity)

Section 2 — Problem/Solution:

"College food shouldn't be a gamble"

3 pain points with icons (long queues, bad food, no time between classes)

Transition: "That's why we built CampusEats"

Section 3 — How It Works:

3 steps with large number typography

Vote on tomorrow's menu tonight

Order in the morning (winner menu ready)

Get it delivered to your block — no queues, no rush

Each step: icon + short description + screenshot

Section 4 — The Poll Feature Showcase:

Full-width section, dark background (#1A1A2E)

Large poll UI mockup (interactive demo — click to vote)

"Students decide. Kitchen prepares. No guessing. No wastage."

Live stats: "2,400+ votes cast this week"

Section 5 — Social Proof:

Review cards (masonry grid)

Student photos + quotes

Rating summary: "4.8/5 from 1,200 students"

Section 6 — Download/Sign Up CTA:

"Join 3,000+ students eating better"

Email signup or "Get Early Access" form

App store badges (iOS + Android)

Footer:

Logo + tagline

Links: About, Contact, Privacy, Terms

Social links

API Design
REST API Endpoints
TypeScript
// Authentication
POST   /api/auth/send-otp
POST   /api/auth/verify-otp
POST   /api/auth/refresh-token
DELETE /api/auth/logout

// Users
GET    /api/users/me
PATCH  /api/users/me
POST   /api/users/me/avatar
GET    /api/users/me/timetable
POST   /api/users/me/timetable

// Menu
GET    /api/menus                    // list with filters
GET    /api/menus/:id
POST   /api/menus                    // admin only
PATCH  /api/menus/:id               // admin only
DELETE /api/menus/:id               // admin only
GET    /api/menus/today/:mealType   // today's active menu

// Polls
GET    /api/polls                    // list
GET    /api/polls/active            // current open poll
GET    /api/polls/:id
POST   /api/polls                    // admin only
PATCH  /api/polls/:id               // admin only
POST   /api/polls/:id/vote          // cast vote
GET    /api/polls/:id/results       // live results
POST   /api/polls/:id/finalize      // admin: finalize winner

// Orders
GET    /api/orders                   // my orders
POST   /api/orders                   // place order
GET    /api/orders/:id
PATCH  /api/orders/:id/status       // kitchen/agent update
POST   /api/orders/:id/cancel
GET    /api/orders/:id/tracking     // real-time tracking data

// Delivery Slots
GET    /api/slots                    // available slots for date/block
GET    /api/slots/:blockId/date/:date

// Wallet
GET    /api/wallet
POST   /api/wallet/topup
GET    /api/wallet/transactions

// Reviews
POST   /api/reviews                  // submit review for order
GET    /api/reviews/menu/:menuId    // reviews for a menu

// Notifications  
GET    /api/notifications
PATCH  /api/notifications/read-all
DELETE /api/notifications/:id

// Admin Analytics
GET    /api/admin/analytics/overview
GET    /api/admin/analytics/orders
GET    /api/admin/analytics/revenue
GET    /api/admin/analytics/polls
GET    /api/admin/analytics/delivery

// Coupons
GET    /api/coupons
POST   /api/coupons/validate        // check coupon code
POST   /api/coupons                  // admin: create
PATCH  /api/coupons/:id             // admin: edit
WebSocket Events (Socket.io)
TypeScript
// Server → Client
'order:status_updated'    // { orderId, status, timestamp }
'order:agent_location'    // { orderId, lat, lng, eta }
'poll:vote_cast'          // { pollId, optionId, newCounts, percentages }
'poll:closed'             // { pollId, winnerId, finalCounts }
'poll:opened'             // { poll } — new poll available
'slot:availability'       // { slotId, remaining }
'kitchen:new_order'       // { order } — for kitchen dashboard

// Client → Server  
'subscribe:order'         // { orderId }
'subscribe:poll'          // { pollId }
'agent:location_update'   // { orderId, lat, lng } — agent sends location
'kitchen:subscribe'       // kitchen dashboard subscribes to all new orders
Mobile App Considerations (React Native / PWA)
Approach recommendation: Start with PWA (Progressive Web App)

Next.js supports PWA via next-pwa plugin

Works on all devices without app store approval

Can be "installed" on home screen

Push notifications supported

Saves 3-6 months of development vs native app

Once validated, convert to React Native (Expo)

PWA Config:

Service Worker: cache menu data, offline order history

Manifest: app name, icons, theme color, display: standalone

Install prompt: custom "Add to Home Screen" banner

Push: FCM integration via service worker

Mobile-specific UI rules:

Bottom navigation bar (5 tabs: Home, Menu, Poll, Orders, Profile)

All touch targets minimum 44x44px

Swipe gestures:
→ swipe right on order = call delivery agent
→ swipe left on order = cancel (if pending)
→ swipe up on bottom sheet to expand

Pull to refresh on orders, menu pages

Haptic feedback on vote cast, order placed

Native share API on poll share, receipt share

Security Requirements
Authentication:

JWT access tokens (15 min expiry) + Refresh tokens (30 days)

Refresh token rotation

OTP: 6-digit, 10-minute expiry, max 3 attempts, then lockout

Rate limiting: 5 OTP requests per phone per hour

Authorization:

Role-based middleware on every protected route

Students can only access their own orders/wallet

Agents can only update orders assigned to them

All admin routes require ADMIN or SUPER_ADMIN role

Data:

Passwords: N/A (OTP-only auth)

Sensitive data: encrypted at rest (Prisma field-level or DB encryption)

PII: GDPR-lite practices (even for India — good habit)

Timetable data: user-deletable, not shared

Payments:

PCI-compliant via Razorpay (never handle raw card data)

All payment intents server-side only

Webhook signature verification

API:

Helmet.js headers

CORS configured for specific origins only

Input validation on every endpoint (Zod)

SQL injection: impossible via Prisma (parameterized)

Rate limiting per IP + per user (express-rate-limit)

Polling:

One vote per user per poll (enforced at DB level with unique constraint)

Vote tampering: server-side only, client just sends optionId

Anti-bot: require authenticated session to vote

Performance Requirements
Core Web Vitals Targets:

LCP (Largest Contentful Paint): < 2.5s

FID (First Input Delay): < 100ms

CLS (Cumulative Layout Shift): < 0.1

Techniques:

Next.js Image optimization for all food photos

Lazy loading below-fold content

Skeleton screens (no layout shift during load)

API response caching (Redis):
→ Menu items: 10 min cache
→ Poll results: 5 second cache (near-real-time)
→ Delivery slots: 30 second cache

Static generation for menu pages where possible

Code splitting per route (automatic with Next.js App Router)

Prefetch on hover for likely next navigation

Database indexes on all foreign keys and filter columns

Connection pooling via PgBouncer (Supabase handles this)

Development Phases
Phase 1 — MVP (4-6 weeks)
Priority: Get ONE working flow end-to-end

Week 1-2:

[x] Project setup (Next.js + Prisma + Auth)

[x] Database schema (simplified — User, Menu, Order, Poll)

[x] Basic auth flow (OTP)

[x] Design system setup (colors, typography, base components)

Week 3-4:

[x] Student home screen

[x] Menu browse + item detail

[x] Basic ordering flow (no payment yet — COD only)

[x] Order status (manual update by admin for now)

[x] Poll create + vote + results (core feature)

Week 5-6:

[x] Admin panel basics (orders list, menu management, poll creation)

[x] Basic notifications (in-app)

[x] Wallet (view balance, manual top-up by admin)

[x] PWA setup + mobile responsive

[x] Deploy to Vercel + Railway

GOAL: Real students can place orders and vote in polls. Admin can manage everything manually. You test with 20-30 people from your network.

Phase 2 — Core Product (6-8 weeks)
[x] Razorpay payment integration

[x] Real-time tracking (Socket.io)

[x] Delivery agent app view

[x] Kitchen staff kanban board

[x] Push notifications (FCM)

[x] Review system

[x] Coupon system

[x] Analytics dashboard

[x] Address management

[x] Full admin panel

Phase 3 — Advanced (8-10 weeks)
[x] Timetable OCR integration

[x] Smart recommendations

[x] Multi-college support

[x] Agent location tracking (map)

[x] Group ordering

[x] Subscription meal plans

[x] Loyalty/rewards system

[x] React Native (Expo) conversion

Environment Variables
Code snippet
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# OTP
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=

# Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Payments
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Email
RESEND_API_KEY=

# Push Notifications
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# OCR (Timetable)
GOOGLE_VISION_API_KEY=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SOCKET_URL=
Folder Structure
Plaintext
campuseats/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (student)/
│   │   │   │   ├── home/
│   │   │   │   ├── menu/
│   │   │   │   ├── poll/
│   │   │   │   ├── orders/
│   │   │   │   ├── wallet/
│   │   │   │   └── profile/
│   │   │   ├── (staff)/
│   │   │   │   └── kitchen/
│   │   │   ├── (agent)/
│   │   │   │   └── deliveries/
│   │   │   ├── (admin)/
│   │   │   │   └── admin/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx             # Landing page
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn base components
│   │   │   ├── shared/              # used across roles
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── BottomNav.tsx
│   │   │   │   ├── Notifications.tsx
│   │   │   │   └── ...
│   │   │   ├── student/
│   │   │   │   ├── PollCard.tsx
│   │   │   │   ├── MenuCard.tsx
│   │   │   │   ├── OrderTracker.tsx
│   │   │   │   └── ...
│   │   │   ├── admin/
│   │   │   │   ├── OrdersTable.tsx
│   │   │   │   ├── AnalyticsChart.tsx
│   │   │   │   └── ...
│   │   │   └── landing/
│   │   ├── lib/
│   │   │   ├── api/                 # API client functions
│   │   │   ├── hooks/               # custom React hooks
│   │   │   ├── stores/              # Zustand stores
│   │   │   ├── utils/
│   │   │   └── validations/         # Zod schemas
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   └── images/
│   │   └── styles/
│   │       └── globals.css
│   │
│   └── api/                         # Express backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.routes.ts
│       │   │   ├── menu.routes.ts
│       │   │   ├── order.routes.ts
│       │   │   ├── poll.routes.ts
│       │   │   └── ...
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── rbac.middleware.ts
│       │   │   └── rateLimit.middleware.ts
│       │   ├── jobs/                # BullMQ background jobs
│       │   │   ├── poll.jobs.ts
│       │   │   └── notification.jobs.ts
│       │   ├── sockets/             # Socket.io handlers
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── redis.ts
│       │   │   └── queue.ts
│       │   └── index.ts
│       └── prisma/
│           ├── schema.prisma
│           └── seed.ts
│
├── packages/
│   ├── shared-types/                # shared TypeScript types
│   └── ui-tokens/                   # design tokens (colors, spacing)
│
├── package.json                     # monorepo root (turborepo)
├── turbo.json
└── README.md
Key UX Principles (Non-Negotiable)
SPEED IS A FEATURE
Every action must feel instant. Use optimistic updates everywhere. Never make a student wait for a network request to see feedback.

OFFLINE GRACEFUL
Menu should be readable offline (cached). Show "You're offline" banner, not blank screens.

ONE THUMB RULE
Every primary action on mobile must be reachable with one thumb. CTA buttons at bottom. Navigation at bottom.

NO DARK PATTERNS
No fake countdown timers. No hidden fees at checkout (show full price early). Cancellation must be as easy as ordering.

TRANSPARENCY IS YOUR BRAND
Poll results always visible. Delivery fee always shown upfront. If your order is late, show why (kitchen busy? traffic?).

ERROR STATES ARE DESIGNED
Every empty state has an illustration + helpful action. Every error has a human message + what to do next. Never show raw error codes to students.

ACCESSIBILITY
Minimum contrast ratio 4.5:1 for all text. All images have alt text. All interactive elements keyboard navigable. Focus states visible and styled (not just browser default).

Testing Strategy
Unit Tests (Jest): All utility functions, Zod validation schemas, Business logic (order total calculation, poll winner selection).

Integration Tests (Supertest): All API endpoints, Authentication flows, Payment webhook handling, Poll vote uniqueness enforcement.

E2E Tests (Playwright): Complete student order flow, Complete poll voting flow, Admin poll creation → student voting → result, Wallet top-up → order payment from wallet.

Component Tests (Testing Library): PollCard voting interaction, Cart quantity controls, Checkout form validation.

Deployment Checklist
Pre-launch:

[ ] Environment variables set in Vercel + Railway

[ ] Database migrations run (prisma migrate deploy)

[ ] Seed data added (colleges, blocks, test menu items)

[ ] Razorpay webhook URL configured

[ ] FCM setup complete, test notification sent

[ ] Cloudinary upload preset configured

[ ] Sentry DSN active, test error sent

[ ] Domain configured, SSL active

[ ] CSP headers configured

[ ] Rate limiting tested

[ ] Load test with 100 concurrent users (k6)

Post-launch:

[ ] Uptime monitoring (Better Uptime or UptimeRobot)

[ ] Error alerting in Sentry → Slack/email

[ ] Daily DB backup confirmed

[ ] Analytics recording correctly

Build something students actually love. The polling feature is your moat — no food delivery product for campuses does this. Make that screen beautiful, transparent, and fast — and students will talk about it.