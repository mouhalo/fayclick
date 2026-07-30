/**
 * Générateur HTML du rapport d'encaissements par mode de paiement.
 *
 * Fonction pure (aucun accès au DOM, aucun hook) exposée sous deux formes :
 * - `generateEncaissementsFragmentHTML()` : fragment injectable dans un document
 *   existant, utilisé par le rapport imprimé de la Vente Flash ;
 * - `generateRapportEncaissementsHTML()` : document complet autonome, imprimable
 *   via `printViaIframe()` (lib/generate-ticket-html.ts) depuis l'onglet Paiements.
 *
 * Les libellés sont fournis par l'appelant (déjà traduits) : ce module ne peut
 * pas appeler `useTranslations`, qui est un hook React.
 */

import { MODES_PAIEMENT_META, type ModePaiementNormalise } from '@/lib/payment-methods';
import type { RapportEncaissements } from '@/types/rapport-encaissements';

/** Libellés traduits nécessaires au rendu. */
export interface RapportEncaissementsLabels {
  title: string;
  mode: string;
  count: string;
  amount: string;
  total: string;
  empty: string;
  /** Libellé de chaque mode, indexé par mode normalisé. */
  modes: Record<ModePaiementNormalise, string>;
}

export interface RapportEncaissementsHtmlOptions {
  rapport: RapportEncaissements;
  labels: RapportEncaissementsLabels;
  /** Si false, tous les montants sont remplacés par `***` (droit CAISSIER). */
  canViewMontants: boolean;
}

export interface RapportEncaissementsDocumentOptions extends RapportEncaissementsHtmlOptions {
  nomStructure: string;
  /** Période déjà formatée pour l'affichage (ex. « du 01/07/2026 au 31/07/2026 »). */
  periodeLabel: string;
  logoUrl?: string;
  nomCaissier?: string;
  /** Pied de page : mention de génération déjà traduite. */
  footerLabel?: string;
}

/** Neutralise les caractères pouvant casser le HTML généré. */
function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Formate un montant, ou le masque si l'utilisateur n'a pas le droit de le voir. */
function formatMontant(montant: number, canViewMontants: boolean): string {
  if (!canViewMontants) return '***';
  return `${(montant || 0).toLocaleString('fr-FR')} FCFA`;
}

/**
 * Fragment HTML : titre + tableau Mode / Nb paiements / Montant + ligne Total.
 *
 * Les compteurs `nb_paiements` restent toujours visibles : seuls les montants
 * sont masqués quand `canViewMontants` est faux.
 */
export function generateEncaissementsFragmentHTML({
  rapport,
  labels,
  canViewMontants,
}: RapportEncaissementsHtmlOptions): string {
  const modes = rapport?.modes ?? [];

  if (modes.length === 0) {
    return `
      <h2 class="enc-title">${escapeHtml(labels.title)}</h2>
      <p class="enc-empty">${escapeHtml(labels.empty)}</p>
    `;
  }

  const lignes = modes
    .map((m) => {
      const meta = MODES_PAIEMENT_META[m.mode] ?? MODES_PAIEMENT_META.AUTRES;
      const libelle = labels.modes[m.mode] ?? m.mode;
      return `
        <tr>
          <td>
            <span class="enc-puce" style="background:${meta.hex}"></span>
            <strong>${escapeHtml(libelle)}</strong>
          </td>
          <td style="text-align:center;font-weight:bold;">${m.nb_paiements}</td>
          <td style="text-align:right;font-weight:bold;">${formatMontant(m.montant_total, canViewMontants)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <h2 class="enc-title">${escapeHtml(labels.title)}</h2>
    <table class="enc-table">
      <thead>
        <tr>
          <th style="width:50%;">${escapeHtml(labels.mode)}</th>
          <th style="width:22%;text-align:center;">${escapeHtml(labels.count)}</th>
          <th style="width:28%;text-align:right;">${escapeHtml(labels.amount)}</th>
        </tr>
      </thead>
      <tbody>${lignes}</tbody>
      <tfoot>
        <tr class="enc-total">
          <td>${escapeHtml(labels.total)}</td>
          <td style="text-align:center;">${rapport.total?.nb_paiements ?? 0}</td>
          <td style="text-align:right;">${formatMontant(rapport.total?.montant_total ?? 0, canViewMontants)}</td>
        </tr>
      </tfoot>
    </table>
  `;
}

/** Styles du fragment — à inclure dans le <style> du document hôte. */
export const RAPPORT_ENCAISSEMENTS_STYLES = `
  .enc-title { color: #059669; margin-top: 30px; }
  .enc-empty { color: #666; font-style: italic; padding: 12px 0; }
  .enc-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .enc-table th { background: #059669; color: white; padding: 10px; text-align: left; }
  .enc-table td { padding: 10px; border-bottom: 1px solid #ddd; }
  .enc-table tbody tr:nth-child(even) { background: #f9f9f9; }
  .enc-puce { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }
  .enc-total td { background: #ecfdf5; font-weight: bold; color: #059669; border-top: 2px solid #059669; font-size: 15px; }
`;

/**
 * Document HTML complet et autonome, prêt pour `printViaIframe()`.
 */
export function generateRapportEncaissementsHTML(
  options: RapportEncaissementsDocumentOptions
): string {
  const { nomStructure, periodeLabel, logoUrl, nomCaissier, footerLabel, labels } = options;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(labels.title)} - ${escapeHtml(periodeLabel)}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #059669; text-align: center; border-bottom: 3px solid #059669; padding-bottom: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header .structure { font-size: 18px; font-weight: bold; color: #059669; margin: 8px 0; }
    .header .periode { font-size: 16px; color: #666; }
    .header .caissier { font-weight: bold; color: #059669; margin-top: 10px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    ${RAPPORT_ENCAISSEMENTS_STYLES}
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="max-width:120px;max-height:80px;margin:0 auto 15px;display:block;" onerror="this.style.display='none'" />` : ''}
    <h1>${escapeHtml(labels.title)}</h1>
    <p class="structure">${escapeHtml(nomStructure)}</p>
    <p class="periode">${escapeHtml(periodeLabel)}</p>
    ${nomCaissier ? `<p class="caissier">${escapeHtml(nomCaissier)}</p>` : ''}
  </div>

  ${generateEncaissementsFragmentHTML(options)}

  <div class="footer">
    <p>${escapeHtml(footerLabel || '')} ${new Date().toLocaleString('fr-FR')}</p>
    <p>FayClick - Super App Sénégal</p>
  </div>
</body>
</html>`;
}
