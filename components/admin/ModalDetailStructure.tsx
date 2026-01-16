/**
 * Modal de détail d'une structure
 * Affiche les informations complètes d'une structure en 3 onglets:
 * - Onglet 1: Infos générales (logo, nom, adresse, numéros, utilisateurs)
 * - Onglet 2: Abonnement actuel
 * - Onglet 3: Statistiques (données fictives pour le moment)
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Building2,
  CreditCard,
  BarChart3,
  Phone,
  MapPin,
  Mail,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import adminService from '@/services/admin.service';
import {
  StructureDetailData,
  StructureUtilisateur,
  StructureAbonnementHistorique,
  StatutAbonnement,
  TypeAbonnement
} from '@/types/admin.types';

type TabType = 'infos' | 'abonnement' | 'stats';

interface ModalDetailStructureProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number | null;
}

export function ModalDetailStructure({
  isOpen,
  onClose,
  idStructure
}: ModalDetailStructureProps) {
  const [activeTab, setActiveTab] = useState<TabType>('infos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structure, setStructure] = useState<StructureDetailData | null>(null);

  // Charger les données de la structure
  useEffect(() => {
    if (isOpen && idStructure) {
      loadStructureDetails();
    }
  }, [isOpen, idStructure]);

  const loadStructureDetails = async () => {
    if (!idStructure) return;

    setLoading(true);
    setError(null);

    try {
      const response = await adminService.getUneStructure(idStructure);
      if (response.success && response.data) {
        setStructure(response.data);
      } else {
        setError('Impossible de charger les détails de la structure');
      }
    } catch (err) {
      console.error('Erreur chargement structure:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Fermer et réinitialiser
  const handleClose = () => {
    setActiveTab('infos');
    setStructure(null);
    setError(null);
    onClose();
  };

  // Formater les numéros
  const formatNumeros = (om: string, wave: string) => {
    const nums = [om, wave].filter(n => n && n.trim() !== '');
    return nums.length > 0 ? nums.join(' / ') : '-';
  };

  // Badge statut abonnement
  const StatutBadge = ({ statut }: { statut: StatutAbonnement }) => {
    const config = {
      ACTIF: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
      EXPIRE: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
      EN_ATTENTE: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
      ANNULE: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
      SANS_ABONNEMENT: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' }
    };
    const style = config[statut] || config.SANS_ABONNEMENT;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text} border ${style.border}`}>
        {statut.replace('_', ' ')}
      </span>
    );
  };

  // Extraire les utilisateurs
  const getUtilisateurs = (): StructureUtilisateur[] => {
    if (!structure?.utilisateurs?.coalesce) return [];
    return structure.utilisateurs.coalesce.slice(0, 8);
  };

  // Données fictives pour les statistiques
  const statsData = {
    produits: 45,
    clients: 128,
    facturesTotal: 342,
    facturesMois: 28
  };

  // Données fictives pour l'histogramme des ventes mensuelles
  const ventesData = [
    { mois: 'Jan', value: 23 },
    { mois: 'Fév', value: 31 },
    { mois: 'Mar', value: 28 },
    { mois: 'Avr', value: 42 },
    { mois: 'Mai', value: 35 },
    { mois: 'Jun', value: 48 },
    { mois: 'Jul', value: 38 },
    { mois: 'Aoû', value: 25 },
    { mois: 'Sep', value: 52 },
    { mois: 'Oct', value: 45 },
    { mois: 'Nov', value: 58 },
    { mois: 'Déc', value: 67 }
  ];

  const formatMontant = (montant: number) => {
    return montant.toLocaleString('fr-FR') + ' F';
  };

  const tabs = [
    { id: 'infos' as TabType, label: 'Infos', icon: Building2 },
    { id: 'abonnement' as TabType, label: 'Abonnement', icon: CreditCard },
    { id: 'stats' as TabType, label: 'Statistiques', icon: BarChart3 }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl border border-gray-700/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <h2 className="text-lg font-semibold text-white">
              Détails Structure
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Contenu */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
                <p className="text-gray-400">Chargement...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-red-400">{error}</p>
                <button
                  onClick={loadStructureDetails}
                  className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            ) : structure ? (
              <>
                {/* Onglet Infos Générales */}
                {activeTab === 'infos' && (
                  <div className="space-y-5">
                    {/* Logo et Nom */}
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 rounded-xl overflow-hidden bg-gray-700/50 border-2 border-emerald-500/30">
                        {structure.logo ? (
                          <img
                            src={structure.logo}
                            alt={structure.nom_structure}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src="/images/mascotte.png"
                            alt={structure.nom_structure}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {structure.nom_structure}
                      </h3>
                      <span className="inline-block mt-1 px-3 py-1 bg-gray-700/50 rounded-full text-xs text-gray-300">
                        {structure.type_structure}
                      </span>
                    </div>

                    {/* Infos de contact */}
                    <div className="space-y-3 bg-gray-700/30 rounded-xl p-4">
                      {/* Adresse */}
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Adresse</p>
                          <p className="text-white">{structure.adresse || '-'}</p>
                        </div>
                      </div>

                      {/* Numéros OM / WAVE */}
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">Numéros (OM / WAVE)</p>
                          <p className="text-white font-mono">
                            {formatNumeros(structure.mobile_om, structure.mobile_wave)}
                          </p>
                        </div>
                      </div>

                      {/* Email */}
                      {structure.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Email</p>
                            <p className="text-white">{structure.email}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Liste des utilisateurs */}
                    <div className="bg-gray-700/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-medium text-white">
                          Utilisateurs ({getUtilisateurs().length})
                        </h4>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                        {getUtilisateurs().length > 0 ? (
                          getUtilisateurs().map((user, index) => (
                            <div
                              key={user.id_utilisateur || index}
                              className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg"
                            >
                              <div>
                                <p className="text-sm text-white">{user.nom_utilisateur}</p>
                                <p className="text-xs text-gray-400">{user.login}</p>
                              </div>
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                                {user.nom_du_profil}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-400 text-sm text-center py-4">
                            Aucun utilisateur
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Onglet Abonnement */}
                {activeTab === 'abonnement' && (
                  <div className="space-y-4">
                    {structure.etat_abonnement ? (
                      <>
                        {/* Statut actuel */}
                        <div className="text-center py-3">
                          <StatutBadge statut={structure.etat_abonnement.statut} />
                          <p className="text-gray-400 text-sm mt-2">
                            {structure.etat_abonnement.type_abonnement} - {structure.etat_abonnement.jours_restants}j restants
                          </p>
                        </div>

                        {/* Détails abonnement actuel (compact) */}
                        <div className="bg-gray-700/30 rounded-xl p-3 flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-gray-400">Période: </span>
                            <span className="text-white">
                              {new Date(structure.etat_abonnement.date_debut).toLocaleDateString('fr-FR')} - {new Date(structure.etat_abonnement.date_fin).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
                            {structure.etat_abonnement.methode}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Aucun abonnement actif</p>
                        <StatutBadge statut="SANS_ABONNEMENT" />
                      </div>
                    )}

                    {/* Historique des abonnements */}
                    <div className="bg-gray-700/30 rounded-xl p-3">
                      <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        Historique des abonnements
                      </h4>

                      {structure.abonnements?.coalesce && structure.abonnements.coalesce.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400 border-b border-gray-600/50">
                                <th className="py-2 text-left font-medium">Date</th>
                                <th className="py-2 text-left font-medium">Reçu</th>
                                <th className="py-2 text-left font-medium">Période</th>
                                <th className="py-2 text-center font-medium">Méthode</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-600/30">
                              {structure.abonnements.coalesce.map((abo, index) => (
                                <tr key={abo.id_abonnement || index} className="hover:bg-gray-600/20">
                                  <td className="py-2 text-gray-300">
                                    {new Date(abo.tms_create).toLocaleDateString('fr-FR')}
                                  </td>
                                  <td className="py-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-white font-mono text-xs">{abo.numrecu || '-'}</span>
                                      <span className={`w-2 h-2 rounded-full ${
                                        abo.status === 'ACTIF' ? 'bg-green-400' :
                                        abo.status === 'EXPIRE' ? 'bg-red-400' : 'bg-gray-400'
                                      }`} title={abo.status}></span>
                                    </div>
                                  </td>
                                  <td className="py-2 text-gray-300">
                                    {new Date(abo.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - {new Date(abo.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                  </td>
                                  <td className="py-2 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                      abo.methode === 'OM' ? 'bg-orange-500/20 text-orange-400' :
                                      abo.methode === 'WAVE' ? 'bg-blue-500/20 text-blue-400' :
                                      abo.methode === 'FREE' ? 'bg-green-500/20 text-green-400' :
                                      'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {abo.methode}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">
                          Aucun historique disponible
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Onglet Statistiques (données fictives) */}
                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    <p className="text-xs text-yellow-400/80 text-center bg-yellow-500/10 rounded-lg p-2">
                      Données fictives (en attente d'intégration API)
                    </p>

                    {/* Stats en grille */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                        <p className="text-blue-400 text-xs mb-1">Produits</p>
                        <p className="text-2xl font-bold text-white">{statsData.produits}</p>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-purple-400 text-xs mb-1">Clients</p>
                        <p className="text-2xl font-bold text-white">{statsData.clients}</p>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <p className="text-emerald-400 text-xs mb-1">Factures (total)</p>
                        <p className="text-2xl font-bold text-white">{statsData.facturesTotal}</p>
                      </div>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                        <p className="text-cyan-400 text-xs mb-1">Factures (mois)</p>
                        <p className="text-2xl font-bold text-white">{statsData.facturesMois}</p>
                      </div>
                    </div>

                    {/* Histogramme des ventes mensuelles */}
                    <div className="bg-gray-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-400" />
                        Ventes mensuelles (2024)
                      </h4>

                      <div className="flex items-end justify-between gap-1 h-32">
                        {ventesData.map((vente, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex justify-center">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(vente.value / Math.max(...ventesData.map(v => v.value))) * 100}%` }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                className={`w-full max-w-[20px] rounded-t ${
                                  vente.value === Math.max(...ventesData.map(v => v.value))
                                    ? 'bg-emerald-500'
                                    : 'bg-emerald-500/60'
                                }`}
                                style={{ minHeight: '4px' }}
                                title={`${vente.mois}: ${vente.value} ventes`}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500">{vente.mois}</span>
                          </div>
                        ))}
                      </div>

                      {/* Légende */}
                      <div className="mt-3 pt-3 border-t border-gray-600/50 flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          Total: <span className="text-white font-medium">{ventesData.reduce((sum, v) => sum + v.value, 0)} ventes</span>
                        </span>
                        <span className="text-gray-400">
                          Max: <span className="text-emerald-400 font-medium">{Math.max(...ventesData.map(v => v.value))}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                Aucune structure sélectionnée
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700/50">
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
