/**
 * Modal Client Multi-Onglets - Vue 360° complète du client
 * Architecture à 3 onglets : Infos Générales, Factures, Historique Produits
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  FileText, 
  ShoppingBag,
  Save,
  Edit3,
  Loader2
} from 'lucide-react';
import { useClientDetailFromData } from '@/hooks/useClientDetailFromData';
import { useAuth } from '@/contexts/AuthContext';
import { OngletInfosGenerales } from './OngletInfosGenerales';
import { OngletFactures } from './OngletFactures';  
import { OngletHistoriqueProduits } from './OngletHistoriqueProduits';
import { ModalPaiement } from '@/components/factures/ModalPaiement';
import { TabClient, ClientWithStats, AddEditClientResponse, FactureClient, ClientDetailComplet } from '@/types/client';
import { FactureComplete } from '@/types/facture';

interface ModalClientMultiOngletsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: AddEditClientResponse) => void;
  clientId?: number | null; // Nouveau : ID du client à charger dynamiquement
  clientToEdit?: ClientWithStats | null; // Conservé pour compatibilité
  defaultTab?: TabClient;
  onClientUpdated?: (clientId: number) => void; // Callback pour mise à jour de la liste
}

// Configuration des onglets
const TABS_CONFIG = [
  { 
    id: 'general' as TabClient, 
    label: 'Infos Générales', 
    icon: User, 
    color: 'emerald',
    description: 'Informations client et statistiques'
  },
  { 
    id: 'factures' as TabClient, 
    label: 'Factures', 
    icon: FileText, 
    color: 'blue',
    description: 'Historique des factures et paiements'
  },
  { 
    id: 'historique' as TabClient, 
    label: 'Historique', 
    icon: ShoppingBag, 
    color: 'purple',
    description: 'Historique des achats de produits'
  }
];

export function ModalClientMultiOnglets({
  isOpen,
  onClose,
  onSuccess,
  clientId,
  clientToEdit,
  defaultTab = 'general',
  onClientUpdated
}: ModalClientMultiOngletsProps) {
  const initializationRef = useRef<boolean>(false);
  const { user } = useAuth();
  
  // État pour le modal de paiement
  const [modalPaiement, setModalPaiement] = useState<{
    isOpen: boolean;
    facture: FactureComplete | null;
  }>({ isOpen: false, facture: null });
  
  const {
    clientDetail,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    formData,
    updateFormField,
    loadClientDetails,
    refreshClientData,
    initializeFromClientData,
    saveClient,
    resetState,
    statsGenerales,
    statsFactures,
    statsHistorique,
    facturesFiltered,
    historiqueProduitsFiltred,
    filtreFactures,
    setFiltreFactures,
    filtreHistorique,
    setFiltreHistorique
  } = useClientDetailFromData();

  // Fonction utilitaire pour convertir FactureClient vers FactureComplete
  const convertFactureClientToComplete = (factureClient: FactureClient, clientData: ClientDetailComplet): FactureComplete => {
    return {
      facture: {
        id_facture: factureClient.id_facture,
        num_facture: factureClient.numero_facture,
        id_structure: user?.id_structure || 0,
        nom_structure: 'Structure',
        date_facture: factureClient.date_facture,
        annee: new Date(factureClient.date_facture).getFullYear(),
        mois: new Date(factureClient.date_facture).getMonth() + 1,
        tel_client: clientData?.client?.tel_client || '',
        nom_client: clientData?.client?.nom_client || '',
        description: `Facture ${factureClient.numero_facture}`,
        montant: factureClient.montant_facture,
        mt_remise: 0,
        mt_acompte: factureClient.montant_paye || 0,
        mt_restant: factureClient.montant_restant || factureClient.montant_facture,
        id_etat: factureClient.statut_paiement === 'PAYEE' ? 2 : 1,
        libelle_etat: factureClient.statut_paiement === 'PARTIELLE' ? 'IMPAYEE' : factureClient.statut_paiement,
        tms_update: new Date().toISOString(),
        avec_frais: false,
        logo: '',
        numrecu: '',
        mt_reverser: false,
        periode: `${new Date(factureClient.date_facture).getFullYear()}-${(new Date(factureClient.date_facture).getMonth() + 1).toString().padStart(2, '0')}`,
        nom_classe: '',
        photo_url: ''
      },
      details: [],
      resume: {
        nombre_articles: 0,
        quantite_totale: 0,
        cout_total_revient: 0,
        marge_totale: factureClient.montant_facture
      }
    };
  };

  // Fonctions de gestion du modal de paiement
  const handleAjouterAcompte = (factureClient: FactureClient) => {
    if (!user?.id_structure) {
      console.error('❌ [MODAL CLIENT] ID structure manquant dans le contexte utilisateur');
      return;
    }
    
    if (!clientDetail) {
      console.error('❌ [MODAL CLIENT] Données client manquantes');
      return;
    }
    
    console.log('💰 [MODAL CLIENT] Ouverture modal paiement:', {
      facture: factureClient.numero_facture,
      id_structure: user.id_structure,
      montant: factureClient.montant_facture
    });
    
    const factureComplete = convertFactureClientToComplete(factureClient, clientDetail);
    setModalPaiement({ isOpen: true, facture: factureComplete });
  };

  const closeModalPaiement = () => {
    setModalPaiement({ isOpen: false, facture: null });
  };

  const handlePaiementSuccess = async () => {
    // Recharger les données du client pour refléter les changements
    await refreshClientData();
    
    // Notifier la liste parente pour mise à jour sélective
    if (onClientUpdated && clientDetail) {
      onClientUpdated(clientDetail.client.id_client);
    }
    
    closeModalPaiement();
  };

  // Initialisation du modal - Support des deux modes
  useEffect(() => {
    if (isOpen && !initializationRef.current) {
      console.log('🚀 [MODAL CLIENT] Initialisation du modal');
      
      initializationRef.current = true;
      setActiveTab(defaultTab);
      
      if (clientId) {
        // Nouveau mode : chargement dynamique avec clientId
        console.log('🔄 [MODAL CLIENT] Mode chargement dynamique pour client ID:', clientId);
        loadClientDetails(clientId);
      } else if (clientToEdit) {
        // Mode compatibilité : utiliser les données déjà chargées
        console.log('📝 [MODAL CLIENT] Mode compatibilité pour client:', clientToEdit.client.nom_client);
        initializeFromClientData(clientToEdit);
        setIsEditing(false); // Commencer en mode lecture
      } else {
        // Mode création - rester sur l'onglet général
        console.log('➕ [MODAL CLIENT] Mode création nouveau client');
        setIsEditing(true);
        setActiveTab('general');
      }
    }
  }, [isOpen, clientId, clientToEdit, defaultTab, loadClientDetails, initializeFromClientData, setActiveTab, setIsEditing]);

  // Cleanup complet lors de la fermeture du modal
  useEffect(() => {
    if (!isOpen && initializationRef.current) {
      console.log('🧹 [MODAL CLIENT] Cleanup du modal');
      
      // Reset des états
      initializationRef.current = false;
      
      // Reset du hook de détail client
      resetState();
    }
  }, [isOpen, resetState]);

  // Gestion de la sauvegarde
  const handleSave = async () => {
    try {
      await saveClient();
      
      // Simuler une réponse pour onSuccess
      const response: AddEditClientResponse = {
        result_id_client: formData.id_client || 0,
        result_nom_client: formData.nom_client,
        result_tel_client: formData.tel_client,
        result_adresse: formData.adresse,
        result_date_creation: new Date().toISOString(),
        result_date_modification: new Date().toISOString(),
        result_id_structure: 0,
        result_action_effectuee: formData.id_client ? 'MODIFICATION' : 'CREATION',
        result_factures_mises_a_jour: 0
      };
      
      onSuccess(response);
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }
  };

  // Fermeture avec confirmation si en cours d'édition
  const handleClose = () => {
    if (isEditing && (formData.nom_client || formData.tel_client || formData.adresse)) {
      if (window.confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Changer d'onglet
  const handleTabChange = (tabId: TabClient) => {
    // Si on est en train d'éditer, on peut seulement rester sur l'onglet général
    if (isEditing && tabId !== 'general') {
      return;
    }
    setActiveTab(tabId);
  };

  // Obtenir la couleur du thème selon l'onglet actif
  const getThemeColors = () => {
    const config = TABS_CONFIG.find(tab => tab.id === activeTab);
    
    switch (config?.color) {
      case 'emerald':
        return {
          accent: 'from-emerald-500 to-emerald-600',
          accentHover: 'from-emerald-600 to-emerald-700',
          border: 'border-emerald-400/30',
          bg: 'bg-emerald-500/20'
        };
      case 'blue':
        return {
          accent: 'from-blue-500 to-blue-600',
          accentHover: 'from-blue-600 to-blue-700',
          border: 'border-blue-400/30',
          bg: 'bg-blue-500/20'
        };
      case 'purple':
        return {
          accent: 'from-purple-500 to-purple-600',
          accentHover: 'from-purple-600 to-purple-700',
          border: 'border-purple-400/30',
          bg: 'bg-purple-500/20'
        };
      default:
        return {
          accent: 'from-emerald-500 to-emerald-600',
          accentHover: 'from-emerald-600 to-emerald-700',
          border: 'border-emerald-400/30',
          bg: 'bg-emerald-500/20'
        };
    }
  };

  const themeColors = getThemeColors();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      >
        <motion.div
          initial={{ 
            y: '100%', 
            opacity: 0,
            scale: 1
          }}
          animate={{ 
            y: 0, 
            opacity: 1,
            scale: 1
          }}
          exit={{ 
            y: '100%', 
            opacity: 0,
            scale: 1
          }}
          transition={{ 
            type: 'spring', 
            damping: 25, 
            stiffness: 300,
            duration: 0.3 
          }}
          className="
            relative w-full sm:max-w-4xl 
            bg-gradient-to-br from-green-600 via-green-700 to-green-800 
            rounded-t-3xl sm:rounded-2xl 
            shadow-2xl overflow-hidden
            max-h-[90vh] sm:max-h-[85vh] flex flex-col
          "
        >
            {/* Header avec navigation onglets */}
            <div className="relative">
              {/* Gradient header */}
              <div className={`bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white">
                          {clientToEdit ? 'Détails Client' : 'Nouveau Client'}
                        </h2>
                        {clientDetail && (
                          <p className="text-white/80 text-xs sm:text-sm">
                            {clientDetail.client.nom_client}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Indicateur de chargement */}
                    {isLoading && (
                      <div className="flex items-center gap-1 sm:gap-2 text-white/80">
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        <span className="text-xs sm:text-sm">Chargement...</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </button>
                </div>

                {/* Navigation onglets */}
                <div className="flex gap-0.5 sm:gap-1 mt-3 sm:mt-4 p-0.5 sm:p-1 bg-white/10 rounded-lg sm:rounded-xl backdrop-blur-sm">
                  {TABS_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isDisabled = isEditing && tab.id !== 'general';
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        disabled={isDisabled}
                        className={`
                          flex-1 flex flex-col sm:flex-row items-center justify-center 
                          gap-1 sm:gap-2 px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 
                          rounded-md sm:rounded-lg transition-all
                          ${isActive 
                            ? 'bg-white/20 text-white shadow-lg' 
                            : isDisabled
                              ? 'text-white/40 cursor-not-allowed'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm font-medium">
                          <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                          <span className="hidden sm:inline">{tab.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contenu principal - Flex-1 pour occuper l'espace disponible */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-green-400/10 via-emerald-400/15 to-teal-400/10 backdrop-blur-2xl">
              
              {/* Message d'erreur */}
              {error && (
                <div className="mx-3 sm:mx-4 lg:mx-6 mt-3 sm:mt-4 p-3 sm:p-4 bg-red-500/20 border border-red-400/30 rounded-lg sm:rounded-xl backdrop-blur-sm">
                  <p className="text-red-200 text-xs sm:text-sm">{error}</p>
                </div>
              )}

              {/* Contenu des onglets */}
              <div className="p-3 sm:p-4 lg:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'general' && (
                      <OngletInfosGenerales
                        clientDetail={clientDetail}
                        formData={formData}
                        updateFormField={updateFormField}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        statsCards={statsGenerales}
                        isLoading={isLoading}
                      />
                    )}

                    {activeTab === 'factures' && clientDetail && (
                      <OngletFactures
                        clientDetail={clientDetail}
                        factures={facturesFiltered}
                        statsCards={statsFactures}
                        filtre={filtreFactures}
                        setFiltre={setFiltreFactures}
                        onMarquerPayee={handleAjouterAcompte}
                        isLoading={isLoading}
                      />
                    )}

                    {activeTab === 'historique' && clientDetail && (
                      <OngletHistoriqueProduits
                        clientDetail={clientDetail}
                        produits={historiqueProduitsFiltred}
                        statsCards={statsHistorique}
                        filtre={filtreHistorique}
                        setFiltre={setFiltreHistorique}
                        isLoading={isLoading}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Footer avec actions - Fixe */}
            <div className="bg-white/5 backdrop-blur-sm border-t border-white/20 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                {/* Informations contextuelles */}
                <div className="text-white/60 text-xs sm:text-sm">
                  {activeTab === 'general' && isEditing && (
                    "Modifiez les informations puis sauvegardez"
                  )}
                  {activeTab === 'factures' && clientDetail && (
                    `${clientDetail.factures.length} facture${clientDetail.factures.length > 1 ? 's' : ''} au total`
                  )}
                  {activeTab === 'historique' && clientDetail && (
                    `${clientDetail.historique_produits.length} produit${clientDetail.historique_produits.length > 1 ? 's' : ''} différent${clientDetail.historique_produits.length > 1 ? 's' : ''}`
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleClose}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg sm:rounded-xl transition-colors"
                  >
                    Fermer
                  </button>

                  {/* Bouton édition/sauvegarde pour l'onglet général */}
                  {activeTab === 'general' && (
                    <>
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r ${themeColors.accent} hover:${themeColors.accentHover} text-white rounded-lg sm:rounded-xl transition-all shadow-lg text-xs sm:text-sm`}
                        >
                          <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                          Modifier
                        </button>
                      ) : (
                        <button
                          onClick={handleSave}
                          disabled={isLoading}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r ${themeColors.accent} hover:${themeColors.accentHover} text-white rounded-lg sm:rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                          Sauvegarder
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
      </motion.div>
      
      {/* Modal de paiement */}
      <ModalPaiement
        isOpen={modalPaiement.isOpen}
        onClose={closeModalPaiement}
        facture={modalPaiement.facture}
        onSuccess={handlePaiementSuccess}
      />
    </AnimatePresence>
  );
}