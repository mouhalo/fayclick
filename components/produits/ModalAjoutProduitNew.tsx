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
} from 'lucide-react';
import { Produit, ProduitFormDataNew, AddEditProduitResponse, MouvementStockForm, HistoriqueMouvements } from '@/types/produit';
import { produitsService } from '@/services/produits.service';

interface ModalAjoutProduitNewProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (produit: AddEditProduitResponse) => void;
  onStockUpdate?: (id_produit: number, nouveau_stock: number) => void;
  onRequestStockAddition?: (produit: AddEditProduitResponse) => void;
  produitToEdit?: Produit | null;
  typeStructure: string;
  defaultTab?: 'informations' | 'gestion-stock' | 'historique';
}

type OngletType = 'informations' | 'gestion-stock' | 'historique';

export function ModalAjoutProduitNew({
  isOpen,
  onClose,
  onSuccess,
  onStockUpdate,
  onRequestStockAddition,
  produitToEdit,
  typeStructure,
  defaultTab = 'informations'
}: ModalAjoutProduitNewProps) {
  const [ongletActif, setOngletActif] = useState<OngletType>(defaultTab);
  const [formData, setFormData] = useState<ProduitFormDataNew>({
    nom_produit: '',
    cout_revient: 0,
    prix_vente: 0,
    est_service: false,
    nom_categorie: '',
    description: ''
  });
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

  // Liste des catégories prédéfinies selon le type de structure
  const categories = typeStructure === 'PRESTATAIRE DE SERVICES'
    ? ['Consultation', 'Formation', 'Installation', 'Maintenance', 'Support', 'Autre']
    : ['Électronique', 'Vêtements', 'Alimentation', 'Mobilier', 'Automobile', 'Santé', 'Autre'];

  // Onglets disponibles
  const onglets = [
    {
      id: 'informations' as OngletType,
      label: 'Informations',
      icon: Info,
      alwaysVisible: true
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
  const ongletsAffiches = onglets.filter(onglet =>
    onglet.alwaysVisible ||
    (produitToEdit && !produitToEdit.est_service)
  );

  // Initialiser le formulaire quand on modifie un produit
  useEffect(() => {
    if (produitToEdit && isOpen) {
      setFormData({
        nom_produit: produitToEdit.nom_produit || '',
        cout_revient: produitToEdit.cout_revient || 0,
        prix_vente: produitToEdit.prix_vente || 0,
        est_service: produitToEdit.est_service || false,
        nom_categorie: produitToEdit.nom_categorie || '',
        description: produitToEdit.description || ''
      });
      setStockForm({
        quantite: 0,
        prix_unitaire: produitToEdit.cout_revient || 0,
        type_mouvement: 'ENTREE',
        description: ''
      });
    } else if (isOpen) {
      // Reset pour nouveau produit
      setFormData({
        nom_produit: '',
        cout_revient: 0,
        prix_vente: 0,
        est_service: typeStructure === 'PRESTATAIRE DE SERVICES',
        nom_categorie: '',
        description: ''
      });
      setStockForm({
        quantite: 0,
        prix_unitaire: 0,
        type_mouvement: 'ENTREE',
        description: ''
      });
    }
    setErrors({});
    setOngletActif(defaultTab);
    setHistorique(null);
    // Reset modal de confirmation de stock
    setShowStockSuccessModal(false);
    setLastStockMovement(null);
  }, [produitToEdit, isOpen, typeStructure, defaultTab]);

  // Charger l'historique quand on ouvre l'onglet
  useEffect(() => {
    if (ongletActif === 'historique' && produitToEdit && !historique) {
      loadHistorique();
    }
  }, [ongletActif, produitToEdit]);

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
        onClose();
      } else {
        // Création d'un nouveau produit
        result = await produitsService.createProduitNew(formData);
        onSuccess(result);

        // Si c'est un produit (pas un service) ET qu'on a le callback, proposer l'ajout de stock
        if (!formData.est_service && onRequestStockAddition) {
          onRequestStockAddition(result);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
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

      console.log('Mouvement ajouté avec succès');
      
    } catch (error) {
      console.error('Erreur mouvement stock:', error);
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

  // Formatage des montants
  const formatMontant = (montant: number) => `${montant.toLocaleString('fr-FR')} FCFA`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-white/95 via-sky-50/95 to-blue-50/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/50"
        >
          {/* Header avec onglets - Glassmorphisme */}
          <div className="bg-gradient-to-r from-sky-400/90 to-blue-500/90 backdrop-blur-lg p-6 text-white relative overflow-hidden">
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            <div className="relative z-10 flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {produitToEdit ? 'Modifier le produit' : 'Ajouter un produit'}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Navigation onglets */}
            <div className="relative z-10 flex space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
              {ongletsAffiches.map((onglet) => {
                const shortLabels = {
                  'informations': 'Infos',
                  'gestion-stock': 'Stocks',
                  'historique': 'Historique'
                };

                return (
                  <button
                    key={onglet.id}
                    onClick={() => setOngletActif(onglet.id)}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      ongletActif === onglet.id
                        ? 'bg-white/95 shadow-lg text-sky-600'
                        : 'text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    <onglet.icon className="w-4 h-4" />
                    <span>{shortLabels[onglet.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contenu des onglets */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Onglet Informations */}
            {ongletActif === 'informations' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nom du produit */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Package className="w-4 h-4 inline mr-1" />
                      Nom du {formData.est_service ? 'service' : 'produit'} *
                    </label>
                    <input
                      type="text"
                      value={formData.nom_produit}
                      onChange={(e) => handleInputChange('nom_produit', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70 ${
                        errors.nom_produit ? 'border-red-400 bg-red-50/60' : 'border-sky-200'
                      }`}
                      placeholder={`Ex: ${formData.est_service ? 'Consultation technique' : 'Samsung Galaxy A10'}`}
                    />
                    {errors.nom_produit && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.nom_produit}
                      </p>
                    )}
                  </div>

                  {/* Type: Produit ou Service */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={!formData.est_service}
                          onChange={() => handleInputChange('est_service', false)}
                          className="mr-2 text-sky-600"
                        />
                        Produit physique
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          checked={formData.est_service}
                          onChange={() => handleInputChange('est_service', true)}
                          className="mr-2 text-sky-600"
                        />
                        Service
                      </label>
                    </div>
                  </div>

                  {/* Prix - Grille horizontale 2x1 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Prix d&diapos;achat (FCFA) *
                      </label>
                      <input
                        type="number"
                        value={formData.cout_revient}
                        onChange={(e) => handleInputChange('cout_revient', parseFloat(e.target.value) || 0)}
                        className={`w-full px-4 py-3 border rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70 ${
                          errors.cout_revient ? 'border-red-400 bg-red-50/60' : 'border-sky-200'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      {errors.cout_revient && (
                        <p className="text-red-500 text-sm mt-1">{errors.cout_revient}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Prix de vente (FCFA) *
                      </label>
                      <input
                        type="number"
                        value={formData.prix_vente}
                        onChange={(e) => handleInputChange('prix_vente', parseFloat(e.target.value) || 0)}
                        className={`w-full px-4 py-3 border rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70 ${
                          errors.prix_vente ? 'border-red-400 bg-red-50/60' : 'border-sky-200'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      {errors.prix_vente && (
                        <p className="text-red-500 text-sm mt-1">{errors.prix_vente}</p>
                      )}
                    </div>
                  </div>

                  {/* Calcul de la marge */}
                  {formData.cout_revient > 0 && formData.prix_vente > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50/60 to-green-50/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-200/50 shadow-sm">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Marge bénéficiaire:</span>
                        <div className="text-right">
                          <div className="font-semibold text-sky-900">
                            {formatMontant(marge)}
                          </div>
                          <div className="text-sky-700">
                            ({margePercentage}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Catégorie */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Catégorie
                    </label>
                    <select
                      value={formData.nom_categorie}
                      onChange={(e) => handleInputChange('nom_categorie', e.target.value)}
                      className="w-full px-4 py-3 border border-sky-200 rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-sky-200 rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70 resize-none"
                      placeholder={`Décrivez votre ${formData.est_service ? 'service' : 'produit'}...`}
                    />
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 bg-white/60 backdrop-blur-sm border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50/60 hover:border-gray-300 transition-all font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isLoading 
                        ? 'Enregistrement...' 
                        : produitToEdit 
                          ? 'Modifier' 
                          : 'Créer'
                      }
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Onglet Gestion du stock */}
            {ongletActif === 'gestion-stock' && produitToEdit && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-sky-50/70 to-blue-50/70 backdrop-blur-sm p-5 rounded-xl border border-sky-200/50 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-2">Produit: {produitToEdit?.nom_produit}</h4>
                  <p className="text-sm text-slate-600">Stock actuel: <span className="font-medium">{produitToEdit?.niveau_stock || produitToEdit?.stock_actuel || 0} unités</span></p>
                </div>

                <form onSubmit={handleStockSubmit} className="space-y-5">
                  {/* Type de mouvement */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type de mouvement</label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center p-3 border border-sky-300/50 rounded-lg hover:bg-sky-50/50 cursor-pointer">
                        <input
                          type="radio"
                          checked={stockForm.type_mouvement === 'ENTREE'}
                          onChange={() => setStockForm(prev => ({ ...prev, type_mouvement: 'ENTREE' }))}
                          className="mr-3 text-green-600"
                        />
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-700">Entrée</span>
                        </div>
                      </label>
                      <label className="flex items-center p-3 border border-sky-300/50 rounded-lg hover:bg-sky-50/50 cursor-pointer">
                        <input
                          type="radio"
                          checked={stockForm.type_mouvement === 'SORTIE'}
                          onChange={() => setStockForm(prev => ({ ...prev, type_mouvement: 'SORTIE' }))}
                          className="mr-3 text-red-600"
                        />
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-red-700">Sortie</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Quantité et Prix - Grille horizontale 2x1 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Quantité *
                      </label>
                      <input
                        type="number"
                        value={stockForm.quantite}
                        onChange={(e) => setStockForm(prev => ({ ...prev, quantite: parseInt(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-sky-200 rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Prix unitaire (FCFA) *
                      </label>
                      <input
                        type="number"
                        value={stockForm.prix_unitaire}
                        onChange={(e) => setStockForm(prev => ({ ...prev, prix_unitaire: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-4 py-3 border border-sky-200 rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all hover:bg-white/70"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description (optionnelle)
                    </label>
                    <textarea
                      value={stockForm.description}
                      onChange={(e) => setStockForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2.5 border border-sky-300/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      placeholder="Motif du mouvement..."
                    />
                  </div>

                  {/* Total calculé */}
                  {stockForm.quantite > 0 && stockForm.prix_unitaire > 0 && (
                    <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/60 backdrop-blur-sm p-4 rounded-xl border border-orange-200/50 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Total {stockForm.type_mouvement.toLowerCase()}:</span>
                        <div className="text-lg font-semibold text-orange-900">
                          {formatMontant(stockForm.quantite * stockForm.prix_unitaire)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bouton de soumission */}
                  <button
                    type="submit"
                    disabled={isLoadingStock || stockForm.quantite <= 0 || stockForm.prix_unitaire <= 0}
                    className="w-full px-4 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-sky-600 hover:to-blue-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    {isLoadingStock ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Package className="w-4 h-4" />
                    )}
                    {isLoadingStock ? 'Enregistrement...' : 'Enregistrer le mouvement'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Onglet Historique */}
            {ongletActif === 'historique' && produitToEdit && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {isLoadingHistorique ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
                  </div>
                ) : historique ? (
                  <>
                    {/* Statistiques */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-r from-emerald-50/70 to-green-50/70 backdrop-blur-sm p-5 rounded-xl border border-emerald-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-800">Total Entrées</span>
                        </div>
                        <div className="text-lg font-bold text-green-900">{historique.totalEntrees} unités</div>
                        <div className="text-sm text-green-700">{formatMontant(historique.totalEntriesMontant)}</div>
                      </div>
                      <div className="bg-gradient-to-r from-rose-50/70 to-red-50/70 backdrop-blur-sm p-5 rounded-xl border border-rose-200/50 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown className="w-5 h-5 text-red-600" />
                          <span className="font-medium text-red-800">Total Sorties</span>
                        </div>
                        <div className="text-lg font-bold text-red-900">{historique.totalSorties} unités</div>
                        <div className="text-sm text-red-700">{formatMontant(historique.totalSortiesMontant)}</div>
                      </div>
                    </div>

                    {/* Tableau des mouvements */}
                    {historique.mouvements.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gradient-to-r from-sky-50/70 to-blue-50/70 backdrop-blur-sm border-b border-sky-200/50">
                              <th className="text-left p-3 text-sm font-medium text-slate-700 min-w-[100px]">Date</th>
                              <th className="text-left p-3 text-sm font-medium text-slate-700 min-w-[80px]">Type</th>
                              <th className="text-left p-3 text-sm font-medium text-slate-700 min-w-[80px]">Quantité</th>
                              <th className="text-left p-3 text-sm font-medium text-slate-700 min-w-[120px]">Prix Achat (FCFA)</th>
                              <th className="text-left p-3 text-sm font-medium text-slate-700 min-w-[120px]">Total (FCFA)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historique.mouvements.map((mouvement, index) => (
                              <tr key={index} className="border-b border-sky-100 hover:bg-sky-50/30 transition-colors">
                                <td className="p-3 text-sm text-slate-600">
                                  {new Date(mouvement.tms_create).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    mouvement.type_mouvement === 'ENTREE' 
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {mouvement.type_mouvement === 'ENTREE' ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDown className="w-3 h-3" />
                                    )}
                                    {mouvement.type_mouvement}
                                  </span>
                                </td>
                                <td className="p-3 text-sm text-slate-900 font-medium">{mouvement.quantite}</td>
                                <td className="p-3 text-sm text-slate-900">{mouvement.prix_unitaire.toLocaleString('fr-FR')}</td>
                                <td className="p-3 text-sm text-slate-900 font-medium">
                                  {(mouvement.quantite * mouvement.prix_unitaire).toLocaleString('fr-FR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">Aucun mouvement de stock enregistré</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Erreur lors du chargement de l&iapos;historique</p>
                  </div>
                )}
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
    </AnimatePresence>
  );
}