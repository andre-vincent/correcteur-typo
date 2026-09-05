/* Correcteur ortho-typographique pour la langue française - Version 4 */

/**
 * Formate les nombres selon les règles de l'Imprimerie Nationale
 * @param {string} text - Le texte brut à analyser
 * @param {boolean} estDansUnTableau - Si vrai, formate dès 4 chiffres. Si faux, dès 5 chiffres.
 * @returns {string} - Le texte avec les espaces fines insécables
 */
function formaterNombresFrancais(text, estDansUnTableau = false) {
  return text.replace(/\b\d+(?:\s\d+)*\b/g, (match) => {
    const nombreBrut = match.replace(/\s/g, '');
    const limiteChiffres = estDansUnTableau ? 4 : 5;

    if (nombreBrut.length < limiteChiffres) {
      return nombreBrut;
    }

    return nombreBrut.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  });
}

/**
 * Fonction globale incluant toute la typographie française, devises, unités, abréviations et tirets
 */
function corrigerTypographieFrancaiseComplete(text, estDansUnTableau = false) {
  if (!text) return "";

  let transforme = text
    // RÈGLE : Conversion des apostrophes droites (') en apostrophes courbes (’) uniquement entre deux lettres (élisions)
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2');

  // RÈGLE : Espacement des milliers par blocs de 3 (espace fine insécable \u202F). Dès 5 chiffres en texte continu, dès 4 chiffres en tableau (cellules td).
  transforme = formaterNombresFrancais(transforme, estDansUnTableau);

  transforme = transforme
    // RÈGLE : Devises et symboles (€, $, %, etc.) précédés d'une espace fine insécable (\u202F) pour rester soudés au nombre
    .replace(/(\d)[\s\u00A0\u202F]?([€$£¥%‰])/g, '$1\u202F$2')

    // RÈGLE : Unités de mesure physiques (cm, kg, km/h, etc.) précédées d'une espace fine insécable (\u202F) sans altérer les mots ordinaires
    .replace(/(\d)[\s\u00A0\u202F]?(m|cm|mm|km|g|kg|t|L|ml|km\/h|kg\/h|°C|°F|Hz|W|kW|Wh|kWh)\b/g, '$1\u202F$2')

    // RÈGLE : Abréviations de civilité et titres (M., Mme, Dr, Cie, etc.) suivis d'une espace insécable standard (\u00A0) pour ne pas être séparés du nom
    .replace(/\b(M\.|Mme|Mlle|Dr|Me|Mgr|Cie)[\s\u00A0\u202F]?(\p{L})/gu, '$1\u00A0$2')

    // RÈGLE : Dialogues - Conversion des tirets simples ou doubles en début de ligne par un tiret cadratin (—) suivi d'une espace insécable standard (\u00A0)
    .replace(/^(?:--|-|—)\s*/gm, '—\u00A0')

    // RÈGLE : Incises (ouvrantes) - Remplacement des tirets isolés au milieu d'une phrase par un tiret demi-cadratin (–) suivi d'une espace insécable standard (\u00A0)
    .replace(/(\s)(?:--|-|—)(\s)/g, '$1–\u00A0')

    // RÈGLE : Incises (fermantes) - Ajustement du tiret demi-cadratin (–) pour qu'il soit précédé d'une espace insécable standard (\u00A0) avant une ponctuation ou une espace
    .replace(/(\s)(?:--|-|—)([\s,.?!;:]|$)/g, '\u00A0–$2')

    // RÈGLE : Guillemets ouvrants - Conversion du guillemet droit (") en guillemet français ouvrant («) suivi d'une espace fine insécable (\u202F)
    .replace(/(^|\s)"\s*/g, '$1«\u202F')

    // RÈGLE : Guillemets fermants - Conversion du guillemet droit restants (") en guillemet français fermant (») précédé d'une espace fine insécable (\u202F)
    .replace(/\s*"/g, '\u202F»')

    // RÈGLE : Sécurité guillemets existants (ouvrants) - Harmonisation de l'espace fine insécable (\u202F) après un guillemet français ouvrant préexistant
    .replace(/(«)[\s\u00A0\u202F]?(.*?)/g, '$1\u202F$2')

    // RÈGLE : Sécurité guillemets existants (fermants) - Harmonisation de l'espace fine insécable (\u202F) avant un guillemet français fermant préexistant
    .replace(/[\s\u00A0\u202F]?(»)/g, '\u202F$1')

    // RÈGLE : Ponctuation double (!, ?, ;) - Insertion ou correction d'une espace fine insécable (\u202F) directement devant le signe
    .replace(/[\s\u00A0\u202F]?([!?;&])/g, '\u202F$1')

    // RÈGLE : Deux-points (:) - Insertion ou correction d'une espace insécable standard (\u00A0) pour détacher visuellement ce signe haut
    .replace(/[\s\u00A0\u202F]?(:)/g, '\u00A0$1');

  return transforme;
}

/**
 * Script d'automatisation qui parcourt le DOM de la page
 */
function appliquerTypographieAutomatique() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let currentNode;

  while (currentNode = walker.nextNode()) {
    const parentNode = currentNode.parentNode;
    if (!parentNode) continue;

    const parentTag = parentNode.tagName;

    // Éviter d'altérer le code, les styles ou les zones de saisie utilisateur
    if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'CODE' && parentTag !== 'TEXTAREA') {
      
      // Exclusion si l'élément (ou un parent) porte la classe 'no-typo'
      if (parentNode.closest('.no-typo')) {
        continue;
      }

      // Application stricte si la langue de l'élément (ou d'un parent) commence par 'fr'
      const elementAvecLangue = parentNode.closest('[lang]');
      const langueDuContexte = elementAvecLangue ? elementAvecLangue.getAttribute('lang').toLowerCase() : '';
      
      if (langueDuContexte.startsWith('fr')) {
        const estDansUnTableau = !!parentNode.closest('td');
        currentNode.nodeValue = corrigerTypographieFrancaiseComplete(currentNode.nodeValue, estDansUnTableau);
      }
    }
  }
}

// Exécution au chargement complet du DOM
document.addEventListener("DOMContentLoaded", appliquerTypographieAutomatique);
