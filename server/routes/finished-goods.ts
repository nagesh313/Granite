import { eq, and, sql, desc } from "drizzle-orm";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@db";
import { stands, finishedGoods, shipments, blocks, productionJobs } from "@db/schema";

const router = express.Router();

// Update the stands endpoint with proper error handling and type conversion
router.get("/stands", async (_req, res) => {
  try {
    console.log("[API] Fetching stands data...");
    const standsData = await db.select({
      id: stands.id,
      rowNumber: stands.rowNumber,
      position: stands.position,
      maxCapacity: sql<number>`200`,
      currentSlabs: sql<number>`COALESCE(SUM(CAST(${finishedGoods.slabCount} AS INTEGER)), 0)`,
    })
    .from(stands)
    .leftJoin(finishedGoods, eq(stands.id, finishedGoods.standId))
    .groupBy(stands.id)
    .orderBy(stands.rowNumber, stands.position);

    // Ensure proper type conversion and calculate coverage
    const enrichedStands = standsData.map(stand => ({
      ...stand,
      currentSlabs: parseInt(stand.currentSlabs.toString()),
      maxCapacity: 200,
      coverage: Math.round((parseInt(stand.currentSlabs.toString()) / 200) * 100) / 100
    }));

    console.log("[API] Successfully fetched stands data:", enrichedStands.length);
    res.json(enrichedStands);
  } catch (error) {
    console.error("[API] Error fetching stands:", error);
    res.status(500).json({ 
      error: "Failed to fetch stands",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Consolidated multer configuration
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const dest = file.mimetype.startsWith('image/') ? path.join(uploadsDir, 'images') : path.join(uploadsDir, 'videos');
    // Ensure directory exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10,
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// Serve static files from both root uploads and nested directories
router.use('/media', express.static(uploadsDir));
router.use('/media/images', express.static(path.join(uploadsDir, 'images')));
router.use('/media/videos', express.static(path.join(uploadsDir, 'videos')));

// Add media to a finished good
router.post("/:id/media", async (req, res) => {
  try {
    // Use the upload middleware
    await new Promise<void>((resolve, reject) => {
      upload.array('files')(req, res, (err) => {
        if (err) {
          console.error('Upload middleware error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const files = req.files as Express.Multer.File[];
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files uploaded');
    }

    // Get existing media
    const [item] = await db
      .select({ media: finishedGoods.media })
      .from(finishedGoods)
      .where(eq(finishedGoods.id, parseInt(req.params.id)));

    if (!item) {
      throw new Error('Finished good not found');
    }

    const fileNames = files.map(file => file.filename);
    const updatedMedia = [...(item.media || []), ...fileNames];

    // Update database
    await db
      .update(finishedGoods)
      .set({
        media: updatedMedia,
        updated_at: new Date()
      })
      .where(eq(finishedGoods.id, parseInt(req.params.id)));

    res.json({
      files: fileNames.map(filename => ({
        name: filename,
        url: `/api/finished-goods/media/${filename}`
      }))
    });

  } catch (error) {
    console.error("Error handling upload:", error);

    // Cleanup any uploaded files on error
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : [req.files];
      for (const file of files) {
        try {
          if ('path' in file && typeof file.path === 'string') {
            fs.unlinkSync(file.path);
          }
        } catch (unlinkError) {
          console.error("Failed to cleanup file:", file.path, unlinkError);
        }
      }
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to upload files"
    });
  }
});

// Get media for a finished good
router.get("/:id/media", async (req, res) => {
  try {
    const [item] = await db
      .select({ media: finishedGoods.media })
      .from(finishedGoods)
      .where(eq(finishedGoods.id, parseInt(req.params.id)));

    if (!item?.media) {
      return res.json({ media: [] });
    }

    // Convert media filenames to full URLs
    const mediaUrls = (item.media as string[]).map((filename: string) => {
      if (filename.startsWith('data:')) {
        return filename; // Return as-is if it's a base64 string
      }
      // Determine media type and construct appropriate path
      if (filename.match(/\.(mp4|webm|ogg)$/i)) {
        return `/api/finished-goods/media/videos/${filename}`;
      }
      return `/api/finished-goods/media/images/${filename}`;
    });

    res.json({ media: mediaUrls });
  } catch (error) {
    console.error("Error retrieving media:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to retrieve media"
    });
  }
});


// Add finished goods to a stand
router.post("/add", async (req, res) => {
  const { standId, blockId, slabCount, photos, videos, stockAddedAt } = req.body;

  try {
    // Combine current slab count query with block details in a single query
    const [result] = await db
      .select({
        currentSlabs: sql<number>`COALESCE(SUM(${finishedGoods.slabCount}), 0)`,
        block: {
          id: blocks.id,
          color: blocks.color,
        },
      })
      .from(blocks)
      .where(eq(blocks.id, blockId))
      .leftJoin(
        finishedGoods,
        and(
          eq(finishedGoods.standId, standId),
          eq(finishedGoods.blockId, blockId)
        )
      )
      .groupBy(blocks.id);

    if (!result?.block) {
      return res.status(404).json({ error: "Block not found" });
    }

    const currentSlabCount = Number(result.currentSlabs || 0);
    const slabsToAdd = Number(slabCount);
    const newTotal = currentSlabCount + slabsToAdd;
    const maxCapacity = 200; // Fixed capacity

    if (newTotal > maxCapacity) {
      return res.status(400).json({
        error: `Cannot exceed maximum capacity of ${maxCapacity}. Current: ${currentSlabCount}, Attempting to add: ${slabCount}`,
      });
    }

    // Add the finished goods with all media in a single insert
    const media = [...(photos || []), ...(videos || [])].map(item =>
      typeof item === 'string' ? item : item.url
    );

    const [finishedGood] = await db
      .insert(finishedGoods)
      .values({
        standId: standId,
        blockId: blockId,
        quality: result.block.color,
        slabCount: slabCount,
        media: media,
        stock_added_at: stockAddedAt ? new Date(stockAddedAt) : new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    res.json(finishedGood);
  } catch (error) {
    console.error("Error adding finished goods:", error);
    res.status(500).json({ error: "Failed to add finished goods" });
  }
});

// Get shipments with enhanced logging and error handling
router.get("/shipments", async (_req, res) => {
  try {
    console.log("[API] Fetching shipments...");
    const shippedGoods = await db
      .select({
        id: shipments.id,
        slabsShipped: shipments.slabsShipped,
        shippedAt: shipments.shippedAt,
        shippingCompany: shipments.shippingCompany,
        finishedGoodId: shipments.finishedGoodId,
        block: {
          blockNumber: blocks.blockNumber,
          length: blocks.length,
          width: blocks.width,
          height: blocks.height,
          color: blocks.color,
        },
      })
      .from(shipments)
      .innerJoin(
        finishedGoods,
        eq(shipments.finishedGoodId, finishedGoods.id)
      )
      .innerJoin(
        blocks,
        eq(finishedGoods.blockId, blocks.id)
      )
      .orderBy(desc(shipments.shippedAt));

    const formattedShipments = shippedGoods.map(shipment => ({
      id: shipment.id,
      slabsShipped: shipment.slabsShipped,
      shippedAt: new Date(shipment.shippedAt).toISOString(),
      shippingCompany: shipment.shippingCompany,
      finishedGoodId: shipment.finishedGoodId,
      block: shipment.block
    }));

    res.json(formattedShipments);
    console.log("[API] Fetched shipments count:", formattedShipments.length);
  } catch (error) {
    console.error("[API] Error fetching shipments:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch shipments"
    });
  }
});

// Update the GET endpoint for a single shipment
router.get(["/shipment/:id", "/shipments/:id"], async (req, res) => {
  // Always set JSON content type first
  res.setHeader('Content-Type', 'application/json');

  try {
    console.log("[API] Fetching shipment:", req.params.id);
    const shipmentId = parseInt(req.params.id);

    if (isNaN(shipmentId)) {
      return res.status(400).json({ error: "Invalid shipment ID" });
    }

    const [shipment] = await db
      .select({
        id: shipments.id,
        slabsShipped: shipments.slabsShipped,
        shippedAt: shipments.shippedAt,
        shippingCompany: shipments.shippingCompany,
        finishedGoodId: shipments.finishedGoodId,
        block: {
          id: blocks.id,
          blockNumber: blocks.blockNumber,
          length: blocks.length,
          width: blocks.width,
          height: blocks.height,
          color: blocks.color,
        },
      })
      .from(shipments)
      .innerJoin(
        finishedGoods,
        eq(shipments.finishedGoodId, finishedGoods.id)
      )
      .innerJoin(
        blocks,
        eq(finishedGoods.blockId, blocks.id)
      )
      .where(eq(shipments.id, shipmentId));

    if (!shipment) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    const formattedShipment = {
      id: shipment.id,
      slabsShipped: shipment.slabsShipped,
      shippedAt: new Date(shipment.shippedAt).toISOString(),
      shippingCompany: shipment.shippingCompany,
      finishedGoodId: shipment.finishedGoodId,
      block: {
        ...shipment.block,
        id: undefined // Remove unnecessary ID from response
      }
    };

    console.log("[API] Sending shipment response:", formattedShipment);
    return res.json(formattedShipment);
  } catch (error) {
    console.error("[API] Error fetching shipment:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch shipment"
    });
  }
});

// Add new shipment
router.post("/shipments", async (req, res) => {
  try {
    const { finishedGoodId, slabsShipped, shippingCompany, shippingDate } = req.body;
    console.log("[API] Creating shipment:", req.body);

    if (!finishedGoodId || !slabsShipped || !shippingCompany) {
      return res.status(400).json({
        error: "Missing required fields: finishedGoodId, slabsShipped, or shippingCompany"
      });
    }

    // Get the current finished good to verify slab count
    const [finishedGood] = await db
      .select()
      .from(finishedGoods)
      .where(eq(finishedGoods.id, finishedGoodId));

    if (!finishedGood) {
      return res.status(404).json({ error: "Finished good not found" });
    }

    if (finishedGood.slabCount < slabsShipped) {
      return res.status(400).json({
        error: `Cannot ship ${slabsShipped} slabs. Only ${finishedGood.slabCount} available.`
      });
    }

    // Create shipment record
    const [shipment] = await db
      .insert(shipments)
      .values({
        finishedGoodId,
        slabsShipped,
        shippingCompany,
        shippedAt: shippingDate ? new Date(shippingDate) : new Date(),
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    // Update finished good's slab count
    await db
      .update(finishedGoods)
      .set({
        slabCount: finishedGood.slabCount - slabsShipped,
        updated_at: new Date()
      })
      .where(eq(finishedGoods.id, finishedGoodId));

    // Fetch complete shipment data with joins
    const [completeShipment] = await db
      .select({
        id: shipments.id,
        slabsShipped: shipments.slabsShipped,
        shippedAt: shipments.shippedAt,
        shippingCompany: shipments.shippingCompany,
        finishedGoodId: shipments.finishedGoodId,
        block: {
          blockNumber: blocks.blockNumber,
          length: blocks.length,
          width: blocks.width,
          height: blocks.height,
          color: blocks.color,
        },
      })
      .from(shipments)
      .innerJoin(
        finishedGoods,
        eq(shipments.finishedGoodId, finishedGoods.id)
      )
      .innerJoin(
        blocks,
        eq(finishedGoods.blockId, blocks.id)
      )
      .where(eq(shipments.id, shipment.id));

    res.json(completeShipment);
  } catch (error) {
    console.error("[API] Error creating shipment:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create shipment"
    });
  }
});

// Update shipment by ID
router.put("/shipment/:id", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.id);
    const { slabsShipped, shippedAt, shippingCompany } = req.body;

    if (isNaN(shipmentId)) {
      return res.status(400).json({ error: "Invalid shipment ID" });
    }

    if (!slabsShipped || !shippedAt || !shippingCompany) {
      return res.status(400).json({
        error: "Missing required fields: slabsShipped, shippedAt, or shippingCompany"
      });
    }

    console.log("[API] Updating shipment:", {
      id: shipmentId,
      slabsShipped,
      shippedAt,
      shippingCompany
    });

    const [updatedShipment] = await db
      .update(shipments)
      .set({
        slabsShipped,
        shippedAt: new Date(shippedAt),
        shippingCompany,
        updated_at: new Date()
      })
      .where(eq(shipments.id, shipmentId))
      .returning();

    if (!updatedShipment) {
      return res.status(404).json({ error: "Shipment not found" });
    }

    // Fetch the complete updated shipment data with joins
    const [completeShipment] = await db
      .select({
        id: shipments.id,
        slabsShipped: shipments.slabsShipped,
        shippedAt: shipments.shippedAt,
        shippingCompany: shipments.shippingCompany,
        finishedGoodId: shipments.finishedGoodId,
        block: {
          blockNumber: blocks.blockNumber,
          length: blocks.length,
          width: blocks.width,
          height: blocks.height,
          color: blocks.color,
        },
      })
      .from(shipments)
      .innerJoin(
        finishedGoods,
        eq(shipments.finishedGoodId, finishedGoods.id)
      )
      .innerJoin(
        blocks,
        eq(finishedGoods.blockId, blocks.id)
      )
      .where(eq(shipments.id, updatedShipment.id));

    const formattedShipment = {
      id: completeShipment.id,
      slabsShipped: completeShipment.slabsShipped,
      shippedAt: new Date(completeShipment.shippedAt).toISOString(),
      shippingCompany: completeShipment.shippingCompany,
      finishedGoodId: completeShipment.finishedGoodId,
      block: completeShipment.block
    };

    res.json(formattedShipment);
  } catch (error) {
    console.error("[API] Error updating shipment:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update shipment"
    });
  }
});

// Update the summary endpoint
router.get("/summary", async (_req, res) => {
  try {
    console.log("Fetching finished goods summary...");

    const [capacityData] = await db
      .select({
        totalCapacity: sql<number>`COUNT(*) * 200`,
        usedCapacity: sql<number>`COALESCE(SUM(${finishedGoods.slabCount}), 0)::integer`,
      })
      .from(stands)
      .leftJoin(finishedGoods, eq(stands.id, finishedGoods.standId));

    console.log("Capacity data:", capacityData);

    const qualityDistribution = await db
      .select({
        color: blocks.color,
        count: sql<number>`COALESCE(SUM(${finishedGoods.slabCount}), 0)::integer`,
        block: {
          id: blocks.id,
          length: blocks.length,
          height: blocks.height,
        },
      })
      .from(blocks)
      .innerJoin(finishedGoods, eq(blocks.id, finishedGoods.blockId))
      .groupBy(blocks.id, blocks.color);

    console.log("Quality distribution:", qualityDistribution);

    // Calculate total area with proper number conversions
    const totalArea = qualityDistribution.reduce((total, item) => {
      if (!item?.block?.length || !item?.block?.height) return total;
      const lengthFt = Math.floor((Number(item.block.length) - 6) / 12) +
        (Math.floor((Number(item.block.length) - 6) % 12 / 3) * 0.25);
      const heightFt = Math.floor((Number(item.block.height) - 6) / 12) +
        (Math.floor((Number(item.block.height) - 6) % 12 / 3) * 0.25);
      return total + (lengthFt * heightFt * Number(item.count));
    }, 0);

    // Get occupied stands count with proper type conversion
    const [{ occupiedStands }] = await db
      .select({
        occupiedStands: sql<number>`COUNT(DISTINCT ${finishedGoods.standId})::integer`,
      })
      .from(finishedGoods);

    const summary = {
      totalCapacity: Number(capacityData?.totalCapacity) || 0,
      usedCapacity: Number(capacityData?.usedCapacity) || 0,
      qualityDistribution: qualityDistribution.map(item => ({
        ...item,
        count: Number(item.count)
      })),
      totalArea,
      occupiedStands: Number(occupiedStands) || 0,
      totalStands: await db.select().from(stands).execute().then(rows => rows.length),
    };

    console.log("Sending summary:", summary);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Add endpoint to get finished goods by stand ID
router.get("/by-stand/:id", async (req, res) => {
  try {
    console.log("Fetching finished goods for stand:", req.params.id);

    const finishedGoodsData = await db
      .select({
        id: finishedGoods.id,
        blockId: finishedGoods.blockId,
        slabCount: finishedGoods.slabCount,
        stock_added_at: finishedGoods.stock_added_at,
        mediaCount: sql<number>`COALESCE(array_length(${finishedGoods.media}, 1), 0)`,
        block: {
          id: blocks.id,
          blockNumber: blocks.blockNumber,
          blockType: blocks.blockType,
          length: blocks.length,
          width: blocks.width,
          height: blocks.height,
          color: blocks.color,
        },
      })
      .from(finishedGoods)
      .innerJoin(blocks, eq(finishedGoods.blockId, blocks.id))
      .where(eq(finishedGoods.standId, parseInt(req.params.id)))
      .orderBy(desc(finishedGoods.stock_added_at));

    console.log("Found finished goods:", finishedGoodsData.length);
    res.json(finishedGoodsData);
  } catch (error) {
    console.error("Error fetching finished goods:", error);
    res.status(500).json({ error: "Failed to fetch finished goods" });
  }
});

export default router;