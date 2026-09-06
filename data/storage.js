import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, 'devis.json');

export function saveDevis(devis) {
  let data = [];
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    // fichier absent ou vide — on part de []
  }
  data.push(devis);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
