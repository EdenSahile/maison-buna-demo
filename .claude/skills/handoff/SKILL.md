---
name: handoff
description: Génère un fichier de passation de session pour le projet Maison Buna. Utiliser en fin de session ou avant de changer de contexte. Sauvegarde dans handoffs/YYYY-MM-DD-HHMM-handoff.md.
---

# Handoff — Maison Buna

**Annoncer au départ :** "J'utilise le skill handoff pour générer la passation de session."

---

## Contexte projet permanent

Application Node.js de gestion de devis B2B pour Maison Buna
(café de spécialité éthiopien, livraison en entreprise).

- Stack : Node.js ESM + Express + Nodemailer + Puppeteer + Handlebars + JSON
- Point d'entrée : `server.js` (port 3000)
- Formulaire : `public/index.html` (finalisé — ne pas modifier sans raison)
- Charte : `#2e2010` · `#4F3422` · `#D3C2AC` · `#AB9679` · `#FAF7F3`
- Règles absolues : dans `CLAUDE.md` (toujours lire avant de coder)
- État courant : dans `CONTEXT.md` (tâches en cours, statut build)
- SMTP : Brevo (variables dans `.env`, jamais committées)
- Admin email : `ADMIN_EMAIL` dans `.env`

---

## Ce que le fichier handoff doit contenir

1. **Feature / tâche active** — ce qui était en cours au moment de la passation
2. **Objectif de la session** — ce qu'on cherchait à accomplir
3. **Ce qui a été fait** — liste des fichiers créés ou modifiés (chemins exacts)
4. **État du build** — serveur OK ? PDF OK ? Emails OK ? Erreurs connues ?
5. **Ce qui a échoué ou bloqué** — approches tentées qui n'ont pas fonctionné
6. **Prochaines étapes** — exactement ce que la prochaine session devra faire

---

## Règles

- Chemins de fichiers toujours exacts (ex: `services/pdfService.js`)
- Mentionner l'état des cases CONTEXT.md (X/13 tâches cochées)
- La prochaine session doit pouvoir reprendre sans poser de questions
- Ne pas répéter le contenu de `CLAUDE.md` — y faire référence si besoin
- Chaque session produit un nouveau fichier — ne jamais écraser un handoff existant
- Le tri alphabétique de `handoffs/` donne l'ordre chronologique

---

## Sous-agents — ce qu'il faut savoir

Les sous-agents démarrent à froid :
- ❌ Ne lisent pas CLAUDE.md automatiquement
- ❌ Ne bénéficient pas des hooks
- ❌ Ne lisent pas CONTEXT.md
- ❌ Ne connaissent que ce qui est dans leur prompt

Le handoff sert à **deux choses distinctes** :

| Usage | Automatique ? |
|-------|--------------|
| Nouvelle session humaine (toi qui rouvres Claude Code) | ✅ via le hook SessionStart |
| Sous-agent spawné par l'agent principal | ❌ seulement si inclus manuellement dans le prompt |

**En résumé :**
- Handoff → utile pour toi entre sessions
- Sous-agents → utiles uniquement si tu construis un prompt riche au moment du spawn

---

## Template prompt sous-agent

Copier-coller et compléter les [...] avant de spawner un sous-agent.
**Ne jamais spawner un sous-agent sans ce template complet.**

```
Tu es un sous-agent travaillant sur le projet Maison Buna.
Tu démarres à froid — voici tout ce que tu dois savoir :

### Stack
Node.js ESM + Express + Nodemailer + Puppeteer + Handlebars
Stockage JSON simple (data/devis.json)
SMTP via Brevo (variables dans .env)
"type": "module" dans package.json — utiliser import/export partout

### Charte graphique
#2e2010 · #4F3422 · #D3C2AC · #AB9679 · #FAF7F3
Ne jamais hardcoder d'autres couleurs.
Polices : Cormorant Garamond (serif) + Jost (sans-serif).

### Règles absolues
- Ne jamais committer .env
- Toujours valider les données côté serveur (email, société, quantité)
- Toujours envoyer 2 emails : client + admin
- Ne jamais modifier public/index.html sans raison explicite
- Toujours sauvegarder dans data/devis.json avec timestamp + id unique
- Cocher [x] dans CONTEXT.md après chaque tâche terminée
- En fin de mission, mettre à jour l'état du build dans CONTEXT.md

### Rappel hooks
Les hooks PostToolUse ne fonctionnent PAS dans les sous-agents.
Ne pas compter sur eux — appliquer les règles de validation directement.

### État du projet ([X]/13 tâches)
Tâches terminées :
[coller les lignes ✅ de CONTEXT.md]

Tâches restantes :
[coller les lignes ⬜ de CONTEXT.md]

### Ta mission
[Décrire précisément la tâche]
Fichiers à créer/modifier : [liste exacte avec chemins]
Critères de succès : [ce qui doit fonctionner]
```

---

## Format du fichier à générer

Sauvegarder dans : `handoffs/YYYY-MM-DD-HHMM-handoff.md`

```markdown
# Handoff — [YYYY-MM-DD HH:MM]

## Feature active
[Nom et description courte]

## Objectif de la session
[Ce qu'on cherchait à accomplir]

## Ce qui a été fait
- `chemin/exact/fichier.js` — [ce qui a changé]
- `chemin/exact/autre.js` — [ce qui a changé]

## État du build
- Serveur (`npm run dev`) : [OK / erreurs — lesquelles]
- PDF (`npm run pdf:test`) : [OK / erreurs — lesquelles]
- Emails (`npm run mail:test`) : [OK / erreurs — lesquelles]
- CONTEXT.md : [X/13 tâches cochées]

## Blocages / échecs
[Approches tentées qui n'ont pas fonctionné, ou "RAS"]

## Prochaines étapes
1. [Action concrète + fichier concerné]
2. [Action concrète + fichier concerné]
3. ...
```