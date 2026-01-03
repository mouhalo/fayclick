/**
 * Modal de création de facture à partir d'un devis
 * Permet de confirmer/modifier client, équipements et remise
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Receipt,
  User,
  Phone,
  Package,
  Trash2,
  Plus,
  Minus,
  Percent,
  Save,
  Loader2,
  AlertCircle,
  Wrench,
  Edit2
} from 'lucide-react';
import { DevisFromDB, LigneEquipement } from '@/types/prestation';

interface ModalCreerFactureProps {
  isOpen: boolean;
  onClose: () => void;
  onCreerFacture: (data: FactureFromDevisData) => Promise<void>;
  devisData: DevisFromDB | null;
}

export interface FactureFromDevisData {
  id_devis: number;
  nom_client: string;
  tel_client: string;
  montant_services: number;
  equipements: LigneEquipement[];
  montant_equipements: number;
  remise: number;
  montant_total: number;
  montant_net: number;
}

export function ModalCreerFacture({
  isOpen,
  onClose,
  onCreerFacture,
  devisData
}: ModalCreerFactureProps) {
  // État du formulaire
  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [equipements, setEquipements] = useState<LigneEquipement[]>([]);
  const [remise, setRemise] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditingClient, setIsEditingClient] = useState(false);

  // Initialiser le formulaire avec les données du devis
  useEffect(() => {
    if (devisData && isOpen) {
      setNomClient(devisData.devis.nom_client_payeur || '');
      setTelClient(devisData.devis.tel_client || '');
      setEquipements(devisData.devis.lignes_equipements || []);
      setRemise(0);
      setErrors({});
      setIsEditingClient(false);
    }
  }, [devisData, isOpen]);

  // Calcul des montants
  const montantServices = useMemo(() => {
    return devisData?.devis.montant || 0;
  }, [devisData]);

  const montantEquipements = useMemo(() => {
    return equipements.reduce((sum, eq) => sum + (eq.prix_unitaire * eq.quantite), 0);
  }, [equipements]);

  const montantTotal = useMemo(() => {
    return montantServices + montantEquipements;
  }, [montantServices, montantEquipements]);

  const montantNet = useMemo(() => {
    return Math.max(0, montantTotal - remise);
  }, [montantTotal, remise]);

  // Formatage des montants (avec protection contre undefined)
  const formatMontant = (montant: number | undefined | null) =>
    `${(montant || 0).toLocaleString('fr-FR')} F`;

  // Formatage téléphone
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) return cleaned;
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  };

  // Validation du formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nomClient.trim()) {
      newErrors.nomClient = 'Le nom du client est requis';
    }

    const telCleaned = telClient.replace(/\D/g, '');
    if (!telCleaned || telCleaned.length !== 9) {
      newErrors.telClient = 'Le numéro doit contenir 9 chiffres';
    }

    if (remise > montantTotal) {
      newErrors.remise = 'La remise ne peut pas dépasser le montant total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Modifier quantité équipement
  const updateEquipementQuantite = (index: number, delta: number) => {
    setEquipements(prev => {
      const updated = [...prev];
      const newQte = Math.max(0, updated[index].quantite + delta);
      if (newQte === 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...updated[index],
        quantite: newQte,
        total: updated[index].prix_unitaire * newQte
      };
      return updated;
    });
  };

  // Supprimer équipement
  const removeEquipement = (index: number) => {
    setEquipements(prev => prev.filter((_, i) => i !== index));
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!validateForm() || !devisData) return;

    setIsLoading(true);
    try {
      await onCreerFacture({
        id_devis: devisData.devis.id_devis,
        nom_client: nomClient.trim(),
        tel_client: telClient.replace(/\D/g, ''),
        montant_services: montantServices,
        equipements: equipements,
        montant_equipements: montantEquipements,
        remise: remise,
        montant_total: montantTotal,
        montant_net: montantNet
      });
      onClose();
    } catch (error) {
      console.error('Erreur création facture:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !devisData) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="modal-creer-facture-backdrop"
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
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="w-6 h-6" />
                  Créer Facture
                </h3>
                <p className="text-green-100 text-sm mt-1">
                  À partir du devis {devisData.devis.num_devis}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Contenu scrollable */}
          <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-5">

            {/* Section Client */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client
                </h4>
                <button
                  onClick={() => setIsEditingClient(!isEditingClient)}
                  className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                    isEditingClient
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                  }`}
                >
                  <Edit2 className="w-3 h-3" />
                  {isEditingClient ? 'Terminé' : 'Modifier'}
                </button>
              </div>

              {isEditingClient ? (
                <div className="space-y-3">
                  {/* Nom client */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Nom du client</label>
                    <input
                      type="text"
                      value={nomClient}
                      onChange={(e) => setNomClient(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        errors.nomClient ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      placeholder="Nom du client"
                    />
                    {errors.nomClient && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.nomClient}
                      </p>
                    )}
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={telClient}
                      onChange={(e) => setTelClient(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        errors.telClient ? 'border-red-400 bg-red-50' : 'border-gray-200'
                      }`}
                      placeholder="77 123 45 67"
                    />
                    {errors.telClient && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.telClient}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-medium text-gray-800">{nomClient || 'Non renseigné'}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {formatPhone(telClient) || 'Non renseigné'}
                  </p>
                </div>
              )}
            </div>

            {/* Section Services (lecture seule) */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100">
              <h4 className="font-semibold text-orange-800 flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4" />
                Services ({devisData.resume.nb_produits})
              </h4>
              <div className="space-y-2">
                {devisData.details_produits.map((prod, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      {prod.nom_produit}
                      {prod.quantite > 1 && <span className="text-gray-400"> x{prod.quantite}</span>}
                    </span>
                    <span className="font-medium text-orange-700">{formatMontant(prod.sous_total)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-orange-200 flex justify-between">
                <span className="text-sm text-gray-600">Total services</span>
                <span className="font-bold text-orange-700">{formatMontant(montantServices)}</span>
              </div>
            </div>

            {/* Section Équipements (modifiable) */}
            {equipements.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-100">
                <h4 className="font-semibold text-purple-800 flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4" />
                  Équipements ({equipements.length})
                </h4>
                <div className="space-y-3">
                  {equipements.map((eq, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800 text-sm">{eq.designation}</p>
                          {eq.marque && (
                            <p className="text-xs text-gray-500">{eq.marque}</p>
                          )}
                          <p className="text-xs text-purple-600 mt-1">
                            {formatMontant(eq.prix_unitaire)} / unité
                          </p>
                        </div>
                        <button
                          onClick={() => removeEquipement(idx)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateEquipementQuantite(idx, -1)}
                            className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>
                          <span className="w-8 text-center font-medium">{eq.quantite}</span>
                          <button
                            onClick={() => updateEquipementQuantite(idx, 1)}
                            className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        <span className="font-bold text-purple-700">
                          {formatMontant(eq.prix_unitaire * eq.quantite)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-purple-200 flex justify-between">
                  <span className="text-sm text-gray-600">Total équipements</span>
                  <span className="font-bold text-purple-700">{formatMontant(montantEquipements)}</span>
                </div>
              </div>
            )}

            {/* Section Remise */}
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 border border-emerald-100">
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                <Percent className="w-4 h-4" />
                Remise
              </h4>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={remise || ''}
                  onChange={(e) => setRemise(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
                    errors.remise ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="0"
                  min="0"
                />
                <span className="text-gray-500 text-sm">FCFA</span>
              </div>
              {errors.remise && (
                <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.remise}
                </p>
              )}
            </div>

            {/* Récapitulatif */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3">Récapitulatif</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Services</span>
                  <span className="font-medium">{formatMontant(montantServices)}</span>
                </div>
                {montantEquipements > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Équipements</span>
                    <span className="font-medium">{formatMontant(montantEquipements)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-gray-700">Sous-total</span>
                  <span className="font-semibold">{formatMontant(montantTotal)}</span>
                </div>
                {remise > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Remise</span>
                    <span>-{formatMontant(remise)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-gray-300 pt-2">
                  <span className="text-lg font-bold text-gray-800">Total à payer</span>
                  <span className="text-lg font-bold text-green-600">{formatMontant(montantNet)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer avec boutons */}
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isLoading ? 'Création...' : 'Créer la facture'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalCreerFacture;
