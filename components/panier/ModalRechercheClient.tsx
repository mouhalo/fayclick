/**
 * Modal de Recherche de Client pour le Panier
 * Champ de recherche unifié : détection auto nom/téléphone
 * Si client non trouvé → formulaire d'ajout nouveau client
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, User, Search, CheckCircle, UserPlus, Loader2, ShoppingCart, AlertCircle, Banknote, ArrowLeft } from 'lucide-react';
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
  // Mode: 'search' = champ recherche unifié, 'create' = formulaire nouveau client
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Champs du formulaire nouveau client
  const [newNom, setNewNom] = useState('');
  const [newTel, setNewTel] = useState('');
  const [formError, setFormError] = useState('');

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Détecter si la saisie est un numéro de téléphone (que des chiffres)
  const isPhoneInput = useCallback((value: string) => {
    const cleaned = value.replace(/\s/g, '');
    return /^\d+$/.test(cleaned) && cleaned.length > 0;
  }, []);

  // Recherche automatique avec debounce
  useEffect(() => {
    if (mode !== 'search' || !searchQuery.trim()) {
      if (!searchQuery.trim()) {
        setClientTrouve(false);
        setSearchMessage('');
        setClientData(null);
        setClientStats(null);
      }
      return;
    }

    // Annuler le timer précédent
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const query = searchQuery.trim();
    const isPhone = isPhoneInput(query);
    const cleanedDigits = query.replace(/\D/g, '');

    // Conditions de déclenchement
    if (isPhone && cleanedDigits.length < 9) return;
    if (!isPhone && query.length < 3) return;

    searchTimerRef.current = setTimeout(() => {
      handleSearch(isPhone ? cleanedDigits : query);
    }, 400);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, mode]);

  const handleSearch = async (query: string) => {
    try {
      setIsSearching(true);
      setSearchMessage('');

      console.log('[MODAL] Recherche client:', query);
      const response = await clientsService.checkOneClient(query);

      if (response.success && response.client) {
        console.log('[MODAL] Client trouvé:', response.client.nom_client);

        setClientTrouve(true);
        setClientData({
          id_client: 0,
          nom_client: response.client.nom_client,
          tel_client: response.client.tel_client,
          adresse: response.client.adresse,
          date_creation: response.client.date_creation,
          date_modification: response.client.date_modification
        });

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
        console.log('[MODAL] Client non trouvé → mode création');

        setClientTrouve(false);
        setClientData(null);
        setClientStats(null);

        // Basculer en mode création avec pré-remplissage
        const isPhone = isPhoneInput(query);
        if (isPhone) {
          setNewTel(query.replace(/\D/g, ''));
          setNewNom('');
        } else {
          setNewNom(query);
          setNewTel('');
        }
        setMode('create');
      }
    } catch (error) {
      console.error('[MODAL] Erreur recherche:', error);
      setSearchMessage('Erreur lors de la recherche');
      setClientTrouve(false);
      setClientData(null);
      setClientStats(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (!clientData) return;

    const clientToSelect: Partial<Client> & { id_client?: number; nom_client: string; tel_client: string } = {
      id_client: clientData.id_client,
      nom_client: clientData.nom_client,
      tel_client: clientData.tel_client,
      adresse: clientData.adresse || ''
    };

    console.log('[MODAL] Sélection client:', clientToSelect);
    onSelectClient(clientToSelect);
    onClose();
  };

  const handleAddNewClient = () => {
    const cleanedPhone = newTel.replace(/\D/g, '');
    setFormError('');

    if (!newNom.trim()) {
      setFormError('Le nom du client est requis');
      return;
    }
    if (cleanedPhone.length !== 9) {
      setFormError('Le numéro doit contenir 9 chiffres');
      return;
    }

    const clientToSelect: Partial<Client> & { id_client?: number; nom_client: string; tel_client: string } = {
      nom_client: newNom.trim(),
      tel_client: cleanedPhone,
      adresse: ''
    };

    console.log('[MODAL] Ajout nouveau client:', clientToSelect);
    onSelectClient(clientToSelect);
    onClose();
  };

  const handleBackToSearch = () => {
    setMode('search');
    setSearchQuery('');
    setNewNom('');
    setNewTel('');
    setFormError('');
    setClientTrouve(false);
    setSearchMessage('');
    setClientData(null);
    setClientStats(null);
  };

  const handleCancel = () => {
    // Réinitialiser tout
    setMode('search');
    setSearchQuery('');
    setNewNom('');
    setNewTel('');
    setFormError('');
    setClientTrouve(false);
    setSearchMessage('');
    setClientData(null);
    setClientStats(null);
    onClose();
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Si c'est des chiffres, limiter à 9
    if (isPhoneInput(value)) {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 9) {
        setSearchQuery(value);
      }
    } else {
      setSearchQuery(value);
    }

    // Reset si le champ est vidé
    if (!value.trim()) {
      setClientTrouve(false);
      setSearchMessage('');
      setClientData(null);
      setClientStats(null);
    }
  };

  const handleNewTelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 9) {
      setNewTel(value);
    }
  };

  const formatPhoneDisplay = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
    if (cleaned.length <= 7) return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5)}`;
    return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 5)} ${cleaned.substring(5, 7)} ${cleaned.substring(7, 9)}`;
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
            <div className="p-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-blue-100/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mode === 'create' && (
                    <button
                      onClick={handleBackToSearch}
                      className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  )}
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    {mode === 'search' ? (
                      <Search className="w-4 h-4 text-white" />
                    ) : (
                      <UserPlus className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {mode === 'search' ? 'Rechercher un client' : 'Nouveau client'}
                  </h2>
                </div>
                <button
                  onClick={handleCancel}
                  className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'search' ? (
                  <motion.div
                    key="search-mode"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Champ de recherche unifié */}
                    {!clientTrouve && (
                      <div>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <Search className="w-4 h-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={handleSearchInputChange}
                            placeholder="Tapez un nom ou un n° de téléphone..."
                            autoFocus
                            className="
                              w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-300 bg-white
                              focus:ring-2 focus:ring-blue-500 focus:border-transparent
                              transition-all text-base
                              placeholder:text-gray-400
                            "
                          />
                          {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                            </div>
                          )}
                        </div>
                        {/* Indicateur du type détecté */}
                        {searchQuery.trim().length > 0 && (
                          <p className="text-[10px] text-gray-400 mt-1 ml-1">
                            {isPhoneInput(searchQuery)
                              ? `Recherche par téléphone (${searchQuery.replace(/\D/g, '').length}/9)`
                              : `Recherche par nom (${searchQuery.trim().length} car.)`
                            }
                          </p>
                        )}
                      </div>
                    )}

                    {/* Client trouvé - Affichage résultat */}
                    {clientTrouve && clientData && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        {/* Carte client trouvé */}
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-green-900 truncate">{clientData.nom_client}</p>
                              <p className="text-sm text-green-700">{formatPhoneDisplay(clientData.tel_client)}</p>
                            </div>
                          </div>
                          <p className="text-xs text-green-600 font-medium">Client trouvé dans la base</p>
                        </div>

                        {/* Statistiques Client (2x2 Grid) */}
                        {clientStats && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gradient-to-br from-red-50 to-red-100/50 p-2.5 rounded-lg border border-red-200/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                <p className="text-xs font-medium text-red-700">Impayé</p>
                              </div>
                              <p className="text-sm font-bold text-red-900">
                                {clientStats.montant_restant.toLocaleString('fr-FR')} F
                              </p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-2.5 rounded-lg border border-blue-200/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                                <p className="text-xs font-medium text-blue-700">Ventes</p>
                              </div>
                              <p className="text-sm font-bold text-blue-900">
                                {clientStats.nombre_total_ventes}
                              </p>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-2.5 rounded-lg border border-green-200/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Banknote className="w-3.5 h-3.5 text-green-600" />
                                <p className="text-xs font-medium text-green-700">Achats</p>
                              </div>
                              <p className="text-sm font-bold text-green-900">
                                {clientStats.montant_total_achats.toLocaleString('fr-FR')} F
                              </p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-2.5 rounded-lg border border-orange-200/50">
                              <div className="flex items-center gap-1.5 mb-1">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                                <p className="text-xs font-medium text-orange-700">Impayées</p>
                              </div>
                              <p className="text-sm font-bold text-orange-900">
                                {clientStats.nombre_factures_impayees} {clientStats.nombre_factures_impayees > 1 ? 'factures' : 'facture'}
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Message d'erreur recherche */}
                    {searchMessage && !clientTrouve && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-2 rounded-lg flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {searchMessage}
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  /* Mode Création - Formulaire nouveau client */
                  <motion.div
                    key="create-mode"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    {/* Nom du client */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        Nom du client
                      </label>
                      <input
                        type="text"
                        value={newNom}
                        onChange={(e) => setNewNom(e.target.value)}
                        placeholder="Saisir le nom du client"
                        autoFocus={!newNom}
                        className="
                          w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          transition-all text-base
                          placeholder:text-gray-400
                        "
                      />
                    </div>

                    {/* N° de Téléphone */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        N° de Tél. ({newTel.replace(/\D/g, '').length}/9)
                      </label>
                      <input
                        type="tel"
                        value={formatPhoneDisplay(newTel)}
                        onChange={handleNewTelChange}
                        placeholder="77 123 45 67"
                        autoFocus={!!newNom && !newTel}
                        className="
                          w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-white
                          focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          transition-all text-base font-medium
                          placeholder:text-gray-400
                        "
                      />
                    </div>

                    {/* Message d'erreur formulaire */}
                    {formError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-2 rounded-lg flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {formError}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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

              {mode === 'search' && clientTrouve ? (
                <button
                  onClick={handleConfirm}
                  className="
                    flex-1 py-2.5 px-3 rounded-lg
                    bg-gradient-to-r from-blue-600 to-blue-700
                    hover:from-blue-700 hover:to-blue-800
                    text-white font-semibold text-sm
                    shadow-lg hover:shadow-xl
                    transition-all
                    flex items-center justify-center gap-1.5
                  "
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmer
                </button>
              ) : mode === 'create' ? (
                <button
                  onClick={handleAddNewClient}
                  disabled={!newNom.trim() || newTel.replace(/\D/g, '').length !== 9}
                  className="
                    flex-1 py-2.5 px-3 rounded-lg
                    bg-gradient-to-r from-emerald-600 to-emerald-700
                    hover:from-emerald-700 hover:to-emerald-800
                    text-white font-semibold text-sm
                    shadow-lg hover:shadow-xl
                    transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center gap-1.5
                  "
                >
                  <UserPlus className="w-4 h-4" />
                  Ajouter
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
