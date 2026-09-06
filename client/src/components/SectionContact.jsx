import styled from 'styled-components'
import SectionHead from './Reusable-ui/SectionHead'
import Field, { StyledInput } from './Reusable-ui/Field'

const Section = styled.section`
  padding-top: 48px;
  margin-bottom: 8px;
  scroll-margin-top: 24px;
`

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 640px) { grid-template-columns: 1fr; }
`

export default function SectionContact({ audience, formData, errors, onChange }) {
  const isEnt = audience === 'entreprise'

  return (
    <Section id="section-2" data-step="2">
      <SectionHead num="02" title="Vos coordonnées" step="Étape 2 / 4" />
      <Grid2>
        <Field id="prenom" label="Prénom" required error={errors.prenom}>
          <StyledInput
            id="prenom"
            type="text"
            value={formData.prenom}
            onChange={e => onChange('prenom', e.target.value)}
            placeholder="Votre prénom"
            autoComplete="given-name"
            $invalid={!!errors.prenom}
          />
        </Field>

        <Field id="nom" label="Nom" required error={errors.nom}>
          <StyledInput
            id="nom"
            type="text"
            value={formData.nom}
            onChange={e => onChange('nom', e.target.value)}
            placeholder="Votre nom"
            autoComplete="family-name"
            $invalid={!!errors.nom}
          />
        </Field>

        <Field
          id="email"
          label={isEnt ? 'Email professionnel' : 'Email'}
          required
          error={errors.email}
        >
          <StyledInput
            id="email"
            type="email"
            value={formData.email}
            onChange={e => onChange('email', e.target.value)}
            placeholder="vous@exemple.fr"
            autoComplete="email"
            $invalid={!!errors.email}
          />
        </Field>

        <Field id="telephone" label="Téléphone" optional>
          <StyledInput
            id="telephone"
            type="tel"
            value={formData.telephone}
            onChange={e => onChange('telephone', e.target.value)}
            placeholder="+33 6 00 00 00 00"
            autoComplete="tel"
          />
        </Field>
      </Grid2>
    </Section>
  )
}
