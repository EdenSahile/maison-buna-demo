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

export default function LegalLinks() {
  return (
    <Links>
      <a href="/confidentialite" target="_blank" rel="noreferrer">Politique de confidentialité</a>
      {' · '}
      <a href="/mentions-legales" target="_blank" rel="noreferrer">Mentions légales</a>
    </Links>
  )
}
