# CONTEXT.MD — Maison Buna Demo

> État courant du projet démo public.

---

## État du build

| Composant | État |
|-----------|------|
| Serveur local (`npm run dev:all`) | ⬜ à vérifier |
| PDF Puppeteer (`npm run pdf:test`) | ✅ OK (2026-09-07) |
| Emails local (`npm run mail:test`) | ⬜ à vérifier |
| App React (`npm run dev:client`) | ✅ build Vite OK (2026-09-09) |
| Tests client (`npm test`) | ✅ 18/18 (2026-09-09) |
| Tests serveur (`npm run test:server`) | ✅ 131/131 (2026-09-10) |

---

## Branches actives

| Branche | Objet | État |
|---------|-------|------|
| `main` | branche principale | active |
| `chore/reports-local-agents` | convention reports/local/ pour les 4 agents | mergée (PR #15) |
| `chore/demo-safety` | mention DÉMO sur le PDF, retrait des coordonnées réelles | mergée (PR #16) |
| `fix/devis-validation` | validation stricte des entrées du devis | mergée (PR #17) |
| `docs/context-backlog` | remise à jour de CONTEXT.MD et backlog | mergée (PR #18) |
| `fix/server-hardening` | statut d'erreur relayé, concurrence PDF bornée | PR #19 ouverte |
| `docs/pipeline-testeur` | suppression de l'étape Testeur | PR #20 ouverte |
| `fix/file-attente-plafond` | saturation convertie en attente, plus en échec | mergée (PR #21) |
| `chore/ci-config` | contrôle de syntaxe unifié, trust proxy configurable | en cours |

---

## Tâches en cours

- [x] Remplacer les tirets cadratins du devis PDF par la ponctuation adaptée (`templates/devis-template.html`)
- [x] Mettre CLAUDE.md à jour : le formulaire est une app React dans `client/`, plus `public/index.html`
- [ ] Décider du sort de la puce `content: '—'` de la liste Conditions (`devis-template.html:501`)
- [x] Ajouter la mention DÉMO au PDF, comme dans les deux emails (`chore/demo-safety`)
- [x] Retirer les coordonnées réelles du client de `ux-designer.md` et du workflow de review
- [x] Trancher l'écart de polices : la charte officielle devient **Crimson Pro + Open Sans**, Cormorant Garamond et Jost sont abandonnés (jamais implémentés). Décision du 07/09/2026.
- [x] Valider strictement les entrées du devis : référentiels café et quantité, typage, longueurs maximales (PR #17)
- [x] Échapper le HTML de l'alerte admin `sendPdfFailureAlert` (PR #17)
- [x] Ne plus persister `quantiteParCafe` brut, seulement les cafés retenus (PR #17)
- [ ] PR dédiée à l'alignement de la charte : `CLAUDE.MD:42` et `:147`, `.claude/agents/ux-designer.md:31`, `.github/workflows/claude-pr-review.yml:108-109`, `templates/email-client.html:18` et `templates/email-admin.html:18` (ces deux derniers chargent DM Sans + DM Serif Display, les aligner change le rendu des emails). Ne pas toucher à `templates/devis-template.html` : polices intégrées en base64, rendu Puppeteer fonctionnel.

### Priorité 1 — durcissement serveur (`fix/server-hardening`)

- [x] `server.js:38-42` : statut porté par l'erreur relayé quand il est entre 400 et 499, message de réponse toujours générique. Handler extrait dans `middleware/errorHandler.js` pour être testable. Audité le 09/09/2026.
- [x] `services/pdfService.js` : concurrence bornée à 2, file d'attente de 10, timeout de 45 s par génération, refus immédiat au-delà de la file. Limite choisie sur mesure : ~100 Mo par instance Chromium concurrente, ~500 ms par génération. Audité le 09/09/2026.
- [x] `routes/devis.js` traitait `FileSatureeError` comme une panne ordinaire. La saturation est convertie en attente : plafond de 300 s en file, rejet seulement au-delà. Décision du 10/09/2026.
- [x] Règle absolue n°4 tenue sur le chemin d'abandon : le client reçoit son email même sans PDF, et les templates annoncent la pièce jointe d'après sa présence réelle et non d'après `sur_devis`.
- [ ] Aucun champ d'état dans `data/devis.json` : un redémarrage pendant l'attente en file perd le PDF et les emails de jusqu'à 52 devis, sans moyen de les retrouver. Relevé par l'audit du 10/09/2026 ; l'absence de gestion de SIGTERM allonge cette fenêtre à 300 s.
- [x] `trust proxy` est réglable par `TRUST_PROXY`, valeur par défaut 1, via le lecteur d'environnement extrait dans `config/env.js`.
- [ ] `data/storage.js:8-17` relit et réécrit `data/devis.json` en synchrone à chaque demande, et l'envoi des deux emails n'a aucun plafond global. La génération de PDF est bornée, le stockage et l'envoi ne le sont pas.

### Priorité 2 — documentation périmée (`docs/claude-md`)

- [x] Contrôle de syntaxe unifié : `npm run check:syntax` parcourt l'arborescence au lieu d'énumérer des fichiers. La CI, la skill `open-pr` et les définitions d'agents appellent tous ce script. Vérifié qu'il attrape une faute dans `middleware/errorHandler.js` et `services/limiteConcurrence.js`.

- [ ] `CLAUDE.MD:21` annonce Express 4, `package.json` déclare Express 5 (la ligne était en `:19` avant l'ajout de la ligne React à la section Stack)
- [ ] La section « Commandes utiles » omet `dev:all`, `test:server` et quatre autres scripts

### Priorité 3 — à joindre à la PR de charte ci-dessus

- [ ] `.env.example:4,8` utilise `email.com` et les scripts de test `gmail.com` : deux domaines réels, là où la règle 8 demande `example.com`. Relevé par l'audit du 10/09/2026.

- [ ] Tirets cadratins restants dans `email-client.html:268` et `email-admin.html:288`, à aligner sur la ponctuation du PDF (PR #13)
- [ ] `README.md:211` mentionne encore `public/index.html`, troisième endroit désynchronisé après `ux-designer.md` et le workflow
- [ ] Migrer les adresses `fictif.com` des fixtures vers `example.com` : seuls `example.com`, `.org` et `.net` sont réservés par la RFC 2606, `fictif.com` est enregistrable par un tiers. Concernés : `marie@cafeducoin.fr` dans deux fichiers de test, `sophie.martin@gmail.com` et `marie.dupont@gmail.com` dans les scripts de test PDF. Le seul cas qui envoyait vraiment, `scripts/test-mail.js:11`, est déjà corrigé.
- [ ] Message d'erreur trompeur : `['Limmu','Sidamo','Yirgacheffe','Limmu']` renvoie « 3 valeurs maximum » alors que la vraie cause est le doublon
- [ ] `.claude/skills/open-pr/SKILL.md:66` expose une arborescence locale (`.../Documents/Claude/maison-buna-demo/…`) dans un dépôt public. Chemin tronqué, sans `/Users/<nom>`, donc pas de nom d'utilisateur exposé — la ligne 67 voisine en contient un second pour le dépôt prod.
- [ ] Avant de corriger les 8 couleurs hors charte du CSS du PDF, auditer les couleurs réellement utilisées dans chaque artefact. Même piège que pour les polices : si la charte couleur documentée est périmée, « corriger » alignerait du code correct sur une référence fictive.

### Solution cible — le jour où ce code servira en production réelle

Ce n'est pas une tâche courante : à faire quand le projet quittera l'état de
démonstration, pas avant.

- **Découplage durable de la génération et de l'envoi.** La réponse au client
  est déjà immédiate et le travail déjà hors du fil de la requête
  (`routes/devis.js`, `setImmediate` après `res.json`), mais dans le même
  processus : un redémarrage de l'instance perd les demandes en cours et celles
  en file. La vraie réponse est une file persistante et un worker séparé, ce
  qui apporte aussi la reprise après échec et l'observabilité. Aujourd'hui,
  refondre le flux central serait disproportionné face au risque réel sur une
  démo dont le trafic tient dans deux créneaux.

### Priorité 4 — idée de fond, sans urgence

- [ ] La revue de CI n'analyse que le diff, donc elle ne verra jamais un défaut déjà présent dans un fichier que personne ne modifie. C'est ce qui a permis à une adresse réelle de survivre plusieurs PR. Ajouter un scan de l'arbre complet en complément.
