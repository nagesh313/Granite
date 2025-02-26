import type { Express } from "express";
import { createServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import apiRouter from './routes/index';
import finishedGoodsRouter from './routes/finished-goods';

// Export route registration function
export function registerRoutes(app: Express) {
  console.log('[Routes] Starting route registration...');

  // Create HTTP server
  const httpServer = createServer(app);

  // Set default content type for ALL routes, not just API routes
  app.use((req, res, next) => {
    console.log('[Routes] Handling request:', req.method, req.url);
    // Ensure JSON content type for all API routes BEFORE any other middleware
    if (req.url.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
    }
    next();
  });

  // Configure CORS middleware
  app.use((req, res, next) => {
    try {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');

      if (req.method === 'OPTIONS') {
        return res.status(200).json({});
      }
      next();
    } catch (error) {
      console.error('[Routes] CORS middleware error:', error);
      next(error);
    }
  });

  // Mount API routes BEFORE any static or catch-all middleware
  console.log('[Routes] Mounting API routes...');

  // Mount finished goods routes at /api/finished-goods
  app.use('/api/finished-goods', finishedGoodsRouter);
  console.log('[Routes] Mounted finished-goods router');

  // Mount main API router at /api
  app.use('/api', apiRouter);
  console.log('[Routes] Mounted main API router');

  // Error handling middleware for API routes - ensure JSON responses
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[Routes] Error:', err);
    if (!res.headersSent) {
      // Set content type again here to ensure JSON response
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
    }
  });

  // Initialize WebSocket server
  console.log('[Routes] Initializing WebSocket server...');
  const wss = new WebSocketServer({
    server: httpServer,
    verifyClient: ({ req }: { req: any }) => {
      const protocol = req.headers['sec-websocket-protocol'];
      return protocol !== 'vite-hmr';
    }
  });

  // WebSocket connection handling
  wss.on("connection", (ws) => {
    console.log("[WebSocket] New connection established");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error("[WebSocket] Message error:", error);
      }
    });

    ws.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
    });

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
    });
  });

  console.log('[Routes] Route registration completed');
  return httpServer;
}

export { apiRouter };