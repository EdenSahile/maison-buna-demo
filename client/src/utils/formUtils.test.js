import { describe, it, expect } from 'vitest'
import { validate, computeStepProgress, buildPayload } from './formUtils'

const baseEnt = {
  societe: 'Acme', secteur: 'Tech / Startup', collaborateurs: '11 – 25',
  adresse: '', codepostal: '', ville: 'Paris',
  prenom: 'Jean', nom: 'Dupont', email: 'jean@acme.fr', telephone: '',
  cafes: ['Limmu'], quantiteParCafe: { Limmu: '1 – 3 kg' }, frequence: '', moutures: [], message: '',
}

const basePart = {
  societe: '', secteur: '', collaborateurs: '',
  adresse: '12 rue de la Paix', codepostal: '75001', ville: 'Paris',
  prenom: 'Marie', nom: 'Martin', email: 'marie@email.fr', telephone: '',
  cafes: ['Sidamo'], quantiteParCafe: { Sidamo: '500 g — 1 personne' }, frequence: '', moutures: [], message: '',
}

describe('validate', () => {
  it('retourne {} si entreprise valide', () => {
    expect(validate(baseEnt, 'entreprise')).toEqual({})
  })

  it('retourne {} si particulier valide', () => {
    expect(validate(basePart, 'particulier')).toEqual({})
  })

  it('exige societe et collaborateurs pour entreprise', () => {
    const errors = validate({ ...baseEnt, societe: '', collaborateurs: '' }, 'entreprise')
    expect(errors).toHaveProperty('societe')
    expect(errors).toHaveProperty('collaborateurs')
  })

  it('exige adresse + codepostal valide + ville pour particulier', () => {
    const errors = validate({ ...basePart, adresse: '', codepostal: '750' }, 'particulier')
    expect(errors).toHaveProperty('adresse')
    expect(errors).toHaveProperty('codepostal')
  })

  it('rejette email invalide', () => {
    expect(validate({ ...baseEnt, email: 'pasunemail' }, 'entreprise')).toHaveProperty('email')
  })

  it('exige quantite pour chaque café sélectionné', () => {
    expect(validate({ ...baseEnt, quantiteParCafe: {} }, 'entreprise')).toHaveProperty('quantiteParCafe')
  })

  it('exige au moins un café', () => {
    expect(validate({ ...baseEnt, cafes: [] }, 'entreprise')).toHaveProperty('cafes')
    expect(validate({ ...basePart, cafes: [] }, 'particulier')).toHaveProperty('cafes')
  })
})

describe('computeStepProgress', () => {
  it('retourne [true,true,true,true] si formulaire entreprise complet', () => {
    expect(computeStepProgress(baseEnt, 'entreprise')).toEqual([true, true, true, true])
  })

  it('step 4 est toujours true', () => {
    expect(computeStepProgress({ ...baseEnt, quantiteParCafe: {} }, 'entreprise')[3]).toBe(true)
  })

  it('step 3 false si cafes vide', () => {
    expect(computeStepProgress({ ...baseEnt, cafes: [] }, 'entreprise')[2]).toBe(false)
  })

  it('step 3 false si café sélectionné sans quantité', () => {
    expect(computeStepProgress({ ...baseEnt, quantiteParCafe: {} }, 'entreprise')[2]).toBe(false)
  })

  it('step 1 false si societe manquante', () => {
    expect(computeStepProgress({ ...baseEnt, societe: '' }, 'entreprise')[0]).toBe(false)
  })

  it('retourne [true,true,true,true] si formulaire particulier complet', () => {
    expect(computeStepProgress(basePart, 'particulier')).toEqual([true, true, true, true])
  })
})

describe('buildPayload', () => {
  it('met societe = "Particulier" pour audience particulier', () => {
    expect(buildPayload(basePart, 'particulier').societe).toBe('Particulier')
  })

  it('inclut adresse et codepostal pour particulier', () => {
    const p = buildPayload(basePart, 'particulier')
    expect(p.adresse).toBe('12 rue de la Paix')
    expect(p.codepostal).toBe('75001')
  })

  it('laisse adresse vide pour entreprise', () => {
    expect(buildPayload(baseEnt, 'entreprise').adresse).toBe('')
  })

  it('inclut cafes dans le payload', () => {
    expect(buildPayload(baseEnt, 'entreprise').cafes).toEqual(['Limmu'])
    expect(buildPayload(basePart, 'particulier').cafes).toEqual(['Sidamo'])
  })

  it('inclut quantiteParCafe dans le payload', () => {
    expect(buildPayload(baseEnt, 'entreprise').quantiteParCafe).toEqual({ Limmu: '1 – 3 kg' })
    expect(buildPayload(basePart, 'particulier').quantiteParCafe).toEqual({ Sidamo: '500 g — 1 personne' })
  })
})
