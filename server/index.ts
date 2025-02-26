import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import path from "path";
import { existsSync, mkdirSync } from 'fs';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
process.env.DATABASE_URL='postgresql://neondb_owner:npg_4a3HRbzPSmUW@ep-young-shadow-a6xkllle.us-west-2.aws.neon.tech/neondb?sslmode=require';
process.env.PGDATABASE='neondb';
process.env.PGPORT=5432;
process.env.PGUSER='neondb_owner';
process.env.PGPASSWORD='npg_4a3HRbzPSmUW';
process.env.NODE_ENV='production';
// Configure WebSocket for Neon
if (!global.WebSocket) {
  (global as any).WebSocket = ws;
}


// Initialize database connection with retry logic
const initializeDatabase = async () => {
  let attempts = 0;
  const maxAttempts = 5;
  const retryDelay = 2000;

  while (attempts < maxAttempts) {
    try {
      console.log('[Database] Attempting database connection...');
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000,
        maxUses: 7500,
        idleTimeoutMillis: 30000
      });

      // Test the connection
      await pool.query('SELECT 1');
      console.log('[Database] Connection established successfully');
      return pool;
    } catch (error) {
      attempts++;
      console.error(`[Database] Connection attempt ${attempts} failed:`, error);
      if (attempts === maxAttempts) {
        throw new Error('Failed to connect to database after maximum attempts');
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};

const app = express();
let server: any;

// Initialize database first, then start the server
(async () => {
  try {
    console.log('[Server] Starting initialization...');

    // Initialize database
    const pool = await initializeDatabase();
    (global as any).dbPool = pool;
    console.log('[Database] Pool initialized and exported');

    // Create required directories
    const dirs = [
      path.join(process.cwd(), 'uploads'),
      path.join(process.cwd(), 'uploads', 'images'),
      path.join(process.cwd(), 'uploads', 'videos'),
      path.join(process.cwd(), 'tmp')
    ];

    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });

    // Basic middleware setup with increased limits
    app.use(express.json({ limit: '100mb' }));
    app.use(express.urlencoded({ extended: true, limit: '100mb' }));

    // Register routes before serving static files
    console.log('[Server] Registering routes...');
    server = registerRoutes(app);
    console.log('[Server] Routes registered successfully');

    // Development vs Production setup
    if (process.env.NODE_ENV !== "production") {
      console.log('[Server] Setting up Vite development server...');
      await setupVite(app, server);
      console.log('[Server] Vite development server configured');
    } else {
      serveStatic(app);
      console.log('[Server] Static file serving configured');
    }

    // Use port 5000 to match the expected configuration
    const PORT = process.env.PORT || 5000;
    const HOST = '0.0.0.0';

    console.log(`[Server] Starting server on ${HOST}:${PORT}...`);
    server.listen(PORT, HOST, () => {
      console.log(`[Server] Server running at http://${HOST}:${PORT}`);
    });

  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
})();

// Graceful shutdown handler
const cleanup = async (signal: string) => {
  console.log(`\n[Server] ${signal} received. Starting graceful shutdown...`);
  try {
    if ((global as any).dbPool) {
      await (global as any).dbPool.end();
      console.log('[Database] Connection pool closed');
    }
    if (server) {
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
    }
  } catch (error) {
    console.error('[Server] Error during cleanup:', error);
    process.exit(1);
  }
};

// Register cleanup handlers
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  cleanup('UNCAUGHT_EXCEPTION');
});

export { app };