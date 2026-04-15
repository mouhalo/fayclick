/**
 * Composant de filtres compact pour la gestion des clients
 * Style glassmorphism cohérent avec FilterHeaderGlass des factures
 * ✅ Export CSV et Impression des clients
 * ✅ Filtres avancés : nombre factures, montant acheté, montant impayés
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, ChevronDown, RefreshCw, FileDown, Printer } from 'lucide-react';
import { ClientWithStats } from '@/types/client';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { toBcp47 } from '@/lib/format-locale';

// Type pour les opérateurs de comparaison
type FilterOperator = '=' | '<' | '>';

// Interface pour les filtres avancés
export interface ClientAdvancedFilters {
  facturesOp: FilterOperator;
  facturesValue: string;
  payeOp: FilterOperator;
  payeValue: string;
  impayeOp: FilterOperator;
  impayeValue: string;
}

interface FilterHeaderClientsGlassProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  clients?: ClientWithStats[];
  nomStructure?: string;
  // Filtres avancés (optionnels pour rétrocompatibilité)
  advancedFilters?: ClientAdvancedFilters;
  onAdvancedFiltersChange?: (filters: ClientAdvancedFilters) => void;
}

export function FilterHeaderClientsGlass({
  searchTerm,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  clients = [],
  nomStructure = 'Structure',
  advancedFilters,
  onAdvancedFiltersChange
}: FilterHeaderClientsGlassProps) {
  const t = useTranslations('clients');
  const { locale } = useLanguage();
  // État local pour l'input (mise à jour immédiate)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [isExporting, setIsExporting] = useState(false);

  // Formater montant en FCFA
  const formatMontant = (montant: number | undefined | null) => {
    return (montant ?? 0).toLocaleString('fr-FR') + ' F';
  };

  // ✅ Export CSV des clients
  const handleExportCSV = useCallback(() => {
    if (clients.length === 0) {
      alert(t('alerts.exportEmpty'));
      return;
    }

    setIsExporting(true);

    try {
      // En-têtes CSV
      const headers = [
        t('export_.headers.name'),
        t('export_.headers.phone'),
        t('export_.headers.nbInvoices'),
        t('export_.headers.totalPaid'),
        t('export_.headers.unpaid')
      ];

      // Données clients
      const rows = clients.map(({ client, statistiques_factures }) => [
        (client?.nom_client || '').replace(/[;,]/g, ' '), // Échapper les séparateurs
        client?.tel_client || '',
        (statistiques_factures?.nombre_factures ?? 0).toString(),
        (statistiques_factures?.montant_total_paye ?? 0).toString(),
        (statistiques_factures?.montant_impaye ?? 0).toString()
      ]);

      // Créer le contenu CSV avec BOM UTF-8 pour Excel
      const BOM = '\uFEFF';
      const csvContent = BOM + [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toLocaleDateString(toBcp47(locale)).replace(/\//g, '-');
      link.download = `${t('export_.filePrefix')}_${nomStructure.replace(/\s+/g, '_')}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log(`✅ Export CSV: ${clients.length} clients exportés`);
    } catch (error) {
      console.error('❌ Erreur export CSV:', error);
      alert(t('alerts.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [clients, nomStructure]);

  // ✅ Impression des clients
  const handlePrint = useCallback(() => {
    if (clients.length === 0) {
      alert(t('alerts.printEmpty'));
      return;
    }

    // Calculer les totaux
    const totaux = clients.reduce((acc, { statistiques_factures }) => ({
      factures: acc.factures + (statistiques_factures?.nombre_factures ?? 0),
      paye: acc.paye + (statistiques_factures?.montant_total_paye ?? 0),
      impaye: acc.impaye + (statistiques_factures?.montant_impaye ?? 0)
    }), { factures: 0, paye: 0, impaye: 0 });

    const dateStr = new Date().toLocaleDateString(toBcp47(locale));
    const langAttr = locale === 'en' ? 'en' : 'fr';

    const printHTML = `
      <!DOCTYPE html>
      <html lang="${langAttr}">
      <head>
        <meta charset="UTF-8">
        <title>${t('export_.printTitle')} - ${nomStructure}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #16a34a;
          }
          .header h1 {
            color: #16a34a;
            font-size: 22px;
            margin-bottom: 5px;
          }
          .header p {
            color: #666;
            font-size: 14px;
          }
          .meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          th {
            background: linear-gradient(135deg, #16a34a, #22c55e);
            color: white;
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
          }
          th:nth-child(3), th:nth-child(4), th:nth-child(5) {
            text-align: right;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
          }
          td:nth-child(3), td:nth-child(4), td:nth-child(5) {
            text-align: right;
            font-family: 'Consolas', monospace;
          }
          tr:nth-child(even) { background-color: #f9fafb; }
          tr:hover { background-color: #f0fdf4; }
          .impaye { color: #dc2626; font-weight: 600; }
          .paye { color: #16a34a; }
          .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid #16a34a;
          }
          .totaux {
            display: flex;
            justify-content: flex-end;
            gap: 30px;
            font-size: 13px;
            font-weight: 600;
          }
          .totaux span { color: #666; }
          .totaux .value { color: #16a34a; }
          .totaux .impaye-total { color: #dc2626; }
          @media print {
            body { padding: 10px; }
            .header h1 { font-size: 18px; }
            table { font-size: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${t('export_.printIcon')}</h1>
          <p>${nomStructure}</p>
        </div>

        <div class="meta">
          <span>${t('export_.printTotal', { count: clients.length })}</span>
          <span>${t('export_.printDate', { date: dateStr })}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t('export_.headers.name')}</th>
              <th>${t('export_.headers.phone')}</th>
              <th>${t('export_.headers.nbInvoices')}</th>
              <th>${t('export_.headers.totalPaid')}</th>
              <th>${t('export_.headers.unpaid')}</th>
            </tr>
          </thead>
          <tbody>
            ${clients.map(({ client, statistiques_factures }) => `
              <tr>
                <td>${client?.nom_client || '-'}</td>
                <td>${client?.tel_client || '-'}</td>
                <td>${statistiques_factures?.nombre_factures ?? 0}</td>
                <td class="paye">${formatMontant(statistiques_factures?.montant_total_paye)}</td>
                <td class="${(statistiques_factures?.montant_impaye ?? 0) > 0 ? 'impaye' : ''}">${formatMontant(statistiques_factures?.montant_impaye)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div class="totaux">
            <div><span>${t('export_.printTotalInvoices')}</span> <span class="value">${totaux.factures}</span></div>
            <div><span>${t('export_.printTotalPaid')}</span> <span class="value">${formatMontant(totaux.paye)}</span></div>
            <div><span>${t('export_.printTotalUnpaid')}</span> <span class="impaye-total">${formatMontant(totaux.impaye)}</span></div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Méthode iframe cachée (compatible mobile/tablette)
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(printHTML);
      frameDoc.close();

      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('Impression iframe échouée, tentative alternative:', e);
            window.print();
          }
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      };
    }

    console.log(`✅ Impression: ${clients.length} clients`);
  }, [clients, nomStructure]);

  // État d'affichage des filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Synchroniser l'état local avec la prop
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Effet pour déclencher la recherche avec debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, onSearchChange]);

  const hasActiveFilters = localSearchTerm.length > 0;

  return (
    <div className="space-y-3">
      {/* Barre de recherche principale */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="
              w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm
              bg-white/80 border border-gray-200 rounded-md sm:rounded-lg
              text-gray-800 placeholder-gray-500
              focus:bg-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200
              transition-all duration-200
            "
          />
          {localSearchTerm && (
            <button
              onClick={() => setLocalSearchTerm('')}
              className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>

        {/* Bouton filtres avancés (future implémentation) */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="
            bg-white/80 text-gray-700 p-2 sm:p-2.5 rounded-md sm:rounded-lg
            hover:bg-white hover:text-gray-800 transition-all duration-200
            border border-gray-200 flex items-center space-x-0.5 sm:space-x-1 shadow-sm
          "
        >
          <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <ChevronDown
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform ${
              showAdvancedFilters ? 'rotate-180' : ''
            }`}
          />
        </motion.button>

        {/* Bouton actualiser */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isRefreshing}
          className="
            bg-blue-500/90 text-white p-2 sm:p-2.5 rounded-md sm:rounded-lg
            hover:bg-blue-500 transition-all duration-200
            border border-blue-400/50 disabled:opacity-50
          "
          title={t('refresh')}
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </motion.button>

        {/* Bouton Export CSV */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleExportCSV}
          disabled={isExporting || clients.length === 0}
          className="
            bg-emerald-500/90 text-white p-2 sm:p-2.5 rounded-md sm:rounded-lg
            hover:bg-emerald-500 transition-all duration-200
            border border-emerald-400/50 disabled:opacity-50
          "
          title={t('export')}
        >
          <FileDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isExporting ? 'animate-pulse' : ''}`} />
        </motion.button>

        {/* Bouton Imprimer */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handlePrint}
          disabled={clients.length === 0}
          className="
            bg-purple-500/90 text-white p-2 sm:p-2.5 rounded-md sm:rounded-lg
            hover:bg-purple-500 transition-all duration-200
            border border-purple-400/50 disabled:opacity-50
          "
          title={t('print')}
        >
          <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </motion.button>
      </div>

      {/* Filtres avancés */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{
          height: showAdvancedFilters ? 'auto' : 0,
          opacity: showAdvancedFilters ? 1 : 0
        }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div className="space-y-3 pt-2">
          {advancedFilters && onAdvancedFiltersChange ? (
            <>
              {/* Filtre par nombre de factures */}
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <label className="block text-white/80 text-xs font-medium mb-2">
                  {t('advanced.invoiceCount')}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={advancedFilters.facturesOp}
                    onChange={(e) => onAdvancedFiltersChange({
                      ...advancedFilters,
                      facturesOp: e.target.value as FilterOperator
                    })}
                    className="px-2 py-1.5 bg-white/80 border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={advancedFilters.facturesValue}
                    onChange={(e) => onAdvancedFiltersChange({
                      ...advancedFilters,
                      facturesValue: e.target.value
                    })}
                    placeholder="0"
                    className="flex-1 px-2 py-1.5 bg-white/80 border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Filtre par montant acheté (payé) */}
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <label className="block text-white/80 text-xs font-medium mb-2">
                  {t('advanced.amountPurchased')}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={advancedFilters.payeOp}
                    onChange={(e) => onAdvancedFiltersChange({
                      ...advancedFilters,
                      payeOp: e.target.value as FilterOperator
                    })}
                    className="px-2 py-1.5 bg-white/80 border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={advancedFilters.payeValue}
                    onChange={(e) => onAdvancedFiltersChange({
                      ...advancedFilters,
                      payeValue: e.target.value
                    })}
                    placeholder="0"
                    className="flex-1 px-2 py-1.5 bg-white/80 border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Filtre par montant impayés */}
              <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                <label className="block text-white/80 text-xs font-medium mb-2">
                  {t('advanced.amountUnpaid')}
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={advancedFilters.impayeOp}
                    onChange={(e) => onAdvancedFiltersChange({
                      ...advancedFilters,
                      impayeOp: e.target.value as FilterOperator
                    })}
                    className="px-2 py-1.5 bg-white/80 border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={advancedFilters.impayeValue}
                    onChange={(e) => onAdvancedFiltersChange({
                      ...advancedFilters,
                      impayeValue: e.target.value
                    })}
                    placeholder="0"
                    className="flex-1 px-2 py-1.5 bg-white/80 border border-gray-200 rounded-md text-xs text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Bouton pour réinitialiser les filtres */}
              {(advancedFilters.facturesValue || advancedFilters.payeValue || advancedFilters.impayeValue) && (
                <button
                  onClick={() => onAdvancedFiltersChange({
                    facturesOp: '=',
                    facturesValue: '',
                    payeOp: '=',
                    payeValue: '',
                    impayeOp: '=',
                    impayeValue: ''
                  })}
                  className="w-full py-2 bg-red-500/20 text-red-200 rounded-lg text-xs hover:bg-red-500/30 transition-colors border border-red-400/30"
                >
                  {t('filtersReset')}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-4 bg-white/10 rounded-lg border border-white/20">
              <p className="text-white/60 text-xs sm:text-sm">
                {t('filtersNoneConfigured')}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
