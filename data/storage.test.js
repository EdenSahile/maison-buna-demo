import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, 'devis.json');

// Le module écrit dans le vrai data/devis.json : on préserve l'état du poste.
const sauvegarde = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;

const { saveDevis, majEtat, marquerInterrompus, ETATS } = await import('./storage.js');

const lire = () => JSON.parse(readFileSync(filePath, 'utf8'));
const devis = (id) => ({ id, devis_numero: `MBE-${id}`, timestamp: new Date().toISOString() });

beforeEach(() => writeFileSync(filePath, '[]', 'utf8'));

afterAll(() => {
  if (sauvegarde !== null) writeFileSync(filePath, sauvegarde, 'utf8');
  else if (existsSync(filePath)) unlinkSync(filePath);
});

describe('saveDevis — état initial', () => {
  it('enregistre une demande en_cours par défaut', () => {
    saveDevis(devis('a'));
    expect(lire()[0].etat).toBe(ETATS.EN_COURS);
  });

  it('respecte un état déjà fixé par l appelant', () => {
    saveDevis({ ...devis('a'), etat: ETATS.ENVOYE });
    expect(lire()[0].etat).toBe(ETATS.ENVOYE);
  });

  it('ajoute sans écraser les demandes précédentes', () => {
    saveDevis(devis('a'));
    saveDevis(devis('b'));
    expect(lire().map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('repart de zéro si le fichier est illisible', () => {
    writeFileSync(filePath, '{ pas du JSON', 'utf8');
    saveDevis(devis('a'));
    expect(lire()).toHaveLength(1);
  });
});

describe('majEtat', () => {
  it('change l état et l horodate', () => {
    saveDevis(devis('a'));
    expect(majEtat('a', ETATS.ENVOYE)).toBe(true);

    const [enregistre] = lire();
    expect(enregistre.etat).toBe(ETATS.ENVOYE);
    expect(Date.parse(enregistre.etat_maj)).not.toBeNaN();
  });

  it('accepte des détails supplémentaires', () => {
    saveDevis(devis('a'));
    majEtat('a', ETATS.ECHEC_ENVOI, { etat_erreur: 'SMTP indisponible' });
    expect(lire()[0].etat_erreur).toBe('SMTP indisponible');
  });

  it('ne touche pas aux autres demandes', () => {
    saveDevis(devis('a'));
    saveDevis(devis('b'));
    majEtat('a', ETATS.ENVOYE);
    expect(lire()[1].etat).toBe(ETATS.EN_COURS);
  });

  // Le traitement de fond ne doit jamais casser sur un devis introuvable.
  it('renvoie false sur un id inconnu, sans lever', () => {
    saveDevis(devis('a'));
    expect(majEtat('inconnu', ETATS.ENVOYE)).toBe(false);
    expect(lire()[0].etat).toBe(ETATS.EN_COURS);
  });
});

describe('marquerInterrompus', () => {
  it('ne bascule que ce qui était en cours', () => {
    saveDevis(devis('a'));
    saveDevis({ ...devis('b'), etat: ETATS.ENVOYE });
    saveDevis({ ...devis('c'), etat: ETATS.ENVOYE_SANS_PDF });
    saveDevis(devis('d'));

    expect(marquerInterrompus()).toBe(2);

    const etats = Object.fromEntries(lire().map((d) => [d.id, d.etat]));
    expect(etats).toEqual({
      a: ETATS.INTERROMPU,
      b: ETATS.ENVOYE,
      c: ETATS.ENVOYE_SANS_PDF,
      d: ETATS.INTERROMPU,
    });
  });

  it('n écrit rien quand il n y a rien en cours', () => {
    saveDevis({ ...devis('a'), etat: ETATS.ENVOYE });
    const avant = readFileSync(filePath, 'utf8');
    expect(marquerInterrompus()).toBe(0);
    expect(readFileSync(filePath, 'utf8')).toBe(avant);
  });
});
