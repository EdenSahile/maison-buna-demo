import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const counterPath = join(__dirname, '../data/counter.json');

// Dépendances externes neutralisées : ces tests portent sur la validation
// et la construction du devis, pas sur le PDF ni sur l'envoi d'emails.
const saveDevis = vi.fn();
vi.mock('../data/storage.js', () => ({ saveDevis: (d) => saveDevis(d) }));
vi.mock('../services/pdfService.js', () => ({ generatePDF: vi.fn(async () => Buffer.from('%PDF-fake')) }));
vi.mock('../services/mailService.js', () => ({
  sendDevisEmails: vi.fn(async () => {}),
  sendPdfFailureAlert: vi.fn(async () => {}),
}));

let server, baseUrl, counterBackup = null;

beforeAll(async () => {
  // Le compteur écrit dans data/counter.json — on préserve l'état réel du poste.
  if (existsSync(counterPath)) counterBackup = readFileSync(counterPath, 'utf8');

  const express = (await import('express')).default;
  const devisRouter = (await import('./devis.js')).default;

  const app = express();
  app.use(express.json());
  app.use('/api', devisRouter);

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  if (counterBackup !== null) writeFileSync(counterPath, counterBackup);
  else if (existsSync(counterPath)) unlinkSync(counterPath);
});

beforeEach(() => saveDevis.mockClear());

function post(body, headers = { 'content-type': 'application/json' }) {
  return fetch(`${baseUrl}/api/devis`, { method: 'POST', headers, body: JSON.stringify(body) });
}

const devisB2B = {
  societe: 'Café du Coin', prenom: 'Marie', nom: 'Dupont',
  email: 'marie@cafeducoin.fr', collaborateurs: '12',
  cafes: ['Limmu'], quantiteParCafe: { Limmu: '250 g' },
};

const devisParticulier = {
  societe: 'Particulier', prenom: 'Jean', nom: 'Martin',
  email: 'jean@example.fr', adresse: '3 rue des Lilas',
  cafes: ['Sidamo'], quantiteParCafe: { Sidamo: '500 g' },
};

describe('POST /api/devis — Content-Type', () => {
  it('refuse une requête non-JSON avec 415', async () => {
    const res = await fetch(`${baseUrl}/api/devis`, {
      method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'nope',
    });
    expect(res.status).toBe(415);
  });
});

describe('POST /api/devis — validation serveur (règle absolue n°3)', () => {
  it.each([
    ['prenom manquant',        { ...devisB2B, prenom: '' },            'Champ manquant : prenom'],
    ['nom manquant',           { ...devisB2B, nom: '   ' },            'Champ manquant : nom'],
    ['email absent',           { ...devisB2B, email: undefined },      'Email invalide'],
    ['email malformé',         { ...devisB2B, email: 'pas-un-email' }, 'Email invalide'],
    ['cafes vide',             { ...devisB2B, cafes: [] },             'Champ manquant : cafes'],
    ['cafes non-tableau',      { ...devisB2B, cafes: 'Limmu' },        'Champ manquant : cafes'],
    ['quantiteParCafe absent', { ...devisB2B, quantiteParCafe: null }, 'Champ manquant : quantiteParCafe'],
  ])('rejette en 400 : %s', async (_label, body, expectedError) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(expectedError);
  });

  it('rejette une quantité manquante pour un café sélectionné', async () => {
    const res = await post({ ...devisB2B, cafes: ['Limmu', 'Sidamo'], quantiteParCafe: { Limmu: '250 g' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Quantité manquante pour : Sidamo');
  });

  it('exige societe et collaborateurs pour une entreprise', async () => {
    expect((await post({ ...devisB2B, societe: '' })).status).toBe(400);
    const res = await post({ ...devisB2B, collaborateurs: '' });
    expect((await res.json()).error).toBe('Champ manquant : collaborateurs');
  });

  it('exige une adresse pour un particulier, mais pas de collaborateurs', async () => {
    const res = await post({ ...devisParticulier, adresse: '' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Champ manquant : adresse');
    expect((await post(devisParticulier)).status).toBe(200);
  });
});

describe('POST /api/devis — sauvegarde (règle absolue n°5)', () => {
  it('accepte un devis valide et retourne un id', async () => {
    const res = await post(devisB2B);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sauvegarde avec timestamp ISO et id unique', async () => {
    await post(devisB2B);
    await post(devisB2B);
    expect(saveDevis).toHaveBeenCalledTimes(2);
    const [a, b] = saveDevis.mock.calls.map((c) => c[0]);
    expect(a.id).not.toBe(b.id);
    expect(() => new Date(a.timestamp).toISOString()).not.toThrow();
    expect(a.timestamp).toBe(new Date(a.timestamp).toISOString());
  });

  it('numérote MBE pour une entreprise et MBP pour un particulier', async () => {
    await post(devisB2B);
    expect(saveDevis.mock.calls[0][0].devis_numero).toMatch(/^MBE-\d{8}-\d{5}$/);
    saveDevis.mockClear();
    await post(devisParticulier);
    expect(saveDevis.mock.calls[0][0].devis_numero).toMatch(/^MBP-\d{8}-\d{5}$/);
  });
});

describe('POST /api/devis — tarification', () => {
  it('calcule le total TTC pour des quantités au catalogue', async () => {
    await post({ ...devisB2B, cafes: ['Limmu', 'Sidamo'], quantiteParCafe: { Limmu: '250 g', Sidamo: '500 g' } });
    const devis = saveDevis.mock.calls[0][0];
    expect(devis.sur_devis).toBe(false);
    expect(devis.grand_total_fmt).toContain('42,99');
  });

  it('bascule en sur-mesure sans total dès qu un café est "Sur mesure"', async () => {
    await post({ ...devisB2B, cafes: ['Limmu', 'Sidamo'], quantiteParCafe: { Limmu: '250 g', Sidamo: 'Sur mesure' } });
    const devis = saveDevis.mock.calls[0][0];
    expect(devis.sur_devis).toBe(true);
    expect(devis.grand_total_fmt).toBeNull();
    expect(devis.quantite_resume).toContain('Sidamo : sur mesure');
  });

  it('marque is_particulier selon le type de client', async () => {
    await post(devisParticulier);
    expect(saveDevis.mock.calls[0][0].is_particulier).toBe(true);
    saveDevis.mockClear();
    await post(devisB2B);
    expect(saveDevis.mock.calls[0][0].is_particulier).toBe(false);
  });
});
