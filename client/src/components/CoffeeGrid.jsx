import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import theme from '../theme'
import limmuImg from '../assets/LIMMU.png'
import sidamoImg from '../assets/SIDAMO.png'
import yirgImg from '../assets/yirgacheffe.png'

const CAFES = [
  { value: 'Limmu',       name: 'Limmu',       region: 'Région Limmu',       notes: 'Épicé, boisé, chocolat noir', img: limmuImg  },
  { value: 'Sidamo',      name: 'Sidamo',       region: 'Région Sidama',      notes: 'Fruité, myrtille, caramel',   img: sidamoImg },
  { value: 'Yirgacheffe', name: 'Yirgacheffe',  region: 'Région Yirgacheffe', notes: 'Floral, agrumes, jasmin',     img: yirgImg   },
]

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 960px;
  margin: 0 auto;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.div`
  position: relative;
  border: 1px solid ${({ $checked }) => $checked ? theme.brown : theme.line};
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.25s, box-shadow 0.25s;
  background: ${theme.white};
  box-shadow: ${({ $checked }) =>
    $checked ? `0 0 0 1px ${theme.brown}, 0 4px 20px rgba(79,52,34,0.10)` : 'none'};

  &:hover {
    border-color: ${theme.sand};
    box-shadow: 0 4px 20px rgba(79,52,34,0.08);
  }
`

const PhotoWrapper = styled.div`
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;

  &:hover img {
    transform: scale(1.04);
  }

  &:hover::after {
    opacity: 1;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.15);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
`

const ZoomIcon = styled.div`
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255,255,255,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 2;

  ${PhotoWrapper}:hover & {
    opacity: 1;
  }

  svg {
    width: 14px;
    height: 14px;
    stroke: ${theme.brown};
  }
`

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
  cursor: zoom-in;
`

const Info = styled.div`
  padding: 16px 18px 18px;
`

const Name = styled.div`
  font-family: 'Crimson Pro', Georgia, serif;
  font-size: 19px;
  font-weight: 600;
  color: ${theme.brown};
  margin-bottom: 4px;
`

const Region = styled.div`
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${theme.sandText};
  margin-bottom: 6px;
`

const Notes = styled.div`
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 12.5px;
  font-style: italic;
  color: ${theme.sandDark};
  line-height: 1.4;
  margin-bottom: 14px;
`


const QuantiteWrapper = styled.div`
  overflow: hidden;
  max-height: 200px;
  opacity: 1;
`

const QuantiteInner = styled.div`
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid ${theme.line};
`

const QuantiteLabel = styled.div`
  display: block;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: ${({ $error }) => $error ? theme.error : theme.sandText};
  margin-bottom: 6px;
  transition: color 0.2s;
`

const PillsRow = styled.div`
  display: flex;
  gap: 5px;
`

const Pill = styled.button`
  flex: 1;
  font-family: 'Open Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 4px;
  border-radius: 4px;
  border: 1px solid ${({ $active }) => $active ? theme.brown : theme.line};
  background: ${({ $active }) => $active ? theme.brown : theme.white};
  color: ${({ $active }) => $active ? theme.white : theme.brown};
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;

  &:hover {
    border-color: ${theme.sand};
    color: ${({ $active }) => $active ? theme.white : theme.brown};
    background: ${({ $active }) => $active ? theme.brown : 'transparent'};
  }
  &:focus-visible {
    outline: 2.5px solid ${theme.accent};
    outline-offset: 2px;
  }
`

const ErrorMsg = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${theme.error};
  margin-top: 8px;

  &::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${theme.error};
    flex-shrink: 0;
  }
`

// — Lightbox —

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

const scaleIn = keyframes`
  from { transform: scale(0.88); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
`

const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(12, 8, 4, 0.90);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
  animation: ${fadeIn} 0.2s ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const LightboxImg = styled.img`
  max-width: min(88vw, 680px);
  max-height: 85vh;
  object-fit: contain;
  border-radius: 14px;
  cursor: default;
  box-shadow: 0 32px 100px rgba(0, 0, 0, 0.65);
  animation: ${scaleIn} 0.22s ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const LightboxCaption = styled.div`
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Crimson Pro', Georgia, serif;
  font-style: italic;
  font-size: 18px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.04em;
  white-space: nowrap;
`

const LightboxClose = styled.button`
  position: absolute;
  top: 20px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
  }
`

export default function CoffeeGrid({
  value = [],
  quantiteParCafe = {},
  onQuantiteChange,
  quantiteOptions = [],
  error,
  errorQuantite,
}) {
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <div>
      <Grid>
        {CAFES.map(cafe => {
          const checked = value.includes(cafe.value)
          const selectedQte = quantiteParCafe[cafe.value]
          const missingQte = checked && !selectedQte && !!errorQuantite

          return (
            <Card key={cafe.value} $checked={checked}>
              <PhotoWrapper
                onClick={e => { e.stopPropagation(); setLightbox(cafe) }}
                title={`Voir ${cafe.name}`}
              >
                <Photo src={cafe.img} alt={cafe.name} />
                <ZoomIcon>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </ZoomIcon>
              </PhotoWrapper>
              <Info>
                <Name>{cafe.name}</Name>
                <Region>{cafe.region}</Region>
                <Notes>{cafe.notes}</Notes>
                <QuantiteWrapper>
                  <QuantiteInner>
                    <QuantiteLabel $error={missingQte}>Quantité</QuantiteLabel>
                    <PillsRow>
                      {quantiteOptions.map(opt => (
                        <Pill
                          key={opt.value}
                          type="button"
                          $active={selectedQte === opt.value}
                          onClick={e => { e.stopPropagation(); onQuantiteChange(cafe.value, opt.value) }}
                        >
                          {opt.label}
                        </Pill>
                      ))}
                    </PillsRow>
                  </QuantiteInner>
                </QuantiteWrapper>
              </Info>
            </Card>
          )
        })}
      </Grid>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {!error && errorQuantite && <ErrorMsg>{errorQuantite}</ErrorMsg>}

      {lightbox && (
        <LightboxOverlay onClick={() => setLightbox(null)}>
          <LightboxImg
            src={lightbox.img}
            alt={lightbox.name}
            onClick={e => e.stopPropagation()}
          />
          <LightboxCaption>{lightbox.name} · {lightbox.region}</LightboxCaption>
          <LightboxClose
            onClick={() => setLightbox(null)}
            aria-label="Fermer"
          >
            ✕
          </LightboxClose>
        </LightboxOverlay>
      )}
    </div>
  )
}
