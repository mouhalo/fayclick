/**
 * Hook personnalisé pour la gestion des produits
 * Évite les re-renders inutiles avec des sélecteurs optimisés
 */

import { useMemo } from 'react';
import { useProduitsStore } from '@/stores/produitsStore';
import { Produit, FiltreProduits } from '@/types/produit';

/**
 * Hook principal pour les produits avec filtrage optimisé
 */
export function useProduits() {
  // Sélecteurs simples sans fonctions
  const produits = useProduitsStore(state => state.produits);
  const searchTerm = useProduitsStore(state => state.searchTerm);
  const filtres = useProduitsStore(state => state.filtres);
  const isLoadingProduits = useProduitsStore(state => state.isLoadingProduits);
  const errorProduits = useProduitsStore(state => state.errorProduits);

  // Actions
  const setProduits = useProduitsStore(state => state.setProduits);
  const setSearchTerm = useProduitsStore(state => state.setSearchTerm);
  const setFiltres = useProduitsStore(state => state.setFiltres);
  const resetFiltres = useProduitsStore(state => state.resetFiltres);
  const ajouterProduit = useProduitsStore(state => state.ajouterProduit);
  const modifierProduit = useProduitsStore(state => state.modifierProduit);
  const supprimerProduit = useProduitsStore(state => state.supprimerProduit);
  const setLoadingProduits = useProduitsStore(state => state.setLoadingProduits);
  const setErrorProduits = useProduitsStore(state => state.setErrorProduits);

  // Calcul mémorisé des produits filtrés
  const produitsFiltered = useMemo(() => {
    let filteredProducts = [...produits];

    // Filtre par terme de recherche
    if (searchTerm) {
      const terme = searchTerm.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.nom_produit.toLowerCase().includes(terme) ||
        p.description?.toLowerCase().includes(terme) ||
        p.code_produit?.toLowerCase().includes(terme)
      );
    }

    // Filtres avancés
    if (filtres.nom_categorie) {
      filteredProducts = filteredProducts.filter(p => p.nom_categorie === filtres.nom_categorie);
    }

    if (filtres.enStock !== undefined) {
      filteredProducts = filteredProducts.filter(p => {
        const enStock = (p.niveau_stock || 0) > 0;
        return enStock === filtres.enStock;
      });
    }

    if (filtres.prixMin !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.prix_vente >= filtres.prixMin!);
    }

    if (filtres.prixMax !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.prix_vente <= filtres.prixMax!);
    }

    // Tri
    if (filtres.sortBy) {
      filteredProducts.sort((a, b) => {
        const ordre = filtres.sortOrder === 'desc' ? -1 : 1;
        
        switch (filtres.sortBy) {
          case 'nom':
            return ordre * a.nom_produit.localeCompare(b.nom_produit);
          case 'prix':
            return ordre * (a.prix_vente - b.prix_vente);
          case 'stock':
            return ordre * ((a.niveau_stock || 0) - (b.niveau_stock || 0));
          case 'marge':
            return ordre * ((a.marge || 0) - (b.marge || 0));
          default:
            return 0;
        }
      });
    }

    return filteredProducts;
  }, [produits, searchTerm, filtres]);

  return {
    // État
    produits,
    produitsFiltered,
    searchTerm,
    filtres,
    isLoadingProduits,
    errorProduits,
    
    // Actions
    setProduits,
    setSearchTerm,
    setFiltres,
    resetFiltres,
    ajouterProduit,
    modifierProduit,
    supprimerProduit,
    setLoadingProduits,
    setErrorProduits
  };
}

/**
 * Hook pour le panier avec calculs optimisés
 */
export function usePanier() {
  // Sélecteurs directs
  const panier = useProduitsStore(state => state.panier);
  const ajouterAuPanier = useProduitsStore(state => state.ajouterAuPanier);
  const modifierQuantitePanier = useProduitsStore(state => state.modifierQuantitePanier);
  const retirerDuPanier = useProduitsStore(state => state.retirerDuPanier);
  const viderPanier = useProduitsStore(state => state.viderPanier);
  const togglePanier = useProduitsStore(state => state.togglePanier);
  const isInCart = useProduitsStore(state => state.isInCart);
  const getCartItemQuantity = useProduitsStore(state => state.getCartItemQuantity);

  // Calculs mémorisés
  const nombreArticles = useMemo(() => {
    return panier.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [panier.items]);

  const total = useMemo(() => {
    return panier.items.reduce((sum, item) => sum + (item.prix_vente * item.quantity), 0);
  }, [panier.items]);

  return {
    // État
    panier,
    nombreArticles,
    total,
    
    // Actions
    ajouterAuPanier,
    modifierQuantitePanier,
    retirerDuPanier,
    viderPanier,
    togglePanier,
    isInCart,
    getCartItemQuantity
  };
}


/**
 * Hook pour la gestion des modals et UI
 */
export function useProduitsUI() {
  const isModalAjoutOpen = useProduitsStore(state => state.isModalAjoutOpen);
  const produitSelectionne = useProduitsStore(state => state.produitSelectionne);
  const modeEdition = useProduitsStore(state => state.modeEdition);
  const configuration = useProduitsStore(state => state.configuration);

  const setModalAjoutOpen = useProduitsStore(state => state.setModalAjoutOpen);
  const setProduitSelectionne = useProduitsStore(state => state.setProduitSelectionne);
  const setModeEdition = useProduitsStore(state => state.setModeEdition);
  const setConfiguration = useProduitsStore(state => state.setConfiguration);

  return {
    // État
    isModalAjoutOpen,
    produitSelectionne,
    modeEdition,
    configuration,
    
    // Actions
    setModalAjoutOpen,
    setProduitSelectionne,
    setModeEdition,
    setConfiguration
  };
}