import { db } from "./index";
import { 
  blocks, 
  machines, 
  trolleys,
  blades,
  productionJobs,
  finishedGoods,
  machineDowntime,
  bladeUsage
} from "./schema";

async function seed() {
  // Seed blocks
  const [block1] = await db.insert(blocks).values({
    length: "280",
    width: "180",
    height: "150",
    marka: "Galaxy Mining Corporation",
    density: "2.7",
    netWeight: "2000",
    blockWeight: "2100",
    blockType: "Granite",
    color: "Black Galaxy",
    quality: "Premium",
    mineName: "Galaxy Mines",
    vehicleNumber: "TN01AB1234",
    status: "in_stock",
    blockNumber: "BLK001",
    dateReceived: new Date(),
  }).returning();

  // Seed machines
  const [cuttingMachine] = await db.insert(machines).values({
    name: "Cutter-01",
    type: "cutting",
    status: "idle",
    maintenanceInterval: 30,
    lastMaintenanceDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
    nextMaintenanceDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)  // 15 days from now
  }).returning();

  // Seed trolleys
  const [trolley1] = await db.insert(trolleys).values({
    number: "TR001",
    status: "available",
    currentBlockId: block1.id
  }).returning();

  // Seed blades
  const [blade1] = await db.insert(blades).values({
    serialNumber: "BLD001",
    machineId: cuttingMachine.id,
    installationDate: new Date(),
    totalCutArea: "0",
    status: "active",
    currentSegmentHeight: "40",
    segmentsReplaced: 0,
    lastBrazingDate: new Date()
  }).returning();

  // Seed production jobs
  const [job1] = await db.insert(productionJobs).values({
    blockId: block1.id,
    machineId: cuttingMachine.id,
    trolleyId: trolley1.id,
    stage: "cutting",
    startTime: new Date(),
    status: "in_progress",
    measurements: {
      blockPieces: [{ blockId: block1.id, pieces: 10 }],
      stoppageReason: "none",
      maintenanceReason: null,
      stoppageStartTime: null,
      stoppageEndTime: null,
      photos: []
    },
    totalSlabs: 10,
    processedPieces: 0,
    qualityCheckStatus: "pending",
    photos: []
  }).returning();

  // Seed machine downtime
  await db.insert(machineDowntime).values({
    machineId: cuttingMachine.id,
    productionJobId: job1.id,
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),   // 1 hour ago
    reason: "maintenance",
    comments: "Routine maintenance check"
  });

  // Seed blade usage
  await db.insert(bladeUsage).values({
    productionJobId: job1.id,
    bladeId: blade1.id,
    segmentHeightStart: "40",
    segmentHeightEnd: "39.5",
    cutArea: "10.5"
  });

  // Seed finished goods
  await db.insert(finishedGoods).values({
    blockId: block1.id,
    productionJobId: job1.id,
    dimensions: "280x180x2",
    quality: "Premium",
    location: "Warehouse A",
    status: "in_stock",
    weight: "180"
  });

  console.log("Seed data inserted successfully");
}

seed().catch(console.error);