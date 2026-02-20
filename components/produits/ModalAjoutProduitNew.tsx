/**
 * Modal d'ajout/modification de produit - Version complète avec onglets
 * 3 onglets: Informations, Gestion du stock, Historique des mouvements
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Package,
  Tag,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  History,
  TrendingUp,
  TrendingDown,
  Info,
  Warehouse,
  Activity,
  Camera,
  Trash2,
  Globe,
} from 'lucide-react';
import { Produit, ProduitFormDataNew, AddEditProduitResponse, MouvementStockForm, HistoriqueMouvements, PhotoProduit } from '@/types/produit';
import { produitsService } from '@/services/produits.service';
import LogoUpload from '@/components/ui/LogoUpload';
import PopMessage from '@/components/ui/PopMessage';
import { UploadResult, UploadProgress } from '@/types/upload.types';
import { useUserProfile } from '@/hooks/useUserProfile';
import categorieService from '@/services/categorie.service';
import { BoutonScanCodeBarre } from '@/components/produits/BoutonScanCodeBarre';
import { ModalScanCodeBarre } from '@/components/produits/ModalScanCodeBarre';

interface ModalAjoutProduitNewProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (produit: AddEditProduitResponse) => void;
  onStockUpdate?: (id_produit: number, nouveau_stock: number) => void;
  onRequestStockAddition?: (produit: AddEditProduitResponse) => void;
  produitToEdit?: Produit | null;
  typeStructure: string;
  /** Si false, masque la marge avec ****** (caissier sans droit VOIR CA) */
  canViewMontants?: boolean;
}

type OngletType = 'informations' | 'photos' | 'gestion-stock' | 'historique';

