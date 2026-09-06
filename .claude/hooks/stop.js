import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';

let errors = 0;

// Vérifie les fichiers critiques
const required = ['CLAUDE.md', 'CONTEXT.md', '.env.example'];
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`❌ Fichier manquant : ${file}`);
    errors++;
  }
}

// Vérifie que .env n'est pas commité
try {
  execSync('git ls-files --error-unmatch .env', { stdio: 'pipe' });
  console.error('🚨 DANGER : .env est tracké par git !');
  errors++;
} catch {
  // .env n'est pas tracké — c'est bien ✅
}

// Vérifie les tâches restantes dans CONTEXT.md
if (existsSync('CONTEXT.md')) {
  const content = readFileSync('CONTEXT.md', 'utf8');
  const unchecked = (content.match(/\[ \]/g) || []).length;
  if (unchecked > 0) {
    console.log(`📋 ${unchecked} tâche(s) non cochée(s) dans CONTEXT.md`);
  } else {
    console.log('✅ Toutes les tâches sont cochées.');
  }
}

if (errors > 0) {
  console.error(`\n🛑 ${errors} problème(s) détecté(s) — corriger avant de terminer.`);
  process.exit(1);
}

console.log('✅ Vérifications OK — session terminée proprement.');
process.exit(0);