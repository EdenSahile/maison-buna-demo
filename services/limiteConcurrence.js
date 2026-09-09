// File d'attente à concurrence bornée.
//
// Chaque génération de PDF lance un Chromium complet. Sans borne, quatre
// requêtes simultanées lancent quatre Chromium et saturent la mémoire de
// l'instance. Le limiteur laisse passer `max` tâches à la fois et met les
// suivantes en attente, jusqu'à `fileMax` ; au-delà, il refuse tout de suite
// plutôt que de faire patienter sans fin.

export class FileSatureeError extends Error {
  constructor(fileMax) {
    super(`File d'attente saturée : ${fileMax} tâches déjà en attente`);
    this.name = 'FileSatureeError';
    this.code = 'FILE_SATUREE';
  }
}

export function creerLimiteur({ max, fileMax }) {
  let actifs = 0;
  const attente = [];

  function liberer() {
    const suivant = attente.shift();
    // Le créneau passe directement au suivant : actifs reste inchangé.
    if (suivant) suivant();
    else actifs--;
  }

  async function executer(tache) {
    if (actifs < max) {
      actifs++;
    } else if (attente.length >= fileMax) {
      throw new FileSatureeError(fileMax);
    } else {
      await new Promise((resolve) => attente.push(resolve));
    }

    try {
      return await tache();
    } finally {
      liberer();
    }
  }

  return { executer, etat: () => ({ actifs, enAttente: attente.length }) };
}
