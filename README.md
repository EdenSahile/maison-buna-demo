# Maison Buna : Devis (Démo)

Application de gestion de demandes de devis pour **Maison Buna**, marque française de café de spécialité éthiopien.

Le client remplit un formulaire adapté à son profil, un devis PDF peut être généré automatiquement, les parties prenantes sont notifiées par email et la demande est archivée avec un numéro unique.

Ce projet a été **conçu et développé dans le cadre d'un besoin client réel**. Ce dépôt constitue sa **version démo publique** : toutes les informations affichées (raison sociale, adresse, contact, SIRET) sont fictives et un bandeau « Démo » reste visible sur l'ensemble du parcours.

La version de production, avec les informations réelles de l'entreprise, est hébergée dans un dépôt privé séparé.

## Objectif produit

L'objectif est de remplacer un parcours de demande de devis manuel par un parcours digital permettant de :

* collecter des demandes structurées ;
* adapter le formulaire au profil du demandeur ;
* automatiser la tarification des demandes éligibles ;
* générer un devis PDF conforme à la charte graphique ;
* notifier automatiquement le client et l'administration ;
* conserver une trace de chaque demande avec un identifiant et un numéro de devis uniques ;
* orienter les demandes spécifiques vers un traitement manuel.

L'enjeu est de **réduire les tâches administratives tout en conservant une expérience simple pour le demandeur et un contrôle fiable côté administration**.

## Ce que fait l'application

Le formulaire s'adapte à deux profils de demandeur (entreprise ou particulier) et se déroule en quatre sections : profil, contact, commande (choix des cafés et quantités), précisions.

À la soumission :

1. Le serveur valide les champs obligatoires (email, identité, café et quantité choisis, et selon le profil : société ou adresse de livraison).
2. La demande est sauvegardée dans `data/devis.json` avec un identifiant unique (`crypto.randomUUID`), un horodatage et un numéro de devis séquentiel (préfixe `MBE` pour une entreprise, `MBP` pour un particulier).
3. Lorsqu'elle est éligible à une tarification automatique, un PDF de devis est généré avec Puppeteer (jusqu'à 3 tentatives en cas d'échec) à partir d'un template HTML/Handlebars respectant la charte graphique de la marque.
4. Deux emails sont envoyés à chaque devis, avec ou sans tarification automatique : une confirmation au client et une notification interne à l'administration (le PDF n'est joint que si la tarification était automatique et sa génération a réussi).
5. Exception à la règle 4 : si la génération du PDF échoue après les 3 tentatives sur un devis éligible à la tarification automatique, le client n'est pas notifié à tort ; seule une alerte est envoyée à l'administration pour un traitement manuel.

### Pourquoi cette architecture ?

La réponse HTTP au formulaire ne dépend pas de la génération du PDF ni de l'envoi des emails. La demande est d'abord validée et enregistrée, puis les traitements plus longs sont exécutés en tâche de fond.

Cela permet de **préserver la réactivité du parcours utilisateur** tout en séparant l'enregistrement fiable de la demande des traitements secondaires.

Les demandes portant la mention **« Sur mesure »** (quantité à définir) ne sont pas chiffrées automatiquement : elles passent en devis manuel, sans PDF ni prix calculé, mais reçoivent tout de même les deux emails de confirmation.

## Parcours utilisateur

| Étape        | Composant               | Contenu                                                                                      |
| ------------ | ----------------------- | -------------------------------------------------------------------------------------------- |
| Profil       | `SectionProfil.jsx`     | Entreprise ou particulier, identité                                                          |
| Contact      | `SectionContact.jsx`    | Email, téléphone, adresse (particulier)                                                      |
| Commande     | `SectionCommande.jsx`   | Choix des cafés (Limmu, Sidamo, Yirgacheffe) et quantité par café (250 g, 500 g, sur mesure) |
| Précisions   | `SectionPrecisions.jsx` | Fréquence, mouture, message libre                                                            |
| Confirmation | `SuccessView.jsx`       | Récapitulatif de la demande, sans rechargement de la page                                    |

## Stack technique

| Domaine        | Choix                                                        |
| -------------- | ------------------------------------------------------------ |
| Frontend       | React 19 + Vite, styled-components                           |
| Backend        | Node.js (ESM) + Express 5                                    |
| Génération PDF | Puppeteer (Chrome headless)                                  |
| Templates      | Handlebars (HTML avec variables)                             |
| Emails         | Nodemailer (SMTP), avec repli automatique sur l'API REST Brevo si le SMTP échoue |
| Stockage       | Fichier JSON (`data/devis.json`), sans base de données       |
| Sécurité       | Helmet, rate limiting (5 requêtes / 15 min sur `/api/devis`) |
| Tests          | Vitest (serveur et client)                                   |
| CI et review   | GitHub Actions + `anthropics/claude-code-action`             |

