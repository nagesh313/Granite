
import { db } from "..";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    ALTER TABLE production_jobs 
    ADD COLUMN IF NOT EXISTS total_slabs INTEGER;
  `);
}

main().catch(console.error);
