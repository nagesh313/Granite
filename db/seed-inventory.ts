
import { db } from "./index";
import { stands } from "./schema/inventory";

export async function seedInventory() {
  try {
    // Create 52 stands
    const standsData = Array.from({ length: 52 }, (_, i) => ({
      standNumber: i + 1,
      status: 'available',
      maxCapacity: 200,
      weight: 0,
    }));

    await db.insert(stands).values(standsData);
    console.log("Successfully seeded inventory data");
  } catch (error) {
    console.error("Error seeding inventory data:", error);
  }
}

if (require.main === module) {
  seedInventory()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}