## Architecture

### Structure du projet

```text
maison-buna-demo/
├── server.js                    # Point d'entrée Express (port 3000)
├── routes/
│   └── devis.js                 # POST /api/devis : validation, tarification, orchestration
├── services/
│   ├── pdfService.js            # Génération PDF (Puppeteer + Handlebars)
│   └── mailService.js            # Envoi des emails (Nodemailer)
├── data/
│   ├── storage.js                # Persistance des devis
│   └── devis.json                # Demandes reçues
├── templates/
│   ├── devis-template.html       # Template PDF
│   ├── email-client.html         # Email de confirmation
│   └── email-admin.html          # Email de notification interne
├── client/                       # Application React (Vite)
│   └── src/
│       ├── components/           # Formulaire, sections, UI réutilisable
│       └── utils/formUtils.js    # Validation front, progression du stepper
├── public/                       # Assets statiques servis par Express
├── .claude/                      # Configuration Claude Code (agents, hooks, skills)
├── .github/workflows/            # CI (tests + review automatique)
└── CLAUDE.MD / CONTEXT.MD        # Règles permanentes / état courant du projet
```

### Flux d'une demande

```text
Formulaire React (/)
        ↓
POST /api/devis
        ↓
Validation serveur
        ↓
Enregistrement de la demande
        ↓
Réponse au client { success, id }
        ↓
Traitements en tâche de fond
        ├── Génération du PDF (si tarification automatique)
        └── Envoi des deux emails
```

La génération du PDF et l'envoi des emails ne bloquent donc pas la réponse au formulaire.

## Mode démo

Ce dépôt est la vitrine publique du projet.

Toutes les informations permettant d'identifier l'entreprise sont fictives, notamment :

* raison sociale ;
* adresse ;
* coordonnées ;
* SIRET ;
* informations utilisées dans les templates.

Un bandeau **« Démo, les devis générés sont fictifs et n'ont aucune valeur commerciale »** est affiché sur l'ensemble du parcours.

La review automatique en CI vérifie également qu'aucune information réelle de l'entreprise n'est introduite dans ce dépôt.

## Installation

### Variables d'environnement

Copier `.env.example` en `.env` et renseigner :

| Variable                              | Rôle                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `PORT`                                 | Port du serveur Express (3000 par défaut)                                                              |
| `SMTP_HOST`, `SMTP_PORT`                | Hôte et port du serveur SMTP Brevo utilisé par Nodemailer                                              |
| `BREVO_SMTP_USER`, `BREVO_SMTP_PASS`    | Identifiants d'authentification SMTP effectivement utilisés par Nodemailer                              |
| `SMTP_USER`                            | Adresse affichée comme expéditeur (« from ») dans les emails envoyés                                    |
| `SMTP_PASS`                            | Utilisée uniquement comme clé d'API de repli si le SMTP échoue et qu'aucune `BREVO_API_KEY` n'est définie |
| `ADMIN_EMAIL`                          | Adresse recevant la notification interne à chaque devis                                                |
| `BASE_URL`                             | URL publique de l'application, utilisée pour les images des emails en cas de repli sur l'API REST       |
| `COUNTER_SEED`                         | Valeur de départ du compteur de numéros de devis                                                       |

### Développement

```bash
git clone https://github.com/EdenSahile/maison-buna-demo.git
cd maison-buna-demo
npm install
cd client && npm install && cd ..
cp .env.example .env
npm run dev:all
```

`npm run dev:all` démarre en parallèle l'API Express (nodemon, port 3000) et le frontend Vite (port 5173). L'installation racine et l'installation du client sont deux étapes distinctes : le `npm install` racine ne pose pas les dépendances de `client/`.

Le premier `npm install` (racine) déclenche également l'installation de Chrome headless nécessaire à Puppeteer (script `postinstall`).

### Tests

```bash
npm run test:server   # Vitest, routes et services (Puppeteer réel)
npm test              # Vitest côté client
npm run test:all      # les deux suites l'une après l'autre
```

Les tests serveur couvrent notamment les routes et services, avec génération PDF via une instance réelle de Puppeteer.

## Déploiement

L'application est déployée sur Render pour l'environnement de démonstration.

```bash
npm run build
npm start
```

Le build installe Chrome pour Puppeteer, installe les dépendances du client puis construit le frontend (`client/dist`). En production, `npm start` démarre l'API Express (`NODE_ENV=production`) et sert les fichiers statiques issus du build frontend.

### Disponibilité de l'environnement de démonstration

