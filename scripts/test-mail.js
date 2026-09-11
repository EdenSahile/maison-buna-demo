import 'dotenv/config';
import { generatePDF } from '../services/pdfService.js';
import { sendDevisEmails } from '../services/mailService.js';

// Ce script envoie toujours de vrais emails via Brevo — il n'a aucun mode
// simulation. Un flag mal orthographié (ex. --dry-run, en croyant qu'il
// existe) ne doit pas être ignoré en silence, sous peine d'envoyer deux
// emails réels sans le vouloir.
export function verifierArguments(argv) {
  if (argv.length > 0) {
    throw new Error(
      `Argument(s) inconnu(s) : ${argv.join(' ')}. Ce script n'accepte aucun ` +
      `argument — il n'a pas de mode simulation et envoie toujours de vrais emails via Brevo.`
    );
  }
}

async function main() {
  verifierArguments(process.argv.slice(2));

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
}

const appeleDirectement = import.meta.url === `file://${process.argv[1]}`;
if (appeleDirectement) {
  main().catch((erreur) => {
    console.error(erreur.message);
    process.exitCode = 1;
  });
}
