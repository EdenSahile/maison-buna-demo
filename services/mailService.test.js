import { describe, it, expect, beforeEach, vi } from 'vitest';

// Aucun email réel n'est envoyé : le transport SMTP et l'API REST Brevo sont
// entièrement simulés. Seule la logique d'envoi est sous test.
const sendMail = vi.fn();
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const { sendDevisEmails, sendPdfFailureAlert } = await import('./mailService.js');

const devis = {
  id: 'test-id-1234',
  devis_numero: 'MBE-20260903-00042',
  prenom: 'Marie', nom: 'Dupont', societe: 'Café du Coin',
  email: 'marie@cafeducoin.fr',
  date_emission: '3 septembre 2026', date_validite: '3 octobre 2026',
  cafes: ['Limmu'], quantite_resume: 'Limmu : 250 g',
  pricing_rows: [], grand_total_fmt: '14,99 €', sur_devis: false,
  is_particulier: false,
};

beforeEach(() => {
  vi.restoreAllMocks();
  sendMail.mockReset().mockResolvedValue({});
  process.env.SMTP_USER = 'contact@fictif.com';
  process.env.ADMIN_EMAIL = 'admin@fictif.com';
  process.env.BASE_URL = 'https://demo.fictif.com';
});

describe('sendDevisEmails — règle absolue n°4 : toujours 2 emails', () => {
  it('envoie exactement 2 emails : client puis admin', async () => {
    await sendDevisEmails(devis, Buffer.from('%PDF-1.4 fake'));
    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(sendMail.mock.calls[0][0].to).toBe('marie@cafeducoin.fr');
    expect(sendMail.mock.calls[1][0].to).toBe('admin@fictif.com');
  });

  it('joint le PDF aux deux emails, nommé d après le numéro de devis', async () => {
    await sendDevisEmails(devis, Buffer.from('%PDF-1.4 fake'));
    for (const [mail] of sendMail.mock.calls) {
      const pdf = mail.attachments.find((a) => a.contentType === 'application/pdf');
      expect(pdf).toBeDefined();
      expect(pdf.filename).toBe('Devis-MBE-20260903-00042.pdf');
    }
  });

  it('envoie quand même les 2 emails sans PDF (cas sur-mesure)', async () => {
    await sendDevisEmails({ ...devis, sur_devis: true }, null);
    expect(sendMail).toHaveBeenCalledTimes(2);
    for (const [mail] of sendMail.mock.calls) {
      expect(mail.attachments.some((a) => a.contentType === 'application/pdf')).toBe(false);
    }
  });

  it('adapte l objet selon sur_devis', async () => {
    await sendDevisEmails({ ...devis, sur_devis: true }, null);
    expect(sendMail.mock.calls[0][0].subject).toContain('bien été reçue');
    expect(sendMail.mock.calls[1][0].subject).toContain('sur mesure');
    sendMail.mockClear();
    await sendDevisEmails(devis, null);
    expect(sendMail.mock.calls[0][0].subject).toContain('Confirmation');
  });

  it('intègre le logo en CID côté client et admin, l Instagram côté client seul', async () => {
    await sendDevisEmails(devis, null);
    const cids = sendMail.mock.calls.map(([m]) => m.attachments.map((a) => a.cid).filter(Boolean));
    expect(cids[0]).toContain('monogram-mb');
    expect(cids[0]).toContain('instagram-icon');
    expect(cids[1]).toContain('monogram-mb');
    expect(cids[1]).not.toContain('instagram-icon');
  });
});

