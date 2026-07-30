/**
 * Composant pour afficher la liste des paiements (reçus)
 * Design glassmorphism cohérent avec le reste de l'application
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Printer,
  Loader2
} from 'lucide-react';
import { recuService } from '@/services/recu.service';
import {
  MODES_PAIEMENT_META,
  normalizeMethodePaiement,
  type ModePaiementNormalise
} from '@/lib/payment-methods';
import type { EncaissementParMode, RapportEncaissements } from '@/types/rapport-encaissements';
import {
  generateRapportEncaissementsHTML,
  type RapportEncaissementsLabels
} from '@/lib/generate-rapport-encaissements-html';
import { printViaIframe } from '@/lib/generate-ticket-html';
import { arrayToCsv, downloadCsv } from '@/lib/export-csv';
import { useAuth } from '@/contexts/AuthContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterHeaderPaiementsGlass } from './FilterHeaderPaiementsGlass';
import { GlassPagination } from '@/components/ui/GlassPagination';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-locale';

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
  /** Si false, remplace les montants par *** (caissier) */
  canViewMontants?: boolean;
}

/** Périodes proposées par le sélecteur. */
type PeriodePreset = 'today' | 'week' | 'month' | 'custom';

/** Bornes d'une période (format `YYYY-MM-DD`, bornes incluses). */
interface BornesPeriode {
  debut: string;
  fin: string;
}

/**
 * Formate une date en `YYYY-MM-DD` dans le fuseau LOCAL.
 * `toISOString()` convertirait en UTC et pourrait renvoyer la veille.
 */
