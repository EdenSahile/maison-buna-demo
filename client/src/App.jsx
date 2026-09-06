import DevisForm from './components/DevisForm'

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
  return (
    <>
      <div style={demoBanner}>
        Démo — les devis générés sont fictifs et n'ont aucune valeur commerciale.
      </div>
      <DevisForm />
    </>
  )
}
