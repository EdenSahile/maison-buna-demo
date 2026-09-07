import { Router } from 'express';
import crypto from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { saveDevis } from '../data/storage.js';
import { generatePDF } from '../services/pdfService.js';
import { sendDevisEmails, sendPdfFailureAlert } from '../services/mailService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const counterPath = join(__dirname, '../data/counter.json');

let _counter = null;

function nextDevisNumero(isParticulier) {
  if (_counter === null) {
    try {
      _counter = JSON.parse(readFileSync(counterPath, 'utf8')).counter;
    } catch {
      _counter = parseInt(process.env.COUNTER_SEED || '0');
    }
  }
  _counter++;
  try {
    writeFileSync(counterPath, JSON.stringify({ counter: _counter }));
  } catch (err) {
    console.error(`Compteur non persisté (${err.message}) — dérive possible entre mémoire et disque.`);
  }
  const prefix = isParticulier ? 'MBP' : 'MBE';
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const seq = String(_counter).padStart(5, '0');
  return `${prefix}-${date}-${seq}`;
}

const router = Router();

const CAFES_META = {
  'Limmu':       { region: 'Région Limmu · Éthiopie' },
  'Sidamo':      { region: 'Région Sidama · Éthiopie' },
  'Yirgacheffe': { region: 'Région Yirgacheffe · Éthiopie' },
};

// Prix TTC par quantité — TVA non applicable art. 293 B CGI (franchise en base)
const PRICING = {
  '250 g':      { pu_ttc: 14.99, qte_label: '250 g', sur_devis: false },
  '500 g':      { pu_ttc: 28.00, qte_label: '500 g', sur_devis: false },
  'Sur mesure': { pu_ttc: 0,     qte_label: '',       sur_devis: true  },
};

// Longueurs maximales par champ. Sans elles, la seule borne est le plafond de
// 100 ko d'express.json() : un message de 100 000 caractères partirait dans le
// PDF et dans les deux emails.
const MAX_LENGTHS = {
  prenom: 100, nom: 100, societe: 150, email: 254, telephone: 30,
  collaborateurs: 50, secteur: 100,
  adresse: 200, codepostal: 20, ville: 100,
  frequence: 50, message: 2000,
};

// Le catalogue compte trois cafés : au-delà, ce sont forcément des doublons ou
// du remplissage. Sans borne, 2000 entrées produisaient 2000 lignes de PDF.
const MAX_CAFES = Object.keys(CAFES_META).length;
const MAX_MOUTURES = 10;
const MAX_MOUTURE_LENGTH = 50;

// Lectures sur les référentiels : toujours via Object.hasOwn, sinon une clé
// comme "constructor" ou "toString" résout une propriété héritée d'Object.
function cafeMeta(cafe) {
  return Object.hasOwn(CAFES_META, cafe) ? CAFES_META[cafe] : null;
}

function pricingEntry(quantite) {
  return typeof quantite === 'string' && Object.hasOwn(PRICING, quantite)
    ? PRICING[quantite]
    : null;
}

function quantitePour(quantiteParCafe, cafe) {
  return quantiteParCafe && Object.hasOwn(quantiteParCafe, cafe)
    ? quantiteParCafe[cafe]
    : undefined;
}

// Tronqué : la valeur vient du client et repart dans le message d'erreur.
function extrait(valeur) {
  return String(valeur).slice(0, 50);
}

function formatDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function computePricing(quantiteParCafe, cafes) {
  let grand_total = 0;
  let any_sur_devis = false;

  const pricing_rows = cafes.map(cafe => {
    const entry = pricingEntry(quantitePour(quantiteParCafe, cafe));

    if (!entry || entry.sur_devis) {
      any_sur_devis = true;
      return {
        cafe,
        region:        cafeMeta(cafe)?.region || '',
        designation:   'Café arabica de spécialité — Éthiopien grade 1, torréfié artisanalement en France',
        qte_label:     'Sur devis',
        pu_ttc_fmt:    '—',
        total_ttc_fmt: '—',
      };
    }

    grand_total += entry.pu_ttc;
    return {
      cafe,
      region:        cafeMeta(cafe)?.region || '',
      designation:   'Café arabica de spécialité — Éthiopien grade 1, torréfié artisanalement en France',
      qte_label:     entry.qte_label,
      pu_ttc_fmt:    fmt(entry.pu_ttc),
      total_ttc_fmt: fmt(entry.pu_ttc),
    };
  });

  if (any_sur_devis) return { pricing_rows, grand_total_fmt: null, sur_devis: true };
  return { pricing_rows, grand_total_fmt: fmt(grand_total), sur_devis: false };
}

function buildQuantiteResume(quantiteParCafe, cafes) {
  return cafes.map(cafe => {
    const qte = quantitePour(quantiteParCafe, cafe);
    if (!qte) return cafe;
    const entry = pricingEntry(qte);
    if (entry?.sur_devis) return `${cafe} : sur mesure`;
    return `${cafe} : ${entry?.qte_label || qte}`;
  }).join(' · ');
}