L'application est déployée sur Render. Sur l'offre gratuite utilisée pour cette démonstration, un service est mis en veille après 15 minutes d'inactivité, ce qui peut entraîner un temps de redémarrage lors du premier accès.

Pour limiter ce phénomène et maintenir l'environnement de démonstration disponible, une tâche planifiée externe (cron-job.org) appelle l'application toutes les 10 minutes, un intervalle volontairement inférieur au seuil de mise en veille de Render.

```text
cron-job.org
     │
     │ requête HTTP GET toutes les 10 minutes
     ▼
Application déployée sur Render
     │
     ▼
Maintien de l'environnement actif
```

Cette solution permet de limiter les temps de réveil de l'environnement de démonstration tout en conservant une infrastructure légère et adaptée à un projet de démonstration.

## Règles absolues du projet

Ces règles sont documentées dans `CLAUDE.MD` et appliquées aussi bien en développement qu'en review automatique :

1. Ne jamais committer `.env`, seulement `.env.example`.
2. Ne jamais modifier `public/index.html` sans raison explicite.
3. Toujours valider les données côté serveur (email, identité, café et quantité obligatoires).
4. Toujours envoyer les deux emails à chaque devis (voir l'exception ci-dessus en cas d'échec définitif du PDF).
5. Toujours sauvegarder la demande avec un horodatage et un identifiant unique.
6. Respecter la charte graphique Maison Buna dans tous les templates (`#2e2010`, `#4F3422`, `#D3C2AC`, `#AB9679`, `#FAF7F3`).
7. Ne jamais introduire d'information réelle de l'entreprise dans ce dépôt de démo.

## CI et review automatique

Chaque pull request déclenche un workflow GitHub Actions en deux temps.

### 1. Tests et build

Le job `test` vérifie successivement :

* la syntaxe des fichiers serveur ESM ;
* la suite Vitest serveur, avec génération PDF via Puppeteer réel ;
* la suite Vitest client ;
* le build Vite du frontend.

### 2. Review automatisée

Le job `claude-review`, déclenché uniquement si les tests passent, utilise `anthropics/claude-code-action` pour relire le diff de la pull request à la lumière des règles du projet.

Les constats sont classés :

* **Critique**
* **Important**
* **Mineur**

En l'absence de constat Critique ou Important, la review approuve la pull request. Dans le cas contraire, elle demande des modifications. L'agent de review **ne merge pas et ne pousse jamais de commit lui-même**.

Un second workflow (`claude.yml`) permet également de solliciter Claude directement depuis les commentaires d'issues ou de pull requests en le mentionnant avec `@claude`.

## Méthode de développement assistée par IA

Le développement suit un pipeline interne à plusieurs rôles, décrit dans `CLAUDE.MD` et `.claude/agents/` :

1. **UX Designer**
2. **Développeur** — écrit le code et les tests qui vont avec
3. **Code Reviewer**
4. **Sécurité**

Chaque rôle documente son travail avant de passer la main au suivant, dans `reports/local/`, ignoré par git : ces rapports citent des fichiers, des numéros de ligne, des bugs et des vulnérabilités, et n'ont pas leur place dans un dépôt public. Les fichiers `reports/*.md` visibles ici sont donc des stubs.

Il n'y a pas de rôle Testeur : l'état des tests vient du verrou qualité — build Vite, suite Vitest serveur et client, `node --check` — passé avant chaque commit et relancé par la CI sur chaque pull request. Un contrôle déterministe n'a pas besoin d'être reformulé par un agent.

L'état courant du projet (tâches terminées, tâches restantes, état du build) est conservé dans `CONTEXT.MD`. Un système de handoff permet également de reprendre une session de travail là où elle s'était arrêtée.

Cette organisation permet d'utiliser l'IA non seulement pour produire du code, mais aussi pour **structurer, tester, reviewer et sécuriser le développement**.

## Pourquoi ce projet ?

Maison Buna est un cas concret de transformation d'un besoin métier en produit numérique. Le projet permet de mettre en pratique plusieurs dimensions du rôle d'**AI Product Builder** :

* compréhension et formalisation d'un besoin métier ;
* conception du parcours utilisateur ;
* traduction des règles métier en comportements applicatifs ;
* construction frontend et backend de bout en bout ;
* automatisation de tâches administratives ;
* intégration de services externes ;
* génération de documents ;
* mise en place de tests et de contrôles qualité ;
* utilisation de l'IA dans le cycle de développement ;
* déploiement d'une application fonctionnelle.

Le dépôt public permet de montrer concrètement le travail réalisé sans exposer les données ou informations sensibles de l'entreprise.

## Auteur

**Eden Sahilé**
Conception et construction de produits numériques utilisant l'intelligence artificielle.
