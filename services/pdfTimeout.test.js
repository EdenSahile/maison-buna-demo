import { describe, it, expect, vi, beforeEach } from 'vitest';

// Puppeteer est simulé ici, contrairement à pdfService.test.js : on teste le
// comportement du timeout lui-même — a-t-il tué le navigateur, l'a-t-il fermé
// s'il démarrait encore — et non le rendu. Ces tests échouent si l'on retire
// le SIGKILL ou la relecture du drapeau d'annulation, ce qu'un test système
// ne détectait pas : le finally fermait déjà le navigateur.

const kill = vi.fn();
const close = vi.fn(async () => {});
const jamais = () => new Promise(() => {});
let lancement;

vi.mock('puppeteer', () => ({
  default: { launch: (...args) => lancement(...args) },
}));

process.env.PDF_TIMEOUT_MS = '50';
process.env.PDF_MAX_CONCURRENT = '1';
process.env.PDF_MAX_FILE = '5';

const { generatePDF, PdfTimeoutError, etatFilePDF } = await import('./pdfService.js');

const devis = { devis_numero: 'MBE-1', pricing_rows: [], cafes: [] };

function faussNavigateur() {
  return {
    process: () => ({ kill }),
    close,
    newPage: async () => ({
      setContent: jamais,       // le rendu ne se termine jamais
      evaluate: jamais,
      pdf: jamais,
    }),
  };
}

beforeEach(() => {
  kill.mockClear();
  close.mockClear();
});

describe('generatePDF — timeout pendant le rendu', () => {
  it('tue le processus du navigateur déjà lancé', async () => {
    lancement = async () => faussNavigateur();
    const erreur = await generatePDF(devis).catch((e) => e);

    expect(erreur).toBeInstanceOf(PdfTimeoutError);
    expect(kill).toHaveBeenCalledWith('SIGKILL');
    expect(etatFilePDF()).toEqual({ actifs: 0, enAttente: 0 });
  });
});

describe('generatePDF — timeout pendant le lancement', () => {
  // Le cas que le SIGKILL seul ne couvrait pas : au moment du timeout, le
  // navigateur n'existe pas encore, donc kill() ne tuait personne, et le
  // Chromium démarrait ensuite hors de toute file.
  it('ferme le navigateur qui arrive après le rejet', async () => {
    lancement = async () => {
      await new Promise((r) => setTimeout(r, 150));
      return faussNavigateur();
    };

    const erreur = await generatePDF(devis).catch((e) => e);
    expect(erreur).toBeInstanceOf(PdfTimeoutError);
    expect(kill).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 200));
    expect(close).toHaveBeenCalled();
  });

  it('n entame aucun rendu après une annulation', async () => {
    const newPage = vi.fn(async () => ({ setContent: jamais, evaluate: jamais, pdf: jamais }));
    lancement = async () => {
      await new Promise((r) => setTimeout(r, 150));
      return { process: () => ({ kill }), close, newPage };
    };

    await generatePDF(devis).catch(() => {});
    await new Promise((r) => setTimeout(r, 200));
    expect(newPage).not.toHaveBeenCalled();
  });
});

describe('generatePDF — réglages illisibles', () => {
  it('retombe sur les valeurs par défaut au lieu de bloquer la file', async () => {
    vi.resetModules();
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('PDF_MAX_CONCURRENT', 'deux');
    vi.stubEnv('PDF_MAX_FILE', '-3');
    vi.stubEnv('PDF_TIMEOUT_MS', '50');

    lancement = async () => faussNavigateur();
    const module = await import('./pdfService.js');

    // Sans garde-fou, Number('deux') vaut NaN : la tâche partait en file et
    // n'était jamais servie, sans erreur ni log.
    const erreur = await module.generatePDF(devis).catch((e) => e);
    expect(erreur).toBeInstanceOf(module.PdfTimeoutError);
    expect(avertir).toHaveBeenCalledWith(expect.stringContaining('PDF_MAX_CONCURRENT invalide'));
    expect(avertir).toHaveBeenCalledWith(expect.stringContaining('PDF_MAX_FILE invalide'));

    vi.unstubAllEnvs();
    avertir.mockRestore();
  });
});
