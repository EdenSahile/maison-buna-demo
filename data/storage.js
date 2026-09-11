import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { entier } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// DEVIS_PATH permet aux tests d'écrire ailleurs que dans la base réelle.
const filePath = process.env.DEVIS_PATH || join(__dirname, 'devis.json');

// États d'une demande. Le PDF et les emails partent après la réponse au
// client : sans ce champ, un redémarrage pendant ce travail perdait les deux
// sans laisser la moindre trace de ce qu'il fallait relancer.
export const ETATS = {
  // Enregistrée, PDF et emails pas encore traités.
  EN_COURS: 'en_cours',
  // Le PDF est réglé, l'envoi des emails est lancé. Cet état ne dure que le
  // temps de l'envoi : il sert à savoir, en cas d'arrêt, si les emails ont pu
  // partir ou non.
  ENVOI_EN_COURS: 'envoi_en_cours',
  // Les deux emails sont partis, avec le PDF.
  ENVOYE: 'envoye',
  // Les deux emails sont partis, sans PDF : à relancer à la main.
  ENVOYE_SANS_PDF: 'envoye_sans_pdf',
  // L'envoi lui-même a échoué.
  ECHEC_ENVOI: 'echec_envoi',
  // Arrêt avant que l'envoi ne commence : le client n'a rien reçu, c'est sûr.
  INTERROMPU: 'interrompu',
  // Arrêt pendant l'envoi : les emails ont pu partir. À vérifier avant de
  // relancer, sous peine d'envoyer deux fois.
  INTERROMPU_PENDANT_ENVOI: 'interrompu_pendant_envoi',
};

// Ce qu'un arrêt transforme en quoi. Les deux cas se distinguent : avant
// l'envoi, on sait que le client n'a rien reçu ; pendant, on ne sait pas.
const APRES_ARRET = {
  [ETATS.EN_COURS]: ETATS.INTERROMPU,
  [ETATS.ENVOI_EN_COURS]: ETATS.INTERROMPU_PENDANT_ENVOI,
};

// Nombre maximal d'enregistrements gardés dans le fichier vif. Chaque appel
// relit et réécrit le fichier en entier, de façon synchrone, et ce coût suit
// sa taille : 3 ms à 0,65 Mo, 126 ms à 33 Mo. Sans plafond, il ne fait que
// croître, et chaque milliseconde est du temps pendant lequel le serveur ne
// répond à rien d'autre. 1000 demandes pèsent environ 1 Mo.
const MAX_ENREGISTREMENTS = entier('DEVIS_MAX', 1000, 1);

// États dont le traitement de fond est terminé : plus rien ne viendra les
// modifier, ils peuvent donc partir en archive. `en_cours` et
// `envoi_en_cours` restent dans le fichier vif quel que soit leur âge, sans
// quoi le balayage au démarrage ne les retrouverait plus.
const ETATS_TERMINES = new Set([
  ETATS.ENVOYE,
  ETATS.ENVOYE_SANS_PDF,
  ETATS.ECHEC_ENVOI,
  ETATS.INTERROMPU,
  ETATS.INTERROMPU_PENDANT_ENVOI,
]);

// Parmi les états terminés, ceux qui demandent encore une action à la main.
// Les archiver est correct, mais il faut le dire : les greps de CLAUDE.md
// portent sur le fichier vif et ne les verraient plus.
const ETATS_A_TRAITER = new Set([
  ETATS.ENVOYE_SANS_PDF,
  ETATS.ECHEC_ENVOI,
  ETATS.INTERROMPU,
  ETATS.INTERROMPU_PENDANT_ENVOI,
]);

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
function ecrireFichier(chemin, data) {
  const temporaire = `${chemin}.tmp`;
  writeFileSync(temporaire, JSON.stringify(data, null, 2), 'utf8');
  renameSync(temporaire, chemin);
}

function ecrire(data) {
  ecrireFichier(filePath, data);
}

// Sort du fichier vif les demandes les plus anciennes dont le traitement est
// terminé, et les écrit dans un fichier d'archive à part. L'archive n'est
// jamais relue ni réécrite : son coût est celui du lot sorti, pas celui de
// tout l'historique.
//
// L'archive est écrite avant le fichier vif. Dans l'autre ordre, un échec au
// milieu perdait les demandes sorties ; dans celui-ci, il les laisse dans les
// deux fichiers — un doublon se rattrape, une perte non.
// Date.now() seul ne suffit pas comme nom : deux archivages dans la même
// milliseconde produisaient le même fichier, et le second écrasait le premier
// — les demandes qu'il contenait étaient perdues. Le suffixe numérique ne sert
// que dans ce cas, pour que le nom courant reste lisible.
function nomArchive() {
  const base = `${filePath}.archive-${Date.now()}`;
  if (!existsSync(base)) return base;
  let n = 2;
  while (existsSync(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function archiver(data) {
  if (data.length <= MAX_ENREGISTREMENTS) return data;

  let aSortir = data.length - MAX_ENREGISTREMENTS;
  const sorties = [];
  const gardees = [];
  for (const devis of data) {
    if (aSortir > 0 && ETATS_TERMINES.has(devis.etat)) {
      sorties.push(devis);
      aSortir--;
    } else {
      gardees.push(devis);
    }
  }

  // Rien d'archivable : le fichier dépasse le plafond, mais tout ce qu'il
  // contient est encore en cours de traitement. Il repasse sous le plafond
  // de lui-même dès que ces demandes aboutissent.
  if (sorties.length === 0) return data;

  const archive = nomArchive();
  try {
    ecrireFichier(archive, sorties);
  } catch (err) {
    // L'archivage n'est pas le travail demandé : son échec ne doit pas faire
    // échouer l'enregistrement d'une demande. Le fichier garde tout.
    console.error(`Archivage impossible (${err.message}) — les ${sorties.length} plus anciennes demandes restent dans ${filePath}.`);
    return data;
  }

  const aTraiter = sorties.filter((d) => ETATS_A_TRAITER.has(d.etat)).length;
  const mention = aTraiter > 0 ? ` — dont ${aTraiter} qui demandent encore une action à la main` : '';
  console.warn(`${sorties.length} demande(s) archivée(s) dans ${archive}${mention}.`);

  return gardees;
}

export function saveDevis(devis) {
  const data = lire();
  data.push({ ...devis, etat: devis.etat || ETATS.EN_COURS });
  // Seul saveDevis fait grandir le tableau : c'est donc le seul endroit où le
  // plafond peut être dépassé, et le seul à avoir besoin d'archiver.
  ecrire(archiver(data));
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
  const inacheves = data.filter((d) => Object.hasOwn(APRES_ARRET, d.etat));
  if (inacheves.length === 0) return { total: 0, avantEnvoi: 0, pendantEnvoi: 0 };

  const maintenant = new Date().toISOString();
  let avantEnvoi = 0;
  let pendantEnvoi = 0;

  for (const devis of inacheves) {
    if (devis.etat === ETATS.ENVOI_EN_COURS) pendantEnvoi++;
    else avantEnvoi++;
    devis.etat = APRES_ARRET[devis.etat];
    devis.etat_maj = maintenant;
  }

  ecrire(data);
  return { total: inacheves.length, avantEnvoi, pendantEnvoi };
}
