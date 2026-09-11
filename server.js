import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import devisRouter from './routes/devis.js';
import { errorHandler } from './middleware/errorHandler.js';
import { entier } from './config/env.js';
import { marquerInterrompus, purgerAnciennes } from './data/storage.js';
import { installerArretPropre, balayerAuDemarrage } from './services/arretPropre.js';

// Une fois par jour suffit : la donnée la plus urgente à purger a au moins
// DEVIS_RETENTION_JOURS (180 par défaut), une vérification quotidienne ne
// la laisse jamais traîner plus d'un jour au-delà de son délai.
const PURGE_INTERVALLE_MS = 24 * 60 * 60 * 1000;

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
  // Après l'ouverture du port : la lecture de la base croît avec sa taille
  // (mesuré : 3 ms à 0,65 Mo, 126 ms à 33 Mo) et n'a pas à retarder le
  // démarrage. La garantie est la même, rien ne peut être en cours avant.
  balayerAuDemarrage(marquerInterrompus);

  // Après le balayage : une demande interrompue redevient repérable avant
  // d'être, le cas échéant, purgée si elle a aussi dépassé la conservation.
  purgerAnciennes();
  // unref() : ce minuteur ne doit pas empêcher le process de s'arrêter tout
  // seul (tests, scripts) ni retarder l'arrêt propre, qui ne l'attend pas.
  setInterval(purgerAnciennes, PURGE_INTERVALLE_MS).unref?.();
});

installerArretPropre({ serveur, marquerInterrompus });
