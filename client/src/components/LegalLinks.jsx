import styled from 'styled-components'
import theme from '../theme'

// Ouverts dans un nouvel onglet : une navigation en place perdrait la
// saisie en cours dans le formulaire, qui n'a pas de sauvegarde.
const Links = styled.p`
  font-size: 12px;
  color: ${theme.sandText};
  margin-top: ${({ $marginTop }) => $marginTop}px;

  a {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

// omitConfidentialite : le formulaire renvoie déjà vers la politique juste
// avant le bouton d'envoi (ConsentNote, dans DevisForm) — la répéter ici
// juste en dessous ferait doublon sur le même écran.
//
// marginTop : 32 par défaut (écran de confirmation, où ce pied de page suit
// un bloc visuellement distinct). Le formulaire passe une valeur plus
// petite : ici, ces liens suivent directement ConsentNote, une autre ligne
// de mention légale — les deux doivent se lire comme un seul bloc, pas
// comme deux éléments espacés séparément.
export default function LegalLinks({ omitConfidentialite = false, marginTop = 32 }) {
  return (
    <Links $marginTop={marginTop}>
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
