
import { db } from "..";
import { machines } from "../schema";
import { eq } from "drizzle-orm";

async function main() {
  // Remove Cutter-01 machine
  await db.delete(machines)
    .where(eq(machines.name, "Cutter-01"));
}

main().catch(console.error);
