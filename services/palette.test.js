import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import THEME from '../client/src/theme.js';

// Verrou de la convergence des palettes (décision du 11/09/2026) : le PDF et
// les deux emails ne doivent plus employer que les couleurs de theme.js, la
// source de vérité. Avant cette date, les trois artefacts avaient chacun leur
// propre jeu de bruns et de beiges — CLAUDE.md documentait l'écart comme un
// fait à ne pas corriger « au détour d'une correction ». C'est fait ici,
// délibérément ; ce test empêche qu'une future PR laisse une couleur isolée
// s'y réintroduire sans qu'on le remarque, comme #AB9679 et #C2B5A5 avant
// elle — un seul usage chacune, aucun rôle, une dérive pure.
//
// THEME est importé, pas recopié : une copie figée ne protégerait que contre
// la dérive des templates, pas contre celle de theme.js lui-même — la vraie
// source de vérité pourrait changer sans que ce test s'en aperçoive. Ce
// fichier tourne dans Vitest racine (Node ESM pur) ; theme.js n'a aucune
// dépendance React ni JSX, un chemin relatif suffit à l'importer depuis là.

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (chemin) => readFileSync(join(ici, chemin), 'utf8');

const PALETTE_THEME = new Set(Object.values(THEME).map((h) => h.toUpperCase()));

// Le bandeau DÉMO est volontairement hors charte : il vient du même endroit
// (PR #16) dans les trois artefacts, un dispositif de démo et non une
// couleur de marque — voir CLAUDE.md, « Charte graphique ».
const BANDEAU_DEMO = new Set(['#2E2010', '#D3C2AC']);

const AUTORISEES = new Set([...PALETTE_THEME, ...BANDEAU_DEMO]);

function couleursDe(html) {
  return [...new Set((html.match(/#[0-9A-Fa-f]{6}/g) ?? []).map((h) => h.toUpperCase()))];
}

describe.each([
  ['PDF', '../templates/devis-template.html'],
  ['Email client', '../templates/email-client.html'],
  ['Email admin', '../templates/email-admin.html'],
])('Palette — %s', (nom, chemin) => {
  it('n\'emploie que les couleurs de theme.js (et le bandeau DÉMO)', () => {
    const inconnues = couleursDe(lire(chemin)).filter((c) => !AUTORISEES.has(c));
    expect(inconnues, `couleur(s) hors palette dans ${nom} : ${inconnues.join(', ')}`).toEqual([]);
  });
});

describe('Palette — accent', () => {
  it('les emails portent l\'accent de marque quelque part', () => {
    // Avant convergence, les emails n'avaient aucun accent : chaque mise en
    // avant retombait sur le même ton que les labels. Décision du 11/09/2026 :
    // l'accent marque désormais les blocs de mise en avant (barre gauche).
    for (const chemin of ['../templates/email-client.html', '../templates/email-admin.html']) {
      expect(lire(chemin)).toContain(THEME.accent);
    }
  });
});
