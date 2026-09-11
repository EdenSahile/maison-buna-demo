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
const scanCoordonnees = lire('../../../scripts/check-coordonnees.js');

// La durée est aussi le défaut de DEVIS_RETENTION_JOURS (data/storage.js,
// .env.example) : rien ne les lie automatiquement, un changement de l'un
// doit se répercuter dans l'autre à la main. Voir CLAUDE.md,
// « Conformité RGPD ».
const JOURS_RETENTION_ATTENDUS = '180';

// La seule vraie adresse du site, publiée volontairement pour ce seul usage
// (décision du 11/09/2026) : pas le contact fictif de la démo, utilisé
// partout ailleurs (PDF, emails, mentions légales).
const CONTACT_RGPD = 'edensahile12@gmail.com';

describe('Politique de confidentialité — contenu', () => {
  it('donne la durée de conservation réelle', () => {
    expect(confidentialite).toContain(`${JOURS_RETENTION_ATTENDUS} jours`);
  });

  it('nomme les destinataires réels, pas un tiers publicitaire', () => {
    expect(confidentialite).toContain('Brevo');
    expect(confidentialite).not.toMatch(/google analytics|facebook|pixel/i);
  });

  it('donne un vrai moyen de contact pour les droits, pas l adresse fictive de la démo', () => {
    // contact@fictif.com ne va nulle part : une vraie demande de suppression
    // envoyée là n'arriverait à personne. Voir CLAUDE.md, « Conformité RGPD ».
    expect(confidentialite).toContain(CONTACT_RGPD);
    expect(confidentialite).not.toContain('contact@fictif.com');
  });

  it('la vraie adresse est déclarée dans le scan de coordonnées, pas juste tolérée par accident', () => {
    // Sans ça, npm run check:coordonnees casserait sur sa propre adresse de
    // contact RGPD à chaque exécution. Vise précisément le bloc
    // EMAILS_AUTORISES : l'adresse apparaît aussi dans un commentaire au-dessus,
    // qui seul ne suffirait pas à l'autoriser.
    const bloc = scanCoordonnees.match(/EMAILS_AUTORISES = new Set\(\[([\s\S]*?)\]\)/)?.[1];
    expect(bloc, 'bloc EMAILS_AUTORISES introuvable dans check-coordonnees.js').toBeDefined();
    expect(bloc).toContain(CONTACT_RGPD);
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
