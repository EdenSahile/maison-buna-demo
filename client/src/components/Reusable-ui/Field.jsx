import styled, { css } from 'styled-components'
import theme from '../../theme'

const Wrapper = styled.div`
  position: relative;
  margin-bottom: 18px;
  ${({ $full }) => $full && 'grid-column: 1 / -1;'}
`

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: ${theme.brown};
  margin-bottom: 7px;
  letter-spacing: 0.1px;
`

const Req = styled.span`
  color: ${theme.accentText};
  margin-left: 1px;
`

const Opt = styled.span`
  color: ${theme.sandText};
  font-weight: 400;
  margin-left: 5px;
  font-size: 11px;
`

const baseInputStyles = css`
  width: 100%;
  background: ${({ $invalid }) => $invalid ? '#FDF5F3' : theme.white};
  border: 1px solid ${({ $invalid }) => $invalid ? theme.error : theme.line};
  border-radius: 6px;
  padding: 13px 15px;
  font-family: 'Open Sans', sans-serif;
  font-size: 14px;
  color: ${theme.dark};
  outline: none;
  transition: all 0.25s ease;
  appearance: none;
  -webkit-appearance: none;

  &::placeholder { color: #8C7460; }
  &:hover { border-color: ${theme.sand}; }
  &:focus {
    border-color: ${theme.brown};
    background-color: ${theme.white};
    box-shadow: 0 0 0 3px rgba(79,52,34,0.08);
  }
`

export const StyledInput = styled.input`
  ${baseInputStyles}
`

export const StyledSelect = styled.select`
  ${baseInputStyles}
  cursor: pointer;
  background-color: ${({ $invalid }) => $invalid ? '#FDF5F3' : theme.white};
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23705540' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  padding-right: 36px;

  &:hover { background-color: ${theme.white}; }
  &:focus { background-color: ${theme.white}; }
`

export const StyledTextarea = styled.textarea`
  ${baseInputStyles}
  resize: vertical;
  min-height: 100px;
  line-height: 1.6;
`

const ErrorMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${theme.error};
  margin-top: 5px;

  &::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${theme.error};
    flex-shrink: 0;
  }
`

const Hint = styled.div`
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 12px;
  color: ${theme.sandText};
  margin-top: 7px;
  font-style: italic;
`

export default function Field({ id, label, required, optional, error, hint, full, children }) {
  return (
    <Wrapper id={id ? `field-${id}` : undefined} $full={full}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <Req> *</Req>}
          {optional && <Opt>facultatif</Opt>}
        </Label>
      )}
      {children}
      {error && <ErrorMsg role="alert" aria-live="assertive">{error}</ErrorMsg>}
      {hint && <Hint>{hint}</Hint>}
    </Wrapper>
  )
}
