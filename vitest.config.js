import { defineConfig } from 'vitest/config';

// Vitest racine = tests serveur uniquement (Node ESM pur).
// Les tests client vivent dans client/ et tournent avec `npm test` depuis client/.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['routes/**/*.test.js', 'services/**/*.test.js', 'data/**/*.test.js', 'middleware/**/*.test.js'],
    // Puppeteer réel dans pdfService.test.js : le démarrage de Chrome dépasse le défaut de 5 s
    testTimeout: 120000,
    hookTimeout: 120000,
  },
});
