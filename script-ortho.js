/**
 * Correcteur typographique pour la langue française v10.0
 * Conforme aux normes de l'Imprimerie nationale (FR) et de l'OQLF (CA).
 * 
 * Traite les nœuds de texte un par un pour préserver l'intégrité des balises.
 * Intègre un MutationObserver et un test de rendu par Canvas pour le fallback.
 */
(function() {
  const BALISES_A_EXCLURE = ['CODE', 'PRE', 'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'];
  const CLASSE_A_EXCLURE = 'no-typo';
  let observateurDynamique = null;

  /**
   * TEST DE RENDU PAR CANVAS
   * Vérifie si le système sait dessiner le caractère U+202F.
   * Si la largeur est identique à un caractère inexistant (U+FFFF) ou nulle,
   * active le fallback automatique vers l'espace insécable classique (\u00A0).
   */
  function verifierSupportEspaceFine() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '\u00A0';

      ctx.font = '16px sans-serif';
      const largeurInvalide = ctx.measureText('\uFFFF').width;
      const largeurFine = ctx.measureText('\u202F').width;

      if (largeurFine === largeurInvalide || largeurFine === 0) {
        return '\u00A0';
      }
      return '\u202F';
    } catch (e) {
      return '\u00A0';
    }
  }

  const ESPACE_FINE = verifierSupportEspaceFine();

  // Liste des unités ISO et Impériales à lier au nombre qui les précède
  const REGEX_UNITES = new RegExp(
    '(?<=\\d)\\s*(' +
    '°[CF]|' + // Températures
    '(?:[kMGmcd])?(?:m|g|l|L|Wh|Hz|W|V|A|N|Pa|B)|t|hPa|dB|' + // ISO et préfixes
    '(?:m|cm|mm)[²³]|' + // Surfaces et volumes
    'in|ft|yd|mi|oz|lb|gal|qt|pt|mph' + // Impériales
    ')(?=\\s|\\b|\\p{P}|$)', 'gu'
  );

  /**
   * Analyse récursive du DOM et application des règles
   */
  function corrigerTypographieFrancaise(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (BALISES_A_EXCLURE.includes(element.tagName)) return;
    if (element.closest(`.${CLASSE_A_EXCLURE}`)) return;

    const codeLangue = element.getAttribute('lang');
    if (codeLangue && !codeLangue.startsWith('fr')) return;
    if (!element.closest('[lang^="fr"]')) return;

    // --- TRAITEMENT BALISE <time> ---
    if (element.tagName === 'TIME') {
      element.childNodes.forEach(noeud => {
        if (noeud.nodeType === Node.TEXT_NODE) {
          let texte = noeud.textContent;
          texte = texte.replace(/(?<=\d)\s*(h|min|s)(?=\s|\d|$)/gi, `${ESPACE_FINE}$1`);
          texte = texte.replace(/(?<=(h|min))\s*(?=\d)/gi, ESPACE_FINE);
          texte = texte.replace(/(?<=^|\s)(\d{1,2})\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_FINE}$2${ESPACE_FINE}$3`);
          texte = texte.replace(/(?<=^|\s)(1er)\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_FINE}$2${ESPACE_FINE}$3`);
          noeud.textContent = texte;
        }
      });
      return;
    }

    const estDansUnTableau = element.closest('table') !== null;

    // --- TRAITEMENT DES NŒUDS DE TEXTE ---
    element.childNodes.forEach(noeud => {
      if (noeud.nodeType === Node.TEXT_NODE) {
        let texte = noeud.textContent;

        // RÈGLE 1 : Apostrophes courbes entre deux lettres
        texte = texte.replace(/(?<=\p{L})[''](?=\p{L})/gu, '’'); 
        
        // RÈGLE 2 : Ponctuation double (; : ! ?)
        texte = texte.replace(/\s*(:)/g, '\u00A0$1'); // Deux-points (\u00A0)
        texte = texte.replace(/\s*([;!?])/g, `${ESPACE_FINE}$1`); // Autres (ESPACE_FINE)
        
        // RÈGLE 3 : Guillemets français (« »)
        texte = texte.replace(/(^|[\s(])"\s*([^"\s][^"]*?)\s*"/g, `$1«${ESPACE_FINE}$2${ESPACE_FINE}»`);
        texte = texte.replace(/«\s*/g, `«${ESPACE_FINE}`);
        texte = texte.replace(/\s*»/g, `${ESPACE_FINE}»`);

        // RÈGLE 4 : Devises et Pourcentages
        texte = texte.replace(/(?<=\d)\s*([$€£¥₣₩元])/g, `${ESPACE_FINE}$1`);
        texte = texte.replace(/(?<=\d)\s*([%‰₱])/g, `${ESPACE_FINE}$1`);

        // RÈGLE 5 : Unités de mesure physiques
        texte = texte.replace(REGEX_UNITES, `${ESPACE_FINE}$1`);

        // RÈGLE 6 : Tirets de dialogue (début de ligne) et d'incise (\u00A0 exigée)
        texte = texte.replace(/^(?:[-–—]\s*)/gm, '—\u00A0');
        texte = texte.replace(/\s+([-–—])\s+/g, ' –\u00A0');

        // RÈGLE 7 : Grands nombres (Séparateur de milliers)
        texte = texte.replace(/\b\d+[\d\s]*\b/g, (nombreGlobal) => {
          let parties = nombreGlobal.split(/[,.]/);
          let partieEntiere = parties[0].replace(/\s/g, ''); 
          const seuilAtteint = estDansUnTableau ? (partieEntiere.length >= 4) : (partieEntiere.length >= 5);

          if (seuilAtteint) {
            partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
            parties[0] = partieEntiere;
            return parties.join(nombreGlobal.includes(',') ? ',' : '.');
          }
          return nombreGlobal;
        });

        if (noeud.textContent !== texte) {
          noeud.textContent = texte;
        }
      }
    });

    Array.from(element.children).forEach(enfant => corrigerTypographieFrancaise(enfant));
  }

  // --- LOGIQUE DU MUTATION OBSERVER ---
  function traiterMutations(mutations) {
    observateurDynamique.disconnect();
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((noeud) => {
          if (noeud.nodeType === Node.ELEMENT_NODE) {
            corrigerTypographieFrancaise(noeud);
          } else if (noeud.nodeType === Node.TEXT_NODE && noeud.parentElement) {
            corrigerTypographieFrancaise(noeud.parentElement);
          }
        });
      } else if (mutation.type === 'characterData' && mutation.target.parentElement) {
        corrigerTypographieFrancaise(mutation.target.parentElement);
      }
    });
    lancerSurveillance();
  }

  function lancerSurveillance() {
    observateurDynamique.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function démarrer() {
    corrigerTypographieFrancaise(document.body);
    observateurDynamique = new MutationObserver(traiterMutations);
    lancerSurveillance();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', démarrer);
  } else {
    démarrer();
  }
})();
