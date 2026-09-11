import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Le plafond est lu à l'import du module : il est posé avant. Fichier séparé
// des autres tests de storage.js, que Vitest isole dans son propre
// processus, pour ne pas imposer une rétention de 90 jours aux autres.
const dossier = mkdtempSync(join(tmpdir(), 'maison-buna-retention-'));
const filePath = join(dossier, 'devis.json');
process.env.DEVIS_PATH = filePath;
process.env.DEVIS_RETENTION_JOURS = '90';

const { saveDevis, purgerAnciennes, ETATS } = await import('./storage.js');

const JOUR_MS = 24 * 60 * 60 * 1000;
const lire = () => JSON.parse(readFileSync(filePath, 'utf8'));
const archives = () => readdirSync(dossier).filter((f) => f.includes('.archive-') && !f.endsWith('.tmp'));
const lireArchive = (nom) => JSON.parse(readFileSync(join(dossier, nom), 'utf8'));

// il_y_a(jours) donne un timestamp ISO : la fonction sous test lit le champ
// timestamp, pas la date d'écriture du fichier.
const il_y_a = (jours) => new Date(Date.now() - jours * JOUR_MS).toISOString();
const devis = (id, jours, etat = ETATS.ENVOYE) => ({
  id, devis_numero: `MBE-${id}`, timestamp: il_y_a(jours), etat,
});

beforeEach(() => {
  for (const f of readdirSync(dossier)) rmSync(join(dossier, f), { recursive: true, force: true });
  writeFileSync(filePath, '[]', 'utf8');
});

afterAll(() => {
  rmSync(dossier, { recursive: true, force: true });
  delete process.env.DEVIS_PATH;
  delete process.env.DEVIS_RETENTION_JOURS;
});

describe('purgerAnciennes — fichier vif', () => {
  it('supprime les demandes de plus de 90 jours, garde les autres', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveDevis(devis('recente', 10));
    saveDevis(devis('limite', 89));
    saveDevis(devis('ancienne', 91));

    expect(purgerAnciennes()).toEqual({ total: 1 });
    expect(lire().map((d) => d.id)).toEqual(['recente', 'limite']);
    avertissement.mockRestore();
  });

  it('n écrit rien quand rien n est à purger', () => {
    saveDevis(devis('a', 10));
    const avant = readFileSync(filePath, 'utf8');
    expect(purgerAnciennes()).toEqual({ total: 0 });
    expect(readFileSync(filePath, 'utf8')).toBe(avant);
  });

  it('est idempotent', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveDevis(devis('ancienne', 200));
    purgerAnciennes();
    expect(purgerAnciennes()).toEqual({ total: 0 });
    avertissement.mockRestore();
  });

  // Passé le délai, la finalité qui justifiait de garder la demande n'existe
  // plus — qu'elle soit terminée ou restée bloquée en_cours.
  it.each([ETATS.EN_COURS, ETATS.ENVOI_EN_COURS, ETATS.ECHEC_ENVOI, ETATS.INTERROMPU])(
    'purge même une demande en %s si elle est trop ancienne',
    (etat) => {
      const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
      saveDevis(devis('vieille', 200, etat));
      expect(purgerAnciennes()).toEqual({ total: 1 });
      expect(lire()).toHaveLength(0);
      avertissement.mockRestore();
    },
  );

  // Un timestamp illisible ne doit jamais faire disparaître une demande par
  // erreur : la donnée qu'on ne sait pas dater est gardée, pas supprimée.
  it('garde une demande au timestamp illisible plutôt que de la supprimer', () => {
    saveDevis({ id: 'sans-date', devis_numero: 'MBE-x', etat: ETATS.ENVOYE, timestamp: 'pas-une-date' });
    expect(purgerAnciennes()).toEqual({ total: 0 });
    expect(lire()).toHaveLength(1);
  });

  it('avertit avec le nombre et le délai', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveDevis(devis('a', 200));
    saveDevis(devis('b', 200));
    purgerAnciennes();
    expect(avertissement).toHaveBeenCalledWith(expect.stringContaining('2 demande(s) de plus de 90 jours'));
    avertissement.mockRestore();
  });
});

describe('purgerAnciennes — archives', () => {
  it('purge aussi une demande archivée, sans toucher au fichier vif', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    writeFileSync(join(dossier, 'devis.json.archive-1'), JSON.stringify([devis('ancienne', 200)]), 'utf8');
    saveDevis(devis('vive', 5));

    expect(purgerAnciennes()).toEqual({ total: 1 });
    expect(lire().map((d) => d.id)).toEqual(['vive']);
    expect(existsSync(join(dossier, 'devis.json.archive-1'))).toBe(false);
    avertissement.mockRestore();
  });

  it('garde une archive dont une partie seulement dépasse la rétention', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nomArchive = 'devis.json.archive-2';
    writeFileSync(join(dossier, nomArchive), JSON.stringify([devis('vieille', 200), devis('recente', 10)]), 'utf8');

    expect(purgerAnciennes()).toEqual({ total: 1 });
    expect(lireArchive(nomArchive).map((d) => d.id)).toEqual(['recente']);
    avertissement.mockRestore();
  });

  it('supprime le fichier d archive devenu vide, pas seulement son contenu', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    writeFileSync(join(dossier, 'devis.json.archive-3'), JSON.stringify([devis('a', 200), devis('b', 300)]), 'utf8');
    purgerAnciennes();
    expect(archives()).toHaveLength(0);
    avertissement.mockRestore();
  });

  it('une archive illisible n empêche pas de purger les autres', () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    writeFileSync(join(dossier, 'devis.json.archive-abimee'), '{ pas du JSON', 'utf8');
    writeFileSync(join(dossier, 'devis.json.archive-saine'), JSON.stringify([devis('ancienne', 200)]), 'utf8');

    expect(purgerAnciennes()).toEqual({ total: 1 });
    expect(erreur).toHaveBeenCalledWith(expect.stringContaining('illisible'));
    expect(existsSync(join(dossier, 'devis.json.archive-abimee'))).toBe(true);
    expect(existsSync(join(dossier, 'devis.json.archive-saine'))).toBe(false);
    erreur.mockRestore();
    avertissement.mockRestore();
  });

  it('ignore les fichiers .tmp laissés par une écriture en cours', () => {
    writeFileSync(join(dossier, 'devis.json.archive-4.tmp'), JSON.stringify([devis('a', 200)]), 'utf8');
    expect(purgerAnciennes()).toEqual({ total: 0 });
    expect(existsSync(join(dossier, 'devis.json.archive-4.tmp'))).toBe(true);
  });
});
