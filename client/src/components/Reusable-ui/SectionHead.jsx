import styled from 'styled-components'
import theme from '../../theme'

const Head = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 28px;
  padding-bottom: 14px;
  border-bottom: 1px solid ${theme.line};
`

const Num = styled.span`
  font-family: 'Crimson Pro', Georgia, serif;
  font-style: italic;
  font-size: 20px;
  color: ${theme.accent};
  line-height: 1;
`

const Title = styled.h2`
  font-family: 'Crimson Pro', Georgia, serif;
  font-weight: 400;
  font-size: 26px;
  color: ${theme.brown};
  letter-spacing: -0.2px;
`

const Meta = styled.span`
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: ${theme.sandText};

  @media (max-width: 640px) { display: none; }
`

export default function SectionHead({ num, title, step }) {
  return (
    <Head>
      <Num>{num}</Num>
      <Title>{title}</Title>
      <Meta>{step}</Meta>
    </Head>
  )
}
