import { describe, it, expect, vi } from 'vitest';
import { creerLimiteur, FileSatureeError, AttenteDepasseeError } from './limiteConcurrence.js';

// Tâche contrôlable : on décide quand elle se termine.
function tacheManuelle() {
  let terminer, echouer;
  const promesse = new Promise((resolve, reject) => { terminer = resolve; echouer = reject; });
  return { tache: () => promesse, terminer, echouer };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('creerLimiteur — borne de concurrence', () => {
  it('ne laisse pas passer plus de `max` tâches à la fois', async () => {
    const limiteur = creerLimiteur({ max: 2, fileMax: 10, attenteMax: 5000 });
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
    const limiteur = creerLimiteur({ max: 1, fileMax: 10, attenteMax: 5000 });
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
    const limiteur = creerLimiteur({ max: 1, fileMax: 2, attenteMax: 5000 });
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
    const limiteur = creerLimiteur({ max: 1, fileMax: 1, attenteMax: 5000 });
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
    const limiteur = creerLimiteur({ max: 1, fileMax: 10, attenteMax: 5000 });
    await expect(limiteur.executer(async () => { throw new Error('panne'); })).rejects.toThrow('panne');
    expect(limiteur.etat()).toEqual({ actifs: 0, enAttente: 0 });
    await expect(limiteur.executer(async () => 'suivante')).resolves.toBe('suivante');
  });

  // Chemin non couvert jusqu'ici : la branche `if (suivant) suivant()` de
  // liberer(), celle du passage de relais, empruntée depuis un échec.
  it('sert la tâche en attente quand la précédente échoue', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 10, attenteMax: 5000 });
    const a = tacheManuelle();
    const enCours = limiteur.executer(a.tache);
    await tick();

    let servie = false;
    const suivante = limiteur.executer(async () => { servie = true; return 'ok'; });
    await tick();
    expect(limiteur.etat()).toEqual({ actifs: 1, enAttente: 1 });

    a.echouer(new Error('panne'));
    await expect(enCours).rejects.toThrow('panne');
    await expect(suivante).resolves.toBe('ok');
    expect(servie).toBe(true);
    expect(limiteur.etat()).toEqual({ actifs: 0, enAttente: 0 });
  });

  it('propage la valeur de retour de la tâche', async () => {
    const limiteur = creerLimiteur({ max: 2, fileMax: 10, attenteMax: 5000 });
    await expect(limiteur.executer(async () => 42)).resolves.toBe(42);
  });

  it('ne consomme aucun créneau quand la file est refusée', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 0, attenteMax: 5000 });
    const a = tacheManuelle();
    const enCours = limiteur.executer(a.tache);
    await tick();
    await expect(limiteur.executer(async () => 'refusee')).rejects.toBeInstanceOf(FileSatureeError);
    expect(limiteur.etat()).toEqual({ actifs: 1, enAttente: 0 });
    a.terminer();
    await enCours;
  });
});

describe('creerLimiteur — plafond d attente', () => {
  // Le rejet ne doit plus venir de la longueur de la file mais de l'attente :
  // une file réaliste doit être servie.
  it('sert une file entière tant que l attente reste sous le plafond', async () => {
    const limiteur = creerLimiteur({ max: 2, fileMax: 50, attenteMax: 3000 });
    const servies = [];

    // Dix demandes sur deux créneaux, 20 ms chacune : ~100 ms d'attente au
    // pire, très en dessous du plafond.
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        limiteur.executer(async () => {
          await new Promise((r) => setTimeout(r, 20));
          servies.push(i);
        }),
      ),
    );

    expect(servies).toHaveLength(10);
    expect(limiteur.etat()).toEqual({ actifs: 0, enAttente: 0 });
  });

  it('rejette seulement la tâche dont l attente dépasse le plafond', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 50, attenteMax: 200 });
    const a = tacheManuelle();
    const enCours = limiteur.executer(a.tache);
    await tick();

    const erreur = await limiteur.executer(async () => 'jamais').catch((e) => e);
    expect(erreur).toBeInstanceOf(AttenteDepasseeError);
    expect(erreur.code).toBe('ATTENTE_DEPASSEE');

    // La tâche renoncée est retirée de la file, pas laissée en place.
    expect(limiteur.etat()).toEqual({ actifs: 1, enAttente: 0 });

    a.terminer();
    await enCours;
    expect(limiteur.etat()).toEqual({ actifs: 0, enAttente: 0 });
  });

  // Sans le clearTimeout de liberer(), le minuteur d'une tâche déjà servie
  // reste armé. Le rejet qu'il déclenche ensuite est un no-op silencieux sur
  // une promesse déjà résolue : aucune assertion de comportement ne le voit.
  // On compte donc les minuteurs restants, seule preuve directe.
  it('désarme le plafond dès que la tâche est servie', async () => {
    vi.useFakeTimers();
    try {
      const limiteur = creerLimiteur({ max: 1, fileMax: 50, attenteMax: 10000 });
      const a = tacheManuelle();
      const enCours = limiteur.executer(a.tache);
      await Promise.resolve();

      const suivante = limiteur.executer(async () => 'servie');
      await Promise.resolve();
      expect(vi.getTimerCount()).toBe(1);

      a.terminer();
      await enCours;
      await expect(suivante).resolves.toBe('servie');

      expect(vi.getTimerCount()).toBe(0);
      expect(limiteur.etat()).toEqual({ actifs: 0, enAttente: 0 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('garde le garde-fou de longueur de file', async () => {
    const limiteur = creerLimiteur({ max: 1, fileMax: 1, attenteMax: 5000 });
    const a = tacheManuelle();
    const enCours = limiteur.executer(a.tache);
    await tick();
    const enFile = limiteur.executer(a.tache);
    await tick();

    await expect(limiteur.executer(async () => 'refusee')).rejects.toBeInstanceOf(FileSatureeError);

    a.terminer();
    await Promise.all([enCours, enFile]);
  });
});
