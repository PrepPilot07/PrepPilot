import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import profileRouter from './routes/profile';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    'http://localhost:5174',
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

// ─── 404 catch-all ───────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 PrepPilot backend running on http://localhost:${PORT}`);
  console.log(`   GET  /health`);
  console.log(`   POST /auth/signup`);
  console.log(`   POST /auth/login`);
  console.log(`   GET  /profile/me  (protected)\n`);
});

export default app;

