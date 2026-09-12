/** JAVASCRIPT
 * Correcteur typographique pour la langue française v5.3
 * Conforme aux normes de l'Imprimerie nationale (FR) et du Ramat de la typographie (Québec).
 * 
 * Version optimisée et testée pour Safari (iPad / iOS / macOS) et moteurs Blink.
 */
(function() {
  const BALISES_A_EXCLURE = ['CODE', 'PRE', 'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'];
  const CLASSE_A_EXCLURE = 'no-typo';
  let observateurDynamique = null;
  let estEnTrainDeCorriger = false;
  let estActif = true;

  const ESPACE_FINE = '\u202F'; // Espace fine insécable (NNBSP)
  const ESPACE_NBSP = '\u00A0'; // Espace insécable classique (NBSP)

  const REGEX_UNITES = new RegExp(
    '(?<=\\d)\\s*(' +
    '°[CF]|' + 
    '(?:[kMGmcd])?(?:m|g|l|L|Wh|Hz|W|V|A|N|Pa|B)|t|hPa|dB|' + 
    '(?:m|cm|mm)[²³]|' + 
    'in|ft|yd|mi|oz|lb|gal|qt|pt|mph' + 
    ')(?=\\s|\\b|\\p{P}|$)', 'gu'
  );

  function corrigerNoeudTexte(noeud) {
    let texte = noeud.textContent;
    if (!texte || !texte.trim()) return;

    const parent = noeud.parentElement;
    const estDansUnTableau = parent ? parent.closest('table') !== null : false;
    const estDansTime = parent ? parent.closest('time') !== null : false;

    // --- ISOLATION DES ADRESSES WEB ET COURRIELS ---
    const REGEX_URL_PROTECTION = /(?:https?|ftp|mailto):\/\/[^\s]+|[a-z0-9]+([\-.][a-z0-9]+)*\.[a-z]{2,6}(?::\d{1,5})?\/?[^\s]*/gi;
    const jetonsUrls = [];
    
    texte = texte.replace(REGEX_URL_PROTECTION, function(match) {
      jetonsUrls.push(match);
      return '__URL_TOKEN_' + (jetonsUrls.length - 1) + '__';
    });

    // RÈGLE 1 : Apostrophes typographiques
    texte = texte.replace(/(?<=\p{L})[''](?=\p{L})/gu, '’');

    // RÈGLE 2 : Deux-points (\u00A0 exigée)
    texte = texte.replace(/(?<=\S)\s*:(?!\/\d{2}\b)/gi, '\u00A0:');

    // RÈGLE 3 : Ponctuation double (; ! ?)
    texte = texte.replace(/\s*([;!?]+)/g, ESPACE_FINE + '$1');

    // RÈGLE 4 : Guillemets français (« »)
    texte = texte.replace(/«\s*/g, '«' + ESPACE_FINE);
    texte = texte.replace(/\s*»/g, ESPACE_FINE + '»');
    texte = texte.replace(/"([^"\n]*?)"/g, function(match, contenu) {
      return '«' + ESPACE_FINE + contenu.trim() + ESPACE_FINE + '»';
    });

    // RÈGLE 5 : Devises et Pourcentages
    texte = texte.replace(/(?<=\d)\s*([$€£¥₣₩元])/g, ESPACE_FINE + '$1');
    texte = texte.replace(/(?<=\d)\s*([%‰₱])/g, ESPACE_FINE + '$1');

    // RÈGLE 6 : Unités de mesure physiques
    REGEX_UNITES.lastIndex = 0;
    texte = texte.replace(REGEX_UNITES, ESPACE_FINE + '$1');

    // RÈGLE 7 : Tirets de dialogue et d'incise
    texte = texte.replace(/(^|\n)[ \t]*[-–—][ \t]*/g, '$1—\u00A0');
    texte = texte.replace(/(?<=\p{L})\s+([-–—])\s+(?=\p{L})/gu, ' –\u00A0');

    // RÈGLE 8 : Traitement spécifique pour la balise <time>
    if (estDansTime) {
      texte = texte.replace(/(?<=\d)\s*(h|min|s)(?=\s|\d|$)/gi, ESPACE_FINE + '$1');
      texte = texte.replace(/(?<=(h|min))\s*(?=\d)/gi, ESPACE_FINE);
      texte = texte.replace(/(?<=^|\s)(\d{1,2})\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, '$1' + ESPACE_FINE + '$2' + ESPACE_FINE + '$3');
      texte = texte.replace(/(?<=^|\s)(1er)\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_FINE}$2${ESPACE_FINE}$3`);
    }

    // RÈGLE 9 : Grands nombres et Années (Ex: 2026)
    texte = texte.replace(/\b-?\d+(?:[ \u00A0\u202F]\d{3})*(?:[.,]\d+)?\b/g, function(nombreGlobal, offset, source) {
      const signe = nombreGlobal.startsWith('-') ? '-' : '';
      const corps = nombreGlobal.replace(/^-/, '');
      const decimal = corps.match(/([.,]\d+)$/);
      const partieDecimale = decimal ? decimal[0] : '';
      let partieEntiere = decimal ? corps.slice(0, -partieDecimale.length) : corps;
      partieEntiere = partieEntiere.replace(/[ \u00A0\u202F]/g, '');

      if (partieEntiere.length === 4 && !partieDecimale) {
        const valNum = parseInt(partieEntiere, 10);
        if (valNum >= 1000 && valNum <= 2999) {
          const resteTexte = source.slice(offset + nombreGlobal.length);
          const prochainCaractere = resteTexte.trimStart().charAt(0);
          const estSuiviSymbole = /^[€$£¥₣₩元%‰₱°]/.test(prochainCaractere);
          if (!estSuiviSymbole) return nombreGlobal;
        }
      }

      const seuilAtteint = estDansUnTableau ? partieEntiere.length >= 4 : partieEntiere.length >= 5;
      if (!seuilAtteint) return nombreGlobal;

      const separateur = estDansUnTableau ? ESPACE_NBSP : ESPACE_FINE;
      partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, separateur);
      return signe + partieEntiere + partieDecimale;
    });

    // --- RESTAURATION DES ADRESSES WEB ---
    if (jetonsUrls.length > 0) {
      texte = texte.replace(/__URL_TOKEN_(\d+)__/g, function(match, index) {
        return jetonsUrls[parseInt(index, 10)];
      });
    }

    if (noeud.textContent !== texte) {
      noeud.textContent = texte;
    }
  }

  function validerElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (BALISES_A_EXCLURE.includes(element.tagName)) return false;
    if (element.closest(`.${CLASSE_A_EXCLURE}`) || element.closest('[data-typo="off"]')) return false;

    const elementLangue = element.closest('[lang]');
    if (elementLangue && !elementLangue.getAttribute('lang').toLowerCase().startsWith('fr')) {
      return false;
    }
    return true;
  }

  function corrigerTypographieFrancaise(racine) {
    if (!racine) return;

    if (racine.nodeType === Node.TEXT_NODE) {
      if (racine.parentElement && validerElement(racine.parentElement)) {
        corrigerNoeudTexte(racine);
      }
      return;
    }

    if (!validerElement(racine)) return;

    const walker = document.createTreeWalker(
      racine,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(noeud) {
          const parent = noeud.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (BALISES_A_EXCLURE.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest(`.${CLASSE_A_EXCLURE}`) || parent.closest('[data-typo="off"]')) return NodeFilter.FILTER_REJECT;

          const elementLangue = parent.closest('[lang]');
          if (elementLangue && !elementLangue.getAttribute('lang').toLowerCase().startsWith('fr')) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const noeudsATraiter = [];
    while (walker.nextNode()) {
      noeudsATraiter.push(walker.currentNode);
    }

    noeudsATraiter.forEach(corrigerNoeudTexte);
  }

  function traiterMutations(mutations) {
    if (!estActif || estEnTrainDeCorriger) return;

    try {
      estEnTrainDeCorriger = true;
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(noeud) {
            corrigerTypographieFrancaise(noeud);
          });
        } else if (mutation.type === 'characterData' && mutation.target.parentElement) {
          corrigerTypographieFrancaise(mutation.target);
        }
      });
    } finally {
      estEnTrainDeCorriger = false;
    }
  }

  function lancerSurveillance() {
    if (!observateurDynamique) return;
    observateurDynamique.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function démarrer() {
    corrigerTypographieFrancaise(document.body);
    observateurDynamique = new MutationObserver(traiterMutations);
    lancerSurveillance();
  }

  window.TypoFixer = {
    desactiver: function() { estActif = false; },
    activer: function() { estActif = true; corrigerTypographieFrancaise(document.body); },
    corrigerElement: function(el) { 
      const s = estActif; estActif = true; corrigerTypographieFrancaise(el || document.body); estActif = s; 
    },
    getStatut: function() { return estActif ? 'Actif' : 'Inactif'; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', démarrer);
  } else {
    démarrer();
  }
})();
