/**
 * Convertit un nombre en lettres (français)
 * Ex: 52310 -> "Cinquante-deux mille trois cent dix"
 */

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const DIZAINES_SPECIALES = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

/**
 * Convertit un nombre de 0 à 99 en lettres
 */
function convertirDizaine(n: number): string {
  if (n === 0) return '';
  if (n < 10) return UNITES[n];
  if (n < 20) return DIZAINES_SPECIALES[n - 10];

  const dizaine = Math.floor(n / 10);
  const unite = n % 10;

  // Cas spéciaux pour 70-79 et 90-99
  if (dizaine === 7) {
    // 70-79: soixante-dix, soixante-onze...
    if (unite === 0) return 'soixante-dix';
    return 'soixante-' + DIZAINES_SPECIALES[unite];
  }

  if (dizaine === 9) {
    // 90-99: quatre-vingt-dix, quatre-vingt-onze...
    if (unite === 0) return 'quatre-vingt-dix';
    return 'quatre-vingt-' + DIZAINES_SPECIALES[unite];
  }

  // Cas spécial: 80
  if (dizaine === 8 && unite === 0) {
    return 'quatre-vingts';
  }

  // Cas général
  if (unite === 0) {
    return DIZAINES[dizaine];
  }

  // Liaison avec "et" pour 21, 31, 41, 51, 61, 71
  if (unite === 1 && dizaine >= 2 && dizaine <= 6) {
    return DIZAINES[dizaine] + '-et-un';
  }

  return DIZAINES[dizaine] + '-' + UNITES[unite];
}

/**
 * Convertit un nombre de 0 à 999 en lettres
 */
function convertirCentaine(n: number): string {
  if (n === 0) return '';
  if (n < 100) return convertirDizaine(n);

  const centaine = Math.floor(n / 100);
  const reste = n % 100;

  let result = '';

  if (centaine === 1) {
    result = 'cent';
  } else {
    result = UNITES[centaine] + ' cent';
    // "cents" avec s si c'est un multiple de 100
    if (reste === 0) {
      result += 's';
    }
  }

  if (reste > 0) {
    result += ' ' + convertirDizaine(reste);
  }

  return result;
}

/**
 * Convertit un nombre entier en lettres (français)
 * @param n Nombre à convertir (jusqu'à 999 999 999 999)
 * @returns Le nombre en lettres avec la première lettre en majuscule
 */
export function nombreEnLettres(n: number): string {
  if (n === 0) return 'Zéro';
  if (n < 0) return 'Moins ' + nombreEnLettres(-n).toLowerCase();

  // Arrondir à l'entier
  n = Math.round(n);

  const milliards = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const milliers = Math.floor((n % 1000000) / 1000);
  const reste = n % 1000;

  let result = '';

  // Milliards
  if (milliards > 0) {
    if (milliards === 1) {
      result += 'un milliard';
    } else {
      result += convertirCentaine(milliards) + ' milliards';
    }
  }

  // Millions
  if (millions > 0) {
    if (result) result += ' ';
    if (millions === 1) {
      result += 'un million';
    } else {
      result += convertirCentaine(millions) + ' millions';
    }
  }

  // Milliers
  if (milliers > 0) {
    if (result) result += ' ';
    if (milliers === 1) {
      result += 'mille';
    } else {
      result += convertirCentaine(milliers) + ' mille';
    }
  }

  // Reste (centaines, dizaines, unités)
  if (reste > 0) {
    if (result) result += ' ';
    result += convertirCentaine(reste);
  }

  // Première lettre en majuscule
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Convertit un montant en lettres avec la devise
 * @param montant Montant à convertir
 * @param devise Devise (défaut: "francs CFA")
 * @returns Ex: "Cinquante-deux mille trois cent dix francs CFA"
 */
export function montantEnLettres(montant: number, devise: string = 'francs CFA'): string {
  const lettres = nombreEnLettres(montant);
  return `${lettres} ${devise}`;
}
