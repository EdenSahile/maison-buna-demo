import styled from 'styled-components'
import SectionHead from './Reusable-ui/SectionHead'
import Field, { StyledInput, StyledSelect } from './Reusable-ui/Field'

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

export default function SectionProfil({ audience, formData, errors, onChange }) {
  const isEnt = audience === 'entreprise'

  return (
    <Section id="section-1" data-step="1">
      <SectionHead
        num="01"
        title={isEnt ? 'Votre entreprise' : 'Votre livraison'}
        step="Étape 1 / 4"
      />
      <Grid2>
        {isEnt ? (
          <>
            <Field id="societe" label="Société" required error={errors.societe}>
              <StyledInput
                id="societe"
                type="text"
                value={formData.societe}
                onChange={e => onChange('societe', e.target.value)}
                placeholder="Nom de votre société"
                autoComplete="organization"
                $invalid={!!errors.societe}
              />
            </Field>

            <Field id="secteur" label="Secteur" optional>
              <StyledSelect
                id="secteur"
                value={formData.secteur}
                onChange={e => onChange('secteur', e.target.value)}
              >
                <option value="" disabled>Sélectionner un secteur</option>
                <option>Agence / Conseil</option>
                <option>Tech / Startup</option>
                <option>Finance / Juridique</option>
                <option>Santé / Médical</option>
                <option>Commerce / Retail</option>
                <option>Industrie</option>
                <option>Autre</option>
              </StyledSelect>
            </Field>

            <Field id="collaborateurs" label="Nombre de collaborateurs" required error={errors.collaborateurs}>
              <StyledSelect
                id="collaborateurs"
                value={formData.collaborateurs}
                onChange={e => onChange('collaborateurs', e.target.value)}
                $invalid={!!errors.collaborateurs}
              >
                <option value="" disabled>Taille de l'équipe</option>
                <option>1 – 10</option>
                <option>11 – 25</option>
                <option>26 – 50</option>
                <option>51 – 100</option>
                <option>100 – 250</option>
                <option>250+</option>
              </StyledSelect>
            </Field>

            <Field id="ville" label="Ville de livraison" optional>
              <StyledInput
                id="ville"
                type="text"
                value={formData.ville}
                onChange={e => onChange('ville', e.target.value)}
                placeholder="Paris, Lyon, Bordeaux…"
                autoComplete="address-level2"
              />
            </Field>
          </>
        ) : (
          <>
            <Field id="adresse" label="Adresse de livraison" required full error={errors.adresse}>
              <StyledInput
                id="adresse"
                type="text"
                value={formData.adresse}
                onChange={e => onChange('adresse', e.target.value)}
                placeholder="N° et nom de rue"
                autoComplete="street-address"
                $invalid={!!errors.adresse}
              />
            </Field>

            <Field id="codepostal" label="Code postal" required error={errors.codepostal}>
              <StyledInput
                id="codepostal"
                type="text"
                value={formData.codepostal}
                onChange={e => onChange('codepostal', e.target.value)}
                placeholder="75001"
                autoComplete="postal-code"
                inputMode="numeric"
                maxLength={5}
                $invalid={!!errors.codepostal}
              />
            </Field>

            <Field id="ville" label="Ville" required error={errors.ville}>
              <StyledInput
                id="ville"
                type="text"
                value={formData.ville}
                onChange={e => onChange('ville', e.target.value)}
                placeholder="Paris, Lyon, Bordeaux…"
                autoComplete="address-level2"
                $invalid={!!errors.ville}
              />
            </Field>
          </>
        )}
      </Grid2>
    </Section>
  )
}
