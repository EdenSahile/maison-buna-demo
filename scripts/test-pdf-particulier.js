import { generatePDF } from '../services/pdfService.js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const now = new Date();
const validite = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const formatDate = d => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const devisTest = {
  id: 'test-part-1234',
  timestamp: now.toISOString(),
  devis_numero: `MB-${now.getFullYear()}-TESTPART`,
  date_emission: formatDate(now),
  date_validite: formatDate(validite),
  societe: 'Particulier',
  prenom: 'Sophie',
  nom: 'Martin',
  email: 'sophie.martin@gmail.com',
  telephone: '06 98 76 54 32',
  collaborateurs: '',
  secteur: '',
  adresse: '12 allée des Roses',
  codepostal: '69003',
  ville: 'Lyon',
  quantite: '1 kg — Couple',
  frequence: 'Mensuelle',
  moutures: ['Mouture filtre', 'Grains entiers'],
  message: 'Pour consommer à la maison, nous adorons les cafés éthiopiens.',
  cafes: ['Sidamo'],
  pricing_rows: [
    { cafe: 'Sidamo', region: 'Région Sidama · Éthiopie', designation: 'Café arabica de spécialité — Éthiopien grade 1, torréfié artisanalement en France', qte_label: '1 kg', pu_ttc_fmt: fmt(49.99), total_ttc_fmt: fmt(49.99) },
  ],
  grand_total_fmt: fmt(49.99),
  sur_devis: false,
  is_particulier: true,
};

const pdfBuffer = await generatePDF(devisTest);
const outputPath = join(__dirname, 'test-output-particulier.pdf');
writeFileSync(outputPath, pdfBuffer);
console.log(`PDF particulier généré : ${outputPath} (${pdfBuffer.length} bytes)`);
