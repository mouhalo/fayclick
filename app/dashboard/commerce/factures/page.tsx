/**
 * Page de gestion des factures avec design glassmorphism
 * Interface mobile-first avec effet de verre et animations
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Receipt, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { StatsCardsFacturesGlass } from '@/components/factures/StatsCardsFacturesGlass';
import { FilterHeaderGlass } from '@/components/factures/FilterHeaderGlass';
import { FacturesList } from '@/components/factures/FacturesList';
import { GlassPagination, usePagination } from '@/components/ui/GlassPagination';
import { ModalPaiement } from '@/components/factures/ModalPaiement';
import { ModalPartage } from '@/components/factures/ModalPartage';
import { ModalFacturePrivee } from '@/components/facture/ModalFacturePrivee';
import { ModalConfirmation } from '@/components/ui/ModalConfirmation';
import { Toast } from '@/components/ui/Toast';
import { factureListService } from '@/services/facture-list.service';
import { facturePriveeService } from '@/services/facture-privee.service';
import { 
  GetMyFactureResponse,
  FactureComplete,
  FiltresFactures
} from '@/types/facture';

export default function FacturesGlassPage() {
  const router = useRouter();
  const { user } = useAuth();

  // États principaux
  const [facturesResponse, setFacturesResponse] = useState<GetMyFactureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>('');
  const [filtres, setFiltres] = useState<FiltresFactures>({
    sortBy: 'date',
    sortOrder: 'desc',
    statut: 'TOUS'
  });

  // États de pagination
  const [currentPage, setCurrentPage] = useState(1);

  // États des modals
  const [modalPaiement, setModalPaiement] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

  const [modalPartage, setModalPartage] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

  const [modalFacturePrivee, setModalFacturePrivee] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

  const [modalConfirmation, setModalConfirmation] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  // États des notifications
  const [toast, setToast] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ isOpen: false, type: 'info', message: '' });

  // Chargement initial des factures
  const loadFactures = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await factureListService.getMyFactures();
      setFacturesResponse(response);
      
    } catch (err: unknown) {
      console.error('Erreur chargement factures:', err);
      const errorMessage = err instanceof Error ? err.message : 'Impossible de charger les factures';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Chargement initial
  useEffect(() => {
    loadFactures();
  }, [loadFactures]);

  // Filtrage et tri des factures
  const facturesFiltrees = useMemo(() => {
    if (!facturesResponse?.factures) return [];
    
    return factureListService.filterFactures(facturesResponse.factures, filtres);
  }, [facturesResponse?.factures, filtres]);

  // Pagination des factures filtrées
  const { getPaginatedItems: getPaginatedFactures, totalPages: paginationTotalPages } = usePagination(facturesFiltrees.length, 10);
  const facturesPaginees = useMemo(() => {
    return getPaginatedFactures(facturesFiltrees, currentPage);
  }, [facturesFiltrees, currentPage, getPaginatedFactures]);

  // Gestionnaires d'événements
  const handleRetour = () => {
    router.push('/dashboard/commerce');
  };

  const handleFiltersChange = useCallback((newFiltres: FiltresFactures) => {
    setFiltres(newFiltres);
    setCurrentPage(1); // Remettre à la première page quand on filtre
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleAjouterAcompte = useCallback((facture: FactureComplete) => {
    setModalPaiement({ isOpen: true, facture });
  }, []);

  const handlePartager = useCallback((facture: FactureComplete) => {
    setModalPartage({ isOpen: true, facture });
  }, []);

  const handleVoirDetailsModal = useCallback((facture: FactureComplete) => {
    console.log('Ouverture modal facture:', facture.facture.id_facture);
    setModalFacturePrivee({ isOpen: true, facture });
  }, []);

  const handleSupprimer = useCallback((facture: FactureComplete) => {
    console.log('Demande de suppression facture:', facture.facture.num_facture);

    setModalConfirmation({
      isOpen: true,
      message: `Êtes-vous sûr de vouloir supprimer la facture ${facture.facture.num_facture} ?\n\nCette action est irréversible.`,
      onConfirm: () => executerSuppression(facture)
    });
  }, []);

  const executerSuppression = useCallback(async (facture: FactureComplete) => {
    try {
      console.log('🗑️ Exécution suppression facture:', facture.facture.num_facture);

      const result = await facturePriveeService.supprimerFacture(
        facture.facture.id_facture,
        facture.facture.id_structure
      );

      if (result.success) {
        // Fermer le modal de confirmation
        setModalConfirmation({ isOpen: false, message: '', onConfirm: () => {} });

        // Afficher toast de succès
        setToast({
          isOpen: true,
          type: 'success',
          message: `Facture ${facture.facture.num_facture} supprimée avec succès`
        });

        // Recharger la liste des factures
        loadFactures();
      } else {
        throw new Error(result.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('❌ Erreur suppression facture:', error);

      // Fermer le modal de confirmation
      setModalConfirmation({ isOpen: false, message: '', onConfirm: () => {} });

      // Afficher toast d'erreur
      setToast({
        isOpen: true,
        type: 'error',
        message: error instanceof Error ? error.message : 'Erreur lors de la suppression'
      });
    }
  }, [loadFactures]);

  // Succès de paiement
  const handlePaiementSuccess = useCallback((response: unknown) => {
    const typedResponse = response as { message?: string };
    setToast({
      isOpen: true,
      type: 'success',
      message: typedResponse.message || 'Paiement enregistré avec succès'
    });

    // Recharger les factures
    loadFactures();
  }, [loadFactures]);

  // Fermeture des modals
  const closeModalPaiement = useCallback(() => {
    setModalPaiement({ isOpen: false, facture: null });
  }, []);

  const closeModalPartage = useCallback(() => {
    setModalPartage({ isOpen: false, facture: null });
  }, []);

  const closeModalFacturePrivee = useCallback(() => {
    setModalFacturePrivee({ isOpen: false, facture: null });
  }, []);

  const closeToast = useCallback(() => {
    setToast({ isOpen: false, type: 'info', message: '' });
  }, []);

  // Fonction d'actualisation
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadFactures();
      setToast({
        isOpen: true,
        type: 'success',
        message: 'Factures actualisées avec succès'
      });
    } catch {
      setToast({
        isOpen: true,
        type: 'error',
        message: 'Erreur lors de l\'actualisation'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFactures]);


  // Interface d'erreur
  if (error && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'linear-gradient(to bottom right, #163707, #047857)'}}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-red-500/20 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-400/30">
            <AlertCircle className="w-10 h-10 text-red-300" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Erreur de chargement
          </h3>
          <p className="text-emerald-100 mb-6">{error}</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={loadFactures}
            className="bg-white/20 backdrop-blur-lg text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-colors border border-white/30"
          >
            Réessayer
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br" style={{background: 'linear-gradient(to bottom right, #163707, #047857)'}}>
      {/* Container mobile-first fixe */}
      <div className="mx-auto max-w-md shadow-2xl min-h-screen" style={{background: 'linear-gradient(to bottom right, #163707, #047857)'}}>
        
        {/* Header glassmorphism */}
        <GlassHeader
          title="Liste des Factures"
          onBack={handleRetour}
          showBackButton={true}
          rightContent={
            loading && (
              <div className="flex items-center space-x-2 text-white">
                <Loader className="w-4 h-4 animate-spin" />
              </div>
            )
          }
          filterContent={
            <FilterHeaderGlass
              onFiltersChange={handleFiltersChange}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          }
        />

        {/* Contenu scrollable */}
        <div className="px-5 py-6">
          
          {/* Stats Cards */}
          <StatsCardsFacturesGlass
            factures={facturesFiltrees}
            loading={loading}
          />


          {/* Pagination */}
          {!loading && facturesFiltrees.length > 0 && (
            <GlassPagination
              currentPage={currentPage}
              totalPages={paginationTotalPages}
              totalItems={facturesFiltrees.length}
              onPageChange={handlePageChange}
              className="mb-4"
            />
          )}
          
          {/* Liste des factures paginées */}
          <FacturesList
            factures={facturesPaginees}
            loading={loading}
            onVoirDetailsModal={handleVoirDetailsModal}
            onAjouterAcompte={handleAjouterAcompte}
            onPartager={handlePartager}
            onSupprimer={handleSupprimer}
          />

          {/* Message si aucune facture */}
          {!loading && facturesResponse && facturesResponse.factures.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                <Receipt className="w-12 h-12 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white/80 mb-2">
                Aucune facture créée
              </h3>
              <p className="text-emerald-100/70 text-sm mb-6">
                Commencez par créer votre première facture depuis la gestion des produits.
              </p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard/commerce/produits')}
                className="bg-white/20 backdrop-blur-lg text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-colors border border-white/30"
              >
                Gérer les produits
              </motion.button>
            </motion.div>
          )}

          {/* Message si aucun résultat de filtre */}
          {!loading && facturesFiltrees.length === 0 && facturesResponse && facturesResponse.factures.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Receipt className="w-8 h-8 text-white/60" />
              </div>
              <h3 className="text-lg font-semibold text-white/80 mb-2">
                Aucun résultat
              </h3>
              <p className="text-emerald-100/70 text-sm">
                Aucune facture ne correspond à vos critères de recherche.
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ModalPaiement
        isOpen={modalPaiement.isOpen}
        onClose={closeModalPaiement}
        facture={modalPaiement.facture}
        onSuccess={handlePaiementSuccess}
      />

      <ModalPartage
        isOpen={modalPartage.isOpen}
        onClose={closeModalPartage}
        facture={modalPartage.facture}
      />

      <ModalFacturePrivee
        isOpen={modalFacturePrivee.isOpen}
        onClose={closeModalFacturePrivee}
        factureId={modalFacturePrivee.facture?.facture.id_facture}
        onFactureDeleted={() => {
          // Recharger les factures après suppression
          loadFactures();
          setToast({
            isOpen: true,
            type: 'success',
            message: 'Facture supprimée avec succès'
          });
        }}
        onPaymentComplete={() => {
          // Recharger les factures après paiement
          loadFactures();
          setToast({
            isOpen: true,
            type: 'success',
            message: 'Paiement confirmé avec succès'
          });
        }}
      />

      {/* Modal de confirmation de suppression */}
      <ModalConfirmation
        isOpen={modalConfirmation.isOpen}
        onClose={() => setModalConfirmation({ isOpen: false, message: '', onConfirm: () => {} })}
        onConfirm={modalConfirmation.onConfirm}
        title="Supprimer la facture"
        message={modalConfirmation.message}
        confirmText="Supprimer"
        cancelText="Annuler"
        type="danger"
      />

      {/* Toast notifications */}
      <Toast
        isVisible={toast.isOpen}
        type={toast.type}
        title={toast.message}
        onClose={closeToast}
        duration={4000}
      />
    </div>
  );
}