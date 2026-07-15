# JugaadMeal  Bento App 🍱

JugaadMeal is a premium on-campus food delivery and collaborative menu-polling platform built for universities.

## Technology Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express.js + Socket.io (for real-time updates)
- **Database:** Prisma ORM + PostgreSQL (with local SQLite option)
- **State Management:** Zustand + React Query

---

## Getting Started

### 1. Database Setup

Ensure you have a PostgreSQL database ready (e.g. from local server or Supabase) and update `apps/api/.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/JugaadMeal?schema=public"
NEXTAUTH_SECRET="JugaadMeal-super-secret-key-123"
PORT=5000
```

#### Option B: Zero-Dependency SQLite Setup
If you want to run the project immediately without a PostgreSQL server:
1. Open `apps/api/prisma/schema.prisma`
2. Change the `datasource db` block:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = "file:./dev.db"
   }
   ```
3. SQLite doesn't support native `enum` lists or arrays (`String[]`). Therefore, in `MenuItem` and `Coupon`, modify these fields:
   - Change `allergens String[]` to `allergens String` (or remove them)
   - Change `tags String[]` to `tags String`
   - Change `applicableFor MealType[]` to `applicableFor String`
   - (Optional) SQLite doesn't need native `enum` constraints, so you can change enums to `String` fields (e.g. `role Role` to `role String` with default `"STUDENT"`).

### 2. Install & Boot

The project is structured as an npm workspaces monorepo.

To run:
```bash
# Install all dependencies (Linked workspaces automatically)
npm install

# Run database push and seed (Creates Arjun, Chef, Rider, and Dean Admin accounts)
cd apps/api
npx prisma db push
npm run prisma:seed

# Boot API and Next.js Web concurrently from the root directory
cd ../..
npm run dev
```

---

## Role Credentials (OTP: 210573)

Use these seeded email addresses with the sandbox verification code **`210573`** to log in:

- **Student:** `student@cu.edu` (Arjun Verma - ₹1000 Wallet Balance)
- **Kitchen Staff:** `kitchen@cu.edu` (Chef Harpal - Live Order Kanban board)
- **Delivery Agent:** `agent@cu.edu` (Raman Preet - Assigned Deliveries task tracker)
- **Admin Manager:** `admin@cu.edu` (Dean Office - Full control panel, launch polls, metrics)
