import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableSecurityRow {
  tablename: string;
  rowsecurity: boolean;
}

async function main() {
  console.log('Checking Row Level Security (RLS) status for all public tables...');
  
  const results: TableSecurityRow[] = await prisma.$queryRaw`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
  `;
  
  console.table(results);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
