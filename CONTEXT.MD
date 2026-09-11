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
| Tests client (`npm test`) | ✅ 38/38 (2026-09-11) |
| Tests serveur (`npm run test:server`) | ✅ 211/211 (2026-09-11) |

---

## Branches actives

| Branche | Objet | État |
|---------|-------|------|
| `main` | branche principale | active |
| `chore/reports-local-agents` | convention reports/local/ pour les 4 agents | mergée (PR #15) |
| `chore/demo-safety` | mention DÉMO sur le PDF, retrait des coordonnées réelles | mergée (PR #16) |
| `fix/devis-validation` | validation stricte des entrées du devis | mergée (PR #17) |
| `docs/context-backlog` | remise à jour de CONTEXT.MD et backlog | mergée (PR #18) |
| `fix/server-hardening` | statut d'erreur relayé, concurrence PDF bornée | mergée (PR #19) |
| `docs/pipeline-testeur` | suppression de l'étape Testeur | mergée (PR #20) |
| `fix/file-attente-plafond` | saturation convertie en attente, plus en échec | mergée (PR #21) |
| `chore/ci-config` | contrôle de syntaxe unifié, trust proxy configurable | mergée (PR #22) |
| `docs/charte-polices` | charte alignée sur Crimson Pro + Open Sans | mergée (PR #23) |
| `docs/claude-md` | CLAUDE.MD remis au niveau du code | mergée (PR #24) |
| `feat/devis-etat` | champ d'état, arrêt propre et balayage au démarrage | mergée (PR #25) |
| `docs/politique-agents` | plus d'audit local sans demande | mergée (PR #26) |
| `fix/backlog-priorite-3` | lot de petites corrections du backlog | mergée (PR #27) |
| `fix/storage-plafonds` | archivage du fichier vif, envoi d'emails borné | mergée (PR #31) |
| `fix/puce-conditions` | gouttière de la puce des Conditions du PDF | mergée (PR #32) |
| `fix/polices-locales` | polices du formulaire servies par l'app, plus par Google | mergée (PR #33) |
| `docs/playground-backlog` | retrait du playground du backlog (jamais committé) | mergée (PR #34) |
| `feat/convergence-palette` | convergence des trois palettes sur `theme.js` | mergée (PR #35) |
| `chore/scan-arbre-ci` | scan de l'arbre complet en CI contre les coordonnées réelles | mergée (PR #36) |
| `fix/tiret-footer-email` | tirets cadratins oubliés dans le corps des deux emails | mergée (PR #38) |
| `feat/rgpd-conformite` | mentions légales, politique de confidentialité, purge de rétention | mergée (PR #37) |
| `fix/field-couleurs-hors-theme` | deux couleurs hors `theme.js` dans `Field.jsx` | en cours |

---

## Tâches en cours

- [x] Remplacer les tirets cadratins du devis PDF par la ponctuation adaptée (`templates/devis-template.html`)
- [x] Mettre CLAUDE.md à jour : le formulaire est une app React dans `client/`, plus `public/index.html`
- [x] Puce `content: '—'` de la liste Conditions gardée : c'est un marqueur de liste, pas de la ponctuation, et le tiret est le marqueur de liste de la typographie française — c'est pourquoi il a survécu au remplacement des tirets cadratins du texte (PR #13). Le vrai défaut était la gouttière : 12 px pour un tiret cadratin large de 10 px à 7,5 pt, soit 2 px entre le tiret et le texte, qui se lisaient « —Ce devis ». Passée à 16 px. Décision du 11/09/2026, prise sur le rendu.
- [x] Trois tirets cadratins oubliés par la PR #13, repérés dans le corps visible des deux emails (pas les `<title>` ni le préheader caché, invisibles à l'ouverture) : le pied de page légal de l'email client (« Prénom Nom — Entrepreneur individuel »), et deux messages de statut PDF dans l'email admin. Remplacés par une virgule (nom + qualité, comme dans le PDF) et deux-points (statut : conséquence). Décision du 11/09/2026.
- [x] Ajouter la mention DÉMO au PDF, comme dans les deux emails (`chore/demo-safety`)
- [x] Retirer les coordonnées réelles du client de `ux-designer.md` et du workflow de review
- [x] Trancher l'écart de polices : la charte officielle devient **Crimson Pro + Open Sans**, Cormorant Garamond et Jost sont abandonnés (jamais implémentés). Décision du 07/09/2026.
- [x] Valider strictement les entrées du devis : référentiels café et quantité, typage, longueurs maximales (PR #17)
- [x] Échapper le HTML de l'alerte admin `sendPdfFailureAlert` (PR #17)
- [x] Ne plus persister `quantiteParCafe` brut, seulement les cafés retenus (PR #17)
- [x] Charte alignée sur Crimson Pro + Open Sans : documentation corrigée à cinq endroits, et les deux emails passent de DM Sans + DM Serif Display à la charte. `templates/devis-template.html` non touché, ses polices étant intégrées en base64.

### Priorité 1 — durcissement serveur (`fix/server-hardening`)

- [x] `server.js:38-42` : statut porté par l'erreur relayé quand il est entre 400 et 499, message de réponse toujours générique. Handler extrait dans `middleware/errorHandler.js` pour être testable. Audité le 09/09/2026.
- [x] `services/pdfService.js` : concurrence bornée à 2, file d'attente de 10, timeout de 45 s par génération, refus immédiat au-delà de la file. Limite choisie sur mesure : ~100 Mo par instance Chromium concurrente, ~500 ms par génération. Audité le 09/09/2026.
- [x] `routes/devis.js` traitait `FileSatureeError` comme une panne ordinaire. La saturation est convertie en attente : plafond de 300 s en file, rejet seulement au-delà. Décision du 10/09/2026.
- [x] Règle absolue n°4 tenue sur le chemin d'abandon : le client reçoit son email même sans PDF, et les templates annoncent la pièce jointe d'après sa présence réelle et non d'après `sur_devis`.
- [x] Champ `etat` dans `data/devis.json`, cinq valeurs définies dans `ETATS`, plus `etat_maj` et `etat_erreur`. SIGTERM et SIGINT marquent « interrompu » tout ce qui était en cours avant de fermer le serveur. Les demandes à relancer à la main sont désormais retrouvables.
- [x] `trust proxy` est réglable par `TRUST_PROXY`, valeur par défaut 1, via le lecteur d'environnement extrait dans `config/env.js`.
- [x] `data/storage.js` archive au-delà de `DEVIS_MAX` (1000 par défaut) : les demandes dont le traitement est terminé partent dans `data/devis.json.archive-<horodatage>`, jamais relu, et le coût de chaque cycle lecture/écriture cesse de croître. Une demande `en_cours` ou `envoi_en_cours` n'est jamais archivée, sinon le balayage au démarrage ne la retrouverait plus. L'envoi des emails est borné à `MAIL_MAX_CONCURRENT` (4) par le limiteur déjà utilisé pour les PDF : un email = une connexion SMTP. Le limiteur fait patienter, il ne refuse pas — la règle absolue n°4 tient. Décision du 11/09/2026. Cette tâche était inscrite deux fois, le doublon de priorité 3 est retiré.

### Priorité 2 — documentation périmée (`docs/claude-md`)

- [x] Contrôle de syntaxe unifié : `npm run check:syntax` parcourt l'arborescence au lieu d'énumérer des fichiers. La CI, la skill `open-pr` et les définitions d'agents appellent tous ce script. Vérifié qu'il attrape une faute dans `middleware/errorHandler.js` et `services/limiteConcurrence.js`.

- [x] `CLAUDE.MD` annonçait Express 4, `package.json` déclare Express 5. Corrigé, avec Helmet, express-rate-limit et Vitest ajoutés à la section Stack.
- [x] La section « Commandes utiles » liste les treize scripts, avec l'avertissement sur `mail:test` qui envoie de vrais emails, et le rappel que `npm run dev` ne sert pas le formulaire. Les variables d'environnement et l'arborescence sont également remises à jour.

### Priorité 3 — à joindre à la PR de charte ci-dessus

- [x] `envoi_en_cours` lève l'ambiguïté : un arrêt avant l'envoi donne `interrompu` (le client n'a rien reçu, c'est certain), un arrêt pendant donne `interrompu_pendant_envoi` (à vérifier avant de relancer). Le bilan de l'arrêt distingue les deux dans son message.

- [x] Plus aucune ressource distante dans les emails : l'`@import` vers Google Fonts est retiré, les piles de repli suffisent. L'intégration en base64 envisagée au départ était impraticable — les blocs du PDF pèsent 1410 Ko pour une limite Gmail de 102 Ko, et les clients de messagerie ignorent `@font-face`. Un test vérifie qu'aucune ressource distante ne réapparaît.

- [x] Tous les domaines d'exemple passent à `example.com`, seul domaine réservé par la RFC 2606 parmi ceux employés : `.env.example`, les fixtures de test et les scripts PDF.

- [x] Tirets cadratins des deux bandeaux DÉMO alignés sur la ponctuation du PDF.
- [x] `README.md` ne mentionne plus `public/index.html` : c'était le dernier endroit désynchronisé.
- [x] Fixtures migrées vers `example.com`. Les `fictif.com` des templates et du PDF restent : ce sont les coordonnées affichées de la démo, pas des valeurs de test.
- [x] Sélecteur `.recap-value .empty` corrigé : « Non renseigné » est de nouveau italique et gris.
- [x] Les doublons sont testés avant la longueur : le message nomme la vraie cause.
- [x] Chemins locaux retirés de la skill `open-pr`, et le nom du dépôt démo corrigé au passage : la table annonçait `maison-buna`, le remote est `maison-buna-demo`.
- [x] Audit des couleurs fait le 11/09/2026, et le piège était réel : `#FAF7F3` n'apparaît nulle part, `#AB9679` une seule fois. `client/src/theme.js` devient la source de vérité — 14 rôles nommés avec contrastes vérifiés. Trois palettes coexistent (app, PDF, emails), documentées comme telles.
- [x] Convergence des trois palettes sur `theme.js`, décidée avec l'utilisateur le 11/09/2026 (unifier, avec accent dans les emails). Le PDF n'avait que 2 valeurs à corriger (`#F0E8DB`→`creamSoft`, `#AB9679`→`sand`, cette dernière une dérive isolée). Les emails ont demandé une table de correspondance par rôle (11 couleurs remplacées) et un premier accent — la barre des blocs de mise en avant, `#C8753A`, là où ils retombaient auparavant sur le ton des labels. `#C2B5A5` (email admin, un seul usage) disparaît avec la même dérive. Le bandeau DÉMO (`#2e2010`/`#D3C2AC`) reste hors charte, volontairement. `services/palette.test.js` verrouille le résultat : 4 tests, vérifiés par mutation. Vérifié visuellement sur les trois documents rendus avant/après.

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

- [x] Google Fonts retiré de `client/index.html` : même question RGPD que les emails, mais sur une page qu'on visite. Crimson Pro et Open Sans sont maintenant servies par l'application — huit `.woff2` dans `client/src/assets/fonts/`, déclarés par `client/src/styles/fonts.css`, licence OFL embarquée. Vérifié dans un vrai navigateur : aucune requête hors de l'application, quatre fichiers téléchargés sur huit grâce à `unicode-range`, les quatre faces appliquées. Décision du 11/09/2026.
- [x] `client/src/playground/` supprimé. Il était listé dans `client/.gitignore` (`src/playground/`), donc jamais committé et sans impact sur l'app livrée : Google Fonts et des polices abandonnées (Cormorant Garamond, Inter) y restaient, mais ne sortaient jamais du poste local. Décision du 11/09/2026.

### Priorité 4 — idée de fond, sans urgence

- [x] Scan de l'arbre complet ajouté en complément de la revue de diff : `scripts/check-coordonnees.js` (`npm run check:coordonnees`), lancé par la CI avant même `npm ci`, et bloquant dans le verrou local. Trois motifs : email hors liste blanche, numéro à 14 chiffres en forme de SIRET, domaine réel de la marque — construit en deux morceaux dans le script pour ne pas se signaler lui-même. Vérifié par mutation sur les trois motifs (les trois tombent), et sur le cas historique exact : un mot nu dans une phrase, sans email ni lien, comme la fuite de la PR #16. Fichiers utilisés (`git ls-files --cached --others --exclude-standard`), pas un parcours de dossiers : un run local voit exactement ce que voit la CI, `.env` et `data/devis.json` inclus. Deux petites dérives trouvées et corrigées au passage pour que le scan parte propre sur `main` : le placeholder `SMTP_USER` documenté dans `CLAUDE.md` avait un domaine hors liste blanche, incohérent avec `.env.example` ; deux fixtures de `formUtils.test.js` avaient elles aussi un domaine hors convention. `.claude/skills/open-pr/SKILL.md` et la règle 6 du prompt de review CI corrigés au passage : l'un annonçait encore ~10 erreurs ESLint sur 4 fichiers (3 sur 1 seul, en réalité, depuis la suppression du playground), l'autre les « trois palettes qui coexistent », périmé depuis la convergence de la PR #35. Décision du 11/09/2026.
- [x] `client/src/components/Reusable-ui/Field.jsx` avait deux couleurs hors `theme.js` (fond de champ invalide, placeholder), repérées en cartographiant les palettes le 11/09/2026 — une dérive interne à l'app, indépendante de la convergence PDF/emails. Le fond invalide dérive désormais de `theme.error` (teinte à 10 % d'opacité, `${theme.error}1A`) plutôt qu'une valeur à part ; le placeholder réutilise `theme.sandText`, comme les autres textes discrets du fichier (`Opt`, `Hint`). `Field.test.js` verrouille le résultat : aucune couleur en dur dans le fichier, seulement des tokens de `theme.js`. 3 tests, vérifiés par mutation. Décision du 11/09/2026.
- [x] `scripts/test-mail.js` n'avait pas d'option `--dry-run` et ignorait silencieusement tout argument inconnu : lancé avec un flag qui n'existe pas, il envoyait quand même de vrais emails via Brevo sans le signaler. Repéré le 11/09/2026 en essayant justement `--dry-run` pour visualiser un rendu HTML sans envoi — deux emails étaient partis pour rien. `verifierArguments()` refuse maintenant tout argument (le script n'a pas de mode simulation) avant même de lancer la génération du PDF ou l'envoi. 3 tests (`scripts/test-mail.test.js`), vérifiés par mutation. Décision du 11/09/2026 : pas d'ajout de mode `--dry-run`, seulement le refus de ce qui n'est pas reconnu, comme demandé.
- [x] `client/src/components/Reusable-ui/Field.jsx` sortait rouge sur 3 erreurs ESLint `react-refresh/only-export-components` : le fichier exportait à la fois le composant `Field` (défaut) et les styled-components `StyledInput`/`StyledSelect`/`StyledTextarea` (nommés), ce que ce plugin refuse. Styled-components et fonction `baseInputStyles` déplacés dans un nouveau fichier `Field.styles.js` ; `Field.jsx` ne garde que le composant. Les trois fichiers qui importaient `StyledInput`/`StyledSelect`/`StyledTextarea` depuis `Field.jsx` (`SectionContact.jsx`, `SectionProfil.jsx`, `SectionPrecisions.jsx`) pointent maintenant vers `Field.styles.js`. `Field.test.js` (couleurs hors `theme.js`) retargeté sur `Field.styles.js`, où les couleurs vivent désormais réellement. `cd client && npm run lint` : 0 erreur. Décision du 11/09/2026, repéré en préparant la publication du projet sur les réseaux sociaux.

### Conformité RGPD (`feat/rgpd-conformite`)

- [x] Le formulaire recueille de vraies données personnelles (même si les devis générés sont fictifs) : analyse complète faite le 11/09/2026 avant tout code — ce qui est collecté, base légale, destinataires, durée. Voir `CLAUDE.md`, « Conformité RGPD », pour le détail motivé.
- [x] Durée de conservation tranchée avec l'utilisateur : 180 jours à compter de la soumission (30 jours de validité du devis + marge pour une relance), pas les 3 ans habituels de la prospection commerciale — ce n'en est pas, la finalité est de traiter cette demande précise, pas de garder un fichier de prospects.
- [x] `data/storage.js` (`purgerAnciennes`) : supprime les demandes de plus de `DEVIS_RETENTION_JOURS` jours (180 par défaut), fichier vif et archives compris, sans exception d'état — passé le délai, même une demande restée bloquée `en_cours` n'a plus de raison de garder ses données. Un timestamp illisible est gardé, jamais supprimé par erreur. Appelée au démarrage puis une fois par jour (`server.js`). 14 tests, vérifiés par mutation.
- [x] `client/src/pages/PolitiqueConfidentialite.jsx` et `MentionsLegales.jsx`, aux routes `/confidentialite` et `/mentions-legales` — pas de bibliothèque de routage, `App.jsx` lit `window.location.pathname` (la catch-all de `server.js` et le comportement SPA par défaut de Vite couvrent les deux en dev comme en prod). Identité reprise telle quelle du PDF et des emails, aucune nouvelle coordonnée inventée.
- [x] Liens visibles depuis le formulaire (pied de page, après le bouton d'envoi) et l'écran de confirmation, dans un nouvel onglet pour ne pas perdre la saisie en cours. Une phrase de renvoi vers la politique juste avant le bouton d'envoi.
- [x] Balayage des tirets cadratins sur tout ce qui est visible d'un visiteur (app React, `client/index.html`), demandé par l'utilisateur après le correctif des emails. 8 trouvés dans le contenu écrit pour cette tâche, plus 2 préexistants hors de mon travail (bandeau démo de `App.jsx`, signature de `SuccessView.jsx`), tous corrigés par virgule, deux-points ou parenthèses selon le cas. Ce qui reste avec un tiret n'est jamais rendu : deux commentaires de code (`client/index.html`, `CoffeeGrid.jsx`) et la puce CSS des Conditions du PDF, gardée intentionnellement (voir plus haut). Décision du 11/09/2026.
- [x] Doublon visuel corrigé : « Politique de confidentialité » apparaissait deux fois côte à côte sur le formulaire (phrase de consentement avant le bouton, puis pied de page juste en dessous). `LegalLinks` accepte désormais `omitConfidentialite`, utilisé par le formulaire — l'écran de confirmation garde les deux liens, il n'a pas de phrase de consentement. Repéré par l'utilisateur le 11/09/2026.
- [x] La phrase de consentement coupait « politique de confidentialité » sur deux lignes, un mot orphelin isolé : elle partageait la colonne de 400 px de `SubmitNote`, trop étroite pour elle. Skill `frontend-design` invoqué à la demande de l'utilisateur. Diagnostic : deux textes de rôles différents (accroche commerciale courte, mention légale plus longue) n'ont pas à partager la même largeur de colonne. Sortie de `SubmitArea` vers un bloc `LegalFooter` pleine largeur, regroupée avec `Mentions légales` juste en dessous (`LegalLinks` accepte maintenant `marginTop`, resserré à 6 px ici contre 32 par défaut, pour que les deux lignes se lisent comme un seul bloc). Vérifié sur rendu réel. Décision du 11/09/2026.
- [x] `contact@fictif.com` ne va nulle part : une vraie demande d'accès/rectification/effacement y resterait sans réponse, un vrai problème pour un vrai visiteur (relevé par l'utilisateur). La section « Vos droits » de la politique de confidentialité utilise désormais une vraie adresse, différente du contact affiché ailleurs sur le site, pour ce seul usage — choix de l'utilisateur, pas une décision prise à sa place. `scripts/check-coordonnees.js` la connaît explicitement (`EMAILS_AUTORISES`, exception à l'adresse exacte, pas au domaine gmail.com entier). 1 test ajouté (35 au total côté client), qui vise précisément le bloc `EMAILS_AUTORISES` et pas juste le commentaire au-dessus — le premier essai passait par erreur en lisant le commentaire, corrigé après vérification par mutation. Décision du 11/09/2026.
- [x] 9 tests de contenu (`client/src/pages/legal.test.js`) : durée affichée, destinataires réels et non un tiers publicitaire, contact présent, base légale énoncée, routes câblées des deux côtés. Vérifiés par mutation.
- [x] `.env.example` et `CLAUDE.md` documentent `DEVIS_RETENTION_JOURS`.
