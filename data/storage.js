import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DEVIS_PATH permet aux tests d'écrire ailleurs que dans la base réelle.
const filePath = process.env.DEVIS_PATH || join(__dirname, 'devis.json');

// États d'une demande. Le PDF et les emails partent après la réponse au
// client : sans ce champ, un redémarrage pendant ce travail perdait les deux
// sans laisser la moindre trace de ce qu'il fallait relancer.
export const ETATS = {
  // Enregistrée, PDF et emails pas encore traités.
  EN_COURS: 'en_cours',
  // Les deux emails sont partis, avec le PDF.
  ENVOYE: 'envoye',
  // Les deux emails sont partis, sans PDF : à relancer à la main.
  ENVOYE_SANS_PDF: 'envoye_sans_pdf',
  // L'envoi lui-même a échoué.
  ECHEC_ENVOI: 'echec_envoi',
  // Le processus s'est arrêté avant la fin du traitement.
  INTERROMPU: 'interrompu',
};

function mettreDeCote(raison) {
  // Repartir de [] en silence effacerait la base à l'écriture suivante. Le
  // fichier abîmé est mis de côté pour pouvoir être récupéré à la main.
  const secours = `${filePath}.corrompu-${Date.now()}`;
  renameSync(filePath, secours);
  console.error(`${filePath} inexploitable (${raison}) — mis de côté dans ${secours}, on repart d'une base vide.`);
  return [];
}

function lire() {
  if (!existsSync(filePath)) return [];

  let brut;
  try {
    brut = readFileSync(filePath, 'utf8');
  } catch (err) {
    // Lecture impossible : ne pas écrire par-dessus, l'appelant décidera.
    throw new Error(`Lecture de ${filePath} impossible : ${err.message}`);
  }

  if (brut.trim() === '') return [];

  let data;
  try {
    data = JSON.parse(brut);
  } catch (err) {
    return mettreDeCote(err.message);
  }

  // Un JSON valide mais qui n'est pas un tableau — `{}`, `null`, `"texte"` —
  // faisait échouer data.push, donc toute demande en 500, indéfiniment.
  if (!Array.isArray(data)) return mettreDeCote('le contenu n\'est pas un tableau');

  return data;
}

// Écriture atomique : sans le fichier temporaire, une interruption au milieu
// du writeFileSync laissait un JSON tronqué, donc une base entière perdue au
// prochain démarrage.
function ecrire(data) {
  const temporaire = `${filePath}.tmp`;
  writeFileSync(temporaire, JSON.stringify(data, null, 2), 'utf8');
  renameSync(temporaire, filePath);
}

export function saveDevis(devis) {
  const data = lire();
  data.push({ ...devis, etat: devis.etat || ETATS.EN_COURS });
  ecrire(data);
}

// Met à jour l'état d'une demande et l'horodate. Sans effet si l'id est
// inconnu : le traitement de fond ne doit jamais casser sur un devis absent.
export function majEtat(id, etat, details = {}) {
  const data = lire();
  const devis = data.find((d) => d.id === id);
  if (!devis) return false;

  // Les détails d'abord : ni l'état, ni son horodatage, ni l'identité de la
  // demande ne doivent pouvoir être écrasés par un appelant distrait.
  const { id: _id, timestamp: _ts, etat: _etat, etat_maj: _maj, ...reste } = details;
  Object.assign(devis, reste);
  devis.etat = etat;
  devis.etat_maj = new Date().toISOString();

  ecrire(data);
  return true;
}

// Repasse en « interrompu » tout ce qui était encore en cours. Appelé à
// l'arrêt du processus : ces demandes n'ont ni PDF ni emails, et il faut
// pouvoir les retrouver.
export function marquerInterrompus() {
  const data = lire();
  const enCours = data.filter((d) => d.etat === ETATS.EN_COURS);
  if (enCours.length === 0) return 0;

  const maintenant = new Date().toISOString();
  for (const devis of enCours) {
    devis.etat = ETATS.INTERROMPU;
    devis.etat_maj = maintenant;
  }
  ecrire(data);
  return enCours.length;
}
