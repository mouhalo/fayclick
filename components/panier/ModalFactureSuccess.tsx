/**
 * Modal de succès après création de facture
 * Design glassmorphisme bleu clair avec QR Code et partage WhatsApp
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, QrCode as QrIcon, MessageCircle,
  Copy, ExternalLink, Download, ChevronDown,
  Printer, Receipt
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import QRCode from 'react-qr-code';
import { factureService } from '@/services/facture.service';
import { authService } from '@/services/auth.service';
import { encodeFactureParams } from '@/lib/url-encoder';
import { produitsService } from '@/services/produits.service';
import { useFactureSuccessStore } from '@/hooks/useFactureSuccess';
import { PaymentMethodSelector } from '@/components/factures/PaymentMethodSelector';
import { ModalPaiementQRCode } from '@/components/factures/ModalPaiementQRCode';
import { PaymentMethod, PaymentContext } from '@/types/payment-wallet';
import { AjouterAcompteData } from '@/types/facture';
import { paymentWalletService } from '@/services/payment-wallet.service';
import DatabaseService from '@/services/database.service';

// Conversion nombre en lettres (FCFA)
function nombreEnLettres(n: number): string {
  if (n === 0) return 'zéro';
  const u = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const d = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  const convert = (num: number): string => {
    if (num === 0) return '';
    if (num < 20) return u[num];
    if (num < 100) {
      const dizaine = Math.floor(num / 10);
      const unite = num % 10;
      if (dizaine === 7 || dizaine === 9) return d[dizaine] + '-' + u[10 + unite];
      if (unite === 0) return d[dizaine] + (dizaine === 8 ? 's' : '');
      if (unite === 1 && dizaine !== 8) return d[dizaine] + ' et un';
      return d[dizaine] + '-' + u[unite];
    }
    if (num < 1000) {
      const centaines = Math.floor(num / 100);
      const reste = num % 100;
      const prefix = centaines === 1 ? 'cent' : u[centaines] + ' cent';
      if (reste === 0 && centaines > 1) return prefix + 's';
      return prefix + (reste ? ' ' + convert(reste) : '');
    }
    if (num < 1000000) {
      const milliers = Math.floor(num / 1000);
      const reste = num % 1000;
      const prefix = milliers === 1 ? 'mille' : convert(milliers) + ' mille';
      return prefix + (reste ? ' ' + convert(reste) : '');
    }
    const millions = Math.floor(num / 1000000);
    const reste = num % 1000000;
    const prefix = millions === 1 ? 'un million' : convert(millions) + ' millions';
    return prefix + (reste ? ' ' + convert(reste) : '');
  };
  return convert(Math.round(n));
}

export function ModalFactureSuccess() {
  const { isOpen, factureId, closeModal } = useFactureSuccessStore();
  const { isMobile, isMobileLarge,  isDesktop } = useBreakpoint();
  const [factureDetails, setFactureDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrExpanded, setQrExpanded] = useState(false);

  // États pour la gestion des paiements
  const [showPaymentSection, setShowPaymentSection] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // États pour les modals de paiement
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Articles de la facture (pour impression)
  const [factureArticles, setFactureArticles] = useState<Array<{
    nom_produit: string;
    quantite: number;
    prix: number;
    sous_total: number;
  }>>([]);

  // Générer les URLs seulement quand les données sont disponibles
  const urls = useMemo(() => {
    // Conditions de sécurité
    if (!factureDetails || !factureId || factureId <= 0) {
      return { simple: '', encoded: '', full: '' };
    }
    
    try {
      const user = authService.getUser();
      const idStructure = user?.id_structure || factureDetails.id_structure;
      
      // Validation supplémentaire
      if (!idStructure || idStructure <= 0) {
        console.warn('ID structure invalide pour génération URL');
        return { simple: '', encoded: '', full: '' };
      }
      
      // URL simple format: /fay/{id_structure}#{id_facture}
      const simpleUrl = `/fay/${idStructure}%23${factureId}`;
      
      // URL encodée avec token
      const token = encodeFactureParams(idStructure, factureId);
      const encodedUrl = `/facture?token=${token}`;
      
      // URL complète avec domaine (utilise l'URL encodée pour être sûr)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${baseUrl}${encodedUrl}`;
      
      return { simple: simpleUrl, encoded: encodedUrl, full: fullUrl };
    } catch (error) {
      console.error('Erreur génération URLs facture:', error);
      return { simple: '', encoded: '', full: '' };
    }
  }, [factureDetails, factureId]);

  useEffect(() => {
    if (isOpen && factureId) {
      // Reset initial complet seulement à la PREMIÈRE ouverture
      if (!hasInitialized) {
        console.log('🎯 [FACTURE-SUCCESS] Initialisation complète');

        // 🏁 Reset session de paiement pour nouvelle facture
        paymentWalletService.forceEndSession();

        setPaymentError('');
        setPaymentSuccess(false);
        setSelectedPaymentMethod(null);
        setShowPaymentSection(true);
        setShowQRCodeModal(false); // Reset initial uniquement
        setPaymentLoading(false);
        setHasInitialized(true);
      } else {
        console.log('🔄 [FACTURE-SUCCESS] Rechargement - préservation états QR');
      }

      loadFactureDetails();
    } else if (!isOpen) {
      // Reset pour la prochaine ouverture
      setHasInitialized(false);
    }
  }, [isOpen, factureId, hasInitialized]);

  const loadFactureDetails = async () => {
    if (!factureId) return;
    
    try {
      setLoading(true);
      setError(null);
      const details = await factureService.getFactureDetails(factureId);
      setFactureDetails(details);

      // Charger les articles de la facture
      try {
        const articlesQuery = `
          SELECT p.nom_produit, d.quantite, d.prix, (d.prix * d.quantite) as sous_total
          FROM public.detail_facture_com d
          INNER JOIN public.produit_service p ON d.id_produit = p.id_produit
          WHERE d.id_facture = ${factureId}
          ORDER BY d.id_detail
        `;
        const articlesResult = await DatabaseService.query(articlesQuery);
        setFactureArticles(articlesResult || []);
      } catch (err) {
        console.warn('Articles facture non disponibles:', err);
        setFactureArticles([]);
      }

      // Actualiser les produits après création de facture
      try {
        await produitsService.getListeProduits({});
        console.log('✅ Stocks actualisés après création de facture');
      } catch (error) {
        console.error('Erreur actualisation produits:', error);
      }
    } catch (err: any) {
      console.error('Erreur chargement détails facture:', err);
      setError(err.message || 'Impossible de charger les détails');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!urls.full) {
      console.warn('URL non disponible pour copie');
      return;
    }
    try {
      await navigator.clipboard.writeText(urls.full);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Erreur copie URL:', err);
    }
  };

  const handleWhatsAppShare = () => {
    if (!factureDetails) return;
    
    const phoneNumber = factureDetails.tel_client || '771234567';
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const senegalPhone = cleanPhone.startsWith('221') ? cleanPhone : `221${cleanPhone}`;
    
    const message = encodeURIComponent(
      `🧾 *Facture ${factureDetails.num_facture}*\n\n` +
      `💰 Montant: ${factureDetails.montant?.toLocaleString('fr-FR')} FCFA\n` +
      `${factureDetails.mt_remise > 0 ? `🎁 Remise: ${factureDetails.mt_remise?.toLocaleString('fr-FR')} FCFA\n` : ''}` +
      `${factureDetails.mt_acompte > 0 ? `✅ Acompte: ${factureDetails.mt_acompte?.toLocaleString('fr-FR')} FCFA\n` : ''}` +
      `📊 *Reste à payer: ${factureDetails.mt_restant?.toLocaleString('fr-FR')} FCFA*\n\n` +
      `🔗 Voir la facture:\n${urls.full || 'URL en cours de génération...'}\n\n` +
      `_Merci pour votre confiance !_`
    );
    
    window.open(`https://wa.me/${senegalPhone}?text=${message}`, '_blank');
  };

  // Logique de paiement - Fonction principale
  const handlePaymentAction = async (method: PaymentMethod) => {
    if (!factureDetails || factureDetails.mt_restant <= 0) return;

    setPaymentError('');
    setSelectedPaymentMethod(method);

    if (method === 'CASH') {
      await processCashPayment();
    } else {
      // Paiement wallet - ouvrir le modal QR Code
      setShowQRCodeModal(true);
    }
  };

  // Traitement du paiement cash (solde complet)
  const processCashPayment = async () => {
    if (!factureDetails) return;

    setPaymentLoading(true);
    setPaymentError('');

    try {
      const user = authService.getUser();
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Générer transaction_id pour paiement cash
      const generateCashTransactionId = (): string => {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        return `CASH-${factureDetails.id_structure}-${day}${month}${year}${hours}${minutes}`;
      };

      const transactionId = generateCashTransactionId();
      const acompteData: AjouterAcompteData = {
        id_structure: factureDetails.id_structure,
        id_facture: factureDetails.id_facture,
        montant_acompte: factureDetails.mt_restant, // Solde complet
        transaction_id: transactionId,
        uuid: 'face2face',
        mode_paiement: 'CASH',
        telephone: factureDetails.tel_client || '000000000'
      };

      console.log('💰 [CASH-SUCCESS] Encaissement facture avec:', {
        transaction_id: acompteData.transaction_id,
        uuid: acompteData.uuid,
        montant: acompteData.montant_acompte,
        mode_paiement: acompteData.mode_paiement,
        telephone: acompteData.telephone,
        facture: factureDetails.num_facture
      });

      const response = await factureService.addAcompte(acompteData);

      if (response.success) {
        setPaymentSuccess(true);
        setShowPaymentSection(false);

        // Actualiser les détails de la facture
        await loadFactureDetails();

        console.log('✅ [CASH-SUCCESS] Facture entièrement payée');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du paiement cash';
      setPaymentError(errorMessage);
      console.error('❌ [CASH-ERROR]:', errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Gérer le succès du paiement wallet
  const handleWalletPaymentComplete = async (paymentStatusResponse: any) => {
    if (!factureDetails || !selectedPaymentMethod) return;

    try {
      console.log('🔄 [WALLET-SUCCESS] Traitement paiement wallet réussi:', paymentStatusResponse);

      // Extraire UUID et transaction_id depuis la réponse
      let uuid = '';
      let transaction_id = '';

      if (paymentStatusResponse?.data?.uuid) {
        uuid = paymentStatusResponse.data.uuid;
      }

      if (paymentStatusResponse?.data?.reference_externe) {
        transaction_id = paymentStatusResponse.data.reference_externe;
      }

      console.log('💳 [WALLET-SUCCESS] Données extraites:', {
        uuid,
        transaction_id,
        status: paymentStatusResponse?.data?.statut
      });

      if (!uuid || !transaction_id) {
        console.error('❌ [WALLET-ERROR] Données manquantes:', { uuid, transaction_id });
        throw new Error('Données de paiement incomplètes (UUID ou transaction_id manquant)');
      }

      // Ajouter l'acompte avec les données de paiement wallet
      const acompteData: AjouterAcompteData = {
        id_structure: factureDetails.id_structure,
        id_facture: factureDetails.id_facture,
        montant_acompte: factureDetails.mt_restant, // Solde complet
        transaction_id: transaction_id,
        uuid: uuid,
        mode_paiement: selectedPaymentMethod as 'CASH' | 'WAVE' | 'OM',
        telephone: factureDetails.tel_client || '000000000'
      };

      console.log('💾 [WALLET-SUCCESS] Enregistrement solde avec:', acompteData);

      const response = await factureService.addAcompte(acompteData);

      if (response.success) {
        setShowQRCodeModal(false);
        setPaymentSuccess(true);
        setShowPaymentSection(false);

        // Actualiser les détails de la facture
        await loadFactureDetails();

        console.log('✅ [WALLET-SUCCESS] Facture entièrement payée');
      }
    } catch (error: unknown) {
      console.error('❌ [WALLET-ERROR] Erreur enregistrement:', error);
      setShowQRCodeModal(false);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'enregistrement du paiement wallet';
      setPaymentError(errorMessage);
    }
  };

  // Gérer l'échec du paiement wallet
  const handleWalletPaymentFailed = (error: string) => {
    console.error('❌ [WALLET-FAILED] Échec du paiement wallet:', error);
    setShowQRCodeModal(false);
    setPaymentError(error);
  };

  // Créer le contexte de paiement pour les modals wallet
  const createPaymentContext = (): PaymentContext | null => {
    if (!factureDetails) return null;

    return {
      facture: {
        id_facture: factureDetails.id_facture,
        num_facture: factureDetails.num_facture,
        nom_client: factureDetails.nom_client_payeur,
        tel_client: factureDetails.tel_client,
        montant_total: factureDetails.montant,
        montant_restant: factureDetails.mt_restant,
        nom_structure: factureDetails.nom_structure
      },
      montant_acompte: factureDetails.mt_restant // Solde complet
    };
  };

  // Imprimer la facture format A4
  const handlePrintFacture = () => {
    if (!factureDetails) return;

    const structure = authService.getStructureDetails();
    const user = authService.getUser();
    const dateFormatee = new Date(factureDetails.date_facture).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const sousTotal = factureDetails.montant || 0;
    const remise = factureDetails.mt_remise || 0;
    const acompte = factureDetails.mt_acompte || 0;
    const restant = factureDetails.mt_restant || 0;
    const montantNet = sousTotal - remise;

    // URL absolue pour le filigrane
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const filigraneUrl = `${baseUrl}/images/fond_card_facture.png`;
    const logoFayclick = `${baseUrl}/images/logofayclick.png`;

    const factureHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture ${factureDetails.num_facture}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', 'Segoe UI', sans-serif;
            max-width: 800px; margin: 0 auto; padding: 0; color: #1e293b;
            position: relative; min-height: 100vh;
          }

          /* Filigrane centré */
          .watermark {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.06; z-index: 0; pointer-events: none;
          }
          .watermark img { width: 500px; height: auto; }

          .content { position: relative; z-index: 1; padding: 20px 25px; }

          /* Bande supérieure décorative */
          .top-band {
            background: linear-gradient(135deg, #0ea5e9, #0284c7, #0369a1);
            height: 6px; border-radius: 0 0 4px 4px; margin-bottom: 15px;
          }

          /* Header */
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
          .logo-section {}
          .logo-section img { max-width: 80px; max-height: 50px; margin-bottom: 8px; border-radius: 8px; }
          .logo-section h2 { color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
          .logo-section p { color: #64748b; font-size: 11px; margin-top: 2px; }
          .facture-badge { text-align: right; }
          .facture-badge .type-label {
            display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7);
            color: white; padding: 8px 24px; border-radius: 8px;
            font-size: 20px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
          }
          .facture-badge .num-facture {
            display: block; margin-top: 10px; font-size: 13px; font-weight: 600;
            color: #0284c7; background: #f0f9ff; padding: 6px 14px; border-radius: 6px;
            border: 1px solid #bae6fd; display: inline-block;
          }
          .facture-badge .date { color: #64748b; font-size: 12px; margin-top: 8px; }

          /* Ligne séparatrice élégante */
          .divider {
            height: 1px; background: linear-gradient(to right, transparent, #cbd5e1, transparent);
            margin: 10px 0;
          }

          /* Client */
          .client-section { display: flex; gap: 20px; margin-bottom: 15px; }
          .client-card {
            flex: 1; background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border-radius: 10px; padding: 14px;
            border: 1px solid #bae6fd; position: relative; overflow: hidden;
          }
          .client-card::before {
            content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
            background: linear-gradient(to bottom, #0ea5e9, #0284c7);
          }
          .client-card h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #0284c7; font-weight: 700; margin-bottom: 10px; }
          .client-card .name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .client-card .tel { font-size: 13px; color: #475569; }

          /* Tableau articles */
          table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 10px; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
          thead th {
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: white; padding: 10px 10px; font-size: 11px;
            text-transform: uppercase; letter-spacing: 1px; font-weight: 600;
          }
          thead th:first-child { text-align: left; padding-left: 14px; }
          thead th:nth-child(2) { text-align: center; }
          thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
          thead th:last-child { padding-right: 14px; }
          tbody td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
          tbody td:first-child { padding-left: 14px; font-weight: 500; color: #1e293b; }
          tbody td:nth-child(2) { text-align: center; color: #64748b; }
          tbody td:nth-child(3) { text-align: right; color: #64748b; }
          tbody td:nth-child(4) { text-align: right; font-weight: 700; color: #0f172a; padding-right: 14px; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody tr:hover { background: #f0f9ff; }

          /* Totaux */
          .totaux-container { display: flex; justify-content: flex-end; margin-bottom: 10px; }
          .totaux-box { width: 320px; }
          .totaux-row { display: flex; justify-content: space-between; padding: 5px 16px; font-size: 13px; }
          .totaux-row .label { color: #64748b; }
          .totaux-row .value { font-weight: 600; color: #1e293b; }
          .totaux-row.remise .value { color: #16a34a; }
          .totaux-row.net {
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            color: white; border-radius: 8px; padding: 8px 16px;
            font-size: 15px; font-weight: 700; margin-top: 4px;
          }
          .totaux-row.net .label, .totaux-row.net .value { color: white; }
          .totaux-row.restant {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border-radius: 6px; padding: 6px 16px; margin-top: 4px;
            font-weight: 700; color: #92400e;
          }
          .totaux-row.restant .label, .totaux-row.restant .value { color: #92400e; }

          /* Arrêté */
          .arrete {
            text-align: center; padding: 10px 16px;
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border-radius: 8px; border: 1px dashed #7dd3fc; margin-bottom: 12px;
          }
          .arrete .montant { font-size: 12px; font-weight: 700; color: #0369a1; }
          .arrete .lettres { font-size: 10px; font-style: italic; color: #0284c7; margin-top: 2px; }

          /* Signature */
          .signature {
            text-align: right; margin-bottom: 15px; padding-right: 20px;
          }
          .signature .role { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
          .signature .name { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .signature .line { width: 180px; height: 1px; background: #cbd5e1; margin: 5px 0 4px auto; }

          /* Footer */
          .footer {
            text-align: center; padding: 10px 0;
            border-top: 1px solid #e2e8f0;
          }
          .footer .powered { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px; }
          .footer .powered img { height: 16px; }
          .footer .powered span { font-size: 10px; color: #94a3b8; font-weight: 500; }
          .footer .date-gen { font-size: 9px; color: #94a3b8; }
          @media print { body { padding: 0; } .watermark { position: fixed; } }
        </style>
      </head>
      <body>
        <!-- Filigrane -->
        <div class="watermark"><img src="${filigraneUrl}" alt="" /></div>

        <div class="content">
          <div class="top-band"></div>

          <div class="header">
            <div class="logo-section">
              ${structure?.logo ? `<img src="${structure.logo}" alt="Logo" />` : ''}
              <h2>${structure?.nom_structure || 'Entreprise'}</h2>
              <p>${structure?.adresse || ''}</p>
              <p>Tel: ${user?.telephone || structure?.telephone || ''}</p>
            </div>
            <div class="facture-badge">
              <span class="type-label">Facture</span>
              <br/>
              <span class="num-facture">${factureDetails.num_facture}</span>
              <p class="date">${dateFormatee}</p>
            </div>
          </div>

          <div class="divider"></div>

          <div class="client-section">
            <div class="client-card">
              <h4>Facture a</h4>
              <div class="name">${factureDetails.nom_client_payeur || factureDetails.nom_client || 'Client anonyme'}</div>
              <div class="tel">${factureDetails.tel_client || ''}</div>
            </div>
          </div>

          ${factureArticles.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Designation</th>
                  <th style="width: 10%;">Qte</th>
                  <th style="width: 20%;">Prix Unit.</th>
                  <th style="width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${factureArticles.map(a => `
                  <tr>
                    <td>${a.nom_produit}</td>
                    <td>${a.quantite}</td>
                    <td>${a.prix.toLocaleString('fr-FR')} F</td>
                    <td>${a.sous_total.toLocaleString('fr-FR')} F</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div style="padding: 18px; background: #f8fafc; border-radius: 10px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #475569; font-size: 13px;">${factureDetails.description || 'Facture commerciale'}</p>
            </div>
          `}

          <div class="totaux-container">
            <div class="totaux-box">
              <div class="totaux-row">
                <span class="label">Sous-total</span>
                <span class="value">${sousTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              ${remise > 0 ? `
                <div class="totaux-row remise">
                  <span class="label">Remise</span>
                  <span class="value">-${remise.toLocaleString('fr-FR')} FCFA</span>
                </div>
              ` : ''}
              <div class="totaux-row net">
                <span class="label">MONTANT NET</span>
                <span class="value">${montantNet.toLocaleString('fr-FR')} FCFA</span>
              </div>
              ${acompte > 0 ? `
                <div class="totaux-row">
                  <span class="label">Acompte verse</span>
                  <span class="value">${acompte.toLocaleString('fr-FR')} FCFA</span>
                </div>
              ` : ''}
              ${restant > 0 ? `
                <div class="totaux-row restant">
                  <span class="label">RESTE A PAYER</span>
                  <span class="value">${restant.toLocaleString('fr-FR')} FCFA</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="arrete">
            <div class="montant">Arrete la presente facture a la somme de: ${montantNet.toLocaleString('fr-FR')} FCFA</div>
            <div class="lettres">(${nombreEnLettres(montantNet)} francs CFA)</div>
          </div>

          <div class="signature">
            <div class="line"></div>
            <div class="role">Le Caissier</div>
            <div class="name">${user?.username || 'Caissier'}</div>
          </div>

          <div class="footer">
            <div class="powered">
              <img src="${logoFayclick}" alt="FayClick" />
              <span>Powered by FayClick</span>
            </div>
            <div class="date-gen">Document genere le ${new Date().toLocaleString('fr-FR')}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printViaIframe(factureHTML);
  };

  // Imprimer la facture format ticket/carnet compact
  const handlePrintFactureTicket = () => {
    if (!factureDetails) return;

    const structure = authService.getStructureDetails();
    const user = authService.getUser();
    const dateFormatee = new Date(factureDetails.date_facture).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    const sousTotal = factureDetails.montant || 0;
    const remise = factureDetails.mt_remise || 0;
    const acompte = factureDetails.mt_acompte || 0;
    const restant = factureDetails.mt_restant || 0;
    const montantNet = sousTotal - remise;

    const ticketBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const ticketFiligraneUrl = `${ticketBaseUrl}/images/fond_card_facture.png`;
    const ticketLogoFayclick = `${ticketBaseUrl}/images/logofayclick.png`;

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture ${factureDetails.num_facture}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', sans-serif; font-size: 11px;
            padding: 12px; max-width: 300px; margin: 0 auto;
            position: relative; color: #1e293b;
          }
          .watermark {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0.05; z-index: 0; pointer-events: none;
          }
          .watermark img { width: 200px; }
          .content { position: relative; z-index: 1; }
          .center { text-align: center; }
          .separator { border-top: 1px dashed #94a3b8; margin: 8px 0; }
          .separator-double { border-top: 2px solid #0284c7; margin: 8px 0; }
          .header { text-align: center; margin-bottom: 8px; }
          .header h2 { font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
          .header p { font-size: 9px; color: #64748b; margin-top: 1px; }
          .badge-facture {
            display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7);
            color: white; padding: 4px 16px; border-radius: 4px;
            font-size: 12px; font-weight: 800; letter-spacing: 2px; margin: 6px 0 2px;
          }
          .num-ticket { font-size: 10px; color: #0284c7; font-weight: 600; }
          .info-line { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10px; }
          .info-line .label { color: #64748b; }
          .info-line .val { font-weight: 600; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 5px 3px; border-bottom: 1.5px solid #1e293b; color: #475569; font-weight: 700; }
          th:nth-child(1) { width: 8%; text-align: center; }
          th:nth-child(2) { width: 50%; }
          th:nth-child(3) { width: 21%; text-align: right; }
          th:nth-child(4) { width: 21%; text-align: right; }
          td { font-size: 10px; padding: 4px 3px; border-bottom: 1px dotted #e2e8f0; }
          td:nth-child(1) { text-align: center; color: #64748b; }
          td:nth-child(2) { font-weight: 500; }
          td:nth-child(3) { text-align: right; color: #64748b; }
          td:nth-child(4) { text-align: right; font-weight: 700; }
          .total-section { margin-top: 6px; }
          .total-line { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
          .total-line .label { color: #64748b; }
          .total-line .val { font-weight: 600; }
          .total-line.grand {
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            color: white; padding: 8px 10px; border-radius: 6px;
            font-size: 13px; font-weight: 800; margin-top: 5px;
          }
          .total-line.grand .label, .total-line.grand .val { color: white; }
          .total-line.restant {
            background: #fef3c7; padding: 5px 10px; border-radius: 4px; margin-top: 4px;
            font-weight: 700; color: #92400e;
          }
          .total-line.restant .label, .total-line.restant .val { color: #92400e; }
          .footer { text-align: center; margin-top: 10px; }
          .footer .caissier { font-size: 9px; color: #64748b; margin-bottom: 6px; }
          .footer .caissier strong { color: #1e293b; }
          .footer .merci { font-size: 10px; font-weight: 600; color: #0284c7; margin-bottom: 4px; }
          .footer .powered { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 4px; }
          .footer .powered img { height: 12px; }
          .footer .powered span { font-size: 8px; color: #94a3b8; }
          .footer .date-gen { font-size: 8px; color: #94a3b8; margin-top: 3px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="watermark"><img src="${ticketFiligraneUrl}" alt="" /></div>
        <div class="content">
          <div class="header">
            <h2>${structure?.nom_structure || 'Entreprise'}</h2>
            <p>${structure?.adresse || ''}</p>
            <p>Tel: ${user?.telephone || structure?.telephone || ''}</p>
          </div>

          <div class="separator-double"></div>

          <div class="center">
            <span class="badge-facture">FACTURE</span>
            <div class="num-ticket">${factureDetails.num_facture}</div>
          </div>

          <div class="separator"></div>

          <div class="info-line"><span class="label">Date</span><span class="val">${dateFormatee}</span></div>
          <div class="info-line"><span class="label">Client</span><span class="val">${factureDetails.nom_client_payeur || factureDetails.nom_client || 'Anonyme'}</span></div>
          <div class="info-line"><span class="label">Tel</span><span class="val">${factureDetails.tel_client || ''}</span></div>

          <div class="separator"></div>

          ${factureArticles.length > 0 ? `
            <table>
              <thead>
                <tr><th>Qt</th><th>Designation</th><th>PU</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${factureArticles.map(a => `
                  <tr>
                    <td>${a.quantite}</td>
                    <td>${a.nom_produit}</td>
                    <td>${a.prix.toLocaleString('fr-FR')}</td>
                    <td>${a.sous_total.toLocaleString('fr-FR')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="total-section">
            <div class="total-line"><span class="label">Sous-total</span><span class="val">${sousTotal.toLocaleString('fr-FR')} F</span></div>
            ${remise > 0 ? `<div class="total-line"><span class="label">Remise</span><span class="val" style="color:#16a34a;">-${remise.toLocaleString('fr-FR')} F</span></div>` : ''}
            <div class="total-line grand"><span class="label">NET A PAYER</span><span class="val">${montantNet.toLocaleString('fr-FR')} F</span></div>
            ${acompte > 0 ? `<div class="total-line"><span class="label">Acompte</span><span class="val">${acompte.toLocaleString('fr-FR')} F</span></div>` : ''}
            ${restant > 0 ? `<div class="total-line restant"><span class="label">RESTE</span><span class="val">${restant.toLocaleString('fr-FR')} F</span></div>` : ''}
          </div>

          <div class="separator"></div>

          <div class="footer">
            <div class="caissier">Caissier: <strong>${user?.username || 'Caissier'}</strong></div>
            <div class="merci">Merci pour votre confiance !</div>
            <div class="powered">
              <img src="${ticketLogoFayclick}" alt="FayClick" />
              <span>Powered by FayClick</span>
            </div>
            <div class="date-gen">${new Date().toLocaleString('fr-FR')}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printViaIframe(ticketHTML);
  };

  // Méthode robuste d'impression via iframe caché (compatible mobile)
  const printViaIframe = (htmlContent: string) => {
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
      frameDoc.write(htmlContent);
      frameDoc.close();

      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('Impression iframe echouee:', e);
            window.print();
          }
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      };
    } else {
      window.print();
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('facture-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `QR_${factureDetails?.num_facture || 'facture'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  // Styles adaptatifs selon le breakpoint
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        container: 'max-w-xs',
        padding: 'p-3',
        headerPadding: 'p-4',
        contentPadding: 'p-4',
        titleSize: 'text-lg',
        subtitleSize: 'text-xs',
        qrSize: 120,
        buttonPadding: 'py-3',
        iconSize: 'w-4 h-4'
      };
    } else if (isMobileLarge) {
      return {
        container: 'max-w-sm',
        padding: 'p-4',
        headerPadding: 'p-5',
        contentPadding: 'p-5',
        titleSize: 'text-xl',
        subtitleSize: 'text-sm',
        qrSize: 150,
        buttonPadding: 'py-3.5',
        iconSize: 'w-5 h-5'
      };
    } else {
      return {
        container: 'max-w-md',
        padding: 'p-4',
        headerPadding: 'p-6',
        contentPadding: 'p-6',
        titleSize: 'text-xl',
        subtitleSize: 'text-sm',
        qrSize: 200,
        buttonPadding: 'py-4',
        iconSize: 'w-5 h-5'
      };
    }
  };

  const styles = getResponsiveStyles();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center ${styles.padding}`}
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              bg-gradient-to-br from-sky-100/95 via-sky-50/95 to-white/95
              backdrop-blur-xl rounded-3xl w-full ${styles.container}
              shadow-2xl border border-sky-200/50
              overflow-hidden max-h-[90vh] overflow-y-auto
            `}
          >
            {/* Header avec effet glassmorphisme */}
            <div className={`
              bg-gradient-to-r from-sky-400/90 to-sky-500/90 
              backdrop-blur-lg ${styles.headerPadding} text-white relative overflow-hidden
            `}>
              {/* Pattern décoratif */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }} />
              </div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center`}>
                    <CheckCircle className={isMobile ? 'w-5 h-5' : 'w-7 h-7'} />
                  </div>
                  <div>
                    <h2 className={`${styles.titleSize} font-bold`}>
                      {paymentSuccess
                        ? 'Facture payée !'
                        : factureDetails?.mt_restant <= 0
                          ? 'Facture soldée !'
                          : 'Facture créée !'
                      }
                    </h2>
                    <p className={`text-sky-100 ${styles.subtitleSize}`}>
                      {paymentSuccess
                        ? 'Paiement enregistré'
                        : factureDetails?.mt_restant <= 0
                          ? 'Entièrement payée'
                          : 'Prête à partager'
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors`}
                >
                  <X className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                </button>
              </div>
            </div>

            {/* Boutons Impression - sous le header, alignés à droite */}
            {factureDetails && !loading && (
              <div className={`flex items-center justify-end gap-2 ${isMobile ? 'px-4 pt-3' : 'px-6 pt-4'}`}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrintFacture}
                  className={`${isMobile ? 'w-9 h-9' : 'w-10 h-10'} bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all`}
                  title="Imprimer la facture (A4)"
                >
                  <Printer className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePrintFactureTicket}
                  className={`${isMobile ? 'w-9 h-9' : 'w-10 h-10'} bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all`}
                  title="Imprimer format ticket"
                >
                  <Receipt className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
                </motion.button>
              </div>
            )}

            {/* Contenu */}
            <div className={styles.contentPadding}>
              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12">
                  <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} border-3 border-sky-500 border-t-transparent rounded-full animate-spin`} />
                </div>
              ) : error ? (
                <div className="text-center py-6 sm:py-8 text-red-600">
                  <p className={isMobile ? 'text-sm' : 'text-base'}>{error}</p>
                </div>
              ) : factureDetails ? (
                <>
                  {/* Informations facture */}
                  <div className={`bg-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-sky-100`}>
                    <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Numéro</span>
                      <span className={`font-bold text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>{factureDetails.num_facture}</span>
                    </div>
                    
                    <div className={`flex items-center justify-between ${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Client</span>
                      <span className={`font-medium text-gray-800 ${isMobile ? 'text-sm' : 'text-base'} text-right flex-1 ml-2`} style={{ wordBreak: 'break-word' }}>
                        {factureDetails.nom_client_payeur}
                      </span>
                    </div>
                    
                    <div className={`border-t border-sky-100 ${isMobile ? 'pt-3' : 'pt-4'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-gray-700`}>Reste à payer</span>
                        <span className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-sky-600`}>
                          {factureDetails.mt_restant?.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section Paiement - Seulement si montant restant > 0 */}
                  {factureDetails.mt_restant > 0 && showPaymentSection && (
                    <div className={`bg-gradient-to-br from-emerald-50/60 to-green-50/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-emerald-100`}>
                      <div className={`text-center ${isMobile ? 'mb-3' : 'mb-4'}`}>
                        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-emerald-800 mb-1`}>
                          Encaisser maintenant
                        </h3>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-600`}>
                          Choisissez votre mode de paiement
                        </p>
                      </div>

                      <PaymentMethodSelector
                        onMethodAction={handlePaymentAction}
                        onCancel={() => setShowPaymentSection(false)}
                        montant={factureDetails.mt_restant}
                        size={isMobile ? 'sm' : 'md'}
                        disabled={paymentLoading}
                      />

                      {/* Messages d'erreur de paiement */}
                      {paymentError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className={`text-red-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {paymentError}
                          </p>
                        </div>
                      )}

                      {/* Message de succès de paiement */}
                      {paymentSuccess && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className={`text-emerald-700 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            ✅ Facture entièrement payée !
                          </p>
                        </div>
                      )}

                      {/* Loader de paiement */}
                      {paymentLoading && (
                        <div className="mt-3 flex items-center justify-center">
                          <div className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-2`} />
                          <span className={`text-emerald-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            Traitement du paiement...
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message si facture déjà soldée */}
                  {factureDetails.mt_restant <= 0 && (
                    <div className={`bg-gradient-to-br from-emerald-50/60 to-green-50/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-5'} mb-4 sm:mb-6 border border-emerald-100`}>
                      <div className="text-center">
                        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2`}>
                          <CheckCircle className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-emerald-600`} />
                        </div>
                        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-bold text-emerald-800 mb-1`}>
                          Facture soldée
                        </h3>
                        <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-emerald-600`}>
                          Cette facture a été entièrement payée
                        </p>
                      </div>
                    </div>
                  )}

                  {/* QR Code Section Repliable */}
                  <div className={`bg-gradient-to-br from-sky-50/60 to-white/60 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-3' : 'p-6'} mb-4 sm:mb-6 border border-sky-100`}>
                    {/* Header avec toggle */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setQrExpanded(!qrExpanded)}
                        className="flex items-center gap-2 font-semibold text-gray-800 hover:text-sky-600 transition-colors flex-1 text-left"
                      >
                        <QrIcon className={`${styles.iconSize} text-sky-600`} />
                        <span className={isMobile ? 'text-sm' : 'text-base'}>QR Code de paiement</span>
                        <motion.div
                          animate={{ rotate: qrExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className={`${styles.iconSize} text-gray-500`} />
                        </motion.div>
                      </button>
                      {qrExpanded && (
                        <button
                          onClick={handleDownloadQR}
                          className="text-sky-600 hover:text-sky-700 transition-colors ml-2"
                          title="Télécharger QR Code"
                        >
                          <Download className={styles.iconSize} />
                        </button>
                      )}
                    </div>
                    
                    {/* Section QR repliable avec animation */}
                    <AnimatePresence>
                      {qrExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className={`bg-white ${isMobile ? 'p-3' : 'p-4'} rounded-xl flex items-center justify-center mt-3`}>
                            {urls.full ? (
                              <QRCode
                                id="facture-qr-code"
                                value={urls.full}
                                size={styles.qrSize}
                                level="H"
                                fgColor="#0284c7"
                                bgColor="#ffffff"
                              />
                            ) : (
                              <div className={`flex items-center justify-center ${isMobile ? 'h-[120px]' : 'h-[200px]'} text-gray-400`}>
                                <p className="text-sm">Génération QR code...</p>
                              </div>
                            )}
                          </div>
                          
                          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 text-center mt-2`}>
                            Scannez pour accéder à la facture
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Instructions quand fermé */}
                    {!qrExpanded && (
                      <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-500 text-center mt-1`}>
                        Appuyez pour afficher le QR code
                      </p>
                    )}
                  </div>

                  {/* Boutons d'action */}
                  <div className={`space-y-${isMobile ? '2' : '3'}`}>
                    {/* WhatsApp */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWhatsAppShare}
                      className={`
                        w-full bg-gradient-to-r from-green-500 to-green-600
                        text-white font-semibold ${styles.buttonPadding} rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      <MessageCircle className={styles.iconSize} />
                      {isMobile ? 'WhatsApp' : 'Partager sur WhatsApp'}
                    </motion.button>

                    {/* Copier URL */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyUrl}
                      className={`
                        w-full bg-white/60 backdrop-blur-sm border-2 border-sky-200
                        text-sky-700 font-semibold ${styles.buttonPadding} rounded-xl
                        hover:bg-white/80 transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      {copiedUrl ? (
                        <>
                          <CheckCircle className={styles.iconSize} />
                          {isMobile ? 'Copié !' : 'URL copiée !'}
                        </>
                      ) : (
                        <>
                          <Copy className={styles.iconSize} />
                          Copier le lien
                        </>
                      )}
                    </motion.button>

                    {/* Voir facture */}
                    <motion.button
                      whileHover={{ scale: isDesktop ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => urls.full && window.open(urls.full, '_blank')}
                      disabled={!urls.full}
                      className={`
                        w-full bg-sky-100/60 backdrop-blur-sm
                        text-sky-700 font-medium ${isMobile ? 'py-2.5' : 'py-3'} rounded-xl
                        hover:bg-sky-100/80 transition-all
                        flex items-center justify-center gap-2 sm:gap-3
                        ${isMobile ? 'text-sm' : 'text-base'}
                      `}
                    >
                      <ExternalLink className={isMobile ? 'w-4 h-4' : 'w-4 h-4'} />
                      Voir la facture
                    </motion.button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal de paiement QR Code pour les wallets */}
      {factureDetails && selectedPaymentMethod && selectedPaymentMethod !== 'CASH' && (
        <ModalPaiementQRCode
          isOpen={showQRCodeModal}
          onClose={() => setShowQRCodeModal(false)}
          paymentMethod={selectedPaymentMethod}
          paymentContext={createPaymentContext()!}
          onPaymentComplete={handleWalletPaymentComplete}
          onPaymentFailed={handleWalletPaymentFailed}
        />
      )}
    </AnimatePresence>
  );
}