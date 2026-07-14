import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TableRow {
  tablename: string;
}

interface PolicyRow {
  policyname: string;
}

async function main() {
  console.log('Fetching all tables in the public schema...');
  const tables: TableRow[] = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;

  for (const table of tables) {
    const tableName = table.tablename;
    
    // Check if any policy exists for this table
    const policies: PolicyRow[] = await prisma.$queryRawUnsafe(`
      SELECT policyname FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = '${tableName}';
    `);

    if (policies.length === 0) {
      console.log(`Table "${tableName}" has no policies. Creating a restrictive policy...`);
      try {
        await prisma.$executeRawUnsafe(`
          CREATE POLICY "Restrict all public access" ON "${tableName}" 
          FOR ALL 
          USING (false);
        `);
        console.log(`Successfully created restrictive policy for table "${tableName}".`);
      } catch (error) {
        console.error(`Error creating policy for table "${tableName}":`, error);
      }
    } else {
      console.log(`Table "${tableName}" already has policy(ies):`, policies.map(p => p.policyname));
    }
  }

  console.log('Finished setting up policies.');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
