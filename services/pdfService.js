import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { creerLimiteur, FileSatureeError, AttenteDepasseeError } from './limiteConcurrence.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '../templates/devis-template.html');

// Une valeur d'environnement illisible ne doit pas désactiver la borne en
// silence : Number('deux') donne NaN, et `actifs < NaN` étant toujours faux,
// toutes les générations partaient en file sans jamais être servies.
function entier(nom, defaut, minimum) {
  const brut = process.env[nom];
  if (brut === undefined || brut === '') return defaut;
  const valeur = Number(brut);
  if (!Number.isInteger(valeur) || valeur < minimum) {
    console.warn(`${nom} invalide (${brut}) — valeur par défaut conservée : ${defaut}.`);
    return defaut;
  }
  return valeur;
}

// Concurrence bornée. Mesuré sur ce projet : une instance Chromium
// supplémentaire coûte environ 100 Mo (coût marginal relevé à 23, 86, 96 puis
// 115 Mo pour la 1re à la 4e instance), et une génération dure ~500 ms en
// local. L'instance Render de la démo dispose de 512 Mo, dont ~150 déjà pris
// par Node, Express et le module Puppeteer : deux générations simultanées
// laissent environ 150 Mo de marge, trois n'en laisseraient presque aucune.
const MAX_CONCURRENT = entier('PDF_MAX_CONCURRENT', 2, 1);

// Plafond d'attente en file. C'est lui qui décide du rejet : une demande
// attend jusqu'à cette durée avant qu'on renonce.
//
// Calcul : une file réaliste de dix demandes sur deux créneaux prend une
// quinzaine de secondes au rythme normal (~500 ms par PDF en local, le double
// sur Render), et jusqu'à 5 × 45 s = 225 s si chaque génération va au bout de
// son propre plafond. 300 s couvrent donc le pire cas d'une file réaliste.
//
// Render documente un délai de 100 minutes par requête HTTP, très au-dessus :
// ce n'est pas la contrainte. Et elle ne s'applique de toute façon pas ici,
// puisque la génération se fait hors du fil de la requête, après la réponse
// au client (routes/devis.js). 300 s restent nettement en dessous.
const ATTENTE_MAX_MS = entier('PDF_ATTENTE_MAX_MS', 300000, 1);

// Garde-fou de dernier recours, pas critère de rejet normal : chaque entrée
// en file retient un devis en mémoire. À 50, l'empreinte reste négligeable
// devant les 100 Mo d'une instance Chromium.
const MAX_FILE = entier('PDF_MAX_FILE', 50, 0);

// Plafond par génération : les timeouts internes de Puppeteer (30 s pour le
// contenu, 60 s pour le rendu) ne couvrent pas un navigateur qui ne démarre
// pas. Sans ce plafond, une génération bloquée gèlerait la file.
const TIMEOUT_MS = entier('PDF_TIMEOUT_MS', 45000, 1);

// Délai de grâce après un timeout : on garde le créneau le temps que le
// navigateur se ferme vraiment, mais pas plus. Attendre sans borne rendrait
// le créneau définitivement indisponible si le processus refusait de mourir,
// ce qui est pire que la borne dépassée un instant.
const FERMETURE_MS = entier('PDF_FERMETURE_MS', 5000, 1);

const limiteur = creerLimiteur({ max: MAX_CONCURRENT, fileMax: MAX_FILE, attenteMax: ATTENTE_MAX_MS });

export { FileSatureeError, AttenteDepasseeError };

// Exposé au client : le message de confirmation annonce ce délai.
export const ATTENTE_MAX_SECONDES = Math.round(ATTENTE_MAX_MS / 1000);

// kill() peut lever (EPERM, processus déjà mort). Puppeteer n'attache aucun
// écouteur 'error' sur le processus navigateur : une exception ici, dans un
// callback de minuteur, arrêterait le serveur.
function arretForce(browser) {
  try {
    browser?.process()?.kill('SIGKILL');
  } catch (err) {
    console.warn(`Arrêt forcé du navigateur impossible : ${err.message}`);
  }
}

export class PdfTimeoutError extends Error {
  constructor(ms) {
    super(`Génération PDF interrompue après ${ms} ms`);
    this.name = 'PdfTimeoutError';
    this.code = 'PDF_TIMEOUT';
  }
}

const logoPath = join(__dirname, '../public/images/monogram-mb.png');
const logoSrc = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;

async function rendre(devis, contexte) {
  const source = readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(source);
  const html = template({ ...devis, logo_src: logoSrc });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  });
  // Exposé à l'appelant pour que le timeout puisse tuer le processus.
  contexte.browser = browser;

  // Le timeout a pu tomber pendant le lancement : à ce moment-là
  // contexte.browser était encore vide et le SIGKILL n'a tué personne. Sans
  // cette relecture, le navigateur démarrait puis rendait tout le devis hors
  // de la file, alors que le créneau était déjà rendu.
  if (contexte.annule) {
    // Tuer d'abord : close() dialogue avec le navigateur et peut attendre
    // indéfiniment si celui-ci ne répond pas.
    arretForce(browser);
    await browser.close().catch(() => {});
    throw new PdfTimeoutError(TIMEOUT_MS);
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, timeout: 60000 });
    return pdf;
  } finally {
    // Peut échouer si le timeout a déjà tué le processus : sans ce catch,
    // l'erreur de fermeture masquerait la vraie cause.
    await browser.close().catch(() => {});
  }
}

export function generatePDF(devis) {
  return limiteur.executer(async () => {
    const contexte = {};
    let minuteur;

    const rendu = rendre(devis, contexte);
    // La course rejette avant que `rendu` ne se règle : sans ce catch, son
    // échec deviendrait un rejet non traité.
    rendu.catch(() => {});

    try {
      return await Promise.race([
        rendu,
        new Promise((_, rejeter) => {
          minuteur = setTimeout(() => {
            // Rejet d'abord : si l'arrêt forcé levait, la course ne se
            // réglerait jamais et le créneau serait perdu définitivement.
            contexte.annule = true;
            rejeter(new PdfTimeoutError(TIMEOUT_MS));
            // SIGKILL quand le navigateur tourne déjà. S'il est encore en
            // train de démarrer, c'est le drapeau ci-dessus qui le ferme,
            // juste après le lancement.
            arretForce(contexte.browser);
          }, TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(minuteur);
      // Le créneau n'est rendu qu'une fois le navigateur réellement fermé.
      // Sinon le limiteur libère la place dès le rejet de la course, alors
      // qu'un Chromium lancé juste après le timeout tourne encore : deux
      // générations de plus démarraient par-dessus, et la borne sautait.
      // Borné par FERMETURE_MS pour ne pas geler le créneau indéfiniment.
      let grace;
      await Promise.race([
        rendu.catch(() => {}),
        new Promise((resoudre) => { grace = setTimeout(resoudre, FERMETURE_MS); }),
      ]);
      clearTimeout(grace);
    }
  });
}

// Pour les tests et une éventuelle sonde de supervision.
export const etatFilePDF = () => limiteur.etat();
