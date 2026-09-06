# CLAUDE.md — Maison Buna Devis

> Lire ce fichier en entier avant toute action.
> Contexte permanent du projet — ne pas y mettre l'état courant (→ CONTEXT.md).

---

## Présentation du projet

Application Node.js de gestion de demandes de devis pour **Maison Buna**,
marque française de café de spécialité éthiopien, vente B2B aux entreprises.

Le client remplit un formulaire → un devis PDF est généré → deux emails
sont envoyés (client + admin) → la demande est sauvegardée.

---

## Stack technique

- **Runtime** : Node.js (ESM — `"type": "module"` dans package.json)
- **Serveur** : Express 4
- **PDF** : Puppeteer (headless Chrome → HTML → PDF)
- **Templates** : Handlebars (`.html` avec `{{variables}}`)
- **Emails** : Nodemailer + SMTP Brevo
- **Stockage** : JSON simple (`data/devis.json`)
- **Dev** : Nodemon

---

## Charte graphique Maison Buna

```
#2e2010  — brun très foncé (textes principaux, header)
#4F3422  — brun moyen (titres, accents)
#D3C2AC  — crème (bordures, éléments secondaires)
#AB9679  — sable (textes secondaires, labels)
#FAF7F3  — fond crème clair (background)
```

**Règle absolue : ne jamais hardcoder d'autres couleurs.**
Polices : Cormorant Garamond (serif) + Jost (sans-serif).

---

## Structure du projet

```
maison-buna-devis/
├── CLAUDE.md
├── CONTEXT.md
├── .env                      ← jamais committer
├── .env.example              ← toujours à jour
├── .gitignore
├── package.json
├── server.js                 ← point d'entrée Express (port 3000)
├── public/
│   └── index.html            ← formulaire HTML (NE PAS MODIFIER sans raison)
├── routes/
│   └── devis.js              ← POST /api/devis
├── services/
│   ├── pdfService.js         ← génération PDF Puppeteer
│   └── mailService.js        ← envoi emails Nodemailer
├── templates/
│   ├── devis-template.html   ← template PDF charte Maison Buna
│   ├── email-client.html     ← email confirmation client
│   └── email-admin.html      ← email notification interne
├── data/
│   └── devis.json            ← stockage des demandes reçues
├── scripts/
│   ├── test-pdf.js           ← test génération PDF sans formulaire
│   └── test-mail.js          ← test envoi email sans formulaire
├── .claude/
│   ├── settings.json         ← config hooks
│   ├── commands/
│   │   └── handoff.md
│   ├── skills/
│   │   └── handoff/
│   │       └── SKILL.md      ← skill de passation de session
│   └── hooks/
│       ├── session-start.js
│       ├── post-tool-use.js
│       └── stop.js
├── handoffs/                 ← fichiers générés en fin de session
└── docs/
    └── specs/
```

---

## Règles absolues

1. **Ne jamais committer `.env`** — uniquement `.env.example`
2. **Ne jamais modifier `public/index.html`** sans raison explicite demandée
3. **Toujours valider les données côté serveur** (email, société, quantité obligatoires)
4. **Toujours envoyer 2 emails** à chaque devis : client + admin
5. **Toujours sauvegarder** dans `data/devis.json` avec timestamp + id unique
6. **Respecter la charte graphique** dans tous les templates
7. **Toujours cocher les tâches** dans `CONTEXT.md` au fur et à mesure

---

## Variables d'environnement

```
PORT=3000
SMTP_HOST=smtp.brevo.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASS=votre_cle_brevo
ADMIN_EMAIL=contact@fictif.com
```

---

## Commandes utiles

```bash
npm run dev          # démarre avec nodemon
npm run start        # démarre en production
npm run pdf:test     # génère un PDF de test
npm run mail:test    # envoie un email de test
```

---

## Sous-agents — règle obligatoire

Les sous-agents démarrent à froid. Ils ne lisent pas CLAUDE.md,
ni CONTEXT.md, ni les hooks automatiquement.
Ils ne savent que ce qui est dans leur prompt.

### Avant de spawner tout sous-agent, toujours inclure dans son prompt :

**1. Stack et charte**
- Stack : Node.js ESM + Express + Nodemailer + Puppeteer + Handlebars
- Couleurs Maison Buna : #2e2010, #4F3422, #D3C2AC, #AB9679, #FAF7F3
- Ne jamais hardcoder d'autres couleurs
- Ne jamais modifier public/index.html sans raison explicite
- Polices : Cormorant Garamond (serif) + Jost (sans-serif)

**2. Règles absolues**
- Ne jamais committer .env
- Toujours valider les données côté serveur
- Toujours envoyer 2 emails (client + admin)
- Toujours sauvegarder dans data/devis.json avec timestamp + id unique

**3. État courant (copier depuis CONTEXT.md)**
- Tâches terminées : [lister les ✅]
- Tâche en cours : [la tâche concernée]

**4. Mission précise**
- Décrire exactement ce que le sous-agent doit faire
- Lister les fichiers à créer ou modifier (chemins exacts)
- Préciser les critères de succès

**5. Instruction de mise à jour**
- Après chaque tâche complétée, cocher [x] dans CONTEXT.md
- En fin de mission, mettre à jour l'état du build dans CONTEXT.md

### Rappel hooks
Les hooks PostToolUse ne se déclenchent PAS dans les sous-agents.
Ne pas compter sur eux pour la validation — l'inclure dans le prompt.

## Pipeline multi-agents — ordre obligatoire

Quand on construit une feature, toujours respecter cet ordre :

1. UX Designer    -> crée les templates (reports/dev-report.md : "UX Designer — DONE")
2. Développeur    -> construit le serveur (reports/dev-report.md : "Développeur — DONE")
3. Testeur        -> valide les fonctionnalités (reports/test-report.md : "DONE")
4. Code Reviewer  -> audite la qualité (reports/review-report.md : "APPROUVÉ")
5. Sécurité       -> audite les vulnérabilités (reports/security-report.md : "SÛR")

En cas d'échec :
- Testeur FAILED -> retour Développeur avec reports/test-report.md
- Reviewer BLOQUANT -> retour Développeur avec reports/review-report.md
- Sécurité BLOQUANT -> retour Développeur avec reports/security-report.md

Fichiers de communication entre agents :
- reports/dev-report.md      <- UX Designer + Développeur écrivent ici
- reports/test-report.md     <- Testeur écrit ici
- reports/review-report.md   <- Reviewer écrit ici
- reports/security-report.md <- Sécurité écrit ici

---

## Démarrage de session — OBLIGATOIRE ET PRIORITAIRE

**Ta toute première réponse dans le chat doit TOUJOURS afficher le résumé du handoff.**
Peu importe ce que l'utilisateur a écrit en premier — même une question directe —
tu commences par présenter le handoff, PUIS tu réponds à la question.

L'utilisateur ne voit pas les `<system-reminder>`. Il ne voit que ce que tu écris.
Si tu ne l'affiches pas, il ne le voit pas.

Protocole obligatoire :
1. Le hook `session-start.js` injecte le dernier handoff dans ton contexte
2. **Dans ta première réponse**, afficher :
   - Le nom du fichier handoff chargé
   - Les tâches terminées (✅) et restantes
   - L'état du build (serveur, PDF, emails)
   - Les prochaines étapes
3. Demander : "Voulez-vous continuer avec la tâche suivante ?"
4. Ensuite seulement, répondre à l'éventuelle question de l'utilisateur