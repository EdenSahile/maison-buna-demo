#!/usr/bin/env node
// Contrôle de syntaxe de tout le code serveur.
//
// Le code Node ESM n'a aucune étape de build : sans ce contrôle, une faute de
// syntaxe ne casse qu'au démarrage sur Render. Il remplace les listes de
// fichiers énumérées à la main — dans le workflow de CI, dans la skill open-pr
// et dans les définitions d'agents — qui dérivaient à chaque nouveau fichier
// sans que rien ne le signale.

import { readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

// Exclusions par chemin depuis la racine, et non par nom de dossier : un futur
// `services/client/` ou `routes/docs/` sortirait sinon du contrôle en silence.
// `client/` a son propre build Vite, qui fait déjà ce travail.
const CHEMINS_EXCLUS = new Set([
  'client', 'dist', 'reports', 'handoffs', 'docs', '.cache',
]);

// Ceux-là s'excluent à n'importe quelle profondeur.
const NOMS_EXCLUS = new Set(['node_modules', '.git']);

// Les dossiers cachés sont ignorés, sauf `.claude/hooks/`, qui contient des
// scripts Node réellement exécutés — l'ancienne liste de CI les oubliait.
const CACHES_INCLUS = new Set(['.claude']);

const estTest = (nom) => /\.test\.[cm]?js$/.test(nom);
const estJs = (nom) => /\.[cm]?js$/.test(nom);

function fichiersJs(dossier) {
  const trouves = [];
  // withFileTypes : pas de statSync, donc pas de ENOENT sur un lien symbolique
  // cassé, qui se lirait comme un échec de syntaxe. Un lien vers un dossier est
  // traité comme un fichier et ignoré, ce qui évite aussi les boucles.
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const nom = entree.name;
    const chemin = join(dossier, nom);
    const cheminRelatif = relative(racine, chemin);

    if (entree.isDirectory()) {
      if (NOMS_EXCLUS.has(nom) || CHEMINS_EXCLUS.has(cheminRelatif)) continue;
      if (nom.startsWith('.') && !CACHES_INCLUS.has(nom)) continue;
      trouves.push(...fichiersJs(chemin));
    } else if (entree.isFile() && estJs(nom) && !estTest(nom)) {
      trouves.push(chemin);
    }
  }
  return trouves;
}

const fichiers = fichiersJs(racine).sort();
const echecs = [];

for (const fichier of fichiers) {
  try {
    execFileSync(process.execPath, ['--check', fichier], { stdio: 'pipe' });
  } catch (err) {
    echecs.push({ fichier: relative(racine, fichier), sortie: err.stderr?.toString().trim() });
  }
}

if (echecs.length > 0) {
  for (const { fichier, sortie } of echecs) {
    console.error(`✗ ${fichier}\n${sortie}\n`);
  }
  console.error(`Syntaxe : ${echecs.length} fichier(s) en échec sur ${fichiers.length}.`);
  process.exit(1);
}

console.log(`Syntaxe : ${fichiers.length} fichiers serveur vérifiés, aucun problème.`);
