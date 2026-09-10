import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, 'devis.json');

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

function lire() {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    // fichier absent, vide ou illisible — on part de []
    return [];
  }
}

function ecrire(data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
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

  devis.etat = etat;
  devis.etat_maj = new Date().toISOString();
  Object.assign(devis, details);
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
