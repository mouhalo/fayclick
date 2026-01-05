/**
 * Modal d'affichage d'une facture pour prestataires de services
 * Design compact et light avec boutons Partager/Imprimer
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  FileText,
  User,
  Phone,
  Share2,
  Printer,
  CreditCard,
  Loader2,
  QrCode,
  Copy,
  CheckCircle,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  PenTool
} from 'lucide-react';
import { ModalSignature } from '@/components/ui/ModalSignature';
import { jsPDF } from 'jspdf';
import QRCodeLib from 'qrcode';
import { authService } from '@/services/auth.service';
import { FactureComplete } from '@/types/facture';
import { nombreEnLettres } from '@/lib/nombre-en-lettres';
import { encodeFactureParams } from '@/lib/url-encoder';

interface ModalFacturePrestataireProps {
  isOpen: boolean;
  onClose: () => void;
  facture: FactureComplete | null;
  onAjouterPaiement?: () => void;
}

export function ModalFacturePrestataire({
  isOpen,
  onClose,
  facture,
  onAjouterPaiement
}: ModalFacturePrestataireProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // États pour signature manuscrite
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // États pour le flip card QR Code
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [urlPublique, setUrlPublique] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);

  // Générer QR Code et URL publique quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && facture) {
      generateQrCode();
    }
    // Reset flip state when modal closes
    if (!isOpen) {
      setIsFlipped(false);
    }
  }, [isOpen, facture]);

  const generateQrCode = async () => {
    if (!facture) return;

    setLoadingQr(true);
    try {
      const { facture: factureData } = facture;

      // Encodage sécurisé de l'ID structure et facture
      const token = encodeFactureParams(
        factureData.id_structure,
        factureData.id_facture
      );

      // Construction de l'URL publique
      const baseUrl = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : 'https://v2.fayclick.net';

      const url = `${baseUrl}/facture?token=${token}`;
      setUrlPublique(url);

      // Génération du QR Code
      const qrData = await QRCodeLib.toDataURL(url, {
        width: 180,
        margin: 2,
        color: {
          dark: '#1e40af', // Couleur bleue
          light: '#ffffff'
        }
      });

      setQrCodeData(qrData);
    } catch (error) {
      console.error('Erreur génération QR:', error);
    } finally {
      setLoadingQr(false);
    }
  };

  // Copier l'URL publique
  const copyUrl = async () => {
    if (!urlPublique) return;

    try {
      await navigator.clipboard.writeText(urlPublique);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback pour navigateurs anciens
      const textArea = document.createElement('textarea');
      textArea.value = urlPublique;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Partage WhatsApp avec lien public
  const shareWhatsAppPublic = () => {
    if (!urlPublique || !facture) return;
    const { facture: factureData } = facture;

    const message = encodeURIComponent(
      `*Facture N° ${factureData.num_facture}*\n` +
      `Montant: ${(factureData.montant || 0).toLocaleString('fr-FR')} FCFA\n\n` +
      `📄 Voir la facture: ${urlPublique}`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // Ouvrir URL publique
  const openPublicUrl = () => {
    if (!urlPublique) return;
    window.open(urlPublique, '_blank');
  };

  if (!isOpen || !facture) return null;

  const { facture: factureData, details, details_produits } = facture;

  // Utiliser details ou details_produits selon ce qui est disponible
  const servicesDetails = details || details_produits || [];

  // Calculs des montants
  const montantNet = factureData.montant || 0;
  const acompte = factureData.mt_acompte || 0;
  const resteAPayer = factureData.mt_restant || (montantNet - acompte);

  // Formatage
  const formatMontant = (montant: number | undefined | null) =>
    `${(montant || 0).toLocaleString('fr-FR')} F`;

  const formatTelephone = (tel: string) => {
    if (!tel) return '';
    const cleaned = tel.replace(/\D/g, '');
    if (cleaned.length === 9) {
      return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
    }
    return tel;
  };

  // Partage WhatsApp
  const shareWhatsApp = () => {
    const message = encodeURIComponent(
      `*Facture N° ${factureData.num_facture}*\n\n` +
      `Client: ${factureData.nom_client}\n` +
      `Tel: ${factureData.tel_client}\n` +
      `Date: ${new Date(factureData.date_facture).toLocaleDateString('fr-FR')}\n\n` +
      `Montant: ${formatMontant(montantNet)}\n` +
      `Acompte: ${formatMontant(acompte)}\n` +
      `Reste: ${formatMontant(resteAPayer)}\n\n` +
      `_Facture générée par FayClick_`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
    setShowShareModal(false);
  };

  // Helper pour charger une image en base64
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      console.log('Fetch CORS failed, trying Image approach...');
    }

    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Génération PDF format carnet A5
  const generatePDF = async () => {
    setIsGeneratingPdf(true);

    const formatMontantPDF = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    try {
      const structure = authService.getStructureDetails();
      const user = authService.getUser();

      const dateFormatee = new Date(factureData.date_facture).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Préparer les items (services)
      const allItems = servicesDetails.map(item => ({
        qte: item.quantite || 1,
        designation: item.nom_produit || item.designation || 'Service',
        pu: item.prix || item.prix_unitaire || 0,
        total: item.sous_total || ((item.prix || item.prix_unitaire || 0) * (item.quantite || 1))
      }));

      // Créer le PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;
      let yPos = margin;

      // Couleurs
      const blueColor: [number, number, number] = [30, 64, 175];
      const grayColor: [number, number, number] = [100, 100, 100];
      const blackColor: [number, number, number] = [0, 0, 0];

      // FACTURE box (right side)
      pdf.setFillColor(...blueColor);
      pdf.rect(pageWidth - 45, yPos, 35, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FACTURE', pageWidth - 40, yPos + 5.5);

      // Numéro facture
      pdf.setDrawColor(...blueColor);
      pdf.setFillColor(232, 240, 254);
      pdf.rect(pageWidth - 50, yPos + 10, 40, 6, 'FD');
      pdf.setTextColor(...blueColor);
      pdf.setFontSize(8);
      pdf.text(`N° ${factureData.num_facture}`, pageWidth - 48, yPos + 14);

      // Logo CENTRE
      if (structure?.logo) {
        try {
          const logoBase64 = await loadImageAsBase64(structure.logo);
          if (logoBase64) {
            const logoWidth = 20;
            const logoHeight = 12;
            const logoX = (pageWidth - logoWidth) / 2;
            pdf.addImage(logoBase64, 'PNG', logoX, yPos, logoWidth, logoHeight);
          }
        } catch (e) {
          console.log('Logo non chargé:', e);
        }
      }

      // Header - Nom structure (gauche)
      pdf.setFontSize(14);
      pdf.setTextColor(...blueColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(structure?.nom_structure || 'Entreprise', margin, yPos + 5);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...grayColor);
      const telAffiche = user?.telephone || structure?.telephone || '';
      pdf.text(`Tel: ${telAffiche}`, margin, yPos + 10);
      if (structure?.adresse) {
        pdf.text(structure.adresse, margin, yPos + 14);
      }

      yPos += 25;

      // Ligne séparatrice
      pdf.setDrawColor(...blueColor);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);

      yPos += 5;

      // Infos client
      pdf.setTextColor(...blueColor);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Date: ${dateFormatee}`, margin, yPos);
      pdf.text(`Client: ${factureData.nom_client}`, margin + 40, yPos);

      yPos += 5;
      pdf.text(`Tel: ${factureData.tel_client}`, margin, yPos);

      yPos += 8;

      // Tableau des services
      const colWidths = [12, 60, 25, 25];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const tableX = (pageWidth - tableWidth) / 2;

      pdf.setFillColor(...blueColor);
      pdf.rect(tableX, yPos, tableWidth, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');

      let xPos = tableX + 2;
      pdf.text('QTE', xPos + 3, yPos + 4.5);
      xPos += colWidths[0];
      pdf.text('DESIGNATION', xPos + 2, yPos + 4.5);
      xPos += colWidths[1];
      pdf.text('P. UNIT.', xPos + 2, yPos + 4.5);
      xPos += colWidths[2];
      pdf.text('P. TOTAL', xPos + 2, yPos + 4.5);

      yPos += 7;

      // Lignes du tableau
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      allItems.forEach((item, index) => {
        const rowHeight = 6;
        const isEven = index % 2 === 0;

        if (isEven) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(tableX, yPos, tableWidth, rowHeight, 'F');
        }

        pdf.setDrawColor(200, 200, 200);
        pdf.rect(tableX, yPos, tableWidth, rowHeight, 'S');

        pdf.setTextColor(...blackColor);
        let xPos = tableX + 2;

        pdf.text(item.qte.toString(), xPos + 5, yPos + 4);
        xPos += colWidths[0];

        const designation = item.designation.length > 35 ? item.designation.substring(0, 35) + '...' : item.designation;
        pdf.text(designation, xPos + 2, yPos + 4);
        xPos += colWidths[1];

        pdf.text(`${formatMontantPDF(item.pu)} F`, xPos + 2, yPos + 4);
        xPos += colWidths[2];

        pdf.setFont('helvetica', 'bold');
        pdf.text(`${formatMontantPDF(item.total)} F`, xPos + 2, yPos + 4);
        pdf.setFont('helvetica', 'normal');

        yPos += rowHeight;
      });

      // Ligne MONTANT TOTAL
      pdf.setFillColor(...blueColor);
      pdf.rect(tableX, yPos, tableWidth, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MONTANT TOTAL', tableX + colWidths[0] + colWidths[1] - 5, yPos + 5);
      pdf.text(`${formatMontantPDF(montantNet)} F`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 5);

      yPos += 12;

      // Section totaux en dessous
      const totalsX = tableX + colWidths[0] + colWidths[1];

      // Acompte
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(34, 139, 34); // Vert
      pdf.text('Acompte:', totalsX, yPos);
      pdf.text(`${formatMontantPDF(acompte)} F`, totalsX + colWidths[2] + 2, yPos);

      // Reste
      yPos += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(resteAPayer > 0 ? 220 : 34, resteAPayer > 0 ? 53 : 139, resteAPayer > 0 ? 69 : 34);
      pdf.text('RESTANT:', totalsX, yPos);
      pdf.text(`${formatMontantPDF(resteAPayer)} F`, totalsX + colWidths[2] + 2, yPos);

      yPos += 10;

      // Footer - Arrete
      pdf.setTextColor(...grayColor);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Arrete la presente facture a la somme de: ${formatMontantPDF(montantNet)} FCFA`, margin, yPos);

      // Montant en lettres
      yPos += 4;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      const montantLettres = nombreEnLettres(montantNet);
      pdf.text(`(${montantLettres} francs CFA)`, margin, yPos);

      // Responsable
      yPos += 8;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...blueColor);
      if (user?.username) {
        pdf.text(`Le Responsable: ${user.username}`, pageWidth - margin, yPos, { align: 'right' });
      }

      // Zone Signature + Cachet SUPERPOSÉS (anti-usurpation)
      yPos += 12;
      const signatureY = yPos;
      const overlayWidth = 45;
      const overlayHeight = 25;
      // Position centrée à droite
      const overlayX = pageWidth - margin - overlayWidth - 10;

      // 1. D'abord le cachet (en fond)
      if (structure?.cachet) {
        try {
          console.log('📌 [PDF] Chargement cachet:', structure.cachet);
          const cachetBase64 = await loadImageAsBase64(structure.cachet);
          console.log('📌 [PDF] Cachet base64:', cachetBase64 ? 'OK (' + cachetBase64.substring(0, 50) + '...)' : 'ÉCHEC');
          if (cachetBase64) {
            // Cachet en fond, légèrement plus grand
            pdf.addImage(cachetBase64, 'PNG', overlayX, signatureY, overlayWidth, overlayHeight);
          }
        } catch (e) {
          console.log('❌ Erreur ajout cachet PDF:', e);
        }
      }

      // 2. Puis la signature par-dessus (superposée)
      if (signatureData) {
        try {
          // Signature superposée au centre du cachet
          const sigWidth = 38;
          const sigHeight = 20;
          const sigX = overlayX + (overlayWidth - sigWidth) / 2;
          const sigY = signatureY + (overlayHeight - sigHeight) / 2;
          pdf.addImage(signatureData, 'PNG', sigX, sigY, sigWidth, sigHeight);
        } catch (e) {
          console.log('❌ Erreur ajout signature PDF:', e);
        }
      }

      // Label sous la zone superposée
      if (signatureData || structure?.cachet) {
        pdf.setFontSize(6);
        pdf.setTextColor(...grayColor);
        pdf.text('Signature & Cachet', overlayX + overlayWidth / 2, signatureY + overlayHeight + 4, { align: 'center' });
      }

      yPos += overlayHeight + 8;

      // Signature FayClick
      yPos += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...grayColor);
      pdf.text('FayClick - La Super App des Marchands', pageWidth / 2, yPos, { align: 'center' });

      // Telecharger
      pdf.save(`Facture_${factureData.num_facture}.pdf`);
      setShowShareModal(false);
    } catch (error) {
      console.error('Erreur generation PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Impression format carnet
  const handlePrint = () => {
    const structure = authService.getStructureDetails();
    const user = authService.getUser();

    const dateFormatee = new Date(factureData.date_facture).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const allItems = servicesDetails.map(item => ({
      qte: item.quantite || 1,
      designation: item.nom_produit || item.designation || 'Service',
      pu: item.prix || item.prix_unitaire || 0,
      total: item.sous_total || ((item.prix || item.prix_unitaire || 0) * (item.quantite || 1))
    }));

    const factureHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture ${factureData.num_facture}</title>
        <style>
          @page { size: A5; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 15px; max-width: 600px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          .logo-section { }
          .logo-section img { max-width: 60px; max-height: 40px; }
          .logo-section h2 { color: #1e40af; font-size: 14px; margin: 5px 0 2px 0; }
          .logo-section p { font-size: 10px; color: #666; }
          .facture-info { text-align: right; }
          .facture-info .type { background: #1e40af; color: white; padding: 4px 12px; font-weight: bold; font-size: 14px; border: 2px solid #1e40af; display: inline-block; }
          .facture-info .num { background: #e8f0fe; color: #1e40af; padding: 4px 10px; font-weight: bold; font-size: 11px; border: 1px solid #1e40af; margin-top: 5px; display: inline-block; }
          .info-row { display: flex; gap: 20px; margin-bottom: 10px; font-size: 11px; }
          .info-row strong { color: #1e40af; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #1e40af; color: white; padding: 8px 5px; font-size: 11px; text-align: center; border: 1px solid #1e40af; }
          th:nth-child(1) { width: 8%; }
          th:nth-child(2) { width: 52%; text-align: left; padding-left: 10px; }
          th:nth-child(3) { width: 20%; }
          th:nth-child(4) { width: 20%; }
          td { padding: 6px 5px; border: 1px solid #ccc; font-size: 11px; }
          td:nth-child(1) { text-align: center; }
          td:nth-child(2) { text-align: left; padding-left: 10px; }
          td:nth-child(3) { text-align: right; padding-right: 8px; }
          td:nth-child(4) { text-align: right; padding-right: 8px; font-weight: bold; }
          tr:nth-child(even) { background: #f8f9fa; }
          .total-row { background: #1e40af !important; }
          .total-row td { color: white; font-weight: bold; font-size: 12px; border-color: #1e40af; }
          .totaux { margin-top: 15px; text-align: right; }
          .totaux-row { display: flex; justify-content: flex-end; gap: 30px; padding: 4px 0; font-size: 11px; }
          .totaux-row.reste { font-weight: bold; color: ${resteAPayer > 0 ? '#dc3545' : '#228b22'}; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            ${structure?.logo ? `<img src="${structure.logo}" alt="Logo" />` : ''}
            <h2>${structure?.nom_structure || 'Entreprise'}</h2>
            <p>Tel: ${user?.telephone || structure?.telephone || ''}</p>
            ${structure?.adresse ? `<p>${structure.adresse}</p>` : ''}
          </div>
          <div class="facture-info">
            <div class="type">FACTURE</div>
            <br/>
            <div class="num">N ${factureData.num_facture}</div>
          </div>
        </div>

        <div class="info-row">
          <span><strong>Date:</strong> ${dateFormatee}</span>
          <span><strong>Client:</strong> ${factureData.nom_client}</span>
        </div>
        <div class="info-row">
          <span><strong>Tel:</strong> ${factureData.tel_client}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>QTE</th>
              <th>DESIGNATION</th>
              <th>P. UNIT.</th>
              <th>P. TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${allItems.map(item => `
              <tr>
                <td>${item.qte}</td>
                <td>${item.designation}</td>
                <td>${item.pu.toLocaleString('fr-FR')} F</td>
                <td>${item.total.toLocaleString('fr-FR')} F</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: right; padding-right: 15px;">MONTANT TOTAL</td>
              <td>${montantNet.toLocaleString('fr-FR')} F</td>
            </tr>
          </tbody>
        </table>

        <div class="totaux">
          <div class="totaux-row" style="color: #228b22;">
            <span>Acompte:</span>
            <span>${acompte.toLocaleString('fr-FR')} F CFA</span>
          </div>
          <div class="totaux-row reste">
            <span>Restant:</span>
            <span>${resteAPayer.toLocaleString('fr-FR')} F CFA</span>
          </div>
        </div>

        <div class="footer">
          <p>Arrete la presente facture a la somme de: <strong>${montantNet.toLocaleString('fr-FR')} FCFA</strong></p>
          <p style="font-style: italic; font-size: 9px; margin: 3px 0;">(${nombreEnLettres(montantNet)} francs CFA)</p>
          <p style="text-align: right; margin-top: 10px; font-weight: bold; color: #1e40af;">Le Responsable: ${user?.username || ''}</p>

          <!-- Zone Signature + Cachet SUPERPOSÉS (anti-usurpation) -->
          <div style="display: flex; justify-content: flex-end; margin: 20px 0; padding: 10px 0; border-top: 1px dashed #ccc;">
            ${(signatureData || structure?.cachet) ? `
              <div style="position: relative; width: 120px; height: 80px; text-align: center;">
                ${structure?.cachet ? `
                  <img src="${structure.cachet}" alt="Cachet" style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 100px; height: 70px; object-fit: contain; z-index: 1;" />
                ` : ''}
                ${signatureData ? `
                  <img src="${signatureData}" alt="Signature" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); width: 90px; height: 55px; object-fit: contain; z-index: 2;" />
                ` : ''}
                <p style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); font-size: 8px; color: #666; white-space: nowrap;">Signature & Cachet</p>
              </div>
            ` : ''}
          </div>

          <p style="margin-top: 8px; color: #1e40af;">FayClick - La Super App des Marchands</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(factureHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6" />
                <div>
                  <h3 className="font-bold text-lg">{factureData.num_facture}</h3>
                  <p className="text-blue-100 text-xs">
                    {new Date(factureData.date_facture).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Boutons Partager / Imprimer / Fermer */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareModal(true)}
                  className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  title="Partager"
                >
                  <Share2 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePrint}
                  className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                  title="Imprimer"
                >
                  <Printer className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-4 overflow-y-auto max-h-[calc(85vh-140px)] space-y-4">
            {/* Sections Infos Client + Détails Financiers */}
            <div className="grid grid-cols-2 gap-3">
              {/* Informations Client */}
              <div className="bg-gray-50 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Informations Client
                </h4>
                <div className="space-y-1 text-xs">
                  <p><span className="text-gray-500">Nom:</span> <span className="font-medium text-gray-800">{factureData.nom_client}</span></p>
                  <p><span className="text-gray-500">Telephone:</span> <span className="font-medium text-gray-800">{factureData.tel_client}</span></p>
                  {factureData.description && (
                    <p><span className="text-gray-500">Description:</span> <span className="font-medium text-gray-700">{factureData.description}</span></p>
                  )}
                </div>
              </div>

              {/* Détails Financiers */}
              <div className="bg-green-50 rounded-xl p-3">
                <h4 className="text-xs font-semibold text-green-600 mb-2 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  Details Financiers
                </h4>
                <div className="space-y-1 text-xs">
                  <p className="flex items-center justify-between">
                    <span className="text-gray-500">Statut:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      factureData.libelle_etat === 'PAYEE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {factureData.libelle_etat === 'PAYEE' ? 'Payee' : 'En attente'}
                    </span>
                  </p>
                  <p><span className="text-gray-500">Acompte:</span> <span className="font-medium text-green-600">{acompte.toLocaleString('fr-FR')} F CFA</span></p>
                  <p><span className="text-gray-500">Restant:</span> <span className={`font-bold ${resteAPayer > 0 ? 'text-red-600' : 'text-green-600'}`}>{resteAPayer.toLocaleString('fr-FR')} F CFA</span></p>
                </div>
              </div>
            </div>

            {/* Flip Card 3D - Tableau des services / QR Code */}
            <div
              className="relative cursor-pointer min-h-[320px]"
              style={{ perspective: '1000px' }}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <motion.div
                className="relative w-full h-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 100, damping: 15 }}
              >
                {/* Face Avant - Tableau des prestations */}
                <div
                  className="w-full min-h-[320px] bg-white rounded-xl border border-gray-200 overflow-hidden"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Detail des prestations de services ({servicesDetails.length})
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-blue-500">
                      <QrCode className="w-3 h-3" />
                      <span>Cliquez pour partager</span>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="py-2 px-2 text-center font-semibold w-12">QTE</th>
                          <th className="py-2 px-2 text-left font-semibold">DESIGNATION</th>
                          <th className="py-2 px-2 text-right font-semibold w-20">P. UNIT.</th>
                          <th className="py-2 px-2 text-right font-semibold w-20">P. TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {servicesDetails.map((item, index) => {
                          const prix = item.prix || item.prix_unitaire || 0;
                          const qte = item.quantite || 1;
                          const total = item.sous_total || (prix * qte);
                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-2 px-2 text-center border-b border-gray-100">{qte}</td>
                              <td className="py-2 px-2 text-left border-b border-gray-100 text-blue-600 font-medium">
                                {item.nom_produit || item.designation}
                              </td>
                              <td className="py-2 px-2 text-right border-b border-gray-100">
                                {prix.toLocaleString('fr-FR')} F
                              </td>
                              <td className="py-2 px-2 text-right border-b border-gray-100 font-bold">
                                {total.toLocaleString('fr-FR')} F
                              </td>
                            </tr>
                          );
                        })}
                        {/* Ligne MONTANT TOTAL */}
                        <tr className="bg-blue-600 text-white">
                          <td colSpan={3} className="py-2 px-3 text-right font-bold">
                            MONTANT TOTAL
                          </td>
                          <td className="py-2 px-2 text-right font-bold">
                            {montantNet.toLocaleString('fr-FR')} F
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Face Arrière - QR Code et Partage */}
                <div
                  className="absolute inset-0 w-full min-h-[320px] bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-xl border border-blue-200 overflow-visible"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="flex items-center justify-between p-3 bg-blue-50 border-b border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Partager la facture
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-blue-500">
                      <RotateCcw className="w-3 h-3" />
                      <span>Retourner</span>
                    </div>
                  </div>

                  <div className="p-3 space-y-3">
                    {/* QR Code */}
                    <div className="flex justify-center">
                      {loadingQr ? (
                        <div className="w-32 h-32 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                      ) : qrCodeData ? (
                        <motion.img
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          src={qrCodeData}
                          alt="QR Code Facture"
                          className="w-32 h-32 rounded-lg shadow-md border border-blue-100"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                          <QrCode className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* URL publique */}
                    <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                      <input
                        type="text"
                        value={urlPublique}
                        readOnly
                        className="flex-1 text-xs text-gray-600 bg-transparent outline-none truncate"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyUrl();
                        }}
                        className={`p-1.5 rounded-md transition-colors ${
                          copied
                            ? 'bg-green-100 text-green-600'
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Boutons de partage */}
                    <div className="grid grid-cols-3 gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          shareWhatsAppPublic();
                        }}
                        className="flex flex-col items-center gap-1 p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="text-xs font-medium">WhatsApp</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openPublicUrl();
                        }}
                        className="flex flex-col items-center gap-1 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span className="text-xs font-medium">Ouvrir</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyUrl();
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                          copied
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-500 text-white hover:bg-gray-600'
                        }`}
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-xs font-medium">Copie!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-5 h-5" />
                            <span className="text-xs font-medium">Copier</span>
                          </>
                        )}
                      </motion.button>
                    </div>

                    {/* Instruction */}
                    <p className="text-center text-xs text-gray-500">
                      Scannez ce QR code pour acceder a la facture
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Zone Signature + Cachet SUPERPOSÉS */}
            <div className="mt-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                {/* Bouton Signer */}
                <div className="flex flex-col items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSignatureModal(true)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      signatureData
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <PenTool className="w-4 h-4" />
                    {signatureData ? 'Modifier' : 'Signer'}
                  </motion.button>
                </div>

                {/* Prévisualisation superposée */}
                {(() => {
                  const structure = authService.getStructureDetails();
                  const hasCachet = structure?.cachet;
                  const hasSignature = signatureData;

                  if (!hasCachet && !hasSignature) {
                    return (
                      <div className="text-xs text-gray-400 italic">
                        Signature & Cachet apparaîtront ici
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-1 font-medium">Aperçu</p>
                      <div className="relative w-24 h-16">
                        {/* Cachet en fond */}
                        {hasCachet && (
                          <img
                            src={structure.cachet}
                            alt="Cachet"
                            className="absolute inset-0 w-full h-full object-contain z-0"
                          />
                        )}
                        {/* Signature par-dessus */}
                        {hasSignature && (
                          <img
                            src={signatureData}
                            alt="Signature"
                            className="absolute inset-0 w-full h-full object-contain z-10"
                          />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Signature & Cachet</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Footer avec bouton paiement */}
          {resteAPayer > 0 && onAjouterPaiement && (
            <div className="p-4 border-t border-gray-100">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onAjouterPaiement}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <CreditCard className="w-5 h-5" />
                Ajouter un paiement
              </motion.button>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Modal de partage */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-500" />
                  Partager la facture
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Options de partage */}
              <div className="grid grid-cols-2 gap-4">
                {/* Option PDF */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generatePDF}
                  disabled={isGeneratingPdf}
                  className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-100 hover:border-red-300 transition-all disabled:opacity-50"
                >
                  <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center p-2">
                    <Image
                      src="/images/pdf_logo.png"
                      alt="PDF"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">
                    {isGeneratingPdf ? 'Generation...' : 'Telecharger PDF'}
                  </span>
                  {isGeneratingPdf && (
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  )}
                </motion.button>

                {/* Option WhatsApp */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={shareWhatsApp}
                  className="flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-100 hover:border-green-300 transition-all"
                >
                  <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center p-2">
                    <Image
                      src="/images/whatsapp.png"
                      alt="WhatsApp"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">
                    WhatsApp
                  </span>
                </motion.button>
              </div>

              {/* Info */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Choisissez comment partager la facture {factureData.num_facture}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de signature manuscrite */}
      <ModalSignature
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={(signature) => setSignatureData(signature)}
      />
    </AnimatePresence>
  );
}

export default ModalFacturePrestataire;
