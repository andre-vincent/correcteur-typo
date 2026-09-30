/* Correcteur ortho-typographique pour la langue française - Version 5.3 */

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
 * Fonction globale de correction des caractères et des espaces
 */
function corrigerTypographieFrancaiseComplete(text, estDansUnTableau = false) {
  if (!text) return "";

  let transforme = text
    // RÈGLE : Conversion des apostrophes droites (') en apostrophes courbes (’) uniquement entre deux lettres
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2');

  // RÈGLE : Espacement des milliers par blocs de 3 (espace fine insécable \u202F)
  transforme = formaterNombresFrancais(transforme, estDansUnTableau);

  transforme = transforme
    // RÈGLE : Devises et symboles (€, $, %, etc.) précédés d'une espace fine insécable (\u202F)
    .replace(/(\d)[\s\u00A0\u202F]?([€$£¥%‰])/g, '$1\u202F$2')

    // RÈGLE : Unités de mesure physiques (cm, kg, km/h, etc.) précédées d'une espace fine insécable (\u202F)
    .replace(/(\d)[\s\u00A0\u202F]?(m|cm|mm|km|g|kg|t|L|ml|km\/h|kg\/h|°C|°F|Hz|W|kW|Wh|kWh)\b/g, '$1\u202F$2')

    // RÈGLE : Abréviations de civilité et titres (M., Mme, etc.) suivis d'une espace insécable standard (\u00A0)
    // Prise en charge des pluriels (Mmes, Mlles, Drs, Mes, Mgrs) dans la détection des espacements
    .replace(/\b(M\.|Mme|Mmes|Mlle|Mlles|Dr|Drs|Me|Mes|Mgr|Mgrs|Cie|Cies)[\s\u00A0\u202F]?(\p{L})/gu, '$1\u00A0$2')

    // RÈGLE : Dialogues - Conversion des tirets simples/doubles en début de ligne par un tiret cadratin (—) + espace insécable standard (\u00A0)
    .replace(/^(?:--|-|—)\s*/gm, '—\u00A0')

    // RÈGLE : Incises (ouvrantes) - Tiret demi-cadratin (–) + espace insécable standard (\u00A0) après
    .replace(/(\s)(?:--|-|—)(\s)/g, '$1–\u00A0')

    // RÈGLE : Incises (fermantes) - Tiret demi-cadratin (–) précédé d'une espace insécable standard (\u00A0)
    .replace(/(\s)(?:--|-|—)([\s,.?!;:]|$)/g, '\u00A0–$2')

    // RÈGLE : Guillemets ouvrants - Conversion du guillemet droit (") en « suivi d'une espace fine insécable (\u202F)
    .replace(/(^|\s)"\s*/g, '$1«\u202F')

    // RÈGLE : Guillemets fermants - Conversion du guillemet droit (") en » précédé d'une espace fine insécable (\u202F)
    .replace(/\s*"/g, '\u202F»')

    // RÈGLE : Sécurité guillemets existants (ouvrants) - Harmonisation de l'espace fine insécable (\u202F)
    .replace(/(«)[\s\u00A0\u202F]?(.*?)/g, '$1\u202F$2')

    // RÈGLE : Sécurité guillemets existants (fermants) - Harmonisation de l'espace fine insécable (\u202F)
    .replace(/[\s\u00A0\u202F]?(»)/g, '\u202F$1')

    // RÈGLE : Ponctuation double (!, ?, ;) - Espace fine insécable (\u202F) directement devant le signe
    .replace(/[\s\u00A0\u202F]?([!?;&])/g, '\u202F$1')

    // RÈGLE : Deux-points (:) - Espace insécable standard (\u00A0) pour détacher visuellement ce signe haut
    .replace(/[\s\u00A0\u202F]?(:)/g, '\u00A0$1');

  return transforme;
}

/**
 * Enrichit sémantiquement le texte avec des balises <abbr> pour la casse et <sup> pour les ordinaux et civilités
 * @param {string} htmlText - Le texte déjà typographié
 * @returns {string} - Le code HTML enrichi
 */
function enrichirStructureSemantique(htmlText) {
  return htmlText
    // RÈGLE : Siècles en chiffres romains - Chiffre dans <abbr> (petites capitales) et suffixe dans <sup> (exposant)
    // Supporte également les formes plurielles (ex: XXIes)
    .replace(/\b([IVXLCDM]+)(er|e|es)\b/g, '<abbr>$1</abbr><sup>$2</sup>')
    
    // RÈGLE : Chiffres arabes ordinaux - Suffixe (er, re, e, ers, res) enveloppé dans <sup> (exposant)
    .replace(/\b(\d+)(er|re|e|ers|res)\b/g, '$1<sup>$2</sup>')

    // RÈGLE : Abréviations de civilité contractées singulières et plurielles - Met l'ensemble du suffixe final (me, mes, lle, lles, e, es, gr, grs) en exposant via <sup>
    .replace(/\b(M)(mes|me)\b/g, '$1<sup>$2</sup>')
    .replace(/\b(M)(lles|lle)\b/g, '$1<sup>$2</sup>')
    .replace(/\b(M)(es|e)\b/g, '$1<sup>$2</sup>')
    .replace(/\b(M)(grs|gr)\b/g, '$1<sup>$2</sup>')
    
    // RÈGLE : Détection de 2 majuscules consécutives ou plus (sigles/acronymes) pour mise en petites capitales
    .replace(/\b(\p{Lu}{2,})\b/gu, '<abbr>$1</abbr>');
}

/**
 * Moteur d'automatisation et de mutation du DOM
 */
function appliquerTypographieAutomatique() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const noeudsATraiter = [];
  let currentNode;

  while (currentNode = walker.nextNode()) {
    noeudsATraiter.push(currentNode);
  }

  noeudsATraiter.forEach((node) => {
    const parentNode = node.parentNode;
    if (!parentNode) return;

    const parentTag = parentNode.tagName;

    if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE' && parentTag !== 'CODE' && parentTag !== 'TEXTAREA' && parentTag !== 'ABBR' && parentTag !== 'SUP') {
      
      if (parentNode.closest('.no-typo')) return;

      const elementAvecLangue = parentNode.closest('[lang]');
      const langueDuContexte = elementAvecLangue ? elementAvecLangue.getAttribute('lang').toLowerCase() : '';
      
      if (langueDuContexte.startsWith('fr')) {
        const estDansUnTableau = !!parentNode.closest('td');
        
        let texteCorrige = corrigerTypographieFrancaiseComplete(node.nodeValue, estDansUnTableau);
        let htmlEnrichi = enrichirStructureSemantique(texteCorrige);

        if (htmlEnrichi !== texteCorrige) {
          const template = document.createElement('template');
          template.innerHTML = htmlEnrichi;
          parentNode.replaceChild(template.content, node);
        } else {
          if (node.nodeValue !== texteCorrige) {
            node.nodeValue = texteCorrige;
          }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", appliquerTypographieAutomatique);
