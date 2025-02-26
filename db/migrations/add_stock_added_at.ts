import { sql } from 'drizzle-orm';
import { pgTable, timestamp } from 'drizzle-orm/pg-core';

export async function addStockAddedAt() {
  return sql`
    ALTER TABLE finished_goods 
    ADD COLUMN IF NOT EXISTS stock_added_at timestamp;
    
    UPDATE finished_goods 
    SET stock_added_at = created_at 
    WHERE stock_added_at IS NULL;
    
    ALTER TABLE finished_goods 
    ALTER COLUMN stock_added_at SET NOT NULL;
  `;
}
