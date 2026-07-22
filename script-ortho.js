/**
 * Correcteur typographique pour la langue française v8.0
 * Avec système de fallback automatique vers U+00A0 si U+202F n'est pas supporté par le système.
 */
(function() {
  const BALISES_A_EXCLURE = ['CODE', 'PRE', 'SCRIPT', 'STYLE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'OPTION'];
  const CLASSE_A_EXCLURE = 'no-typo';
  let observateurDynamique = null;

  /**
   * RECONNAISSANCE DU SYSTEME (TEST DE RENDU)
   * Crée un canvas invisible pour vérifier si le système sait dessiner le caractère U+202F.
   * Si le caractère est rendu comme un rectangle vide (identique à un caractère inexistant U+FFFF),
   * le script active le fallback automatique vers l'espace insécable classique (\u00A0).
   */
  function verifierSupportEspaceFine() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '\u00A0'; // Sécurité : si canvas non supporté, fallback direct

      ctx.font = '16px sans-serif';
      
      // Mesure la largeur d'un caractère invalide (U+FFFF) générant le glyphe de remplacement par défaut ▯
      const largeurInvalide = ctx.measureText('\uFFFF').width;
      // Mesure la largeur de l'espace fine insécable
      const largeurFine = ctx.measureText('\u202F').width;

      // Si les largeurs sont identiques ou si la largeur est nulle, le système ne gère pas proprement le caractère
      if (largeurFine === largeurInvalide || largeurFine === 0) {
        return '\u00A0'; // Bascule sur l'espace insécable normale
      }
      return '\u202F'; // Le système supporte l'espace fine insécable
    } catch (e) {
      return '\u00A0'; // Fallback de sécurité en cas d'erreur
    }
  }

  // Assignation dynamique de l'espace haut selon le résultat du test de support
  const ESPACE_HAUTE = verifierSupportEspaceFine();

  function corrigerTypographieFrancaise(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    if (BALISES_A_EXCLURE.includes(element.tagName)) return;
    if (element.closest(`.${CLASSE_A_EXCLURE}`)) return;

    const codeLangue = element.getAttribute('lang');
    if (codeLangue && !codeLangue.startsWith('fr')) return;

    const estEnFrancais = element.closest('[lang^="fr"]') !== null;
    if (!estEnFrancais) return;

    // Traitement spécifique de la balise <time>
    if (element.tagName === 'TIME') {
      element.childNodes.forEach(noeud => {
        if (noeud.nodeType === Node.TEXT_NODE) {
          let texte = noeud.textContent;
          texte = texte.replace(/(?<=\d)\s*(h|min|s)(?=\s|\d|$)/gi, `${ESPACE_HAUTE}$1`);
          texte = texte.replace(/(?<=(h|min))\s*(?=\d)/gi, ESPACE_HAUTE);
          texte = texte.replace(/(?<=^|\s)(\d{1,2})\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_HAUTE}$2${ESPACE_HAUTE}$3`);
          texte = texte.replace(/(?<=^|\s)(1er)\s+([a-zéû]+)\s+(\d{4})(?=$|\s)/gi, `$1${ESPACE_HAUTE}$2${ESPACE_HAUTE}$3`);
          noeud.textContent = texte;
        }
      });
      return;
    }

    const estDansUnTableau = element.closest('table') !== null;

    element.childNodes.forEach(noeud => {
      if (noeud.nodeType === Node.TEXT_NODE) {
        let texte = noeud.textContent;

        // --- RÈGLE 1 : Apostrophes courbes
        texte = texte.replace(/(?<=\p{L})[''](?=\p{L})/gu, '’'); 
        
        // --- RÈGLE 2 : Ponctuation double
        texte = texte.replace(/\s*(:)/g, '\u00A0$1'); // Deux-points toujours en espace insécable normale
        texte = texte.replace(/\s*([;!?])/g, `${ESPACE_HAUTE}$1`); // Utilise la variable adaptative
        
        // --- RÈGLE 3 : Guillemets français
        texte = text.replace(/(^|[\s(])"\s*([^"\s][^"]*?)\s*"/g, `$1«${ESPACE_HAUTE}$2${ESPACE_HAUTE}»`);
        texte = texte.replace(/«\s*/g, `«${ESPACE_HAUTE}`);
        texte = texte.replace(/\s*»/g, `${ESPACE_HAUTE}»`);

        // --- RÈGLE 4 : Devises et Pourcentages
        texte = texte.replace(/(?<=\d)\s*([$€£¥₣₩元])/g, `${ESPACE_HAUTE}$1`);
        texte = texte.replace(/(?<=\d)\s*([%‰₱])/g, `${ESPACE_HAUTE}$1`);

        // --- RÈGLE 5 : Tirets de dialogue et d'incise (Espace insécable normale \u00A0 exigée)
        texte = texte.replace(/^(?:[-–—]\s*)/gm, '—\u00A0');
        texte = texte.replace(/\s+([-–—])\s+/g, ' –\u00A0');

        // --- RÈGLE 6 : Grands nombres
        texte = texte.replace(/\b\d+[\d\s]*\b/g, (nombreGlobal) => {
          let parties = nombreGlobal.split(/[,.]/);
          let partieEntiere = parties[0].replace(/\s/g, ''); 

          const seuilAtteint = estDansUnTableau ? (partieEntiere.length >= 4) : (partieEntiere.length >= 5);

          if (seuilAtteint) {
            partieEntiere = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_HAUTE);
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
          if (noeud.nodeType === Node.ELEMENT_NODE) corrigerTypographieFrancaise(noeud);
          else if (noeud.nodeType === Node.TEXT_NODE && noeud.parentElement) corrigerTypographieFrancaise(noeud.parentElement);
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
