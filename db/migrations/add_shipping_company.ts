import { sql } from 'drizzle-orm';

export async function addShippingCompany() {
  return sql`
    ALTER TABLE shipments 
    ADD COLUMN IF NOT EXISTS shipping_company text NOT NULL DEFAULT 'Unknown',
    ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL;
  `;
}
