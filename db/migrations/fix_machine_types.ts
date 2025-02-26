
import { db } from "..";
import { machines } from "../schema";
import { eq } from "drizzle-orm";

async function main() {
  // Update Cutter to cutting
  await db.update(machines)
    .set({ type: "cutting" })
    .where(eq(machines.type, "Cutter"));
}

main().catch(console.error);
