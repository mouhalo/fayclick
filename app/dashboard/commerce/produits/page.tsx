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
  RefreshCw,
  Package,
  AlertCircle,
  Trash2,
  Printer,
  Camera,
  ChevronDown,
  BarChart3
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { produitsService, ProduitsApiException } from '@/services/produits.service';
import { useProduits, useProduitsUI } from '@/hooks/useProduits';
import { useSubscriptionStatus } from '@/contexts/AuthContext';
import { StatsCardsNouveaux, StatsCardsNouveauxLoading } from '@/components/produits/StatsCardsNouveaux';
import { CarteProduit, CarteProduitSkeleton } from '@/components/produits/CarteProduit';
import { CarteProduitReduit } from '@/components/produits/CarteProduitReduit';
import { CarteProduitReduitSkeleton } from '@/components/produits/CarteProduitReduitSkeleton';
import { ModalAjoutProduitNew } from '@/components/produits/ModalAjoutProduitNew';
import ModalPartagerProduit from '@/components/produit/ModalPartagerProduit';
import { StatusBarPanier } from '@/components/panier/StatusBarPanier';
import { ModalPanier } from '@/components/panier/ModalPanier';
import { ModalFactureSuccess } from '@/components/panier/ModalFactureSuccess';
import { useToast } from '@/components/ui/Toast';
import { GlassHeader } from '@/components/ui/GlassHeader';
import { ProduitsList } from '@/components/produits/ProduitsList';
import { ProduitsFilterHeader } from '@/components/produits/ProduitsFilterHeader';
import { GlassPagination, usePagination } from '@/components/ui/GlassPagination';
import { Produit, AddEditProduitResponse, ComparisonOperator } from '@/types/produit';
import { User } from '@/types/auth';
import { ModalScanCodeBarre } from '@/components/produits/ModalScanCodeBarre';
import { ModalImpressionProduits } from '@/components/produits/ModalImpressionProduits';
import { usePanierStore } from '@/stores/panierStore';
import { ModalAbonnementExpire, useModalAbonnementExpire } from '@/components/subscription/ModalAbonnementExpire';
import { ModalEnrolementProduits } from '@/components/visual-recognition';
import { ModalOptionsAjout } from '@/components/produits/ModalOptionsAjout';
import { ProduitsFilterPanel } from '@/components/produits/ProduitsFilterPanel';

