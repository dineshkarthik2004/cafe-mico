import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as dotenv from 'dotenv';
dotenv.config(); // Railway automatically provides env variables, so local .env fallback is fine.

import { authRoutes } from './routes/auth';
import { menuRoutes } from './routes/menu';
import { tableRoutes } from './routes/table';
import { sessionRoutes } from './routes/session';
import { orderRoutes } from './routes/order';
import { kitchenRoutes } from './routes/kitchen';
import { adminMenuRoutes } from './routes/admin/menu';
import { adminTableRoutes } from './routes/admin/tables';
import { adminCategoryRoutes } from './routes/admin/categories';
import { adminSessionRoutes } from './routes/admin/sessions';
import { adminSettingsRoutes } from './routes/admin/settings';
import { adminAnalyticsRoutes } from './routes/admin/analytics';
import { adminUserRoutes } from './routes/admin/users';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Allow all vercel.app subdomains
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    // Allow explicitly listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // Temporarily allow all origins for initial setup
  },
  credentials: true,
};

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, true);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ─── Middleware ────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// ─── Health Check ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cafe', adminSettingsRoutes);

// ─── Kitchen Routes ───────────────────────────────────
app.use('/api/kitchen', kitchenRoutes);

// ─── Admin Routes ─────────────────────────────────────
app.use('/api/admin/menu', adminMenuRoutes);
app.use('/api/admin/tables', adminTableRoutes);
app.use('/api/admin/categories', adminCategoryRoutes);
app.use('/api/admin/sessions', adminSessionRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/users', adminUserRoutes);

// ─── Error Handler ────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Socket.IO Setup ──────────────────────────────────
setupSocketHandlers(io);

// ─── Start Server ─────────────────────────────────────
const PORT = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10);

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Cafe Mico API server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready`);
  console.log(`🔗 ${process.env.API_URL || `http://localhost:${PORT}`}\n`);
});

export { io };
