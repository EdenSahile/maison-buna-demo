import { describe, it, expect } from 'vitest';
import { creerLimiteur, FileSatureeError } from './limiteConcurrence.js';

// Tâche contrôlable : on décide quand elle se termine.
function tacheManuelle() {
  let terminer, echouer;
  const promesse = new Promise((resolve, reject) => { terminer = resolve; echouer = reject; });
  return { tache: () => promesse, terminer, echouer };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('creerLimiteur — borne de concurrence', () => {
  it('ne laisse pas passer plus de `max` tâches à la fois', async () => {
    const limiteur = creerLimiteur({ max: 2, fileMax: 10 });
    let simultanees = 0, maximumVu = 0;

    const tache = async () => {
      simultanees++;
      maximumVu = Math.max(maximumVu, simultanees);
      await new Promise((r) => setTimeout(r, 10));
      simultanees--;
    };

    await Promise.all(Array.from({ length: 8 }, () => limiteur.executer(tache)));
    expect(maximumVu).toBe(2);
    expect(limiteur.etat()).toEqual({ actifs: 0, enAttente: 0 });
  });

  it('met les tâches en attente et les sert dans l ordre', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 10 });
    const ordre = [];
    const a = tacheManuelle();

    const p1 = limiteur.executer(a.tache);
    await tick();
    const p2 = limiteur.executer(async () => { ordre.push(2); });
    const p3 = limiteur.executer(async () => { ordre.push(3); });
    await tick();

    expect(ordre).toEqual([]);
    expect(limiteur.etat()).toEqual({ actifs: 1, enAttente: 2 });

    a.terminer();
    await Promise.all([p1, p2, p3]);
    expect(ordre).toEqual([2, 3]);
  });
});

describe('creerLimiteur — file saturée', () => {
  it('refuse au-delà de fileMax au lieu de faire attendre sans fin', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 2 });
    const a = tacheManuelle();
    const enCours = limiteur.executer(a.tache);
    await tick();

    const enAttente = [limiteur.executer(a.tache), limiteur.executer(a.tache)];
    await tick();
    expect(limiteur.etat()).toEqual({ actifs: 1, enAttente: 2 });

    await expect(limiteur.executer(async () => 'jamais')).rejects.toBeInstanceOf(FileSatureeError);
    await expect(limiteur.executer(async () => 'jamais')).rejects.toMatchObject({ code: 'FILE_SATUREE' });

    a.terminer();
    await Promise.all([enCours, ...enAttente]);
  });

  it('accepte de nouveau une tâche dès qu une place se libère', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 1 });
    const a = tacheManuelle();
    const enCours = limiteur.executer(a.tache);
    await tick();
    const enAttente = limiteur.executer(async () => 'ok');
    await tick();

    await expect(limiteur.executer(async () => 'refusee')).rejects.toBeInstanceOf(FileSatureeError);

    a.terminer();
    await Promise.all([enCours, enAttente]);
    await expect(limiteur.executer(async () => 'acceptee')).resolves.toBe('acceptee');
  });
});

describe('creerLimiteur — libération du créneau', () => {
  it('libère le créneau même si la tâche échoue', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 10 });
    await expect(limiteur.executer(async () => { throw new Error('panne'); })).rejects.toThrow('panne');
    expect(limiteur.etat()).toEqual({ actifs: 0, enAttente: 0 });
    await expect(limiteur.executer(async () => 'suivante')).resolves.toBe('suivante');
  });

  it('propage la valeur de retour de la tâche', async () => {
    const limiteur = creerLimiteur({ max: 2, fileMax: 10 });
    await expect(limiteur.executer(async () => 42)).resolves.toBe(42);
  });

  it('ne consomme aucun créneau quand la file est refusée', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 0 });
    const a = tacheManuelle();
    const enCours = limiteur.executer(a.tache);
    await tick();
    await expect(limiteur.executer(async () => 'refusee')).rejects.toBeInstanceOf(FileSatureeError);
    expect(limiteur.etat()).toEqual({ actifs: 1, enAttente: 0 });
    a.terminer();
    await enCours;
  });
});
