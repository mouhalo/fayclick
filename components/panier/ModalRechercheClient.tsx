/**
 * Modal de Recherche de Client pour le Panier
 * Recherche intelligente par telephone avec auto-completion
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, User, Search, CheckCircle, UserPlus, Loader2, ShoppingCart, AlertCircle, Banknote } from 'lucide-react';
import { clientsService } from '@/services/clients.service';
import { Client } from '@/types/client';

interface ModalRechercheClientProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: Partial<Client> & { id_client?: number; nom_client: string; tel_client: string }) => void;
  initialPhone?: string;
  initialName?: string;
}

export function ModalRechercheClient({
  isOpen,
  onClose,
  onSelectClient,
  initialPhone = '',
  initialName = ''
}: ModalRechercheClientProps) {
  const [telephone, setTelephone] = useState(initialPhone);
  const [nomClient, setNomClient] = useState(initialName);
  const [isSearching, setIsSearching] = useState(false);
  const [clientTrouve, setClientTrouve] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [clientData, setClientData] = useState<Client | null>(null);
  const [clientStats, setClientStats] = useState<{
    montant_restant: number;
    nombre_total_ventes: number;
    montant_total_achats: number;
    nombre_factures_impayees: number;
  } | null>(null);

  // Auto-recherche quand le telephone atteint 9 caracteres
  useEffect(() => {
    const cleanedPhone = telephone.replace(/\D/g, '');

    if (cleanedPhone.length === 9) {
      handleSearchClient(cleanedPhone);
    } else if (cleanedPhone.length < 9) {
      // Reinitialiser si < 9 caracteres
      setClientTrouve(false);
      setSearchMessage('');
      setClientData(null);
      if (!initialName) {
        setNomClient('');
      }
    }
  }, [telephone]);

  const handleSearchClient = async (phone: string) => {
    try {
      setIsSearching(true);
      setSearchMessage('');

      console.log('[MODAL] Recherche rapide client pour:', phone);

      // Utilisation de la nouvelle méthode optimisée checkOneClient
      const response = await clientsService.checkOneClient(phone);

      // Vérifier si client trouvé : success=true ET client présent
      if (response.success && response.client) {
        console.log('[MODAL] ✅ Client trouvé:', response.client.nom_client);

        setClientTrouve(true);
        // Mapper CheckOneClientInfo vers Client
        setClientData({
          id_client: 0, // Ne sera pas utilisé dans le panier
          nom_client: response.client.nom_client,
          tel_client: response.client.tel_client,
          adresse: response.client.adresse,
          date_creation: response.client.date_creation,
          date_modification: response.client.date_modification
        });
        setNomClient(response.client.nom_client);

        // Stocker les statistiques
        if (response.statistiques) {
          setClientStats({
            montant_restant: response.statistiques.montant_restant || 0,
            nombre_total_ventes: response.statistiques.nombre_total_ventes || 0,
            montant_total_achats: response.statistiques.montant_total_achats || 0,
            nombre_factures_impayees: response.statistiques.nombre_factures_impayees || 0
          });
        }

        setSearchMessage('Client trouvé dans la base');
      } else {
        console.log('[MODAL] ℹ️ Client non trouvé, nouveau client');

        setClientTrouve(false);
        setClientData(null);
        setClientStats(null);
        setSearchMessage('Nouveau client - Saisissez le nom');
        // Ne pas effacer le nom si déjà rempli
        if (!nomClient) {
          setNomClient('');
        }
      }
    } catch (error) {
      console.error('[MODAL] ❌ Erreur recherche:', error);
      setSearchMessage('Erreur lors de la recherche');
      setClientTrouve(false);
      setClientData(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    const cleanedPhone = telephone.replace(/\D/g, '');

    // Validation
    if (cleanedPhone.length !== 9) {
      setSearchMessage('Le numero doit contenir 9 chiffres');
      return;
    }

    if (!nomClient.trim()) {
      setSearchMessage('Le nom du client est requis');
      return;
    }

    // Construire l'objet client a retourner
    const clientToSelect: Partial<Client> & { id_client?: number; nom_client: string; tel_client: string } = {
      id_client: clientData?.id_client,
      nom_client: nomClient.trim(),
      tel_client: cleanedPhone,
      adresse: clientData?.adresse || ''
    };

    console.log('[MODAL] Selection client:', clientToSelect);

    onSelectClient(clientToSelect);
    onClose();
  };

  const handleCancel = () => {
    // Reinitialiser
    setTelephone(initialPhone);
    setNomClient(initialName);
    setClientTrouve(false);
    setSearchMessage('');
    setClientData(null);
    setClientStats(null);
    onClose();
  };

  const formatPhoneDisplay = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
    if (cleaned.length <= 7) return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
    return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 9) {
      setTelephone(value);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="
              bg-white rounded-2xl w-full max-w-md
              shadow-2xl border border-gray-200/50
              overflow-hidden
            "
          >
            {/* Header Compact */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-blue-100/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Search className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Rechercher un client</h2>
                  <p className="text-xs text-gray-600">Par numero de telephone</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Input Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Telephone du client ({telephone.replace(/\D/g, '').length}/9)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formatPhoneDisplay(telephone)}
                    onChange={handlePhoneChange}
                    placeholder="77 123 45 67"
                    autoFocus
                    className="
                      w-full px-3 py-2.5 rounded-lg border-2 border-gray-300
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all text-base font-medium
                      placeholder:text-gray-400
                    "
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Message de recherche */}
              {searchMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    p-2 rounded-lg flex items-center gap-1.5 text-xs font-medium
                    ${clientTrouve
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }
                  `}
                >
                  {clientTrouve ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  {searchMessage}
                </motion.div>
              )}

              {/* Input Nom Client */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Nom du client
                  </label>
                  {clientTrouve && (
                    <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Client existant
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={nomClient}
                    onChange={(e) => setNomClient(e.target.value)}
                    placeholder="Abdou Diallo"
                    readOnly={clientTrouve}
                    className={`
                      w-full px-3 py-2.5 rounded-lg border-2
                      ${clientTrouve
                        ? 'border-green-300 bg-green-50 text-green-900'
                        : 'border-gray-300 bg-white'
                      }
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all text-base
                      placeholder:text-gray-400
                      ${clientTrouve ? 'cursor-not-allowed' : ''}
                    `}
                  />
                  {clientTrouve && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Statistiques Client (2x2 Grid) */}
              {clientTrouve && clientStats && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {/* Montant Restant */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-2.5 rounded-lg border border-red-200/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      <p className="text-xs font-medium text-red-700">Impayé</p>
                    </div>
                    <p className="text-sm font-bold text-red-900">
                      {clientStats.montant_restant.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>

                  {/* Nombre de Ventes */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-2.5 rounded-lg border border-blue-200/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-700">Ventes</p>
                    </div>
                    <p className="text-sm font-bold text-blue-900">
                      {clientStats.nombre_total_ventes}
                    </p>
                  </div>

                  {/* Total Achats */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-2.5 rounded-lg border border-green-200/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Banknote className="w-3.5 h-3.5 text-green-600" />
                      <p className="text-xs font-medium text-green-700">Achats</p>
                    </div>
                    <p className="text-sm font-bold text-green-900">
                      {clientStats.montant_total_achats.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>

                  {/* Factures Impayées */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-2.5 rounded-lg border border-orange-200/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                      <p className="text-xs font-medium text-orange-700">Impayées</p>
                    </div>
                    <p className="text-sm font-bold text-orange-900">
                      {clientStats.nombre_factures_impayees} {clientStats.nombre_factures_impayees > 1 ? 'factures' : 'facture'}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer - Boutons */}
            <div className="p-4 border-t border-gray-200/50 flex gap-2">
              <button
                onClick={handleCancel}
                className="
                  flex-1 py-2.5 px-3 rounded-lg
                  bg-gray-100 hover:bg-gray-200
                  text-gray-700 font-semibold text-sm
                  transition-colors
                "
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={telephone.replace(/\D/g, '').length !== 9 || !nomClient.trim()}
                className="
                  flex-1 py-2.5 px-3 rounded-lg
                  bg-gradient-to-r from-blue-600 to-blue-700
                  hover:from-blue-700 hover:to-blue-800
                  text-white font-semibold text-sm
                  shadow-lg hover:shadow-xl
                  transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-1.5
                "
              >
                <CheckCircle className="w-4 h-4" />
                Confirmer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
