import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableRow {
  tablename: string;
}

async function main() {
  console.log('Fetching all tables in the public schema...');
  
  // Query all tables in the public schema
  const tables: TableRow[] = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;
  
  console.log(`Found ${tables.length} tables:`, tables.map(t => t.tablename));

  for (const table of tables) {
    const tableName = table.tablename;
    console.log(`Enabling Row Level Security (RLS) on table "${tableName}"...`);
    try {
      // Need to use unsafe because we can't use parameters for table names in ALTER TABLE
      await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`Successfully enabled RLS on table "${tableName}".`);
    } catch (error) {
      console.error(`Error enabling RLS on table "${tableName}":`, error);
    }
  }
  
  console.log('All public schema tables have been processed.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
