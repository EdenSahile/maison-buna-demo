import DevisForm from './components/DevisForm'
import MentionsLegales from './pages/MentionsLegales'
import PolitiqueConfidentialite from './pages/PolitiqueConfidentialite'

// Pas de bibliothèque de routage pour deux pages statiques : la catch-all de
// server.js et le comportement SPA par défaut de Vite servent déjà index.html
// pour n'importe quel chemin, il suffit de lire window.location.pathname.
const PAGES = {
  '/mentions-legales': MentionsLegales,
  '/confidentialite': PolitiqueConfidentialite,
}

const demoBanner = {
  position: 'sticky',
  top: 0,
  zIndex: 200,
  background: '#2e2010',
  color: '#ffffff',
  textAlign: 'center',
  padding: '9px 16px',
  fontSize: '11px',
  letterSpacing: '0.6px',
  lineHeight: '1.5',
}

export default function App() {
  const Page = PAGES[window.location.pathname]
  if (Page) return <Page />

  return (
    <>
      <div style={demoBanner}>
        Démo : les devis générés sont fictifs et n'ont aucune valeur commerciale.
      </div>
      <DevisForm />
    </>
  )
}
