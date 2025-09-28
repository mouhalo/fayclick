/**
 * Composant pour afficher la liste des paiements (reçus)
 * Design glassmorphism cohérent avec le reste de l'application
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Calendar,
  Download,
  Search,
  Filter,
  FileText,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Smartphone,
  DollarSign
} from 'lucide-react';
import { recuService } from '@/services/recu.service';
import { useAuth } from '@/contexts/AuthContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
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

interface ListePaiementsProps {
  onViewRecu?: (paiement: Paiement) => void;
  onDownloadRecu?: (paiement: Paiement) => void;
}

export function ListePaiements({
  onViewRecu,
  onDownloadRecu
}: ListePaiementsProps) {
  const { user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();

  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('tous');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

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

  // Filtrer les paiements
  const paiementsFiltres = paiements.filter(paiement => {
    // Recherche textuelle
    const matchSearch = searchTerm === '' ||
      paiement.numero_recu.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paiement.nom_client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paiement.num_facture.toLowerCase().includes(searchTerm.toLowerCase());

    // Filtre par méthode
    const matchMethod = filterMethod === 'tous' ||
      paiement.methode_paiement === filterMethod;

    // Filtre par date
    const matchDate = (!dateRange.start || new Date(paiement.date_paiement) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(paiement.date_paiement) <= new Date(dateRange.end));

    return matchSearch && matchMethod && matchDate;
  });

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
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Paiements</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Montant Total</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.montantTotal.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Méthodes</p>
              <p className="text-2xl font-bold text-gray-800">{stats.methodesUtilisees}</p>
            </div>
            <CreditCard className="w-8 h-8 text-purple-500" />
          </div>
        </GlassCard>
      </div>

      {/* Barre de recherche et filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un reçu, client ou facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-4 py-2 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="tous">Toutes les méthodes</option>
            <option value="orange-money">Orange Money</option>
            <option value="wave">Wave</option>
            <option value="free-money">Free Money</option>
            <option value="CASH">Espèces</option>
          </select>

          <button
            onClick={loadPaiements}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </GlassCard>

      {/* Liste des paiements */}
      {paiementsFiltres.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-12 h-12" />}
          title="Aucun paiement trouvé"
          description="Aucun paiement ne correspond à vos critères de recherche"
        />
      ) : (
        <div className="grid gap-4">
          {paiementsFiltres.map((paiement, index) => {
            const methodeInfo = getMethodeInfo(paiement.methode_paiement);

            return (
              <motion.div
                key={paiement.numero_recu}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-4 hover:shadow-xl transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Informations principales */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${methodeInfo.color} text-white`}>
                          {methodeInfo.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {paiement.numero_recu}
                          </p>
                          <p className="text-sm text-gray-500">
                            Facture {paiement.num_facture}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {format(new Date(paiement.date_paiement), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{paiement.nom_client}</span>
                        </div>
                      </div>
                    </div>

                    {/* Montant et actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">
                          {paiement.montant_paye.toLocaleString('fr-FR')} FCFA
                        </p>
                        <p className="text-xs text-gray-500">{methodeInfo.label}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => onViewRecu?.(paiement)}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors"
                          title="Voir le reçu"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDownloadRecu?.(paiement)}
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}