export default function ProduitsCommercePage() {
  const router = useRouter();
  
  // États locaux
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'compact'>('compact');
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

  // État pour le modal d'impression
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [produitPartage, setProduitPartage] = useState<Produit | null>(null);

  // État pour l'export CSV
  const [isExporting, setIsExporting] = useState(false);


  // État pour le modal d'enrôlement par photo
  const [showEnrolementModal, setShowEnrolementModal] = useState(false);

  // État pour le modal d'options d'ajout
  const [showOptionsAjoutModal, setShowOptionsAjoutModal] = useState(false);

  // État pour l'accordéon des statistiques (replié par défaut)
  const [showStats, setShowStats] = useState(false);

  // État pour la pagination sticky en bas
  const [showStickyPagination, setShowStickyPagination] = useState(false);

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
    resetFiltres,
    setFiltres
  } = useProduits();

  const { ToastComponent, showToast } = useToast();

  // Hook état abonnement pour bloquer les fonctionnalités si expiré
  const { canAccessFeature } = useSubscriptionStatus();

  // Hook pour le modal d'abonnement expiré
  const {
    isOpen: isAbonnementModalOpen,
    featureName: abonnementFeatureName,
    showModal: showAbonnementModal,
    hideModal: hideAbonnementModal
  } = useModalAbonnementExpire();

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

  // Scroll listener pour la pagination sticky : afficher uniquement quand l'utilisateur atteint le bas de la page
  useEffect(() => {
    if (totalPages <= 1) {
      setShowStickyPagination(false);
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = documentHeight - scrollTop - windowHeight;

      // Afficher la sticky uniquement quand on est à moins de 150px du bas de la page
      setShowStickyPagination(distanceFromBottom < 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Vérifier la position initiale
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalPages, filteredCount, isLoadingProduits]);

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

  // Ouvre le modal d'options d'ajout (bouton flottant unique)
  const handleOpenOptionsAjout = () => {
    // Vérifier l'abonnement avant d'autoriser l'ajout
    if (!canAccessFeature('Ajout produit')) {
      showAbonnementModal('Ajout de produit');
      return;
    }
    setShowOptionsAjoutModal(true);
  };

  const handleAddProduit = () => {
    setProduitSelectionne(null);
    setModeEdition(false);
    setModalAjoutOpen(true);
  };

  // Gestion de l'enrôlement par photo
  const handleOpenEnrolement = () => {
    console.log('📸 [PRODUITS COMMERCE] Ouverture enrôlement par photo');
    setShowEnrolementModal(true);
  };

  const handleEnrolementSuccess = (nbProduits: number) => {
    console.log(`✅ [PRODUITS COMMERCE] ${nbProduits} produit(s) créé(s) par enrôlement`);
    showToast('success', 'Produits créés !', `${nbProduits} produit${nbProduits > 1 ? 's' : ''} ajouté${nbProduits > 1 ? 's' : ''} avec succès`);
    // Recharger la liste des produits
    loadProduits();
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

    // Vérifier l'abonnement avant d'autoriser l'ajout au panier
    if (!canAccessFeature('Vente produit')) {
      setShowScanModal(false);
      showAbonnementModal('Vente de produit');
      return;
    }

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

  // Gestion du modal d'impression
  const handlePrint = () => {
    console.log('🖨️ [PRODUITS COMMERCE] Ouverture modal d\'impression');
    setShowPrintModal(true);
  };

  // Export CSV des produits
  const handleExportCSV = useCallback(() => {
    if (produitsFiltered.length === 0) {
      showToast('error', 'Aucun produit', 'Aucun produit à exporter');
      return;
    }

    setIsExporting(true);

    try {
      // En-têtes CSV
      const headers = ['Nom Produit', 'Prix Achat (FCFA)', 'Stock'];

      // Données produits
      const rows = produitsFiltered.map(p => [
        (p.nom_produit || '').replace(/[;,]/g, ' '), // Échapper les séparateurs
        (p.cout_revient ?? 0).toString(),
        (p.niveau_stock ?? p.stock_actuel ?? 0).toString()
      ]);

      // Créer le contenu CSV avec BOM UTF-8 pour Excel
      const BOM = '\uFEFF';
      const csvContent = BOM + [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
      link.download = `produits_${(user?.nom_structure || 'export').replace(/\s+/g, '_')}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✅ Export CSV: ${produitsFiltered.length} produits exportés`);
      showToast('success', 'Export réussi', `${produitsFiltered.length} produits exportés`);
    } catch (error) {
      console.error('❌ Erreur export CSV:', error);
      showToast('error', 'Erreur', 'Erreur lors de l\'export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [produitsFiltered, user, showToast]);

  // Gestion de la pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gestion des filtres avec reset de pagination
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset à la première page
  };


  const handleClearFilters = () => {
    resetFiltres();
    setShowFilters(false);
    setCurrentPage(1); // Reset à la première page
  };

  // Gestion des filtres avancés (mappe FiltreAvance -> FiltreProduits)
  const handleApplyAdvancedFilters = (advancedFilters: {
    categorie?: string;
    stockOperator?: ComparisonOperator;
    stockValue?: number;
    prixOperator?: ComparisonOperator;
    prixValue?: number;
  }) => {
    setFiltres({
      nom_categorie: advancedFilters.categorie,
      stockOperator: advancedFilters.stockOperator,
      stockValue: advancedFilters.stockValue,
      prixOperator: advancedFilters.prixOperator,
      prixValue: advancedFilters.prixValue,
    });
    setCurrentPage(1);
  };

  // Compteur de filtres actifs
  const activeFiltersCount = [
    filtres.nom_categorie,
    filtres.stockOperator && filtres.stockValue !== undefined,
    filtres.prixOperator && filtres.prixValue !== undefined,
  ].filter(Boolean).length;

  // Handlers pour la vue tableau
  const handleProduitClickTable = (produit: Produit) => {
    // Clic sur une ligne du tableau = Éditer le produit
    handleEditProduit(produit);
  };

  const handleVendreClick = (produit: Produit) => {
    // Vérifier l'abonnement avant d'autoriser la vente
    if (!canAccessFeature('Vente produit')) {
      showAbonnementModal('Vente de produit');
      return;
    }

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
          onQrCode={setProduitPartage}
          typeStructure="COMMERCIALE"
          onSubscriptionRequired={showAbonnementModal}
        />
      );
    }

    // Vues grille et table : utilise CarteProduit classique
    return (
      <CarteProduit
        produit={produit}
        onEdit={handleEditProduit}
        onDelete={handleDeleteProduit}
        onQrCode={setProduitPartage}
        typeStructure="COMMERCIALE"
        compactMode={false}
        onSubscriptionRequired={showAbonnementModal}
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
      <div className="max-w-md md:max-w-full md:px-6 lg:px-8 xl:px-12 mx-auto min-h-screen relative">
        
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
              onPrintClick={handlePrint}
              onExportCSV={handleExportCSV}
              isExporting={isExporting}
            />
          }
        />

        {/* Panneau de filtres avancés */}
        <div className="px-5 pt-2">
          <ProduitsFilterPanel
            isOpen={showFilters}
            produits={produits}
            onApplyFilters={handleApplyAdvancedFilters}
            onResetFilters={handleClearFilters}
            activeFiltersCount={activeFiltersCount}
          />
        </div>

        {/* Contenu principal */}
        <div className="p-5 pb-24">

          {/* Accordéon Statistiques */}
          <div className="mb-4">
            {/* Header accordéon */}
            <motion.button
              onClick={() => setShowStats(!showStats)}
              className="w-full flex items-center justify-between p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Icône animée */}
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md"
                  >
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </motion.div>
                  {/* Pulse effect */}
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 bg-amber-400 rounded-lg"
                  />
                </div>
                <div className="text-left">
                  <h3 className="text-white font-semibold text-sm sm:text-base">Valeur de vos Stocks</h3>
                  <p className="text-white/70 text-xs sm:text-sm">
                    {showStats ? 'Cliquez pour replier' : 'Cliquez pour voir les détails'}
                  </p>
                </div>
              </div>
              {/* Chevron */}
              <motion.div
                animate={{ rotate: showStats ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </motion.div>
            </motion.button>

            {/* Contenu accordéon */}
            <motion.div
              initial={false}
              animate={{
                height: showStats ? 'auto' : 0,
                opacity: showStats ? 1 : 0,
                marginTop: showStats ? 12 : 0
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {isLoadingProduits ? (
                <StatsCardsNouveauxLoading />
              ) : (
                <StatsCardsNouveaux
                  articles={produitsFiltered}
                />
              )}
            </motion.div>
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
            hasFilters={Object.values(filtres).some(v => v !== undefined && v !== '')}
            skeletonCount={itemsPerPage}
            onProduitClick={handleProduitClickTable}
            onVendreClick={handleVendreClick}
          />

          {/* Sentinel bas de page pour l'espacement */}
          <div className="h-4" />
        </div>

        {/* Bouton flottant vert sombre - Ouvre modal options d'ajout */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenOptionsAjout}
          className="fixed bottom-6 right-6 group z-40"
          aria-label="Ajouter un produit"
          title="Ajouter un produit"
        >
          {/* Effet de halo pulsant */}
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.15, 0.4]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-emerald-500 rounded-2xl blur-lg"
          />
          {/* Bouton principal vert sombre */}
          <div className="relative w-14 h-14 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden group-hover:from-emerald-500 group-hover:to-green-600 transition-all duration-300 border-2 border-emerald-400/50">
            {/* Reflet brillant */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
            {/* Icône */}
            <Plus className="w-8 h-8 text-white drop-shadow-lg relative z-10 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
          </div>
          {/* Label "Ajouter" */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-700 rounded-lg text-white text-sm font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            Ajouter
          </span>
        </motion.button>
      
        {/* Pagination sticky fixed en bas - visible quand on scrolle et la pagination statique n'est plus visible */}
        <AnimatePresence>
          {showStickyPagination && totalPages > 1 && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-16 left-0 right-0 z-[45] px-4 pb-2"
            >
              <div className="max-w-md md:max-w-full md:px-6 lg:px-8 xl:px-12 mx-auto">
                <GlassPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  itemLabel="produits"
                  className="shadow-2xl bg-green-600/90 backdrop-blur-md border border-white/30 rounded-xl"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* StatusBar Panier - fixe en bas */}
        <StatusBarPanier />
      </div>

      {/* Modal options d'ajout (3 méthodes) */}
      <ModalOptionsAjout
        isOpen={showOptionsAjoutModal}
        onClose={() => setShowOptionsAjoutModal(false)}
        onSelectManuel={handleAddProduit}
        onSelectPhoto={handleOpenEnrolement}
      />

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

      {/* Modal d'impression */}
      <ModalImpressionProduits
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        produits={produitsFiltered}
        nomStructure={user.nom_structure}
        isFiltered={activeFiltersCount > 0 || !!searchTerm}
        totalProduitsCount={produits.length}
      />


      {/* Modal d'enrôlement par photo */}
      {user && (
        <ModalEnrolementProduits
          isOpen={showEnrolementModal}
          onClose={() => setShowEnrolementModal(false)}
          idStructure={user.id_structure}
          onSuccess={handleEnrolementSuccess}
        />
      )}

      {/* Toast Component */}
      <ToastComponent />

      {/* Modal abonnement expiré */}
      <ModalAbonnementExpire
        isOpen={isAbonnementModalOpen}
        onClose={hideAbonnementModal}
        featureName={abonnementFeatureName}
      />

      {/* Modal partage produit (Online Seller) */}
      {produitPartage && user && (
        <ModalPartagerProduit
          isOpen={!!produitPartage}
          onClose={() => setProduitPartage(null)}
          produit={produitPartage}
          idStructure={user.id_structure}
        />
      )}
    </div>
  );
}