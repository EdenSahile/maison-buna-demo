import { useState } from "react";
import styled from "styled-components";
import theme from "../theme";
import BrandPanel from "./BrandPanel";
import AudienceToggle from "./AudienceToggle";
import SectionProfil from "./SectionProfil";
import SectionContact from "./SectionContact";
import SectionCommande from "./SectionCommande";
import SectionPrecisions from "./SectionPrecisions";
import SuccessView from "./SuccessView";
import { PrimaryButton } from "./Reusable-ui/Button";
import {
  validate,
  buildPayload,
  INITIAL_FORM_DATA,
} from "../utils/formUtils";

const Shell = styled.div`
  display: grid;
  grid-template-columns: 380px 1fr;
  min-height: 100vh;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;


const FormArea = styled.main`
  padding: 48px 64px 80px;
  background: ${theme.formBg};

  @media (max-width: 1024px) {
    padding: 32px 28px 60px;
  }
  @media (max-width: 640px) {
    padding: 28px 18px 48px;
  }
`;

const PageTitle = styled.h1`
  font-family: "Crimson Pro", Georgia, serif;
  font-weight: 300;
  font-size: 48px;
  line-height: 1.08;
  color: ${theme.brown};
  margin-bottom: 14px;
  letter-spacing: -0.5px;

  em {
    font-style: italic;
    font-weight: 400;
    color: ${theme.accent};
  }

  @media (max-width: 1024px) {
    font-size: 36px;
  }
  @media (max-width: 640px) {
    font-size: 30px;
  }
`;

const PageIntro = styled.p`
  font-family: "Open Sans", system-ui, sans-serif;
  color: ${theme.sandDark};
  font-size: 14.5px;
  line-height: 1.7;
  max-width: 480px;
  margin-bottom: 44px;
`;

const SubmitArea = styled.div`
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid ${theme.line};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    button {
      justify-content: center;
    }
  }
`;

const SubmitNote = styled.p`
  font-family: "Open Sans", system-ui, sans-serif;
  font-size: 13px;
  color: ${theme.sandDark};
  line-height: 1.6;
  max-width: 400px;

  strong {
    color: ${theme.brown};
    font-weight: 600;
  }
`;

export default function DevisForm() {
  const [audience, setAudience] = useState("entreprise");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [surDevis, setSurDevis] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const e = { ...prev };
        delete e[field];
        return e;
      });
    }
  };

  const handleAudienceChange = (aud) => {
    setAudience(aud);
    setFormData((prev) => ({ ...prev, quantiteParCafe: {} }));
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate(formData, audience);
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = Object.keys(newErrors)[0];
      const domId =
        firstKey === "quantiteParCafe" ? "field-cafes" : `field-${firstKey}`;
      document
        .getElementById(domId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(formData, audience)),
      });
      if (!res.ok)
        throw new Error("Erreur lors de l'envoi. Veuillez réessayer.");
      const hasSurDevis = formData.cafes.some(
        (cafe) => formData.quantiteParCafe[cafe] === "Sur mesure",
      );
      setSurDevis(hasSurDevis);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setAudience("entreprise");
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isEnt = audience === "entreprise";

  if (submitted) {
    return (
      <Shell>
        <BrandPanel
          audience={audience}
          onLogoClick={handleReset}
        />
        <FormArea>
          <SuccessView
            formData={formData}
            audience={audience}
            onReset={handleReset}
            surDevis={surDevis}
          />
        </FormArea>
      </Shell>
    );
  }

  return (
    <Shell>
      <BrandPanel audience={audience} />
      <FormArea>
        <PageTitle>
          Parlons de votre <em>café</em>.
        </PageTitle>
        <PageIntro>
          {isEnt
            ? "Vos besoins, notre expertise. Un devis sur-mesure en quelques minutes."
            : "Quelques détails sur vos goûts et votre adresse, et nous préparons votre première sélection."}
        </PageIntro>

        <AudienceToggle audience={audience} onChange={handleAudienceChange} />

        <form onSubmit={handleSubmit} noValidate>
          <SectionProfil
            audience={audience}
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
          <SectionContact
            audience={audience}
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
          <SectionCommande
            audience={audience}
            formData={formData}
            errors={errors}
            onChange={handleChange}
          />
          <SectionPrecisions
            formData={formData}
            onChange={handleChange}
          />

          <SubmitArea>
            <SubmitNote>
              <strong>Réponse rapide, adaptée à vos besoins</strong>
              <br />
              Devis immédiat ou accompagnement personnalisé sous 48 h pour toute demande sur mesure.
            </SubmitNote>
            <PrimaryButton type="submit" disabled={loading}>
              <span>{loading ? "Envoi en cours…" : "Demander mon devis"}</span>
              {!loading && (
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  <path
                    d="M1 6h13M9 1l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </PrimaryButton>
          </SubmitArea>
        </form>
      </FormArea>
    </Shell>
  );
}