describe('sendDevisEmails — bascule Brevo REST quand SMTP échoue', () => {
  it('rappelle l API REST et remplace les cid: par des URL absolues', async () => {
    sendMail.mockRejectedValue(new Error('SMTP bloqué'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn(async () => ({ ok: true, status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const pdfUint8 = new Uint8Array(Buffer.from('%PDF-1.4 fake'));
    await sendDevisEmails(devis, pdfUint8);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.htmlContent).not.toContain('cid:monogram-mb');
    expect(body.htmlContent).toContain('https://demo.fictif.com/images/monogram-email.png');
    expect(body.attachment[0].name).toBe('Devis-MBE-20260903-00042.pdf');
    expect(body.attachment[0].content).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(Buffer.from(body.attachment[0].content, 'base64').toString()).toContain('%PDF-1.4');
    vi.unstubAllGlobals();
  });

  it('remonte une erreur si Brevo REST refuse aussi', async () => {
    sendMail.mockRejectedValue(new Error('SMTP bloqué'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, text: async () => 'unauthorized' })));
    await expect(sendDevisEmails(devis, null)).rejects.toThrow(/Brevo API 401/);
    vi.unstubAllGlobals();
  });
});

describe('sendDevisEmails — annonce de la pièce jointe', () => {
  const phrase = 'devis en pièce jointe';

  it('annonce la pièce jointe quand le PDF est bien joint', async () => {
    await sendDevisEmails(devis, Buffer.from('%PDF-1.4 fake'));
    const [clientMail, adminMail] = sendMail.mock.calls.map((c) => c[0]);
    expect(clientMail.html).toContain(phrase);
    expect(adminMail.html).toContain('joint à cet email');
  });

  // Le template se fiait à sur_devis, pas à la présence réelle du fichier :
  // un devis dont le PDF a échoué promettait une pièce jointe absente.
  it('ne promet aucune pièce jointe quand le PDF a échoué', async () => {
    await sendDevisEmails(devis, null);
    const [clientMail, adminMail] = sendMail.mock.calls.map((c) => c[0]);

    expect(clientMail.attachments.filter((a) => a.contentType === 'application/pdf')).toHaveLength(0);
    expect(clientMail.html).not.toContain(phrase);
    expect(clientMail.html).toContain('dans un second message');
    expect(adminMail.html).toContain('Génération du PDF échouée');
  });

  it('garde la formulation sur-mesure quand il n y a pas de PDF à produire', async () => {
    await sendDevisEmails({ ...devis, sur_devis: true }, null);
    const [clientMail, adminMail] = sendMail.mock.calls.map((c) => c[0]);
    expect(clientMail.html).not.toContain(phrase);
    expect(adminMail.html).toContain('Demande sur mesure');
    expect(adminMail.html).not.toContain('Génération du PDF échouée');
  });
});

describe('sendPdfFailureAlert', () => {
  it('alerte uniquement l admin, sans pièce jointe', async () => {
    await sendPdfFailureAlert(devis);
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe('admin@fictif.com');
    expect(mail.subject).toContain('[ALERTE]');
    expect(mail.html).toContain('MBE-20260903-00042');
    expect(mail.attachments).toHaveLength(0);
  });

  // L'alerte est assemblée en template literal, pas par Handlebars : sans
  // échappement, un prénom contenant du HTML arrive intact chez l'admin.
  it('échappe les caractères HTML des champs client', async () => {
    await sendPdfFailureAlert({
      ...devis,
      prenom: '<script>alert(1)</script>',
      nom: 'O\'Brien & Co',
      societe: '"Café" <b>gras</b>',
      email: 'x@example.fr" onmouseover="alert(1)',
    });

    const { html } = sendMail.mock.calls[0][0];
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>gras</b>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('O&#39;Brien &amp; Co');
    expect(html).toContain('&quot;Café&quot; &lt;b&gt;gras&lt;/b&gt;');
    expect(html).toContain('x@example.fr&quot; onmouseover=&quot;alert(1)');
  });

  it('n insère pas "undefined" quand un champ client est absent', async () => {
    await sendPdfFailureAlert({ ...devis, prenom: undefined, nom: undefined });
    expect(sendMail.mock.calls[0][0].html).not.toContain('undefined');
  });

  // L'alerte disait « Le client n'a reçu aucun email », ce qui est devenu faux
  // le jour où l'échec de génération a cessé de priver le client de son email.
  // Aucune assertion ne portait sur cette phrase : la contradiction est passée.
  it('décrit ce que le client a réellement reçu', async () => {
    await sendPdfFailureAlert(devis);
    const { html } = sendMail.mock.calls[0][0];

    // Le HTML est indenté sur plusieurs lignes : on compare sur une version
    // à espaces normalisés, sinon le test casserait au moindre reformatage.
    const texte = html.replace(/\s+/g, ' ');
    expect(texte).toContain(
      "Le client a reçu son email de confirmation, sans le PDF et sans mention d'incident : il attend son devis.",
    );
    expect(texte).toContain('Veuillez générer et transmettre le PDF manuellement.');
    expect(texte).not.toContain("n'a reçu aucun email");
  });

  it('donne à l admin de quoi retrouver le devis', async () => {
    await sendPdfFailureAlert(devis);
    const { subject, html } = sendMail.mock.calls[0][0];

    expect(subject).toBe('[ALERTE] PDF non généré — MBE-20260903-00042');
    expect(html).toContain('MBE-20260903-00042');
    expect(html).toContain('Marie');
    expect(html).toContain('Dupont');
    expect(html).toContain('Café du Coin');
    expect(html).toContain('marie@cafeducoin.fr');
    expect(html).toContain('test-id-1234');
  });
});
