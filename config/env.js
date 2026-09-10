// Lecture des réglages d'environnement.
//
// Une valeur illisible ne doit pas changer le comportement en silence :
// Number('deux') donne NaN, et une comparaison contre NaN est toujours fausse.
// C'est ce qui désactivait la borne de concurrence des PDF sans un seul log.
export function entier(nom, defaut, minimum) {
  const brut = process.env[nom];
  // Chaîne vide ou blanche = variable non renseignée. Sans le trim(),
  // Number(' ') vaut 0 : un réglage fait d'espaces passait à 0 sans un mot.
  if (brut === undefined || brut.trim() === '') return defaut;
  const valeur = Number(brut);
  if (!Number.isInteger(valeur) || valeur < minimum) {
    console.warn(`${nom} invalide (${brut}) — valeur par défaut conservée : ${defaut}.`);
    return defaut;
  }
  return valeur;
}
