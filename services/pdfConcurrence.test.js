import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'child_process';

// Les bornes sont lues à l'import du module : elles sont posées avant.
// Fichier séparé de pdfService.test.js, que Vitest isole dans son propre
// processus, pour ne pas imposer ces réglages aux tests de génération.
process.env.PDF_MAX_CONCURRENT = '1';
process.env.PDF_MAX_FILE = '1';
process.env.PDF_TIMEOUT_MS = '400';

const { generatePDF, PdfTimeoutError, FileSatureeError, etatFilePDF } = await import('./pdfService.js');

const devis = {
  id: 'concurrence', devis_numero: 'MBE-20260909-00001',
  date_emission: '9 septembre 2026', date_validite: '9 octobre 2026',
  societe: 'Café Test', prenom: 'Marie', nom: 'Dupont', email: 'marie@example.fr',
  collaborateurs: '12', ville: 'Paris', cafes: ['Limmu'],
  quantite_resume: 'Limmu : 250 g', frequence: 'Mensuelle', moutures: ['Grains entiers'],
  pricing_rows: [{
    cafe: 'Limmu', region: 'Région Limmu · Éthiopie', designation: 'Café arabica',
    qte_label: '250 g', pu_ttc_fmt: '14,99 €', total_ttc_fmt: '14,99 €',
  }],
  grand_total_fmt: '14,99 €', sur_devis: false, is_particulier: false,
};

// Chromium est lancé comme processus fils du processus de test : on compte
// les fils avant et après pour détecter un orphelin.
function processusFils() {
  try {
    return execSync(`pgrep -P ${process.pid} || true`).toString().split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

const filsAuDepart = processusFils();

afterAll(() => {
  expect(etatFilePDF()).toEqual({ actifs: 0, enAttente: 0 });
});

describe('generatePDF — timeout par génération', () => {
  // 400 ms : le navigateur n'a pas le temps de rendre le devis complet.
  it('échoue avec une erreur nommée, pas une erreur générique', async () => {
    const erreur = await generatePDF(devis).catch((e) => e);
    expect(erreur).toBeInstanceOf(PdfTimeoutError);
    expect(erreur.code).toBe('PDF_TIMEOUT');
    expect(erreur.message).toContain('400 ms');
  });

  // Ce test vérifie l'état final : aucun processus fils ne subsiste après un
  // échec. Il passe avec ou sans le SIGKILL du timeout, parce que le finally
  // de rendre() ferme déjà le navigateur quand le lancement s'est terminé
  // normalement. Le SIGKILL couvre l'autre cas, celui d'un rendu bloqué où
  // browser.close() attendrait le protocole — cas que je n'ai pas su
  // reproduire de façon déterministe.
  it('ne laisse aucun processus Chromium derrière lui', async () => {
    await generatePDF(devis).catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    expect(processusFils()).toBeLessThanOrEqual(filsAuDepart);
  });

  it('libère le créneau : la génération suivante démarre', async () => {
    await generatePDF(devis).catch(() => {});
    expect(etatFilePDF().actifs).toBe(0);
    const erreur = await generatePDF(devis).catch((e) => e);
    expect(erreur).toBeInstanceOf(PdfTimeoutError);
  });
});

describe('generatePDF — file saturée', () => {
  it('refuse la troisième demande simultanée sans la faire attendre', async () => {
    const premiere = generatePDF(devis).catch((e) => e);
    const deuxieme = generatePDF(devis).catch((e) => e);
    await new Promise((r) => setTimeout(r, 20));

    expect(etatFilePDF()).toEqual({ actifs: 1, enAttente: 1 });

    const refusee = await generatePDF(devis).catch((e) => e);
    expect(refusee).toBeInstanceOf(FileSatureeError);
    expect(refusee.code).toBe('FILE_SATUREE');

    await Promise.all([premiere, deuxieme]);
  });
});
