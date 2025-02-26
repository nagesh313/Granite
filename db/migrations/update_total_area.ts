
import { sql } from 'drizzle-orm';

export async function updateTotalArea() {
  return sql`
    -- Update jobs where total area is stored in coverage field
    UPDATE production_jobs 
    SET measurements = jsonb_set(
      measurements,
      '{totalArea}',
      measurements->'coverage'
    )
    WHERE measurements->>'coverage' IS NOT NULL
    AND stage IN ('cutting', 'chemical_conversion', 'epoxy');

    -- Update jobs where total area is blank string
    UPDATE production_jobs 
    SET measurements = jsonb_set(
      measurements,
      '{totalArea}',
      '0'
    )
    WHERE (measurements->>'totalArea' = '' OR measurements->>'totalArea' IS NULL)
    AND stage IN ('cutting', 'chemical_conversion', 'epoxy');

    -- Remove old coverage field
    UPDATE production_jobs 
    SET measurements = measurements - 'coverage'
    WHERE measurements ? 'coverage';
  `;
}
