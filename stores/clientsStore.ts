/**
 * Store Zustand pour la gestion des clients
 * Suit le même pattern que produitsStore.ts
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  ClientWithStats, 
  StatistiquesGlobales,
  ClientDetailComplet
} from '@/types/client';

// Interface pour l'état des clients
interface ClientsState {
  // Données des clients
  clients: ClientWithStats[];
  clientSelectionne: ClientWithStats | null;
  clientDetail: ClientDetailComplet | null;
  statistiquesGlobales: StatistiquesGlobales | null;
  isLoadingClients: boolean;
  errorClients: string | null;
  
  // Recherche et filtres
  searchTerm: string;
  
  // Modales et UI
  isModalOpen: boolean;
  refreshing: boolean;
  
  // Actions - Gestion des clients
  setClients: (clients: ClientWithStats[]) => void;
  setClientSelectionne: (client: ClientWithStats | null) => void;
  setClientDetail: (detail: ClientDetailComplet | null) => void;
  setStatistiquesGlobales: (stats: StatistiquesGlobales | null) => void;
  ajouterClient: (client: ClientWithStats) => void;
  modifierClient: (id: number, client: Partial<ClientWithStats>) => void;
  supprimerClient: (id: number) => void;
  
  // Actions - Recherche
  setSearchTerm: (term: string) => void;
  
  // Actions - UI
  setModalOpen: (open: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  
  // Actions - États de chargement et erreurs
  setLoadingClients: (loading: boolean) => void;
  setErrorClients: (error: string | null) => void;
  
  // Utilitaires
  getClientById: (id: number) => ClientWithStats | undefined;
  resetState: () => void;
}

// Store sans persistance (les clients changent fréquemment)
export const useClientsStore = create<ClientsState>()(
  subscribeWithSelector(
    (set, get) => ({
      // États initiaux
      clients: [],
      clientSelectionne: null,
      clientDetail: null,
      statistiquesGlobales: null,
      isLoadingClients: false,
      errorClients: null,
      searchTerm: '',
      isModalOpen: false,
      refreshing: false,

      // Actions - Gestion des clients
      setClients: (clients) => set({ clients }),
      
      setClientSelectionne: (client) => set({ clientSelectionne: client }),
      
      setClientDetail: (detail) => set({ clientDetail: detail }),
      
      setStatistiquesGlobales: (stats) => set({ statistiquesGlobales: stats }),
      
      ajouterClient: (nouveauClient) => set((state) => ({
        clients: [nouveauClient, ...state.clients]
      })),
      
      modifierClient: (id, modifications) => set((state) => ({
        clients: state.clients.map(client =>
          client.client.id_client === id
            ? {
                ...client,
                client: { ...client.client, ...modifications },
                // Mise à jour de la date de modification
                client: {
                  ...client.client,
                  ...modifications,
                  date_modification: new Date().toISOString()
                }
              }
            : client
        )
      })),
      
      supprimerClient: (id) => set((state) => ({
        clients: state.clients.filter(client => client.client.id_client !== id)
      })),

      // Actions - Recherche
      setSearchTerm: (term) => set({ searchTerm: term }),

      // Actions - UI
      setModalOpen: (open) => set({ isModalOpen: open }),
      setRefreshing: (refreshing) => set({ refreshing }),

      // Actions - États de chargement et erreurs
      setLoadingClients: (loading) => set({ isLoadingClients: loading }),
      setErrorClients: (error) => set({ errorClients: error }),

      // Utilitaires
      getClientById: (id) => {
        return get().clients.find(client => client.client.id_client === id);
      },

      resetState: () => set({
        clientSelectionne: null,
        clientDetail: null,
        searchTerm: '',
        isModalOpen: false,
        errorClients: null
      })
    })
  )
);

// Export du type pour utilisation externe
export type { ClientsState };