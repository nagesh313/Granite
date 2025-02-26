
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";
import { addMediaColumns } from './migrations/add_media_columns';
import { updateTotalArea } from "./migrations/update_total_area";
process.env.DATABASE_URL='postgresql://neondb_owner:npg_4a3HRbzPSmUW@ep-young-shadow-a6xkllle.us-west-2.aws.neon.tech/neondb?sslmode=require';
process.env.PGDATABASE='neondb';
process.env.PGPORT=5432;
process.env.PGUSER='neondb_owner';
process.env.PGPASSWORD='npg_4a3HRbzPSmUW';
process.env.NODE_ENV='production';
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = postgres(process.env.DATABASE_URL, { 
  ssl: true,
  max: 1
});

export const db = drizzle(client, { schema });

// Run migrations
addMediaColumns(db).catch(console.error);
updateTotalArea(db).catch(console.error);

// Clean up on shutdown
process.on('SIGTERM', () => client.end());
process.on('SIGINT', () => client.end());
