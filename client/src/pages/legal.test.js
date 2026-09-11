import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const ici = dirname(fileURLToPath(import.meta.url));
const lire = (chemin) => readFileSync(resolve(ici, chemin), 'utf8');

const confidentialite = lire('./PolitiqueConfidentialite.jsx');
const mentions = lire('./MentionsLegales.jsx');
const app = lire('../App.jsx');
const legalLinks = lire('../components/LegalLinks.jsx');
const devisForm = lire('../components/DevisForm.jsx');

// La durée est aussi le défaut de DEVIS_RETENTION_JOURS (data/storage.js,
// .env.example) : rien ne les lie automatiquement, un changement de l'un
// doit se répercuter dans l'autre à la main. Voir CLAUDE.md,
// « Conformité RGPD ».
const JOURS_RETENTION_ATTENDUS = '180';

describe('Politique de confidentialité — contenu', () => {
  it('donne la durée de conservation réelle', () => {
    expect(confidentialite).toContain(`${JOURS_RETENTION_ATTENDUS} jours`);
  });

  it('nomme les destinataires réels, pas un tiers publicitaire', () => {
    expect(confidentialite).toContain('Brevo');
    expect(confidentialite).not.toMatch(/google analytics|facebook|pixel/i);
  });

  it('donne un moyen de contact pour les droits, sur la liste blanche', () => {
    expect(confidentialite).toContain('contact@fictif.com');
  });

  it('énonce la base légale, pas juste "on garde vos données"', () => {
    expect(confidentialite).toMatch(/6\.1\.b|précontractuel/);
  });
});

describe('Mentions légales — contenu', () => {
  it('reprend l identité déjà utilisée dans le PDF et les emails', () => {
    expect(mentions).toContain('SIRET');
    expect(mentions).toContain('contact@fictif.com');
  });

  it('renvoie vers la politique de confidentialité', () => {
    expect(mentions).toContain('/confidentialite');
  });
});

describe('Routage des pages légales', () => {
  it('App.jsx sert les deux pages à leur chemin', () => {
    expect(app).toContain("'/mentions-legales'");
    expect(app).toContain("'/confidentialite'");
  });

  it('les liens visibles pointent vers les mêmes chemins, dans un nouvel onglet', () => {
    expect(legalLinks).toContain('href="/confidentialite"');
    expect(legalLinks).toContain('href="/mentions-legales"');
    // Une navigation en place perdrait la saisie en cours du formulaire.
    expect(legalLinks.match(/target="_blank"/g)).toHaveLength(2);
  });

  it('le formulaire renvoie vers la politique avant l envoi', () => {
    expect(devisForm).toContain('href="/confidentialite"');
    expect(devisForm).toContain('LegalLinks');
  });
});
