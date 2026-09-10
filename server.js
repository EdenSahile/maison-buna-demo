import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import devisRouter from './routes/devis.js';
import { errorHandler } from './middleware/errorHandler.js';
import { entier } from './config/env.js';
import { marquerInterrompus } from './data/storage.js';
import { installerArretPropre } from './services/arretPropre.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Nombre de proxys de confiance devant l'application. Ce réglage décide de
// l'adresse IP retenue pour chaque requête, donc du comptage du limiteur de
// débit : 1 est correct derrière Render, 0 s'il n'y a aucun proxy. Codé en
// dur, un changement d'hébergeur fausserait le comptage sans rien signaler.
//
// Plafonné à 3 : au-delà, req.ip devient une valeur que le client choisit
// lui-même dans X-Forwarded-For, et le limiteur de débit se contourne en
// faisant varier l'en-tête. Sans plafond, une valeur énorme équivaut à
// « trust proxy: true », qu'express-rate-limit ne signale pas non plus.
app.set('trust proxy', entier('TRUST_PROXY', 1, 0, 3));

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
app.use(errorHandler);

if (process.env.NODE_ENV === 'production' && !process.env.BASE_URL) {
  console.warn('⚠️  BASE_URL non défini en production — les images des emails REST pointeront vers le fallback démo.');
}

const serveur = app.listen(PORT, () => {
  console.log(`Maison Buna Devis — http://localhost:${PORT}`);
});

installerArretPropre({ serveur, marquerInterrompus });
