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
| Tests serveur (`npm run test:server`) | ✅ 66/66 (2026-09-09) |

---

## Branches actives

| Branche | Objet | État |
|---------|-------|------|
| `main` | branche principale | active |
| `chore/reports-local-agents` | convention reports/local/ pour les 4 agents | mergée (PR #15) |
| `chore/demo-safety` | mention DÉMO sur le PDF, retrait des coordonnées réelles | mergée (PR #16) |
| `fix/devis-validation` | validation stricte des entrées du devis | mergée (PR #17) |

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

- [ ] `server.js:38-42` : le handler d'erreur global ignore `err.status`, donc un JSON malformé (400) et un corps de plus de 100 ko (413) sortent en 500. Dernier reste non tenu du critère « jamais un 500 sur une entrée invalide ». Transmettre le statut porté par l'erreur s'il est inférieur à 500. Garder le message générique dans la réponse, ne jamais renvoyer `err.message`.
- [ ] `services/pdfService.js:18-40` : un Chromium complet lancé par devis, sans limite de concurrence. Trois ou quatre générations simultanées saturent les 512 Mo de l'instance Render et font tomber la démo. Piste : file d'attente, sémaphore, ou réutilisation d'une instance.

### Priorité 2 — documentation périmée (`docs/claude-md`)

- [ ] `CLAUDE.MD:21` annonce Express 4, `package.json` déclare Express 5 (la ligne était en `:19` avant l'ajout de la ligne React à la section Stack)
- [ ] La section « Commandes utiles » omet `dev:all`, `test:server` et quatre autres scripts

### Priorité 3 — à joindre à la PR de charte ci-dessus

- [ ] Tirets cadratins restants dans `email-client.html:268` et `email-admin.html:288`, à aligner sur la ponctuation du PDF (PR #13)
- [ ] `README.md:211` mentionne encore `public/index.html`, troisième endroit désynchronisé après `ux-designer.md` et le workflow
- [ ] Migrer les adresses `fictif.com` des fixtures vers `example.com` : seuls `example.com`, `.org` et `.net` sont réservés par la RFC 2606, `fictif.com` est enregistrable par un tiers. Concernés : `marie@cafeducoin.fr` dans deux fichiers de test, `sophie.martin@gmail.com` et `marie.dupont@gmail.com` dans les scripts de test PDF. Le seul cas qui envoyait vraiment, `scripts/test-mail.js:11`, est déjà corrigé.
- [ ] Message d'erreur trompeur : `['Limmu','Sidamo','Yirgacheffe','Limmu']` renvoie « 3 valeurs maximum » alors que la vraie cause est le doublon
- [ ] `.claude/skills/open-pr/SKILL.md:66` expose une arborescence locale (`.../Documents/Claude/maison-buna-demo/…`) dans un dépôt public. Chemin tronqué, sans `/Users/<nom>`, donc pas de nom d'utilisateur exposé — la ligne 67 voisine en contient un second pour le dépôt prod.
- [ ] Avant de corriger les 8 couleurs hors charte du CSS du PDF, auditer les couleurs réellement utilisées dans chaque artefact. Même piège que pour les polices : si la charte couleur documentée est périmée, « corriger » alignerait du code correct sur une référence fictive.

### Priorité 4 — idée de fond, sans urgence

- [ ] La revue de CI n'analyse que le diff, donc elle ne verra jamais un défaut déjà présent dans un fichier que personne ne modifie. C'est ce qui a permis à une adresse réelle de survivre plusieurs PR. Ajouter un scan de l'arbre complet en complément.
