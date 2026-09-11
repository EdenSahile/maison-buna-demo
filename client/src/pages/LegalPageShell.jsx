import styled from 'styled-components'
import theme from '../theme'

// Habillage commun aux deux pages légales (mentions, confidentialité) : ni
// l'une ni l'autre n'utilise la mise en page à deux colonnes du formulaire
// (Shell/BrandPanel), ce sont de simples pages de texte, centrées, dans la
// même charte.

const Page = styled.div`
  min-height: 100vh;
  background: ${theme.white};
  padding: 56px 24px 80px;
`

const Column = styled.div`
  max-width: 680px;
  margin: 0 auto;
`

const Back = styled.a`
  display: inline-block;
  font-size: 13px;
  color: ${theme.sandText};
  text-decoration: none;
  margin-bottom: 32px;

  &:hover { color: ${theme.brown}; }
`

const Title = styled.h1`
  font-family: 'Crimson Pro', Georgia, serif;
  font-weight: 300;
  font-size: 36px;
  color: ${theme.brown};
  margin-bottom: 8px;
  letter-spacing: -0.3px;
`

const MisAJour = styled.p`
  font-size: 12px;
  color: ${theme.sandText};
  margin-bottom: 40px;
`

const Prose = styled.div`
  font-size: 15px;
  line-height: 1.7;
  color: ${theme.dark};

  h2 {
    font-family: 'Crimson Pro', Georgia, serif;
    font-weight: 500;
    font-size: 20px;
    color: ${theme.brown};
    margin: 36px 0 12px;
  }

  p, ul { margin-bottom: 14px; }

  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }

  a { color: ${theme.accentText}; }

  strong { color: ${theme.brown}; font-weight: 600; }
`

export default function LegalPageShell({ title, misAJour, children }) {
  return (
    <Page>
      <Column>
        <Back href="/">← Retour au formulaire</Back>
        <Title>{title}</Title>
        {misAJour && <MisAJour>Dernière mise à jour : {misAJour}</MisAJour>}
        <Prose>{children}</Prose>
      </Column>
    </Page>
  )
}
