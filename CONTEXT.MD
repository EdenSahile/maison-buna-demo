# CONTEXT.MD — Maison Buna Demo

> État courant du projet démo public.

---

## État du build

| Composant | État |
|-----------|------|
| Serveur local (`npm run dev:all`) | ⬜ à vérifier |
| PDF Puppeteer (`npm run pdf:test`) | ✅ OK (2026-09-07) |
| Emails local (`npm run mail:test`) | ⬜ à vérifier |
| App React (`npm run dev:client`) | ✅ build Vite OK (2026-09-07) |
| Tests client (`npm test`) | ✅ 18/18 (2026-09-07) |
| Tests serveur (`npm run test:server`) | ✅ 27/27 (2026-09-07) |

---

## Branches actives

| Branche | Objet | État |
|---------|-------|------|
| `main` | branche principale | active |
| `fix/devis-ponctuation` | ponctuation du devis PDF + mise à jour CLAUDE.md | mergée (PR #13) |
| `chore/gitignore-reports` | rapports d'audit hors du dépôt public | mergée (PR #14) |
| `chore/reports-local-agents` | convention reports/local/ pour les 4 agents | en attente de PR |
| `chore/demo-safety` | mention DÉMO sur le PDF, retrait des coordonnées réelles | en cours |

---

## Tâches en cours

- [x] Remplacer les tirets cadratins du devis PDF par la ponctuation adaptée (`templates/devis-template.html`)
- [x] Mettre CLAUDE.md à jour : le formulaire est une app React dans `client/`, plus `public/index.html`
- [ ] Décider du sort de la puce `content: '—'` de la liste Conditions (`devis-template.html:501`)
- [x] Ajouter la mention DÉMO au PDF, comme dans les deux emails (`chore/demo-safety`)
- [x] Retirer les coordonnées réelles du client de `ux-designer.md` et du workflow de review
- [x] Trancher l'écart de polices : la charte officielle devient **Crimson Pro + Open Sans**, Cormorant Garamond et Jost sont abandonnés (jamais implémentés). Décision du 07/09/2026.
- [ ] PR dédiée à l'alignement de la charte : `CLAUDE.MD:42` et `:147`, `.claude/agents/ux-designer.md:31`, `.github/workflows/claude-pr-review.yml:108-109`, `templates/email-client.html:18` et `templates/email-admin.html:18` (ces deux derniers chargent DM Sans + DM Serif Display, les aligner change le rendu des emails). Ne pas toucher à `templates/devis-template.html` : polices intégrées en base64, rendu Puppeteer fonctionnel.