router.post('/devis', async (req, res) => {
  try {
    if (!req.is('application/json')) return res.status(415).json({ error: 'Content-Type application/json requis' });

    const {
      societe, prenom, nom, email, telephone,
      collaborateurs, secteur,
      adresse, codepostal, ville,
      cafes, quantiteParCafe, frequence, moutures, message,
    } = req.body;

    const isParticulier = societe === 'Particulier';

    // Validation

    // Typage et longueur d'abord : un champ texte reçu en objet, en nombre ou
    // en tableau faisait lever .trim() plus bas, donc 500 au lieu de 400.
    for (const [champ, max] of Object.entries(MAX_LENGTHS)) {
      const valeur = req.body[champ];
      if (valeur === undefined || valeur === null) continue;
      if (typeof valeur !== 'string') {
        return res.status(400).json({ error: `Champ invalide : ${champ} (texte attendu)` });
      }
      if (valeur.length > max) {
        return res.status(400).json({ error: `Champ trop long : ${champ} (${max} caractères maximum)` });
      }
    }

    if (!prenom?.trim()) return res.status(400).json({ error: 'Champ manquant : prenom' });
    if (!nom?.trim())    return res.status(400).json({ error: 'Champ manquant : nom' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Email invalide' });
    if (!Array.isArray(cafes) || cafes.length === 0) return res.status(400).json({ error: 'Champ manquant : cafes' });
    if (cafes.length > MAX_CAFES) {
      return res.status(400).json({ error: `Champ invalide : cafes (${MAX_CAFES} valeurs maximum)` });
    }
    if (new Set(cafes).size !== cafes.length) {
      return res.status(400).json({ error: 'Champ invalide : cafes (doublons)' });
    }
    if (!quantiteParCafe || typeof quantiteParCafe !== 'object' || Array.isArray(quantiteParCafe)) {
      return res.status(400).json({ error: 'Champ manquant : quantiteParCafe' });
    }

    for (const cafe of cafes) {
      if (typeof cafe !== 'string' || !Object.hasOwn(CAFES_META, cafe)) {
        return res.status(400).json({ error: `Café inconnu : ${extrait(cafe)}` });
      }
      const qte = quantitePour(quantiteParCafe, cafe);
      if (!qte) return res.status(400).json({ error: `Quantité manquante pour : ${cafe}` });
      if (!pricingEntry(qte)) {
        return res.status(400).json({ error: `Quantité inconnue pour ${cafe} : ${extrait(qte)}` });
      }
    }

    if (moutures !== undefined) {
      if (!Array.isArray(moutures) || moutures.length > MAX_MOUTURES) {
        return res.status(400).json({ error: `Champ invalide : moutures (${MAX_MOUTURES} valeurs maximum)` });
      }
      const moutureInvalide = moutures.find(m => typeof m !== 'string' || m.length > MAX_MOUTURE_LENGTH);
      if (moutureInvalide !== undefined) {
        return res.status(400).json({ error: `Champ invalide : moutures (${MAX_MOUTURE_LENGTH} caractères maximum par valeur)` });
      }
    }

    if (!isParticulier) {
      if (!societe?.trim()) return res.status(400).json({ error: 'Champ manquant : societe' });
      if (!collaborateurs?.trim()) return res.status(400).json({ error: 'Champ manquant : collaborateurs' });
    } else {
      if (!adresse?.trim()) return res.status(400).json({ error: 'Champ manquant : adresse' });
    }

    const now = new Date();
    const validite = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const id = crypto.randomUUID();

    const devis = {
      id,
      timestamp: now.toISOString(),
      devis_numero: nextDevisNumero(isParticulier),
      date_emission: formatDate(now),
      date_validite: formatDate(validite),
      // Client
      societe:       isParticulier ? 'Particulier' : societe,
      prenom, nom, email,
      telephone:     telephone || '',
      collaborateurs: collaborateurs || '',
      secteur:       secteur || '',
      adresse:       adresse || '',
      codepostal:    codepostal || '',
      ville:         ville || '',
      // Commande
      cafes,
      quantiteParCafe: Object.fromEntries(cafes.map(c => [c, quantitePour(quantiteParCafe, c)])),
      quantite_resume: buildQuantiteResume(quantiteParCafe, cafes),
      frequence: frequence || '',
      moutures: moutures || [],
      message: message || '',
      // Pricing
      ...computePricing(quantiteParCafe, cafes),
      is_particulier: isParticulier,
    };

    saveDevis(devis);
    res.json({ success: true, id: devis.id });

    setImmediate(async () => {
      let pdfBuffer = null;
      if (!devis.sur_devis) {
        const retryDelays = [0, 5000, 10000];
        let success = false;
        for (let i = 0; i < retryDelays.length; i++) {
          if (retryDelays[i] > 0) await new Promise(r => setTimeout(r, retryDelays[i]));
          try {
            pdfBuffer = await generatePDF(devis);
            success = true;
            break;
          } catch (err) {
            if (i < retryDelays.length - 1) {
              console.warn(`PDF tentative ${i + 1} échouée (${err.message}), nouvel essai…`);
            } else {
              console.error(`Erreur PDF id:${devis.id} — toutes les tentatives épuisées : ${err.message}`);
            }
          }
        }
        if (!success) {
          console.error(`PDF échoué id:${devis.id} — client non notifié, alerte admin envoyée`);
          try { await sendPdfFailureAlert(devis); } catch {}
          return;
        }
      }
      try {
        await sendDevisEmails(devis, pdfBuffer);
      } catch (err) {
        console.error(`Erreur email id:${devis.id} :`, err.message);
      }
    });
  } catch (err) {
    console.error('Erreur /api/devis :', err);
    res.status(500).json({ error: 'Une erreur est survenue. Veuillez réessayer.' });
  }
});

export default router;
