import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let errors = 0;

const required = ['CLAUDE.md', 'CONTEXT.md', '.env.example'];
for (const file of required) {
  if (!existsSync(join(root, file))) {
    console.error(`❌ Fichier manquant : ${file}`);
    errors++;
  }
}

try {
  execSync('git ls-files --error-unmatch .env', { cwd: root, stdio: 'pipe' });
  console.error('🚨 DANGER : .env est tracké par git !');
  errors++;
} catch {
  // .env n'est pas tracké — c'est bien
}

const contextPath = join(root, 'CONTEXT.md');
if (existsSync(contextPath)) {
  const content = readFileSync(contextPath, 'utf8');
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
