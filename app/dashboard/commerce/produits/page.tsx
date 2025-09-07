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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800">
        <div className="max-w-md mx-auto bg-white min-h-screen">
          
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white sticky top-0 z-30"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold">Gestion Produits</h1>
                <p className="text-green-100 text-sm">{user.nom_structure}</p>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRetour}
                  className="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </motion.button>
              </div>
            </div>

            {/* Barre de recherche */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            {/* Contrôles vue et filtres */}
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-white/20 rounded-lg p-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-green-600' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white text-green-600' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <List className="w-4 h-4" />
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showFilters ? 'bg-white text-green-600' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtres
              </motion.button>
            </div>
          </motion.div>

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

            {/* Liste des produits */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Produits ({produitsFiltered.length})
                </h2>
                
                {produitsFiltered.length > 0 && (
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Exporter"
                    >
                      <Download className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Importer"
                    >
                      <Upload className="w-4 h-4" />
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Grille/Liste des produits */}
              {isLoadingProduits ? (
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <CarteProduitSkeleton key={i} compactMode={viewMode === 'list'} />
                  ))}
                </div>
              ) : produitsFiltered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {searchTerm || Object.keys(filtres).length > 0 
                      ? 'Aucun produit trouvé' 
                      : 'Aucun produit enregistré'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || Object.keys(filtres).length > 0
                      ? 'Essayez de modifier vos critères de recherche'
                      : 'Commencez par ajouter vos premiers produits'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {(searchTerm || Object.keys(filtres).length > 0) && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleClearFilters}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Effacer les filtres
                      </motion.button>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAddProduit}
                      className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un produit
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`grid gap-4 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                      : 'grid-cols-1'
                  }`}
                >
                  <AnimatePresence>
                    {produitsFiltered.map((produit, index) => (
                      <motion.div
                        key={produit.id_produit}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <CarteProduit
                          produit={produit}
                          onEdit={handleEditProduit}
                          onDelete={handleDeleteProduit}
                          typeStructure="COMMERCIALE"
                          compactMode={viewMode === 'list'}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>

          {/* Modal d'ajout/édition */}
          <ModalAjoutProduitNew
            isOpen={isModalAjoutOpen}
            onClose={handleCloseModal}
            onSuccess={handleProduitSuccess}
            onStockUpdate={loadProduits}
            produitToEdit={produitSelectionne}
            typeStructure="COMMERCIALE"
          />

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

        {/* Modal Panier */}
        <ModalPanier />
        
        {/* Modal Facture Success */}
        <ModalFactureSuccess />

        {/* Toast Component */}
        <ToastComponent />
        </div>
      </div>
  );
}