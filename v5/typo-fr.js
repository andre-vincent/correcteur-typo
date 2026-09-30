/* Correcteur ortho-typographique pour la langue française - Version 5.8 */

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
 * Applique les ligatures typographiques françaises strictes (œ, æ)
 * @param {string} text - Le texte brut à analyser
 * @returns {string} - Le texte avec les ligatures appliquées
 */
function appliquerLigaturesFrancaises(text) {
  return text
    // LIGATURES Œ (Minuscules)
    .replace(/c(oe)u/g, 'cœu').replace(/([fF])(oe)t/g, '$1œt').replace(/([bB])(oe)u/g, '$1œu')
    .replace(/([vV])(oe)u/g, '$1œu').replace(/([sS])(oe)u/g, '$1œu').replace(/ch(oe)u/g, 'chœu')
    .replace(/m(oe)u/g, 'mœu').replace(/oei/g, 'œi').replace(/oeu/g, 'œu')
    // LIGATURES Œ (Majuscules)
    .replace(/C(OE)U/g, 'CŒU').replace(/([fF])(OE)t/g, '$1Œt').replace(/([bB])(OE)U/g, '$1ŒU')
    .replace(/([vV])(OE)U/g, '$1ŒU').replace(/([sS])(OE)U/g, '$1ŒU').replace(/CH(OE)U/g, 'CHŒU')
    .replace(/M(OE)U/g, 'MŒU').replace(/OEI/g, 'ŒI').replace(/OEU/g, 'ŒU')
    
    // LIGATURES Æ
    .replace(/aequ/g, 'æqu').replace(/c(ae)c/g, 'cæc').replace(/n(ae)v/g, 'næv')
    .replace(/pr(ae)s/g, 'præs').replace(/t(ae)n/g, 'tæn')
    .replace(/AEQU/g, 'ÆQU').replace(/C(AE)C/g, 'CÆC').replace(/N(AE)V/g, 'NÆV')
    .replace(/PR(AE)S/g, 'PRÆS').replace(/T(AE)N/g, 'TÆN');
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

  // RÈGLE : Application des ligatures sémantiques françaises (œ, æ)
  transforme = appliquerLigaturesFrancaises(transforme);

  transforme = transforme
    // RÈGLE : Remplacement automatique des trois points successifs par le glyphe officiel de points de suspension (…)
    .replace(/\.{3}/g, '…')

    // RÈGLE : Devises et symboles (€, $, %, etc.) précédés d'une espace fine insécable (\u202F)
    .replace(/(\d)[\s\u00A0\u202F]?([€$£¥%‰])/g, '$1\u202F$2')

    // RÈGLE : Unités de mesure physiques (cm, kg, km/h, etc.) précédées d'une espace fine insécable (\u202F)
    .replace(/(\d)[\s\u00A0\u202F]?(m|cm|mm|km|g|kg|t|L|ml|km\/h|kg\/h|°C|°F|Hz|W|kW|Wh|kWh)\b/g, '$1\u202F$2')

    // RÈGLE : Abréviations de civilité et titres (M., Mme, etc.) suivis d'une espace insécable standard (\u00A0)
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
    // RÈGLE SÉCURISÉE SIÈCLES : Capture les chiffres romains mais EXCLUT formellement le mot "Le" ou "Les" (L seul suivi de e/es)
    .replace(/\b(?![lL](?:es|e)\b)([IVXLCDM]+)(er|es|e)\b/g, '<abbr>$1</abbr><sup>$2</sup>')
    
    // RÈGLE : Chiffres arabes ordinaux - Suffixe (er, re, e, ers, res) enveloppé dans <sup> (exposant)
    .replace(/\b(\d+)(er|re|e|ers|res)\b/g, '$1<sup>$2</sup>')

    // CORRECTION ARCHITECTURE DES CIVILITÉS : Capture de l'intégralité sémantique du suffixe pour une inclusion hermétique dans SUP
    .replace(/\bM(mes)\b/g, 'M<sup>$1</sup>')
    .replace(/\bM(me)\b/g, 'M<sup>$1</sup>')
    .replace(/\bM(lles)\b/g, 'M<sup>$1</sup>')
    .replace(/\bM(lle)\b/g, 'M<sup>$1</sup>')
    .replace(/\bM(es)\b/g, 'M<sup>$1</sup>')
    .replace(/\bM(e)\b/g, 'M<sup>$1</sup>')
    .replace(/\bM(grs)\b/g, 'M<sup>$1</sup>')
    .replace(/\bM(gr)\b/g, 'M<sup>$1</sup>')
    
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
