/**
 * Page de gestion des clients pour les structures COMMERCIALE
 * Interface complète avec CRUD, recherche et modal multi-onglets
 * ✅ Utilise le même pattern que les produits avec Zustand store
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Plus, 
  RefreshCw,
  Users,
  AlertCircle
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { clientsService, ClientsApiException } from '@/services/clients.service';
import { useClients, useClientsUI } from '@/hooks/useClients';
import { ModalClientMultiOnglets } from '@/components/clients';
import { useToast } from '@/components/ui/Toast';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { GlassPagination, usePagination } from '@/components/ui/GlassPagination';
import { ClientWithStats, AddEditClientResponse } from '@/types/client';
import { User } from '@/types/auth';

export default function ClientsCommercePage() {
  const router = useRouter();
  
  // États locaux
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // Pour l'affichage immédiat
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  
  // Configuration pagination
  const itemsPerPage = 10;

  // Hooks optimisés avec store Zustand
  const {
    clients,
    clientsFiltered,
    statistiquesGlobales,
    searchTerm,
    isLoadingClients,
    errorClients,
    refreshing,
    setClients,
    setStatistiquesGlobales,
    setSearchTerm,
    setLoadingClients,
    setErrorClients,
    setRefreshing
  } = useClients();

  const {
    isModalOpen,
    setModalOpen,
    clientSelectionne,
    setClientSelectionne
  } = useClientsUI();

  const { ToastComponent } = useToast();

  // Pagination
  const filteredCount = clientsFiltered.length;
  const { 
    totalPages, 
    getPaginatedItems 
  } = usePagination(filteredCount, itemsPerPage);
  
  const paginatedClients = getPaginatedItems(clientsFiltered, currentPage);

  // Vérification authentification (même pattern que les produits)
  useEffect(() => {
    const checkAuthentication = () => {
      if (!authService.isAuthenticated()) {
        console.log('❌ [CLIENTS COMMERCE] Utilisateur non authentifié');
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      if (!userData || userData.type_structure !== 'COMMERCIALE') {
        console.log('⚠️ [CLIENTS COMMERCE] Type de structure incorrect');
        router.push('/dashboard');
        return;
      }
      
      console.log('✅ [CLIENTS COMMERCE] Authentification validée');
      setUser(userData);
      setIsAuthLoading(false);
    };

    const timer = setTimeout(checkAuthentication, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Chargement des clients et stats (même pattern que les produits)
  const loadClients = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingClients(true);
      console.log('🔄 [CLIENTS COMMERCE] Chargement des clients...');
      
      const response = await clientsService.getListeClients();
      setClients(response.clients);
      setStatistiquesGlobales(response.statistiques_globales);
      
      console.log(`✅ [CLIENTS COMMERCE] ${response.clients.length} clients chargés`);
    } catch (error) {
      console.error('❌ [CLIENTS COMMERCE] Erreur chargement clients:', error);
      const errorMessage = error instanceof ClientsApiException 
        ? error.message 
        : 'Impossible de charger les clients';
      setErrorClients(errorMessage);
    } finally {
      setLoadingClients(false);
    }
  }, [user, setClients, setStatistiquesGlobales, setLoadingClients, setErrorClients]);

  // Chargement initial
  useEffect(() => {
    if (user && !isAuthLoading) {
      loadClients();
    }
  }, [user, isAuthLoading, loadClients]);

  // Rechargement manuel
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

  // Mise à jour hybride : client spécifique + statistiques globales
  const handleClientUpdated = useCallback(async (clientId: number) => {
    try {
      console.log('🔄 [CLIENTS] Mise à jour hybride client + stats:', clientId);
      
      // OPTION 1 : Mise à jour hybride optimisée (recommandé)
      // Met à jour uniquement le client concerné + les statistiques globales
      const result = await clientsService.updateClientAndStats(clientId, clients);
      
      // Mettre à jour les clients
      setClients(result.clients);
      
      // Mettre à jour les statistiques globales si disponibles
      if (result.stats) {
        setStatistiquesGlobales(result.stats);
        console.log('📊 [CLIENTS] Statistiques globales mises à jour');
      }
      
      console.log('✅ [CLIENTS] Client et statistiques mis à jour');
      
      // OPTION 2 : Rechargement complet (alternative simple mais plus lourde)
      // Décommentez les lignes suivantes si vous préférez recharger toute la liste
      // console.log('🔄 [CLIENTS] Rechargement complet de la liste');
      // await loadClients();
      
    } catch (error) {
      console.error('❌ [CLIENTS] Erreur mise à jour hybride:', error);
      // En cas d'erreur, on recharge toute la liste
      await loadClients();
    }
  }, [clients, setClients, setStatistiquesGlobales, loadClients]);

  // Gestion de la recherche avec debouncing
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debouncing simple avec timeout
    const timeoutId = setTimeout(() => {
      setSearchTerm(value);
      setCurrentPage(1); // Reset pagination
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  // Ajouter un nouveau client
  const handleAddClient = () => {
    setSelectedClientId(null);
    setClientSelectionne(null);
    setModalOpen(true);
  };

  // Modifier un client (mode compatibilité)
  const handleEditClient = (clientWithStats: ClientWithStats) => {
    console.log('🔍 [CLIENT EDIT] Client sélectionné pour modification (mode compatibilité):', clientWithStats);
    setSelectedClientId(null);
    setClientSelectionne(clientWithStats);
    setModalOpen(true);
  };

  // Voir les détails d'un client (nouveau mode dynamique)
  const handleViewDetails = (clientWithStats: ClientWithStats) => {
    console.log('🔍 [CLIENT DETAILS] Client sélectionné pour détails (mode dynamique):', clientWithStats.client.id_client);
    
    setSelectedClientId(clientWithStats.client.id_client);
    setClientSelectionne(null); // On n'utilise plus clientToEdit pour le mode dynamique
    setModalOpen(true);
  };

  // Succès modal
  const handleClientSuccess = (response: AddEditClientResponse) => {
    const isCreation = response.result_action_effectuee === 'CREATION';
    
    console.log(
      isCreation 
        ? `✅ Client ${response.result_nom_client} créé avec succès`
        : `✅ Client ${response.result_nom_client} modifié avec succès`
    );
    
    // Recharger la liste
    loadClients();
  };

  // Component carte client
  const CarteClient = ({ clientWithStats }: { clientWithStats: ClientWithStats }) => {
    const { client, statistiques_factures } = clientWithStats;
    const hasImpayees = statistiques_factures.nombre_factures_impayees > 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-white truncate pr-2">{client.nom_client}</h3>
          {hasImpayees && (
            <span className="px-2 py-1 bg-red-500/20 text-red-200 rounded-lg text-xs font-medium border border-red-400/30">
              Impayés
            </span>
          )}
        </div>
        
        {/* Infos */}
        <div className="space-y-2 text-white/80 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4">📞</span>
            <span className="truncate">{client.tel_client}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4">📍</span>
            <span className="truncate">{client.adresse}</span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-white/60 text-xs">Factures</p>
              <p className="text-white font-semibold">{statistiques_factures.nombre_factures}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-white/60 text-xs">Total</p>
              <p className="text-white font-semibold">
                {clientsService.formatMontant(statistiques_factures.montant_total_factures)}
              </p>
            </div>
          </div>
          
          {statistiques_factures.montant_impaye > 0 && (
            <div className="mb-3 p-2 bg-red-500/20 rounded-lg border border-red-400/30">
              <p className="text-red-200 text-xs">
                Impayé: {clientsService.formatMontant(statistiques_factures.montant_impaye)}
              </p>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button 
            onClick={() => handleViewDetails(clientWithStats)}
            className="flex-1 py-2 bg-white/20 rounded-lg text-white text-sm hover:bg-white/30 transition-colors"
          >
            Détails
          </button>
          <button 
            onClick={() => handleEditClient(clientWithStats)}
            className="flex-1 py-2 bg-emerald-500/20 rounded-lg text-emerald-200 text-sm hover:bg-emerald-500/30 transition-colors"
          >
            Modifier
          </button>
        </div>
      </motion.div>
    );
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#9c9125d9] via-[#203e2b] to-[#166534] flex items-center justify-center">
        <div className="text-white text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9c9125d9] via-[#203e2b] to-[#166534]">
      <div className="max-w-md mx-auto bg-yellow-180 min-h-screen relative">
        
        {/* Header glassmorphism */}
        <GlassHeader
          title="👥 Gestion Clients"
          subtitle={user?.nom_structure}
          onBack={() => router.push('/dashboard')}
          showBackButton={true}
          backgroundGradient="bg-gradient-to-r from-green-800 via-yellow-700 to-red-600"
          filterContent={
            <div className="space-y-4">
              {/* Barre de recherche */}
              <div className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Rechercher un client..."
                  className="w-full px-4 py-2 pl-10 bg-white/20 border border-white/30 rounded-xl focus:ring-2 focus:ring-emerald-400 text-white placeholder-white/60"
                />
                <Users className="absolute left-3 top-2.5 w-4 h-4 text-white/60" />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-white/80 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Actualiser</span>
                </button>

                <div className="text-white/80 text-sm">
                  {clientsFiltered.length} client{clientsFiltered.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          }
        />

        {/* Contenu */}
        <div className="p-5 pb-24">
          
          {/* Stats globales */}
          {statistiquesGlobales && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Total Clients</p>
                    <p className="text-white font-bold text-lg">{statistiquesGlobales.nombre_total_clients}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-300" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Impayés</p>
                    <p className="text-red-300 font-bold text-lg">
                      {clientsService.formatMontant(statistiquesGlobales.montant_impaye_structure)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          <GlassPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={clientsFiltered.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            itemLabel="clients"
            className="mb-6"
          />

          {/* Liste des clients */}
          <div className="space-y-4">
            {isLoadingClients ? (
              // Skeleton loading
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white/10 rounded-2xl p-4 border border-white/20">
                    <div className="animate-pulse">
                      <div className="h-5 bg-white/20 rounded w-2/3 mb-3"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-white/20 rounded w-1/2"></div>
                        <div className="h-4 bg-white/20 rounded w-3/4"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="h-12 bg-white/20 rounded"></div>
                        <div className="h-12 bg-white/20 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : errorClients ? (
              // Erreur
              <div className="text-center py-12 bg-white/10 rounded-2xl border border-white/20">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-white/80 mb-4">{errorClients}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-xl transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : paginatedClients.length > 0 ? (
              // Liste des clients
              paginatedClients.map((clientWithStats) => (
                <CarteClient 
                  key={clientWithStats.client.id_client} 
                  clientWithStats={clientWithStats} 
                />
              ))
            ) : (
              // État vide
              <div className="text-center py-12 bg-white/10 rounded-2xl border border-white/20">
                <Users className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60 mb-2">
                  {searchTerm ? `Aucun client trouvé pour "${searchTerm}"` : 'Aucun client enregistré'}
                </p>
                {searchTerm ? (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                    }}
                    className="text-emerald-300 hover:text-emerald-200 text-sm underline"
                  >
                    Voir tous les clients
                  </button>
                ) : (
                  <button
                    onClick={handleAddClient}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-xl transition-colors"
                  >
                    Ajouter le premier client
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FAB - Bouton flottant */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAddClient}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Modal Client Multi-Onglets */}
      <ModalClientMultiOnglets
        isOpen={isModalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedClientId(null);
          setClientSelectionne(null);
        }}
        onSuccess={handleClientSuccess}
        clientId={selectedClientId}
        clientToEdit={clientSelectionne}
        defaultTab="general"
        onClientUpdated={handleClientUpdated}
      />

      {/* Toast Component */}
      <ToastComponent />
    </div>
  );
}