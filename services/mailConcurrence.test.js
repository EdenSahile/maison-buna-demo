import { describe, it, expect, beforeEach, vi } from 'vitest';

// La borne est lue à l'import du module : elle est posée avant. Fichier
// séparé de mailService.test.js, que Vitest isole dans son propre processus,
// pour ne pas imposer un plafond de 2 aux tests d'envoi.
process.env.MAIL_MAX_CONCURRENT = '2';

// Aucun email réel n'est envoyé. sendMail ne se termine pas tout seul : c'est
// le test qui libère chaque envoi, ce qui rend la concurrence observable.
const enVol = [];
const sendMail = vi.fn(() => new Promise((resoudre) => enVol.push(resoudre)));
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const { sendDevisEmails, sendPdfFailureAlert, etatFileEmails } = await import('./mailService.js');

const devis = (id) => ({
  id,
  devis_numero: `MBE-20260911-${id}`,
  prenom: 'Marie', nom: 'Dupont', societe: 'Café du Coin',
  email: `${id}@example.com`,
  date_emission: '11 septembre 2026', date_validite: '11 octobre 2026',
  cafes: ['Limmu'], quantite_resume: 'Limmu : 250 g',
  pricing_rows: [], grand_total_fmt: '14,99 €', sur_devis: false,
  is_particulier: false,
});

const patienter = () => new Promise((r) => setTimeout(r, 0));

// Libère les envois un par un jusqu'à ce que plus rien ne démarre : chaque
// créneau rendu laisse entrer l'envoi suivant.
async function toutLiberer() {
  while (enVol.length > 0) {
    enVol.shift()({});
    await patienter();
  }
}

beforeEach(() => {
  enVol.length = 0;
  sendMail.mockClear();
  process.env.SMTP_USER = 'contact@example.com';
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.BASE_URL = 'https://demo.example.com';
});

describe('envoi des emails — concurrence bornée', () => {
  // sendViaSMTP crée un transport par email : un email = une connexion SMTP
  // ouverte vers Brevo. Sans borne, dix demandes simultanées en ouvraient
  // vingt, au-delà de ce que Brevo accepte.
  it('n ouvre pas plus d envois simultanés que la borne', async () => {
    const envois = [sendDevisEmails(devis('a'), null), sendDevisEmails(devis('b'), null)];
    await patienter();

    expect(sendMail).toHaveBeenCalledTimes(2);
    expect(etatFileEmails().actifs).toBe(2);

    await toutLiberer();
    await Promise.all(envois);
  });

  // Le limiteur fait patienter, il ne refuse pas : la règle absolue n°4 veut
  // deux emails par devis, et le client a déjà vu l'écran de confirmation.
  it('met les envois suivants en attente et finit par tous les faire partir', async () => {
    const envois = [
      sendDevisEmails(devis('a'), null),
      sendDevisEmails(devis('b'), null),
      sendDevisEmails(devis('c'), null),
    ];
    await patienter();
    expect(etatFileEmails().enAttente).toBe(1);

    await toutLiberer();
    await Promise.all(envois);

    // Trois devis, deux emails chacun.
    expect(sendMail).toHaveBeenCalledTimes(6);
    const destinataires = sendMail.mock.calls.map((c) => c[0].to).sort();
    expect(destinataires).toEqual([
      'a@example.com', 'admin@example.com', 'admin@example.com',
      'admin@example.com', 'b@example.com', 'c@example.com',
    ]);
  });

  it('rend chaque créneau : la file est vide une fois les envois terminés', async () => {
    const envois = [sendDevisEmails(devis('a'), null), sendDevisEmails(devis('b'), null)];
    await toutLiberer();
    await Promise.all(envois);

    expect(etatFileEmails()).toEqual({ actifs: 0, enAttente: 0 });
  });

  // L'alerte admin part sur le chemin d'échec du PDF, c'est-à-dire quand le
  // serveur est déjà en difficulté : elle passe par la même borne.
  it('fait passer l alerte admin par la même file', async () => {
    const alerte = sendPdfFailureAlert(devis('a'));
    await patienter();
    expect(etatFileEmails().actifs).toBe(1);

    await toutLiberer();
    await alerte;
    expect(etatFileEmails()).toEqual({ actifs: 0, enAttente: 0 });
  });
});
