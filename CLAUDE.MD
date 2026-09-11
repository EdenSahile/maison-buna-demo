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
- **Serveur** : Express 5
- **PDF** : Puppeteer (headless Chrome → HTML → PDF)
- **Front** : React 19 + Vite + styled-components (dossier `client/`)
- **Templates PDF/emails** : Handlebars (`.html` avec `{{variables}}`)
- **Emails** : Nodemailer + SMTP Brevo
- **Stockage** : JSON simple (`data/devis.json`)
- **Sécurité HTTP** : Helmet + express-rate-limit
- **Dev** : Nodemon
- **Tests** : Vitest (serveur à la racine, client dans `client/`)

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
Polices : Crimson Pro (serif) + Open Sans (sans-serif).

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
│   └── images/               ← images servies en statique
├── client/                   ← app React (Vite + styled-components)
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── components/       ← DevisForm.jsx et sections du formulaire
│       ├── styles/
│       └── utils/
├── routes/
│   └── devis.js              ← POST /api/devis, validation des entrées
├── middleware/
│   └── errorHandler.js       ← relaie le statut porté par l'erreur
├── config/
│   └── env.js                ← lecture des réglages d'environnement
├── services/
│   ├── pdfService.js         ← génération PDF Puppeteer, concurrence bornée
│   ├── limiteConcurrence.js  ← file d'attente à concurrence bornée
│   └── mailService.js        ← envoi emails Nodemailer
├── templates/
│   ├── devis-template.html   ← template PDF charte Maison Buna
│   ├── email-client.html     ← email confirmation client
│   └── email-admin.html      ← email notification interne
├── data/
│   └── devis.json            ← stockage des demandes reçues
├── scripts/
│   ├── check-syntax.js       ← node --check sur tout le JS serveur
│   ├── test-pdf.js           ← test génération PDF sans formulaire
│   └── test-mail.js          ← test envoi email sans formulaire
├── vitest.config.js          ← tests serveur : routes, services, data,
│                                middleware, config
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
2. **Ne jamais modifier le formulaire React (`client/src/`)** sans raison explicite demandée
3. **Toujours valider les données côté serveur** (email, société, quantité obligatoires)
4. **Toujours envoyer 2 emails** à chaque devis : client + admin
5. **Toujours sauvegarder** dans `data/devis.json` avec timestamp + id unique
6. **Respecter la charte graphique** dans tous les templates
7. **Toujours cocher les tâches** dans `CONTEXT.md` au fur et à mesure

---

## Variables d'environnement

```
PORT=3000
TRUST_PROXY=1                 # proxys de confiance (0 à 3) — décide de req.ip,
                              # donc du comptage du limiteur de débit

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=votre@email.com     # expéditeur affiché
SMTP_PASS=votre_cle_brevo
BREVO_SMTP_USER=…@smtp-brevo.com   # identifiants du transport SMTP
BREVO_SMTP_PASS=votre_cle_smtp
BREVO_API_KEY=…               # bascule REST quand le SMTP échoue
ADMIN_EMAIL=contact@fictif.com

BASE_URL=https://…            # sert à résoudre les images des emails REST
COUNTER_SEED=0                # point de départ du compteur de devis
```

Réglages de la génération PDF, tous facultatifs, valeurs par défaut entre
parenthèses. Une valeur invalide est refusée avec un avertissement, et le
défaut est conservé (`config/env.js`).

```
PDF_MAX_CONCURRENT=2          # générations simultanées (2)
PDF_MAX_FILE=50               # longueur maximale de la file (50)
PDF_ATTENTE_MAX_MS=300000     # attente maximale en file (300 s)
PDF_TIMEOUT_MS=45000          # plafond d'une génération (45 s)
PDF_FERMETURE_MS=5000         # délai de grâce à la fermeture du navigateur (5 s)
```

---

## Commandes utiles

```bash
npm run dev          # API seule, avec nodemon
npm run dev:client   # app React seule (Vite)
npm run dev:all      # les deux en parallèle — c'est celle du quotidien
npm run start        # production
npm run build        # installe Chrome pour Puppeteer, puis build le client

npm run test:server  # Vitest racine — tests serveur, Puppeteer réel
npm test             # Vitest client
npm run test:all     # enchaîne les deux
npm run check:syntax # node --check sur tout le JS serveur

npm run pdf:test     # génère un PDF de test dans scripts/
npm run mail:test    # ⚠️ envoie de vrais emails via Brevo
npm run docs:generate  # docs/technical-documentation.html → .pdf (docs/ ignoré par git)
```

