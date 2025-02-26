
import { sql } from 'drizzle-orm';

export async function removeQualityField() {
  return sql`
    -- Drop the quality_check_status column from production jobs
    DO $$ 
    BEGIN
      ALTER TABLE IF EXISTS production_jobs 
        DROP COLUMN IF EXISTS quality_check_status CASCADE;
    EXCEPTION
      WHEN undefined_column THEN
        NULL;
    END $$;
  `;
}
