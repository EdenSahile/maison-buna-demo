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
  id: 'test-1234-abcd-5678',
  timestamp: now.toISOString(),
  devis_numero: `MBP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-00001`,
  date_emission: formatDate(now),
  date_validite: formatDate(validite),
  societe: 'Particulier',
  prenom: 'Marie',
  nom: 'Dupont',
  email: 'marie.dupont@gmail.com',
  telephone: '06 12 34 56 78',
  collaborateurs: '',
  secteur: '',
  adresse: '12 rue des Fleurs',
  codepostal: '75011',
  ville: 'Paris',
  quantiteParCafe: { Limmu: '250 g' },
  quantite_resume: 'Limmu : 250 g',
  frequence: 'Mensuelle',
  moutures: ['Grains entiers'],
  message: '',
  cafes: ['Limmu'],
  pricing_rows: [
    { cafe: 'Limmu', region: 'Région Limmu · Éthiopie', designation: 'Café arabica de spécialité — Éthiopien grade 1, torréfié artisanalement en France', qte_label: '250 g', pu_ttc_fmt: fmt(14.99), total_ttc_fmt: fmt(14.99) },
  ],
  grand_total_fmt: fmt(14.99),
  sur_devis: false,
  is_particulier: true,
};

const pdfBuffer = await generatePDF(devisTest);
const outputPath = join(__dirname, 'test-output.pdf');
writeFileSync(outputPath, pdfBuffer);
console.log(`PDF généré : ${outputPath} (${pdfBuffer.length} bytes)`);
