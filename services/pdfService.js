import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '../templates/devis-template.html');

const logoPath = join(__dirname, '../public/images/monogram-mb.png');
const logoSrc = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;

export async function generatePDF(devis) {
  const source = readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(source);
  const html = template({ ...devis, logo_src: logoSrc });

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
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, timeout: 60000 });
    return pdf;
  } finally {
    await browser.close();
  }
}
