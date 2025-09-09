/**
 * Modal Client Multi-Onglets - Vue 360° complète du client
 * Architecture à 3 onglets : Infos Générales, Factures, Historique Produits
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
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
import { OngletInfosGenerales } from './OngletInfosGenerales';
import { OngletFactures } from './OngletFactures';  
import { OngletHistoriqueProduits } from './OngletHistoriqueProduits';
import { TabClient, ClientWithStats, AddEditClientResponse } from '@/types/client';

interface ModalClientMultiOngletsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: AddEditClientResponse) => void;
  clientToEdit?: ClientWithStats | null;
  defaultTab?: TabClient;
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
  clientToEdit,
  defaultTab = 'general'
}: ModalClientMultiOngletsProps) {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isLoadingState, setIsLoadingState] = useState(false);
  const initializationRef = useRef<boolean>(false);
  
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
    initializeFromClientData,
    saveClient,
    marquerFacturePayee,
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

  // Initialisation du modal - Optimisée pour éviter les boucles
  useEffect(() => {
    if (isOpen && !initializationRef.current) {
      console.log('🚀 [MODAL CLIENT] Initialisation du modal');
      
      initializationRef.current = true;
      setIsLoadingState(true);
      
      setActiveTab(defaultTab);
      
      if (clientToEdit) {
        // Mode édition - utiliser les données déjà chargées
        console.log('📝 [MODAL CLIENT] Mode édition pour client:', clientToEdit.client.nom_client);
        console.log('📝 [MODAL CLIENT] Données disponibles:', {
          client: clientToEdit.client,
          factures_count: clientToEdit.factures?.length || 0,
          statistiques: clientToEdit.statistiques_factures
        });
        
        // Utiliser directement les données existantes au lieu de faire une requête
        initializeFromClientData(clientToEdit);
        setIsLoadingState(false);
        setIsEditing(false); // Commencer en mode lecture
      } else {
        // Mode création - rester sur l'onglet général
        console.log('➕ [MODAL CLIENT] Mode création nouveau client');
        setIsEditing(true);
        setActiveTab('general');
        setIsLoadingState(false);
      }
      
      setHasInitialized(true);
    }
  }, [isOpen]); // ✅ Dépendances minimales

  // Cleanup complet lors de la fermeture du modal
  useEffect(() => {
    if (!isOpen && initializationRef.current) {
      console.log('🧹 [MODAL CLIENT] Cleanup du modal');
      
      // Reset des états
      setHasInitialized(false);
      setIsLoadingState(false);
      initializationRef.current = false;
      
      // Reset du hook de détail client
      resetState();
    }
  }, [isOpen]); // ✅ Dépendance minimale

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
        className="fixed inset-0 z-50 overflow-y-auto"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-4xl bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header avec navigation onglets */}
            <div className="relative">
              {/* Gradient header */}
              <div className={`bg-gradient-to-r ${themeColors.accent} px-6 py-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {clientToEdit ? 'Détails Client' : 'Nouveau Client'}
                        </h2>
                        {clientDetail && (
                          <p className="text-white/80 text-sm">
                            {clientDetail.client.nom_client}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Indicateur de chargement */}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-white/80">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Chargement...</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>

                {/* Navigation onglets */}
                <div className="flex gap-1 mt-4 p-1 bg-white/10 rounded-xl backdrop-blur-sm">
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
                          flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all
                          ${isActive 
                            ? 'bg-white/20 text-white shadow-lg' 
                            : isDisabled
                              ? 'text-white/40 cursor-not-allowed'
                              : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="bg-gradient-to-br from-green-400/10 via-emerald-400/15 to-teal-400/10 backdrop-blur-2xl min-h-[600px]">
              
              {/* Message d'erreur */}
              {error && (
                <div className="mx-6 mt-4 p-4 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {/* Contenu des onglets */}
              <div className="p-6">
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
                        onMarquerPayee={marquerFacturePayee}
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

            {/* Footer avec actions */}
            <div className="bg-white/5 backdrop-blur-sm border-t border-white/20 px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Informations contextuelles */}
                <div className="text-white/60 text-sm">
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-colors"
                  >
                    Fermer
                  </button>

                  {/* Bouton édition/sauvegarde pour l'onglet général */}
                  {activeTab === 'general' && (
                    <>
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${themeColors.accent} hover:${themeColors.accentHover} text-white rounded-xl transition-all shadow-lg`}
                        >
                          <Edit3 className="w-4 h-4" />
                          Modifier
                        </button>
                      ) : (
                        <button
                          onClick={handleSave}
                          disabled={isLoading}
                          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${themeColors.accent} hover:${themeColors.accentHover} text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
}