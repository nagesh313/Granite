import { db } from "../../db";
import { sql } from 'drizzle-orm';

// Migration is no longer needed since the column is defined in the schema
export async function addMediaColumns() {
  // Check if media column exists first
  const result = await sql`
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'finished_goods' 
      AND column_name = 'media'
    );
  `;

  // Only add if it doesn't exist
  if (!result) {
    return sql`
      ALTER TABLE finished_goods 
      ADD COLUMN IF NOT EXISTS media text[] DEFAULT '{}'::text[]
    `;
  }

  return sql`SELECT 1`; // No-op if column exists
}