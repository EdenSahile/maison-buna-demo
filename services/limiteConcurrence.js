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

export class AttenteDepasseeError extends Error {
  constructor(attenteMax) {
    super(`Attente en file dépassée : ${attenteMax} ms sans créneau disponible`);
    this.name = 'AttenteDepasseeError';
    this.code = 'ATTENTE_DEPASSEE';
  }
}

export function creerLimiteur({ max, fileMax, attenteMax }) {
  let actifs = 0;
  const attente = [];

  function liberer() {
    const suivant = attente.shift();
    // Le créneau passe directement au suivant : actifs reste inchangé.
    if (suivant) {
      clearTimeout(suivant.minuteur);
      suivant.demarrer();
    } else {
      actifs--;
    }
  }

  // Une tâche attend jusqu'à `attenteMax`, puis renonce. C'est ce plafond qui
  // décide du rejet, et non plus la seule longueur de la file : une file
  // réaliste doit être servie, pas refusée.
  function attendreCreneau() {
    return new Promise((demarrer, rejeter) => {
      const entree = { demarrer };
      entree.minuteur = setTimeout(() => {
        const index = attente.indexOf(entree);
        if (index !== -1) attente.splice(index, 1);
        rejeter(new AttenteDepasseeError(attenteMax));
      }, attenteMax);
      attente.push(entree);
    });
  }

  async function executer(tache) {
    if (actifs < max) {
      actifs++;
    } else if (attente.length >= fileMax) {
      // Garde-fou de dernier recours : chaque entrée en file retient un devis
      // en mémoire. Le rejet normal, lui, vient du plafond d'attente.
      throw new FileSatureeError(fileMax);
    } else {
      await attendreCreneau();
    }

    try {
      return await tache();
    } finally {
      liberer();
    }
  }

  return { executer, etat: () => ({ actifs, enAttente: attente.length }) };
}
