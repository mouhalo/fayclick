/**
 * Hook personnalisé pour la gestion des clients
 * Suit le même pattern que useProduits.ts
 */

import { useMemo } from 'react';
import { useClientsStore } from '@/stores/clientsStore';
import { ClientWithStats } from '@/types/client';

/**
 * Hook principal pour les clients avec filtrage optimisé
 */
export function useClients() {
  // Sélecteurs simples sans fonctions
  const clients = useClientsStore(state => state.clients);
  const clientSelectionne = useClientsStore(state => state.clientSelectionne);
  const clientDetail = useClientsStore(state => state.clientDetail);
  const statistiquesGlobales = useClientsStore(state => state.statistiquesGlobales);
  const searchTerm = useClientsStore(state => state.searchTerm);
  const isLoadingClients = useClientsStore(state => state.isLoadingClients);
  const errorClients = useClientsStore(state => state.errorClients);
  const refreshing = useClientsStore(state => state.refreshing);

  // Actions
  const setClients = useClientsStore(state => state.setClients);
  const setClientSelectionne = useClientsStore(state => state.setClientSelectionne);
  const setClientDetail = useClientsStore(state => state.setClientDetail);
  const setStatistiquesGlobales = useClientsStore(state => state.setStatistiquesGlobales);
  const setSearchTerm = useClientsStore(state => state.setSearchTerm);
  const setLoadingClients = useClientsStore(state => state.setLoadingClients);
  const setErrorClients = useClientsStore(state => state.setErrorClients);
  const setRefreshing = useClientsStore(state => state.setRefreshing);
  const ajouterClient = useClientsStore(state => state.ajouterClient);
  const modifierClient = useClientsStore(state => state.modifierClient);
  const supprimerClient = useClientsStore(state => state.supprimerClient);
  const resetState = useClientsStore(state => state.resetState);

  // Calcul mémorisé des clients filtrés
  const clientsFiltered = useMemo(() => {
    if (!searchTerm) return clients;
    
    const search = searchTerm.toLowerCase();
    
    return clients.filter(clientWithStats => {
      const client = clientWithStats.client;
      
      return client.nom_client.toLowerCase().includes(search) ||
             client.tel_client.includes(search) ||
             client.adresse.toLowerCase().includes(search);
    });
  }, [clients, searchTerm]);

  return {
    // État
    clients,
    clientsFiltered,
    clientSelectionne,
    clientDetail,
    statistiquesGlobales,
    searchTerm,
    isLoadingClients,
    errorClients,
    refreshing,
    
    // Actions
    setClients,
    setClientSelectionne,
    setClientDetail,
    setStatistiquesGlobales,
    setSearchTerm,
    setLoadingClients,
    setErrorClients,
    setRefreshing,
    ajouterClient,
    modifierClient,
    supprimerClient,
    resetState
  };
}

/**
 * Hook pour la gestion de l'UI des clients
 */
export function useClientsUI() {
  const isModalOpen = useClientsStore(state => state.isModalOpen);
  const setModalOpen = useClientsStore(state => state.setModalOpen);
  const clientSelectionne = useClientsStore(state => state.clientSelectionne);
  const setClientSelectionne = useClientsStore(state => state.setClientSelectionne);

  return {
    isModalOpen,
    setModalOpen,
    clientSelectionne,
    setClientSelectionne
  };
}