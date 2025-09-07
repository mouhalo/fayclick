/**
 * Page de gestion des services pour les structures PRESTATAIRE DE SERVICES
 * Interface complète avec CRUD, recherche, sélection et statistiques
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
  Wrench,
  AlertCircle,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { produitsService, ProduitsApiException } from '@/services/produits.service';
import { useProduits, usePanier, useProduitsUI } from '@/hooks/useProduits';
import { StatsProduits, StatsProduitsLoading } from '@/components/produits/StatsProduits';
import { CarteProduit, CarteProduitSkeleton } from '@/components/produits/CarteProduit';
import { ModalAjoutProduitNew } from '@/components/produits/ModalAjoutProduitNew';
import { PanierBarWrapper } from '@/components/produits/BarreStatutPanier';
import { Produit, ProduitFormData, ProduitFormDataNew, AddEditProduitResponse, FiltreProduits } from '@/types/produit';
import { User } from '@/types/auth';

export default function PrestationsServicesPage() {
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

  const { ajouterAuPanier } = usePanier();


  const {
    isModalAjoutOpen,
    produitSelectionne,
    modeEdition,
    setModalAjoutOpen,
    setProduitSelectionne,
    setModeEdition,
    setConfiguration
  } = useProduitsUI();

  // Configuration pour les services
  useEffect(() => {
    setConfiguration({
      typeStructure: 'PRESTATAIRE DE SERVICES',
      labels: {
        produit: 'Service',
        stock: 'Disponibilité',
        cout: 'Coût prestation',
        vente: 'Tarif prestation'
      },
      afficherStock: false,
      afficherCategories: true,
      afficherCoutRevient: true
    });
  }, [setConfiguration]);

  // Vérification authentification
  useEffect(() => {
    const checkAuthentication = () => {
      if (!authService.isAuthenticated()) {
        console.log('❌ [PRESTATIONS SERVICES] Utilisateur non authentifié');
        router.push('/login');
        return;
      }

      const userData = authService.getUser();
      if (!userData || userData.type_structure !== 'PRESTATAIRE DE SERVICES') {
        console.log('⚠️ [PRESTATIONS SERVICES] Type de structure incorrect');
        router.push('/dashboard');
        return;
      }
      
      console.log('✅ [PRESTATIONS SERVICES] Authentification validée');
      setUser(userData);
      setIsAuthLoading(false);
    };

    const timer = setTimeout(checkAuthentication, 100);
    return () => clearTimeout(timer);
  }, [router]);

  // Chargement des services et stats
  const loadProduits = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingProduits(true);
      console.log('🔄 [PRESTATIONS SERVICES] Chargement des services...');
      
      const response = await produitsService.getListeProduits(filtres);
      setProduits(response.data);
      
      console.log(`✅ [PRESTATIONS SERVICES] ${response.data.length} services chargés`);
    } catch (error) {
      console.error('❌ [PRESTATIONS SERVICES] Erreur chargement services:', error);
      const errorMessage = error instanceof ProduitsApiException 
        ? error.message 
        : 'Impossible de charger les services';
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

  // Gestion des services avec nouvelle API
  const handleServiceSuccess = async (service: AddEditProduitResponse) => {
    try {
      console.log('✅ [PRESTATIONS SERVICES] Service sauvegardé:', service.nom_produit);
      
      // Convertir AddEditProduitResponse vers Produit pour compatibilité
      const serviceComplet: Produit = {
        id_produit: service.id_produit,
        id_structure: service.id_structure,
        nom_produit: service.nom_produit,
        cout_revient: service.cout_revient,
        prix_vente: service.prix_vente,
        est_service: service.est_service,
        niveau_stock: 0, // Services n'ont pas de stock
        marge: service.prix_vente - service.cout_revient
      };

      if (service.action_effectuee === 'CREATION') {
        ajouterProduit(serviceComplet);
      } else if (service.action_effectuee === 'MODIFICATION') {
        modifierProduit(service.id_produit, serviceComplet);
      }
      
      // Recharger la liste pour avoir les données à jour
      await loadProduits();
      
    } catch (error) {
      console.error('❌ [PRESTATIONS SERVICES] Erreur traitement succès:', error);
    }
  };

  const handleDeleteService = async (id_produit: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) return;

    try {
      console.log('🗑️ [PRESTATIONS SERVICES] Suppression service:', id_produit);
      await produitsService.deleteProduit(id_produit);
      supprimerProduit(id_produit);
      
      console.log('✅ [PRESTATIONS SERVICES] Service supprimé avec succès');
    } catch (error) {
      console.error('❌ [PRESTATIONS SERVICES] Erreur suppression service:', error);
      alert('Impossible de supprimer le service. Veuillez réessayer.');
    }
  };

  // Gestion du modal - simplifié car la logique est maintenant dans le modal

  const handleEditService = (service: Produit) => {
    setProduitSelectionne(service);
    setModeEdition(true);
    setModalAjoutOpen(true);
  };

  const handleAddService = () => {
    setProduitSelectionne(null);
    setModeEdition(false);
    setModalAjoutOpen(true);
  };

  const handleCloseModal = () => {
    setModalAjoutOpen(false);
    setProduitSelectionne(null);
    setModeEdition(false);
  };

  // Gestion sélection services
  const handleAddToSelection = (service: Produit, quantity: number = 1) => {
    ajouterAuPanier(service, quantity);
    console.log(`📝 [PRESTATIONS SERVICES] Ajout à la sélection: ${service.nom_produit}`);
  };

  const handleValidateSelection = async () => {
    console.log('✅ [PRESTATIONS SERVICES] Sélection finalisée, rechargement des données...');
    // Recharger la liste des services et les statistiques
    await loadProduits();
  };

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
              <Wrench className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-white text-lg font-medium animate-pulse">
            Chargement des services...
          </p>
        </div>
      </div>
    );
  }

  return (
    <PanierBarWrapper onCheckout={handleValidateSelection} typeStructure="PRESTATAIRE DE SERVICES">
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800">
        <div className="max-w-md mx-auto bg-white min-h-screen">
          
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 text-white sticky top-0 z-30"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold">Gestion Services</h1>
                <p className="text-indigo-100 text-sm">{user.nom_structure}</p>
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
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
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
                placeholder="Rechercher un service..."
                className="w-full pl-10 pr-4 py-3 rounded-lg text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Contrôles vue et filtres */}
            <div className="flex items-center justify-between">
              <div className="flex items-center bg-white/20 rounded-lg p-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-indigo-600' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-white text-indigo-600' : 'text-white hover:bg-white/20'
                  }`}
                >
                  <List className="w-4 h-4" />
                </motion.button>
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showFilters ? 'bg-white text-indigo-600' : 'bg-white/20 text-white hover:bg-white/30'
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
                <StatsProduitsLoading />
              ) : (
                <StatsProduits 
                  articles={produitsFiltered} 
                  typeStructure="PRESTATAIRE DE SERVICES"
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

            {/* Liste des services */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Services ({produitsFiltered.length})
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

              {/* Grille/Liste des services */}
              {isLoadingProduits ? (
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
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
                  <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {searchTerm || Object.keys(filtres).length > 0 
                      ? 'Aucun service trouvé' 
                      : 'Aucun service enregistré'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm || Object.keys(filtres).length > 0
                      ? 'Essayez de modifier vos critères de recherche'
                      : 'Commencez par ajouter vos premiers services'}
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
                      onClick={handleAddService}
                      className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un service
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`grid gap-4 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                      : 'grid-cols-1'
                  }`}
                >
                  <AnimatePresence>
                    {produitsFiltered.map((service, index) => (
                      <motion.div
                        key={service.id_produit}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <CarteProduit
                          produit={service}
                          onEdit={handleEditService}
                          onDelete={handleDeleteService}
                          typeStructure="PRESTATAIRE DE SERVICES"
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
            onSuccess={handleServiceSuccess}
            onStockUpdate={loadProduits}
            produitToEdit={produitSelectionne}
            typeStructure="PRESTATAIRE DE SERVICES"
          />

          {/* Bouton flottant Ajouter */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleAddService}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-50 transition-all duration-300"
            aria-label="Ajouter un service"
          >
            <Plus className="w-6 h-6" />
          </motion.button>
        </div>
      </div>
    </PanierBarWrapper>
  );
}