// Handler d'erreur global. Extrait de server.js pour être testable sans
// démarrer le serveur : importer server.js déclencherait app.listen().

// Les erreurs d'express.json() portent le vrai statut sur err.status :
// 400 pour un JSON malformé, 413 pour un corps au-delà de la limite,
// 415 pour un encodage non supporté. Sans ce relais, elles ressortaient
// toutes en 500.
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) return next(err);

  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500
    ? err.status
    : 500;

  // Le message d'err n'est jamais renvoyé au client : celui d'express.json()
  // contient la position de l'octet fautif, et err.body le corps brut de la
  // requête, donc des données personnelles.
  if (status >= 500) {
    console.error('Erreur non gérée :', err);
  } else {
    console.warn(`Requête rejetée (${status}) : ${err.type || err.name}`);
  }

  res.status(status).json({ error: 'Une erreur est survenue. Veuillez réessayer.' });
}
