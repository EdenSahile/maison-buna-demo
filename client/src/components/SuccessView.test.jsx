import { describe, it, expect } from 'vitest'
import { delaiLisible } from './SuccessView'

// Le serveur transmet delai_max_secondes dans sa réponse ; ce message est la
// seule promesse de délai faite au client, il ne doit ni inventer un chiffre
// ni écorcher le pluriel.
describe('delaiLisible', () => {
  it.each([
    [345, "Cela peut prendre jusqu'à 6 minutes."],
    [300, "Cela peut prendre jusqu'à 5 minutes."],
    [90, "Cela peut prendre jusqu'à 2 minutes."],
    [60, "Cela peut prendre jusqu'à 1 minute."],
    [45, "Cela peut prendre jusqu'à 45 secondes."],
    [1, "Cela peut prendre jusqu'à 1 seconde."],
  ])('annonce %i secondes en clair', (secondes, attendu) => {
    expect(delaiLisible(secondes)).toBe(attendu)
  })

  it.each([undefined, null, 0, -5, NaN, 'trois'])(
    'reste vague plutôt que d inventer un chiffre quand le serveur ne transmet rien (%s)',
    (valeur) => {
      expect(delaiLisible(valeur)).toBe('Cela peut prendre quelques minutes.')
    },
  )
})
