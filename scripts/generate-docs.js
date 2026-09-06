import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath   = join(__dirname, '../docs/technical-documentation.html');
const outputPath = join(__dirname, '../docs/technical-documentation.pdf');

const html = readFileSync(htmlPath, 'utf8');

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
  ],
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    timeout: 60000,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  writeFileSync(outputPath, pdf);
  console.log(`✅ Documentation PDF générée : ${outputPath}`);
  console.log(`   Taille : ${(pdf.length / 1024).toFixed(0)} KB`);
} finally {
  await browser.close();
}
