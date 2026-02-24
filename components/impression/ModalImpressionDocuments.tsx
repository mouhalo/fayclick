'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, FileText, Truck, RotateCcw, Receipt, Sparkles, File } from 'lucide-react';
import { FactureComplete } from '@/types/facture';
import { ConfigFacture, InfoFacture } from '@/types/auth';
import { formatAmount, formatDate } from '@/lib/utils';

type DocumentType = 'facture' | 'bl' | 'br';
type FormatType = 'personnalise' | 'standard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  facture: FactureComplete;
  comptePrive: boolean;
  configFacture?: ConfigFacture;
  infoFacture?: InfoFacture;
  logo?: string;
  nomStructure: string;
  inclureTva?: boolean;
  tauxTva?: number;
  onOpenRecu: () => void;
}

const DOCUMENT_TYPES: { id: DocumentType; label: string; icon: React.ElementType; description: string; color: string }[] = [
  { id: 'facture', label: 'Facture', icon: FileText, description: 'Document de facturation client', color: 'bg-blue-500' },
  { id: 'bl', label: 'Bon de Livraison', icon: Truck, description: 'Confirmation de livraison', color: 'bg-green-500' },
  { id: 'br', label: 'Bon de Retour', icon: RotateCcw, description: 'Retour de marchandise', color: 'bg-orange-500' },
];

const DOCUMENT_TITLES: Record<DocumentType, string> = {
  facture: 'FACTURE',
  bl: 'BON DE LIVRAISON',
  br: 'BON DE RETOUR',
};

// Champs disponibles pour le layout personnalisé
const FIELD_LABELS: Record<string, string> = {
  logo: 'Logo',
  adresse_complete: 'Adresse',
  tel_contact: 'Tél',
  email: 'Email',
  site_web: 'Web',
  compte_bancaire: 'Banque',
  ninea_rc: 'NINEA/RC',
};

