/**
 * Modal d'ajout/modification de service - Version simplifiée
 * 2 onglets: Informations, Historique des prestations
 * Adapté pour les prestataires de services (maçons, plombiers, etc.)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Wrench,
  Tag,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  History,
  Info,
  Activity,
  Banknote
} from 'lucide-react';
import { Service, ServiceFormData, CATEGORIES_SERVICES } from '@/types/prestation';
import { prestationService } from '@/services/prestation.service';
import PopMessage from '@/components/ui/PopMessage';

interface ModalServiceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (service: Service) => void;
  serviceToEdit?: Service | null;
}

type OngletType = 'informations' | 'historique';

export function ModalService({
  isOpen,
  onClose,
  onSuccess,
  serviceToEdit
}: ModalServiceProps) {
  const isEditMode = !!serviceToEdit;

  const [ongletActif, setOngletActif] = useState<OngletType>('informations');
  const [formData, setFormData] = useState<ServiceFormData>({
    nom_service: '',
    cout_base: 0,
    description: '',
    nom_categorie: ''
  });
  const [errors, setErrors] = useState<Partial<ServiceFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
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

  // Onglets disponibles
  const onglets = [
    {
      id: 'informations' as OngletType,
      label: 'Informations',
      icon: Info
    },
    {
      id: 'historique' as OngletType,
      label: 'Historique',
      icon: Activity,
      onlyEditMode: true
    }
  ];

  // Filtrer les onglets selon le contexte
  const ongletsAffiches = onglets.filter(onglet => {
    if (onglet.onlyEditMode && !isEditMode) return false;
    return true;
  });

  // Initialiser le formulaire
  useEffect(() => {
    if (serviceToEdit && isOpen) {
      setFormData({
        nom_service: serviceToEdit.nom_service || '',
        cout_base: serviceToEdit.cout_base || 0,
        description: serviceToEdit.description || '',
        nom_categorie: serviceToEdit.nom_categorie || ''
      });
      setOngletActif('informations');
    } else if (isOpen) {
      // Reset pour nouveau service
      setFormData({
        nom_service: '',
        cout_base: 0,
        description: '',
        nom_categorie: ''
      });
      setOngletActif('informations');
    }
    setErrors({});
  }, [serviceToEdit, isOpen]);

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Partial<ServiceFormData> = {};

    if (!formData.nom_service.trim()) {
      newErrors.nom_service = 'Le nom du service est requis';
    }

    if (formData.cout_base < 0) {
      newErrors.cout_base = 'Le coût ne peut pas être négatif' as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Afficher message de notification
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  // Gestion de la soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let result;

      if (serviceToEdit) {
        // Modification
        const response = await prestationService.updateService(serviceToEdit.id_service, formData);
        result = response.data;
        showMessage('success', 'Service modifié avec succès', 'Sauvegarde');
      } else {
        // Création
        const response = await prestationService.createService(formData);
        result = response.data;
        showMessage('success', 'Service créé avec succès', 'Sauvegarde');
      }

      onSuccess(result);

      // Fermer après un court délai
      setTimeout(() => onClose(), 1500);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      showMessage('error', 'Une erreur est survenue lors de la sauvegarde', 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion des changements de champs
  const handleInputChange = (field: keyof ServiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Formatage des montants
  const formatMontant = (montant: number) => `${montant.toLocaleString('fr-FR')} FCFA`;

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key="modal-service-backdrop"
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
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 backdrop-blur-xl rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-white/20"
        >
          {/* Header avec onglets */}
          <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 backdrop-blur-lg p-5 text-white relative overflow-hidden">
            {/* Pattern décoratif */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            <div className="relative z-10 flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wrench className="w-6 h-6" />
                {serviceToEdit ? 'Modifier le service' : 'Nouveau service'}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Navigation onglets */}
            {ongletsAffiches.length > 1 && (
              <div className="relative z-10 flex space-x-1 bg-white/10 backdrop-blur-sm rounded-xl p-1">
                {ongletsAffiches.map((onglet) => (
                  <button
                    key={onglet.id}
                    onClick={() => setOngletActif(onglet.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      ongletActif === onglet.id
                        ? 'bg-white/95 shadow-lg text-orange-600'
                        : 'text-white/80 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    <onglet.icon className="w-4 h-4" />
                    <span>{onglet.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contenu */}
          <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)] bg-gradient-to-br from-indigo-400/10 via-purple-400/15 to-indigo-400/10 backdrop-blur-2xl">
            {/* Onglet Informations */}
            {ongletActif === 'informations' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Nom du service */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Wrench className="w-4 h-4 inline mr-1" />
                      Nom du service *
                    </label>
                    <input
                      type="text"
                      value={formData.nom_service}
                      onChange={(e) => handleInputChange('nom_service', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all ${
                        errors.nom_service
                          ? 'border-red-400 bg-red-50/60'
                          : 'border-indigo-200 bg-white/60 hover:bg-white/70'
                      }`}
                      placeholder="Ex: Installation électrique, Réparation fuite..."
                    />
                    {errors.nom_service && (
                      <p className="text-red-300 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.nom_service}
                      </p>
                    )}
                  </div>

                  {/* Coût de base */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Banknote className="w-4 h-4 inline mr-1" />
                      Coût de base (FCFA) *
                    </label>
                    <input
                      type="number"
                      value={formData.cout_base}
                      onChange={(e) => handleInputChange('cout_base', parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-3 border rounded-xl backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all ${
                        errors.cout_base
                          ? 'border-red-400 bg-red-50/60'
                          : 'border-indigo-200 bg-white/60 hover:bg-white/70'
                      }`}
                      min="0"
                      step="100"
                      placeholder="15000"
                    />
                    {errors.cout_base && (
                      <p className="text-red-300 text-sm mt-1">{errors.cout_base}</p>
                    )}
                    <p className="text-indigo-200 text-xs mt-1.5">
                      Tarif indicatif. Vous pourrez ajuster le prix lors de chaque devis/prestation.
                    </p>
                  </div>

                  {/* Catégorie */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Catégorie
                    </label>
                    <select
                      value={formData.nom_categorie}
                      onChange={(e) => handleInputChange('nom_categorie', e.target.value)}
                      className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all hover:bg-white/70"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      {CATEGORIES_SERVICES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <FileText className="w-4 h-4 inline mr-1" />
                      Description (optionnel)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-indigo-200 rounded-xl bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none hover:bg-white/70"
                      placeholder="Décrivez votre service en quelques mots..."
                    />
                  </div>

                  {/* Aperçu du coût */}
                  {formData.cout_base > 0 && (
                    <div className="bg-gradient-to-r from-orange-50/60 to-amber-50/60 backdrop-blur-sm p-4 rounded-xl border border-orange-200/50 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 text-sm">Coût de base affiché:</span>
                        <div className="text-lg font-bold text-orange-700">
                          {formatMontant(formData.cout_base)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 bg-red-500/20 backdrop-blur-sm border border-red-400/30 text-red-200 rounded-xl hover:bg-red-500/30 transition-all font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isLoading
                        ? 'Enregistrement...'
                        : serviceToEdit
                          ? 'Modifier'
                          : 'Créer'
                      }
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Onglet Historique */}
            {ongletActif === 'historique' && serviceToEdit && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 backdrop-blur-sm p-4 rounded-xl border border-indigo-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    <span className="font-medium text-indigo-800">Historique des prestations</span>
                  </div>
                  <p className="text-sm text-indigo-600">
                    Service: <strong>{serviceToEdit.nom_service}</strong>
                  </p>
                </div>

                {/* Placeholder pour l'historique */}
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                  <p className="text-indigo-200">
                    L&apos;historique des prestations sera disponible prochainement.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
      </AnimatePresence>

      {/* Notification PopMessage */}
      <PopMessage
        show={popMessage.show}
        type={popMessage.type}
        title={popMessage.title}
        message={popMessage.message}
        onClose={() => setPopMessage({ ...popMessage, show: false })}
      />
    </>
  );
}

export default ModalService;