function toIsoDate(date: Date): string {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

/** Bornes correspondant à un preset ; `custom` conserve les bornes courantes. */
function calculerBornes(preset: PeriodePreset, bornesActuelles: BornesPeriode): BornesPeriode {
  const aujourdhui = new Date();
  const fin = toIsoDate(aujourdhui);

  switch (preset) {
    case 'today':
      return { debut: fin, fin };
    case 'week': {
      const debut = new Date(aujourdhui);
      debut.setDate(debut.getDate() - 6); // 7 jours glissants, aujourd'hui inclus
      return { debut: toIsoDate(debut), fin };
    }
    case 'month': {
      const debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
      return { debut: toIsoDate(debut), fin };
    }
    case 'custom':
    default:
      return bornesActuelles;
  }
}

export function ListePaiements({
  onViewRecu,
  onDownloadRecu,
  canViewMontants = true
}: ListePaiementsProps) {
  const { user, structure } = useAuth();
  const t = useTranslations('invoices');
  const tPayment = useTranslations('paymentReport');
  const { locale } = useLanguage();
  const dateLocale = locale === 'en' ? enUS : fr;

  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filtres, setFiltres] = useState<FiltresPaiements>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Période consultée : pilote À LA FOIS la liste (get_historic_recu) et les
  // agrégats par mode (get_rapport_encaissements). Défaut = aujourd'hui.
  const [preset, setPreset] = useState<PeriodePreset>('today');
  const [bornes, setBornes] = useState<BornesPeriode>(() => calculerBornes('today', { debut: '', fin: '' }));

  // Agrégats serveur par mode de paiement sur la période.
  const [rapport, setRapport] = useState<RapportEncaissements | null>(null);

  // États de pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /**
   * Plafond de la liste. Les agrégats affichés au-dessus proviennent, eux, de
   * PostgreSQL et couvrent TOUTE la période : ils peuvent donc dépasser ce
   * nombre. C'est assumé, et signalé à l'utilisateur par `listCapNote`.
   */
  const LIMITE_LISTE = 100;

  const loadPaiements = useCallback(async () => {
    if (!user?.id_structure) return;

    try {
      setLoading(true);
      setError('');

      // Liste et agrégats sont chargés en parallèle sur les mêmes bornes.
      const [historique, rapportEncaissements] = await Promise.all([
        recuService.getHistoriqueRecus({
          id_structure: user.id_structure,
          date_debut: bornes.debut,
          date_fin: bornes.fin,
          limite: LIMITE_LISTE
        }),
        recuService.getRapportEncaissements(user.id_structure, bornes.debut, bornes.fin, 0)
      ]);

      setRapport(rapportEncaissements);

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
      setError(tPayment('error'));
      setRapport(null);
      setPaiements([]);
    } finally {
      setLoading(false);
    }
    // `tPayment` est mémoïsé sur [locale, namespace] : stable entre les rendus.
  }, [user, bornes, tPayment]);

  // Rechargement au montage et à chaque changement de période.
  useEffect(() => {
    loadPaiements();
  }, [loadPaiements]);

  // Gestionnaire de refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadPaiements();
    setIsRefreshing(false);
  };

  /** Changement de preset : recalcule les bornes (sauf en mode personnalisé). */
  const handlePresetChange = (nouveauPreset: PeriodePreset) => {
    setPreset(nouveauPreset);
    if (nouveauPreset !== 'custom') {
      setBornes((actuelles) => calculerBornes(nouveauPreset, actuelles));
    }
  };

  /** Modification d'une borne en mode personnalisé. */
  const handleBorneChange = (champ: keyof BornesPeriode, valeur: string) => {
    if (!valeur) return;
    setBornes((actuelles) => {
      const suivantes = { ...actuelles, [champ]: valeur };
      // Garde-fou : une borne de fin antérieure au début produirait une période
      // vide côté SQL sans que l'utilisateur comprenne pourquoi.
      if (suivantes.debut > suivantes.fin) {
        return champ === 'debut'
          ? { debut: valeur, fin: valeur }
          : { debut: valeur, fin: valeur };
      }
      return suivantes;
    });
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

      // Filtre par méthode : comparaison sur le mode NORMALISÉ, sinon
      // sélectionner « Orange Money » manquerait les reçus stockés en 'OM'.
      const matchMethod = !filtres.methode_paiement ||
        normalizeMethodePaiement(paiement.methode_paiement) === filtres.methode_paiement;

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
          comparison = normalizeMethodePaiement(a.methode_paiement)
            .localeCompare(normalizeMethodePaiement(b.methode_paiement));
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

  /**
   * Libellé, icône et couleur d'un mode de paiement.
   *
   * Passe systématiquement par `normalizeMethodePaiement()` : la table de
   * correspondance littérale précédente ne connaissait que les slugs minuscules
   * écrits par le front, si bien que les reçus enregistrés côté serveur ('OM',
   * 'WAVE'...) retombaient tous sur le libellé « Espèces ».
   */
  const getMethodeInfo = (methode: string) => {
    const mode = normalizeMethodePaiement(methode);
    const meta = MODES_PAIEMENT_META[mode];
    const Icon = meta.icon;

    return {
      label: tPayment(meta.labelKey),
      icon: <Icon className="w-4 h-4" />,
      color: meta.gradient
    };
  };

  // ── Données dérivées : impression, export et cartes d'agrégats ────────────
  const encaissements: EncaissementParMode[] = rapport?.modes ?? [];
  const totalRapport = rapport?.total ?? { nb_paiements: 0, montant_total: 0 };

  const formatBorne = (iso: string) =>
    format(new Date(`${iso}T00:00:00`), 'dd/MM/yyyy', { locale: dateLocale });

  const periodeLabel =
    bornes.debut === bornes.fin
      ? formatBorne(bornes.fin)
      : `${tPayment('dateFrom')} ${formatBorne(bornes.debut)} ${tPayment('dateTo')} ${formatBorne(bornes.fin)}`;

  const labelsRapport: RapportEncaissementsLabels = {
    title: tPayment('title'),
    mode: tPayment('mode'),
    count: tPayment('count'),
    amount: tPayment('amount'),
    total: tPayment('total'),
    empty: tPayment('empty'),
    modes: {
      CASH: tPayment('modes.cash'),
      OM: tPayment('modes.om'),
      WAVE: tPayment('modes.wave'),
      FREE: tPayment('modes.free'),
      AUTRES: tPayment('modes.other')
    }
  };

  /** Document imprimable des encaissements de la période. */
  const handlePrint = () => {
    if (!rapport) return;
    printViaIframe(
      generateRapportEncaissementsHTML({
        rapport,
        labels: labelsRapport,
        canViewMontants,
        nomStructure: structure?.nom_structure || '',
        periodeLabel,
        logoUrl: structure?.logo || undefined,
        footerLabel: tPayment('title')
      })
    );
  };

  /** Export CSV des agrégats par mode (format Excel FR géré par lib/export-csv). */
  const handleExportCsv = () => {
    if (!rapport) return;

    const lignes: (string | number)[][] = [
      [tPayment('period'), periodeLabel],
      [],
      [tPayment('mode'), tPayment('count'), tPayment('amount')],
      ...encaissements.map((e) => [
        labelsRapport.modes[e.mode as ModePaiementNormalise] ?? e.mode,
        e.nb_paiements,
        e.montant_total
      ]),
      [tPayment('total'), totalRapport.nb_paiements, totalRapport.montant_total]
    ];

    downloadCsv(`encaissements-${bornes.debut}_${bornes.fin}.csv`, arrayToCsv(lignes));
  };

  const presetsDisponibles: PeriodePreset[] = ['today', 'week', 'month', 'custom'];
  const actionsDesactivees = !canViewMontants || !rapport || loading;

  return (
    <div className="w-full overflow-hidden">
      {/*
        Sélecteur de période et cartes d'agrégats sont rendus AVANT toute
        branche conditionnelle : si la période choisie ne contient aucun reçu,
        l'utilisateur doit pouvoir en sélectionner une autre. Les états
        chargement / erreur / vide sont des zones internes, plus des retours
        anticipés qui démonteraient ces contrôles.
      */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {presetsDisponibles.map((p) => (
            <button
              key={p}
              onClick={() => handlePresetChange(p)}
              className={`
                px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium
                border transition-all duration-200
                ${preset === p
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : 'bg-white/70 text-gray-700 border-gray-200 hover:bg-white'}
              `}
            >
              {tPayment(`presets.${p}`)}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={actionsDesactivees}
              title={tPayment('print')}
              className="
                px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium
                bg-indigo-500 text-white hover:bg-indigo-600
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors flex items-center gap-1.5
              "
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{tPayment('print')}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={actionsDesactivees}
              title={tPayment('exportCsv')}
              className="
                px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium
                bg-emerald-600 text-white hover:bg-emerald-700
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors flex items-center gap-1.5
              "
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{tPayment('exportCsv')}</span>
            </button>
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <span className="font-medium">{tPayment('dateFrom')}</span>
              <input
                type="date"
                value={bornes.debut}
                max={bornes.fin}
                onChange={(e) => handleBorneChange('debut', e.target.value)}
                className="py-1.5 px-2 text-xs bg-white border border-gray-200 rounded-lg focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <span className="font-medium">{tPayment('dateTo')}</span>
              <input
                type="date"
                value={bornes.fin}
                min={bornes.debut}
                onChange={(e) => handleBorneChange('fin', e.target.value)}
                className="py-1.5 px-2 text-xs bg-white border border-gray-200 rounded-lg focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </label>
          </div>
        )}
      </div>

      {/* Agrégats serveur : total de la période + détail par mode de paiement */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 100 }}
          className="bg-green-800/90 backdrop-blur-sm rounded-2xl p-3 border border-green-700/50"
        >
          <div className="space-y-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div className="space-y-1">
              <p className="text-white text-[10px] font-medium leading-tight">
                {tPayment('total')}
              </p>
              <p className="text-white text-sm font-bold leading-tight break-words">
                {canViewMontants
                  ? `${formatNumber(totalRapport.montant_total, locale)} FCFA`
                  : '***'}
              </p>
              <p className="text-white/70 text-[9px] leading-tight">
                {tPayment('count')} : {totalRapport.nb_paiements}
              </p>
            </div>
          </div>
        </motion.div>

        {encaissements.map((encaissement, index) => {
          const meta =
            MODES_PAIEMENT_META[encaissement.mode as ModePaiementNormalise] ??
            MODES_PAIEMENT_META.AUTRES;
          const Icon = meta.icon;

          return (
            <motion.div
              key={encaissement.mode}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: (index + 1) * 0.05, duration: 0.4, type: 'spring', stiffness: 100 }}
              className="bg-green-800/90 backdrop-blur-sm rounded-2xl p-3 border border-green-700/50"
            >
              <div className="space-y-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-white text-[10px] font-medium leading-tight">
                    {tPayment(meta.labelKey)}
                  </p>
                  <p className="text-white text-sm font-bold leading-tight break-words">
                    {canViewMontants
                      ? `${formatNumber(encaissement.montant_total, locale)} FCFA`
                      : '***'}
                  </p>
                  <p className="text-white/70 text-[9px] leading-tight">
                    {tPayment('count')} : {encaissement.nb_paiements}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="mb-6">
        <FilterHeaderPaiementsGlass
          onFiltersChange={setFiltres}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>

      {/* Zone de contenu : chargement / erreur / vide / liste */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto" />
            <p className="text-gray-500">{t('payments.loading')}</p>
          </div>
        </div>
      ) : error ? (
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </GlassCard>
      ) : paiements.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-16 h-16" />}
          title={t('payments.emptyTitle')}
          description={t('payments.emptyDescription')}
        />
      ) : (
        <>
          {/*
            La liste est plafonnée à LIMITE_LISTE, alors que les agrégats
            ci-dessus couvrent toute la période : on le dit explicitement dès
            que le plafond est atteint, pour que l'écart ne passe pas pour un bug.
          */}
          {paiements.length >= LIMITE_LISTE && (
            <p className="mb-3 text-xs text-gray-500 italic">
              {tPayment('listCapNote', { count: LIMITE_LISTE })}
            </p>
          )}

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
              title={t('payments.emptyFilteredTitle')}
              description={t('payments.emptyFilteredDescription')}
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
                        {format(new Date(paiement.date_paiement), 'dd MMM yyyy', { locale: dateLocale })}
                      </span>
                    </div>
                  </div>

                  {/* Montant principal - EXACTEMENT comme FactureCard */}
                  <div className="text-center mb-3 sm:mb-4 overflow-hidden">
                    <p className="text-white text-base sm:text-lg lg:text-xl font-bold break-words">
                      {canViewMontants ? <>{formatNumber(paiement.montant_paye, locale)} <span className="text-sm">FCFA</span></> : '******'}
                    </p>
                    <p className="text-emerald-300 text-xs sm:text-sm font-medium">
                      {t('payments.via', { method: methodeInfo.label })}
                    </p>
                  </div>

                  {/* Actions - EXACTEMENT comme FactureCard */}
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => onViewRecu?.(paiement)}
                      className="flex-1 py-1.5 sm:py-2 bg-white/20 rounded-md sm:rounded-lg text-white text-xs sm:text-sm hover:bg-white/30 transition-colors flex items-center justify-center gap-1"
                      title={t('payments.viewTitle')}
                    >
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">{t('payments.view')}</span>
                    </button>
                    <button
                      onClick={() => onDownloadRecu?.(paiement)}
                      className="flex-1 py-1.5 sm:py-2 bg-emerald-500/20 rounded-md sm:rounded-lg text-emerald-200 text-xs sm:text-sm hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                      title={t('payments.downloadTitle')}
                    >
                      <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">{t('payments.download')}</span>
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
        </>
      )}
    </div>
  );
}