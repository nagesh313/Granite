
import { db } from "./index";
import { stands } from "./schema";
import { eq } from "drizzle-orm";

async function updateCapacities() {
  try {
    await db.update(stands)
      .set({ maxCapacity: 200 })
      .where(eq(stands.maxCapacity, 100));
    
    console.log("Successfully updated stand capacities to 200");
  } catch (error) {
    console.error("Error updating capacities:", error);
  }
}

if (require.main === module) {
  updateCapacities()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}
