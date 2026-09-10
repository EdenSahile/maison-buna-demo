import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installerArretPropre } from './arretPropre.js';

let retirer;

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  retirer?.();
  retirer = undefined;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function installer({ marquerInterrompus = vi.fn(() => 0), fermeture = 'immediate' } = {}) {
  const sortir = vi.fn();
  const serveur = {
    close: vi.fn((rappel) => { if (fermeture === 'immediate') rappel(); }),
  };
  retirer = installerArretPropre({ serveur, marquerInterrompus, delaiMs: 50, sortir });
  return { serveur, sortir, marquerInterrompus };
}

describe('installerArretPropre', () => {
  it.each(['SIGTERM', 'SIGINT'])('marque les demandes en cours sur %s', (signal) => {
    const { marquerInterrompus, serveur, sortir } = installer({ marquerInterrompus: vi.fn(() => 3) });

    process.emit(signal);

    expect(marquerInterrompus).toHaveBeenCalledTimes(1);
    expect(serveur.close).toHaveBeenCalled();
    expect(sortir).toHaveBeenCalledWith(0);
  });

  // Le marquage est la seule chose définitivement perdue si la fermeture
  // traîne : il doit précéder l'appel à close().
  it('marque avant de fermer le serveur', () => {
    const ordre = [];
    const marquerInterrompus = vi.fn(() => { ordre.push('marquage'); return 1; });
    const sortir = vi.fn();
    const serveur = { close: vi.fn((rappel) => { ordre.push('close'); rappel(); }) };
    retirer = installerArretPropre({ serveur, marquerInterrompus, delaiMs: 50, sortir });

    process.emit('SIGTERM');
    expect(ordre).toEqual(['marquage', 'close']);
  });

  it('ignore un second signal pendant l arrêt', () => {
    const { marquerInterrompus } = installer({ fermeture: 'jamais' });

    process.emit('SIGTERM');
    process.emit('SIGTERM');
    process.emit('SIGINT');

    expect(marquerInterrompus).toHaveBeenCalledTimes(1);
  });

  // Une connexion qui traîne ne doit pas retenir le processus jusqu'au
  // SIGKILL de l'hébergeur.
  it('force la sortie si le serveur ne se ferme pas', async () => {
    const { sortir } = installer({ fermeture: 'jamais' });

    process.emit('SIGTERM');
    expect(sortir).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 80));
    expect(sortir).toHaveBeenCalledWith(1);
  });

  // Si le marquage échoue, l'arrêt doit se poursuivre : mieux vaut un serveur
  // fermé proprement sans trace qu'un processus bloqué.
  it('ferme quand même si le marquage lève', () => {
    const { serveur, sortir } = installer({
      marquerInterrompus: vi.fn(() => { throw new Error('disque plein'); }),
    });

    process.emit('SIGTERM');

    expect(serveur.close).toHaveBeenCalled();
    expect(sortir).toHaveBeenCalledWith(0);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('disque plein'));
  });
});
