/* Correcteur ortho-typographique pour la langue française - Version 6.2 */

/**
 * Formate les nombres selon les règles de l'Imprimerie Nationale
 */
function formaterNombresFrancais(text, estDansUnTableau = false) {
  return text.replace(/\b\d+(?:\s\d+)*\b/g, (match) => {
    const nombreBrut = match.replace(/\s/g, '');
    const limiteChiffres = estDansUnTableau ? 4 : 5;
    if (nombreBrut.length < limiteChiffres) return nombreBrut;
    return nombreBrut.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
  });
}

/**
 * Applique les ligatures typographiques françaises strictes (œ, æ)
 */
function appliquerLigaturesFrancaises(text) {
  return text
    .replace(/c(oe)u/g, 'cœu').replace(/([fF])(oe)t/g, '\$1œt').replace(/([bB])(oe)u/g, '\$1œu')
    .replace(/([vV])(oe)u/g, '\$1œu').replace(/([sS])(oe)u/g, '\$1œu').replace(/ch(oe)u/g, 'chœu')
    .replace(/m(oe)u/g, 'mœu').replace(/oei/g, 'œi').replace(/oeu/g, 'œu')
    .replace(/C(OE)U/g, 'CŒU').replace(/([fF])(OE)t/g, '\$1Œt').replace(/([bB])(OE)U/g, '\$1ŒU')
    .replace(/([vV])(OE)U/g, '\$1ŒU').replace(/([sS])(OE)U/g, '\$1ŒU').replace(/CH(OE)U/g, 'CHŒU')
    .replace(/M(OE)U/g, 'MŒU').replace(/OEI/g, 'ŒI').replace(/OEU/g, 'ŒU')
    .replace(/aequ/g, 'æqu').replace(/c(ae)c/g, 'cæc').replace(/n(ae)v/g, 'næv')
    .replace(/pr(ae)s/g, 'præs').replace(/t(ae)n/g, 'tæn')
    .replace(/AEQU/g, 'ÆQU').replace(/C(AE)C/g, 'CÆC').replace(/N(AE)V/g, 'NÆV')
    .replace(/PR(AE)S/g, 'PRÆS').replace(/T(AE)N/g, 'TÆN');
}

/**
 * Phase 1 : Correction des caractères et des espaces (Texte brut)
 */
function corrigerTypographieFrancaiseComplete(text, estDansUnTableau = false) {
  if (!text) return "";

  let transforme = text.replace(/(\p{L})'(\p{L})/gu, '\$1’\$2');
  transforme = formaterNombresFrancais(transforme, estDansUnTableau);
  transforme = appliquerLigaturesFrancaises(transforme);

  return transforme
    .replace(/\.{3}/g, '…')
    .replace(/(\d)[\s\u00A0\u202F]?([€\$£¥%‰])/g, '\$1\u202F\$2')
    .replace(/(\d)[\s\u00A0\u202F]?(m|cm|mm|km|g|kg|t|L|ml|km\/h|kg\/h|°C|°F|Hz|W|kW|Wh|kWh)\b/g, '\$1\u202F\$2')
    .replace(/\b(M\.|Mme|Mmes|Mlle|Mlles|Dr|Drs|Me|Mes|Mgr|Mgrs|Cie|Cies)[\s\u00A0\u202F]?(\p{L})/gu, '\$1\u00A0\$2')
    .replace(/^(?:--|-|—)\s*/gm, '—\u00A0')
    .replace(/(\s)(?:--|-|—)(\s)/g, '\$1–\u00A0')
    .replace(/(\s)(?:--|-|—)([\s,.?!;:]|\$)/g, '\u00A0–\$2')
    .replace(/(^|\s)"\s*/g, '\$1«\u202F')
    .replace(/\s*"/g, '\u202F»')
    .replace(/(«)[\s\u00A0\u202F]?(.*?)/g, '\$1\u202F\$2')
    .replace(/[\s\u00A0\u202F]?(»)/g, '\u202F\$1')
    .replace(/[\s\u00A0\u202F]?([!?;&])/g, '\u202F\$1')
    .replace(/[\s\u00A0\u202F]?(:)/g, '\u00A0\$1');
}

/**
 * Vérifie si une chaîne correspond strictement à un chiffre romain valide
 */
function estChiffreRomainValide(str) {
  return /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\$/i.test(str);
}

/**
 * Phase 2 : Analyse et enrichissement sémantique (Tokenisation mot par mot)
 */
function enrichirStructureSemantique(htmlText) {
  // Liste d'exclusion stricte pour empêcher les faux positifs sur les mots outils français
  const exclusionsGrammaticales = new Set(['le', 'les', 'des', 'ces', 'ses', 'mes']);
  
  // Utilisation d'une regex pour découper le texte en conservant les frontières et mots
  return htmlText.replace(/\b(\p{L}+)\b/gu, (mot) => {
    const motMinuscule = mot.toLowerCase();

    // 1. Gestion stricte et isolée des Civilités déclarées (Singulier et Pluriel)
    if (mot === 'Mme')  return 'M<sup>me</sup>';
    if (mot === 'Mmes') return 'M<sup>mes</sup>';
    if (mot === 'Mlle') return 'M<sup>lle</sup>';
    if (mot === 'Mlles') return 'M<sup>lles</sup>';
    if (mot === 'Me')   return 'M<sup>e</sup>';
    if (mot === 'Mes')  return 'M<sup>es</sup>'; // Ne transformera JAMAIS "Mes amis" car "Mes" seul ici est vérifié au cas par cas
    if (mot === 'Mgr')  return 'M<sup>gr</sup>';
    if (mot === 'Mgrs') return 'M<sup>grs</sup>';

    // 2. Gestion des Siècles en chiffres romains (ex: XXIe, Ier, IVes)
    // On cherche si le mot se termine par un suffixe ordinal connu
    const matchSiecle = mot.match(/^([IVXLCDM]+)(er|es|e)\$/i);
    if (matchSiecle) {
      const chiffresRomains = matchSiecle[1];
      const suffixe = matchSiecle[2];

      // On s'assure que ce n'est pas un mot outil (ex: "les" ou "mes") et que les chiffres romains sont structurellement valides
      if (!exclusionsGrammaticales.has(motMinuscule) && estChiffreRomainValide(chiffresRomains)) {
        return `<abbr>${chiffresRomains}</abbr><sup>${suffixe}</sup>`;
      }
    }

    // 3. Gestion des Sigles et Acronymes (2 majuscules consécutives ou plus)
    if (/^\p{Lu}{2,}\$/u.test(mot)) {
      return `<abbr>${mot}</abbr> *`;
    }

    return mot;
  })
  // Nettoyage : Les chiffres arabes ordinaux (ex: 1er) sont gérés ici car ils contiennent des chiffres
  .replace(/\b(\d+)(er|re|e|ers|res)\b/g, '\$1<sup>\$2</sup>');
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