export default function ModalImpressionDocuments({
  isOpen, onClose, facture, comptePrive, configFacture, infoFacture, logo, nomStructure, inclureTva = false, tauxTva = 18, onOpenRecu
}: Props) {
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatType>('personnalise');
  const [avecTva, setAvecTva] = useState(inclureTva);
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  if (!isOpen) return null;

  const { facture: f, details, resume } = facture;

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

  // Générer une zone personnalisée (header ou footer) avec flexbox
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

  // Générer le HTML du document pour impression
  const generateDocumentHTML = (docType: DocumentType, format: FormatType): string => {
    const title = DOCUMENT_TITLES[docType];
    const useCustom = format === 'personnalise' && configFacture;

    // En-tête
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

    // Pied de page
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

    // BL = uniquement désignation + qté, pas de prix
    const isBL = docType === 'bl';
    const totalQte = details.reduce((sum, d) => sum + d.quantite, 0);

    const articlesHtml = details.map(d => isBL
      ? `<tr>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:11px;">${d.nom_produit}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">${d.quantite}</td>
        </tr>`
      : `<tr>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:11px;">${d.nom_produit}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">${d.quantite}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:11px;">${d.prix.toLocaleString('fr-FR')}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:11px;font-weight:bold;">${d.sous_total.toLocaleString('fr-FR')}</td>
        </tr>`
    ).join('');

    const colCount = isBL ? 2 : 4;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title} ${f.num_facture}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 0; padding: 20px; }
  table { width: 100%; border-collapse: collapse; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 16px 0 8px; padding: 8px; background: #f8f8f8; border: 1px solid #ddd; }
  .total-row { font-weight: bold; border-top: 2px solid #333; }
  @media print { body { padding: 0; } }
</style></head><body>
  ${headerHtml}
  <div class="title">${title}</div>
  <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
    <div>
      <div style="font-size:11px;"><strong>Client:</strong> ${f.nom_client}</div>
      <div style="font-size:11px;"><strong>Tél:</strong> ${f.tel_client}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;"><strong>N°:</strong> ${f.num_facture}</div>
      <div style="font-size:11px;"><strong>Date:</strong> ${formatDate(f.date_facture)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="padding:4px 6px;text-align:left;font-size:11px;border-bottom:2px solid #333;">Désignation</th>
        <th style="padding:4px 6px;text-align:center;font-size:11px;border-bottom:2px solid #333;">Qté</th>
        ${isBL ? '' : `<th style="padding:4px 6px;text-align:right;font-size:11px;border-bottom:2px solid #333;">P.U.</th>
        <th style="padding:4px 6px;text-align:right;font-size:11px;border-bottom:2px solid #333;">Total</th>`}
      </tr>
    </thead>
    <tbody>
      ${articlesHtml}
    </tbody>
    ${isBL ? `
    <tfoot>
      <tr class="total-row">
        <td style="padding:8px 6px;font-size:13px;font-weight:bold;">Total articles livrés</td>
        <td style="padding:8px 6px;text-align:center;font-size:15px;font-weight:bold;">${totalQte}</td>
      </tr>
    </tfoot>` : `
    <tfoot>
      ${f.mt_remise > 0 ? `
      <tr>
        <td colspan="${colCount - 1}" style="padding:3px 6px;text-align:right;font-size:11px;">Sous-total:</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;">${(f.montant + f.mt_remise).toLocaleString('fr-FR')} FCFA</td>
      </tr>
      <tr>
        <td colspan="${colCount - 1}" style="padding:3px 6px;text-align:right;font-size:11px;color:#e65100;">Remise:</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;color:#e65100;">-${f.mt_remise.toLocaleString('fr-FR')} FCFA</td>
      </tr>` : ''}
      <tr class="total-row">
        <td colspan="${colCount - 1}" style="padding:6px;text-align:right;font-size:13px;">${avecTva ? 'TOTAL HT:' : 'TOTAL:'}</td>
        <td style="padding:6px;text-align:right;font-size:13px;">${f.montant.toLocaleString('fr-FR')} FCFA</td>
      </tr>
      ${avecTva ? `
      <tr>
        <td colspan="${colCount - 1}" style="padding:3px 6px;text-align:right;font-size:11px;">TVA (${tauxTva}%):</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;">${Math.round(f.montant * tauxTva / 100).toLocaleString('fr-FR')} FCFA</td>
      </tr>
      <tr style="border-top:2px solid #333;">
        <td colspan="${colCount - 1}" style="padding:6px;text-align:right;font-size:13px;font-weight:bold;">TOTAL TTC:</td>
        <td style="padding:6px;text-align:right;font-size:13px;font-weight:bold;">${Math.round(f.montant * (1 + tauxTva / 100)).toLocaleString('fr-FR')} FCFA</td>
      </tr>` : ''}
    </tfoot>`}
  </table>
  ${footerHtml}
</body></html>`;
  };

  // Imprimer via iframe caché
  const handlePrint = (docType: DocumentType, format: FormatType) => {
    const html = generateDocumentHTML(docType, format);
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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Imprimer un document</h2>
                <p className="text-xs text-gray-500">{f.num_facture} — {f.nom_client}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Bouton Reçu — toujours disponible */}
              <button
                onClick={() => { onClose(); onOpenRecu(); }}
                className="w-full p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center gap-4"
              >
                <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">Reçu de paiement</p>
                  <p className="text-xs text-gray-500">Format standard thermique</p>
                </div>
              </button>

              {/* Option TVA */}
              {comptePrive && (
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
              )}

              {/* Séparateur */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">Documents</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Documents (Facture, BL, BR) */}
              {(!selectedDoc) ? (
                // Étape 1 : Choix du document
                <div className="space-y-2">
                  {DOCUMENT_TYPES.map(doc => {
                    const Icon = doc.icon;
                    // Non compte_prive : uniquement facture standard
                    if (!comptePrive && doc.id !== 'facture') return null;
                    return (
                      <button
                        key={doc.id}
                        onClick={() => {
                          if (!comptePrive) {
                            // Impression directe standard
                            handlePrint(doc.id, 'standard');
                          } else {
                            setSelectedDoc(doc.id);
                          }
                        }}
                        className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center gap-4"
                      >
                        <div className={`w-11 h-11 ${doc.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-semibold text-gray-900">{doc.label}</p>
                          <p className="text-xs text-gray-500">{doc.description}</p>
                        </div>
                        {!comptePrive && (
                          <Printer className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Étape 2 : Choix du format (compte_prive uniquement)
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ← Retour au choix du document
                  </button>

                  <p className="text-sm font-semibold text-gray-700">
                    Format pour : {DOCUMENT_TITLES[selectedDoc]}
                  </p>

                  {/* Format personnalisé */}
                  <button
                    onClick={() => { setSelectedFormat('personnalise'); handlePrint(selectedDoc, 'personnalise'); }}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      selectedFormat === 'personnalise' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                    }`}
                  >
                    <div className="w-11 h-11 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-gray-900">Personnalisé</p>
                      <p className="text-xs text-gray-500">Votre modèle configuré dans les paramètres</p>
                    </div>
                    <Printer className="h-5 w-5 text-indigo-400" />
                  </button>

                  {/* Format standard */}
                  <button
                    onClick={() => { setSelectedFormat('standard'); handlePrint(selectedDoc, 'standard'); }}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      selectedFormat === 'standard' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
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
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Iframe cachée pour impression */}
          <iframe ref={printFrameRef} style={{ display: 'none' }} title="print-frame" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
