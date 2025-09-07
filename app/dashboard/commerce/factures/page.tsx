/**
 * Page de gestion des factures commerciales
 * Interface complète avec stats, filtres, liste et modals
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Receipt, AlertCircle, Loader } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/contexts/AuthContext';
import { 
  StatsCardsFactures, 
  StatsCardsFacturesLoading 
} from '@/components/factures/StatsCardsFactures';
import { FilterFactures } from '@/components/factures/FilterFactures';
import { ListeFactures } from '@/components/factures/ListeFactures';
import { ModalPaiement } from '@/components/factures/ModalPaiement';
import { ModalPartage } from '@/components/factures/ModalPartage';
import { Toast } from '@/components/ui/Toast';
import { factureListService } from '@/services/facture-list.service';
import { 
  GetMyFactureResponse,
  FactureComplete,
  FiltresFactures,
  StatsFactures 
} from '@/types/facture';

export default function FacturesPage() {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();

  // États principaux
  const [facturesResponse, setFacturesResponse] = useState<GetMyFactureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filtres, setFiltres] = useState<FiltresFactures>({
    sortBy: 'date',
    sortOrder: 'desc',
    statut: 'TOUS'
  });

  // États des modals
  const [modalPaiement, setModalPaiement] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });
  
  const [modalPartage, setModalPartage] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });

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
      
    } catch (error: any) {
      console.error('Erreur chargement factures:', error);
      setError(error.message || 'Impossible de charger les factures');
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

  // Calcul des statistiques
  const stats: StatsFactures | null = useMemo(() => {
    if (!facturesResponse) return null;
    
    return factureListService.calculateStats(facturesResponse);
  }, [facturesResponse]);

  // Gestionnaires d'événements
  const handleFiltersChange = useCallback((newFiltres: FiltresFactures) => {
    setFiltres(newFiltres);
  }, []);

  const handleAjouterAcompte = useCallback((facture: FactureComplete) => {
    setModalPaiement({ isOpen: true, facture });
  }, []);

  const handlePartager = useCallback((facture: FactureComplete) => {
    setModalPartage({ isOpen: true, facture });
  }, []);

  const handleVoirDetails = useCallback((facture: FactureComplete) => {
    // Navigation vers la page de détail si nécessaire
    console.log('Voir détails facture:', facture.facture.id_facture);
  }, []);

  // Succès de paiement
  const handlePaiementSuccess = useCallback((response: any) => {
    setToast({
      isOpen: true,
      type: 'success',
      message: response.message || 'Paiement enregistré avec succès'
    });

    // Recharger les factures pour mettre à jour les données
    loadFactures();
  }, [loadFactures]);

  // Fermeture des modals
  const closeModalPaiement = useCallback(() => {
    setModalPaiement({ isOpen: false, facture: null });
  }, []);

  const closeModalPartage = useCallback(() => {
    setModalPartage({ isOpen: false, facture: null });
  }, []);

  // Fermeture du toast
  const closeToast = useCallback(() => {
    setToast({ isOpen: false, type: 'info', message: '' });
  }, []);

  // Interface d'erreur
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50/30 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={loadFactures}
              className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50/30 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                  Gestion des Factures
                </h1>
                <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Suivi et gestion de toutes vos factures
                </p>
              </div>
            </div>

            {loading && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="text-sm">Chargement...</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {loading ? (
            <StatsCardsFacturesLoading />
          ) : (
            <StatsCardsFactures stats={stats} loading={loading} />
          )}
        </motion.div>

        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <FilterFactures
            onFiltersChange={handleFiltersChange}
            totalFactures={facturesResponse?.factures.length || 0}
            facturesFiltrees={facturesFiltrees.length}
          />
        </motion.div>

        {/* Liste des factures */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <ListeFactures
            factures={facturesFiltrees}
            loading={loading}
            onVoirDetails={handleVoirDetails}
            onAjouterAcompte={handleAjouterAcompte}
            onPartager={handlePartager}
          />
        </motion.div>

        {/* Message si aucune facture */}
        {!loading && facturesResponse && facturesResponse.factures.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-center py-12"
          >
            <Receipt className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">
              Aucune facture créée
            </h3>
            <p className="text-gray-400 mb-6">
              Commencez par créer votre première facture depuis la gestion des produits.
            </p>
          </motion.div>
        )}
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

      {/* Toast notifications */}
      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
        autoClose={true}
        autoCloseDelay={4000}
      />
    </div>
  );
}