import { Wrapper, Label, Req, Opt, ErrorMsg, Hint } from './Field.styles'

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
