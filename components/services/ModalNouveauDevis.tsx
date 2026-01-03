/**
 * Modal de création d'un nouveau devis
 * Sections: Client, Services, Équipements, Récapitulatif
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  User,
  Phone,
  MapPin,
  Wrench,
  Package,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Calculator
} from 'lucide-react';
import { Service, DevisLigneService, LigneEquipement, DevisFormData } from '@/types/prestation';
import { prestationService } from '@/services/prestation.service';
import PopMessage from '@/components/ui/PopMessage';

interface ModalNouveauDevisProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalNouveauDevis({
  isOpen,
  onClose,
  onSuccess
}: ModalNouveauDevisProps) {
  // États du formulaire
  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [adresseClient, setAdresseClient] = useState('');

  // Services
  const [servicesDisponibles, setServicesDisponibles] = useState<Service[]>([]);
  const [servicesSelectionnes, setServicesSelectionnes] = useState<DevisLigneService[]>([]);
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  // Équipements
  const [equipements, setEquipements] = useState<LigneEquipement[]>([]);
  const [showEquipementForm, setShowEquipementForm] = useState(false);
  const [nouvelEquipement, setNouvelEquipement] = useState<Partial<LigneEquipement>>({
    designation: '',
    marque: '',
    prix_unitaire: 0,
    quantite: 1,
    total: 0
  });

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'services' | 'equipements' | null>('services');

  // Messages
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

  // Charger les services disponibles
  const loadServices = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const response = await prestationService.getListeServices();
      if (response.success) {
        setServicesDisponibles(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    if (isOpen) {
      loadServices();
      // Reset form
      setNomClient('');
      setTelClient('');
      setAdresseClient('');
      setServicesSelectionnes([]);
      setEquipements([]);
      setExpandedSection('services');
    }
  }, [isOpen, loadServices]);

  // Calculer les totaux
  const totalServices = servicesSelectionnes.reduce(
    (sum, s) => sum + s.cout * (s.quantite || 1),
    0
  );

  const totalEquipements = equipements.reduce(
    (sum, e) => sum + e.total,
    0
  );

  const totalDevis = totalServices + totalEquipements;

  // Ajouter un service
  const handleAddService = (service: Service) => {
    // Vérifier si déjà ajouté
    if (servicesSelectionnes.some(s => s.id_service === service.id_service)) {
      showMessage('warning', 'Ce service est déjà dans la liste');
      return;
    }

    setServicesSelectionnes(prev => [
      ...prev,
      {
        id_service: service.id_service,
        nom_service: service.nom_service,
        cout: service.cout_base,
        quantite: 1
      }
    ]);
    setShowServiceSelector(false);
  };

  // Modifier le prix d'un service
  const handleUpdateServiceCout = (index: number, cout: number) => {
    setServicesSelectionnes(prev =>
      prev.map((s, i) => (i === index ? { ...s, cout } : s))
    );
  };

  // Supprimer un service
  const handleRemoveService = (index: number) => {
    setServicesSelectionnes(prev => prev.filter((_, i) => i !== index));
  };

  // Ajouter un équipement
  const handleAddEquipement = () => {
    if (!nouvelEquipement.designation || !nouvelEquipement.prix_unitaire) {
      showMessage('warning', 'Veuillez remplir la désignation et le prix');
      return;
    }

    const total = (nouvelEquipement.prix_unitaire || 0) * (nouvelEquipement.quantite || 1);

    setEquipements(prev => [
      ...prev,
      {
        designation: nouvelEquipement.designation || '',
        marque: nouvelEquipement.marque || '',
        prix_unitaire: nouvelEquipement.prix_unitaire || 0,
        quantite: nouvelEquipement.quantite || 1,
        total
      }
    ]);

    // Reset form
    setNouvelEquipement({
      designation: '',
      marque: '',
      prix_unitaire: 0,
      quantite: 1,
      total: 0
    });
    setShowEquipementForm(false);
  };

  // Supprimer un équipement
  const handleRemoveEquipement = (index: number) => {
    setEquipements(prev => prev.filter((_, i) => i !== index));
  };

  // Afficher message
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  // Soumettre le devis
  const handleSubmit = async () => {
    // Validation
    if (!nomClient.trim()) {
      showMessage('warning', 'Veuillez saisir le nom du client');
      return;
    }

    if (!telClient.trim() || telClient.length < 9) {
      showMessage('warning', 'Veuillez saisir un numéro de téléphone valide (9 chiffres)');
      return;
    }

    if (servicesSelectionnes.length === 0) {
      showMessage('warning', 'Veuillez ajouter au moins un service');
      return;
    }

    setIsLoading(true);

    try {
      const devisData: DevisFormData = {
        date_devis: new Date().toISOString().split('T')[0],
        nom_client: nomClient.trim(),
        tel_client: telClient.replace(/\s/g, ''),
        adresse_client: adresseClient.trim(),
        montant_services: totalServices,
        lignes_services: servicesSelectionnes,
        lignes_equipements: equipements
      };

      const response = await prestationService.createDevis(devisData);

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        showMessage('error', response.message || 'Erreur lors de la création du devis');
      }
    } catch (error) {
      console.error('Erreur création devis:', error);
      showMessage('error', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Formatage
  const formatMontant = (montant: number) =>
    `${montant.toLocaleString('fr-FR')} F`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
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
          className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 text-white">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Nouveau Devis
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenu scrollable */}
          <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
            {/* Section Client */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Client
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nom du client *</label>
                  <input
                    type="text"
                    value={nomClient}
                    onChange={(e) => setNomClient(e.target.value)}
                    placeholder="Ex: Amadou Diallo"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Téléphone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={telClient}
                      onChange={(e) => setTelClient(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="77 123 45 67"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Adresse</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={adresseClient}
                      onChange={(e) => setAdresseClient(e.target.value)}
                      placeholder="Ex: Dakar, Médina Rue 10"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section Services */}
            <div className="bg-orange-50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'services' ? null : 'services')}
                className="w-full p-4 flex items-center justify-between"
              >
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-500" />
                  Services ({servicesSelectionnes.length})
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 font-bold">{formatMontant(totalServices)}</span>
                  {expandedSection === 'services' ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expandedSection === 'services' && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Liste des services sélectionnés */}
                      {servicesSelectionnes.map((service, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-white rounded-xl p-3 border border-orange-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{service.nom_service}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">Coût:</span>
                              <input
                                type="number"
                                value={service.cout}
                                onChange={(e) => handleUpdateServiceCout(index, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                              />
                              <span className="text-xs text-gray-500">F</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveService(index)}
                            className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Bouton ajouter service */}
                      {!showServiceSelector ? (
                        <button
                          onClick={() => setShowServiceSelector(true)}
                          className="w-full py-3 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 font-medium flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          Ajouter un service
                        </button>
                      ) : (
                        <div className="bg-white rounded-xl border border-orange-200 p-3">
                          <p className="text-sm text-gray-600 mb-2">Sélectionner un service:</p>
                          {isLoadingServices ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                            </div>
                          ) : servicesDisponibles.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-2">
                              Aucun service disponible.
                              <br />
                              Créez d'abord vos services dans "Mes Services".
                            </p>
                          ) : (
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {servicesDisponibles.map((service) => (
                                <button
                                  key={service.id_service}
                                  onClick={() => handleAddService(service)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-between"
                                >
                                  <span className="text-sm font-medium">{service.nom_service}</span>
                                  <span className="text-sm text-orange-600">{formatMontant(service.cout_base)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setShowServiceSelector(false)}
                            className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section Équipements */}
            <div className="bg-purple-50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'equipements' ? null : 'equipements')}
                className="w-full p-4 flex items-center justify-between"
              >
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-500" />
                  Équipements ({equipements.length})
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">{formatMontant(totalEquipements)}</span>
                  {expandedSection === 'equipements' ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expandedSection === 'equipements' && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-xs text-purple-700 bg-purple-100 p-2 rounded-lg">
                        Les équipements sont des articles que le client devra acheter.
                        Ce montant n'est pas comptabilisé dans votre chiffre d'affaires.
                      </p>

                      {/* Liste des équipements */}
                      {equipements.map((equipement, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-white rounded-xl p-3 border border-purple-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{equipement.designation}</p>
                            {equipement.marque && (
                              <p className="text-xs text-gray-500">{equipement.marque}</p>
                            )}
                            <p className="text-xs text-purple-600 mt-1">
                              {equipement.quantite} x {formatMontant(equipement.prix_unitaire)} = {formatMontant(equipement.total)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveEquipement(index)}
                            className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Formulaire ajout équipement */}
                      {!showEquipementForm ? (
                        <button
                          onClick={() => setShowEquipementForm(true)}
                          className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-medium flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          Ajouter un équipement
                        </button>
                      ) : (
                        <div className="bg-white rounded-xl border border-purple-200 p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="Désignation *"
                            value={nouvelEquipement.designation}
                            onChange={(e) => setNouvelEquipement(prev => ({ ...prev, designation: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                          <input
                            type="text"
                            placeholder="Marque (optionnel)"
                            value={nouvelEquipement.marque}
                            onChange={(e) => setNouvelEquipement(prev => ({ ...prev, marque: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500">Prix unitaire *</label>
                              <input
                                type="number"
                                placeholder="Prix"
                                value={nouvelEquipement.prix_unitaire || ''}
                                onChange={(e) => setNouvelEquipement(prev => ({ ...prev, prix_unitaire: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Quantité</label>
                              <input
                                type="number"
                                placeholder="Qté"
                                value={nouvelEquipement.quantite || 1}
                                onChange={(e) => setNouvelEquipement(prev => ({ ...prev, quantite: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                                min="1"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowEquipementForm(false)}
                              className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleAddEquipement}
                              className="flex-1 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Récapitulatif */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Récapitulatif
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-100">Services (main d'œuvre)</span>
                  <span className="font-semibold">{formatMontant(totalServices)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Équipements (achats client)</span>
                  <span className="font-semibold">{formatMontant(totalEquipements)}</span>
                </div>
                <div className="border-t border-blue-400 pt-2 mt-2 flex justify-between text-lg">
                  <span className="font-bold">TOTAL DEVIS</span>
                  <span className="font-bold">{formatMontant(totalDevis)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer avec boutons */}
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || servicesSelectionnes.length === 0}
              className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isLoading ? 'Création...' : 'Créer le devis'}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Messages */}
      <PopMessage
        show={popMessage.show}
        type={popMessage.type}
        title={popMessage.title}
        message={popMessage.message}
        onClose={() => setPopMessage({ ...popMessage, show: false })}
      />
    </AnimatePresence>
  );
}

export default ModalNouveauDevis;
