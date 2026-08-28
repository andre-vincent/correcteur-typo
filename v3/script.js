/* 
 * Correcteur typographique pour une typographie française soignée - v3
 * Généré à l’aide de l’agent d’intelligence artificielle Gemini
 */
function appliquerTypographieFrancaise(root = document.body) {
  // Liste des balises techniques, invisibles ou de saisie à ignorer complètement
  const balisesAExclure = [
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 
    'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'OUTPUT',
    'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
    'AUDIO', 'VIDEO', 'CANVAS', 'SVG', 'OBJECT', 'IFRAME', 'METER', 'PROGRESS',
    'MATH', 'ANNOTATION'
  ];
  
  const NNBSP = '\u202F'; // Espace fine insécable
  const NBSP = '\u00A0';  // Espace insécable normale
  const APOSTROPHE_COURBE = '’';

  // Liste des expressions régulières pour exclure des syntaxes spécifiques du traitement
  const regexExceptions = [
    /npm install/gi,               
    /\d+:\d+/g                     // Protège les formats horaires numériques (ex: 14:30)
  ];

  // Configuration du TreeWalker pour analyser uniquement les nœuds de texte pertinents
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (balisesAExclure.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;

        // Exclusion par classe globale, comportement ou attributs spécifiques
        if (
          parent.closest('.no-typo, .notranslate, [translate="no"]') || 
          parent.closest('[contenteditable="true"]') ||
          parent.closest('[aria-hidden="true"], [class*="icon-"], [class*="fa-"]')
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        // Validation stricte de la langue française (héritée ou directe)
        const lang = parent.closest('[lang]')?.getAttribute('lang');
        if (!lang || !lang.toLowerCase().startsWith('fr')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const noeudsAModifier = [];
  while (walker.nextNode()) noeudsAModifier.push(walker.currentNode);

  // Fonction interne utilitaire pour insérer les espaces fines dans la partie entière des nombres
  function formatNombre(partieEntiere) {
    return partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  }

  // Parcours et application des règles sur chaque nœud de texte validé
  noeudsAModifier.forEach(node => {
    let texte = node.nodeValue;
    let original = texte;
    const parent = node.parentElement;

    // RÈGLE 1 : Sauvegarde des exceptions techniques (mise en mémoire sous forme de jetons)
    const exceptionsSauvegardees = [];
    regexExceptions.forEach((regex, index) => {
      texte = texte.replace(regex, (match) => {
        const clé = `__EXCEP_${index}_${exceptionsSauvegardees.length}__`;
        exceptionsSauvegardees.push({ clé, valeur: match });
        return clé;
      });
    });

    // RÈGLE 2 : Séparateur des milliers conditionnel (5 chiffres hors TD, 4 chiffres dans un TD)
    // Conserve dynamiquement le séparateur décimal d'origine (. ou ,)
    const regexNombre = /(\d+)(?:([.,])(\d+))?/g;
    const estDansTD = parent && parent.closest('td');

    texte = texte.replace(regexNombre, (match, partieEntiere, separateur, partieDecimale) => {
      const longueur = partieEntiere.length;
      let entiereFormatee = partieEntiere;

      if (estDansTD) {
        if (longueur >= 4) entiereFormatee = formatNombre(partieEntiere);
      } else {
        if (longueur >= 5) entiereFormatee = formatNombre(partieEntiere);
      }

      return partieDecimale !== undefined ? `${entiereFormatee}${separateur}${partieDecimale}` : entiereFormatee;
    });

    // RÈGLE 3 : Formats horaires abrégés (ex: 2 h 30 ou 14 h)
    // Ajoute une espace fine insécable de chaque côté du 'h' pour lier l'ensemble
    texte = texte.replace(/(\d+)\s*h\s*(\d*)/gi, (match, heures, minutes) => {
      if (minutes) {
        return `${heures}${NNBSP}h${NNBSP}${minutes}`;
      }
      return `${heures}${NNBSP}h`;
    });

    // RÈGLE 4 : Devises et Unités de mesure courantes précédées d'un chiffre
    // Insertion d'une espace fine insécable (ex: 10 €, 5 km, 100 %)
    const regexDevisesEtUnites = /(\d)\s*(?:([€$£¥¢¤]|CHF)|(m|cm|mm|km|g|kg|t|l|ml|h|min|s|%|°C|kW|kWh)\b)/g;
    texte = texte.replace(regexDevisesEtUnites, (match, chiffre, devise, unite) => {
      const symbole = devise || unite;
      return `${chiffre}${NNBSP}${symbole}`;
    });

    // RÈGLE 5 : Ponctuations hautes (!, ?, ;)
    // Insertion d'une espace fine insécable avant le caractère
    texte = texte.replace(/\s*([!?;\u203D])/g, `${NNBSP}$1`);

    // RÈGLE 6 : Le deux-points (:)
    // Insertion d'une espace insécable normale avant le caractère
    texte = texte.replace(/\s*:/g, `${NBSP}:`);

    // RÈGLE 7 : Guillemets français (« »)
    // Insertion d'une espace fine insécable à l'intérieur des guillemets
    texte = texte.replace(/«\s*/g, `«${NNBSP}`).replace(/\s*»/g, `${NNBSP}»`);

    // RÈGLE 8 : Apostrophe droite dactylographique
    // Remplacement par l'apostrophe courbe typographique uniquement entre deux lettres latines étendues
    texte = texte.replace(/(\p{Script=Latin})'(\p{Script=Latin})/gu, `$1${APOSTROPHE_COURBE}$2`);

    // RÈGLE 9 : Restitution des exceptions techniques initiales (désarchivage des jetons)
    for (let i = exceptionsSauvegardees.length - 1; i >= 0; i--) {
      const item = exceptionsSauvegardees[i];
      texte = texte.replace(item.clé, item.valeur);
    }

    // Mise à jour effective du nœud si des changements ont eu lieu
    if (original !== texte) {
      node.nodeValue = texte;
    }
  });
}

// --- CONFIGURATION DU MUTATION OBSERVER (Gestion des contenus dynamiques) ---
const observer = new MutationObserver((mutations) => {
  observer.disconnect(); // Déconnexion temporaire pour éviter l'auto-déclenchement en boucle
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        appliquerTypographieFrancaise(node);
      } else if (node.nodeType === Node.TEXT_NODE) {
        appliquerTypographieFrancaise(node.parentElement || document.body);
      }
    });
  });
  lancerObservation();
});

function lancerObservation() {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialisation globale au chargement initial du DOM
document.addEventListener('DOMContentLoaded', () => {
  appliquerTypographieFrancaise();
  lancerObservation();
});
