'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import inventaireService from '@/services/inventaire.service';
import type { InventaireData, PeriodeType } from '@/types/inventaire.types';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';

// Composants
import InventaireHeader from '@/components/inventaire/InventaireHeader';
import ResumeStatCard from '@/components/inventaire/ResumeStatCard';
import EvolutionChart from '@/components/inventaire/EvolutionChart';
import TopArticlesCard from '@/components/inventaire/TopArticlesCard';
import TopClientsCard from '@/components/inventaire/TopClientsCard';

/**
 * Page principale des Statistiques Inventaires
 * Module d'analyse des performances de ventes
 */
export default function InventairePage() {
  const router = useRouter();
  const { user } = useAuth();

  // États
  const [data, setData] = useState<InventaireData | null>(null);
  const [periode, setPeriode] = useState<PeriodeType>('semaine');
  const [annee] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chargement des statistiques
  useEffect(() => {
    if (user?.id_structure) {
      chargerStatistiques();
    }
  }, [periode, user]);

  const chargerStatistiques = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id_structure) {
        throw new Error('Structure non identifiée');
      }

      console.log('🔄 [InventairePage] Chargement statistiques:', {
        id_structure: user.id_structure,
        annee,
        periode
      });

      const result = await inventaireService.getStatistiques(
        user.id_structure,
        annee,
        periode
      );

      console.log('✅ [InventairePage] Données reçues:', result);
      setData(result);
    } catch (err) {
      console.error('❌ [InventairePage] Erreur chargement statistiques:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  // Export des données (à implémenter)
  const handleExport = () => {
    console.log('📥 Export des données inventaire');
    // TODO: Implémenter export PDF/Excel
    alert('Fonctionnalité d\'export en cours de développement');
  };

  // Retour au dashboard
  const handleBack = () => {
    router.push('/dashboard/commerce');
  };

  // Écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <InventaireHeader onExport={handleExport} onBack={handleBack} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des statistiques...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Écran d'erreur
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <InventaireHeader onExport={handleExport} onBack={handleBack} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-2">Erreur de chargement</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button
              onClick={chargerStatistiques}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Obtenir le label de variation selon la période
  const variationLabel = inventaireService.getVariationContext(periode);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <InventaireHeader onExport={handleExport} onBack={handleBack} />

      <div className="max-w-7xl mx-auto px-4 pt-4 pb-12">
        {/* Onglets de Période */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => setPeriode('semaine')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
              periode === 'semaine'
                ? 'bg-white text-emerald-600 shadow-md'
                : 'bg-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setPeriode('mois')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
              periode === 'mois'
                ? 'bg-white text-emerald-600 shadow-md'
                : 'bg-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => setPeriode('annee')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
              periode === 'annee'
                ? 'bg-white text-emerald-600 shadow-md'
                : 'bg-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Année
          </button>
        </div>

        {/* Résumé des Ventes - Card unique avec grille 2x2 */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border-l-4 border-emerald-500 mb-8">
          {/* Titre de la section */}
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>🔥</span>
            <span>Résumé des ventes</span>
          </h2>

          {/* Grille 2x2 des statistiques */}
          <div className="grid grid-cols-2 gap-6">
            {/* CA Total */}
            <div>
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {data.resume_ventes.ca_total.toLocaleString('fr-FR')}
              </div>
              <div className="text-sm text-gray-600 font-medium mb-2">
                CA Total (FCFA)
              </div>
              <div className={`text-sm font-semibold ${data.resume_ventes.ca_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.ca_variation >= 0 ? '+' : ''}{data.resume_ventes.ca_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>

            {/* Ventes Total */}
            <div>
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {data.resume_ventes.ventes_total.toLocaleString('fr-FR')}
              </div>
              <div className="text-sm text-gray-600 font-medium mb-2">
                Ventes Total
              </div>
              <div className={`text-sm font-semibold ${data.resume_ventes.ventes_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.ventes_variation >= 0 ? '+' : ''}{data.resume_ventes.ventes_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>

            {/* Panier Moyen */}
            <div>
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {data.resume_ventes.panier_moyen.toLocaleString('fr-FR')}
              </div>
              <div className="text-sm text-gray-600 font-medium mb-2">
                Panier Moyen (FCFA)
              </div>
              <div className={`text-sm font-semibold ${data.resume_ventes.panier_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.panier_variation >= 0 ? '+' : ''}{data.resume_ventes.panier_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>

            {/* Clients Actifs */}
            <div>
              <div className="text-3xl font-bold text-emerald-600 mb-1">
                {data.resume_ventes.clients_actifs.toLocaleString('fr-FR')}
              </div>
              <div className="text-sm text-gray-600 font-medium mb-2">
                Clients Actifs
              </div>
              <div className={`text-sm font-semibold ${data.resume_ventes.clients_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.clients_variation >= 0 ? '+' : ''}{data.resume_ventes.clients_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Graphique d'Évolution */}
        <div className="mb-8">
          <EvolutionChart
            data={data.evolution_ventes}
            titre={`Évolution des Ventes - ${inventaireService.getPeriodeLabel(periode)}`}
          />
        </div>

        {/* Top Articles et Top Clients - Grille 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TopArticlesCard articles={data.top_articles} />
          <TopClientsCard clients={data.top_clients} />
        </div>

        {/* Footer avec infos de génération */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Statistiques générées le {new Date(data.timestamp_generation).toLocaleString('fr-FR')}
          </p>
          <p className="mt-1">
            Période du {new Date(data.date_debut).toLocaleDateString('fr-FR')} au {new Date(data.date_fin).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>
    </div>
  );
}
