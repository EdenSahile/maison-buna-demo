import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import theme from "../theme";
import logoImg from "../assets/monogram-mb.png";
import ceremonieImg from "../assets/ceremonie-cafe-maison-buna-ethiopie.JPG";

const Brand = styled.aside`
  background: ${theme.white};
  color: ${theme.dark};
  border-right: 1px solid ${theme.line};
  position: sticky;
  top: 35px;
  align-self: start;
  height: calc(100vh - 35px);
  overflow-y: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1024px) {
    position: relative;
    top: auto;
    height: auto;
    overflow-y: visible;
    border-right: none;
    border-bottom: 1px solid ${theme.line};
  }
`;

const BrandInner = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px 36px 36px;

  @media (max-width: 1024px) {
    padding: 14px 18px 14px;
  }
`;

const BrandHead = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: space-between;
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
`;

const BrandHeadLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const BrandDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${theme.accent};
  flex-shrink: 0;
`;

const Monogram = styled.div`
  width: 55px;
  height: 55px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid ${theme.line};
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

const BrandName = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const BrandNameMain = styled.span`
  font-family: "Crimson Pro", Georgia, serif;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${theme.dark};
  line-height: 1.3;
`;

const BrandNameSub = styled.span`
  font-family: "Open Sans", system-ui, sans-serif;
  font-style: italic;
  font-size: 14px;
  color: ${theme.sandText};
  letter-spacing: 0.3px;
`;

const BrandBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 36px;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const BrandEyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${theme.accentText};
  margin-bottom: 18px;

  &::before {
    content: "";
    width: 22px;
    height: 1.5px;
    background: ${theme.accent};
    border-radius: 2px;
    flex-shrink: 0;
  }
`;

const BrandHeadline = styled.h2`
  font-family: "Crimson Pro", Georgia, serif;
  font-weight: 300;
  font-size: 42px;
  line-height: 1.1;
  color: ${theme.dark};
  margin-bottom: 20px;
  letter-spacing: -0.5px;
  margin-top: 5px;

  em {
    font-style: italic;
    color: ${theme.accent};
  }
`;

const BrandSub = styled.p`
  font-family: "Open Sans", system-ui, sans-serif;
  font-size: 20px;
  line-height: 1.65;
  color: ${theme.sandDark};
  max-width: 280px;
  margin-top: 10px;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const Stepper = styled.nav`
  flex-shrink: 0;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const StepperTitle = styled.div`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: ${theme.sandText};
  margin-bottom: 16px;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 4px;
  border-top: 1px solid ${theme.line};
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;

  &:last-child {
    border-bottom: 1px solid ${theme.line};
  }

  &:hover {
    background: rgba(79, 52, 34, 0.05);
    padding-left: 8px;
  }

  &:focus-visible {
    outline: 2px solid ${theme.accent};
    outline-offset: 4px;
  }
`;

const StepDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid ${({ $active }) => ($active ? theme.accent : theme.line)};
  background: ${({ $active }) => ($active ? theme.accent : "transparent")};
  flex-shrink: 0;
  transition: all 0.25s ease;
  box-shadow: ${({ $active }) =>
    $active ? `0 0 0 3px rgba(200,117,58,0.18)` : "none"};
`;

const StepContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
`;

const StepNum = styled.span`
  font-family: "Crimson Pro", Georgia, serif;
  font-size: 16px;
  font-style: italic;
  color: ${({ $active }) => ($active ? theme.accent : theme.sandText)};
  width: 20px;
  text-align: right;
  transition: color 0.25s;
`;

const StepLabel = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active }) => ($active ? theme.dark : theme.sandText)};
  transition: color 0.25s;
`;

const PhotoWrap = styled.div`
  flex-shrink: 0;
  margin: 32px -36px;

  @media (max-width: 1024px) {
    display: none;
  }
`;

const PhotoImg = styled.img`
  width: 100%;
  height: 254px;
  object-fit: cover;
  object-position: center 30%;
  display: block;
`;

const PhotoCaption = styled.p`
  font-family: "Open Sans", system-ui, sans-serif;
  font-size: 10px;
  font-style: italic;
  color: ${theme.sandText};
  margin-top: 10px;
  text-align: center;
`;

const STEPS = [
  { num: "01", id: 1 },
  { num: "02", label: "Vos coordonnées", id: 2 },
  { num: "03", label: "Votre commande", id: 3 },
  { num: "04", label: "Vos précisions", id: 4 },
];

export default function BrandPanel({ audience, onLogoClick }) {
  const [activeSectionId, setActiveSectionId] = useState(1);

  const step1Label =
    audience === "entreprise" ? "Votre entreprise" : "Votre livraison";

  const isProgrammaticScroll = useRef(false);
  const scrollLockTimer = useRef(null);

  useEffect(() => {
    const getActive = () => {
      if (isProgrammaticScroll.current) return;
      if (window.scrollY === 0) {
        setActiveSectionId(1);
        return;
      }
      const atBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 80;
      if (atBottom) {
        setActiveSectionId(STEPS[STEPS.length - 1].id);
        return;
      }
      const trigger = window.innerHeight * 0.4;
      let active = 1;
      for (const { id } of STEPS) {
        const el = document.getElementById(`section-${id}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= trigger) active = id;
      }
      setActiveSectionId(active);
    };

    window.addEventListener("scroll", getActive, { passive: true });
    getActive();
    return () => window.removeEventListener("scroll", getActive);
  }, []);

  const scrollToSection = (id) => {
    isProgrammaticScroll.current = true;
    setActiveSectionId(id);
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    clearTimeout(scrollLockTimer.current);
    scrollLockTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 900);
  };

  return (
    <Brand>
      <BrandInner>
        <BrandHead $clickable={!!onLogoClick} onClick={onLogoClick}>
          <BrandHeadLeft>
            <Monogram>
              <img src={logoImg} alt="Logo Maison Buna" />
            </Monogram>
            <BrandName>
              <BrandNameMain>Maison Buna</BrandNameMain>
              <BrandNameSub>Le berceau du café</BrandNameSub>
            </BrandName>
          </BrandHeadLeft>
          <BrandDot />
        </BrandHead>

        <BrandBody>
          <BrandEyebrow>Demande de devis</BrandEyebrow>
          <BrandHeadline>
            Un café <em>de caractère,</em> chez vous ou au bureau.
          </BrandHeadline>
          <BrandSub>
            Café de spécialité éthiopien, torréfié artisanalement en France.
            Livraison régulière, sans engagement.
          </BrandSub>
        </BrandBody>

        <PhotoWrap>
          <PhotoImg src={ceremonieImg} alt="Cérémonie du café en Éthiopie" />
          <PhotoCaption>Cérémonie du café éthiopien</PhotoCaption>
        </PhotoWrap>

        <Stepper aria-label="Navigation par étapes">
          <StepperTitle>Votre demande</StepperTitle>
          {STEPS.map((step, i) => {
            const isActive = step.id === activeSectionId;
            const label = i === 0 ? step1Label : step.label;
            return (
              <Step
                key={step.id}
                tabIndex={0}
                onClick={() => scrollToSection(step.id)}
                onKeyDown={(e) => e.key === "Enter" && scrollToSection(step.id)}
              >
                <StepDot $active={isActive} />
                <StepContent>
                  <StepNum $active={isActive}>{step.num}</StepNum>
                  <StepLabel $active={isActive}>{label}</StepLabel>
                </StepContent>
              </Step>
            );
          })}
        </Stepper>
      </BrandInner>
    </Brand>
  );
}
