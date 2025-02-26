import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '@db/index';
import { blocks, productionJobs, machines } from '@db/schema';
import { eq, desc, sql } from 'drizzle-orm';

const router = express.Router();

// Enhanced CORS configuration for both web and mobile clients
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Health check endpoint
router.get("/ping", (_req, res) => {
  res.json({ message: "pong", timestamp: new Date().toISOString() });
});

// Get all blocks
router.get("/blocks", async (_req, res) => {
  try {
    console.log('[API] Fetching blocks...');
    const result = await db.query.blocks.findMany({
      orderBy: [desc(blocks.dateReceived)]
    });
    console.log(`[API] Successfully fetched ${result.length} blocks`);
    res.json(result);
  } catch (error) {
    console.error("[API] Error fetching blocks:", error);
    res.status(500).json({
      error: "Failed to fetch blocks",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get all machines
router.get("/machines", async (_req, res) => {
  try {
    console.log('[API] Fetching machines...');
    const result = await db.query.machines.findMany();
    console.log(`[API] Successfully fetched ${result.length} machines`);
    res.json(result);
  } catch (error) {
    console.error("[API] Error fetching machines:", error);
    res.status(500).json({
      error: "Failed to fetch machines",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get all production jobs
router.get("/production-jobs", async (_req, res) => {
  try {
    console.log('[API] Fetching production jobs...');
    const result = await db.query.productionJobs.findMany({
      orderBy: [desc(productionJobs.startTime)]
    });
    console.log(`[API] Successfully fetched ${result.length} production jobs`);
    res.json(result);
  } catch (error) {
    console.error("[API] Error fetching production jobs:", error);
    res.status(500).json({
      error: "Failed to fetch production jobs",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get production analytics
router.get("/analytics/production", async (_req, res) => {
  try {
    console.log("[API] Fetching production analytics...");
    const stages = ['cutting', 'grinding', 'chemical', 'epoxy', 'polishing'];

    const stageAnalytics = await Promise.all(stages.map(async (stage) => {
      const jobs = await db.query.productionJobs.findMany({
        where: eq(productionJobs.stage, stage)
      });

      const totalJobs = jobs.length;
      const completedJobs = jobs.filter(job => job.status === 'completed').length;
      const inProgressJobs = jobs.filter(job => job.status === 'in_progress').length;
      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      const totalSlabs = jobs.reduce((sum, job) => sum + (Number(job.totalSlabs) || 0), 0);

      const completedWithTimes = jobs.filter(job =>
        job.status === 'completed' &&
        job.startTime != null &&
        job.endTime != null
      );

      const totalTime = completedWithTimes.reduce((sum, job) => {
        if (!job.startTime || !job.endTime) return sum;
        const start = new Date(job.startTime);
        const end = new Date(job.endTime);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60);
      }, 0);

      const averageProcessingTime = completedWithTimes.length > 0
        ? totalTime / completedWithTimes.length
        : 0;

      return {
        stage,
        totalJobs,
        completedJobs,
        inProgressJobs,
        completionRate: parseFloat(completionRate.toFixed(2)),
        defectRate: 0,
        averageProcessingTime: Math.round(averageProcessingTime),
        totalSlabs,
        totalArea: 0
      };
    }));

    const summary = {
      totalActiveJobs: stageAnalytics.reduce((sum, stage) => sum + stage.inProgressJobs, 0),
      totalCompletedToday: stageAnalytics.reduce((sum, stage) => sum + stage.completedJobs, 0),
      overallCompletionRate: parseFloat(
        (stageAnalytics.reduce((sum, stage) => sum + stage.completionRate, 0) / stages.length).toFixed(2)
      ),
      totalSlabs: stageAnalytics.reduce((sum, stage) => sum + stage.totalSlabs, 0)
    };

    console.log("[API] Successfully fetched analytics:", { stageAnalytics, summary });
    res.json({
      stages: stageAnalytics,
      summary
    });
  } catch (error) {
    console.error("[API] Error in production analytics:", error);
    res.status(500).json({
      error: "Failed to fetch production analytics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get stats
router.get("/stats", async (_req, res) => {
  try {
    const [rawMaterialsCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(blocks);

    const [activeJobsCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(productionJobs)
      .where(eq(productionJobs.status, "in_progress"));

    const [qualityIssuesCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(productionJobs)
      .where(eq(productionJobs.qualityCheckStatus, "pending"));

    // Get counts for each stage
    const [cuttingCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(productionJobs)
      .where(eq(productionJobs.stage, "cutting"));

    const [grindingCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(productionJobs)
      .where(eq(productionJobs.stage, "grinding"));

    const [chemicalCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(productionJobs)
      .where(eq(productionJobs.stage, "chemical"));

    const [epoxyCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(productionJobs)
      .where(eq(productionJobs.stage, "epoxy"));

    const [polishingCount] = await db.select({
      count: sql<number>`count(*)`
    }).from(productionJobs)
      .where(eq(productionJobs.stage, "polishing"));

    res.json({
      rawMaterials: Number(rawMaterialsCount.count),
      activeJobs: Number(activeJobsCount.count),
      qualityIssues: Number(qualityIssuesCount.count),
      dailyCompletedCutting: Number(cuttingCount.count),
      dailyCompletedGrinding: Number(grindingCount.count),
      dailyCompletedChemical: Number(chemicalCount.count),
      dailyCompletedEpoxy: Number(epoxyCount.count),
      dailyCompletedPolishing: Number(polishingCount.count)
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      error: "Failed to fetch statistics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// File upload configuration
const uploadsDir = path.join(process.cwd(), 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
const videosDir = path.join(uploadsDir, 'videos');

[uploadsDir, imagesDir, videosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = file.mimetype.startsWith('image/') ? imagesDir : videosDir;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

router.use(express.json({ limit: '100mb' }));
router.use(express.urlencoded({ limit: '100mb', extended: true }));

// Add upload endpoint
router.post('/upload', (req, res) => {
  console.log('Upload request received:', {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });

  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        message: err.message,
        code: 'UPLOAD_ERROR'
      });
    }

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        message: 'No file was uploaded.',
        code: 'NO_FILE'
      });
    }

    const fileUrl = `/uploads/${path.basename(req.file.path)}`;
    console.log('File uploaded successfully:', fileUrl);
    res.json({ url: fileUrl });
  });
});

// Serve static files from uploads directory
router.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


export default router;