import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import { errorHandler } from './errorHandler.js';

// Application minimale : express.json() puis le handler, comme dans server.js.
let server, baseUrl;

beforeAll(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  const app = express();
  app.use(express.json());
  app.post('/echo', (_req, res) => res.json({ ok: true }));
  app.get('/boom', () => { throw new Error('panne interne'); });
  app.use(errorHandler);

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((r) => server.close(r));
  vi.restoreAllMocks();
});

function post(body, headers = { 'content-type': 'application/json' }) {
  return fetch(`${baseUrl}/echo`, { method: 'POST', headers, body });
}

const MESSAGE_GENERIQUE = 'Une erreur est survenue. Veuillez réessayer.';

describe('errorHandler — relais du statut porté par l erreur', () => {
  it('renvoie 400 sur un JSON malformé', async () => {
    const res = await post('{"prenom":');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(MESSAGE_GENERIQUE);
  });

  // 100 ko est le plafond par défaut d'express.json().
  it('renvoie 413 sur un corps de plus de 100 ko', async () => {
    const res = await post(JSON.stringify({ message: 'a'.repeat(200 * 1024) }));
    expect(res.status).toBe(413);
    expect((await res.json()).error).toBe(MESSAGE_GENERIQUE);
  });

  it('renvoie toujours 500 sur une erreur applicative sans statut', async () => {
    const res = await fetch(`${baseUrl}/boom`);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe(MESSAGE_GENERIQUE);
  });
});

describe('errorHandler — aucune fuite dans la réponse', () => {
  it('ne renvoie ni le message d erreur, ni la position dans le JSON', async () => {
    const texte = await (await post('{"prenom":')).text();
    expect(texte).not.toMatch(/position|JSON|token/i);
    expect(texte).toBe(JSON.stringify({ error: MESSAGE_GENERIQUE }));
  });

  it('ne renvoie pas le corps brut, qui contient les données du client', async () => {
    const texte = await (await post('{"email":"marie@example.com",')).text();
    expect(texte).not.toContain('marie@example.com');
  });

  it('ne renvoie pas la stack trace sur une erreur applicative', async () => {
    const texte = await (await fetch(`${baseUrl}/boom`)).text();
    expect(texte).not.toContain('panne interne');
    expect(texte).not.toMatch(/at .*errorHandler|\.js:\d+/);
  });
});

describe('errorHandler — bornes du relais de statut', () => {
  it.each([
    [{ status: 400 }, 400],
    [{ status: 413 }, 413],
    [{ status: 499 }, 499],
    [{ status: 399 }, 500],
    [{ status: 500 }, 500],
    [{ status: 503 }, 500],
    [{ status: '400' }, 500],
    [{ status: 400.5 }, 500],
    [{}, 500],
  ])('err %o donne %i', (props, attendu) => {
    const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
    errorHandler(Object.assign(new Error('x'), props), {}, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(attendu);
    expect(res.json).toHaveBeenCalledWith({ error: MESSAGE_GENERIQUE });
  });

  it('passe la main à Express si la réponse est déjà envoyée', () => {
    const next = vi.fn();
    const res = { headersSent: true, status: vi.fn().mockReturnThis(), json: vi.fn() };
    errorHandler(new Error('x'), {}, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
