/**
 * Store Zustand pour la gestion des produits et du panier
 * Gère l'état global avec persistance du panier
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { 
  Produit, 
  ArticlePanier, 
  PanierState,
  FiltreProduits,
  ConfigurationAffichage
} from '@/types/produit';

// Interface pour l'état des produits
interface ProduitsState {
  // Données des produits
  produits: Produit[];
  produitSelectionne: Produit | null;
  isLoadingProduits: boolean;
  errorProduits: string | null;
  
  // État du panier
  panier: PanierState;
  
  // Recherche et filtres
  filtres: FiltreProduits;
  searchTerm: string;
  
  
  // Configuration d'affichage
  configuration: ConfigurationAffichage | null;
  
  // Modales et UI
  isModalAjoutOpen: boolean;
  isPanierOpen: boolean;
  modeEdition: boolean;
  
  // Actions - Gestion des produits
  setProduits: (produits: Produit[]) => void;
  ajouterProduit: (produit: Produit) => void;
  modifierProduit: (id: number, produit: Partial<Produit>) => void;
  supprimerProduit: (id: number) => void;
  setProduitSelectionne: (produit: Produit | null) => void;
  
  // Actions - Gestion du panier
  ajouterAuPanier: (produit: Produit, quantite?: number) => void;
  modifierQuantitePanier: (id_produit: number, quantite: number) => void;
  retirerDuPanier: (id_produit: number) => void;
  viderPanier: () => void;
  togglePanier: () => void;
  
  // Actions - Recherche et filtres
  setSearchTerm: (term: string) => void;
  setFiltres: (filtres: Partial<FiltreProduits>) => void;
  resetFiltres: () => void;
  
  
  // Actions - UI
  setModalAjoutOpen: (open: boolean) => void;
  setModeEdition: (mode: boolean) => void;
  setConfiguration: (config: ConfigurationAffichage) => void;
  
  // Actions - États de chargement et erreurs
  setLoadingProduits: (loading: boolean) => void;
  setErrorProduits: (error: string | null) => void;
  
  // Utilitaires
  getProduitById: (id: number) => Produit | undefined;
  isInCart: (id_produit: number) => boolean;
  getCartItemQuantity: (id_produit: number) => number;
}

// Store avec persistance pour le panier uniquement
export const useProduitsStore = create<ProduitsState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // États initiaux
        produits: [],
        produitSelectionne: null,
        isLoadingProduits: false,
        errorProduits: null,
        
        panier: {
          items: [],
          total: 0,
          nombreArticles: 0,
          isOpen: false
        },
        
        filtres: {},
        searchTerm: '',
        
        
        configuration: null,
        
        isModalAjoutOpen: false,
        isPanierOpen: false,
        modeEdition: false,

        // Actions - Gestion des produits
        setProduits: (produits) => 
          set({ produits, errorProduits: null, isLoadingProduits: false }),

        ajouterProduit: (produit) => 
          set((state) => ({
            produits: [...state.produits, produit]
          })),

        modifierProduit: (id, modifications) =>
          set((state) => ({
            produits: state.produits.map(p => 
              p.id_produit === id ? { ...p, ...modifications } : p
            ),
            produitSelectionne: state.produitSelectionne?.id_produit === id 
              ? { ...state.produitSelectionne, ...modifications }
              : state.produitSelectionne
          })),

        supprimerProduit: (id) =>
          set((state) => ({
            produits: state.produits.filter(p => p.id_produit !== id),
            produitSelectionne: state.produitSelectionne?.id_produit === id 
              ? null : state.produitSelectionne,
            panier: {
              ...state.panier,
              items: state.panier.items.filter(item => item.id_produit !== id)
            }
          })),

        setProduitSelectionne: (produit) => 
          set({ produitSelectionne: produit }),

        // Actions - Gestion du panier
        ajouterAuPanier: (produit, quantite = 1) =>
          set((state) => {
            const existingItem = state.panier.items.find(
              item => item.id_produit === produit.id_produit
            );

            let newItems: ArticlePanier[];
            
            if (existingItem) {
              newItems = state.panier.items.map(item =>
                item.id_produit === produit.id_produit
                  ? { ...item, quantity: item.quantity + quantite }
                  : item
              );
            } else {
              newItems = [...state.panier.items, { ...produit, quantity: quantite }];
            }

            const total = newItems.reduce((sum, item) => sum + (item.prix_vente * item.quantity), 0);
            const nombreArticles = newItems.reduce((sum, item) => sum + item.quantity, 0);

            return {
              panier: {
                items: newItems,
                total,
                nombreArticles,
                isOpen: state.panier.isOpen
              }
            };
          }),

        modifierQuantitePanier: (id_produit, quantite) =>
          set((state) => {
            let newItems: ArticlePanier[];
            
            if (quantite <= 0) {
              newItems = state.panier.items.filter(item => item.id_produit !== id_produit);
            } else {
              newItems = state.panier.items.map(item =>
                item.id_produit === id_produit
                  ? { ...item, quantity: quantite }
                  : item
              );
            }

            const total = newItems.reduce((sum, item) => sum + (item.prix_vente * item.quantity), 0);
            const nombreArticles = newItems.reduce((sum, item) => sum + item.quantity, 0);

            return {
              panier: {
                items: newItems,
                total,
                nombreArticles,
                isOpen: state.panier.isOpen
              }
            };
          }),

        retirerDuPanier: (id_produit) =>
          set((state) => {
            const newItems = state.panier.items.filter(item => item.id_produit !== id_produit);
            const total = newItems.reduce((sum, item) => sum + (item.prix_vente * item.quantity), 0);
            const nombreArticles = newItems.reduce((sum, item) => sum + item.quantity, 0);

            return {
              panier: {
                items: newItems,
                total,
                nombreArticles,
                isOpen: state.panier.isOpen
              }
            };
          }),

        viderPanier: () =>
          set({
            panier: {
              items: [],
              total: 0,
              nombreArticles: 0,
              isOpen: false
            }
          }),

        togglePanier: () =>
          set((state) => ({
            panier: {
              ...state.panier,
              isOpen: !state.panier.isOpen
            }
          })),

        // Actions - Recherche et filtres
        setSearchTerm: (term) => set({ searchTerm: term }),

        setFiltres: (nouveauxFiltres) =>
          set((state) => ({
            filtres: { ...state.filtres, ...nouveauxFiltres }
          })),

        resetFiltres: () => set({ filtres: {}, searchTerm: '' }),


        // Actions - UI
        setModalAjoutOpen: (open) => set({ isModalAjoutOpen: open }),
        
        setModeEdition: (mode) => set({ modeEdition: mode }),
        
        setConfiguration: (config) => set({ configuration: config }),

        // Actions - États de chargement et erreurs
        setLoadingProduits: (loading) => set({ isLoadingProduits: loading }),
        setErrorProduits: (error) => set({ errorProduits: error }),

        // Utilitaires simples
        getProduitById: (id) => {
          const state = get();
          return state.produits.find(p => p.id_produit === id);
        },

        isInCart: (id_produit) => {
          const state = get();
          return state.panier.items.some(item => item.id_produit === id_produit);
        },

        getCartItemQuantity: (id_produit) => {
          const state = get();
          const item = state.panier.items.find(item => item.id_produit === id_produit);
          return item?.quantity || 0;
        }
      }),
      
      // Configuration de persistance (panier seulement)
      {
        name: 'fayclick-panier',
        partialize: (state) => ({ 
          panier: {
            items: state.panier.items,
            total: state.panier.total,
            nombreArticles: state.panier.nombreArticles,
            isOpen: false // Ne pas persister l'état d'ouverture
          }
        })
      }
    )
  )
);

// Sélecteurs stables avec useMemo pour éviter les re-renders
export const useProduitsSelectors = () => {
  const produits = useProduitsStore(state => state.produits);
  const isLoadingProduits = useProduitsStore(state => state.isLoadingProduits);
  const errorProduits = useProduitsStore(state => state.errorProduits);
  const searchTerm = useProduitsStore(state => state.searchTerm);
  const filtres = useProduitsStore(state => state.filtres);
  
  // Calcul des produits filtrés de manière stable
  const produitsFiltered = useProduitsStore(
    state => {
      let filteredProducts = [...state.produits];

      // Filtre par terme de recherche
      if (state.searchTerm) {
        const terme = state.searchTerm.toLowerCase();
        filteredProducts = filteredProducts.filter(p =>
          p.nom_produit.toLowerCase().includes(terme) ||
          p.description?.toLowerCase().includes(terme) ||
          p.code_produit?.toLowerCase().includes(terme)
        );
      }

      // Filtres avancés
      if (state.filtres.nom_categorie) {
        filteredProducts = filteredProducts.filter(p => p.nom_categorie === state.filtres.nom_categorie);
      }

      if (state.filtres.enStock !== undefined) {
        filteredProducts = filteredProducts.filter(p => {
          const enStock = (p.niveau_stock || 0) > 0;
          return enStock === state.filtres.enStock;
        });
      }

      if (state.filtres.prixMin !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.prix_vente >= state.filtres.prixMin!);
      }

      if (state.filtres.prixMax !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.prix_vente <= state.filtres.prixMax!);
      }

      // Tri
      if (state.filtres.sortBy) {
        filteredProducts.sort((a, b) => {
          const ordre = state.filtres.sortOrder === 'desc' ? -1 : 1;
          
          switch (state.filtres.sortBy) {
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
    }
  );
  
  return {
    produits,
    produitsFiltered,
    isLoadingProduits,
    errorProduits,
    searchTerm,
    filtres
  };
};

export const usePanierSelectors = () => {
  const panier = useProduitsStore(state => state.panier);
  const nombreArticles = useProduitsStore(
    state => state.panier.items.reduce((sum, item) => sum + item.quantity, 0)
  );
  const total = useProduitsStore(
    state => state.panier.items.reduce((sum, item) => sum + (item.prix_vente * item.quantity), 0)
  );
  
  return {
    panier,
    nombreArticles,
    total
  };
};