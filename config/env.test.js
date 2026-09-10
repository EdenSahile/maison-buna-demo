import { describe, it, expect, vi, afterEach } from 'vitest';
import { entier } from './env.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('entier', () => {
  // Une valeur blanche compte comme absente : sans cela, Number(' ') vaut 0
  // et un réglage fait d'espaces basculait à 0 sans avertissement.
  it.each([['absente', undefined], ['vide', ''], ['blanche', '   ']])(
    'retourne la valeur par défaut quand la variable est %s',
    (_label, brut) => {
      const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
      if (brut !== undefined) vi.stubEnv('REGLAGE', brut);
      expect(entier('REGLAGE', 7, 0)).toBe(7);
      expect(avertir).not.toHaveBeenCalled();
    },
  );

  it('lit un entier valide', () => {
    vi.stubEnv('REGLAGE', '3');
    expect(entier('REGLAGE', 7, 0)).toBe(3);
  });

  it('accepte la borne minimale elle-même', () => {
    vi.stubEnv('REGLAGE', '0');
    expect(entier('REGLAGE', 7, 0)).toBe(0);
  });

  // Sans ce garde-fou, Number('deux') donne NaN et toute comparaison contre
  // NaN est fausse : la borne de concurrence des PDF se désactivait en silence.
  it.each(['deux', 'NaN', '3.5', '-1', '1e3px', 'Infinity'])(
    'refuse la valeur invalide "%s", avertit, et garde la valeur par défaut',
    (brut) => {
      const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.stubEnv('REGLAGE', brut);
      expect(entier('REGLAGE', 7, 0)).toBe(7);
      expect(avertir).toHaveBeenCalledWith(expect.stringContaining('REGLAGE invalide'));
    },
  );

  it('refuse une valeur sous le minimum', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('REGLAGE', '0');
    expect(entier('REGLAGE', 2, 1)).toBe(2);
  });
});
