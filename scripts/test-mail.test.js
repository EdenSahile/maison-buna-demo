import { describe, it, expect } from 'vitest';
import { verifierArguments } from './test-mail.js';

describe('verifierArguments', () => {
  it("n'accepte aucun argument", () => {
    expect(() => verifierArguments([])).not.toThrow();
  });

  it('refuse un flag inconnu au lieu de l\'ignorer', () => {
    expect(() => verifierArguments(['--dry-run'])).toThrow(/--dry-run/);
  });

  it('refuse plusieurs arguments inconnus', () => {
    expect(() => verifierArguments(['--foo', '--bar'])).toThrow(/--foo --bar/);
  });
});
