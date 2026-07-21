import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';
import uploadRouter from './routes/upload';
import roadmapRouter from './routes/roadmap';
import dashboardRouter from './routes/dashboard';
import notificationsRouter from './routes/notifications';
import { startDailyReminderScheduler } from './services/scheduler/dailyReminder';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    '://localhost:5174',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/roadmap', roadmapRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notifications', notificationsRouter);

// ─── WhatsApp Sandbox Info (no auth — used by the frontend connect page) ─────

app.get('/api/whatsapp/sandbox-info', (_req, res) => {
  res.json({
    sandboxNumber: '+14155238886',
    joinKeyword: process.env.TWILIO_SANDBOX_KEYWORD || 'join grew-worry',
    waLink: `https://wa.me/14155238886?text=${encodeURIComponent(process.env.TWILIO_SANDBOX_KEYWORD || 'join grew-worry')}`,
  });
});

// ─── 404 catch-all ───────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start ───────────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(`\n🚀 PrepPilot backend running on http://localhost:${PORT}`);
  console.log(`   GET  /health`);
  console.log(`   POST /auth/signup`);
  console.log(`   POST /auth/login`);
  console.log(`   GET  /profile/me  (protected)`);
  console.log(`   PATCH /profile/whatsapp (protected)`);
  console.log(`   DELETE /profile/whatsapp (protected)`);
  console.log(`   POST /api/upload  (protected)`);
  console.log(`   GET  /api/upload  (protected)`);
  console.log(`   GET  /api/roadmap (protected)`);
  console.log(`   GET  /api/dashboard (protected)`);
  console.log(`   POST /api/dashboard/practice-answer (protected)`);
  console.log(`   GET  /api/notifications (protected)`);
  console.log(`   GET  /api/whatsapp/sandbox-info (public)\n`);

  // Start WhatsApp daily reminder scheduler (no-op if Twilio not configured)
  startDailyReminderScheduler();
});

server.on('error', (err) => {
  console.error('Server listen error:', err);
});

export default app;
