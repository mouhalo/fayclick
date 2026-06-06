/**
 * Helpers purs pour la modification d'une vente payée du jour (module Modification Vente).
 *
 * Ces fonctions sont volontairement sans état (pas de hook, pas d'accès store) pour
 * être testables isolément et réutilisables côté mobile + desktop.
 */

import { ArticlePanier, Produit } from '@/types/produit';
import { DetailFacture } from '@/types/facture';

/**
 * Détermine si une facture est modifiable AUJOURD'HUI (confort UI uniquement).
 *
 * Règle métier (PRD §7.2) : visible UNIQUEMENT si la vente est PAYEE ET que
 * `date_facture` correspond à la date du jour (comparaison locale).
 *
 * ⚠️ Le serveur reste l'autorité (garde-fou `date_facture = CURRENT_DATE` côté PostgreSQL).
 * Ce contrôle UI évite seulement d'afficher un bouton qui serait de toute façon rejeté.
 *
 * @param dateFacture - Date de la facture (string ISO "YYYY-MM-DD" ou Date)
 * @param libelleEtat - Libellé d'état ('PAYEE' | 'IMPAYEE')
 * @returns true si la facture peut être modifiée aujourd'hui
 */
export function isFactureModifiableAujourdhui(
  dateFacture: string | Date | null | undefined,
  libelleEtat: string | null | undefined
): boolean {
  if (libelleEtat !== 'PAYEE') return false;
  if (!dateFacture) return false;

  const dateVente = new Date(dateFacture);
  if (Number.isNaN(dateVente.getTime())) return false;

  const aujourdhui = new Date();

  // Comparaison sur l'année / mois / jour en heure locale (fuseau du navigateur).
  return (
    dateVente.getFullYear() === aujourdhui.getFullYear() &&
    dateVente.getMonth() === aujourdhui.getMonth() &&
    dateVente.getDate() === aujourdhui.getDate()
  );
}

/**
 * Article reconstruit pour l'édition : un ArticlePanier enrichi d'un drapeau
 * `stockInconnu` indiquant que le produit n'a pas pu être retrouvé dans le
 * produitsStore (fallback conservateur : interdire l'augmentation de cette ligne).
 */
export interface ArticleEdition extends ArticlePanier {
  /** true si le niveau_stock courant est inconnu (produit absent du store) */
  stockInconnu?: boolean;
  /** Quantité d'origine sur la facture (snapshot avant modification) */
  quantiteOrigine: number;
}

/**
 * Reconstruit la liste d'articles éditables à partir des lignes de la facture
 * (`facture.details`) en mergeant avec le `produitsStore` pour récupérer le
 * `niveau_stock` courant (absent des lignes de facture).
 *
 * Le `niveau_stock` retourné représente le stock DISPONIBLE actuel. La vente
 * d'origine a déjà été décrémentée du stock à sa création, donc en édition la
 * validation d'un ajout se fait sur le DELTA (delta_ajout ≤ niveau_stock courant),
 * jamais sur la quantité absolue.
 *
 * Fallback conservateur (PRD OUVERT-2) : si un produit n'est plus dans le store,
 * `stockInconnu = true` → la ligne peut être conservée ou retirée, mais pas augmentée.
 *
 * @param details - Lignes de la facture (facture.details déjà chargé dans la carte)
 * @param lookupProduit - Fonction de résolution produit par id (ex: produitsStore.getProduitById)
 * @returns Liste d'ArticleEdition prête pour le panierEditionStore
 */
export function reconstruireArticlesDepuisFacture(
  details: DetailFacture[],
  lookupProduit: (id_produit: number) => Produit | undefined
): ArticleEdition[] {
  if (!details || details.length === 0) return [];

  return details.map((detail) => {
    const produit = lookupProduit(detail.id_produit);
    const quantite = detail.quantite || 0;
    const prix = detail.prix || 0;

    if (produit) {
      // Produit retrouvé : on dispose du stock courant réel.
      return {
        ...produit,
        quantity: quantite,
        quantiteOrigine: quantite,
        // Prix appliqué = prix réellement facturé (peut différer du prix_vente courant)
        prix_applique: prix,
        remise_article: 0,
        stockInconnu: false,
      };
    }

    // Fallback conservateur : produit absent du store, stock inconnu.
    // On fabrique un ArticlePanier minimal à partir des données de la ligne.
    return {
      id_produit: detail.id_produit,
      id_structure: 0,
      nom_produit: detail.nom_produit || 'Produit',
      cout_revient: detail.cout_revient || 0,
      prix_vente: prix,
      niveau_stock: 0,
      quantity: quantite,
      quantiteOrigine: quantite,
      prix_applique: prix,
      remise_article: 0,
      stockInconnu: true,
    } as ArticleEdition;
  });
}

/**
 * Construit le payload d'articles au format attendu par `modifier_facturecom` :
 * `"id-qty-prix#"` concaténé, identique à create_facture_complete1.
 *
 * Note : la logique d'absorption de remise par article dans `prix_applique` net
 * est gérée côté service (kader_backend) pour rester cohérente avec createFacture.
 * Ce helper se contente du format brut id-qty-prix.
 *
 * @param articles - Articles de l'édition
 * @returns chaîne "id-qty-prix#id-qty-prix#..."
 */
export function buildArticlesPayloadEdition(articles: ArticlePanier[]): string {
  if (!articles || articles.length === 0) return '';
  return (
    articles
      .map(
        (a) =>
          `${a.id_produit}-${a.quantity}-${a.prix_applique ?? a.prix_vente}`
      )
      .join('#') + '#'
  );
}

/**
 * Détermine l'origine probable d'une vente (PRODUITS vs VENTEFLASH) pour le
 * libellé/contexte d'affichage uniquement.
 *
 * ⚠️ Grâce à l'isolation du panierEditionStore, cette heuristique n'influence
 * PAS le state d'édition (le store dédié reçoit les articles quel que soit l'origine).
 * Elle sert seulement au libellé contextuel. Défaut = 'PRODUITS' depuis la liste Factures.
 *
 * Heuristique : client anonyme (CLIENT_ANONYME) ⇒ VENTEFLASH probable.
 */
export function deduireOrigineVente(
  nomClient: string | undefined,
  contexte: 'FACTURES' | 'VENTEFLASH'
): 'PRODUITS' | 'VENTEFLASH' {
  if (contexte === 'VENTEFLASH') return 'VENTEFLASH';
  // Depuis la liste Factures : défaut Produits.
  return 'PRODUITS';
}
