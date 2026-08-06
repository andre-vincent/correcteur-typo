/** JAVASCRIPT
 * Correcteur typographique pour la langue française v10.2 (Modifié)
 * Avec liaison dynamique en temps réel entre .no-typo et .typo
 */
(function() {
  const BALISES_A_EXCLURE = ['CODE', 'PRE', 'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'];
  const CLASSE_A_EXCLURE = 'no-typo';

  // Sélections des éléments de l'interface
  const source = document.querySelector('.no-typo');
  const destination = document.querySelector('.typo');

  /**
   * TEST DE RENDU PAR CANVAS
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

  const REGEX_UNITES = new RegExp(
    '(?<=\\d)\\s*(' +
    '°[CF]|' +
    '(?:[kMGmcd])?(?:m|g|l|L|Wh|Hz|W|V|A|N|Pa|B)|t|hPa|dB|' +
    '(?:m|cm|mm)[²³]|' +
    'in|ft|yd|mi|oz|lb|gal|qt|pt|mph' +
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

    // RÈGLE 1 : Apostrophes
    texte = texte.replace(/(?<=\p{L})[''](?=\p{L})/gu, '’');

    // RÈGLE 2 : Deux-points
    texte = texte.replace(/(?<!https?|ftp|mailto)(?<=\S)\s*:(?!\/|\d{2}\b)/gi, '\u00A0:');

    // RÈGLE 3 : Ponctuation double
    texte = texte.replace(/\s*([;!?]+)/g, `${ESPACE_FINE}$1`);

    // RÈGLE 4 : Guillemets français
    texte = texte.replace(/«\s*/g, `«${ESPACE_FINE}`);
    texte = texte.replace(/\s*»/g, `${ESPACE_FINE}»`);
    texte = texte.replace(/"([^"]*)"/g, (match, contenu) => {
      return `«${ESPACE_FINE}${contenu.trim()}${ESPACE_FINE}»`;
    });

    // RÈGLE 5 : Devises et Pourcentages
    texte = texte.replace(/(?<=\d)\s*([$€£¥₣₩元])/g, `${ESPACE_FINE}$1`);
    texte = texte.replace(/(?<=\d)\s*([%‰₱])/g, `${ESPACE_FINE}$1`);

    // RÈGLE 6 : Unités de mesure
    REGEX_UNITES.lastIndex = 0;
    texte = texte.replace(REGEX_UNITES, `${ESPACE_FINE}$1`);

    // RÈGLE 7 : Tirets
    texte = texte.replace(/^(?:[-–—]\s*)/gm, '—\u00A0');
    texte = texte.replace(/\s+([-–—])\s+/g, ' –\u00A0');

    // RÈGLE 8 : Balise <time>
    if (estDansTime) {
      texte = texte.replace(/(?<=\d)\s*(h|min|s)(?=\s|\d|$)/gi, `${ESPACE_FINE}$1`);
      texte = texte.replace(/(?<=(h|min))\s*(?=\d)/gi, ESPACE_FINE);
      texte = texte.replace(/(?<=^|\s)(\d{1,2})\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_FINE}$2${ESPACE_FINE}$3`);
      texte = texte.replace(/(?<=^|\s)(1er)\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_FINE}$2${ESPACE_FINE}$3`);
    }

    // RÈGLE 9 : Grands nombres
    // MODIFICATION : \u00A0 dans les <table>, ESPACE_FINE ailleurs.
    texte = texte.replace(/\b\d+[\d\s]*\b/g, (nombreGlobal) => {
      let parties = nombreGlobal.split(/[,.]/);
      let partieEntiere = parties[0].replace(/\s/g, '');
      const seuilAtteint = estDansUnTableau ? (partieEntiere.length >= 4) : (partieEntiere.length >= 5);

      if (seuilAtteint) {
        const separateur = estDansUnTableau ? '\u00A0' : ESPACE_FINE;
        partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, separateur);
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
   * Vérification de validité de l'élément cible
   */
  function validerElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (BALISES_A_EXCLURE.includes(element.tagName)) return false;

    // ATTENTION : On supprime ici l'exclusion de la classe 'no-typo' uniquement pour
    // l'élément racine de destination afin de pouvoir y appliquer les corrections.
    if (element.classList.contains(CLASSE_A_EXCLURE) && element !== destination) return false;
    if (element.closest(`.${CLASSE_A_EXCLURE}`) && !element.closest('.typo')) return false;

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
    if (!racine || !validerElement(racine)) return;

    const walker = document.createTreeWalker(
      racine,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(noeud) {
          const parent = noeud.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (BALISES_A_EXCLURE.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
          
          // Sécurité additionnelle pour l'arbre
          if (parent.closest(`.${CLASSE_A_EXCLURE}`) && !parent.closest('.typo')) return NodeFilter.FILTER_REJECT;

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

  // --- SCRIPT DE LIAISON (ÉCOUTEUR D'ÉVÉNEMENT) ---
  function executerLiaisonEtCorrection() {
    if (!source || !destination) return;
    
    // 1. Duplication instantanée du HTML
    destination.innerHTML = source.innerHTML;
    
    // 2. Lancement du traitement typographique sur le bloc cible uniquement
    corrigerTypographieFrancaise(destination);
  }

  // Écoute de l'activité sur la zone éditable
  if (source) {
    source.addEventListener('input', executerLiaisonEtCorrection);
  }

  // Synchronisation initiale au chargement
  document.addEventListener('DOMContentLoaded', executerLiaisonEtCorrection);
  if (document.readyState !== 'loading') {
    executerLiaisonEtCorrection();
  }
})();
</script>
