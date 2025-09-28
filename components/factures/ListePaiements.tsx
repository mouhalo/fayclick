/**
 * Composant pour afficher la liste des paiements (reçus)
 * Design glassmorphism cohérent avec le reste de l'application
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Download,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Smartphone,
  DollarSign
} from 'lucide-react';
import { recuService } from '@/services/recu.service';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterHeaderPaiementsGlass } from './FilterHeaderPaiementsGlass';
import { GlassPagination } from '@/components/ui/GlassPagination';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Paiement {
  id_recu?: number;
  numero_recu: string;
  id_facture: number;
  num_facture: string;
  nom_client: string;
  tel_client: string;
  montant_paye: number;
  methode_paiement: string;
  reference_transaction: string;
  date_paiement: string;
  statut?: 'success' | 'pending' | 'failed';
}

interface FiltresPaiements {
  searchTerm?: string;
  periode?: { debut: string; fin: string };
  nom_client?: string;
  tel_client?: string;
  methode_paiement?: string;
  sortBy?: 'date' | 'montant' | 'client' | 'methode';
  sortOrder?: 'asc' | 'desc';
}

interface ListePaiementsProps {
  onViewRecu?: (paiement: Paiement) => void;
  onDownloadRecu?: (paiement: Paiement) => void;
}

export function ListePaiements({
  onViewRecu,
  onDownloadRecu
}: ListePaiementsProps) {
  const { user } = useAuth();

  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filtres, setFiltres] = useState<FiltresPaiements>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // États de pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Statistiques des paiements
  const stats = {
    total: paiements.length,
    montantTotal: paiements.reduce((sum, p) => sum + p.montant_paye, 0),
    methodesUtilisees: [...new Set(paiements.map(p => p.methode_paiement))].length
  };

  // Charger les paiements
  useEffect(() => {
    loadPaiements();
  }, [user]);

  const loadPaiements = async () => {
    if (!user?.id_structure) return;

    try {
      setLoading(true);
      setError('');

      // Récupérer l'historique des reçus
      const historique = await recuService.getHistoriqueRecus({
        id_structure: user.id_structure,
        limite: 100
      });

      // Transformer les données pour l'affichage
      const paiementsFormats = historique.map((recu: any) => ({
        id_recu: recu.id_recu,
        numero_recu: recu.numero_recu,
        id_facture: recu.id_facture,
        num_facture: recu.num_facture,
        nom_client: recu.nom_client,
        tel_client: recu.tel_client,
        montant_paye: recu.montant_paye,
        methode_paiement: recu.methode_paiement,
        reference_transaction: recu.reference_transaction,
        date_paiement: recu.date_paiement,
        statut: 'success' as const
      }));

      setPaiements(paiementsFormats);
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
      setError('Impossible de charger les paiements');
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaire de refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPaiements();
    setIsRefreshing(false);
  };

  // Filtrer et trier les paiements
  const paiementsFiltres = paiements
    .filter(paiement => {
      // Recherche textuelle
      const matchSearch = !filtres.searchTerm ||
        paiement.numero_recu.toLowerCase().includes(filtres.searchTerm.toLowerCase()) ||
        paiement.nom_client.toLowerCase().includes(filtres.searchTerm.toLowerCase()) ||
        paiement.num_facture.toLowerCase().includes(filtres.searchTerm.toLowerCase()) ||
        paiement.tel_client.includes(filtres.searchTerm);

      // Filtre par nom client
      const matchClient = !filtres.nom_client ||
        paiement.nom_client.toLowerCase().includes(filtres.nom_client.toLowerCase());

      // Filtre par téléphone
      const matchTel = !filtres.tel_client ||
        paiement.tel_client.includes(filtres.tel_client);

      // Filtre par méthode
      const matchMethod = !filtres.methode_paiement ||
        paiement.methode_paiement === filtres.methode_paiement;

      // Filtre par date
      const matchDate = (!filtres.periode?.debut || new Date(paiement.date_paiement) >= new Date(filtres.periode.debut)) &&
        (!filtres.periode?.fin || new Date(paiement.date_paiement) <= new Date(filtres.periode.fin));

      return matchSearch && matchClient && matchTel && matchMethod && matchDate;
    })
    .sort((a, b) => {
      const { sortBy = 'date', sortOrder = 'desc' } = filtres;

      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date_paiement).getTime() - new Date(b.date_paiement).getTime();
          break;
        case 'montant':
          comparison = a.montant_paye - b.montant_paye;
          break;
        case 'client':
          comparison = a.nom_client.localeCompare(b.nom_client);
          break;
        case 'methode':
          comparison = a.methode_paiement.localeCompare(b.methode_paiement);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Pagination
  const totalPages = Math.ceil(paiementsFiltres.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paiementsPage = paiementsFiltres.slice(startIndex, startIndex + itemsPerPage);

  // Fonctions de pagination
  const goToPage = (page: number) => setCurrentPage(page);


  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [filtres]);

  // Méthodes de paiement avec icônes et couleurs
  const getMethodeInfo = (methode: string) => {
    const methodes: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
      'orange-money': {
        label: 'Orange Money',
        icon: <Smartphone className="w-4 h-4" />,
        color: 'from-orange-500 to-orange-600'
      },
      'wave': {
        label: 'Wave',
        icon: <Smartphone className="w-4 h-4" />,
        color: 'from-blue-500 to-blue-600'
      },
      'free-money': {
        label: 'Free Money',
        icon: <Smartphone className="w-4 h-4" />,
        color: 'from-green-500 to-green-600'
      },
      'CASH': {
        label: 'Espèces',
        icon: <DollarSign className="w-4 h-4" />,
        color: 'from-gray-500 to-gray-600'
      }
    };
    return methodes[methode] || methodes['CASH'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="text-gray-500">Chargement des paiements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Statistiques - Design harmonisé avec l'onglet Factures */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0, duration: 0.5, type: 'spring', stiffness: 100 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="bg-green-800/90 backdrop-blur-sm rounded-2xl p-3 border border-green-700/50 hover:scale-[1.02] transition-transform duration-200">
            <div className="space-y-2">
              {/* Icône en haut */}
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>

              {/* Contenu textuel */}
              <div className="space-y-1">
                {/* Titre */}
                <p className="text-white text-[10px] font-medium leading-tight">
                  Total Paiements
                </p>

                {/* Valeur principale */}
                <p className="text-white text-sm font-bold leading-tight break-words">
                  {stats.total}
                </p>

                {/* Sous-titre */}
                <p className="text-white/70 text-[9px] leading-tight">
                  reçus générés
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 100 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="bg-green-800/90 backdrop-blur-sm rounded-2xl p-3 border border-green-700/50 hover:scale-[1.02] transition-transform duration-200">
            <div className="space-y-2">
              {/* Icône en haut */}
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>

              {/* Contenu textuel */}
              <div className="space-y-1">
                {/* Titre */}
                <p className="text-white text-[10px] font-medium leading-tight">
                  Montant Total
                </p>

                {/* Valeur principale */}
                <p className="text-white text-sm font-bold leading-tight break-words">
                  {stats.montantTotal.toLocaleString('fr-FR')} FCFA
                </p>

                {/* Sous-titre */}
                <p className="text-white/70 text-[9px] leading-tight">
                  encaissés
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtres */}
      <div className="mb-6">
        <FilterHeaderPaiementsGlass
          onFiltersChange={setFiltres}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* Pagination - Exactement comme l'onglet Factures */}
      {totalPages > 1 && (
        <div className="mb-6">
          <GlassPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={paiementsFiltres.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {/* Liste des paiements */}
      {paiementsFiltres.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-12 h-12" />}
          title="Aucun paiement trouvé"
          description="Aucun paiement ne correspond à vos critères de recherche"
        />
      ) : (
        <div className="space-y-4 pb-20 w-full overflow-x-hidden">
          {paiementsPage.map((paiement, index) => {
            const methodeInfo = getMethodeInfo(paiement.methode_paiement);

            return (
              <motion.div
                key={paiement.numero_recu}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="w-full"
              >
                <div className="
                  bg-green-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4
                  border border-green-700/50 hover:bg-green-800
                  transition-all duration-200
                  group relative overflow-hidden
                ">
                  {/* En-tête avec numéro de reçu et badge méthode - EXACTEMENT comme FactureCard */}
                  <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="text-white font-semibold text-sm sm:text-base lg:text-lg truncate">
                        {paiement.numero_recu}
                      </h3>
                      <p className="text-white/80 text-xs sm:text-sm truncate">
                        📄 {paiement.num_facture}
                      </p>
                    </div>

                    <div className="px-2 sm:px-3 py-1 rounded-full text-xs font-medium text-white bg-blue-500 flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
                      {methodeInfo.icon}
                      <span className="hidden sm:inline">{methodeInfo.label}</span>
                    </div>
                  </div>

                  {/* Informations client - EXACTEMENT comme FactureCard */}
                  <div className="mb-3 sm:mb-4 space-y-1 sm:space-y-2 text-white/80 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 sm:w-4 sm:h-4">👤</span>
                      <span className="font-medium truncate">{paiement.nom_client}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 sm:w-4 sm:h-4">📅</span>
                      <span className="truncate">
                        {format(new Date(paiement.date_paiement), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>

                  {/* Montant principal - EXACTEMENT comme FactureCard */}
                  <div className="text-center mb-3 sm:mb-4 overflow-hidden">
                    <p className="text-white text-base sm:text-lg lg:text-xl font-bold break-words">
                      {paiement.montant_paye.toLocaleString('fr-FR')} <span className="text-sm">FCFA</span>
                    </p>
                    <p className="text-emerald-300 text-xs sm:text-sm font-medium">
                      Via {methodeInfo.label}
                    </p>
                  </div>

                  {/* Actions - EXACTEMENT comme FactureCard */}
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => onViewRecu?.(paiement)}
                      className="flex-1 py-1.5 sm:py-2 bg-white/20 rounded-md sm:rounded-lg text-white text-xs sm:text-sm hover:bg-white/30 transition-colors flex items-center justify-center gap-1"
                      title="Voir le reçu"
                    >
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Voir</span>
                    </button>
                    <button
                      onClick={() => onDownloadRecu?.(paiement)}
                      className="flex-1 py-1.5 sm:py-2 bg-emerald-500/20 rounded-md sm:rounded-lg text-emerald-200 text-xs sm:text-sm hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                      title="Télécharger"
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">PDF</span>
                    </button>
                  </div>

                  {/* Effet de brillance sur hover */}
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}