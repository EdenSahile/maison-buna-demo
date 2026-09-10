import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const counterPath = join(__dirname, '../data/counter.json');

// Dépendances externes neutralisées : ces tests portent sur la validation
// et la construction du devis, pas sur le PDF ni sur l'envoi d'emails.
const saveDevis = vi.fn();
const majEtat = vi.fn();
const generatePDF = vi.fn(async () => Buffer.from('%PDF-fake'));
const sendDevisEmails = vi.fn(async () => {});
const sendPdfFailureAlert = vi.fn(async () => {});

vi.mock('../data/storage.js', () => ({
  saveDevis: (d) => saveDevis(d),
  majEtat: (...a) => majEtat(...a),
  ETATS: {
    EN_COURS: 'en_cours',
    ENVOYE: 'envoye',
    ENVOYE_SANS_PDF: 'envoye_sans_pdf',
    ECHEC_ENVOI: 'echec_envoi',
    INTERROMPU: 'interrompu',
  },
}));
vi.mock('../services/pdfService.js', () => ({
  generatePDF: (d) => generatePDF(d),
  BUDGET_PDF_MS: 345000,
}));
vi.mock('../services/mailService.js', () => ({
  sendDevisEmails: (...a) => sendDevisEmails(...a),
  sendPdfFailureAlert: (...a) => sendPdfFailureAlert(...a),
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

beforeEach(() => {
  saveDevis.mockClear();
  majEtat.mockClear();
  generatePDF.mockClear().mockResolvedValue(Buffer.from('%PDF-fake'));
  sendDevisEmails.mockClear().mockResolvedValue(undefined);
  sendPdfFailureAlert.mockClear().mockResolvedValue(undefined);
});

// La génération se fait après la réponse, dans un setImmediate : on attend
// que la condition soit remplie plutôt que de dormir une durée arbitraire.
async function attendre(condition, limite = 2000) {
  const fin = Date.now() + limite;
  while (Date.now() < fin) {
    if (condition()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('Condition jamais remplie');
}

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

describe('POST /api/devis — référentiels café et quantité', () => {
  it('rejette un café absent du catalogue', async () => {
    const res = await post({ ...devisB2B, cafes: ['Moka'], quantiteParCafe: { Moka: '250 g' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Café inconnu : Moka');
  });

  it('rejette une quantité absente du catalogue', async () => {
    const res = await post({ ...devisB2B, quantiteParCafe: { Limmu: '3 tonnes' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Quantité inconnue pour Limmu : 3 tonnes');
  });

  // Sans Object.hasOwn, PRICING["constructor"] résout la propriété héritée
  // d'Object : entry est truthy, entry.sur_devis vaut undefined, et le total
  // devient NaN. Le PDF partait au client et à l'admin avec « NaN € ».
  it.each(['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty'])(
    'rejette la propriété héritée "%s" en 400, jamais en 500',
    async (heritee) => {
      const res = await post({ ...devisB2B, quantiteParCafe: { Limmu: heritee } });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(`Quantité inconnue pour Limmu : ${heritee}`);
      expect(saveDevis).not.toHaveBeenCalled();
    },
  );

  it('rejette un nom de café hérité d Object', async () => {
    const res = await post({ ...devisB2B, cafes: ['constructor'], quantiteParCafe: { constructor: '250 g' } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Café inconnu : constructor');
  });

  // String({toString: 1}) lève un TypeError : la valeur venant du client, cela
  // ressortait en 500 alors que le corps doit être refusé en 400.
  it.each([
    ['café', { cafes: [{ toString: 1 }], quantiteParCafe: {} }, 'Café inconnu : objet'],
    ['quantité', { quantiteParCafe: { Limmu: { toString: 1 } } }, 'Quantité inconnue pour Limmu : objet'],
  ])('rejette un %s dont toString n est pas appelable en 400, jamais 500', async (_l, patch, attendu) => {
    const res = await post({ ...devisB2B, ...patch });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(attendu);
  });

  it.each([
    { valeur: ['x'], attendu: 'Café inconnu : tableau' },
    { valeur: null,  attendu: 'Café inconnu : null' },
    { valeur: 42,    attendu: 'Café inconnu : 42' },
  ])('nomme le type reçu plutôt que de le convertir en chaîne vide ($attendu)', async ({ valeur, attendu }) => {
    const res = await post({ ...devisB2B, cafes: [valeur], quantiteParCafe: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(attendu);
  });

  it('tronque la valeur renvoyée dans le message d erreur', async () => {
    const res = await post({ ...devisB2B, cafes: ['X'.repeat(500)], quantiteParCafe: {} });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(`Café inconnu : ${'X'.repeat(50)}`);
  });
});

describe('POST /api/devis — typage des champs texte', () => {
  // Avant, .trim() sur un objet levait un TypeError capté par le catch de la
  // route : le client recevait 500 pour une saisie qu'il fallait refuser en 400.
  it.each([
    ['prenom', {}],
    ['nom', []],
    ['societe', ['x']],
    ['collaborateurs', {}],
    ['email', 42],
    ['telephone', { a: 'x' }],
    ['ville', 12345],
    ['frequence', ['a', 'b']],
    ['message', { texte: 'x' }],
  ])('rejette %s reçu en non-texte avec 400, jamais 500', async (champ, valeur) => {
    const res = await post({ ...devisB2B, [champ]: valeur });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(`Champ invalide : ${champ} (texte attendu)`);
    expect(saveDevis).not.toHaveBeenCalled();
  });

  it('accepte un champ optionnel absent ou null', async () => {
    expect((await post({ ...devisB2B, telephone: undefined })).status).toBe(200);
    expect((await post({ ...devisB2B, ville: null })).status).toBe(200);
  });
});

describe('POST /api/devis — bornes sur cafes', () => {
  it('rejette une liste de cafés plus longue que le catalogue', async () => {
    const res = await post({ ...devisB2B, cafes: Array(2000).fill('Limmu') });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Champ invalide : cafes (3 valeurs maximum)');
    expect(saveDevis).not.toHaveBeenCalled();
  });

  it('rejette les doublons', async () => {
    const res = await post({ ...devisB2B, cafes: ['Limmu', 'Limmu'] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Champ invalide : cafes (doublons)');
  });

  it('accepte les trois cafés du catalogue', async () => {
    const res = await post({
      ...devisB2B,
      cafes: ['Limmu', 'Sidamo', 'Yirgacheffe'],
      quantiteParCafe: { Limmu: '250 g', Sidamo: '250 g', Yirgacheffe: '500 g' },
    });
    expect(res.status).toBe(200);
  });

  it('ne persiste que les quantités des cafés retenus', async () => {
    const bruit = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`X${i}`, '250 g']));
    await post({ ...devisB2B, quantiteParCafe: { Limmu: '250 g', ...bruit } });
    expect(saveDevis.mock.calls[0][0].quantiteParCafe).toEqual({ Limmu: '250 g' });
  });
});

describe('POST /api/devis — longueurs maximales', () => {
  it.each([
    ['message', 2000],
    ['prenom', 100],
    ['nom', 100],
    ['societe', 150],
    ['telephone', 30],
    ['adresse', 200],
  ])('rejette un champ %s dépassant %i caractères', async (champ, max) => {
    const res = await post({ ...devisB2B, [champ]: 'a'.repeat(max + 1) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(`Champ trop long : ${champ} (${max} caractères maximum)`);
    expect(saveDevis).not.toHaveBeenCalled();
  });

  it('accepte un champ pile à la limite', async () => {
    const res = await post({ ...devisB2B, message: 'a'.repeat(2000) });
    expect(res.status).toBe(200);
  });

  it('rejette un email de plus de 254 caractères', async () => {
    const res = await post({ ...devisB2B, email: `${'a'.repeat(248)}@example.fr` });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Champ trop long : email (254 caractères maximum)');
  });

  it('rejette une liste de moutures trop longue ou non textuelle', async () => {
    expect((await post({ ...devisB2B, moutures: Array(11).fill('Grains entiers') })).status).toBe(400);
    expect((await post({ ...devisB2B, moutures: ['a'.repeat(51)] })).status).toBe(400);
    expect((await post({ ...devisB2B, moutures: [{}] })).status).toBe(400);
    expect((await post({ ...devisB2B, moutures: ['Grains entiers'] })).status).toBe(200);
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

describe('POST /api/devis — file saturée', () => {
  class AttenteDepasseeError extends Error {
    constructor() {
      super('Attente en file dépassée : 300000 ms sans créneau disponible');
      this.name = 'AttenteDepasseeError';
      this.code = 'ATTENTE_DEPASSEE';
    }
  }

  // La demande a déjà attendu son plafond : la remettre en file donnerait le
  // même résultat, avec le même délai.
  it('ne réessaie pas quand la file a saturé, et alerte l admin', async () => {
    generatePDF.mockRejectedValue(new AttenteDepasseeError());

    await post(devisB2B);
    await attendre(() => sendPdfFailureAlert.mock.calls.length > 0);

    expect(generatePDF).toHaveBeenCalledTimes(1);
  });

  it('n insiste pas non plus quand la file a atteint sa longueur maximale', async () => {
    const erreur = new Error("File d'attente saturée : 50 tâches déjà en attente");
    erreur.code = 'FILE_SATUREE';
    generatePDF.mockRejectedValue(erreur);

    await post(devisB2B);
    await attendre(() => sendPdfFailureAlert.mock.calls.length > 0);

    expect(generatePDF).toHaveBeenCalledTimes(1);
  });

  // Une panne ordinaire, elle, reste rattrapable : la relance a un sens.
  it('réessaie sur une panne de génération ordinaire', async () => {
    generatePDF
      .mockRejectedValueOnce(new Error('Chrome introuvable'))
      .mockResolvedValue(Buffer.from('%PDF-fake'));

    await post(devisB2B);
    await attendre(() => sendDevisEmails.mock.calls.length > 0, 9000);

    expect(generatePDF).toHaveBeenCalledTimes(2);
    expect(sendPdfFailureAlert).not.toHaveBeenCalled();
  });
});

describe('POST /api/devis — chemin d abandon : règle absolue n°4', () => {
  class AttenteDepasseeError extends Error {
    constructor() {
      super('Attente en file dépassée');
      this.code = 'ATTENTE_DEPASSEE';
    }
  }

  // Ne rien envoyer au client serait le pire des cas : sa demande est
  // enregistrée et il a vu un écran de confirmation.
  it.each([
    ['file saturée', () => new AttenteDepasseeError()],
    ['tentatives épuisées', () => new Error('Chrome introuvable')],
  ])('envoie quand même les deux emails quand le PDF échoue (%s)', async (_label, erreur) => {
    generatePDF.mockRejectedValue(erreur());

    await post(devisB2B);
    await attendre(() => sendDevisEmails.mock.calls.length > 0, 20000);

    expect(sendPdfFailureAlert).toHaveBeenCalledTimes(1);
    expect(sendDevisEmails).toHaveBeenCalledTimes(1);
    // Second argument : le buffer PDF, nul ici, donc aucune pièce jointe.
    expect(sendDevisEmails.mock.calls[0][1]).toBeNull();
  }, 30000);

  it('envoie le PDF en pièce jointe quand la génération réussit', async () => {
    await post(devisB2B);
    await attendre(() => sendDevisEmails.mock.calls.length > 0);

    expect(sendPdfFailureAlert).not.toHaveBeenCalled();
    expect(sendDevisEmails.mock.calls[0][1]).not.toBeNull();
  });
});

describe('POST /api/devis — état de la demande', () => {
  class AttenteDepasseeError extends Error {
    constructor() {
      super('Attente en file dépassée');
      this.code = 'ATTENTE_DEPASSEE';
    }
  }

  const idEnregistre = () => saveDevis.mock.calls[0][0].id;

  it('passe à « envoye » quand le PDF et les emails sont partis', async () => {
    await post(devisB2B);
    await attendre(() => majEtat.mock.calls.length > 0);
    expect(majEtat).toHaveBeenCalledWith(idEnregistre(), 'envoye', {});
  });

  // Sans cette distinction, rien ne permet de retrouver les devis dont le PDF
  // manque, alors que ce sont ceux que l'admin doit relancer à la main.
  // Une demande sur mesure n'attend aucun PDF : la marquer « envoye_sans_pdf »
  // la ferait remonter dans la liste des devis à relancer à la main, et une
  // relance renverrait au client ses deux emails une seconde fois.
  it('passe à « envoye » sur une demande sur mesure, sans PDF attendu', async () => {
    await post({ ...devisB2B, quantiteParCafe: { Limmu: 'Sur mesure' } });
    await attendre(() => majEtat.mock.calls.length > 0);

    expect(generatePDF).not.toHaveBeenCalled();
    expect(majEtat).toHaveBeenCalledWith(idEnregistre(), 'envoye', {});
  });

  it('passe à « envoye_sans_pdf » quand la génération a échoué', async () => {
    generatePDF.mockRejectedValue(new AttenteDepasseeError());

    await post(devisB2B);
    await attendre(() => majEtat.mock.calls.length > 0);
    expect(majEtat).toHaveBeenCalledWith(idEnregistre(), 'envoye_sans_pdf', {});
  });

  it('passe à « echec_envoi » et garde la cause quand l envoi échoue', async () => {
    sendDevisEmails.mockRejectedValue(new Error('SMTP indisponible'));

    await post(devisB2B);
    await attendre(() => majEtat.mock.calls.length > 0);
    expect(majEtat).toHaveBeenCalledWith(idEnregistre(), 'echec_envoi', { etat_erreur: 'SMTP indisponible' });
  });

  // Sur un disque plein, majEtat levait dans le try, le catch le rappelait, et
  // le rejet sortait du setImmediate sans personne pour le rattraper : le
  // processus s'arrêtait, et toutes les demandes en vol restaient « en cours ».
  it('survit à un enregistrement d état impossible', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    majEtat.mockImplementation(() => { throw new Error('ENOSPC : disque plein'); });

    const res = await post(devisB2B);
    expect(res.status).toBe(200);

    await attendre(() => erreur.mock.calls.some((c) => String(c[0]).includes('État non enregistré')));
    // La requête suivante passe toujours : le processus est vivant.
    expect((await post(devisB2B)).status).toBe(200);

    majEtat.mockReset();
    erreur.mockRestore();
  });

  // L'enregistrement précède toujours la mise à jour : c'est ce qui garantit
  // qu'une demande existe en base avant qu'on cherche à la faire évoluer.
  // Assertion sur l'ordre et non sur l'instant, les mocks se résolvant trop
  // vite pour qu'un « pas encore appelé » veuille dire quoi que ce soit.
  it('enregistre la demande avant d en faire évoluer l état', async () => {
    await post(devisB2B);
    await attendre(() => majEtat.mock.calls.length > 0);

    expect(saveDevis.mock.invocationCallOrder[0])
      .toBeLessThan(majEtat.mock.invocationCallOrder[0]);
    expect(saveDevis.mock.calls[0][0].etat).toBeUndefined();
  });
});
