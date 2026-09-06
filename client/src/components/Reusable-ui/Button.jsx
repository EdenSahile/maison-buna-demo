import styled from "styled-components";
import theme from "../../theme";

export const PrimaryButton = styled.button`
  background: ${theme.brown};
  color: ${theme.white};
  border: none;
  padding: 15px 28px;
  font-family: 'Open Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(79,52,34,0.15);
  white-space: nowrap;

  &:hover {
    background: ${theme.dark};
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.1), 0 8px 24px rgba(79,52,34,0.22);
  }
  &:active {
    transform: translateY(0);
  }
  &:focus-visible {
    outline: 2.5px solid ${theme.accent};
    outline-offset: 3px;
    box-shadow: 0 0 0 5px rgba(200,117,58,0.18);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  svg {
    transition: transform 0.25s ease;
  }
  &:hover svg {
    transform: translateX(3px);
  }
`;

export const GhostButton = styled.button`
  background: transparent;
  color: ${theme.brown};
  border: 1px solid ${theme.line};
  padding: 11px 22px;
  font-family: 'Open Sans', sans-serif;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.25s ease;

  &:hover {
    background: ${theme.creamSoft};
    border-color: ${theme.sand};
  }
  &:focus-visible {
    outline: 2.5px solid ${theme.accent};
    outline-offset: 3px;
    box-shadow: 0 0 0 5px rgba(200,117,58,0.18);
  }
`;
