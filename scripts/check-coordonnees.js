#!/usr/bin/env node
// Scan de l'arbre complet contre les coordonnées réelles de Maison Buna.
//
// La revue de CI (job `claude-review`) ne lit que le diff d'une PR : un
// défaut déjà présent dans un fichier que personne ne touche ne remonte
// jamais. C'est exactement ce qui a laissé une adresse email réelle survivre
// dans .claude/agents/ux-designer.md, et le vrai domaine de la marque écrit
// en toutes lettres dans ce workflow lui-même — jusqu'à la PR #16, sans
// qu'aucune revue de diff ne les voie.
//
// Ce script est déterministe, pas un audit : il ne juge pas si une donnée
// « a l'air réelle », il cherche trois motifs précis, sans ambiguïté. La CI
// le lance sur l'arbre entier à chaque PR, qu'elle touche ou non les
// fichiers concernés — c'est le point : couvrir ce que le diff ne voit pas.

import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

// Les fichiers que git connaît (suivis, plus les nouveaux pas encore
// ajoutés), pas un parcours de dossiers maison : .env et data/devis.json
// contiennent de vraies données de test locales, jamais commitées —
// .gitignore les couvre déjà, pas la peine de le redire ici. --others
// --exclude-standard ajoute les fichiers neufs pas encore `git add`, sans
// quoi un run local avant le premier commit ne les verrait pas ; sur l'arbre
// propre d'un checkout CI, ça ne change rien.
function fichiersSuivis() {
  const brut = execFileSync(
    'git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: racine, encoding: 'utf8' },
  );
  return brut.split('\0').filter(Boolean);
}

const EXTENSIONS_BINAIRES = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.pdf',
]);

// Domaines email autorisés : les coordonnées affichées de la démo, les
// domaines réservés par la RFC 2606 pour les fixtures (plus la convention du
// projet, exemple.fr et test.fr), et le domaine Brevo générique du modèle
// d'identifiant SMTP dans .env.example — jamais une vraie adresse.
const DOMAINES_EMAIL_AUTORISES = new Set([
  'fictif.com', 'demo-fictif.com',
  'example.com', 'example.fr', 'exemple.fr', 'test.fr',
  'smtp-brevo.com',
]);

// Adresses exactes autorisées, en plus des domaines ci-dessus : une vraie
// adresse, publiée volontairement pour un usage précis, pas une dérive. Le
// domaine (gmail.com) n'est pas mis sur liste blanche en entier — ça
// laisserait passer n'importe quelle autre adresse du même domaine sans
// avertir. Seule l'adresse exacte l'est.
//
// edensahile12@gmail.com : contact RGPD (accès, rectification, effacement)
// dans la politique de confidentialité — décision du 11/09/2026. Le reste du
// site garde contact@fictif.com, la coordonnée fictive de la démo.
const EMAILS_AUTORISES = new Set([
  'edensahile12@gmail.com',
]);

const RE_EMAIL = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

// Un SIRET a 14 chiffres. Le placeholder du dépôt les remplace par des X
// (« XXX XXX XXX XXXXX », voir templates/devis-template.html) : un vrai n'a
// que des chiffres, groupés ou non.
const RE_SIRET = /\b\d{3}[ ]?\d{3}[ ]?\d{3}[ ]?\d{5}\b/g;

// Le domaine réel de la marque, quel que soit son TLD ou son contexte —
// jamais un simple oubli de guillemets ou de protocole ne doit y échapper.
// C'est exactement ainsi qu'il a fui la première fois : un mot nu dans une
// phrase de consigne, sans email, sans « www. », sans lien. Construit à
// partir de deux morceaux plutôt qu'écrit en toutes lettres : sinon ce
// fichier se signalerait lui-même en scannant sa propre source.
const NOM_MARQUE = 'maisonbuna';
const RE_DOMAINE_MARQUE = new RegExp(`\\b${NOM_MARQUE}\\.(com|fr|net|org|eu|io)\\b`, 'gi');

const echecs = [];

for (const cheminRelatif of fichiersSuivis().sort()) {
  if (EXTENSIONS_BINAIRES.has(extname(cheminRelatif))) continue;

  let contenu;
  try {
    contenu = readFileSync(join(racine, cheminRelatif), 'utf8');
  } catch {
    continue; // illisible en texte (lien symbolique cassé, etc.) : hors sujet ici
  }

  for (const match of contenu.matchAll(RE_EMAIL)) {
    const email = match[0].toLowerCase();
    const domaine = match[1].toLowerCase();
    if (!DOMAINES_EMAIL_AUTORISES.has(domaine) && !EMAILS_AUTORISES.has(email)) {
      echecs.push(`${cheminRelatif} : email hors liste blanche — ${match[0]}`);
    }
  }
  for (const match of contenu.matchAll(RE_SIRET)) {
    echecs.push(`${cheminRelatif} : numéro à 14 chiffres, forme d'un SIRET réel — ${match[0]}`);
  }
  for (const match of contenu.matchAll(RE_DOMAINE_MARQUE)) {
    echecs.push(`${cheminRelatif} : domaine réel de la marque — ${match[0]}`);
  }
}

if (echecs.length > 0) {
  console.error(`${echecs.length} donnée(s) suspecte(s) trouvée(s) dans l'arbre :\n`);
  for (const echec of echecs) console.error(`✗ ${echec}`);
  console.error(`\nDomaines email autorisés : ${[...DOMAINES_EMAIL_AUTORISES].join(', ')}.`);
  process.exit(1);
}

console.log("Arbre complet vérifié, aucune coordonnée réelle trouvée.");
