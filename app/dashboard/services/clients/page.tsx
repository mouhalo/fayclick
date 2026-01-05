/**
 * Page de gestion des clients pour les structures PRESTATAIRE DE SERVICES
 * Interface complète avec CRUD, recherche et modal multi-onglets
 * Utilise le meme pattern que Commerce avec theme bleu
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  Users,
  AlertCircle
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { clientsService, ClientsApiException } from '@/services/clients.service';
import { useClients, useClientsUI } from '@/hooks/useClients';
import { ModalClientMultiOnglets, FilterHeaderClientsGlass } from '@/components/clients';
import { useToast } from '@/components/ui/Toast';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { GlassPagination, usePagination } from '@/components/ui/GlassPagination';
import { ClientWithStats, AddEditClientResponse } from '@/types/client';
import { User } from '@/types/auth';

export default function ClientsServicesPage() {
  const router = useRouter();

  // Etats locaux
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // Pour l'affichage immediat
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Configuration pagination
  const itemsPerPage = 10;

  // Hooks optimises avec store Zustand
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

  // Verification authentification
  useEffect(() => {
    const checkAuthentication = () => {
      if (!authService.isAuthenticated()) {
        console.log('❌ [CLIENTS SERVICES] Utilisateur non authentifie');
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      if (!userData || userData.type_structure !== 'PRESTATAIRE DE SERVICES') {
        console.log('⚠️ [CLIENTS SERVICES] Type de structure incorrect');
        router.push('/dashboard');
        return;
      }

      console.log('✅ [CLIENTS SERVICES] Authentification validee');
      setUser(userData);
      setIsAuthLoading(false);
    };

    const timer = setTimeout(checkAuthentication, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Chargement des clients et stats
  const loadClients = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingClients(true);
      console.log('🔄 [CLIENTS SERVICES] Chargement des clients...');

      const response = await clientsService.getListeClients();
      setClients(response.clients);
      setStatistiquesGlobales(response.statistiques_globales);

      console.log(`✅ [CLIENTS SERVICES] ${response.clients.length} clients charges`);
    } catch (error) {
      console.error('❌ [CLIENTS SERVICES] Erreur chargement clients:', error);
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

    // Vider le cache AVANT de recharger
    clientsService.clearCache();
    console.log('🧹 [CLIENTS SERVICES] Cache vide avant actualisation');

    await loadClients();
    setRefreshing(false);

    console.log('✅ [CLIENTS SERVICES] Actualisation terminee');
  };

  // Mise a jour hybride : client specifique + statistiques globales
  const handleClientUpdated = useCallback(async (clientId: number) => {
    try {
      console.log('🔄 [CLIENTS SERVICES] Mise a jour hybride client + stats:', clientId);

      const result = await clientsService.updateClientAndStats(clientId, clients);

      setClients(result.clients);

      if (result.stats) {
        setStatistiquesGlobales(result.stats);
        console.log('📊 [CLIENTS SERVICES] Statistiques globales mises a jour');
      }

      console.log('✅ [CLIENTS SERVICES] Client et statistiques mis a jour');

    } catch (error) {
      console.error('❌ [CLIENTS SERVICES] Erreur mise a jour hybride:', error);
      await loadClients();
    }
  }, [clients, setClients, setStatistiquesGlobales, loadClients]);

  // Ajouter un nouveau client
  const handleAddClient = () => {
    setSelectedClientId(null);
    setClientSelectionne(null);
    setModalOpen(true);
  };

  // Modifier un client (mode compatibilite)
  const handleEditClient = (clientWithStats: ClientWithStats) => {
    console.log('🔍 [CLIENT EDIT] Client selectionne pour modification (mode compatibilite):', clientWithStats);
    setSelectedClientId(null);
    setClientSelectionne(clientWithStats);
    setModalOpen(true);
  };

  // Voir les details d'un client (nouveau mode dynamique)
  const handleViewDetails = (clientWithStats: ClientWithStats) => {
    console.log('🔍 [CLIENT DETAILS] Client selectionne pour details (mode dynamique):', clientWithStats.client.id_client);

    setSelectedClientId(clientWithStats.client.id_client);
    setClientSelectionne(null);
    setModalOpen(true);
  };

  // Succes modal
  const handleClientSuccess = async (response: AddEditClientResponse) => {
    const isCreation = response.result_action_effectuee === 'CREATION';

    console.log(
      isCreation
        ? `✅ Client ${response.result_tel_client} cree avec succes`
        : `✅ Client ${response.result_tel_client} modifie avec succes`
    );

    // Vider le cache du service pour forcer le rechargement
    clientsService.clearCache();

    // Recharger la liste
    await loadClients();

    console.log('✅ [CLIENTS SERVICES] Liste rechargee apres', isCreation ? 'creation' : 'modification');
  };

  // Component carte client
  const CarteClient = ({ clientWithStats }: { clientWithStats: ClientWithStats }) => {
    const { client, statistiques_factures } = clientWithStats;
    const hasImpayees = statistiques_factures.nombre_factures_impayees > 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => handleViewDetails(clientWithStats)}
        className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all cursor-pointer"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-white truncate pr-2">{client.nom_client}</h3>
          {hasImpayees && (
            <span className="px-2 py-1 bg-red-500/20 text-red-200 rounded-lg text-xs font-medium border border-red-400/30">
              Impayes
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
                Impaye: {clientsService.formatMontant(statistiques_factures.montant_impaye)}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditClient(clientWithStats);
            }}
            className="flex-1 py-2 bg-blue-500/20 rounded-lg text-blue-200 text-sm hover:bg-blue-500/30 transition-colors border border-blue-400/20"
          >
            ✏️ Modifier
          </button>
        </div>
      </motion.div>
    );
  };

  // Loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-lg">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="max-w-md mx-auto min-h-screen relative">

        {/* Header glassmorphism */}
        <GlassHeader
          title="👥 Gestion Clients"
          subtitle={user?.nom_structure}
          onBack={() => router.push('/dashboard/services')}
          showBackButton={true}
          backgroundGradient="bg-gradient-to-r from-blue-800 via-indigo-700 to-purple-600"
          filterContent={
            <FilterHeaderClientsGlass
              searchTerm={searchInput}
              onSearchChange={(value) => {
                setSearchInput(value);
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              onRefresh={handleRefresh}
              isRefreshing={refreshing}
            />
          }
        />

        {/* Contenu */}
        <div className="p-5 pb-24">

          {/* Stats globales */}
          {statistiquesGlobales && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-300" />
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
                    <p className="text-white/60 text-sm">Impayes</p>
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
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-xl transition-colors"
                >
                  Reessayer
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
              // Etat vide
              <div className="text-center py-12 bg-white/10 rounded-2xl border border-white/20">
                <Users className="w-12 h-12 text-white/40 mx-auto mb-3" />
                <p className="text-white/60 mb-2">
                  {searchTerm ? `Aucun client trouve pour "${searchTerm}"` : 'Aucun client enregistre'}
                </p>
                {searchTerm ? (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                    }}
                    className="text-blue-300 hover:text-blue-200 text-sm underline"
                  >
                    Voir tous les clients
                  </button>
                ) : (
                  <button
                    onClick={handleAddClient}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-xl transition-colors"
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg flex items-center justify-center"
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
