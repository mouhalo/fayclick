/**
 * Modal de Recherche de Client pour le Panier
 * Recherche intelligente par telephone avec auto-completion
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, User, Search, CheckCircle, UserPlus, Loader2 } from 'lucide-react';
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

      console.log('[MODAL] Recherche client pour:', phone);

      const result = await clientsService.searchClientByPhone(phone);

      if (result.found && result.client) {
        console.log('[MODAL] Client trouve:', result.client);

        setClientTrouve(true);
        setClientData(result.client);
        setNomClient(result.client.nom_client);
        setSearchMessage('Client trouve dans la base');
      } else {
        console.log('[MODAL] Client non trouve, nouveau client');

        setClientTrouve(false);
        setClientData(null);
        setSearchMessage('Nouveau client - Saisissez le nom');
        // Ne pas effacer le nom si deja rempli
        if (!nomClient) {
          setNomClient('');
        }
      }
    } catch (error) {
      console.error('[MODAL] Erreur recherche:', error);
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
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-blue-100/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Rechercher un client</h2>
                  <p className="text-sm text-gray-600">Par numero de telephone</p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Input Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  Telephone du client
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formatPhoneDisplay(telephone)}
                    onChange={handlePhoneChange}
                    placeholder="77 123 45 67"
                    autoFocus
                    className="
                      w-full px-4 py-3 rounded-xl border-2 border-gray-300
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all text-lg font-medium
                      placeholder:text-gray-400
                    "
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {telephone.replace(/\D/g, '').length}/9 chiffres
                </p>
              </div>

              {/* Message de recherche */}
              {searchMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    p-3 rounded-xl flex items-center gap-2 text-sm font-medium
                    ${clientTrouve
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }
                  `}
                >
                  {clientTrouve ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {searchMessage}
                </motion.div>
              )}

              {/* Input Nom Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Nom du client
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nomClient}
                    onChange={(e) => setNomClient(e.target.value)}
                    placeholder="Abdou Diallo"
                    readOnly={clientTrouve}
                    className={`
                      w-full px-4 py-3 rounded-xl border-2
                      ${clientTrouve
                        ? 'border-green-300 bg-green-50 text-green-900'
                        : 'border-gray-300 bg-white'
                      }
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition-all
                      placeholder:text-gray-400
                      ${clientTrouve ? 'cursor-not-allowed' : ''}
                    `}
                  />
                  {clientTrouve && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                </div>
                {clientTrouve && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Client existant - Nom verrouille
                  </p>
                )}
              </div>
            </div>

            {/* Footer - Boutons */}
            <div className="p-6 border-t border-gray-200/50 flex gap-3">
              <button
                onClick={handleCancel}
                className="
                  flex-1 py-3 px-4 rounded-xl
                  bg-gray-100 hover:bg-gray-200
                  text-gray-700 font-semibold
                  transition-colors
                "
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={telephone.replace(/\D/g, '').length !== 9 || !nomClient.trim()}
                className="
                  flex-1 py-3 px-4 rounded-xl
                  bg-gradient-to-r from-blue-600 to-blue-700
                  hover:from-blue-700 hover:to-blue-800
                  text-white font-semibold
                  shadow-lg hover:shadow-xl
                  transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                <CheckCircle className="w-5 h-5" />
                Confirmer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
