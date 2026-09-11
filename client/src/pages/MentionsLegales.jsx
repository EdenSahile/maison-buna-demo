import LegalPageShell from './LegalPageShell'

// Identité reprise telle quelle du PDF et des emails (templates/devis-template.html,
// footer légal) : mêmes coordonnées fictives partout dans le dépôt, pas de
// nouvelles données inventées ici. Voir CLAUDE.md, « Conformité RGPD ».
export default function MentionsLegales() {
  return (
    <LegalPageShell title="Mentions légales" misAJour="11 septembre 2026">
      <p>
        Ce site est une <strong>démonstration publique</strong> : les
        coordonnées ci-dessous sont fictives, comme les devis générés par le
        formulaire.
      </p>

      <h2>Éditeur du site</h2>
      <p>
        Maison Buna, Prénom Nom, Entrepreneur individuel<br />
        24 rue de l'adresse, 75015 Paris, France<br />
        SIRET : XXX XXX XXX XXXXX<br />
        TVA non applicable, art. 293 B du CGI<br />
        Contact : <a href="mailto:contact@fictif.com">contact@fictif.com</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>Prénom Nom, en sa qualité d'entrepreneur individuel.</p>

      <h2>Hébergement</h2>
      <p>
        Render, Inc. — <a href="https://render.com" target="_blank" rel="noreferrer">render.com</a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les textes, images et éléments graphiques de ce site sont la
        propriété de Maison Buna ou de ses partenaires, sauf mention
        contraire. Toute reproduction sans autorisation est interdite.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le formulaire de demande de devis recueille des données personnelles.
        Le détail — ce qui est collecté, pour quel usage, combien de temps et
        comment faire valoir vos droits — est dans notre{' '}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>
    </LegalPageShell>
  )
}
