import 'dotenv/config';
import { generatePDF } from '../services/pdfService.js';
import { sendDevisEmails } from '../services/mailService.js';

const devisTest = {
  id: 'test-1234-abcd-5678',
  timestamp: new Date().toISOString(),
  societe: 'Startup Café SAS',
  prenom: 'Marie',
  nom: 'Dupont',
  // example.com est réservé par la RFC 2606 : ce script envoie de vrais
  // emails, l'adresse ne doit appartenir à personne.
  email: 'marie@example.com',
  telephone: '06 12 34 56 78',
  collaborateurs: '11 - 25',
  secteur: 'Tech / Startup',
  ville: 'Paris',
  quantite: '1 – 3 kg',
  frequence: 'Mensuelle',
  moutures: ['Grains entiers', 'Mouture filtre'],
  message: 'Test envoi email Maison Buna.'
};

console.log('Génération du PDF...');
const pdfBuffer = await generatePDF(devisTest);
console.log(`PDF : ${pdfBuffer.length} bytes`);

console.log('Envoi des emails...');
await sendDevisEmails(devisTest, pdfBuffer);
console.log('Emails envoyés avec succès.');
