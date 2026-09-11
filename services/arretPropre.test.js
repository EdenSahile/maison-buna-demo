import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installerArretPropre, balayerAuDemarrage } from './arretPropre.js';

// marquerInterrompus rend un bilan, pas un nombre : avec un mock qui rend un
// entier, journaliser() lisait `undefined` sans que rien ne le signale.
const bilan = (avantEnvoi = 0, pendantEnvoi = 0) => ({
  total: avantEnvoi + pendantEnvoi,
  avantEnvoi,
  pendantEnvoi,
});

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

function installer({ marquerInterrompus = vi.fn(() => bilan()), fermeture = 'immediate' } = {}) {
  const sortir = vi.fn();
  const serveur = {
    close: vi.fn((rappel) => { if (fermeture === 'immediate') rappel(); }),
  };
  retirer = installerArretPropre({ serveur, marquerInterrompus, delaiMs: 50, sortir });
  return { serveur, sortir, marquerInterrompus };
}

describe('installerArretPropre', () => {
  it.each(['SIGTERM', 'SIGINT'])('marque les demandes en cours sur %s', (signal) => {
    const { marquerInterrompus, serveur, sortir } = installer({ marquerInterrompus: vi.fn(() => bilan(3)) });

    process.emit(signal);

    // Deux passages : avant la fermeture, puis juste avant de sortir.
    expect(marquerInterrompus).toHaveBeenCalledTimes(2);
    expect(serveur.close).toHaveBeenCalled();
    expect(sortir).toHaveBeenCalledWith(0);
  });

  // Le marquage est la seule chose définitivement perdue si la fermeture
  // traîne : il doit précéder l'appel à close().
  it('marque avant de fermer le serveur', () => {
    const ordre = [];
    const marquerInterrompus = vi.fn(() => { ordre.push('marquage'); return bilan(1); });
    const sortir = vi.fn();
    const serveur = { close: vi.fn((rappel) => { ordre.push('close'); rappel(); }) };
    retirer = installerArretPropre({ serveur, marquerInterrompus, delaiMs: 50, sortir });

    process.emit('SIGTERM');
    expect(ordre).toEqual(['marquage', 'close', 'marquage']);
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

  // close() ne refuse que les nouvelles connexions : une requête arrivée sur
  // une connexion déjà ouverte peut encore enregistrer une demande pendant le
  // drainage. Sans second passage, elle resterait « en_cours » pour toujours.
  it('marque une seconde fois juste avant de sortir', () => {
    let rappelClose;
    const marquerInterrompus = vi.fn(() => bilan(1));
    const sortir = vi.fn();
    const serveur = { close: vi.fn((rappel) => { rappelClose = rappel; }) };
    retirer = installerArretPropre({ serveur, marquerInterrompus, delaiMs: 500, sortir });

    process.emit('SIGTERM');
    expect(marquerInterrompus).toHaveBeenCalledTimes(1);

    rappelClose();
    expect(marquerInterrompus).toHaveBeenCalledTimes(2);
    expect(sortir).toHaveBeenCalledWith(0);
  });

  it('marque aussi avant une sortie forcée', async () => {
    const marquerInterrompus = vi.fn(() => bilan(1));
    const sortir = vi.fn();
    const serveur = { close: vi.fn(() => {}) };
    retirer = installerArretPropre({ serveur, marquerInterrompus, delaiMs: 40, sortir });

    process.emit('SIGTERM');
    await new Promise((r) => setTimeout(r, 80));

    expect(marquerInterrompus).toHaveBeenCalledTimes(2);
    expect(sortir).toHaveBeenCalledWith(1);
  });

  // Le minuteur de sortie forcée doit être désarmé quand la fermeture aboutit,
  // sinon il reste actif et peut faire sortir en code 1 un arrêt réussi.
  it('désarme le minuteur de sortie forcée quand le serveur se ferme', async () => {
    let rappelClose;
    const sortir = vi.fn();
    const serveur = { close: vi.fn((rappel) => { rappelClose = rappel; }) };
    retirer = installerArretPropre({ serveur, marquerInterrompus: vi.fn(() => bilan()), delaiMs: 40, sortir });

    process.emit('SIGTERM');
    rappelClose();
    expect(sortir).toHaveBeenCalledWith(0);

    await new Promise((r) => setTimeout(r, 80));
    expect(sortir).toHaveBeenCalledTimes(1);
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

describe('balayerAuDemarrage', () => {
  // Un dépassement mémoire arrive en SIGKILL : aucun signal à intercepter,
  // donc rien n'est marqué. Au démarrage suivant, ce qui porte encore
  // « en_cours » vient forcément de l'exécution précédente.
  it('marque ce qui restait en cours de l exécution précédente', () => {
    const marquerInterrompus = vi.fn(() => bilan(4));
    expect(balayerAuDemarrage(marquerInterrompus)).toEqual(bilan(4));
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('arrêt précédent'));
  });

  // Le message doit dire lequel des deux cas, sans quoi l'exploitant ne sait
  // pas s'il peut relancer sans risquer un second envoi.
  it('distingue dans le message les demandes arrêtées pendant l envoi', () => {
    balayerAuDemarrage(vi.fn(() => bilan(2, 3)));

    const message = console.warn.mock.calls[0][0];
    expect(message).toContain('5 demande(s) inachevée(s)');
    expect(message).toContain("2 avant l'envoi");
    expect(message).toContain("3 pendant l'envoi");
    expect(message).toContain('vérifier avant de relancer');
  });

  it('ne mentionne pas un cas qui ne s est pas produit', () => {
    balayerAuDemarrage(vi.fn(() => bilan(2, 0)));

    const message = console.warn.mock.calls[0][0];
    expect(message).toContain("2 avant l'envoi");
    expect(message).not.toContain("pendant l'envoi");
  });

  it('reste silencieux quand il n y a rien à reprendre', () => {
    expect(balayerAuDemarrage(vi.fn(() => bilan()))).toEqual(bilan());
    expect(console.warn).not.toHaveBeenCalled();
  });

  // Le démarrage ne doit pas dépendre de l'état du disque.
  it('n empêche pas le démarrage si le marquage lève', () => {
    expect(balayerAuDemarrage(vi.fn(() => { throw new Error('disque plein'); }))).toEqual(bilan());
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('disque plein'));
  });
});
