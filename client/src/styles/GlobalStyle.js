import { createGlobalStyle } from 'styled-components'
import theme from '../theme'

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }

  body {
    background: ${theme.white};
    color: ${theme.dark};
    font-family: 'Open Sans', system-ui, sans-serif;
    font-weight: 400;
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  @media (max-width: 1024px) {
    input, textarea, select { font-size: 16px !important; }
  }

  :focus-visible {
    outline: 2.5px solid ${theme.brown};
    outline-offset: 3px;
    border-radius: 4px;
  }
`

export default GlobalStyle
