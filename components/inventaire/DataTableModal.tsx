'use client';

import { Download, Table2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatNumber } from '@/lib/format-locale';
import { arrayToCsv, downloadCsv } from '@/lib/export-csv';
import type {
  EvolutionVente,
  EvolutionMarge,
  PeriodeType,
} from '@/types/inventaire.types';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Type métier : 'ventes' | 'marges' — pilote titre, couleur, nom de fichier. */
  variant: 'ventes' | 'marges';
  /** Période courante — pour le titre du modal et le nom du fichier CSV. */
  periode: PeriodeType;
  /** Données du graphique. Peut être [] ou undefined (rétrocompat evolution_marges). */
  data: EvolutionVente[] | EvolutionMarge[] | undefined;
  /**
   * Visibilité de la colonne valeur. Pertinent uniquement pour variant='marges'.
   * false → colonne marge en `***` + bouton Export désactivé.
   * Pour variant='ventes', toujours considéré true (aucune restriction).
   */
  canView?: boolean;
}

/** Forme normalisée d'une ligne du tableau, indépendante du variant. */
interface TableRow {
  label: string;
  valeur: number;
  nombre_ventes: number;
}

/**
 * Modal générique présentant les données d'un graphique Inventaire sous
 * forme de tableau, avec ligne Total et export CSV.
 *
 * Réutilisé par EvolutionChart (variant='ventes', vert) et
 * EvolutionMargesChart (variant='marges', violet).
 */
export default function DataTableModal({
  isOpen,
  onClose,
  variant,
  periode,
  data,
  canView = true,
}: DataTableModalProps) {
  const t = useTranslations('inventory');
  const { locale } = useLanguage();

  const isMarges = variant === 'marges';
  // Pour les ventes, aucune restriction : la valeur est toujours visible.
  const valueVisible = isMarges ? canView : true;
  const maskedLabel = t('margins.masked');

  // Normalisation des données vers une forme commune (label/valeur/nb ventes).
  const rows: TableRow[] = (data ?? []).map((item) => ({
    label: item.label,
    valeur: isMarges
      ? (item as EvolutionMarge).marge
      : (item as EvolutionVente).montant,
    nombre_ventes: item.nombre_ventes,
  }));

  const hasData = rows.length > 0;
  const canExport = valueVisible && hasData;

  // Totaux (somme des valeurs et des ventes).
  const totalValeur = rows.reduce((sum, r) => sum + r.valeur, 0);
  const totalVentes = rows.reduce((sum, r) => sum + r.nombre_ventes, 0);

  // ----- Libellés dynamiques -----
  const periodeLabel = t(
    periode === 'semaine'
      ? 'dataTable.periodSemaine'
      : periode === 'annee'
        ? 'dataTable.periodAnnee'
        : 'dataTable.periodMois'
  );
  const chartTitle = t(
    isMarges ? 'dataTable.titleMarges' : 'dataTable.titleVentes'
  );
  const modalTitle = `${chartTitle} — ${periodeLabel}`;

  const colValeur = t(isMarges ? 'dataTable.colMarge' : 'dataTable.colMontant');

  // Couleurs propres au variant.
  const accentBg = isMarges
    ? 'bg-violet-600 hover:bg-violet-700 focus:ring-violet-500'
    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500';

  /**
   * Rendu d'une cellule de valeur (montant/marge) dans le tableau.
   * Masquée si CAISSIER ; rouge si négative.
   */
  const renderValueCell = (valeur: number) => {
    if (!valueVisible) {
      return <span>{maskedLabel} FCFA</span>;
    }
    const isNegative = valeur < 0;
    return (
      <span className={isNegative ? 'text-red-600' : ''}>
        {formatNumber(valeur, locale)} FCFA
      </span>
    );
  };

  /** Génère et télécharge le fichier CSV des données du tableau. */
  const handleExport = () => {
    if (!canExport) return;

    const header = [
      t('dataTable.colPeriode'),
      colValeur,
      t('dataTable.colNbVentes'),
    ];
    const bodyRows = rows.map((r) => [r.label, r.valeur, r.nombre_ventes]);
    const totalRow = [t('dataTable.totalRow'), totalValeur, totalVentes];

    const csv = arrayToCsv([header, ...bodyRows, totalRow]);

    // Date du jour en méthodes locales (PAS toISOString — évite décalage UTC).
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `evolution-${variant}-${periode}-${yyyy}-${mm}-${dd}.csv`;

    downloadCsv(filename, csv);
  };

  // ----- Footer : bouton Export CSV -----
  const exportDisabledTitle = !hasData
    ? t('dataTable.exportDisabledEmpty')
    : t('dataTable.exportDisabledCaissier');

  const footer = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={handleExport}
        disabled={!canExport}
        title={canExport ? undefined : exportDisabledTitle}
        aria-label={canExport ? t('dataTable.exportCsv') : exportDisabledTitle}
        className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          canExport
            ? `${accentBg} text-white`
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Download className="w-4 h-4" />
        {t('dataTable.exportCsv')}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      overlay="blur"
      animation="scale"
      showCloseButton
      footer={footer}
    >
      {hasData ? (
        // Scroll horizontal de sécurité sur mobile (valeurs FCFA longues).
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="py-2 px-3 text-left font-semibold">
                  {t('dataTable.colPeriode')}
                </th>
                <th className="py-2 px-3 text-right font-semibold">
                  {colValeur}
                </th>
                <th className="py-2 px-3 text-right font-semibold">
                  {t('dataTable.colNbVentes')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.label}-${index}`}
                  className="border-b border-gray-100"
                >
                  <td className="py-2 px-3 text-left text-gray-800">
                    {row.label}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-800 whitespace-nowrap">
                    {renderValueCell(row.valeur)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-800">
                    {row.nombre_ventes}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                <td className="py-2 px-3 text-left text-gray-900">
                  {t('dataTable.totalRow')}
                </td>
                <td className="py-2 px-3 text-right text-gray-900 whitespace-nowrap">
                  {renderValueCell(totalValeur)}
                </td>
                <td className="py-2 px-3 text-right text-gray-900">
                  {totalVentes}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        // État vide : icône grisée + message i18n.
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gray-100 mb-4">
            <Table2 className="w-8 h-8" />
          </div>
          <p className="text-sm text-center text-gray-500">
            {t('dataTable.empty')}
          </p>
        </div>
      )}
    </Modal>
  );
}
