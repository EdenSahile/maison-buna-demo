// Arrêt propre du processus.
//
// Le PDF et les deux emails partent après la réponse au client, dans le même
// processus. Un redémarrage — déploiement Render, plantage, Ctrl+C — perdait
// donc ce travail sans laisser de trace : la demande restait en base comme si
// tout s'était bien passé. Elle est désormais marquée « interrompu ».

const DELAI_FORCE_MS = 10000;

export function installerArretPropre({ serveur, marquerInterrompus, delaiMs = DELAI_FORCE_MS, sortir = (code) => process.exit(code) }) {
  let enCours = false;

  function marquer() {
    try {
      const interrompus = marquerInterrompus();
      if (interrompus > 0) {
        // Formulation prudente : le signal peut tomber entre l'acceptation
        // SMTP et l'enregistrement de l'état, auquel cas les emails sont
        // partis alors que la demande est marquée « interrompu ».
        console.warn(`${interrompus} demande(s) marquée(s) « interrompu » : traitement non terminé, PDF et emails à vérifier avant de relancer.`);
      }
      return interrompus;
    } catch (err) {
      console.error(`Marquage des demandes en cours impossible : ${err.message}`);
      return 0;
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
