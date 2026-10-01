import LegalPageShell from './LegalPageShell'

// Le contenu décrit le traitement réel du code (routes/devis.js,
// data/storage.js, services/mailService.js), pas une politique générique
// copiée-collée. Toute évolution du formulaire ou de la conservation doit se
// répercuter ici. Voir CLAUDE.md, « Conformité RGPD », pour le détail motivé
// des choix (durée de 180 jours, base légale, destinataires).
export default function PolitiqueConfidentialite() {
  return (
    <LegalPageShell title="Politique de confidentialité" misAJour="1 octobre 2026">
      <p>
        Ce site est une <strong>démonstration publique</strong> : les devis
        générés sont fictifs. Les données que vous saisissez dans le
        formulaire, elles, sont réellement traitées comme décrit ici.
      </p>

      <h2>Quelles données sont recueillies</h2>
      <p>
        Prénom, nom, email, téléphone, société, secteur, nombre de
        collaborateurs, adresse de livraison pour les particuliers, votre
        message éventuel, et vos choix de café, quantité, fréquence et
        mouture.
      </p>
      <p>
        <strong>Adresse IP.</strong> Lors de chaque soumission, votre adresse
        IP est lue pour limiter le nombre de requêtes et prévenir les abus.
        Elle est conservée temporairement en mémoire vive le temps de ce
        contrôle et n'est pas enregistrée de façon durable.
      </p>

      <h2>Pourquoi</h2>
      <p>
        Uniquement pour traiter votre demande de devis : vous répondre,
        générer le document, et vous recontacter à son sujet si besoin. Ces
        données ne sont ni revendues, ni partagées à des fins publicitaires,
        ni utilisées pour vous recontacter au sujet d'autre chose que cette
        demande précise.
      </p>

      <h2>Base légale</h2>
      <p>
        L'exécution de mesures précontractuelles prises à votre demande
        (RGPD, art. 6.1.b) : traiter la demande que vous avez vous-même
        soumise. Aucun consentement séparé n'est requis pour cet usage précis.
      </p>

      <h2>Qui reçoit ces données</h2>
      <p>
        <strong>Brevo</strong> (France/UE), pour l'envoi des deux emails liés
        à votre demande (confirmation et notification interne) : un
        prestataire technique, pas un tiers qui exploite vos données pour son
        propre compte. Et <strong>Render, Inc.</strong> (États-Unis),
        hébergeur du serveur qui les stocke. Aucun autre tiers : ce site ne
        charge aucun script publicitaire ou de mesure d'audience, et ne
        charge aucune ressource (police ou autre) depuis un serveur extérieur.
      </p>

      <h2>Transferts hors Union européenne</h2>
      <p>
        Render étant établi aux États-Unis, vos données transitent par son
        infrastructure. Ce transfert est encadré par les garanties prévues
        par le RGPD (clauses contractuelles types et/ou adhésion au Data
        Privacy Framework), intégrées aux conditions du prestataire. Brevo
        opère en France et dans l'Union européenne.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        <strong>180 jours</strong> à compter de la soumission du formulaire :
        le devis est valable 30 jours, et ce délai laisse une marge
        raisonnable pour une relance ou une négociation. Passé ce délai, vos
        données sont supprimées de nos serveurs, automatiquement, qu'une
        suite ait été donnée ou non à votre demande. Un email déjà envoyé
        reste dans votre propre messagerie : cette suppression porte sur ce
        que nous conservons de notre côté.
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges avec le site se font en HTTPS. Les identifiants
        d'accès aux services tiers (Brevo) sont conservés côté serveur et ne
        sont jamais exposés au navigateur.
      </p>

      <h2>Cookies et traceurs</h2>
      <p>
        Ce site n'utilise aucun cookie, aucun traceur publicitaire et aucun
        outil de mesure d'audience.
      </p>

      <h2>Mineurs</h2>
      <p>
        Ce service n'est pas destiné aux personnes de moins de 15 ans et ne
        collecte pas sciemment leurs données. En France, 15 ans est le seuil
        en dessous duquel l'accord d'un titulaire de l'autorité parentale
        est requis pour un traitement fondé sur le consentement.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez des droits d'accès, de rectification, d'effacement,
        d'opposition et de limitation prévus aux articles 15 à 22 du RGPD.
        Pour toute demande, écrivez à{' '}
        <a href="mailto:edensahile12@gmail.com">edensahile12@gmail.com</a>.
        Une adresse différente du contact affiché ailleurs sur ce site (fictif,
        propre à la démo) : celle-ci est réelle, tenue par la personne qui
        gère cette démo, pour ce seul usage. Votre demande sera traitée à la
        main : ce site n'a pas le volume qui justifierait un outil dédié.
      </p>

      <h2>Réclamation</h2>
      <p>
        Vous pouvez introduire une réclamation auprès de la CNIL :{' '}
        <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">cnil.fr</a>.
      </p>

      <h2>Évolution de cette politique</h2>
      <p>
        Cette politique de confidentialité peut être amenée à évoluer. Toute
        modification est signalée par la mise à jour de la date figurant en
        haut de cette page.
      </p>
    </LegalPageShell>
  )
}
