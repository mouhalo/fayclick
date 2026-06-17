/**
 * Modal Impression Bon de Commande — A4 (Personnalisé / Standard)
 *
 * FR-024 : Titre "BON DE COMMANDE" + mention "Document interne — non comptable"
 * Calque sur ModalImpressionProforma avec adaptations BC :
 *  - Données fournisseur (au lieu de client)
 *  - cout_revient (au lieu de prix_unitaire)
 *  - Couleur thématique sky
 */

'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Sparkles, File } from 'lucide-react';
import { ConfigFacture, InfoFacture } from '@/types/auth';
import {
  BonCommande,
  BonCommandeDetail,
  BonCommandeFournisseurEnrichi,
} from '@/types/bon-commande';
import { Produit } from '@/types/produit';
import { produitsService } from '@/services/produits.service';
import { formatDate } from '@/lib/utils';
import { BonCommandeStatusBadge } from './BonCommandeStatusBadge';

type FormatType = 'personnalise' | 'standard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bonCommande: BonCommande;
  details: BonCommandeDetail[];
  fournisseur?: BonCommandeFournisseurEnrichi | null;
  configFacture?: ConfigFacture;
  infoFacture?: InfoFacture;
  logo?: string;
  nomStructure: string;
}

export function ModalImpressionBonCommande({
  isOpen,
  onClose,
  bonCommande,
  details,
  fournisseur,
  configFacture,
  infoFacture,
  logo,
  nomStructure,
}: Props) {
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [produits, setProduits] = useState<Produit[]>([]);

  // Charger le catalogue produits pour renseigner la colonne Réf. (code-barres) par id_produit
  useEffect(() => {
    if (!isOpen) return;
    produitsService.getListeProduits()
      .then(res => setProduits(res.data || []))
      .catch(() => setProduits([]));
  }, [isOpen]);

  if (!isOpen) return null;

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

  const renderCustomZone = (zone: ConfigFacture['header'] | ConfigFacture['footer']): string => {
    const positions = ['gauche', 'centre', 'droite'] as const;
    const alignMap = { gauche: 'left', centre: 'center', droite: 'right' };
    const justifyMap = { gauche: 'flex-start', centre: 'center', droite: 'flex-end' };

    const cells = positions
      .map((pos) => {
        const fields = zone[pos];
        const content = fields.map((f) => renderField(f)).filter(Boolean).join('<br/>');
        return `<div style="flex:1;text-align:${alignMap[pos]};display:flex;flex-direction:column;align-items:${justifyMap[pos]};padding:4px 8px;">${content}</div>`;
      })
      .join('');

    return `<div style="display:flex;width:100%;">${cells}</div>`;
  };

  const generateBCHTML = (format: FormatType, produitsForLookup: Produit[]): string => {
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

    // Articles : Qté | Désignation | P.U. Achat | Remise | Total
    const articlesHtml = details
      .map((d) => {
        const totalLigne = d.sous_total ?? d.cout_revient * d.quantite;
        const prod = produitsForLookup.find((p) => p.id_produit === d.id_produit);
        return `<tr>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">${d.quantite}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:11px;color:#555;">${prod?.code_barre || '—'}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;font-size:11px;">${d.nom_produit_snap}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:11px;">${d.cout_revient.toLocaleString('fr-FR')}</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:center;font-size:11px;">—</td>
          <td style="padding:3px 6px;border-bottom:1px solid #eee;text-align:right;font-size:11px;font-weight:bold;">${totalLigne.toLocaleString('fr-FR')}</td>
        </tr>`;
      })
      .join('');

    const sousTotal = bonCommande.montant_net + (bonCommande.mt_remise || 0);

    // Bloc fournisseur
    const nomFournisseur =
      fournisseur?.nom_fournisseur || bonCommande.nom_fournisseur_snap || '—';
    const telFournisseur =
      fournisseur?.tel_fournisseur || bonCommande.tel_fournisseur_snap || '';
    const emailFournisseur = fournisseur?.email_fournisseur || '';
    const adresseFournisseur = fournisseur?.adresse || '';
    const nineaFournisseur = fournisseur?.ninea || '';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>BON DE COMMANDE</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; color: #333; margin: 0; padding: 20px; }
  table { width: 100%; border-collapse: collapse; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 16px 0 4px; padding: 8px; background: #e0f2fe; border: 1px solid #7dd3fc; color: #075985; }
  .subtitle { text-align: center; font-size: 10px; color: #64748b; font-style: italic; margin-bottom: 12px; }
  .total-row { font-weight: bold; border-top: 2px solid #333; }
  .badge-statut { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; color: white; }
  .badge-BROUILLON { background: #64748b; }
  .badge-CONFIRME { background: #3b82f6; }
  .badge-LIVRE { background: #10b981; }
  .badge-ANNULE { background: #ef4444; }
  @media print { body { padding: 0; } }
</style></head><body>
  ${headerHtml}
  <div class="title">BON DE COMMANDE</div>
  <div class="subtitle">Document interne — non comptable</div>

  <div style="display:flex;justify-content:space-between;margin-bottom:12px;gap:12px;">
    <div style="flex:1;border:1px solid #e2e8f0;padding:8px;border-radius:4px;background:#f8fafc;">
      <div style="font-size:10px;color:#64748b;margin-bottom:4px;text-transform:uppercase;">Fournisseur</div>
      <div style="font-size:12px;font-weight:bold;">${nomFournisseur}</div>
      ${telFournisseur ? `<div style="font-size:11px;">Tél: ${telFournisseur}</div>` : ''}
      ${emailFournisseur ? `<div style="font-size:11px;">Email: ${emailFournisseur}</div>` : ''}
      ${adresseFournisseur ? `<div style="font-size:11px;">${adresseFournisseur}</div>` : ''}
      ${nineaFournisseur ? `<div style="font-size:10px;color:#64748b;">NINEA: ${nineaFournisseur}</div>` : ''}
    </div>
    <div style="text-align:right;min-width:160px;">
      <div style="font-size:11px;"><strong>N°:</strong> ${bonCommande.num_bc}</div>
      <div style="font-size:11px;"><strong>Date:</strong> ${formatDate(bonCommande.date_bon_commande)}</div>
      <div style="margin-top:6px;"><span class="badge-statut badge-${bonCommande.libelle_etat}">${bonCommande.libelle_etat}</span></div>
    </div>
  </div>

  ${bonCommande.description ? `<div style="font-size:11px;margin-bottom:8px;padding:6px 8px;background:#f8fafc;border-left:3px solid #0ea5e9;"><strong>Description :</strong> ${bonCommande.description}</div>` : ''}

  <table>
    <thead>
      <tr style="background:#f0f9ff;">
        <th style="padding:4px 6px;text-align:center;font-size:11px;border-bottom:2px solid #075985;width:60px;">Qté</th>
        <th style="padding:4px 6px;text-align:left;font-size:11px;border-bottom:2px solid #075985;">Réf.</th>
        <th style="padding:4px 6px;text-align:left;font-size:11px;border-bottom:2px solid #075985;">Désignation</th>
        <th style="padding:4px 6px;text-align:right;font-size:11px;border-bottom:2px solid #075985;">P.U. Achat</th>
        <th style="padding:4px 6px;text-align:center;font-size:11px;border-bottom:2px solid #075985;width:70px;">Remise</th>
        <th style="padding:4px 6px;text-align:right;font-size:11px;border-bottom:2px solid #075985;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${articlesHtml}
    </tbody>
    <tfoot>
      ${
        bonCommande.mt_remise > 0
          ? `
      <tr>
        <td colspan="5" style="padding:3px 6px;text-align:right;font-size:11px;">Sous-total :</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;">${sousTotal.toLocaleString('fr-FR')} FCFA</td>
      </tr>
      <tr>
        <td colspan="5" style="padding:3px 6px;text-align:right;font-size:11px;color:#e65100;">Remise globale :</td>
        <td style="padding:3px 6px;text-align:right;font-size:11px;color:#e65100;">−${bonCommande.mt_remise.toLocaleString('fr-FR')} FCFA</td>
      </tr>`
          : ''
      }
      <tr class="total-row">
        <td colspan="5" style="padding:6px;text-align:right;font-size:13px;">TOTAL HT :</td>
        <td style="padding:6px;text-align:right;font-size:13px;">${bonCommande.montant_net.toLocaleString('fr-FR')} FCFA</td>
      </tr>
    </tfoot>
  </table>

  ${footerHtml}

  <div style="text-align:center;margin-top:20px;padding:10px;border:1px dashed #94a3b8;font-size:11px;color:#475569;">
    Bon de commande émis le ${formatDate(bonCommande.date_creation)} — Document interne sans valeur comptable.
  </div>
</body></html>`;
  };

  const handlePrint = async (format: FormatType) => {
    // Garantir que le catalogue est chargé avant impression (sinon colonne Réf. vide)
    let prods = produits;
    if (prods.length === 0) {
      try {
        const res = await produitsService.getListeProduits();
        prods = res.data || [];
        setProduits(prods);
      } catch {
        prods = [];
      }
    }
    const html = generateBCHTML(format, prods);
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
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-sky-50 to-sky-100/50">
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900">Imprimer le bon de commande</h2>
                <p className="text-xs text-gray-500 truncate">
                  {bonCommande.num_bc} —{' '}
                  {fournisseur?.nom_fournisseur || bonCommande.nom_fournisseur_snap || '—'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Statut :</span>
                <BonCommandeStatusBadge statut={bonCommande.libelle_etat} size="sm" />
              </div>

              <p className="text-sm font-semibold text-gray-700">Choisissez le format :</p>

              {/* Personnalisé */}
              <button
                onClick={() => handlePrint('personnalise')}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all flex items-center gap-4"
              >
                <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">Personnalisé</p>
                  <p className="text-xs text-gray-500">Modèle configuré dans vos paramètres</p>
                </div>
                <Printer className="h-5 w-5 text-sky-400" />
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
            <iframe ref={printFrameRef} style={{ display: 'none' }} title="print-bc-frame" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
