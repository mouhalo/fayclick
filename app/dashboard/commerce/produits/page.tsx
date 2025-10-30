/**
 * Page de gestion des produits pour les structures COMMERCIALE
 * Interface complète avec CRUD, recherche, panier et statistiques
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  Package,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { produitsService, ProduitsApiException } from '@/services/produits.service';
import { useProduits, useProduitsUI } from '@/hooks/useProduits';
import { StatsCardsNouveaux, StatsCardsNouveauxLoading } from '@/components/produits/StatsCardsNouveaux';
import { CarteProduit, CarteProduitSkeleton } from '@/components/produits/CarteProduit';
import { CarteProduitReduit } from '@/components/produits/CarteProduitReduit';
import { CarteProduitReduitSkeleton } from '@/components/produits/CarteProduitReduitSkeleton';
import { ModalAjoutProduitNew } from '@/components/produits/ModalAjoutProduitNew';
import { StatusBarPanier } from '@/components/panier/StatusBarPanier';
import { ModalPanier } from '@/components/panier/ModalPanier';
import { ModalFactureSuccess } from '@/components/panier/ModalFactureSuccess';
import { useToast } from '@/components/ui/Toast';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { ProduitsList } from '@/components/produits/ProduitsList';
import { ProduitsFilterHeader } from '@/components/produits/ProduitsFilterHeader';
import { GlassPagination, usePagination } from '@/components/ui/GlassPagination';
import { Produit, AddEditProduitResponse } from '@/types/produit';
import { User } from '@/types/auth';
import { ModalScanCodeBarre } from '@/components/produits/ModalScanCodeBarre';
import { usePanierStore } from '@/stores/panierStore';

export default function ProduitsCommercePage() {
  const router = useRouter();
  
  // États locaux
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'compact'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // États pour le workflow d'ajout de stock
  const [pendingStockProduct, setPendingStockProduct] = useState<AddEditProduitResponse | null>(null);
  const [showStockConfirmation, setShowStockConfirmation] = useState(false);

  // États pour la confirmation de suppression
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [produitToDelete, setProduitToDelete] = useState<Produit | null>(null);

  // État pour le scanner de code-barres
  const [showScanModal, setShowScanModal] = useState(false);

  // Configuration pagination
  const itemsPerPage = 10;

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
    setLoadingProduits,
    setErrorProduits,
    ajouterProduit,
    modifierProduit,
    supprimerProduit,
    resetFiltres
  } = useProduits();

  const { ToastComponent, showToast } = useToast();

  // Store panier
  const addArticle = usePanierStore(state => state.addArticle);

  // Pagination
  const filteredCount = produitsFiltered.length;
  const { 
    totalPages, 
    getPaginatedItems 
  } = usePagination(filteredCount, itemsPerPage);
  
  const paginatedItems = getPaginatedItems(produitsFiltered, currentPage);

  const {
    isModalAjoutOpen,
    produitSelectionne,
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

  const handleDeleteProduit = (produit: Produit) => {
    console.log('🗑️ [PRODUITS COMMERCE] Demande suppression produit:', produit.nom_produit);
    setProduitToDelete(produit);
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = async () => {
    if (!produitToDelete) return;

    try {
      console.log('🗑️ [PRODUITS COMMERCE] Suppression confirmée:', produitToDelete.id_produit);
      await produitsService.deleteProduit(produitToDelete.id_produit);
      supprimerProduit(produitToDelete.id_produit);

      console.log('✅ [PRODUITS COMMERCE] Produit supprimé avec succès');
      setShowDeleteConfirmation(false);
      setProduitToDelete(null);
    } catch (error) {
      console.error('❌ [PRODUITS COMMERCE] Erreur suppression produit:', error);
      alert('Impossible de supprimer le produit. Veuillez réessayer.');
    }
  };

  const handleCancelDelete = () => {
    console.log('❌ [PRODUITS COMMERCE] Suppression annulée');
    setShowDeleteConfirmation(false);
    setProduitToDelete(null);
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

  // Gestion de la demande d'ajout de stock après création
  const handleRequestStockAddition = (produit: AddEditProduitResponse) => {
    console.log('📦 [PRODUITS COMMERCE] Demande d\'ajout de stock pour:', produit.nom_produit);
    setPendingStockProduct(produit);
    setShowStockConfirmation(true);
    // Fermer le modal de création
    handleCloseModal();
  };

  const handleStockConfirmationYes = () => {
    if (!pendingStockProduct) return;

    console.log('✅ [PRODUITS COMMERCE] Confirmation ajout de stock pour:', pendingStockProduct.nom_produit);
    console.log('📋 [PRODUITS COMMERCE] Données produit reçues:', pendingStockProduct);

    // Vérifier si l'id_produit est bien défini
    if (!pendingStockProduct.id_produit) {
      console.error('❌ [PRODUITS COMMERCE] ID produit manquant:', pendingStockProduct);
      alert('Erreur: ID du produit manquant. Impossible d\'ajouter du stock.');
      setShowStockConfirmation(false);
      setPendingStockProduct(null);
      return;
    }

    // Convertir AddEditProduitResponse vers Produit pour le modal d'édition
    const produitPourStock: Produit = {
      id_produit: pendingStockProduct.id_produit,
      id_structure: pendingStockProduct.id_structure,
      nom_produit: pendingStockProduct.nom_produit,
      cout_revient: pendingStockProduct.cout_revient,
      prix_vente: pendingStockProduct.prix_vente,
      est_service: pendingStockProduct.est_service,
      nom_categorie: pendingStockProduct.nom_categorie || 'produit_service',
      description: pendingStockProduct.description || 'RAS',
      niveau_stock: 0,
      stock_actuel: 0,
      marge: pendingStockProduct.prix_vente - pendingStockProduct.cout_revient
    };

    console.log('🔄 [PRODUITS COMMERCE] Produit converti pour stock:', produitPourStock);

    // Fermer la confirmation et ouvrir le modal d'édition sur l'onglet stock
    setShowStockConfirmation(false);
    setPendingStockProduct(null);
    setProduitSelectionne(produitPourStock);
    setModeEdition(true);
    setModalAjoutOpen(true);
  };

  const handleStockConfirmationNo = () => {
    console.log('❌ [PRODUITS COMMERCE] Refus ajout de stock');
    setShowStockConfirmation(false);
    setPendingStockProduct(null);
  };

  // Gestion du scanner de code-barres pour ajout direct au panier
  const handleScanSuccess = (code: string) => {
    console.log('📸 [PRODUITS COMMERCE] Code-barres scanné:', code);

    // Rechercher le produit par code-barres dans la liste filtrée
    // Note: L'API retourne 'code_barre' (sans 's')
    const produitTrouve = produitsFiltered.find(p => p.code_barre === code);

    if (produitTrouve) {
      console.log('✅ [PRODUITS COMMERCE] Produit trouvé:', produitTrouve.nom_produit);

      // Vérifier le stock disponible
      const stockDisponible = produitTrouve.niveau_stock || 0;
      if (stockDisponible < 1) {
        showToast('error', 'Stock insuffisant', `Le produit "${produitTrouve.nom_produit}" n'est plus en stock.`);
        setShowScanModal(false);
        return;
      }

      // Ajouter au panier
      addArticle(produitTrouve);
      showToast('success', 'Produit ajouté', `"${produitTrouve.nom_produit}" a été ajouté au panier`);
      setShowScanModal(false);
    } else {
      console.log('❌ [PRODUITS COMMERCE] Produit non trouvé pour le code:', code);
      showToast('error', 'Produit non trouvé', `Aucun produit trouvé avec le code-barres ${code}`);
      // Ne pas fermer le modal pour permettre un nouveau scan
    }
  };

  // Note: La gestion du panier est maintenant dans CarteProduit via le store Zustand

  // Gestion de la pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Gestion des filtres avec reset de pagination
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset à la première page
  };


  const handleClearFilters = () => {
    resetFiltres();
    setCurrentPage(1); // Reset à la première page
  };

  // Handlers pour la vue tableau
  const handleProduitClickTable = (produit: Produit) => {
    // Clic sur une ligne du tableau = Éditer le produit
    handleEditProduit(produit);
  };

  const handleVendreClick = (produit: Produit) => {
    // Bouton Vendre = Ajouter au panier
    const stock = produit.niveau_stock || 0;
    if (stock > 0) {
      addArticle({
        ...produit,
        quantity: 1 // Quantité par défaut
      });
      showToast('success', 'Produit ajouté', `${produit.nom_produit} ajouté au panier`);
    } else {
      showToast('error', 'Stock épuisé', 'Ce produit n\'est plus disponible');
    }
  };

  // Loading state
  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#9c9125d9] via-[#203e2b] to-[#166534]">
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

  const renderProduitItem = (produit: Produit) => {
    // Vue compacte : utilise CarteProduitReduit
    if (viewMode === 'compact') {
      return (
        <CarteProduitReduit
          produit={produit}
          onEdit={handleEditProduit}
          onDelete={handleDeleteProduit}
          typeStructure="COMMERCIALE"
        />
      );
    }

    // Vues grille et table : utilise CarteProduit classique
    return (
      <CarteProduit
        produit={produit}
        onEdit={handleEditProduit}
        onDelete={handleDeleteProduit}
        typeStructure="COMMERCIALE"
        compactMode={false}
      />
    );
  };

  const renderProduitSkeleton = (index: number) => {
    // Skeleton pour vue compacte
    if (viewMode === 'compact') {
      return <CarteProduitReduitSkeleton key={index} />;
    }

    // Skeleton pour vues grille et table
    return <CarteProduitSkeleton key={index} compactMode={false} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9c9125d9] via-[#203e2b] to-[#166534]">
      <div className="max-w-md mx-auto min-h-screen relative">
        
        {/* Header avec design glassmorphism */}
        <GlassHeader
          title="🛍️ Gestion Produits"
          subtitle={user.nom_structure}
          onBack={handleRetour}
          showBackButton={true}
          backgroundGradient="bg-gradient-to-r from-green-500 to-green-600"
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
              onScanClick={() => setShowScanModal(true)}
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

          {/* Pagination glassmorphism */}
          {!isLoadingProduits && filteredCount > 0 && (
            <GlassPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredCount}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              itemLabel="produits"
              className="mb-6"
            />
          )}

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
            items={paginatedItems}
            loading={isLoadingProduits}
            viewMode={viewMode}
            renderItem={renderProduitItem}
            renderSkeleton={renderProduitSkeleton}
            onAddProduit={handleAddProduit}
            onClearFilters={handleClearFilters}
            isEmpty={!isLoadingProduits && produits.length === 0}
            hasNoResults={!isLoadingProduits && produits.length > 0 && filteredCount === 0}
            searchTerm={searchTerm}
            hasFilters={Object.keys(filtres).length > 0}
            skeletonCount={itemsPerPage}
            onProduitClick={handleProduitClickTable}
            onVendreClick={handleVendreClick}
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
        onRequestStockAddition={handleRequestStockAddition}
        produitToEdit={produitSelectionne}
        typeStructure="COMMERCIALE"
        defaultTab={produitSelectionne ? 'gestion-stock' : 'informations'}
      />

      <ModalPanier />
      <ModalFactureSuccess />

      {/* Modal de confirmation d'ajout de stock */}
      {showStockConfirmation && pendingStockProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Produit créé avec succès !
              </h3>
              <p className="text-slate-600 mb-2 font-medium">
                {pendingStockProduct.nom_produit}
              </p>
              <p className="text-slate-600 mb-6">
                Voulez-vous ajouter des quantités au stock pour ce produit maintenant ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleStockConfirmationNo}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Plus tard
                </button>
                <button
                  onClick={handleStockConfirmationYes}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Oui, ajouter du stock
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirmation && produitToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Supprimer le produit ?
              </h3>
              <p className="text-slate-600 mb-2 font-medium">
                {produitToDelete.nom_produit}
              </p>
              <p className="text-slate-600 mb-6 text-sm">
                Cette action est irréversible. Le produit et toutes ses données associées seront définitivement supprimés.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal scanner de code-barres */}
      <ModalScanCodeBarre
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onScanSuccess={handleScanSuccess}
        context="panier"
      />

      {/* Toast Component */}
      <ToastComponent />
    </div>
  );
}