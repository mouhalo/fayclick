/**
 * Modal impression proforma — 2 options : Personnalisé / Standard
 * HTML identique à generateDocumentHTML de ModalImpressionDocuments
 * avec données proforma et titre "FACTURE PROFORMA"
 */

'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Sparkles, File } from 'lucide-react';
import { ConfigFacture, InfoFacture } from '@/types/auth';
import { Proforma, ProformaDetail } from '@/types/proforma';
import { formatDate } from '@/lib/utils';

type FormatType = 'personnalise' | 'standard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  proforma: Proforma;
  details: ProformaDetail[];
  configFacture?: ConfigFacture;
  infoFacture?: InfoFacture;
  logo?: string;
  nomStructure: string;
  inclureTva?: boolean;
  tauxTva?: number;
}

export function ModalImpressionProforma({
  isOpen, onClose, proforma, details, configFacture, infoFacture, logo, nomStructure,
  inclureTva = false, tauxTva = 18
}: Props) {
  const [avecTva, setAvecTva] = useState(inclureTva);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  // Rendu d'un champ du layout personnalisé
  const renderField = (fieldId: string): string => {
    if (fieldId === 'logo' && logo) {
      return `<img src="${logo}" alt="Logo" style="max-height:50px;max-width:120px;object-fit:contain;" />`;
    }
    if (infoFacture && fieldId in infoFacture) {
      const value = infoFacture[fieldId as keyof InfoFacture];
      if (value) return `<span style="font-size:11px;">${value}</span>`;
    }
    return '';
  };

  // Zone personnalisée (header ou footer) avec flexbox
  const renderCustomZone = (zone: ConfigFacture['header'] | ConfigFacture['footer']): string => {
    const positions = ['gauche', 'centre', 'droite'] as const;
    const justifyMap = { gauche: 'flex-start', centre: 'center', droite: 'flex-end' };
    const alignMap = { gauche: 'left', centre: 'center', droite: 'right' };

    const cells = positions.map(pos => {
      const fields = zone[pos];
      const content = fields.map(f => renderField(f)).filter(Boolean).join('<br/>');
      return `<div style="flex:1;text-align:${alignMap[pos]};display:flex;flex-direction:column;align-items:${justifyMap[pos]};padding:4px 8px;">${content}</div>`;
    }).join('');

    return `<div style="display:flex;width:100%;">${cells}</div>`;
  };

  // HTML identique à generateDocumentHTML de ModalImpressionDocuments
  const generateProformaHTML = (format: FormatType): string => {
    const useCustom = format === 'personnalise' && configFacture;

    // En-tête (identique factures)
    let headerHtml = '';
    if (useCustom) {
      headerHtml = `
        <div style="margin-bottom:8px;">
          <h2 style="margin:0 0 6px;font-size:16px;font-weight:bold;text-align:center;">${nomStructure}</h2>
          ${renderCustomZone(configFacture!.header)}
        </div>`;
    } else {
      headerHtml = `
        <div style="text-align:center;margin-bottom:8px;">
          ${logo ? `<img src="${logo}" alt="Logo" style="max-height:50px;margin:0 auto 4px;" />` : ''}
          <h2 style="margin:0;font-size:16px;font-weight:bold;">${nomStructure}</h2>
          ${infoFacture?.adresse_complete ? `<div style="font-size:11px;">${infoFacture.adresse_complete}</div>` : ''}
          ${infoFacture?.tel_contact ? `<div style="font-size:11px;">Tél: ${infoFacture.tel_contact}</div>` : ''}
        </div>`;
    }

    // Pied de page (identique factures)
    let footerHtml = '';
    if (useCustom) {
      footerHtml = `<div style="margin-top:12px;border-top:1px solid #ccc;padding-top:8px;">${renderCustomZone(configFacture!.footer)}</div>`;
    } else {
      const footerParts: string[] = [];
      if (infoFacture?.ninea_rc) footerParts.push(infoFacture.ninea_rc);
      if (infoFacture?.compte_bancaire) footerParts.push(infoFacture.compte_bancaire);
      if (footerParts.length > 0) {
        footerHtml = `<div style="text-align:center;font-size:10px;color:#666;margin-top:12px;border-top:1px solid #ccc;padding-top:8px;">${footerParts.join(' | ')}</div>`;
      }
    }

    const articlesHtml = details.map(d => `<tr>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:11px;">${d.nom_produit}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">${d.quantite}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:11px;">${d.prix_unitaire.toLocaleString('fr-FR')}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:11px;font-weight:bold;">${d.sous_total.toLocaleString('fr-FR')}</td>
        </tr>`).join('');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>FACTURE PROFORMA</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #333; margin: 0; padding: 20px; }
  table { width: 100%; border-collapse: collapse; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 16px 0 8px; padding: 8px; background: #f8f8f8; border: 1px solid #ddd; }
  .total-row { font-weight: bold; border-top: 2px solid #333; }
  @media print { body { padding: 0; } }
</style></head><body>
  ${headerHtml}
  <div class="title">FACTURE PROFORMA</div>
  <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
    <div>
      <div style="font-size:11px;"><strong>Client:</strong> ${proforma.nom_client}</div>
      <div style="font-size:11px;"><strong>Tél:</strong> ${proforma.tel_client}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;"><strong>N°:</strong> ${proforma.num_proforma}</div>
      <div style="font-size:11px;"><strong>Date:</strong> ${formatDate(proforma.date_proforma)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="padding:4px 6px;text-align:left;font-size:11px;border-bottom:2px solid #333;">Désignation</th>
        <th style="padding:4px 6px;text-align:center;font-size:11px;border-bottom:2px solid #333;">Qté</th>
        <th style="padding:4px 6px;text-align:right;font-size:11px;border-bottom:2px solid #333;">P.U.</th>
        <th style="padding:4px 6px;text-align:right;font-size:11px;border-bottom:2px solid #333;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${articlesHtml}
    </tbody>
    <tfoot>
      ${proforma.mt_remise > 0 ? `
      <tr>
        <td colspan="3" style="padding:3px 6px;text-align:right;font-size:11px;">Sous-total:</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;">${(proforma.montant + proforma.mt_remise).toLocaleString('fr-FR')} FCFA</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:3px 6px;text-align:right;font-size:11px;color:#e65100;">Remise:</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;color:#e65100;">-${proforma.mt_remise.toLocaleString('fr-FR')} FCFA</td>
      </tr>` : ''}
      <tr class="total-row">
        <td colspan="3" style="padding:6px;text-align:right;font-size:13px;">${avecTva ? 'TOTAL HT:' : 'TOTAL:'}</td>
        <td style="padding:6px;text-align:right;font-size:13px;">${proforma.montant_net.toLocaleString('fr-FR')} FCFA</td>
      </tr>
      ${avecTva ? `
      <tr>
        <td colspan="3" style="padding:3px 6px;text-align:right;font-size:11px;">TVA (${tauxTva}%):</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;">${Math.round(proforma.montant_net * tauxTva / 100).toLocaleString('fr-FR')} FCFA</td>
      </tr>
      <tr style="border-top:2px solid #333;">
        <td colspan="3" style="padding:6px;text-align:right;font-size:13px;font-weight:bold;">TOTAL TTC:</td>
        <td style="padding:6px;text-align:right;font-size:13px;font-weight:bold;">${Math.round(proforma.montant_net * (1 + tauxTva / 100)).toLocaleString('fr-FR')} FCFA</td>
      </tr>` : ''}
    </tfoot>
  </table>
  ${footerHtml}
  <div style="text-align:center;margin-top:20px;padding:10px;border:1px dashed #999;font-size:12px;color:#555;">
    <strong>Validité :</strong> Cette proforma est valable 30 jours à compter de la date d'émission.
  </div>
</body></html>`;
  };

  const handlePrint = (format: FormatType) => {
    const html = generateProformaHTML(format);
    const iframe = printFrameRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100/50">
              <div>
                <h2 className="font-bold text-gray-900">Imprimer la proforma</h2>
                <p className="text-xs text-gray-500">{proforma.num_proforma} — {proforma.nom_client}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-4 space-y-3">
              {/* Option TVA */}
              <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={avecTva}
                  onChange={(e) => setAvecTva(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Inclure la TVA ({tauxTva}%)</p>
                  <p className="text-xs text-gray-500">Ajouter la TVA au montant total</p>
                </div>
              </label>

              <p className="text-sm font-semibold text-gray-700">Choisissez le format :</p>

              {/* Personnalisé */}
              <button
                onClick={() => handlePrint('personnalise')}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all flex items-center gap-4"
              >
                <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">Personnalisé</p>
                  <p className="text-xs text-gray-500">Votre modèle configuré dans les paramètres</p>
                </div>
                <Printer className="h-5 w-5 text-amber-400" />
              </button>

              {/* Standard */}
              <button
                onClick={() => handlePrint('standard')}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all flex items-center gap-4"
              >
                <div className="w-11 h-11 bg-gray-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <File className="h-5 w-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">Standard</p>
                  <p className="text-xs text-gray-500">Format classique FayClick</p>
                </div>
                <Printer className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Iframe cachée pour impression */}
            <iframe ref={printFrameRef} style={{ display: 'none' }} title="print-proforma-frame" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