export function ModalAjoutProduitNew({
  isOpen,
  onClose,
  onSuccess,
  onStockUpdate,
  onRequestStockAddition,
  produitToEdit,
  typeStructure,
  canViewMontants = true
}: ModalAjoutProduitNewProps) {
  // Hook pour vérifier si l'utilisateur est ADMIN
  const { isAdmin, user } = useUserProfile();
  const isEditMode = !!produitToEdit;
  const canEdit = isAdmin || !isEditMode; // ADMIN peut tout faire, les autres uniquement créer

  // Toujours initialiser sur 'informations' - le useEffect gère le defaultTab si nécessaire
  const [ongletActif, setOngletActif] = useState<OngletType>('informations');
  const [showScanModal, setShowScanModal] = useState(false);
  const [formData, setFormData] = useState<ProduitFormDataNew>({
    nom_produit: '',
    cout_revient: 0,
    prix_vente: 0,
    est_service: false,
    nom_categorie: '',
    description: '',
    presente_au_public: false,
    code_barres: ''
  });
  const [photos, setPhotos] = useState<PhotoProduit[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [stockForm, setStockForm] = useState<MouvementStockForm>({
    quantite: 0,
    prix_unitaire: 0,
    type_mouvement: 'ENTREE',
    description: ''
  });
  const [historique, setHistorique] = useState<HistoriqueMouvements | null>(null);
  const [errors, setErrors] = useState<Partial<ProduitFormDataNew>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [isLoadingHistorique, setIsLoadingHistorique] = useState(false);
  const [showStockSuccessModal, setShowStockSuccessModal] = useState(false);
  const [lastStockMovement, setLastStockMovement] = useState<{
    quantite: number;
    type_mouvement: string;
    produit: string;
  } | null>(null);
  const [popMessage, setPopMessage] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  // Catégories dynamiques depuis la BD
  const [categoriesDynamiques, setCategoriesDynamiques] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Catégories fallback si aucune en BD
  const CATEGORIES_FALLBACK_COMMERCE = [
    'Électronique', 'Electroménager', 'Informatique', 'Vêtements',
    'Alimentation', 'Bébé', 'Cosmetique', 'Mobilier', 'Outils',
    'Meuble', 'Fripperie', 'Librairie', 'Automobile', 'Santé', 'Autre'
  ];
  const CATEGORIES_FALLBACK_SERVICES = [
    'Consultation', 'Formation', 'Installation', 'Maintenance', 'Support', 'Autre'
  ];

  const categoriesFallback = typeStructure === 'PRESTATAIRE DE SERVICES'
    ? CATEGORIES_FALLBACK_SERVICES
    : CATEGORIES_FALLBACK_COMMERCE;

  const categories = categoriesDynamiques.length > 0 ? categoriesDynamiques : categoriesFallback;

  // Charger les catégories depuis la BD
  useEffect(() => {
    if (!user?.id_structure || !isOpen) return;
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await categorieService.getListeCategories(user.id_structure);
        if (response.success && response.categories?.length > 0) {
          setCategoriesDynamiques(response.categories.map(c => c.nom_categorie));
        } else {
          setCategoriesDynamiques([]);
        }
      } catch {
        setCategoriesDynamiques([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    loadCategories();
  }, [user?.id_structure, isOpen]);


  // Onglets disponibles
  const onglets = [
    {
      id: 'informations' as OngletType,
      label: 'Informations',
      icon: Info,
      alwaysVisible: true
    },
    {
      id: 'photos' as OngletType,
      label: 'Photos',
      icon: Camera,
      alwaysVisible: false // Visible uniquement en édition
    },
    {
      id: 'gestion-stock' as OngletType,
      label: 'Gestion du stock',
      icon: Warehouse,
      alwaysVisible: false
    },
    {
      id: 'historique' as OngletType,
      label: 'Historique',
      icon: Activity,
      alwaysVisible: false
    }
  ];

  // Onglets filtrés selon le contexte
  const ongletsAffiches = onglets.filter(onglet => {
    // Toujours afficher les onglets marqués "alwaysVisible"
    if (onglet.alwaysVisible) return true;

    // Les onglets gestion-stock et historique uniquement pour produits (pas services)
    if (produitToEdit && !produitToEdit.est_service) {
      // Gestion du stock uniquement pour ADMIN
      if (onglet.id === 'gestion-stock') {
        return isAdmin;
      }
      return true;
    }

    return false;
  });

  // Initialiser le formulaire quand on modifie un produit
  useEffect(() => {
    if (produitToEdit && isOpen) {
      setFormData({
        nom_produit: produitToEdit.nom_produit || '',
        cout_revient: produitToEdit.cout_revient || 0,
        prix_vente: produitToEdit.prix_vente || 0,
        est_service: produitToEdit.est_service || false,
        nom_categorie: produitToEdit.nom_categorie || '',
        description: produitToEdit.description || '',
        presente_au_public: produitToEdit.presente_au_public || false,
        code_barres: produitToEdit.code_barre || ''
      });
      setStockForm({
        quantite: 0,
        prix_unitaire: produitToEdit.cout_revient || 0,
        type_mouvement: 'ENTREE',
        description: ''
      });
      // Charger les photos du produit
      loadPhotos(produitToEdit.id_produit);
      // En édition: toujours commencer par 'informations' par défaut
      setOngletActif('informations');
    } else if (isOpen) {
      // Reset pour nouveau produit
      setFormData({
        nom_produit: '',
        cout_revient: 0,
        prix_vente: 0,
        est_service: typeStructure === 'PRESTATAIRE DE SERVICES',
        nom_categorie: '',
        description: '',
        presente_au_public: false,
        code_barres: ''
      });
      setStockForm({
        quantite: 0,
        prix_unitaire: 0,
        type_mouvement: 'ENTREE',
        description: ''
      });
      setPhotos([]);
      // Nouveau produit: toujours commencer par "Infos générales"
      setOngletActif('informations');
    }
    setErrors({});
    setHistorique(null);
    // Reset modal de confirmation de stock
    setShowStockSuccessModal(false);
    setLastStockMovement(null);
  }, [produitToEdit, isOpen, typeStructure]);

  // Charger l'historique quand on ouvre l'onglet
  useEffect(() => {
    if (ongletActif === 'historique' && produitToEdit && !historique) {
      loadHistorique();
    }
  }, [ongletActif, produitToEdit]);

  // Charger les photos du produit
  const loadPhotos = async (id_produit: number) => {
    console.log('📸 [MODAL-PHOTOS] loadPhotos appelé:', { id_produit });
    setIsLoadingPhotos(true);
    try {
      const data = await produitsService.getPhotos(id_produit);
      console.log('✅ [MODAL-PHOTOS] Photos récupérées:', {
        nombre: data.length,
        photos: data
      });
      setPhotos(data);
    } catch (error) {
      console.error('❌ [MODAL-PHOTOS] Erreur chargement photos:', error);
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  // Charger l'historique des mouvements
  const loadHistorique = async () => {
    if (!produitToEdit) return;

    setIsLoadingHistorique(true);
    try {
      const data = await produitsService.getHistoriqueMouvements(produitToEdit.id_produit);
      setHistorique(data);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    } finally {
      setIsLoadingHistorique(false);
    }
  };

  // Validation du formulaire principal
  const validateForm = (): boolean => {
    const newErrors: Partial<ProduitFormDataNew> = {};

    if (!formData.nom_produit.trim()) {
      newErrors.nom_produit = 'Le nom du produit est requis';
    }

    if (formData.cout_revient < 0) {
      newErrors.cout_revient = 'Le coût de revient ne peut pas être négatif' as any;
    }

    if (formData.prix_vente < 0) {
      newErrors.prix_vente = 'Le prix de vente ne peut pas être négatif' as any;
    }

    if (formData.prix_vente <= formData.cout_revient) {
      newErrors.prix_vente = 'Le prix de vente doit être supérieur au coût de revient' as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calcul de la marge
  const marge = formData.prix_vente - formData.cout_revient;
  const margePercentage = formData.cout_revient > 0
    ? ((marge / formData.cout_revient) * 100).toFixed(1)
    : '0';

  // Fonction pour afficher les messages de notification
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  // Gestion de la soumission du formulaire principal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let result: AddEditProduitResponse;

      if (produitToEdit) {
        // Modification d'un produit existant - comportement normal
        result = await produitsService.updateProduitNew(produitToEdit.id_produit, formData);
        onSuccess(result);
        showMessage('success', 'Mise à jour effectuée avec succès', 'Sauvegarde réussie');
        // Fermer après 1.5s pour laisser voir le message
        setTimeout(() => onClose(), 1500);
      } else {
        // Création d'un nouveau produit
        result = await produitsService.createProduitNew(formData);
        onSuccess(result);
        showMessage('success', `${formData.est_service ? 'Service' : 'Produit'} créé avec succès`, 'Sauvegarde réussie');

        // Si c'est un produit (pas un service) ET qu'on a le callback, proposer l'ajout de stock
        if (!formData.est_service && onRequestStockAddition) {
          setTimeout(() => onRequestStockAddition(result), 1500);
        } else {
          setTimeout(() => onClose(), 1500);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showMessage('error', 'Une erreur est survenue lors de la sauvegarde', 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion de la soumission du mouvement de stock
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!produitToEdit || stockForm.quantite <= 0) return;

    setIsLoadingStock(true);

    try {
      const result = await produitsService.addMouvementStockLegacy(produitToEdit.id_produit, stockForm);

      if (result.success && onStockUpdate) {
        onStockUpdate(produitToEdit.id_produit, result.nouveau_stock);
      }

      // Sauvegarder les infos du mouvement pour la modal de confirmation
      setLastStockMovement({
        quantite: stockForm.quantite,
        type_mouvement: stockForm.type_mouvement,
        produit: produitToEdit.nom_produit
      });

      // Reset form
      setStockForm({
        quantite: 0,
        prix_unitaire: produitToEdit.cout_revient || 0,
        type_mouvement: 'ENTREE',
        description: ''
      });

      // Refresh historique si ouvert
      if (historique) {
        loadHistorique();
      }

      // Afficher la modal de confirmation
      setShowStockSuccessModal(true);

      // Afficher notification de succès
      showMessage(
        'success',
        `Stock mis à jour : ${stockForm.type_mouvement === 'ENTREE' ? '+' : '-'}${stockForm.quantite} unités`,
        'Mouvement de stock enregistré'
      );

      console.log('Mouvement ajouté avec succès');

    } catch (error) {
      console.error('Erreur mouvement stock:', error);
      showMessage('error', 'Impossible d\'enregistrer le mouvement de stock', 'Erreur');
    } finally {
      setIsLoadingStock(false);
    }
  };

  // Gestion des changements de champs
  const handleInputChange = (field: keyof ProduitFormDataNew, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handler pour le scan de code-barres
  const handleScanSuccess = (code: string) => {
    setFormData(prev => ({ ...prev, code_barres: code }));
    setShowScanModal(false);
  };

  // Formatage des montants
  const formatMontant = (montant: number) => `${montant.toLocaleString('fr-FR')} FCFA`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="modal-ajout-produit-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 backdrop-blur-xl rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20"
        >
          {/* Header avec onglets - Style harmonisé avec modal client */}
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 backdrop-blur-lg p-3 sm:p-4 md:p-6 text-white relative overflow-hidden">
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            <div className="relative z-10 flex justify-between items-center mb-2 sm:mb-3 md:mb-4">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">
                {produitToEdit ? 'Modifier le produit' : 'Ajouter un produit'}
              </h3>
              <button
                onClick={onClose}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
            </div>

            {/* Navigation onglets */}
            <div className="relative z-10 flex space-x-0.5 sm:space-x-1 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl p-0.5 sm:p-1">
              {ongletsAffiches.map((onglet) => {
                const shortLabels: Record<OngletType, string> = {
                  'informations': 'Infos',
                  'photos': 'Photos',
                  'gestion-stock': 'Stocks',
                  'historique': 'Histo'
                };

                return (
                  <button
                    key={onglet.id}
                    onClick={() => setOngletActif(onglet.id)}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-3 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                      ongletActif === onglet.id
                        ? 'bg-white/95 shadow-lg text-sky-600'
                        : 'text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    <onglet.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="truncate">{shortLabels[onglet.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu des onglets - Fond harmonisé */}
          <div className="p-3 sm:p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-140px)] sm:max-h-[calc(90vh-170px)] md:max-h-[calc(90vh-200px)] bg-gradient-to-br from-green-400/10 via-emerald-400/15 to-teal-400/10 backdrop-blur-2xl">
            {/* Onglet Informations */}
            {ongletActif === 'informations' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 sm:space-y-4 md:space-y-5"
              >
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-5">
                  {/* Nom du produit */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                      <Package className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Nom du {formData.est_service ? 'service' : 'produit'} *
                    </label>
                    <input
                      type="text"
                      value={formData.nom_produit}
                      onChange={(e) => handleInputChange('nom_produit', e.target.value)}
                      disabled={!canEdit}
                      className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all ${
                        !canEdit
                          ? 'bg-gray-100/80 border-gray-300 cursor-not-allowed text-gray-600'
                          : errors.nom_produit
                            ? 'border-red-400 bg-red-50/60 hover:bg-white/70'
                            : 'border-sky-200 bg-white/60 hover:bg-white/70'
                      }`}
                      placeholder={`Ex: ${formData.est_service ? 'Consultation technique' : 'Samsung Galaxy A10'}`}
                    />
                    {errors.nom_produit && (
                      <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-center">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {errors.nom_produit}
                      </p>
                    )}
                  </div>

                  {/* Code-barres avec scanner */}
                  {!formData.est_service && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                        Code-barres (optionnel)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.code_barres || ''}
                          onChange={(e) => handleInputChange('code_barres', e.target.value)}
                          disabled={!canEdit}
                          className={`flex-1 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all ${
                            !canEdit
                              ? 'bg-gray-100/80 border-gray-300 cursor-not-allowed text-gray-600'
                              : 'border-sky-200 bg-white/60 hover:bg-white/70'
                          }`}
                          placeholder="Ex: 3560071234560"
                        />
                        {canEdit && (
                          <div className="w-20 sm:w-28">
                            <BoutonScanCodeBarre
                              onScanClick={() => setShowScanModal(true)}
                              variant="secondary"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Type: Produit ou Service */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">Type</label>
                    <div className="flex gap-2 sm:gap-4">
                      <label className={`flex items-center bg-white/80 px-2 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg transition-all ${
                        canEdit ? 'cursor-pointer hover:bg-white/90' : 'cursor-not-allowed opacity-60'
                      }`}>
                        <input
                          type="radio"
                          checked={!formData.est_service}
                          onChange={() => handleInputChange('est_service', false)}
                          disabled={!canEdit}
                          className="mr-1.5 sm:mr-2 text-emerald-600 w-3 h-3 sm:w-4 sm:h-4"
                        />
                        <span className="text-slate-700 font-medium text-xs sm:text-sm">Produit</span>
                      </label>
                      <label className={`flex items-center bg-white/80 px-2 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg transition-all ${
                        canEdit ? 'cursor-pointer hover:bg-white/90' : 'cursor-not-allowed opacity-60'
                      }`}>
                        <input
                          type="radio"
                          checked={formData.est_service}
                          onChange={() => handleInputChange('est_service', true)}
                          disabled={!canEdit}
                          className="mr-1.5 sm:mr-2 text-emerald-600 w-3 h-3 sm:w-4 sm:h-4"
                        />
                        <span className="text-slate-700 font-medium text-xs sm:text-sm">Service</span>
                      </label>
                    </div>
                  </div>

                  {/* Prix - Grille horizontale 2x1 */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                        <span className="hidden sm:inline">Prix d&apos;achat (FCFA) *</span>
                        <span className="sm:hidden">P.Achat *</span>
                      </label>
                      {!isAdmin && isEditMode ? (
                        // Non-ADMIN en mode édition : masquer avec astérisques
                        <div className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg sm:rounded-xl bg-gray-100/80 backdrop-blur-sm text-gray-600 font-mono tracking-widest cursor-not-allowed flex items-center">
                          ••••••••
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={formData.cout_revient}
                          onChange={(e) => handleInputChange('cout_revient', parseFloat(e.target.value) || 0)}
                          disabled={!canEdit}
                          className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all ${
                            !canEdit
                              ? 'bg-gray-100/80 border-gray-300 cursor-not-allowed text-gray-600'
                              : errors.cout_revient
                                ? 'border-red-400 bg-red-50/60 hover:bg-white/70'
                                : 'border-sky-200 bg-white/60 hover:bg-white/70'
                          }`}
                          min="0"
                          step="0.01"
                        />
                      )}
                      {errors.cout_revient && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.cout_revient}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                        <span className="hidden sm:inline">Prix de vente (FCFA) *</span>
                        <span className="sm:hidden">P.Vente *</span>
                      </label>
                      <input
                        type="number"
                        value={formData.prix_vente}
                        onChange={(e) => handleInputChange('prix_vente', parseFloat(e.target.value) || 0)}
                        disabled={!canEdit}
                        className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all ${
                          !canEdit
                            ? 'bg-gray-100/80 border-gray-300 cursor-not-allowed text-gray-600'
                            : errors.prix_vente
                              ? 'border-red-400 bg-red-50/60 hover:bg-white/70'
                              : 'border-sky-200 bg-white/60 hover:bg-white/70'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      {errors.prix_vente && (
                        <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.prix_vente}</p>
                      )}
                    </div>
                  </div>

                  {/* Calcul de la marge */}
                  {formData.cout_revient > 0 && formData.prix_vente > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50/60 to-green-50/60 backdrop-blur-sm p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-emerald-200/50 shadow-sm">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-slate-600">Marge:</span>
                        {canViewMontants ? (
                          <div className="text-right">
                            <div className="font-semibold text-sky-900 text-xs sm:text-sm">
                              {formatMontant(marge)}
                            </div>
                            <div className="text-sky-700 text-[10px] sm:text-xs">
                              ({margePercentage}%)
                            </div>
                          </div>
                        ) : (
                          <span className="font-semibold text-sky-900 text-xs sm:text-sm">******</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Catégorie */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                      <Tag className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Catégorie
                    </label>
                    <select
                      value={formData.nom_categorie}
                      onChange={(e) => handleInputChange('nom_categorie', e.target.value)}
                      disabled={!canEdit}
                      className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all ${
                        !canEdit
                          ? 'bg-gray-100/80 border-gray-300 cursor-not-allowed text-gray-600'
                          : 'border-sky-200 bg-white/60 hover:bg-white/70'
                      }`}
                    >
                      <option value="">{isLoadingCategories ? 'Chargement...' : 'Sélectionner une catégorie'}</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={!canEdit}
                      rows={2}
                      className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg sm:rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all resize-none ${
                        !canEdit
                          ? 'bg-gray-100/80 border-gray-300 cursor-not-allowed text-gray-600'
                          : 'border-sky-200 bg-white/60 hover:bg-white/70'
                      }`}
                      placeholder={`Décrivez votre ${formData.est_service ? 'service' : 'produit'}...`}
                    />
                  </div>

                  {/* Présenter au public */}
                  <div className={`bg-gradient-to-r from-amber-50/70 to-orange-50/70 backdrop-blur-sm p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-amber-200/50 ${
                    !canEdit ? 'opacity-60' : ''
                  }`}>
                    <label className={`flex items-center gap-2 sm:gap-3 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      <input
                        type="checkbox"
                        checked={formData.presente_au_public || false}
                        onChange={(e) => handleInputChange('presente_au_public', e.target.checked)}
                        disabled={!canEdit}
                        className={`w-4 h-4 sm:w-5 sm:h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500 focus:ring-offset-0 ${
                          canEdit ? 'cursor-pointer' : 'cursor-not-allowed'
                        }`}
                      />
                      <div className="flex-1">
                        <span className="text-xs sm:text-sm font-medium text-slate-800 flex items-center gap-1.5 sm:gap-2">
                          <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                          Présenter au public
                        </span>
                        <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 hidden sm:block">
                          Ce {formData.est_service ? 'service' : 'produit'} sera visible dans votre catalogue public
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Boutons d'action - Style harmonisé */}
                  <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 rounded-lg sm:rounded-xl hover:bg-red-500/30 transition-all font-medium"
                    >
                      {!canEdit ? 'Fermer' : 'Annuler'}
                    </button>
                    {canEdit && (
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                        {isLoading
                          ? 'Enregistrement...'
                          : produitToEdit
                            ? 'Modifier'
                            : 'Créer'
                        }
                      </button>
                    )}
                  </div>

                  {/* Message d'avertissement si non-ADMIN en mode édition */}
                  {!canEdit && (
                    <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-lg sm:rounded-xl">
                      <p className="text-amber-200 text-[10px] sm:text-sm text-center flex items-center justify-center gap-1.5 sm:gap-2">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        Seul l&apos;administrateur peut modifier les produits
                      </p>
                    </div>
                  )}
                </form>
              </motion.div>
            )}

            {/* Onglet Gestion du stock */}
            {ongletActif === 'gestion-stock' && produitToEdit && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 sm:space-y-4 md:space-y-6"
              >
                <div className="bg-gradient-to-r from-sky-50/70 to-blue-50/70 backdrop-blur-sm p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-sky-200/50 shadow-sm">
                  <h4 className="font-semibold text-slate-900 text-sm sm:text-base mb-1 sm:mb-2 truncate">Produit: {produitToEdit?.nom_produit}</h4>
                  <p className="text-xs sm:text-sm text-slate-600">Stock actuel: <span className="font-medium">{produitToEdit?.niveau_stock || produitToEdit?.stock_actuel || 0} unités</span></p>
                </div>

                <form onSubmit={handleStockSubmit} className="space-y-3 sm:space-y-4 md:space-y-5">
                  {/* Type de mouvement */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">Type de mouvement</label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <label className="flex items-center p-2 sm:p-3 bg-white/80 border border-emerald-300/50 rounded-md sm:rounded-lg hover:bg-white/90 cursor-pointer transition-all">
                        <input
                          type="radio"
                          checked={stockForm.type_mouvement === 'ENTREE'}
                          onChange={() => setStockForm(prev => ({ ...prev, type_mouvement: 'ENTREE' }))}
                          className="mr-1.5 sm:mr-3 text-green-600 w-3 h-3 sm:w-4 sm:h-4"
                        />
                        <div className="flex items-center gap-1 sm:gap-2">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          <span className="font-medium text-green-700 text-xs sm:text-sm">Entrée</span>
                        </div>
                      </label>
                      <label className="flex items-center p-2 sm:p-3 bg-white/80 border border-red-300/50 rounded-md sm:rounded-lg hover:bg-white/90 cursor-pointer transition-all">
                        <input
                          type="radio"
                          checked={stockForm.type_mouvement === 'SORTIE'}
                          onChange={() => setStockForm(prev => ({ ...prev, type_mouvement: 'SORTIE' }))}
                          className="mr-1.5 sm:mr-3 text-red-600 w-3 h-3 sm:w-4 sm:h-4"
                        />
                        <div className="flex items-center gap-1 sm:gap-2">
                          <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                          <span className="font-medium text-red-700 text-xs sm:text-sm">Sortie</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Quantité et Prix - Grille horizontale 2x1 */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                        Quantité *
                      </label>
                      <input
                        type="number"
                        value={stockForm.quantite}
                        onChange={(e) => setStockForm(prev => ({ ...prev, quantite: parseInt(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-sky-200 rounded-lg sm:rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                        <span className="hidden sm:inline">Prix unitaire (FCFA) *</span>
                        <span className="sm:hidden">Prix unit. *</span>
                      </label>
                      <input
                        type="number"
                        value={stockForm.prix_unitaire}
                        onChange={(e) => setStockForm(prev => ({ ...prev, prix_unitaire: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-sky-200 rounded-lg sm:rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-white mb-1 sm:mb-2">
                      Description (optionnelle)
                    </label>
                    <textarea
                      value={stockForm.description}
                      onChange={(e) => setStockForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 sm:py-2.5 text-sm sm:text-base border border-sky-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Motif du mouvement..."
                    />
                  </div>

                  {/* Total calculé */}
                  {stockForm.quantite > 0 && stockForm.prix_unitaire > 0 && (
                    <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/60 backdrop-blur-sm p-2.5 sm:p-4 rounded-lg sm:rounded-xl border border-orange-200/50 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm text-slate-600">Total {stockForm.type_mouvement.toLowerCase()}:</span>
                        <div className="text-sm sm:text-lg font-semibold text-orange-900">
                          {formatMontant(stockForm.quantite * stockForm.prix_unitaire)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bouton de soumission - Style harmonisé */}
                  <button
                    type="submit"
                    disabled={isLoadingStock || stockForm.quantite <= 0 || stockForm.prix_unitaire <= 0}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    {isLoadingStock ? (
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    {isLoadingStock ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Onglet Historique */}
            {ongletActif === 'historique' && produitToEdit && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-3 sm:space-y-4 md:space-y-6"
              >
                {isLoadingHistorique ? (
                  <div className="flex items-center justify-center py-6 sm:py-8">
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-sky-600" />
                  </div>
                ) : historique ? (
                  <>
                    {/* Statistiques */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="bg-gradient-to-r from-emerald-50/70 to-green-50/70 backdrop-blur-sm p-2.5 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-emerald-200/50 shadow-sm">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                          <TrendingUp className="w-3 h-3 sm:w-5 sm:h-5 text-green-600" />
                          <span className="font-medium text-green-800 text-[10px] sm:text-sm">Total Entrées</span>
                        </div>
                        <div className="text-xs sm:text-lg font-bold text-green-900">{historique.totalEntrees} unités</div>
                        <div className="text-[10px] sm:text-sm text-green-700">{formatMontant(historique.totalEntriesMontant)}</div>
                      </div>
                      <div className="bg-gradient-to-r from-rose-50/70 to-red-50/70 backdrop-blur-sm p-2.5 sm:p-4 md:p-5 rounded-lg sm:rounded-xl border border-rose-200/50 shadow-sm">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                          <TrendingDown className="w-3 h-3 sm:w-5 sm:h-5 text-red-600" />
                          <span className="font-medium text-red-800 text-[10px] sm:text-sm">Total Sorties</span>
                        </div>
                        <div className="text-xs sm:text-lg font-bold text-red-900">{historique.totalSorties} unités</div>
                        <div className="text-[10px] sm:text-sm text-red-700">{formatMontant(historique.totalSortiesMontant)}</div>
                      </div>
                    </div>

                    {/* Tableau des mouvements */}
                    {historique.mouvements.length > 0 ? (
                      <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                        <table className="w-full border-collapse min-w-[400px]">
                          <thead>
                            <tr className="bg-gradient-to-r from-sky-600/80 to-blue-600/80 backdrop-blur-sm border-b border-sky-200/50">
                              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-sm font-medium text-white min-w-[70px] sm:min-w-[100px]">Date</th>
                              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-sm font-medium text-slate-100 min-w-[60px] sm:min-w-[80px]">Type</th>
                              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-sm font-medium text-white min-w-[50px] sm:min-w-[80px]">Qté</th>
                              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-sm font-medium text-slate-100 min-w-[80px] sm:min-w-[120px]">P.Achat</th>
                              <th className="text-left p-2 sm:p-3 text-[10px] sm:text-sm font-medium text-slate-100 min-w-[80px] sm:min-w-[120px]">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historique.mouvements.map((mouvement, index) => (
                              <tr key={index} className="border-b border-sky-100 hover:bg-sky-50/30 transition-colors">
                                <td className="p-2 sm:p-3 text-[10px] sm:text-sm text-white font-medium bg-sky-600/60">
                                  {new Date(mouvement.tms_create).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="p-2 sm:p-3">
                                  <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium ${
                                    mouvement.type_mouvement === 'ENTREE'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {mouvement.type_mouvement === 'ENTREE' ? (
                                      <TrendingUp className="w-2 h-2 sm:w-3 sm:h-3" />
                                    ) : (
                                      <TrendingDown className="w-2 h-2 sm:w-3 sm:h-3" />
                                    )}
                                    <span className="hidden sm:inline">{mouvement.type_mouvement}</span>
                                    <span className="sm:hidden">{mouvement.type_mouvement === 'ENTREE' ? 'E' : 'S'}</span>
                                  </span>
                                </td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-sm text-white font-medium bg-sky-600/60">{mouvement.quantite}</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-sm text-slate-900">{mouvement.prix_unitaire.toLocaleString('fr-FR')}</td>
                                <td className="p-2 sm:p-3 text-[10px] sm:text-sm text-slate-900 font-medium">
                                  {(mouvement.quantite * mouvement.prix_unitaire).toLocaleString('fr-FR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <History className="w-8 h-8 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2 sm:mb-3" />
                        <p className="text-slate-500 text-xs sm:text-sm">Aucun mouvement de stock enregistré</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2 sm:mb-3" />
                    <p className="text-slate-500 text-xs sm:text-sm">Erreur lors du chargement de l&apos;historique</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Onglet Photos */}
            {ongletActif === 'photos' && produitToEdit && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4 md:space-y-6"
              >
                {/* Header explicatif */}
                <div className="bg-gradient-to-r from-purple-50/70 to-pink-50/70 backdrop-blur-sm p-3 md:p-5 rounded-lg md:rounded-xl border border-purple-200/50 shadow-sm">
                  <div className="flex items-start gap-2 md:gap-3">
                    <Camera className="w-4 h-4 md:w-5 md:h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm md:text-base font-semibold text-slate-900 mb-0.5 md:mb-1">Photos du produit</h4>
                      <p className="text-xs md:text-sm text-slate-600">
                        Ajoutez jusqu&diapos;à <strong>6 photos</strong> pour présenter votre produit.
                        <span className="hidden sm:inline"> Les photos seront visibles dans votre catalogue public si vous avez activé &diapos;Présenter au public&diapos;.</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grille de photos (2x3) */}
                {isLoadingPhotos ? (
                  <div className="flex items-center justify-center py-8 md:py-12">
                    <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin text-purple-600" />
                    <span className="ml-2 md:ml-3 text-xs md:text-sm text-slate-600">Chargement...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                    {[...Array(6)].map((_, index) => {
                      const photo = photos[index];
                      const photoNumber = index + 1;

                      return (
                        <div key={index} className="relative">
                          {/* Label du numéro de photo */}
                          <div className="absolute -top-1 -left-1 md:-top-2 md:-left-2 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] md:text-xs font-bold rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center shadow-lg">
                            {photoNumber}
                          </div>

                          {/* Zone d'upload ou photo existante */}
                          {photo ? (
                            <div className="relative group">
                              {/* Photo existante */}
                              <div className="aspect-square rounded-lg md:rounded-xl overflow-hidden border md:border-2 border-purple-200 shadow-md">
                                <img
                                  src={photo.url_photo}
                                  alt={`Photo ${photoNumber}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              {/* Bouton de suppression (overlay) */}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (photo.id_photo && confirm('Supprimer cette photo ?')) {
                                    try {
                                      await produitsService.deletePhoto(photo.id_photo);
                                      // Recharger les photos
                                      if (produitToEdit) {
                                        await loadPhotos(produitToEdit.id_produit);
                                      }
                                    } catch (error) {
                                      console.error('Erreur suppression photo:', error);
                                      alert('Impossible de supprimer la photo');
                                    }
                                  }
                                }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                              >
                                <div className="flex flex-col items-center gap-1 md:gap-2 text-white">
                                  <Trash2 className="w-4 h-4 md:w-6 md:h-6" />
                                  <span className="text-[10px] md:text-xs font-medium">Supprimer</span>
                                </div>
                              </button>
                            </div>
                          ) : (
                            <LogoUpload
                              forceRemoteUpload={true}
                              uploadType="photo"
                              label={`Photo ${photoNumber}`}
                              className="aspect-square"
                              onUploadComplete={async (result: UploadResult) => {
                                console.log('🎯 [MODAL-PHOTOS] onUploadComplete callback déclenché:', {
                                  success: result.success,
                                  url: result.url,
                                  filename: result.filename,
                                  hasError: !!result.error
                                });

                                if (result.success && result.url && produitToEdit) {
                                  // Vérifier que l'URL n'est PAS une data URL
                                  if (result.url.startsWith('data:')) {
                                    console.error('❌ [MODAL-PHOTOS] URL est une data URL (upload serveur a échoué)');
                                    alert('Erreur: L\'upload vers le serveur a échoué. Veuillez réessayer.');
                                    return;
                                  }

                                  // Vérifier que l'URL est bien une URL HTTP(S)
                                  if (!result.url.startsWith('http://') && !result.url.startsWith('https://')) {
                                    console.error('❌ [MODAL-PHOTOS] URL invalide:', result.url);
                                    alert('Erreur: URL de l\'image invalide. Veuillez réessayer.');
                                    return;
                                  }

                                  console.log('✅ [MODAL-PHOTOS] Conditions validées, appel add_edit_photo...', {
                                    id_structure: produitToEdit.id_structure,
                                    id_produit: produitToEdit.id_produit,
                                    url_photo: result.url
                                  });

                                  try {
                                    // Appeler add_edit_photo
                                    const response = await produitsService.addEditPhoto({
                                      id_structure: produitToEdit.id_structure,
                                      id_produit: produitToEdit.id_produit,
                                      url_photo: result.url,
                                    });

                                    console.log('✅ [MODAL-PHOTOS] add_edit_photo réussi:', response);

                                    // Recharger les photos
                                    console.log('🔄 [MODAL-PHOTOS] Rechargement des photos...');
                                    await loadPhotos(produitToEdit.id_produit);
                                    console.log('✅ [MODAL-PHOTOS] Photos rechargées avec succès');
                                  } catch (error) {
                                    console.error('❌ [MODAL-PHOTOS] Erreur ajout photo:', error);
                                    alert('Impossible d\'ajouter la photo');
                                  }
                                } else {
                                  console.warn('⚠️ [MODAL-PHOTOS] Conditions non remplies:', {
                                    success: result.success,
                                    hasUrl: !!result.url,
                                    hasProduit: !!produitToEdit,
                                    result
                                  });
                                }
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Note en bas */}
                <div className="flex items-start gap-1.5 md:gap-2 p-2.5 md:p-4 bg-amber-50/60 backdrop-blur-sm rounded-lg border border-amber-200/50">
                  <Info className="w-4 h-4 md:w-5 md:h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm text-amber-900">
                    <strong>Astuce :</strong> Utilisez des photos de haute qualité<span className="hidden sm:inline"> pour mettre en valeur votre produit.
                    Les images seront automatiquement optimisées pour le web</span>.
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Modal de confirmation d'ajout de stock réussi */}
      {showStockSuccessModal && lastStockMovement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
          onClick={() => setShowStockSuccessModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-white/95 via-emerald-50/95 to-green-50/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100/80 to-green-100/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-emerald-200/50">
                {lastStockMovement.type_mouvement === 'ENTREE' ? (
                  <TrendingUp className="w-8 h-8 text-green-600" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Stock mis à jour !
              </h3>
              <div className="text-slate-600 mb-6 space-y-2">
                <p className="font-medium">{lastStockMovement.produit}</p>
                <p>
                  <span className={`font-semibold ${
                    lastStockMovement.type_mouvement === 'ENTREE' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {lastStockMovement.type_mouvement === 'ENTREE' ? '+' : '-'}
                    {lastStockMovement.quantite} unités
                  </span>
                </p>
                <p className="text-sm">
                  {lastStockMovement.type_mouvement === 'ENTREE' ? 'ajoutées au' : 'retirées du'} stock
                </p>
              </div>
              <button
                onClick={() => setShowStockSuccessModal(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Notification PopMessage */}
      <PopMessage
        show={popMessage.show}
        type={popMessage.type}
        title={popMessage.title}
        message={popMessage.message}
        onClose={() => setPopMessage({ ...popMessage, show: false })}
      />

      {/* Modal scanner code-barres */}
      <ModalScanCodeBarre
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onScanSuccess={handleScanSuccess}
        context="ajout-produit"
      />
    </AnimatePresence>
  );
}