`npm run dev` ne sert pas le formulaire : l'API ne sert `client/dist` qu'en
production (`server.js`). En développement, ouvrir l'URL de Vite, pas le
port 3000, sans quoi la page affiche « Cannot GET / ».

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
- Ne jamais modifier le formulaire React (client/src/) sans raison explicite
- Polices : Crimson Pro (serif) + Open Sans (sans-serif)

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

## Agents locaux — ne pas en lancer par défaut

Un audit local coûte 80 000 à 120 000 tokens. Les trois passes de revue de la
PR #25 en ont consommé près de 300 000 à elles seules, et les PR de
documentation #18 et #24 n'en ont eu aucun sans que ça pose problème.

**La règle : aucun agent local sans demande explicite de l'utilisateur.**
À la place, deux contrôles qui ne coûtent presque rien :

1. **Vérification par mutation, à faire soi-même sur chaque correctif.**
   Désactiver la ligne corrigée, relancer les tests, vérifier qu'un test
   tombe, restaurer. C'est ce qui a réellement attrapé les défauts de cette
   session, pas le nombre de passes : un test qui passe avec et sans la
   correction ne teste rien.
2. **La review de CI**, qui tourne déjà sur chaque pull request. C'est elle
   qui a repéré la phrase devenue fausse dans l'alerte admin.

Quand un audit semble justifié — persistance des données, secrets,
workflow de CI —, le **proposer** en disant pourquoi, et attendre la réponse.
Ne jamais le lancer de sa propre initiative.

---

## Pipeline multi-agents — sur demande seulement

L'ordre ci-dessous s'applique **quand l'utilisateur demande un audit**, pas
automatiquement après chaque feature :

1. UX Designer    -> crée les templates (reports/local/dev-report.md : "UX Designer — DONE")
2. Développeur    -> construit le serveur et ses tests (reports/local/dev-report.md : "Développeur — DONE")
3. Code Reviewer  -> audite la qualité (reports/local/review-report.md : "APPROUVÉ")
4. Sécurité       -> audite les vulnérabilités (reports/local/security-report.md : "SÛR")

En cas d'échec :
- Reviewer BLOQUANT -> retour Développeur avec reports/local/review-report.md
- Sécurité BLOQUANT -> retour Développeur avec reports/local/security-report.md

### L'état des tests vient du verrou qualité, pas d'un agent

Il n'y a pas d'étape Testeur. Aucun agent ne produit de rapport de tests :
la source de vérité est le verrou qualité, passé avant chaque commit.

```bash
cd client && npm run build    # build Vite
npm run test:server           # Vitest racine — tests serveur, Puppeteer réel
npm test                      # tests client
npm run check:syntax        # node --check sur tout le JS serveur
```

C'est un contrôle déterministe, et la CI relance la même chose sur chaque PR
comme vérification obligatoire. Un agent qui rédigerait un rapport de
résultats de tests ne ferait que recopier ce que ces commandes établissent
déjà, avec le risque de le paraphraser de travers.

Ce que l'étape Testeur avait d'utile est versé dans l'étape Développement :
concevoir les tests nécessaires, chercher les chemins non couverts, écrire
les cas adversariaux. Ce travail relève de qui écrit le code.

Fichiers de communication entre agents :
- reports/local/dev-report.md      <- UX Designer + Développeur écrivent ici
- reports/local/review-report.md   <- Reviewer écrit ici
- reports/local/security-report.md <- Sécurité écrit ici

Le dépôt est public. `reports/local/` est ignoré par git : c'est là que vont
les trois rapports, qui citent des fichiers, des numéros de ligne, des bugs et
des vulnérabilités. Les fichiers `reports/*.md` restent des stubs versionnés et
ne doivent jamais contenir de findings.

### Fichiers d'entrée des agents : bloquant ou optionnel, jamais entre les deux

Un agent qui attend un fichier, ne le trouve pas et continue quand même en le
signalant produit un audit dont personne ne sait s'il vaut. Chaque définition
d'agent tranche donc explicitement, pour chaque fichier qu'elle lit en entrée :

- **bloquant** : absent ou sans le verdict attendu, l'agent s'arrête et le dit
  à l'agent principal. Il ne produit pas de rapport partiel.
- **optionnel** : l'agent travaille sans, et n'en parle pas.

État actuel : `reports/local/review-report.md` est bloquant pour l'agent
Sécurité. `reports/local/dev-report.md` est optionnel pour le Développeur. Le
Code Reviewer n'a aucun fichier d'entrée : il audite le diff.

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