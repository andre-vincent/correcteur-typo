/** JAVASCRIPT
 * Correcteur typographique pour la langue française v10.3 (Stable)
 * Gestion et liaison dynamique par blocs sémantiques cibles.
 */
(function() {
  const BALISES_A_EXCLURE = ['CODE', 'PRE', 'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'];

  // Sélection de tous les champs sources du laboratoire
  const sources = document.querySelectorAll('.no-typo');

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

    // RÈGLE 1 : Apostrophes typographiques
    texte = texte.replace(/(?<=\p{L})[''](?=\p{L})/gu, '’');

    // RÈGLE 2 : Deux-points
    texte = texte.replace(/(?<!https?|ftp|mailto)(?<=\S)\s*:(?!\/|\d{2}\b)/gi, '\u00A0:');

    // RÈGLE 3 : Ponctuation double (; ! ?)
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

    // RÈGLE 6 : Unités de mesure physiques
    REGEX_UNITES.lastIndex = 0;
    texte = texte.replace(REGEX_UNITES, `${ESPACE_FINE}$1`);

    // RÈGLE 7 : Tirets de dialogue et d'incise
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
    // FIX : Utilisation correcte de la variable parties[0] au lieu du tableau entier
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
   * Vérifie si la langue française est active et valide l'élément parent
   */
  function validerElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (BALISES_A_EXCLURE.includes(element.tagName)) return false;

    // FIX : Si l'élément est (ou est à l'intérieur de) la cible de rendu corrigée, 
    // on AUTHORISE le traitement peu importe s'il contient encore la classe source copiée.
    const estDansRenduCible = element.closest('ins') || element.closest('[id^="td-"]') || element.closest('time');
    if (estDansRenduCible) return true;

    // Protection classique hors zones de rendu du lab
    if (element.closest('.no-typo')) return false;

    const elementLangue = element.closest('[lang]');
    if (elementLangue && !elementLangue.getAttribute('lang').toLowerCase().startsWith('fr')) {
      return false;
    }
    return true;
  }

  /**
   * Parcours du DOM local via TreeWalker
   */
  function corrigerZone(cible) {
    if (!cible) return;

    const walker = document.createTreeWalker(
      cible,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(noeud) {
          const parent = noeud.parentElement;
          if (!parent || !validerElement(parent)) return NodeFilter.FILTER_REJECT;
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

  /**
   * Transfère et nettoie le contenu vers la cible associée
   */
  function synchroniserElement(source) {
    const targetId = source.getAttribute('data-target');
    const cible = document.getElementById(targetId);
    if (!cible) return;

    // 1. Duplication propre (textContent s'il n'y a pas de sous-balises, innerHTML sinon)
    if (source.tagName === 'SPAN' && !source.querySelector('*')) {
      cible.textContent = source.textContent;
    } else {
      cible.innerHTML = source.innerHTML;
    }

    // 2. Lancement du correcteur typographique ciblé
    corrigerZone(cible);
  }

  /**
   * Initialisation des écouteurs d'événements
   */
  function démarrer() {
    sources.forEach(source => {
      // Synchronisation et rendu initial
      synchroniserElement(source);

      // Écoute dynamique à chaque frappe de touche (Performances optimales via événement input localisé)
      source.addEventListener('input', () => {
        synchroniserElement(source);
      });
    });
  }

  // Chargement sécurisé du script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', démarrer);
  } else {
    démarrer();
  }
})();
