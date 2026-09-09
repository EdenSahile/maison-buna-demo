import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { creerLimiteur, FileSatureeError } from './limiteConcurrence.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '../templates/devis-template.html');

// Concurrence bornée. Mesuré sur ce projet : une instance Chromium
// supplémentaire coûte environ 100 Mo (coût marginal relevé à 23, 86, 96 puis
// 115 Mo pour la 1re à la 4e instance), et une génération dure ~500 ms en
// local. L'instance Render de la démo dispose de 512 Mo, dont ~150 déjà pris
// par Node, Express et le module Puppeteer : deux générations simultanées
// laissent environ 150 Mo de marge, trois n'en laisseraient presque aucune.
const MAX_CONCURRENT = Number(process.env.PDF_MAX_CONCURRENT || 2);

// À ~500 ms par PDF en local et deux fois plus sur Render, dix tâches en
// attente représentent au pire une dizaine de secondes. Au-delà, mieux vaut
// refuser tout de suite : la demande est déjà enregistrée et l'admin est
// alerté si le PDF ne part pas.
const MAX_FILE = Number(process.env.PDF_MAX_FILE || 10);

// Plafond par génération : les timeouts internes de Puppeteer (30 s pour le
// contenu, 60 s pour le rendu) ne couvrent pas un navigateur qui ne démarre
// pas. Sans ce plafond, une génération bloquée gèlerait la file.
const TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS || 45000);

const limiteur = creerLimiteur({ max: MAX_CONCURRENT, fileMax: MAX_FILE });

export { FileSatureeError };

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
    try {
      return await Promise.race([
        rendre(devis, contexte),
        new Promise((_, rejeter) => {
          minuteur = setTimeout(() => {
            // SIGKILL sur le processus navigateur : le finally de rendre()
            // reprend la main, aucun Chromium ne reste orphelin.
            contexte.browser?.process()?.kill('SIGKILL');
            rejeter(new PdfTimeoutError(TIMEOUT_MS));
          }, TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(minuteur);
    }
  });
}

// Pour les tests et une éventuelle sonde de supervision.
export const etatFilePDF = () => limiteur.etat();
