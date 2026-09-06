import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HANDOFFS_DIR = 'handoffs';
const SEP = '═'.repeat(64);

let branche = null;
try {
  branche = execSync('git branch --show-current', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  branche = null;
}

if (branche === 'main' || branche === 'master') {
  console.log(SEP);
  console.log(`  ⛔  ATTENTION : TU ES SUR LA BRANCHE \`${branche}\``);
  console.log(SEP);
  console.log('  Règle absolue n°9 — vérifier la branche AVANT toute modification.');
  console.log('  Règle absolue n°8 — jamais de push direct sur main.');
  console.log('');
  console.log('  → Prévenir l\'utilisateur avant de continuer :');
  console.log('    « Tu es sur main, tu veux que je crée une branche d\'abord ? »');
  console.log('  → Ne jamais créer une branche à sa place sans le dire.');
  console.log(SEP);
} else if (branche) {
  console.log(`🌿 Branche courante : ${branche} — hors main, travail autorisé ✅`);
} else {
  console.log('🌿 Branche courante : indéterminée (HEAD détachée, ou hors dépôt git).');
  console.log('   → Vérifier avec `git branch --show-current` avant toute modification.');
}
console.log('');

if (!existsSync(HANDOFFS_DIR)) {
  console.log('📁 Aucun handoff trouvé — première session.');
} else {
  const files = readdirSync(HANDOFFS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.log('📁 Aucun handoff trouvé — première session.');
  } else {
    const lastHandoff = files[files.length - 1];
    const content = readFileSync(join(HANDOFFS_DIR, lastHandoff), 'utf8');
    console.log(`📋 Dernier handoff : ${lastHandoff}`);
    console.log('');
    console.log('--- CONTENU DU HANDOFF ---');
    console.log(content);
    console.log('--- FIN DU HANDOFF ---');
  }
}

if (existsSync('CONTEXT.MD')) {
  const context = readFileSync('CONTEXT.MD', 'utf8');
  const unchecked = (context.match(/\[ \]/g) || []).length;
  const checked   = (context.match(/\[x\]/g) || []).length;

  console.log('');
  console.log('--- CONTEXT.md ---');
  console.log(context);
  console.log('--- FIN CONTEXT.md ---');
  console.log('');
  console.log(`📊 Tâches : ${checked} terminées ✅ / ${unchecked} restantes ⏳`);
}

console.log('');
console.log('⚠️  INSTRUCTIONS OBLIGATOIRES :');
console.log('1. Affiche le résumé du handoff dans ta PREMIÈRE réponse au chat.');
console.log('2. Lis CONTEXT.md ci-dessus — c\'est l\'état courant du projet.');
console.log('3. Coche [x] chaque tâche dans CONTEXT.md IMMÉDIATEMENT après l\'avoir accomplie.');
console.log('4. Ne jamais laisser CONTEXT.md désynchronisé avec le travail réel.');
console.log('5. Vérifier la branche affichée ci-dessus AVANT toute modification (règle n°9).');

process.exit(0);
