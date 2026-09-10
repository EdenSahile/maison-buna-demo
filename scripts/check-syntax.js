#!/usr/bin/env node
// Contrôle de syntaxe de tout le code serveur.
//
// Le code Node ESM n'a aucune étape de build : sans ce contrôle, une faute de
// syntaxe ne casse qu'au démarrage sur Render. Il remplace les listes de
// fichiers énumérées à la main — dans le workflow de CI, dans la skill open-pr
// et dans les définitions d'agents — qui dérivaient à chaque nouveau fichier
// sans que rien ne le signale.

import { readdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

// client/ a son propre build Vite, qui fait déjà ce contrôle.
const DOSSIERS_EXCLUS = new Set([
  'node_modules', 'client', 'dist', '.git', 'reports', 'handoffs', 'docs', '.cache',
]);

const estTest = (nom) => /\.test\.[cm]?js$/.test(nom);
const estJs = (nom) => /\.[cm]?js$/.test(nom);

function fichiersJs(dossier) {
  const trouves = [];
  for (const entree of readdirSync(dossier)) {
    if (entree.startsWith('.') && entree !== '.claude') continue;
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) {
      if (DOSSIERS_EXCLUS.has(entree)) continue;
      trouves.push(...fichiersJs(chemin));
    } else if (estJs(entree) && !estTest(entree)) {
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
