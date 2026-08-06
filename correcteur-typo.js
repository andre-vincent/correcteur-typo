/** JAVASCRIPT
 * Correcteur typographique pour la langue française v10.2
 * Conforme aux normes de l'Imprimerie nationale (FR) et de l'OQLF (CA).
 * 
 * Optimisé avec document.createTreeWalker et NodeFilter.
 * Traite les nœuds de texte de façon native sans altérer la structure du DOM.
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
   * Application des règles typographiques sur un nœud de texte
   */
  function corrigerNoeudTexte(noeud) {
    let texte = noeud.textContent;
    if (!texte.trim()) return;

    const parent = noeud.parentElement;
    const estDansUnTableau = parent ? parent.closest('table') !== null : false;
    const estDansTime = parent ? parent.closest('time') !== null : false;

    // RÈGLE 1 : Apostrophes typographiques entre deux lettres
    texte = texte.replace(/(?<=\p{L})[''](?=\p{L})/gu, '’');

    // RÈGLE 2 : Deux-points (\u00A0 exigée) - Exclut les URL et les heures (ex: 14:30)
    texte = texte.replace(/(?<!https?|ftp|mailto)(?<=\S)\s*:(?!\/|\d{2}\b)/gi, '\u00A0:');

    // RÈGLE 3 : Ponctuation double (; ! ?) - Regroupe les répétitions (ex: !?, !!!)
    texte = texte.replace(/\s*([;!?]+)/g, `${ESPACE_FINE}$1`);

    // RÈGLE 4 : Guillemets français (« »)
    texte = texte.replace(/«\s*/g, `«${ESPACE_FINE}`);
    texte = texte.replace(/\s*»/g, `${ESPACE_FINE}»`);
    texte = texte.replace(/"([^"]*)"/g, (match, contenu) => {
      return `«${ESPACE_FINE}${contenu.trim()}${ESPACE_FINE}»`;
    });

    // RÈGLE 5 : Devises et Pourcentages
    texte = texte.replace(/(?<=\d)\s*([$€£¥₣₩元])/g, `${ESPACE_FINE}$1`);
    texte = texte.replace(/(?<=\d)\s*([%‰₱])/g, `${ESPACE_FINE}$1`);

    // RÈGLE 6 : Unités de mesure physiques
    REGEX_UNITES.lastIndex = 0;
    texte = texte.replace(REGEX_UNITES, `${ESPACE_FINE}$1`);

    // RÈGLE 7 : Tirets de dialogue et d'incise (\u00A0 exigée)
    texte = texte.replace(/^(?:[-–—]\s*)/gm, '—\u00A0');
    texte = texte.replace(/\s+([-–—])\s+/g, ' –\u00A0');

    // RÈGLE 8 : Traitement spécifique pour la balise <time>
    if (estDansTime) {
      texte = texte.replace(/(?<=\d)\s*(h|min|s)(?=\s|\d|$)/gi, `${ESPACE_FINE}$1`);
      texte = texte.replace(/(?<=(h|min))\s*(?=\d)/gi, ESPACE_FINE);
      texte = texte.replace(/(?<=^|\s)(\d{1,2})\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_FINE}$2${ESPACE_FINE}$3`);
      texte = texte.replace(/(?<=^|\s)(1er)\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_FINE}$2${ESPACE_FINE}$3`);
    }

    // RÈGLE 9 : Grands nombres (Séparateur de milliers)
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

  /**
   * Vérifie si un élément parent est admissible
   */
  function validerElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (BALISES_A_EXCLURE.includes(element.tagName)) return false;
    if (element.closest(`.${CLASSE_A_EXCLURE}`)) return false;

    const elementLangue = element.closest('[lang]');
    if (elementLangue && !elementLangue.getAttribute('lang').toLowerCase().startsWith('fr')) {
      return false;
    }
    return true;
  }

  /**
   * Parcours du DOM via TreeWalker
   */
  function corrigerTypographieFrancaise(racine) {
    if (!racine) return;

    // Gestion directe si le nœud fourni est un nœud de texte isolé
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
          if (parent.closest(`.${CLASSE_A_EXCLURE}`)) return NodeFilter.FILTER_REJECT;

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

  // --- LOGIQUE DU MUTATION OBSERVER ---
  function traiterMutations(mutations) {
    if (observateurDynamique) observateurDynamique.disconnect();

    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((noeud) => {
          corrigerTypographieFrancaise(noeud);
        });
      } else if (mutation.type === 'characterData' && mutation.target.parentElement) {
        corrigerTypographieFrancaise(mutation.target);
      }
    });

    lancerSurveillance();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', démarrer);
  } else {
    démarrer();
  }
})();
