import styled from 'styled-components'
import theme from '../theme'
import { GhostButton } from './Reusable-ui/Button'

const Wrap = styled.div`
  animation: fadeUp 0.6s cubic-bezier(.4,0,.2,1);

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${theme.creamSoft};
  border: 1px solid ${theme.cream};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  color: ${theme.accent};
`

const Title = styled.h2`
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 400;
  font-size: 42px;
  color: ${theme.brown};
  line-height: 1.1;
  margin-bottom: 16px;

  em { font-style: italic; color: ${theme.accent}; }
`

const Lead = styled.p`
  font-size: 17px;
  color: ${theme.sandDark};
  line-height: 1.6;
  max-width: 480px;
  margin-bottom: 40px;
`

const SummaryBox = styled.div`
  background: ${theme.white};
  border: 1px solid ${theme.line};
  border-radius: 12px;
  overflow: hidden;
  max-width: 560px;
`

const SummaryBoxHead = styled.div`
  padding: 16px 24px;
  background: ${theme.creamSoft};
  border-bottom: 1px solid ${theme.line};
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${theme.sandDark};
  font-weight: 500;
`

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 16px;
  padding: 14px 24px;
  border-bottom: 1px solid ${theme.line};
  font-size: 14px;

  &:last-child { border-bottom: none; }

  dt {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: ${theme.sandText};
    padding-top: 2px;
  }

  dd { color: ${theme.dark}; line-height: 1.5; }
`

const Footer = styled.div`
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid ${theme.line};
  display: flex;
  align-items: center;
  gap: 20px;
`

const Tagline = styled.p`
  font-family: 'Crimson Pro', Georgia, serif;
  font-style: italic;
  color: ${theme.sandText};
  font-size: 15px;
  flex: 1;
`

// Le serveur annonce le délai qu'il s'accorde au maximum pour générer le PDF.
// S'il ne l'a pas transmis, on reste vague plutôt que d'inventer un chiffre.
function delaiLisible(delaiMax) {
  if (!Number.isFinite(delaiMax) || delaiMax <= 0) return "Cela peut prendre quelques minutes."
  if (delaiMax < 60) return `Cela peut prendre jusqu'à ${delaiMax} secondes.`
  const minutes = Math.round(delaiMax / 60)
  return `Cela peut prendre jusqu'à ${minutes} minute${minutes > 1 ? 's' : ''}.`
}

export default function SuccessView({ formData, audience, onReset, surDevis, delaiMax }) {
  const isEnt = audience === 'entreprise'

  const rows = []
  if (isEnt) {
    rows.push(['Société', `${formData.societe}${formData.secteur ? ` · ${formData.secteur}` : ''}`])
    rows.push(['Contact', `${formData.prenom} ${formData.nom}`])
    rows.push(['Email', `${formData.email}${formData.telephone ? ` · ${formData.telephone}` : ''}`])
    rows.push(['Équipe', `${formData.collaborateurs} collaborateurs`])
    if (formData.ville) rows.push(['Livraison', formData.ville])
    formData.cafes.forEach(cafe => rows.push([cafe, formData.quantiteParCafe[cafe]]))
  } else {
    rows.push(['Type', 'Particulier'])
    rows.push(['Contact', `${formData.prenom} ${formData.nom}`])
    rows.push(['Email', `${formData.email}${formData.telephone ? ` · ${formData.telephone}` : ''}`])
    rows.push(['Livraison', `${formData.adresse}, ${formData.codepostal} ${formData.ville}`])
    formData.cafes.forEach(cafe => rows.push([cafe, formData.quantiteParCafe[cafe]]))
  }
  if (formData.frequence) rows.push(['Fréquence', formData.frequence])
  if (formData.moutures.length) rows.push(['Mouture', formData.moutures.join(', ')])
  if (formData.message) rows.push(['Précisions', formData.message])

  return (
    <Wrap>
      <SuccessIcon>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M6 14l5 5L22 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </SuccessIcon>

      <Title>Demande <em>bien reçue.</em></Title>
      <Lead>
        {surDevis
          ? "Notre équipe étudie votre demande et reviendra vers vous sous 48 heures avec une proposition personnalisée."
          : `Votre devis est en cours de génération et vous sera envoyé par email. ${delaiLisible(delaiMax)} Pensez à vérifier vos spams si vous ne le recevez pas.`}
      </Lead>

      <SummaryBox>
        <SummaryBoxHead>Récapitulatif</SummaryBoxHead>
        <dl>
          {rows.map(([key, val], i) => (
            <SummaryRow key={i}>
              <dt>{key}</dt>
              <dd>{val}</dd>
            </SummaryRow>
          ))}
        </dl>
      </SummaryBox>

      <Footer>
        <Tagline>— Maison Buna, le berceau du café.</Tagline>
        <GhostButton type="button" onClick={onReset}>Nouvelle demande</GhostButton>
      </Footer>
    </Wrap>
  )
}
