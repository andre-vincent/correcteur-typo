/**

- Correcteur typographique français
- -----
- Applique les règles de typographie française soignée à tout élément
- possédant l’attribut lang=“fr” (ou une variante fr-FR, fr-CA, etc.)
- ainsi qu’à ses descendants, à l’exception :
- - des éléments <script> et <style>
- - des éléments de formulaire (<input>, <textarea>, <select>, <option>,
- ```
  <button>) et de leurs valeurs / placeholders
  ```
- - des éléments explicitement marqués lang=“xx” différent du français
- ```
  (on ne redescend pas dans une sous-arborescence en langue étrangère)
  ```
- - des éléments avec [contenteditable] (on ne modifie pas ce que
- ```
  l'utilisateur est en train de saisir)
  ```
- - des éléments marqués data-no-typo (échappatoire manuelle)
- 
- Règles appliquées (texte visible uniquement, via les nœuds texte) :
- 1. Espace insécable AVANT : ; ? !  (fine avant ; ? ! ; normale avant :)
- 1. Espaces insécables autour des guillemets français « »
- ```
   (fine après « et avant »)
  ```
- 1. Conversion des guillemets droits “…” en guillemets français « »
- ```
   (avec gestion naïve mais robuste de l'imbrication simple)
  ```
- 1. Conversion de l’apostrophe droite ’ en apostrophe typographique ’
- 1. Espace insécable dans les nombres (séparateur de milliers) et
- ```
   entre un nombre et son unité / symbole (%, €, kg, km/h, etc.)
  ```
- ```
   — le style d'espace avant % est configurable (fine / normale /
  ```
- ```
   aucune) via TypoFr.configure({ espacePourcent: '...' })
  ```
- 1. Espace insécable après M., Mme, Mlle, Dr, art., n°, vol., p., etc.
- ```
   et avant les initiales/nom qui suivent
  ```
- 1. Espace insécable dans “n° X”, “p. X”, “vol. X”
- 1. Tirets d’incise : conversion de “ - “ en tiret demi-cadratin “ – “
- ```
   avec espace insécable avant (mots composés du type "peut-être"
  ```
- ```
   jamais affectés, car jamais entourés d'espaces) ; le tiret en
  ```
- ```
   tout début de nœud texte ("- Bonjour !") est traité comme un
  ```
- ```
   tiret de dialogue et converti en cadratin "—". Désactivable via
  ```
- ```
   TypoFr.configure({ tiretsIncise: false }).
  ```
- 1. Nombres ordinaux (1er, 1re, 2e, 21e, 3ème…) : le suffixe est mis
- ```
   en exposant via un élément <sup> inséré dans le DOM. Désactivable
  ```
- ```
   via TypoFr.configure({ ordinauxExposant: false }).
  ```
- 1. Nettoyage des espaces multiples et normalisation avant ponctuation
- 1. Espace insécable entre chiffres et % / € / unités usuelles
- 
- Le script est idempotent : on peut l’exécuter plusieurs fois sans
- dégrader le texte ni le DOM (il ne réinsère pas d’espace s’il y en a
- déjà une, ne reconvertit pas des guillemets déjà français, et ne
- ré-enveloppe pas un ordinal déjà mis en exposant — les éléments <sup>
- et <sub> sont explicitement exclus du parcours).
- 
- Configuration :
- TypoFr.configure({
- ```
  espacePourcent: 'fine' | 'normale' | 'aucune', // défaut : 'fine'
  ```
- ```
  tiretsIncise: true | false,                     // défaut : true
  ```
- ```
  ordinauxExposant: true | false                  // défaut : true
  ```
- });
- 
- Usage :
- <script src="typo-fr.js"></script>
- <script>
- ```
  TypoFr.apply();                 // applique une fois sur tout le document
  ```
- ```
  TypoFr.apply(document.body);    // applique sur un sous-arbre précis
  ```
- ```
  TypoFr.observe();                // applique + observe les mutations futures
  ```
- </script>

*/
(function (global) {
‘use strict’;

// ———————————————————————
// Constantes
// ———————————————————————

var NBSP = ‘\u00A0’;   // espace insécable
var NNBSP = ‘\u202F’;  // espace fine insécable
var GUIL_O = ‘\u00AB’; // «
var GUIL_F = ‘\u00BB’; // »
var APOS = ‘\u2019’;   // ’
var TIRET_DEMI = ‘\u2013’;     // – (demi-cadratin, incise)
var TIRET_CADRATIN = ‘\u2014’; // — (cadratin, dialogue)

// Options par défaut, surchargeables via TypoFr.configure({…})
var OPTIONS = {
// Style d’espace avant le signe % :
//   ‘fine’   -> espace fine insécable (Imprimerie nationale, recommandé)
//   ‘normale’-> espace insécable normale (certains styles web)
//   ‘aucune’ -> collé au nombre, style anglo-saxon toléré en France
espacePourcent: ‘fine’,
// Active/désactive la conversion des tirets d’incise “ - “ en “–”
tiretsIncise: true,
// Active/désactive la mise en exposant des ordinaux (1er, 2e…)
ordinauxExposant: true
};

// Tags dont le contenu ne doit jamais être touché (contenu non textuel
// au sens typographique, ou zones d’édition / de code).
var EXCLUDED_TAGS = {
SCRIPT: true,
STYLE: true,
TEXTAREA: true,
INPUT: true,
SELECT: true,
OPTION: true,
BUTTON: true,
OPTGROUP: true,
NOSCRIPT: true,
CODE: true,
PRE: true,
KBD: true,
SAMP: true,
VAR: true,
SUP: true,
SUB: true
};

// Unités usuelles pour lesquelles on insère une espace insécable
// entre le nombre et l’unité.
var UNITES = [
‘kg’, ‘g’, ‘mg’, ‘t’,
‘km’, ‘m’, ‘cm’, ‘mm’,
‘km/h’, ‘m/s’,
‘h’, ‘min’, ‘s’, ‘ms’,
‘l’, ‘ml’, ‘cl’,
‘Hz’, ‘kHz’, ‘MHz’, ‘GHz’,
‘Ko’, ‘Mo’, ‘Go’, ‘To’,
‘W’, ‘kW’, ‘V’, ‘A’,
‘°C’, ‘°F’, ‘°’
];

// Abréviations après lesquelles on force une espace insécable
// (avant le mot/l’élément qui suit).
var ABREVIATIONS = [
‘M’, ‘Mme’, ‘Mlle’, ‘MM’, ‘Mmes’,
‘Dr’, ‘Pr’, ‘Me’,
‘St’, ‘Ste’,
‘art’, ‘vol’, ‘chap’, ‘fig’, ‘éd’, ‘ex’, ‘cf’, ‘etc’
];

// ———————————————————————
// Détection de la portée “français”
// ———————————————————————

/**

- Détermine si un élément est en contexte français au sens de lang.
- On regarde l’attribut lang le plus proche (héritage naturel du DOM).
  */
  function closestLang(node) {
  var el = node.nodeType === 1 ? node : node.parentElement;
  while (el) {
  var lang = el.getAttribute && el.getAttribute(‘lang’);
  if (lang) return lang;
  el = el.parentElement;
  }
  return null;
  }

function isFrench(lang) {
return !!lang && /^fr(-|$)/i.test(lang);
}

// ———————————————————————
// Parcours du DOM et sélection des nœuds texte éligibles
// ———————————————————————

/**

- Collecte tous les nœuds texte à traiter à partir d’un élément racine.
- root doit lui-même être (ou contenir) un élément lang=“fr”.
  */
  function collectTextNodes(root) {
  var results = [];

```
var walker = document.createTreeWalker(
  root,
  NodeFilter.SHOW_TEXT,
  {
    acceptNode: function (node) {
      var parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;

      // Exclusion par tag
      if (EXCLUDED_TAGS[parent.tagName]) {
        return NodeFilter.FILTER_REJECT;
      }

      // Exclusion explicite (élément ou ancêtre)
      if (parent.closest('[data-no-typo]') || parent.closest('.no-typo')) {
        return NodeFilter.FILTER_REJECT;
      }

      // Exclusion des zones éditables
      if (parent.isContentEditable) {
        return NodeFilter.FILTER_REJECT;
      }

      // La langue effective (lang le plus proche) doit être française
      var lang = closestLang(parent);
      if (!isFrench(lang)) {
        return NodeFilter.FILTER_REJECT;
      }

      // Ignorer les nœuds vides / uniquement blancs sans intérêt
      if (!node.nodeValue || !/\S/.test(node.nodeValue)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  }
);

var n;
while ((n = walker.nextNode())) {
  results.push(n);
}
return results;
```

}

// ———————————————————————
// Règles typographiques (opèrent sur une chaîne)
// ———————————————————————

/**

- Convertit les guillemets droits en guillemets français.
- Gère un seul niveau d’imbrication proprement ; au-delà, on alterne
- simplement ouvrant/fermant, ce qui couvre l’immense majorité des cas.
  */
  function convertGuillemets(str) {
  var open = true;
  return str.replace(/”/g, function () {
  var ch = open ? GUIL_O : GUIL_F;
  open = !open;
  return ch;
  });
  }

/**

- Convertit l’apostrophe droite ’ en apostrophe typographique ’.
- On ne touche pas aux apostrophes déjà typographiques.
  */
  function convertApostrophes(str) {
  return str.replace(/’/g, APOS);
  }

/**

- Espaces autour des guillemets français déjà présents (ou tout juste
- convertis) : espace fine insécable collée au texte à l’intérieur.
  */
  function spaceGuillemets(str) {
  // Après « : espace fine insécable (remplace toute espace existante,
  // ne duplique jamais)
  str = str.replace(new RegExp(GUIL_O + ‘[ \t’ + NNBSP + ’]*’, ‘g’), GUIL_O + NNBSP);
  // Avant » : espace fine insécable
  str = str.replace(new RegExp(’[ \t’ + NNBSP + ‘]*’ + GUIL_F, ‘g’), NNBSP + GUIL_F);
  return str;
  }

/**

- Convertit les tirets d’incise “ - “ (tiret court entouré d’espaces)
- en tiret demi-cadratin “ – “ avec espace insécable avant.
- Ne touche pas :
- - aux traits d’union internes aux mots (peut-être, arc-en-ciel)
- ```
  car ceux-ci ne sont jamais entourés d'espaces
  ```
- - aux tirets de dialogue en début de ligne/paragraphe (gérés à part,
- ```
  de façon plus prudente, car le contexte "début de ligne" dans un
  ```
- ```
  nœud texte isolé du DOM est ambigu : on ne le fait que si le tiret
  ```
- ```
  est le tout premier caractère non blanc du nœud texte)
  ```
- - aux tirets déjà typographiques (–, —) déjà bien espacés
    */
    function convertTiretsIncise(str) {
    // Tiret de dialogue : uniquement si le nœud commence par “- “ ou “– “
    str = str.replace(/^([ \t]*)[-\u2013][ \t]+/, function (m, indent) {
    return indent + TIRET_CADRATIN + NBSP;
    });

```
// Tiret d'incise au milieu du texte : "mot - mot" ou "mot – mot"
// (espace insécable avant, espace normale sécable après, usage courant)
// Le [ \t\u00A0]* en entrée absorbe aussi bien une espace normale
// qu'une espace insécable déjà posée par un passage précédent,
// ce qui rend l'opération idempotente.
str = str.replace(/([^\s])[ \t\u00A0]*[-\u2013][ \t]+(?=[^\s])/g, function (m, before) {
  return before + NBSP + TIRET_DEMI + ' ';
});

return str;
```

}

/**

- Espace insécable avant : ; ? !
- - avant ‘:’ -> espace insécable normale (usage traditionnel français)
- - avant ‘;’, ‘?’, ‘!’ -> espace fine insécable
- On ne touche pas aux ‘:’ faisant partie d’une heure (12:30), d’une URL
- (http://) ou d’un smiley, ni aux ‘!’ / ‘?’ répétés type “?!” déjà espacés.
  */
  function spacePonctuationHaute(str) {
  // Protéger les heures (12:30), URL (http://, https://) et émoticônes
  var protégés = [];
  str = str.replace(/\b\d{1,2}:\d{2}\b/g, function (m) {
  protégés.push(m);
  return ‘\u0000’ + (protégés.length - 1) + ‘\u0000’;
  });
  str = str.replace(/\b\w+:///g, function (m) {
  protégés.push(m);
  return ‘\u0000’ + (protégés.length - 1) + ‘\u0000’;
  });

```
// ; ? ! (éventuellement répétés/combinés, ex: "?!", "!!!") -> une seule
// espace fine insécable avant tout le groupe, aucune espace à l'intérieur.
// Le groupe n'est jamais précédé lui-même d'un ; ? ! (pour ne pas
// re-matcher un sous-groupe au sein d'une séquence déjà traitée).
str = str.replace(/([^\s\u00A0\u202F;?!])[ \t\u00A0\u202F]*([;?!]+)/g, function (m, before, group) {
  return before + NNBSP + group;
});

// : -> espace insécable normale avant (hors heures/URL déjà protégées)
str = str.replace(/([^\s\u00A0\u202F])[ \t]*:/g, function (m, before) {
  return before + NBSP + ':';
});

// Restaurer les segments protégés
str = str.replace(/\u0000(\d+)\u0000/g, function (m, i) {
  return protégés[parseInt(i, 10)];
});

return str;
```

}

/**

- Espace insécable dans les nombres à 4 chiffres et plus (séparateur de
- milliers), et entre un nombre et une unité connue.
  */
  function spaceNombres(str) {
  // Séparateur de milliers : 1 234 567 (on respecte les groupes de 3)
  str = str.replace(/\b(\d{1,3})((?:[ \u00A0\u202F]?\d{3})+)\b/g, function (m, first, rest) {
  var groups = rest.match(/\d{3}/g) || [];
  return first + groups.map(function (g) { return NBSP + g; }).join(’’);
  });

```
// Nombre + % (style configurable via OPTIONS.espacePourcent)
var espacePct = OPTIONS.espacePourcent === 'aucune' ? ''
  : OPTIONS.espacePourcent === 'normale' ? NBSP
  : NNBSP; // 'fine' par défaut
str = str.replace(/(\d)[ \t\u00A0\u202F]*%/g, '$1' + espacePct + '%');

// Nombre + unité connue
var unitesPattern = UNITES
  .slice()
  .sort(function (a, b) { return b.length - a.length; }) // plus longues d'abord
  .map(function (u) { return u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
  .join('|');
var reUnite = new RegExp('(\\d)[ \\t]?(' + unitesPattern + ')\\b', 'g');
str = str.replace(reUnite, function (m, num, unite) {
  return num + NBSP + unite;
});

// Nombre + € (avant ou après selon usage ; on gère "12 €")
str = str.replace(/(\d)[ \t]*€/g, '$1' + NBSP + '€');

return str;
```

}

/**

- Espace insécable après certaines abréviations courantes (M., Dr, etc.)
  */
  function spaceAbreviations(str) {
  var abrevPattern = ABREVIATIONS
  .map(function (a) { return a.replace(/[.*+?^${}()|[]\]/g, ‘\$&’); })
  .join(’|’);
  var re = new RegExp(’\b(’ + abrevPattern + ‘)\.[ \t]+(?=\S)’, ‘g’);
  str = str.replace(re, function (m, abrev) {
  return abrev + ‘.’ + NBSP;
  });

```
// n° et p. suivis d'un nombre
str = str.replace(/\bn[°ºo][ \t]*(?=\d)/gi, 'n' + '\u00B0' + NBSP);
str = str.replace(/\bp\.[ \t]*(?=\d)/g, 'p.' + NBSP);

return str;
```

}

/**

- Nettoyage des espaces multiples introduits par les traitements
- précédents ou déjà présents dans le texte (hors espaces insécables
- volontaires).
  */
  function nettoyerEspaces(str) {
  // Espaces normales multiples -> une seule
  str = str.replace(/[ \t]{2,}/g, ’ ’);
  // Espace normale juste avant une espace insécable -> on supprime le doublon
  str = str.replace(/[ \t]([\u00A0\u202F])/g, ‘$1’);
  str = str.replace(/([\u00A0\u202F])[ \t]/g, ‘$1’);
  return str;
  }

// Reconnaît un ordinal français : 1er, 1re/1ère, 2e/2ème, 3e, 21e, etc.
// Capture le nombre puis le suffixe littéral à mettre en exposant.
var RE_ORDINAL = /\b(\d+)(er|re|ère|ème|e|nd|nde)\b/g;

/**

- Met en exposant le suffixe des adjectifs numéraux ordinaux
- (1er -> 1<sup>er</sup>, 2e -> 2<sup>e</sup>, 1re -> 1<sup>re</sup>…).
- Contrairement aux autres règles, celle-ci doit modifier la structure
- du DOM (insertion d’un élément <sup>) et ne peut donc pas se limiter
- à une transformation de chaîne : elle opère directement sur un nœud
- texte et retourne un tableau de nœuds destinés à le remplacer.
- 
- @param {Text} textNode
- @returns {Node[]|null} nouveaux nœuds à substituer, ou null si aucun
- ```
                      ordinal trouvé (le nœud reste inchangé)
  ```

*/
function ordinalsToSup(textNode) {
var text = textNode.nodeValue;
RE_ORDINAL.lastIndex = 0;
if (!RE_ORDINAL.test(text)) return null;
RE_ORDINAL.lastIndex = 0;

```
var doc = textNode.ownerDocument;
var fragments = [];
var lastIndex = 0;
var match;

while ((match = RE_ORDINAL.exec(text)) !== null) {
  var nombre = match[1];
  var suffixe = match[2];

  // Ne pas transformer "2emes" ou d'autres suites non ordinales
  // déjà couvertes par le \b final de la regex.

  if (match.index > lastIndex) {
    fragments.push(doc.createTextNode(text.slice(lastIndex, match.index)));
  }
  fragments.push(doc.createTextNode(nombre));
  var sup = doc.createElement('sup');
  sup.textContent = suffixe;
  fragments.push(sup);

  lastIndex = match.index + match[0].length;
}

if (lastIndex < text.length) {
  fragments.push(doc.createTextNode(text.slice(lastIndex)));
}

return fragments;
```

}

function corrigerTexte(str) {
if (!str) return str;

```
str = convertGuillemets(str);
str = spaceGuillemets(str);
str = convertApostrophes(str);
if (OPTIONS.tiretsIncise) {
  str = convertTiretsIncise(str);
}
str = spacePonctuationHaute(str);
str = spaceNombres(str);
str = spaceAbreviations(str);
str = nettoyerEspaces(str);

return str;
```

}

// ———————————————————————
// API publique
// ———————————————————————

/**

- Applique le correcteur typographique.
- @param {Element} [root=document.body] - racine du sous-arbre à traiter
  */
  function apply(root) {
  root = root || document.body;
  if (!root) return;

```
var textNodes = collectTextNodes(root);

// Passe 1 : corrections purement textuelles (espaces, guillemets...)
for (var i = 0; i < textNodes.length; i++) {
  var node = textNodes[i];
  var corrected = corrigerTexte(node.nodeValue);
  if (corrected !== node.nodeValue) {
    node.nodeValue = corrected;
  }
}

// Passe 2 : ordinaux en exposant (modifie la structure du DOM, donc
// traitée séparément après coup pour ne pas perturber le TreeWalker
// de la passe 1, et sur la base du texte déjà corrigé ci-dessus)
if (OPTIONS.ordinauxExposant) {
  for (var j = 0; j < textNodes.length; j++) {
    var tn = textNodes[j];
    // Le nœud a pu être détaché si un remplacement précédent l'a
    // retiré du DOM (cas de nœuds imbriqués) ; on vérifie sa présence.
    if (!tn.parentNode) continue;
    var replacement = ordinalsToSup(tn);
    if (replacement) {
      var frag = document.createDocumentFragment();
      for (var k = 0; k < replacement.length; k++) {
        frag.appendChild(replacement[k]);
      }
      tn.parentNode.replaceChild(frag, tn);
    }
  }
}
```

}

/**

- Observe les mutations du DOM et réapplique automatiquement le
- correcteur sur les nœuds ajoutés/modifiés en contexte français.
- @param {Element} [root=document.body]
- @returns {MutationObserver}
  */
  function observe(root) {
  root = root || document.body;
  apply(root);

```
var observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (mutation.type === 'characterData') {
      var parent = mutation.target.parentElement;
      if (parent && !EXCLUDED_TAGS[parent.tagName] && isFrench(closestLang(parent))) {
        apply(parent);
      }
    } else if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(function (added) {
        if (added.nodeType === 1) {
          apply(added);
        } else if (added.nodeType === 3) {
          var parent = added.parentElement;
          if (parent) apply(parent);
        }
      });
    }
  });
});

observer.observe(root, {
  childList: true,
  subtree: true,
  characterData: true
});

return observer;
```

}

/**

- Ajuste les options du correcteur (fusion superficielle avec les
- valeurs par défaut). À appeler avant TypoFr.apply()/observe().
- @param {Object} opts
  */
  function configure(opts) {
  if (!opts) return;
  for (var key in opts) {
  if (Object.prototype.hasOwnProperty.call(opts, key)) {
  OPTIONS[key] = opts[key];
  }
  }
  }

global.TypoFr = {
apply: apply,
observe: observe,
configure: configure,
corrigerTexte: corrigerTexte, // exposé pour tests unitaires sur chaînes
_internal: { // exposé pour tests unitaires ciblés, non garanti stable
convertTiretsIncise: convertTiretsIncise,
ordinalsToSup: ordinalsToSup
}
};

})(typeof window !== ‘undefined’ ? window : this);
