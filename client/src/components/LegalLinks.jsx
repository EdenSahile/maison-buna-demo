import styled from 'styled-components'
import theme from '../theme'

// Ouverts dans un nouvel onglet : une navigation en place perdrait la
// saisie en cours dans le formulaire, qui n'a pas de sauvegarde.
const Links = styled.p`
  font-size: 12px;
  color: ${theme.sandText};
  margin-top: 32px;

  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

// omitConfidentialite : le formulaire renvoie déjà vers la politique juste
// avant le bouton d'envoi (ConsentNote, dans DevisForm) — la répéter ici
// juste en dessous ferait doublon sur le même écran.
export default function LegalLinks({ omitConfidentialite = false }) {
  return (
    <Links>
      {!omitConfidentialite && (
        <>
          <a href="/confidentialite" target="_blank" rel="noreferrer">Politique de confidentialité</a>
          {' · '}
        </>
      )}
      <a href="/mentions-legales" target="_blank" rel="noreferrer">Mentions légales</a>
    </Links>
  )
}
