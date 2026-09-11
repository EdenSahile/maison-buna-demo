import styled from "styled-components";
import SectionHead from "./Reusable-ui/SectionHead";
import Field from "./Reusable-ui/Field";
import { StyledTextarea } from "./Reusable-ui/Field.styles";

const Section = styled.section`
  padding-top: 48px;
  margin-bottom: 8px;
  scroll-margin-top: 24px;
`;

export default function SectionPrecisions({ formData, onChange }) {
  return (
    <Section id="section-4" data-step="4">
      <SectionHead num="04" title="Vos précisions" step="Étape 4 / 4" />

      <Field id="message" label="Remarque" optional>
        <StyledTextarea
          id="message"
          value={formData.message}
          onChange={(e) => onChange("message", e.target.value)}
          placeholder="Délai, fréquence particulière, remarque de livraison…"
        />
      </Field>
    </Section>
  );
}
