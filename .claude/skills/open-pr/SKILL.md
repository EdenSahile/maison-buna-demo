---
name: open-pr
description: Amène le travail terminé jusqu'à la Pull Request, sans merger. Passe un verrou de qualité bloquant (build client + tests + syntaxe serveur), pousse la branche, ouvre la PR vers main, et s'arrête là. Ne merge jamais. Utiliser quand l'utilisateur dit "ouvre la PR", "open pr", "envoie en review", "c'est fini, on pousse", "Ouvre PR", "PR", ou son raccourci personnel "p".
---

## Entrée

- La **branche courante**, considérée comme terminée par l'utilisateur : travail commité, pas encore poussé.

## Sortie

- L'**URL de la PR** ouverte vers `main`.

Le skill s'arrête là. Il ne merge pas — le merge sur `main` reste une décision explicite de l'utilisateur, prise séparément, pour cette PR précise.

---

## Étapes

1. **Vérifier le point de départ.** `git status` et `git branch --show-current`. S'il reste des changements non commités, le signaler et demander — ne pas commiter à la place de l'utilisateur. Si la branche courante est `main`, s'arrêter : il n'y a pas de PR à ouvrir depuis `main`.

2. **Passer le verrou** (dans cet ordre, chacun bloquant) :

```bash
   cd client && npm run build    # build Vite — le projet est en JavaScript pur, pas de typecheck TypeScript
   npm run test:server           # Vitest racine — tests serveur (Puppeteer réel, ~5 s)
   npm test                      # → client, vitest run
   node --check server.js && node --check routes/devis.js && \
     node --check services/pdfService.js && node --check services/mailService.js && \
     node --check data/storage.js && node --check middleware/errorHandler.js && \
     node --check services/limiteConcurrence.js
```

   Raccourci : `npm run test:all` enchaîne les deux suites de tests.
   Ce verrou est la **source de vérité sur l'état des tests** : il n'y a pas d'agent testeur, aucun rapport d'agent ne le remplace.
   ⚠️ Il couvre sept fichiers serveur, le job `Tests` de la CI n'en vérifie que cinq — `middleware/errorHandler.js` et `services/limiteConcurrence.js`, ajoutés par la PR #19, manquent à `.github/workflows/claude-pr-review.yml:45-49`. À aligner dans une PR dédiée : toucher au workflow bloque la review automatique de la PR qui le modifie.

3. **Mettre à jour `CONTEXT.MD`.** Règle absolue n°7 du `CLAUDE.md` : cocher `[x]` les tâches accomplies et rafraîchir le tableau « État du build ». Commiter cette mise à jour avec le reste avant de pousser.

4. **Pousser.** `git push -u origin <branche>`.

5. **Ouvrir la PR.** `gh pr create --base main --head <branche>`, titre clair et corps dérivé des commits de la branche. Afficher l'URL.

---

## Règles

### Le verrou

- **Le verrou est bloquant.** Au premier rouge : on s'arrête, on montre la sortie réelle de la commande, et **rien n'est poussé**. Ne jamais contourner un test qui échoue ni le désactiver pour pouvoir pousser.

- **Utiliser `cd client && npm run build`, pas `npm run build` à la racine.** Le script racine est `npx puppeteer browsers install chrome && cd client && npm install && npm run build` : il télécharge Chrome (~150 Mo) à chaque appel. C'est une étape de déploiement Render, pas un contrôle de qualité du code — elle ne valide rien et ralentit le verrou de plusieurs minutes.

- **Toujours inclure le `node --check` du serveur.** Contrairement au client, le code Node ESM (`server.js`, `routes/`, `services/`) n'a **aucune étape de build** : une erreur de syntaxe y passe le verrou sans être vue et ne casse qu'au démarrage sur Render. C'est le seul filet côté serveur.

- **Le lint ne fait pas partie du verrou.** `client/eslint.config.js` existe et `cd client && npm run lint` fonctionne, mais sort **rouge sur ~10 erreurs préexistantes**, réparties entre `client/src/playground/compo-reu/Field.jsx`, `client/src/components/Reusable-ui/Field.jsx`, `client/src/components/DevisForm.jsx` et `client/src/components/SectionPrecisions.jsx`. L'ajouter au verrou bloquerait toutes les PR dès la première. Nettoyer ces erreurs = une PR dédiée ; ce n'est pas une hypothèse à faire ici.

