/**
 * Page de gestion des produits pour les structures COMMERCIALE
 * Interface complète avec CRUD, recherche, panier et statistiques
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid, 
  List,
  RefreshCw,
  Download,
  Upload,
  Package,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { produitsService, ProduitsApiException } from '@/services/produits.service';
import { useProduits, useProduitsUI } from '@/hooks/useProduits';
import { StatsCardsNouveaux, StatsCardsNouveauxLoading } from '@/components/produits/StatsCardsNouveaux';
import { CarteProduit, CarteProduitSkeleton } from '@/components/produits/CarteProduit';
import { ModalAjoutProduitNew } from '@/components/produits/ModalAjoutProduitNew';
import { StatusBarPanier } from '@/components/panier/StatusBarPanier';
import { ModalPanier } from '@/components/panier/ModalPanier';
import { ModalFactureSuccess } from '@/components/panier/ModalFactureSuccess';
import { Toast, useToast } from '@/components/ui/Toast';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { ProduitsList } from '@/components/produits/ProduitsList';
import { ProduitsFilterHeader } from '@/components/produits/ProduitsFilterHeader';
import { ProduitsStatsHeader } from '@/components/produits/ProduitsStatsHeader';
import { Produit, ProduitFormData, ProduitFormDataNew, AddEditProduitResponse, FiltreProduits } from '@/types/produit';
import { User } from '@/types/auth';

export default function ProduitsCommercePage() {
  const router = useRouter();
  
  // États locaux
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Hooks optimisés
  const {
    produits,
    produitsFiltered,
    searchTerm,
    filtres,
    isLoadingProduits,
    errorProduits,
    setProduits,
    setSearchTerm,
    setFiltres,
    setLoadingProduits,
    setErrorProduits,
    ajouterProduit,
    modifierProduit,
    supprimerProduit,
    resetFiltres
  } = useProduits();

  const { ToastComponent } = useToast();


  const {
    isModalAjoutOpen,
    produitSelectionne,
    modeEdition,
    setModalAjoutOpen,
    setProduitSelectionne,
    setModeEdition
  } = useProduitsUI();

  // Vérification authentification
  useEffect(() => {
    const checkAuthentication = () => {
      if (!authService.isAuthenticated()) {
        console.log('❌ [PRODUITS COMMERCE] Utilisateur non authentifié');
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      if (!userData || userData.type_structure !== 'COMMERCIALE') {
        console.log('⚠️ [PRODUITS COMMERCE] Type de structure incorrect');
        router.push('/dashboard');
        return;
      }
      
      console.log('✅ [PRODUITS COMMERCE] Authentification validée');
      setUser(userData);
      setIsAuthLoading(false);
    };

    const timer = setTimeout(checkAuthentication, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Chargement des produits et stats
  const loadProduits = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingProduits(true);
      console.log('🔄 [PRODUITS COMMERCE] Chargement des produits...');
      
      const response = await produitsService.getListeProduits(filtres);
      setProduits(response.data);
      
      console.log(`✅ [PRODUITS COMMERCE] ${response.data.length} produits chargés`);
    } catch (error) {
      console.error('❌ [PRODUITS COMMERCE] Erreur chargement produits:', error);
      const errorMessage = error instanceof ProduitsApiException 
        ? error.message 
        : 'Impossible de charger les produits';
      setErrorProduits(errorMessage);
    } finally {
      setLoadingProduits(false);
    }
  }, [user, filtres, setProduits, setLoadingProduits, setErrorProduits]);


  // Chargement initial
  useEffect(() => {
    if (user && !isAuthLoading) {
      loadProduits();
    }
  }, [user, isAuthLoading, loadProduits]);

  // Rechargement manuel
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProduits();
    setRefreshing(false);
  };

  // Retour au dashboard
  const handleRetour = () => {
    router.push('/dashboard');
  };

  // Gestion des produits avec nouvelle API
  const handleProduitSuccess = async (produit: AddEditProduitResponse) => {
    try {
      console.log('✅ [PRODUITS COMMERCE] Produit sauvegardé:', produit.nom_produit);
      
      // Convertir AddEditProduitResponse vers Produit pour compatibilité
      const produitComplet: Produit = {
        id_produit: produit.id_produit,
        id_structure: produit.id_structure,
        nom_produit: produit.nom_produit,
        cout_revient: produit.cout_revient,
        prix_vente: produit.prix_vente,
        est_service: produit.est_service,
        niveau_stock: 0, // Sera mis à jour par les mouvements de stock
        marge: produit.prix_vente - produit.cout_revient
      };

      if (produit.action_effectuee === 'CREATION') {
        ajouterProduit(produitComplet);
      } else if (produit.action_effectuee === 'MODIFICATION') {
        modifierProduit(produit.id_produit, produitComplet);
      }
      
      // Recharger la liste pour avoir les données à jour
      await loadProduits();
      
    } catch (error) {
      console.error('❌ [PRODUITS COMMERCE] Erreur traitement succès:', error);
    }
  };

  const handleDeleteProduit = async (id_produit: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      console.log('🗑️ [PRODUITS COMMERCE] Suppression produit:', id_produit);
      await produitsService.deleteProduit(id_produit);
      supprimerProduit(id_produit);
      
      console.log('✅ [PRODUITS COMMERCE] Produit supprimé avec succès');
    } catch (error) {
      console.error('❌ [PRODUITS COMMERCE] Erreur suppression produit:', error);
      alert('Impossible de supprimer le produit. Veuillez réessayer.');
    }
  };

  // Gestion du modal - simplifié car la logique est maintenant dans le modal

  const handleEditProduit = (produit: Produit) => {
    setProduitSelectionne(produit);
    setModeEdition(true);
    setModalAjoutOpen(true);
  };

  const handleAddProduit = () => {
    setProduitSelectionne(null);
    setModeEdition(false);
    setModalAjoutOpen(true);
  };

  const handleCloseModal = () => {
    setModalAjoutOpen(false);
    setProduitSelectionne(null);
    setModeEdition(false);
  };

  // Note: La gestion du panier est maintenant dans CarteProduit via le store Zustand

  // Gestion des filtres
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleFiltersChange = (newFilters: Partial<FiltreProduits>) => {
    setFiltres(newFilters);
  };

  const handleClearFilters = () => {
    resetFiltres();
  };

  // Loading state
  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-200">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-30"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-white text-lg font-medium animate-pulse">
            Chargement des produits...
          </p>
        </div>
      </div>
    );
  }

  const renderProduitItem = (produit: Produit, index: number) => (
    <CarteProduit
      produit={produit}
      onEdit={handleEditProduit}
      onDelete={handleDeleteProduit}
      typeStructure="COMMERCIALE"
      compactMode={viewMode === 'list'}
    />
  );

  const renderProduitSkeleton = (index: number) => (
    <CarteProduitSkeleton key={index} compactMode={viewMode === 'list'} />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800">
      <div className="max-w-md mx-auto bg-white min-h-screen relative">
        
        {/* Header avec design glassmorphism */}
        <GlassHeader
          title="Gestion Produits"
          subtitle={user.nom_structure}
          onBack={handleRetour}
          showBackButton={true}
          backgroundGradient="bg-gradient-to-r from-green-500 to-green-600"
          rightContent={
            <ProduitsStatsHeader 
              produits={produitsFiltered} 
              loading={isLoadingProduits}
            />
          }
          filterContent={
            <ProduitsFilterHeader
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          }
        />

        {/* Contenu principal */}
        <div className="p-5 pb-24">
          
          {/* Statistiques */}
          <div className="mb-6">
            {isLoadingProduits ? (
              <StatsCardsNouveauxLoading />
            ) : (
              <StatsCardsNouveaux 
                articles={produitsFiltered}
              />
            )}
          </div>

          {/* Message d'erreur */}
          {errorProduits && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Erreur de chargement</p>
                <p className="text-red-600 text-sm">{errorProduits}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="ml-auto p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}

          {/* Liste des produits avec nouveau composant */}
          <ProduitsList
            items={produitsFiltered}
            loading={isLoadingProduits}
            viewMode={viewMode}
            renderItem={renderProduitItem}
            renderSkeleton={renderProduitSkeleton}
            onAddProduit={handleAddProduit}
            onClearFilters={handleClearFilters}
            isEmpty={!isLoadingProduits && produits.length === 0}
            hasNoResults={!isLoadingProduits && produits.length > 0 && produitsFiltered.length === 0}
            searchTerm={searchTerm}
            hasFilters={Object.keys(filtres).length > 0}
            skeletonCount={6}
          />
        </div>

        {/* Bouton flottant Ajouter */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleAddProduit}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 z-40"
          aria-label="Ajouter un produit"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      
        {/* StatusBar Panier - fixe en bas */}
        <StatusBarPanier />
      </div>

      {/* Modals */}
      <ModalAjoutProduitNew
        isOpen={isModalAjoutOpen}
        onClose={handleCloseModal}
        onSuccess={handleProduitSuccess}
        onStockUpdate={loadProduits}
        produitToEdit={produitSelectionne}
        typeStructure="COMMERCIALE"
      />

      <ModalPanier />
      <ModalFactureSuccess />
    </div>
    
    {/* Toast Component */}
    <ToastComponent />
  );
}