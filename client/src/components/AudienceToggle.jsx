import styled from "styled-components";
import theme from "../theme";

const Audience = styled.div`
  margin-bottom: 44px;
`;

const AudienceLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${theme.sandText};
  margin-bottom: 10px;
`;

const Toggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid ${theme.line};
  border-radius: 10px;
  overflow: hidden;
  background: ${theme.white};

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;
    background: transparent;
    border: none;
    border-radius: 0;
  }
`;

const AudOpt = styled.button`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: ${({ $active }) => ($active ? theme.creamSoft : "transparent")};
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: left;
  font-family: "Open Sans", inherit;
  color: ${theme.brown};
  position: relative;

  & + & {
    border-left: 1px solid ${theme.line};

    @media (max-width: 640px) {
      border-left: none;
    }
  }

  @media (max-width: 640px) {
    border: 1px solid ${theme.line};
    border-radius: 10px;
  }

  &:hover {
    background: ${theme.creamSoft};
  }

  ${({ $active }) =>
    $active &&
    `
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 16px;
      right: 16px;
      height: 2px;
      background: ${theme.brown};
      border-radius: 2px 2px 0 0;
    }
  `}

  &:focus-visible {
    outline: 2.5px solid ${theme.accent};
    outline-offset: -2px;
  }
`;

const AudIcon = styled.span`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? theme.brown : theme.white)};
  color: ${({ $active }) => ($active ? theme.cream : theme.sandText)};
  border: 1px solid ${({ $active }) => ($active ? theme.brown : theme.line)};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.25s ease;
`;

const AudText = styled.span`
  line-height: 1.3;
`;

const AudTitle = styled.span`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${theme.brown};
`;

const AudSub = styled.span`
  display: block;
  font-size: 12px;
  color: ${theme.sandText};
  margin-top: 1px;
  font-weight: 400;
`;

export default function AudienceToggle({ audience, onChange }) {
  return (
    <Audience>
      <AudienceLabel>Vous commandez pour…</AudienceLabel>
      <Toggle role="radiogroup" aria-label="Vous commandez pour…">
        <AudOpt
          type="button"
          $active={audience === "entreprise"}
          role="radio"
          aria-checked={audience === "entreprise"}
          onClick={() => onChange("entreprise")}
        >
          <AudIcon $active={audience === "entreprise"}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18" />
              <path d="M5 21V8l7-4 7 4v13" />
              <path d="M9 9h.01M13 9h.01M9 13h.01M13 13h.01M9 17h.01M13 17h.01" />
            </svg>
          </AudIcon>
          <AudText>
            <AudTitle>Mon entreprise</AudTitle>
            <AudSub>Bureau, équipe, événements</AudSub>
          </AudText>
        </AudOpt>

        <AudOpt
          type="button"
          $active={audience === "particulier"}
          role="radio"
          aria-checked={audience === "particulier"}
          onClick={() => onChange("particulier")}
        >
          <AudIcon $active={audience === "particulier"}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 11l9-7 9 7" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M10 21v-6h4v6" />
            </svg>
          </AudIcon>
          <AudText>
            <AudTitle>Moi à la maison</AudTitle>
            <AudSub>Livraison à domicile, cadeaux</AudSub>
          </AudText>
        </AudOpt>
      </Toggle>
    </Audience>
  );
}
