import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router as feedbackRouter } from './routes/feedback.js';

const app = express();
const PORT = process.env.PORT || 4000;

// CLIENT_ORIGIN may be a single origin or a comma-separated list (e.g. local
// dev + a deployed GitHub Pages URL).
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/feedback', feedbackRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Field feedback API listening on port ${PORT}`);
});
