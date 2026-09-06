import { describe, it, expect } from 'vitest';
import { generatePDF } from './pdfService.js';

// Puppeteer réel — décision assumée : la génération PDF a déjà cassé deux fois
// sur Render (Chrome introuvable, sandbox). Un mock n'aurait rien détecté.
// Coût : ~5-10 s et un Chrome à installer en CI (mis en cache par le workflow).

const fmt = (n) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const devis = {
  id: 'test-1234-abcd-5678',
  timestamp: new Date().toISOString(),
  devis_numero: 'MBP-20260903-00001',
  date_emission: '3 septembre 2026',
  date_validite: '3 octobre 2026',
  societe: 'Particulier', prenom: 'Marie', nom: 'Dupont',
  email: 'marie.dupont@example.fr', telephone: '06 12 34 56 78',
  collaborateurs: '', secteur: '',
  adresse: '12 rue des Fleurs', codepostal: '75011', ville: 'Paris',
  quantiteParCafe: { Limmu: '250 g' },
  quantite_resume: 'Limmu : 250 g',
  frequence: 'Mensuelle', moutures: ['Grains entiers'], message: '',
  cafes: ['Limmu'],
  pricing_rows: [{
    cafe: 'Limmu', region: 'Région Limmu · Éthiopie',
    designation: 'Café arabica de spécialité — Éthiopien grade 1, torréfié artisanalement en France',
    qte_label: '250 g', pu_ttc_fmt: fmt(14.99), total_ttc_fmt: fmt(14.99),
  }],
  grand_total_fmt: fmt(14.99),
  sur_devis: false,
  is_particulier: true,
};

describe('generatePDF — Puppeteer réel', () => {
  it('produit un PDF valide et non vide', async () => {
    const pdf = await generatePDF(devis);
    expect(Buffer.isBuffer(pdf) || pdf instanceof Uint8Array).toBe(true);
    // Signature PDF : les 5 premiers octets doivent être "%PDF-"
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe('%PDF-');
    // Un devis complet avec logo pèse largement plus de 10 Ko ; en dessous,
    // c'est que le template ou les images ne se sont pas chargés.
    expect(pdf.length).toBeGreaterThan(10_000);
  });

  it('génère aussi un PDF pour un devis sur-mesure sans total', async () => {
    const pdf = await generatePDF({
      ...devis,
      sur_devis: true,
      grand_total_fmt: null,
      pricing_rows: [{ ...devis.pricing_rows[0], qte_label: 'Sur devis', pu_ttc_fmt: '—', total_ttc_fmt: '—' }],
    });
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(10_000);
  });
});
