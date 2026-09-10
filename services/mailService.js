import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

// Les templates d'email passent par Handlebars, qui échappe {{ }} tout seul.
// L'alerte PDF, elle, est assemblée en template literal : sans échappement, un
// prénom contenant du HTML arriverait intact dans la boîte de l'admin.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadTemplate(name) {
  return readFileSync(join(__dirname, '../templates', name), 'utf8');
}

function loadInlineImages({ withInstagram = false } = {}) {
  const dir = join(__dirname, '../public/images');
  const images = [
    { filename: 'monogram-email.png', path: join(dir, 'monogram-email.png'), cid: 'monogram-mb', contentType: 'image/png', contentDisposition: 'inline' },
  ];
  if (withInstagram) {
    images.push({ filename: 'instagram-icon.png', path: join(dir, 'instagram-icon.png'), cid: 'instagram-icon', contentType: 'image/png', contentDisposition: 'inline' });
  }
  return images;
}

async function sendViaSMTP({ from, to, subject, html, attachments, inlineImages }) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
  });

  const allAttachments = [
    ...(attachments || []),
    ...inlineImages,
  ];

  await transport.sendMail({ from: `${from.name} <${from.email}>`, to, subject, html, attachments: allAttachments });
}

function resolveImagesForREST(html) {
  const base = (process.env.BASE_URL || 'https://maison-buna.onrender.com').replace(/\/$/, '');
  return html
    .replace(/cid:monogram-mb/g,   `${base}/images/monogram-email.png`)
    .replace(/cid:instagram-icon/g, `${base}/images/instagram-icon.png`);
}

async function sendViaBrevoREST({ from, to, subject, html, attachments }) {
  const body = {
    sender:      { name: from.name, email: from.email },
    to:          [{ email: to }],
    subject,
    htmlContent: html,
  };

  if (attachments?.length) {
    body.attachment = attachments.map(a => ({
      name:    a.filename,
      content: Buffer.from(a.content).toString('base64'),
    }));
  }

  const res = await fetch(BREVO_API, {
    method:  'POST',
    headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY || process.env.SMTP_PASS, 'content-type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo API ${res.status}: ${err}`);
  }
}

export async function sendPdfFailureAlert(devis) {
  const from = { name: 'Maison Buna', email: process.env.SMTP_USER };
  const subject = `[ALERTE] PDF non généré — ${devis.devis_numero}`;
  const html = `
    <p>La génération du PDF a échoué pour le devis suivant :</p>
    <ul>
      <li><strong>Numéro :</strong> ${escapeHtml(devis.devis_numero)}</li>
      <li><strong>Client :</strong> ${escapeHtml(devis.prenom)} ${escapeHtml(devis.nom)} (${escapeHtml(devis.societe || 'Particulier')})</li>
      <li><strong>Email client :</strong> ${escapeHtml(devis.email)}</li>
      <li><strong>ID :</strong> ${escapeHtml(devis.id)}</li>
    </ul>
    <p>Le client a reçu son email de confirmation, sans le PDF et sans mention
    d'incident : il attend son devis. Veuillez générer et transmettre le PDF
    manuellement.</p>
  `;
  try {
    await sendViaSMTP({ from, to: process.env.ADMIN_EMAIL, subject, html, attachments: [], inlineImages: [] });
  } catch {
    await sendViaBrevoREST({ from, to: process.env.ADMIN_EMAIL, subject, html, attachments: [] });
  }
}

export async function sendDevisEmails(devis, pdfBuffer) {
  const from = { name: 'Maison Buna', email: process.env.SMTP_USER };

  const clientImages = loadInlineImages({ withInstagram: true });
  const adminImages  = loadInlineImages({ withInstagram: false });

  const pdfAttachments = pdfBuffer ? [{
    filename:    `Devis-${devis.devis_numero}.pdf`,
    content:     pdfBuffer,
    contentType: 'application/pdf',
  }] : [];

  // Les templates annonçaient la pièce jointe d'après sur_devis, pas d'après
  // sa présence réelle : un devis dont le PDF a échoué promettait un fichier
  // absent. C'est cette variable qui décide, et elle vient de l'envoi lui-même.
  const contexte = { ...devis, avec_pdf: pdfAttachments.length > 0 };

  const clientHtml = Handlebars.compile(loadTemplate('email-client.html'))(contexte);
  const adminHtml  = Handlebars.compile(loadTemplate('email-admin.html'))(contexte);

  const clientSubject = devis.sur_devis
    ? `Maison Buna — Votre demande a bien été reçue`
    : `Maison Buna — Confirmation de votre demande de devis`;

  const adminSubject = devis.sur_devis
    ? `[Maison Buna] Demande sur mesure — ${devis.societe || devis.prenom}`
    : `[Maison Buna] Nouvelle demande de devis — ${devis.societe || devis.prenom}`;

  async function send({ to, subject, html, inlineImages }) {
    try {
      await sendViaSMTP({ from, to, subject, html, attachments: pdfAttachments, inlineImages });
    } catch (err) {
      console.warn(`SMTP échoué (${err.message}) — bascule sur Brevo REST`);
      await sendViaBrevoREST({ from, to, subject, html: resolveImagesForREST(html), attachments: pdfAttachments });
    }
  }

  await send({ to: devis.email,             subject: clientSubject, html: clientHtml, inlineImages: clientImages });
  console.log(`Email client envoyé — id:${devis.id}`);

  await send({ to: process.env.ADMIN_EMAIL, subject: adminSubject,  html: adminHtml,  inlineImages: adminImages });
  console.log(`Email admin envoyé — id:${devis.id}`);
}
