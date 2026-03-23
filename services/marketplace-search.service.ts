/**
 * Service de recherche marketplace
 * Réutilise le cache 5min de cataloguesPublicService.getAllProduitsPublics()
 * Pas de nouvelle requête DB — tout est dérivé du cache existant
 */

import { cataloguesPublicService } from './catalogues-public.service';
import { StructurePublique, SearchResult, MarketplaceStats } from '@/types/marketplace';
import { ProduitPublicGlobal } from '@/types/catalogues';

class MarketplaceSearchService {
  private static instance: MarketplaceSearchService;

  static getInstance(): MarketplaceSearchService {
    if (!this.instance) {
      this.instance = new MarketplaceSearchService();
    }
    return this.instance;
  }

  /**
   * Extrait les structures uniques depuis les produits aplatis
   * Utilise une Map par id_structure pour dédupliquer
   */
  async getStructures(): Promise<StructurePublique[]> {
    try {
      const catalogue = await cataloguesPublicService.getAllProduitsPublics();
      if (!catalogue?.data) return [];

      const structuresMap = new Map<number, StructurePublique>();

      catalogue.data.forEach((produit: ProduitPublicGlobal) => {
        const existing = structuresMap.get(produit.id_structure);
        if (existing) {
          existing.total_produits++;
          if (produit.nom_categorie && !existing.categories.includes(produit.nom_categorie)) {
            existing.categories.push(produit.nom_categorie);
          }
        } else {
          structuresMap.set(produit.id_structure, {
            id_structure: produit.id_structure,
            nom_structure: produit.nom_structure,
            logo_structure: produit.logo_structure,
            type_structure: produit.type_structure,
            telephone: produit.telephone_structure,
            adresse: produit.adresse_structure,
            total_produits: 1,
            categories: produit.nom_categorie ? [produit.nom_categorie] : []
          });
        }
      });

      return Array.from(structuresMap.values())
        .sort((a, b) => b.total_produits - a.total_produits);
    } catch (error) {
      console.error('[MARKETPLACE] Erreur getStructures:', error);
      return [];
    }
  }

  /**
   * Récupère les structures depuis list_structures (léger, pas de chargement produits)
   * Utilisé par search() et getStats() pour éviter le chargement de 118K+ produits
   */
  async getStructuresFromList(): Promise<StructurePublique[]> {
    try {
      const response = await cataloguesPublicService.getAllStructures();
      return response.structures
        .filter(s => s.a_des_produits)
        .map(s => ({
          id_structure: s.id_structure,
          nom_structure: s.nom_structure,
          logo_structure: s.logo,
          type_structure: s.type_structure,
          telephone: s.mobile_om,
          adresse: s.adresse,
          total_produits: s.nb_produits_publics,
          categories: []
        }))
        .sort((a, b) => b.total_produits - a.total_produits);
    } catch (error) {
      console.error('[MARKETPLACE] Erreur getStructuresFromList:', error);
      return [];
    }
  }

  /**
   * Recherche avec détection auto tel vs nom
   * /^7\d*$/ = téléphone, sinon nom
   * Max 5 résultats
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const structures = await this.getStructuresFromList();
    const q = query.trim();
    const isTel = /^7\d*$/.test(q);

    let results: SearchResult[];

    if (isTel) {
      results = structures
        .filter(s => s.telephone && s.telephone.includes(q))
        .map(s => ({
          structure: s,
          matchType: 'telephone' as const,
          score: s.telephone?.startsWith(q) ? 2 : 1
        }));
    } else {
      const qLower = q.toLowerCase();
      results = structures
        .filter(s => s.nom_structure.toLowerCase().includes(qLower))
        .map(s => {
          const nomLower = s.nom_structure.toLowerCase();
          let score = 1;
          if (nomLower.startsWith(qLower)) score = 3;
          else if (nomLower.includes(qLower)) score = 2;
          return { structure: s, matchType: 'nom' as const, score };
        });
    }

    return results
      .sort((a, b) => b.score - a.score || b.structure.total_produits - a.structure.total_produits)
      .slice(0, 5);
  }

  /**
   * Retourne les stats globales de la marketplace
   */
  async getStats(): Promise<MarketplaceStats> {
    try {
      const response = await cataloguesPublicService.getAllStructures();
      return {
        total_produits: 0,
        total_structures: response.total_structures,
        total_categories: 0,
        total_vedettes: response.total_vedettes,
      };
    } catch {
      return { total_produits: 0, total_structures: 0, total_categories: 0 };
    }
  }
}

export const marketplaceSearchService = MarketplaceSearchService.getInstance();
export default marketplaceSearchService;
