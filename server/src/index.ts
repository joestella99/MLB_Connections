import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({ origin: ['http://localhost:4200', 'http://localhost:4000'] }));
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`MLB Connections API running on http://localhost:${PORT}`);
  console.log(`  Puzzles:  GET /api/puzzles`);
  console.log(`  Today:    GET /api/puzzles/today`);
  console.log(`  By ID:    GET /api/puzzles/:id`);
  console.log(`  Leaders:  GET /api/stats/leaders?stat=home_runs&year=2024`);
});
