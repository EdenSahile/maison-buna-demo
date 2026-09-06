import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import devisRouter from './routes/devis.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set('trust proxy', 1);

const devisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de demandes, réessayez dans 15 minutes.' },
});

app.use(helmet());
app.use(express.json());
app.use('/api/devis', devisLimiter);
app.use('/api', devisRouter);

app.use('/images', express.static(join(__dirname, 'public', 'images')));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'client', 'dist')));
  app.get('{*path}', (req, res) => {
    res.sendFile(join(__dirname, 'client', 'dist', 'index.html'));
  });
}

// Middleware d'erreur global — évite d'exposer la stack trace Express au client
app.use((err, _req, res, next) => {
  console.error('Erreur non gérée :', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Une erreur est survenue. Veuillez réessayer.' });
});

if (process.env.NODE_ENV === 'production' && !process.env.BASE_URL) {
  console.warn('⚠️  BASE_URL non défini en production — les images des emails REST pointeront vers le fallback démo.');
}

app.listen(PORT, () => {
  console.log(`Maison Buna Devis — http://localhost:${PORT}`);
});