### Le périmètre

- **⛔ Ne jamais merger.** Ouvrir la PR ne vaut pas autorisation de merger.

- **Ne jamais ouvrir de PR sans invocation explicite de ce skill.** L'utilisateur donne le feu vert en déclenchant le skill (raccourci « p », « Ouvre PR » ou phrase équivalente, cf. description) — c'est cette invocation elle-même qui vaut autorisation, jamais une initiative prise seule en cours de session.

- **Un seul repo à la fois** : celui de la branche courante. ⚠️ **Deux repos coexistent légitimement pour ce projet** — ne pas les confondre :

  | Repo GitHub | Rôle | Dossier local |
  |---|---|---|
  | `EdenSahile/maison-buna` | **démo** — infos fictives, bandeau DÉMO (ce dossier) | `.../Documents/Claude/maison-buna-demo/maison-buna-devis-demo` |
  | `EdenSahile/maison-buna-prod` | **prod** — vraies coordonnées Maison Buna | `.../MaisonBuna/site/maison-buna-devis` |

  Vérifier `git remote -v` avant de pousser : `origin` doit pointer vers `maison-buna` (démo), jamais vers `maison-buna-prod`.

  Les corrections communes **viennent de prod vers démo** par **cherry-pick manuel** (le remote `prod` peut être ajouté en fetch-only pour ça), jamais par une PR ouverte depuis ce dossier vers le repo prod. Dans l'autre sens, une évolution propre à démo (bandeau DÉMO, données fictives) ne doit jamais être cherry-pickée vers prod.

### La CI

Le repo a une CI : `.github/workflows/claude-pr-review.yml`, déclenchée sur chaque `pull_request`.

| Job | Ce qu'il vérifie |
|---|---|
| **Tests** | `npm ci`, `node --check` sur les 5 fichiers serveur, `npx vitest run` (tests serveur, Puppeteer réel avec Chrome mis en cache), `npm ci && npm test` côté client, puis `npm run build` client |
| **Claude review** | `needs: [test]` — lit le diff, applique les règles absolues du `CLAUDE.md` (les 7 générales **+ la règle 8, spécifique à ce repo démo** : jamais de vraies coordonnées Maison Buna — vrai SIRET, vraie adresse, vrai nom, vrai domaine — et jamais de suppression du bandeau DÉMO), classe en Critical / Important / Minor, puis soumet `gh pr review --approve` ou `--request-changes` |

Le verrou local de l'étape 2 reproduit le job `Tests` à l'identique : il reste bloquant, pour ne pas découvrir en CI ce qui se voyait en 5 secondes en local.

⚠️ **Piège de la première PR.** `claude-code-action` refuse de s'exécuter tant que le fichier `.github/workflows/claude-pr-review.yml` de la branche diffère de celui de `main` — protection anti-triche. Le job **apparaît vert sans qu'aucune review n'ait été postée**. Toute PR qui touche à ce fichier doit donc être mergée manuellement (bypass admin), et la PR qui introduit la CI ne recevra jamais sa propre review. Vérifier avec `gh pr view <n> --json reviewDecision` plutôt que de se fier à la couleur du job.

⚠️ **Un auteur ne peut pas approuver sa propre PR** — restriction GitHub native, même en tant que propriétaire du repo. Seul le compte du bot Claude peut approuver.

- **Déploiement Render démo : à vérifier au cas par cas, ne rien supposer.** L'instance Render démo (`maison-buna.onrender.com`) a été supprimée temporairement (à recréer plus tard) — tant qu'elle n'existe pas, un merge sur `main` ne déploie nulle part. Une fois recréée, vérifier explicitement dans le dashboard Render si l'auto-deploy est activé ou non avant d'affirmer quoi que ce soit dans un rapport à l'utilisateur : contrairement à prod (auto-deploy désactivé, déploiement manuel explicite), le réglage de démo n'a pas été confirmé et peut différer.

### Le rapport

- **Rapporter l'état réel.** Si une étape échoue (push refusé, `gh` non authentifié, build cassé), le dire franchement avec l'erreur — ne pas prétendre que c'est fait.

- **Ne jamais committer `.env`** (règle absolue n°1 du `CLAUDE.md`). Vérifier que `git status` ne le fait pas apparaître avant de pousser.