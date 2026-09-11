import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Le plafond est lu à l'import du module : il est posé avant. Fichier séparé
// de storage.test.js, que Vitest isole dans son propre processus, pour ne pas
// imposer un plafond de 3 aux tests d'enregistrement.
const dossier = mkdtempSync(join(tmpdir(), 'maison-buna-rotation-'));
const filePath = join(dossier, 'devis.json');
process.env.DEVIS_PATH = filePath;
process.env.DEVIS_MAX = '3';

const { saveDevis, ETATS } = await import('./storage.js');

const lire = () => JSON.parse(readFileSync(filePath, 'utf8'));
const archives = () => readdirSync(dossier).filter((f) => f.includes('.archive-') && !f.endsWith('.tmp'));
const lireArchive = (nom) => JSON.parse(readFileSync(join(dossier, nom), 'utf8'));
const devis = (id, etat = ETATS.ENVOYE) => ({ id, devis_numero: `MBE-${id}`, timestamp: new Date().toISOString(), etat });

beforeEach(() => {
  for (const f of readdirSync(dossier)) rmSync(join(dossier, f), { recursive: true, force: true });
  writeFileSync(filePath, '[]', 'utf8');
});

afterAll(() => {
  rmSync(dossier, { recursive: true, force: true });
  delete process.env.DEVIS_PATH;
  delete process.env.DEVIS_MAX;
});

describe('archivage — plafond du fichier vif', () => {
  it('n archive rien tant que le plafond n est pas dépassé', () => {
    for (const id of ['a', 'b', 'c']) saveDevis(devis(id));
    expect(lire()).toHaveLength(3);
    expect(archives()).toHaveLength(0);
  });

  // Sans plafond, le fichier grandit sans fin et chaque enregistrement coûte
  // plus cher que le précédent : 3 ms à 0,65 Mo, 126 ms à 33 Mo, en synchrone.
  it('sort les plus anciennes dès le dépassement et garde les plus récentes', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const id of ['a', 'b', 'c', 'd']) saveDevis(devis(id));

    expect(lire().map((d) => d.id)).toEqual(['b', 'c', 'd']);
    expect(archives()).toHaveLength(1);
    avertissement.mockRestore();
  });

  it('ne perd aucune demande : ce qui sort du fichier vif est dans l archive', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const id of ['a', 'b', 'c', 'd', 'e']) saveDevis(devis(id));

    const archivees = archives().flatMap((nom) => lireArchive(nom).map((d) => d.id));
    expect([...archivees, ...lire().map((d) => d.id)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    avertissement.mockRestore();
  });

  // Le balayage au démarrage ne retrouve que ce qui est dans le fichier vif :
  // archiver une demande encore en cours la laisserait « en_cours » pour
  // toujours, sans que personne sache qu'il faut la relancer.
  it.each([ETATS.EN_COURS, ETATS.ENVOI_EN_COURS])(
    'ne sort jamais une demande en %s, même la plus ancienne',
    (etat) => {
      const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
      saveDevis(devis('inachevee', etat));
      for (const id of ['b', 'c', 'd']) saveDevis(devis(id));

      expect(lire().map((d) => d.id)).toEqual(['inachevee', 'c', 'd']);
      expect(archives().flatMap(lireArchive).map((d) => d.id)).toEqual(['b']);
      avertissement.mockRestore();
    },
  );

  // Rien d'archivable : le fichier dépasse le plafond mais tout est en cours.
  it('garde tout quand aucune demande n est archivable', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e']) saveDevis(devis(id, ETATS.EN_COURS));
    expect(lire()).toHaveLength(5);
    expect(archives()).toHaveLength(0);
  });

  // Les greps de CLAUDE.md portent sur le fichier vif : une demande à relancer
  // qui part en archive disparaît de leur champ sans le dire.
  it('signale les demandes archivées qui demandent encore une action', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    saveDevis(devis('a', ETATS.ENVOYE_SANS_PDF));
    for (const id of ['b', 'c', 'd']) saveDevis(devis(id));

    expect(avertissement).toHaveBeenCalledWith(expect.stringContaining('1 qui demandent encore une action'));
    avertissement.mockRestore();
  });

  it('ne parle d action à la main que lorsqu il y en a une', () => {
    const avertissement = vi.spyOn(console, 'warn').mockImplementation(() => {});
    for (const id of ['a', 'b', 'c', 'd']) saveDevis(devis(id));

    expect(avertissement).toHaveBeenCalledWith(expect.stringContaining('archivée(s)'));
    expect(avertissement).not.toHaveBeenCalledWith(expect.stringContaining('action à la main'));
    avertissement.mockRestore();
  });

  // L'archivage n'est pas le travail demandé : son échec ne doit ni faire
  // échouer l'enregistrement, ni perdre les demandes qu'il devait sortir.
  it('garde tout en base quand l archive ne peut pas être écrite', () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const id of ['a', 'b', 'c']) saveDevis(devis(id));

    // Le nom du fichier temporaire de l'archive, occupé par un dossier.
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    mkdirSync(`${filePath}.archive-1234567890.tmp`);

    saveDevis(devis('d'));

    expect(lire().map((d) => d.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(erreur).toHaveBeenCalledWith(expect.stringContaining('Archivage impossible'));
    vi.restoreAllMocks();
  });
});
