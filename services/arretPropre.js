// Arrêt propre du processus.
//
// Le PDF et les deux emails partent après la réponse au client, dans le même
// processus. Un redémarrage — déploiement Render, plantage, Ctrl+C — perdait
// donc ce travail sans laisser de trace : la demande restait en base comme si
// tout s'était bien passé. Elle est désormais marquée « interrompu ».

const DELAI_FORCE_MS = 10000;

export function installerArretPropre({ serveur, marquerInterrompus, delaiMs = DELAI_FORCE_MS, sortir = (code) => process.exit(code) }) {
  let enCours = false;

  function arreter(signal) {
    // Render envoie SIGTERM puis SIGKILL : un second signal ne doit pas
    // relancer la procédure au milieu de la première.
    if (enCours) return;
    enCours = true;
    console.log(`${signal} reçu — arrêt en cours.`);

    // Marquage d'abord : c'est synchrone et rapide, et c'est la seule chose
    // qui serait définitivement perdue si la fermeture traînait.
    try {
      const interrompus = marquerInterrompus();
      if (interrompus > 0) {
        console.warn(`${interrompus} demande(s) marquée(s) « interrompu » : ni PDF ni emails envoyés, à relancer à la main.`);
      }
    } catch (err) {
      console.error(`Marquage des demandes en cours impossible : ${err.message}`);
    }

    serveur.close(() => {
      console.log('Serveur arrêté proprement.');
      sortir(0);
    });

    // Une connexion qui traîne ne doit pas retenir le processus jusqu'au
    // SIGKILL de l'hébergeur, une trentaine de secondes plus tard.
    const minuteur = setTimeout(() => {
      console.warn(`Fermeture forcée après ${delaiMs} ms.`);
      sortir(1);
    }, delaiMs);
    minuteur.unref?.();
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
