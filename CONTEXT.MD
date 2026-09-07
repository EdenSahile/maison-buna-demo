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
| `fix/devis-ponctuation` | ponctuation du devis PDF + mise à jour CLAUDE.md | PR ouverte |

---

## Tâches en cours

- [x] Remplacer les tirets cadratins du devis PDF par la ponctuation adaptée (`templates/devis-template.html`)
- [x] Mettre CLAUDE.md à jour : le formulaire est une app React dans `client/`, plus `public/index.html`
- [ ] Décider du sort de la puce `content: '—'` de la liste Conditions (`devis-template.html:485`)
