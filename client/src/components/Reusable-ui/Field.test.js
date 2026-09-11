import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Field.jsx portait deux couleurs hors theme.js (#FDF5F3 fond de champ
// invalide, #8C7460 placeholder), repérées en cartographiant les palettes le
// 11/09/2026 — une dérive interne à l'app, indépendante de la convergence
// PDF/emails. Corrigées en dérivant de theme.error (teinte à 10 % d'opacité)
// et en réutilisant theme.sandText. Ce test empêche qu'une couleur en dur y
// revienne sans qu'on le remarque.
//
// Les styled-components ont été déplacés dans Field.styles.js le 11/09/2026
// (3 erreurs ESLint react-refresh/only-export-components : un fichier de
// composant ne peut pas exporter aussi des constantes). Le test vise
// désormais ce fichier, où les couleurs vivent réellement.

const ici = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(ici, './Field.styles.js'), 'utf8');

describe('Field.styles.js — couleurs', () => {
  it('n\'emploie aucune couleur en dur, seulement des tokens de theme.js', () => {
    // #4chiffres (ex: 1A d'opacité) fait partie d'une dérivation ${theme.x}1A,
    // pas d'une couleur en dur : seuls les codes à 6 ou 8 chiffres comptent.
    const hex = source.match(/#[0-9A-Fa-f]{6,8}\b/g) ?? [];
    const horsTheme = hex.filter((h) => !h.startsWith('%23')); // le contour du <select>, en data URI SVG
    expect(horsTheme).toEqual([]);
  });

  it('le fond d\'un champ invalide dérive de theme.error, pas une valeur à part', () => {
    expect(source).toMatch(/\$\{theme\.error\}1A/);
  });

  it('le placeholder réutilise theme.sandText, comme les autres textes discrets du fichier', () => {
    expect(source).toMatch(/placeholder\s*\{\s*color:\s*\$\{theme\.sandText\}/);
  });
});
