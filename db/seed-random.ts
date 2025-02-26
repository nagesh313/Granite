import { db } from "./index";
import { faker } from '@faker-js/faker';
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
import { eq, desc } from "drizzle-orm";

type GeneratedData = {
  blocks: Array<typeof blocks.$inferSelect>;
  machines: Array<typeof machines.$inferSelect>;
  jobs: Array<typeof productionJobs.$inferSelect>;
};

async function generateRandomData(count = 20): Promise<GeneratedData> {
  const existingBlocks = await db.select({ blockNumber: blocks.blockNumber })
    .from(blocks)
    .orderBy(desc(blocks.blockNumber));

  let startBlockNumber = 1;
  if (existingBlocks.length > 0) {
    const lastBlockNumber = existingBlocks[0].blockNumber;
    const match = lastBlockNumber.match(/\d+/);
    if (match) {
      startBlockNumber = parseInt(match[0], 10) + 1;
    }
  }

  const blockData = Array(count).fill(null).map((_, index) => ({
    blockNumber: `BLK${(startBlockNumber + index).toString().padStart(3, '0')}`,
    dateReceived: faker.date.recent(),
    marka: faker.company.name() + ' Granites',
    length: faker.number.int({ min: 250, max: 300 }).toString(),
    width: faker.number.int({ min: 150, max: 200 }).toString(),
    height: faker.number.int({ min: 140, max: 160 }).toString(),
    density: "2.7",
    netWeight: faker.number.int({ min: 1800, max: 2200 }).toString(),
    blockWeight: faker.number.int({ min: 1900, max: 2300 }).toString(),
    blockType: "Granite",
    color: faker.helpers.arrayElement(['Black Galaxy', 'Steel Grey', 'Imperial Red', 'Tan Brown', 'Kashmir White']),
    quality: faker.helpers.arrayElement(['Premium', 'Standard', 'Economy']),
    mineName: faker.company.name(),
    vehicleNumber: faker.string.alphanumeric(8).toUpperCase(),
    status: faker.helpers.arrayElement(['in_stock', 'processing', 'completed'])
  }));

  const flattenedBlocks = await db.insert(blocks).values(blockData).returning();

  const machineData = [
    {
      name: 'Cutting-01',
      type: 'cutting',
      status: faker.helpers.arrayElement(['idle', 'running', 'maintenance']),
      maintenanceInterval: faker.number.int({ min: 20, max: 40 }),
      lastMaintenanceDate: faker.date.recent(),
      nextMaintenanceDate: faker.date.soon()
    },
    {
      name: 'Cutting-02',
      type: 'cutting',
      status: faker.helpers.arrayElement(['idle', 'running', 'maintenance']),
      maintenanceInterval: faker.number.int({ min: 20, max: 40 }),
      lastMaintenanceDate: faker.date.recent(),
      nextMaintenanceDate: faker.date.soon()
    },
    {
      name: 'Grinding-01',
      type: 'grinding',
      status: faker.helpers.arrayElement(['idle', 'running', 'maintenance']),
      maintenanceInterval: faker.number.int({ min: 15, max: 30 }),
      lastMaintenanceDate: faker.date.recent(),
      nextMaintenanceDate: faker.date.soon()
    },
    {
      name: 'Polishing-01',
      type: 'polishing',
      status: faker.helpers.arrayElement(['idle', 'running', 'maintenance']),
      maintenanceInterval: faker.number.int({ min: 25, max: 35 }),
      lastMaintenanceDate: faker.date.recent(),
      nextMaintenanceDate: faker.date.soon()
    },
    {
      name: 'Epoxy-01',
      type: 'epoxy',
      status: faker.helpers.arrayElement(['idle', 'running', 'maintenance']),
      maintenanceInterval: faker.number.int({ min: 25, max: 35 }),
      lastMaintenanceDate: faker.date.recent(),
      nextMaintenanceDate: faker.date.soon()
    }
  ];

  const flattenedMachines = await db.insert(machines).values(machineData).returning();

  const trolleyData = Array(count).fill(null).map((_, index) => ({
    number: `TR${(startBlockNumber + index).toString().padStart(3, '0')}`,
    status: faker.helpers.arrayElement(['available', 'in_use', 'maintenance']),
    currentBlockId: flattenedBlocks[index].id
  }));

  const flattenedTrolleys = await db.insert(trolleys).values(trolleyData).returning();

  const bladeData = flattenedMachines
    .filter(m => m.type === 'cutting')
    .flatMap(machine => 
      Array(2).fill(null).map((_, index) => ({
        serialNumber: `BLD${machine.name.split('-')[1]}-${(index + 1).toString().padStart(2, '0')}`,
        machineId: machine.id,
        installationDate: faker.date.recent(),
        totalCutArea: faker.number.int({ min: 0, max: 1000 }).toString(),
        status: faker.helpers.arrayElement(['active', 'worn', 'replaced']),
        currentSegmentHeight: faker.number.float({ min: 20, max: 40 }).toFixed(1),
        segmentsReplaced: faker.number.int({ min: 0, max: 5 }),
        lastBrazingDate: faker.date.recent()
      }))
    );

  const flattenedBlades = await db.insert(blades).values(bladeData).returning();

  const jobsData = flattenedBlocks.flatMap(block => {
    const cuttingMachine = flattenedMachines.find(m => m.type === 'cutting' && m.status === 'running');
    const grindingMachine = flattenedMachines.find(m => m.type === 'grinding' && m.status === 'running');
    const trolley = flattenedTrolleys.find(t => t.currentBlockId === block.id);

    if (!cuttingMachine || !trolley) return [];

    const jobs = [];

    jobs.push({
      blockId: block.id,
      machineId: cuttingMachine.id,
      trolleyId: trolley.id,
      stage: 'cutting',
      startTime: faker.date.recent(),
      endTime: faker.helpers.arrayElement([null, faker.date.recent()]),
      status: faker.helpers.arrayElement(['in_progress', 'completed', 'paused']),
      measurements: {
        blockPieces: [{ blockId: block.id, pieces: faker.number.int({ min: 8, max: 12 }) }],
        stoppageReason: faker.helpers.arrayElement(['none', 'power_outage', 'maintenance']),
        maintenanceReason: faker.helpers.arrayElement([null, 'Routine', 'Emergency']),
        stoppageStartTime: faker.helpers.arrayElement([null, faker.date.recent().toISOString()]),
        stoppageEndTime: faker.helpers.arrayElement([null, faker.date.recent().toISOString()]),
        photos: []
      },
      photos: [],
      totalSlabs: faker.number.int({ min: 8, max: 12 }),
      processedPieces: faker.number.int({ min: 0, max: 8 }),
      qualityCheckStatus: faker.helpers.arrayElement(['pending', 'passed', 'failed'])
    });

    if (grindingMachine && jobs[0].status === 'completed') {
      jobs.push({
        blockId: block.id,
        machineId: grindingMachine.id,
        trolleyId: trolley.id,
        stage: 'grinding',
        startTime: faker.date.recent(),
        endTime: faker.helpers.arrayElement([null, faker.date.recent()]),
        status: faker.helpers.arrayElement(['in_progress', 'completed', 'paused']),
        measurements: {
          gritLevel: faker.helpers.arrayElement(['coarse', 'medium', 'fine']),
          waterFlow: faker.number.float({ min: 10, max: 20 }).toFixed(1),
          pressure: faker.number.float({ min: 2, max: 5 }).toFixed(1),
          photos: []
        },
        photos: [],
        totalSlabs: jobs[0].totalSlabs,
        processedPieces: faker.number.int({ min: 0, max: jobs[0].totalSlabs }),
        qualityCheckStatus: faker.helpers.arrayElement(['pending', 'passed', 'failed'])
      });
    }

    return jobs;
  }).filter(Boolean);

  const flattenedJobs = await db.insert(productionJobs).values(jobsData).returning();

  const downtimeData = flattenedJobs.map(job => ({
    machineId: job.machineId,
    productionJobId: job.id,
    startTime: faker.date.recent(),
    endTime: faker.date.recent(),
    reason: faker.helpers.arrayElement(['maintenance', 'power_outage', 'technical_issue']),
    comments: faker.lorem.sentence()
  }));

  await db.insert(machineDowntime).values(downtimeData);

  const bladeUsageData = flattenedJobs
    .filter(job => job.stage === 'cutting')
    .map(job => {
      const blade = flattenedBlades.find(b => b.machineId === job.machineId);
      if (!blade) return null;

      return {
        productionJobId: job.id,
        bladeId: blade.id,
        segmentHeightStart: faker.number.float({ min: 30, max: 40 }).toFixed(1),
        segmentHeightEnd: faker.number.float({ min: 20, max: 29 }).toFixed(1),
        cutArea: faker.number.float({ min: 10, max: 50 }).toFixed(1)
      };
    })
    .filter((record): record is NonNullable<typeof record> => record !== null);

  if (bladeUsageData.length > 0) {
    await db.insert(bladeUsage).values(bladeUsageData);
  }

  const finishedGoodsData = flattenedJobs
    .filter(job => job.status === 'completed')
    .map(job => ({
      blockId: job.blockId,
      productionJobId: job.id,
      dimensions: `${faker.number.int({ min: 250, max: 300 })}x${faker.number.int({ min: 150, max: 200 })}x2`,
      quality: faker.helpers.arrayElement(['Premium', 'Standard', 'Economy']),
      location: `Warehouse ${faker.string.alpha().toUpperCase()}`,
      status: 'in_stock',
      weight: faker.number.int({ min: 150, max: 250 }).toString()
    }));

  if (finishedGoodsData.length > 0) {
    await db.insert(finishedGoods).values(finishedGoodsData);
  }

  console.log("Random seed data generated successfully");
  return { blocks: flattenedBlocks, machines: flattenedMachines, jobs: flattenedJobs };
}

generateRandomData().catch(console.error);