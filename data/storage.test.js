import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// DEVIS_PATH détourne le module vers un fichier temporaire : la base réelle
// n'est jamais touchée, même si le run est interrompu au milieu — elle est
// dans .gitignore, une restauration ratée serait irrécupérable.
const dossier = mkdtempSync(join(tmpdir(), 'maison-buna-storage-'));
const filePath = join(dossier, 'devis.json');
process.env.DEVIS_PATH = filePath;

const { saveDevis, majEtat, marquerInterrompus, ETATS } = await import('./storage.js');

const lire = () => JSON.parse(readFileSync(filePath, 'utf8'));
const devis = (id) => ({ id, devis_numero: `MBE-${id}`, timestamp: new Date().toISOString() });

beforeEach(() => writeFileSync(filePath, '[]', 'utf8'));

afterAll(() => {
  rmSync(dossier, { recursive: true, force: true });
  delete process.env.DEVIS_PATH;
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

  it('accepte un fichier absent ou vide', () => {
    unlinkSync(filePath);
    saveDevis(devis('a'));
    expect(lire()).toHaveLength(1);

    writeFileSync(filePath, '   ', 'utf8');
    saveDevis(devis('b'));
    expect(lire().map((d) => d.id)).toEqual(['b']);
  });

  // Repartir de [] en silence effacerait la base à l'écriture suivante.
  it('met de côté un fichier illisible au lieu de l écraser', () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSync(filePath, '{ pas du JSON', 'utf8');

    saveDevis(devis('a'));

    expect(lire()).toHaveLength(1);
    expect(erreur).toHaveBeenCalledWith(expect.stringContaining('mis de côté'));

    const secours = readdirSync(dossier).find((f) => f.includes('.corrompu-'));
    expect(secours).toBeDefined();
    expect(readFileSync(join(dossier, secours), 'utf8')).toBe('{ pas du JSON');
    erreur.mockRestore();
  });

  // Sans fichier temporaire, une interruption au milieu de l'écriture laisse
  // un JSON tronqué, donc toute la base perdue.
  it('écrit de façon atomique, sans laisser de fichier temporaire', () => {
    saveDevis(devis('a'));
    expect(readdirSync(dossier).filter((f) => f.endsWith('.tmp'))).toHaveLength(0);
  });

  // Le nom .tmp occupé par un dossier fait échouer l'écriture temporaire.
  // Avec une écriture directe, la base serait déjà écrasée à cet instant ;
  // avec le passage par renameSync, elle est intacte.
  it('laisse la base intacte quand l écriture échoue', () => {
    saveDevis(devis('a'));
    const avant = readFileSync(filePath, 'utf8');
    mkdirSync(`${filePath}.tmp`);

    expect(() => saveDevis(devis('b'))).toThrow();
    expect(readFileSync(filePath, 'utf8')).toBe(avant);

    rmSync(`${filePath}.tmp`, { recursive: true });
  });

  // Un JSON valide mais qui n'est pas un tableau faisait échouer data.push,
  // donc toute demande en 500, indéfiniment.
  it.each(['{}', 'null', '"texte"', '42'])(
    'met de côté un contenu qui n est pas un tableau (%s)',
    (contenu) => {
      const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
      writeFileSync(filePath, contenu, 'utf8');

      saveDevis(devis('a'));

      expect(lire()).toHaveLength(1);
      expect(erreur).toHaveBeenCalledWith(expect.stringContaining("n'est pas un tableau"));
      erreur.mockRestore();
    },
  );
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

  it('refuse qu un détail écrase l identité ou l état de la demande', () => {
    saveDevis(devis('a'));
    const avant = lire()[0];

    majEtat('a', ETATS.ENVOYE, {
      id: 'usurpe',
      timestamp: '1999-01-01T00:00:00.000Z',
      etat: ETATS.EN_COURS,
      etat_maj: '1999-01-01T00:00:00.000Z',
      etat_erreur: 'conservé',
    });

    const apres = lire()[0];
    expect(apres.id).toBe('a');
    expect(apres.timestamp).toBe(avant.timestamp);
    expect(apres.etat).toBe(ETATS.ENVOYE);
    expect(apres.etat_maj).not.toBe('1999-01-01T00:00:00.000Z');
    expect(apres.etat_erreur).toBe('conservé');
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
