'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import inventaireService from '@/services/inventaire.service';
import type { InventaireData, PeriodeType } from '@/types/inventaire.types';

// Composants
import InventaireHeader from '@/components/inventaire/InventaireHeader';
import ModalSelectionPeriode from '@/components/inventaire/ModalSelectionPeriode';
import EvolutionChart from '@/components/inventaire/EvolutionChart';
import TopArticlesCard from '@/components/inventaire/TopArticlesCard';
import TopClientsCard from '@/components/inventaire/TopClientsCard';

/**
 * Calcule le numéro de semaine pour une date
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Page principale des Statistiques Inventaires
 * Module d'analyse des performances de ventes
 *
 * Logique des paramètres selon l'onglet sélectionné:
 * - Onglet Année:   get_inventaire_periodique(id, annee, 0, 0, 0)
 * - Onglet Mois:    get_inventaire_periodique(id, annee, mois, 0, 0)
 * - Onglet Semaine: get_inventaire_periodique(id, annee, 0, semaine, 0)
 */
export default function InventairePage() {
  const router = useRouter();
  const { user } = useAuth();
  const currentDate = new Date();

  // États pour la période (valeurs définies par l'utilisateur dans le modal)
  const [data, setData] = useState<InventaireData | null>(null);
  const [periode, setPeriode] = useState<PeriodeType>('semaine');
  const [annee, setAnnee] = useState(currentDate.getFullYear());
  const [mois, setMois] = useState(currentDate.getMonth() + 1);
  const [semaine, setSemaine] = useState(getWeekNumber(currentDate));
  const [jour, setJour] = useState(currentDate.getDate());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État pour le modal de sélection de période
  const [showModalPeriode, setShowModalPeriode] = useState(false);

  /**
   * Calcule les paramètres à envoyer selon l'onglet sélectionné
   * - Onglet Année:   (annee, 0, 0, 0)
   * - Onglet Mois:    (annee, mois, 0, 0)
   * - Onglet Semaine: (annee, 0, semaine, 0)
   */
  const getParametresSelonOnglet = useCallback((onglet: PeriodeType) => {
    switch (onglet) {
      case 'annee':
        return { mois: 0, semaine: 0, jour: 0 };
      case 'mois':
        return { mois, semaine: 0, jour: 0 };
      case 'semaine':
        return { mois: 0, semaine, jour: 0 };
      default:
        return { mois, semaine, jour };
    }
  }, [mois, semaine, jour]);

  // Chargement des statistiques
  useEffect(() => {
    if (user?.id_structure) {
      chargerStatistiques(periode);
    }
  }, [periode, annee, mois, semaine, jour, user]);

  const chargerStatistiques = async (ongletActif: PeriodeType) => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id_structure) {
        throw new Error('Structure non identifiée');
      }

      // Obtenir les paramètres selon l'onglet actif
      const params = getParametresSelonOnglet(ongletActif);

      console.log('🔄 [InventairePage] Chargement statistiques périodiques:', {
        id_structure: user.id_structure,
        annee,
        mois: params.mois,
        semaine: params.semaine,
        jour: params.jour,
        onglet: ongletActif
      });

      const result = await inventaireService.getStatistiquesPeriodiques(
        user.id_structure,
        annee,
        params.mois,
        params.semaine,
        params.jour,
        ongletActif
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

  // Ouvrir le modal de sélection de période
  const handleOpenCalendar = () => {
    setShowModalPeriode(true);
  };

  // Validation de la période sélectionnée depuis le modal
  const handleValidatePeriode = (newAnnee: number, newMois: number, newSemaine: number, newJour: number) => {
    console.log('📅 [InventairePage] Nouvelle période sélectionnée:', {
      annee: newAnnee,
      mois: newMois,
      semaine: newSemaine,
      jour: newJour
    });
    setAnnee(newAnnee);
    setMois(newMois);
    setSemaine(newSemaine);
    setJour(newJour);
  };

  // Gestion du clic sur un onglet
  const handleOngletClick = (nouvelOnglet: PeriodeType) => {
    setPeriode(nouvelOnglet);
  };

  // Écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <InventaireHeader onExport={handleExport} onBack={handleBack} onCalendar={handleOpenCalendar} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des statistiques...</p>
            </div>
          </div>
        </div>
        {/* Modal sélection période */}
        <ModalSelectionPeriode
          isOpen={showModalPeriode}
          onClose={() => setShowModalPeriode(false)}
          onValidate={handleValidatePeriode}
          initialAnnee={annee}
          initialMois={mois}
          initialSemaine={semaine}
          initialJour={jour}
        />
      </div>
    );
  }

  // Écran d'erreur
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <InventaireHeader onExport={handleExport} onBack={handleBack} onCalendar={handleOpenCalendar} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <p className="text-red-600 font-semibold mb-2">Erreur de chargement</p>
            <p className="text-red-500 text-sm mb-4">{error}</p>
            <button
              onClick={() => chargerStatistiques(periode)}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
            >
              Réessayer
            </button>
          </div>
        </div>
        {/* Modal sélection période */}
        <ModalSelectionPeriode
          isOpen={showModalPeriode}
          onClose={() => setShowModalPeriode(false)}
          onValidate={handleValidatePeriode}
          initialAnnee={annee}
          initialMois={mois}
          initialSemaine={semaine}
          initialJour={jour}
        />
      </div>
    );
  }

  // Obtenir le label de variation selon la période
  const variationLabel = inventaireService.getVariationContext(periode);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <InventaireHeader onExport={handleExport} onBack={handleBack} onCalendar={handleOpenCalendar} />

      <div className="max-w-7xl mx-auto px-4 pt-4 pb-12">
        {/* Onglets de Période */}
        <div className="flex gap-2 mb-6 bg-gray-100 rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => handleOngletClick('semaine')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
              periode === 'semaine'
                ? 'bg-white text-emerald-600 shadow-md'
                : 'bg-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => handleOngletClick('mois')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
              periode === 'mois'
                ? 'bg-white text-emerald-600 shadow-md'
                : 'bg-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Mois
          </button>
          <button
            onClick={() => handleOngletClick('annee')}
            className={`flex-1 px-6 py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
              periode === 'annee'
                ? 'bg-white text-emerald-600 shadow-md'
                : 'bg-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Année
          </button>
        </div>

        {/* Résumé des Ventes - Card compacte avec grille 2x2 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border-l-4 border-emerald-500 mb-6">
          {/* Titre de la section */}
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>🔥</span>
            <span>Résumé des ventes</span>
          </h2>

          {/* Grille 2x2 des statistiques */}
          <div className="grid grid-cols-2 gap-4">
            {/* CA Total */}
            <div>
              <div className="text-xl font-bold text-emerald-600">
                {data.resume_ventes.ca_total.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                CA Total (FCFA)
              </div>
              <div className={`text-xs font-semibold ${data.resume_ventes.ca_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.ca_variation >= 0 ? '+' : ''}{data.resume_ventes.ca_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>

            {/* Ventes Total */}
            <div>
              <div className="text-xl font-bold text-emerald-600">
                {data.resume_ventes.ventes_total.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                Ventes Total
              </div>
              <div className={`text-xs font-semibold ${data.resume_ventes.ventes_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.ventes_variation >= 0 ? '+' : ''}{data.resume_ventes.ventes_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>

            {/* Panier Moyen */}
            <div>
              <div className="text-xl font-bold text-emerald-600">
                {data.resume_ventes.panier_moyen.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                Panier Moyen (FCFA)
              </div>
              <div className={`text-xs font-semibold ${data.resume_ventes.panier_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.panier_variation >= 0 ? '+' : ''}{data.resume_ventes.panier_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>

            {/* Clients Actifs */}
            <div>
              <div className="text-xl font-bold text-emerald-600">
                {data.resume_ventes.clients_actifs.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                Clients Actifs
              </div>
              <div className={`text-xs font-semibold ${data.resume_ventes.clients_variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {data.resume_ventes.clients_variation >= 0 ? '+' : ''}{data.resume_ventes.clients_variation.toFixed(1)}% {variationLabel}
              </div>
            </div>
          </div>
        </div>

        {/* Top Articles et Top Clients - Grille 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TopArticlesCard articles={data.top_articles} />
          <TopClientsCard clients={data.top_clients} />
        </div>

        {/* Graphique d'Évolution */}
        <div className="mb-8">
          <EvolutionChart
            data={data.evolution_ventes}
            titre={`Évolution des Ventes - ${inventaireService.getPeriodeLabel(periode)}`}
          />
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

      {/* Modal sélection période */}
      <ModalSelectionPeriode
        isOpen={showModalPeriode}
        onClose={() => setShowModalPeriode(false)}
        onValidate={handleValidatePeriode}
        initialAnnee={annee}
        initialMois={mois}
        initialSemaine={semaine}
        initialJour={jour}
      />
    </div>
  );
}
