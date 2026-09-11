// Arrêt propre du processus.
//
// Le PDF et les deux emails partent après la réponse au client, dans le même
// processus. Un redémarrage — déploiement Render, plantage, Ctrl+C — perdait
// donc ce travail sans laisser de trace : la demande restait en base comme si
// tout s'était bien passé. Elle est désormais marquée « interrompu ».

const DELAI_FORCE_MS = 10000;

// Balayage au démarrage. Tous les arrêts ne laissent pas le temps de marquer :
// un dépassement mémoire — le plus probable sur une instance de 512 Mo qui
// lance Chromium — arrive en SIGKILL, sans signal à intercepter. Au démarrage
// suivant, plus rien n'est en cours par définition : ce qui porte encore
// « en_cours » vient forcément de l'exécution précédente.
const BILAN_VIDE = { total: 0, avantEnvoi: 0, pendantEnvoi: 0 };

// Détaille le bilan : « pendant l'envoi » veut dire que les emails ont pu
// partir, et qu'une relance aveugle les enverrait une seconde fois.
function journaliser(bilan, contexte) {
  if (!bilan?.total) return;

  const morceaux = [];
  if (bilan.avantEnvoi > 0) {
    morceaux.push(`${bilan.avantEnvoi} avant l'envoi (« interrompu » : le client n'a rien reçu)`);
  }
  if (bilan.pendantEnvoi > 0) {
    morceaux.push(`${bilan.pendantEnvoi} pendant l'envoi (« interrompu_pendant_envoi » : vérifier avant de relancer)`);
  }
  console.warn(`${bilan.total} demande(s) inachevée(s) ${contexte} — ${morceaux.join(', ')}.`);
}

export function balayerAuDemarrage(marquerInterrompus) {
  try {
    const bilan = marquerInterrompus();
    journaliser(bilan, 'après un arrêt précédent');
    return bilan;
  } catch (err) {
    console.error(`Balayage au démarrage impossible : ${err.message}`);
    return BILAN_VIDE;
  }
}

export function installerArretPropre({ serveur, marquerInterrompus, delaiMs = DELAI_FORCE_MS, sortir = (code) => process.exit(code) }) {
  let enCours = false;

  function marquer() {
    try {
      const bilan = marquerInterrompus();
      journaliser(bilan, "à l'arrêt");
      return bilan;
    } catch (err) {
      console.error(`Marquage des demandes en cours impossible : ${err.message}`);
      return BILAN_VIDE;
    }
  }

  function arreter(signal) {
    // Render envoie SIGTERM puis SIGKILL : un second signal ne doit pas
    // relancer la procédure au milieu de la première.
    if (enCours) return;
    enCours = true;
    console.log(`${signal} reçu — arrêt en cours.`);

    // Marquage d'abord : c'est synchrone et rapide, et c'est la seule chose
    // qui serait définitivement perdue si la fermeture traînait.
    marquer();

    // Une connexion déjà ouverte peut encore déposer une demande pendant le
    // drainage : close() ne refuse que les nouvelles connexions. Second
    // passage juste avant de sortir, pour ne pas la laisser en_cours.
    const minuteur = setTimeout(() => {
      console.warn(`Fermeture forcée après ${delaiMs} ms.`);
      marquer();
      sortir(1);
    }, delaiMs);
    minuteur.unref?.();

    serveur.close(() => {
      clearTimeout(minuteur);
      marquer();
      console.log('Serveur arrêté proprement.');
      sortir(0);
    });
  }

  const gestionnaires = [];
  for (const signal of ['SIGTERM', 'SIGINT']) {
    const gestionnaire = () => arreter(signal);
    process.on(signal, gestionnaire);
    gestionnaires.push([signal, gestionnaire]);
  }

  // Pour les tests : retirer les écouteurs posés sur process.
  return () => gestionnaires.forEach(([signal, g]) => process.off(signal, g));
}
