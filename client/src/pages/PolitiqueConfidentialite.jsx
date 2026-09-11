import LegalPageShell from './LegalPageShell'

// Le contenu décrit le traitement réel du code (routes/devis.js,
// data/storage.js, services/mailService.js), pas une politique générique
// copiée-collée. Toute évolution du formulaire ou de la conservation doit se
// répercuter ici. Voir CLAUDE.md, « Conformité RGPD », pour le détail motivé
// des choix (durée de 180 jours, base légale, destinataires).
export default function PolitiqueConfidentialite() {
  return (
    <LegalPageShell title="Politique de confidentialité" misAJour="11 septembre 2026">
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
        <strong>Brevo</strong>, pour l'envoi des deux emails liés à votre
        demande (confirmation et notification interne) : un prestataire
        technique, pas un tiers qui exploite vos données pour son propre
        compte. Et l'<strong>hébergeur</strong> du serveur qui les stocke.
        Aucun autre tiers : ce site ne charge aucun script publicitaire ou de
        mesure d'audience, ne dépose aucun cookie, et ne charge plus aucune
        ressource (police ou autre) depuis un serveur extérieur.
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

      <h2>Vos droits</h2>
      <p>
        Accès, rectification et effacement de vos données : écrivez à{' '}
        <a href="mailto:contact@fictif.com">contact@fictif.com</a>. Votre
        demande sera traitée à la main : cette démo n'a pas le volume qui
        justifierait un outil dédié.
      </p>
    </LegalPageShell>
  )
}
