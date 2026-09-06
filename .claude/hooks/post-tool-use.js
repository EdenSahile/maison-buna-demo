import { readFileSync } from 'fs';

// Lit le JSON envoyé par Claude Code via stdin
const input = JSON.parse(readFileSync('/dev/stdin', 'utf8'));

const toolName = input.tool_name;
const filePath = input.tool_input?.file_path || '';
const content  = input.tool_input?.content  || '';

// Vérifie uniquement les fichiers dans routes/
if (toolName === 'Write' && filePath.includes('routes/')) {
  if (!content.includes('required') &&
      !content.includes('validation') &&
      !content.includes('400')) {
    console.error(`⚠️ Route sans validation : ${filePath}`);
    console.error('Ajouter une validation des champs obligatoires.');
    process.exit(1);
  }
}

process.exit(0);