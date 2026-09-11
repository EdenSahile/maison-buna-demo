import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (chemin) => readFileSync(resolve(ici, chemin), 'utf8');

const indexHtml = lire('../../index.html');
const fontsCss = lire('./fonts.css');
const mainJsx = lire('../main.jsx');

// Les commentaires de fonts.css citent le procédé qu'ils expliquent, « @import »
// compris : les contrôles portent sur le code, pas sur ce qui l'entoure.
const cssSansCommentaires = fontsCss.replace(/\/\*[\s\S]*?\*\//g, '');

// Le pendant, côté page visitée, de « Emails — aucune ressource distante ».
// Un <link> vers fonts.googleapis.com transmet à Google, à chaque visite,
// l'adresse IP du visiteur, son User-Agent et l'horodatage, sans son
// consentement — jugé contraire au RGPD par le tribunal régional de Munich I
// le 20/01/2022 (3 O 17493/20).
describe('Polices — aucune ressource distante', () => {
  it('index.html n appelle aucun serveur de polices', () => {
    expect(indexHtml).not.toContain('fonts.googleapis.com');
    expect(indexHtml).not.toContain('fonts.gstatic.com');
    expect(indexHtml).not.toMatch(/<link[^>]+rel=["']stylesheet["']/i);
    expect(indexHtml).not.toMatch(/<link[^>]+rel=["']preconnect["']/i);
  });

  it('fonts.css ne pointe que vers des fichiers du dépôt', () => {
    const sources = cssSansCommentaires.match(/src:\s*url\(([^)]+)\)/g) ?? [];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source).not.toMatch(/https?:/);
      expect(source).toContain('../assets/fonts/');
    }
    expect(cssSansCommentaires).not.toContain('@import');
    expect(cssSansCommentaires).not.toContain('googleapis');
    expect(cssSansCommentaires).not.toContain('gstatic');
  });
});

describe('Polices — les fichiers déclarés existent', () => {
  // Une police renommée ou oubliée ne casse rien de visible : le navigateur
  // retombe en silence sur la pile de repli, et la page perd sa charte sans
  // qu'aucune erreur ne le dise.
  it('chaque @font-face pointe vers un fichier présent', () => {
    const chemins = [...fontsCss.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
    expect(chemins).toHaveLength(8);
    for (const chemin of chemins) {
      expect(existsSync(resolve(ici, chemin)), `${chemin} absent`).toBe(true);
    }
  });

  // Les deux familles de la charte, dans les deux styles, sur les deux plages
  // Unicode embarquées : latin couvre le français, latin-ext les noms de
  // société d'Europe centrale.
  it('couvre les deux familles de la charte, en romain et en italique', () => {
    for (const famille of ['Crimson Pro', 'Open Sans']) {
      for (const style of ['normal', 'italic']) {
        const blocs = [...fontsCss.matchAll(/@font-face \{([^}]+)\}/g)]
          .map((m) => m[1])
          .filter((b) => b.includes(`'${famille}'`) && b.includes(`font-style: ${style}`));
        expect(blocs, `${famille} ${style}`).toHaveLength(2);
      }
    }
  });

  // unicode-range n'est pas décoratif : sans lui, le navigateur télécharge
  // les huit fichiers au lieu des quatre dont la page a besoin.
  it('garde le découpage par plage Unicode', () => {
    expect(fontsCss.match(/unicode-range:/g)).toHaveLength(8);
  });

  it('est effectivement chargée par l application', () => {
    expect(mainJsx).toContain("import './styles/fonts.css'");
  });
});

describe('Polices — licence embarquée', () => {
  // La SIL Open Font License autorise la redistribution à condition que la
  // licence accompagne les fichiers. Les woff2 sont dans le dépôt : elle doit
  // y être aussi.
  it('la licence OFL accompagne les fichiers', () => {
    const licence = join(ici, '../assets/fonts/LICENSE-OFL.txt');
    expect(existsSync(licence)).toBe(true);
    const texte = readFileSync(licence, 'utf8');
    expect(texte).toContain('SIL OPEN FONT LICENSE');
    expect(texte).toContain('Crimson Pro');
    expect(texte).toContain('Open Sans');
  });
});
