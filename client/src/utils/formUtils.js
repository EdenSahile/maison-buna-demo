export const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
export const validateCP = (cp) => /^\d{5}$/.test(cp)

export const INITIAL_FORM_DATA = {
  societe: '', secteur: '', collaborateurs: '',
  adresse: '', codepostal: '', ville: '',
  prenom: '', nom: '', email: '', telephone: '',
  cafes: [], quantiteParCafe: {}, frequence: '', moutures: ['Grains entiers'],
  message: '',
}

export function validate(formData, audience) {
  const errors = {}
  const isEnt = audience === 'entreprise'

  if (isEnt) {
    if (!formData.societe) errors.societe = 'Veuillez renseigner le nom de votre société'
    if (!formData.collaborateurs) errors.collaborateurs = 'Veuillez sélectionner une taille d\'équipe'
  } else {
    if (!formData.adresse) errors.adresse = 'Veuillez renseigner votre adresse'
    if (!validateCP(formData.codepostal)) errors.codepostal = 'Code postal requis (5 chiffres)'
    if (!formData.ville) errors.ville = 'Veuillez renseigner votre ville'
  }

  if (!formData.prenom) errors.prenom = 'Veuillez renseigner votre prénom'
  if (!formData.nom) errors.nom = 'Veuillez renseigner votre nom'
  if (!validateEmail(formData.email)) errors.email = 'Email invalide'
  if (!formData.cafes?.length) errors.cafes = 'Veuillez sélectionner au moins un café'
  if (formData.cafes?.length && !formData.cafes.every(c => formData.quantiteParCafe?.[c]))
    errors.quantiteParCafe = 'Veuillez choisir une quantité pour chaque café sélectionné'

  return errors
}

export function computeStepProgress(formData, audience) {
  const isEnt = audience === 'entreprise'
  return [
    isEnt
      ? !!(formData.societe && formData.collaborateurs)
      : !!(formData.adresse && validateCP(formData.codepostal) && formData.ville),
    !!(formData.prenom && formData.nom && validateEmail(formData.email)),
    !!(formData.cafes?.length && formData.cafes.every(c => formData.quantiteParCafe?.[c])),
    true,
  ]
}

export function buildPayload(formData, audience) {
  const isEnt = audience === 'entreprise'
  return {
    societe: isEnt ? formData.societe : 'Particulier',
    prenom: formData.prenom,
    nom: formData.nom,
    email: formData.email,
    telephone: formData.telephone,
    collaborateurs: isEnt ? formData.collaborateurs : '',
    secteur: formData.secteur,
    adresse: !isEnt ? formData.adresse : '',
    codepostal: !isEnt ? formData.codepostal : '',
    ville: formData.ville,
    cafes: formData.cafes,
    quantiteParCafe: formData.quantiteParCafe,
    frequence: formData.frequence,
    moutures: formData.moutures,
    message: formData.message,
  }
}
