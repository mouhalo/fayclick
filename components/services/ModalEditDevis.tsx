/**
 * Modal d'édition d'un devis existant
 * Sections: Client, Date, Services, Équipements, Récapitulatif
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  FileText,
  User,
  Phone,
  MapPin,
  Wrench,
  Package,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Calculator,
  Calendar,
  Share2,
  Printer,
  ClipboardList
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { Service, DevisLigneService, LigneEquipement, DevisFormData, DevisFromDB } from '@/types/prestation';
import { prestationService } from '@/services/prestation.service';
import PopMessage from '@/components/ui/PopMessage';
import { jsPDF } from 'jspdf';
import { nombreEnLettres } from '@/lib/nombre-en-lettres';

interface ModalEditDevisProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  devisData: DevisFromDB | null;
}

export function ModalEditDevis({
  isOpen,
  onClose,
  onSuccess,
  devisData
}: ModalEditDevisProps) {
  // États du formulaire
  const [dateDevis, setDateDevis] = useState('');
  const [nomClient, setNomClient] = useState('');
  const [telClient, setTelClient] = useState('');
  const [adresseClient, setAdresseClient] = useState('');

  // Services
  const [servicesDisponibles, setServicesDisponibles] = useState<Service[]>([]);
  const [servicesSelectionnes, setServicesSelectionnes] = useState<DevisLigneService[]>([]);
  const [showServiceSelector, setShowServiceSelector] = useState(false);

  // Équipements
  const [equipements, setEquipements] = useState<LigneEquipement[]>([]);
  const [showEquipementForm, setShowEquipementForm] = useState(false);
  const [nouvelEquipement, setNouvelEquipement] = useState<Partial<LigneEquipement>>({
    designation: '',
    marque: '',
    prix_unitaire: 0,
    quantite: 1,
    total: 0
  });

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'services' | 'equipements' | null>('services');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Messages
  const [popMessage, setPopMessage] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  // Charger les services disponibles
  const loadServices = useCallback(async () => {
    setIsLoadingServices(true);
    try {
      const response = await prestationService.getListeServices();
      if (response.success) {
        setServicesDisponibles(response.data);
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  }, []);

  // Initialiser avec les données du devis
  useEffect(() => {
    if (isOpen && devisData) {
      loadServices();

      // Préremplir les données du devis
      setDateDevis(devisData.devis.date_devis.split('T')[0]);
      setNomClient(devisData.devis.nom_client_payeur || '');
      setTelClient(devisData.devis.tel_client || '');
      setAdresseClient(devisData.devis.adresse_client || '');

      // Convertir les détails_produits en services sélectionnés
      const services: DevisLigneService[] = (devisData.details_produits || []).map(prod => ({
        id_service: prod.id_produit,
        nom_service: prod.nom_produit,
        cout: prod.prix,
        quantite: prod.quantite
      }));
      setServicesSelectionnes(services);

      // Convertir les équipements
      const eqs: LigneEquipement[] = (devisData.devis.lignes_equipements || []).map(eq => ({
        designation: eq.designation,
        marque: eq.marque || '',
        prix_unitaire: eq.pu || eq.prix_unitaire || 0,
        quantite: eq.qte || eq.quantite || 1,
        total: (eq.pu || eq.prix_unitaire || 0) * (eq.qte || eq.quantite || 1)
      }));
      setEquipements(eqs);

      setExpandedSection('services');
    }
  }, [isOpen, devisData, loadServices]);

  // Calculer les totaux
  const totalServices = servicesSelectionnes.reduce(
    (sum, s) => sum + s.cout * (s.quantite || 1),
    0
  );

  const totalEquipements = equipements.reduce(
    (sum, e) => sum + e.total,
    0
  );

  const totalDevis = totalServices + totalEquipements;

  // Ajouter un service
  const handleAddService = (service: Service) => {
    if (servicesSelectionnes.some(s => s.id_service === service.id_service)) {
      showMessage('warning', 'Ce service est déjà dans la liste');
      return;
    }

    setServicesSelectionnes(prev => [
      ...prev,
      {
        id_service: service.id_service,
        nom_service: service.nom_service,
        cout: service.cout_base,
        quantite: 1
      }
    ]);
    setShowServiceSelector(false);
  };

  // Modifier le prix d'un service
  const handleUpdateServiceCout = (index: number, cout: number) => {
    setServicesSelectionnes(prev =>
      prev.map((s, i) => (i === index ? { ...s, cout } : s))
    );
  };

  // Modifier la quantité d'un service
  const handleUpdateServiceQte = (index: number, quantite: number) => {
    setServicesSelectionnes(prev =>
      prev.map((s, i) => (i === index ? { ...s, quantite: Math.max(1, quantite) } : s))
    );
  };

  // Supprimer un service
  const handleRemoveService = (index: number) => {
    setServicesSelectionnes(prev => prev.filter((_, i) => i !== index));
  };

  // Ajouter un équipement
  const handleAddEquipement = () => {
    if (!nouvelEquipement.designation || !nouvelEquipement.prix_unitaire) {
      showMessage('warning', 'Veuillez remplir la désignation et le prix');
      return;
    }

    const total = (nouvelEquipement.prix_unitaire || 0) * (nouvelEquipement.quantite || 1);

    setEquipements(prev => [
      ...prev,
      {
        designation: nouvelEquipement.designation || '',
        marque: nouvelEquipement.marque || '',
        prix_unitaire: nouvelEquipement.prix_unitaire || 0,
        quantite: nouvelEquipement.quantite || 1,
        total
      }
    ]);

    setNouvelEquipement({
      designation: '',
      marque: '',
      prix_unitaire: 0,
      quantite: 1,
      total: 0
    });
    setShowEquipementForm(false);
  };

  // Supprimer un équipement
  const handleRemoveEquipement = (index: number) => {
    setEquipements(prev => prev.filter((_, i) => i !== index));
  };

  // Afficher message
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  // Partager via WhatsApp
  const shareWhatsApp = () => {
    if (!devisData) return;

    const { devis } = devisData;
    const totalDevisActuel = totalServices + totalEquipements;

    const message = encodeURIComponent(
      `📋 *Devis ${devis.num_devis}*\n\n` +
      `👤 Client: ${nomClient || devis.nom_client_payeur}\n` +
      `📞 Tél: ${telClient || devis.tel_client}\n` +
      `📅 Date: ${new Date(dateDevis || devis.date_devis).toLocaleDateString('fr-FR')}\n\n` +
      `🛠️ Services: ${totalServices.toLocaleString('fr-FR')} F\n` +
      (totalEquipements > 0 ? `📦 Équipements: ${totalEquipements.toLocaleString('fr-FR')} F\n` : '') +
      `\n💰 *TOTAL: ${totalDevisActuel.toLocaleString('fr-FR')} F*\n\n` +
      `_Devis généré par FayClick_`
    );

    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setShowShareModal(false);
  };

  // Helper pour charger une image et la convertir en base64
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    // Méthode 1: Essayer via fetch (meilleure pour les images distantes)
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

    // Méthode 2: Essayer via Image avec crossOrigin
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
      img.onerror = () => {
        console.log('Image load failed for:', url);
        resolve(null);
      };
      img.src = url;
    });
  };

  // Générer et télécharger le PDF du devis
  const generatePDF = async () => {
    if (!devisData) return;

    setIsGeneratingPdf(true);

    // Helper pour formater les montants avec espace comme séparateur de milliers
    const formatMontant = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    try {
      const { devis } = devisData;
      const structure = authService.getStructureDetails();
      const user = authService.getUser();
      const totalDevisActuel = totalServices + totalEquipements;

      const dateFormatee = new Date(dateDevis || devis.date_devis).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Fusionner équipements + services dans un seul tableau
      const allItems: Array<{ qte: number; designation: string; pu: number; total: number }> = [];

      // D'abord les équipements
      equipements.forEach(eq => {
        allItems.push({
          qte: eq.quantite,
          designation: eq.designation + (eq.marque ? ` (${eq.marque})` : ''),
          pu: eq.prix_unitaire,
          total: eq.total
        });
      });

      // Ensuite les services
      servicesSelectionnes.forEach(s => {
        allItems.push({
          qte: s.quantite || 1,
          designation: s.nom_service,
          pu: s.cout,
          total: s.cout * (s.quantite || 1)
        });
      });

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

      // DEVIS box (right side - position fixe en haut)
      pdf.setFillColor(...blueColor);
      pdf.rect(pageWidth - 45, yPos, 35, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DEVIS', pageWidth - 38, yPos + 5.5);

      // Numéro devis
      pdf.setDrawColor(...blueColor);
      pdf.setFillColor(232, 240, 254);
      pdf.rect(pageWidth - 50, yPos + 10, 40, 6, 'FD');
      pdf.setTextColor(...blueColor);
      pdf.setFontSize(8);
      pdf.text(`N° ${devis.num_devis}`, pageWidth - 48, yPos + 14);

      // Logo CENTRÉ horizontalement (entre nom structure à gauche et DEVIS à droite)
      if (structure?.logo) {
        console.log('Logo URL:', structure.logo);
        try {
          const logoBase64 = await loadImageAsBase64(structure.logo);
          console.log('Logo base64 loaded:', logoBase64 ? 'YES (' + logoBase64.substring(0, 50) + '...)' : 'NO');
          if (logoBase64) {
            const logoWidth = 20;
            const logoHeight = 12;
            // Centrer le logo horizontalement sur la page
            const logoX = (pageWidth - logoWidth) / 2;
            pdf.addImage(logoBase64, 'PNG', logoX, yPos, logoWidth, logoHeight);
            console.log('Logo added to PDF at position:', logoX);
          } else {
            console.log('Logo base64 is null - loading failed');
          }
        } catch (e) {
          console.log('Logo non chargé:', e);
        }
      }

      // Header - Nom structure (toujours à gauche)
      pdf.setFontSize(14);
      pdf.setTextColor(...blueColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(structure?.nom_structure || 'Entreprise', margin, yPos + 5);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...grayColor);
      // Utiliser le téléphone de l'utilisateur connecté
      const telAffiche = user?.telephone || structure?.telephone || '';
      pdf.text(`Tél: ${telAffiche}`, margin, yPos + 10);
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
      pdf.text(`Client: ${nomClient || devis.nom_client_payeur}`, margin + 40, yPos);

      yPos += 5;
      pdf.text(`Tél: ${telClient || devis.tel_client}`, margin, yPos);
      if (adresseClient || devis.adresse_client) {
        pdf.text(`Adresse: ${adresseClient || devis.adresse_client}`, margin + 40, yPos);
      }

      yPos += 8;

      // Tableau des articles
      // En-tête du tableau
      const colWidths = [12, 60, 25, 25];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const tableX = (pageWidth - tableWidth) / 2;

      pdf.setFillColor(...blueColor);
      pdf.rect(tableX, yPos, tableWidth, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');

      let xPos = tableX + 2;
      pdf.text('QTÉ', xPos + 3, yPos + 4.5);
      xPos += colWidths[0];
      pdf.text('DÉSIGNATION', xPos + 2, yPos + 4.5);
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

        // QTÉ (centré)
        pdf.text(item.qte.toString(), xPos + 5, yPos + 4);
        xPos += colWidths[0];

        // DÉSIGNATION
        const designation = item.designation.length > 35 ? item.designation.substring(0, 35) + '...' : item.designation;
        pdf.text(designation, xPos + 2, yPos + 4);
        xPos += colWidths[1];

        // P. UNIT. (aligné droite)
        pdf.text(`${formatMontant(item.pu)} F`, xPos + 2, yPos + 4);
        xPos += colWidths[2];

        // P. TOTAL (aligné droite, gras)
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${formatMontant(item.total)} F`, xPos + 2, yPos + 4);
        pdf.setFont('helvetica', 'normal');

        yPos += rowHeight;
      });

      // Ligne TOTAL
      pdf.setFillColor(...blueColor);
      pdf.rect(tableX, yPos, tableWidth, 7, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MONTANT TOTAL', tableX + colWidths[0] + colWidths[1] - 5, yPos + 5);
      pdf.text(`${formatMontant(totalDevisActuel)} F`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 5);

      yPos += 12;

      // Footer - Arrêté du devis
      pdf.setTextColor(...grayColor);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Arrêté le présent devis à la somme de: ${formatMontant(totalDevisActuel)} FCFA`, margin, yPos);

      // Montant en lettres
      yPos += 4;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      const montantLettres = nombreEnLettres(totalDevisActuel);
      pdf.text(`(${montantLettres} francs CFA)`, margin, yPos);

      // Responsable (signature)
      yPos += 8;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...blueColor);
      if (user?.username) {
        pdf.text(`Le Responsable: ${user.username}`, pageWidth - margin, yPos, { align: 'right' });
      }

      // Signature FayClick
      yPos += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...grayColor);
      pdf.text('FayClick - La Super App des Marchands', pageWidth / 2, yPos, { align: 'center' });

      // Télécharger le PDF
      pdf.save(`Devis_${devis.num_devis}.pdf`);

      showMessage('success', 'PDF téléchargé avec succès');
      setShowShareModal(false);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      showMessage('error', 'Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Imprimer le devis
  const handlePrintDevis = () => {
    if (!devisData) return;

    const { devis } = devisData;
    const structure = authService.getStructureDetails();
    const user = authService.getUser();
    const totalDevisActuel = totalServices + totalEquipements;

    const dateFormatee = new Date(dateDevis || devis.date_devis).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const devisHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Devis ${devis.num_devis}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4f46e5; }
          .logo-section { text-align: left; }
          .logo-section img { max-width: 100px; max-height: 60px; margin-bottom: 8px; }
          .logo-section h2 { color: #4f46e5; margin: 0; font-size: 18px; }
          .logo-section p { color: #666; margin: 4px 0 0 0; font-size: 12px; }
          .devis-info { text-align: right; }
          .devis-info h1 { color: #4f46e5; margin: 0 0 10px 0; font-size: 24px; }
          .devis-info .num { background: #4f46e5; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; display: inline-block; }
          .devis-info .date { color: #666; margin-top: 8px; font-size: 14px; }
          .client-box { background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #4f46e5; }
          .client-box h3 { color: #4f46e5; margin: 0 0 12px 0; font-size: 16px; }
          .client-box p { margin: 6px 0; color: #444; }
          .section-title { color: #4f46e5; font-size: 16px; font-weight: bold; margin: 25px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #4f46e5; color: white; padding: 12px 10px; text-align: left; font-size: 13px; }
          th:last-child { text-align: right; }
          td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          td:last-child { text-align: right; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .totaux { margin-top: 20px; }
          .totaux-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .totaux-row.total { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; padding: 15px 20px; border-radius: 10px; font-size: 18px; font-weight: bold; margin-top: 10px; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 11px; border-top: 2px solid #e5e7eb; padding-top: 20px; }
          .footer p { margin: 4px 0; }
          .validite { background: #fef3c7; padding: 12px; border-radius: 8px; margin-top: 25px; text-align: center; color: #92400e; font-size: 12px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            ${structure?.logo ? `<img src="${structure.logo}" alt="Logo" />` : ''}
            <h2>${structure?.nom_structure || 'Entreprise'}</h2>
            <p>${structure?.adresse || ''}</p>
            <p>Tél: ${user?.telephone || structure?.telephone || ''}</p>
          </div>
          <div class="devis-info">
            <h1>📋 DEVIS</h1>
            <div class="num">${devis.num_devis}</div>
            <p class="date">${dateFormatee}</p>
          </div>
        </div>

        <div class="client-box">
          <h3>👤 Client</h3>
          <p><strong>Nom:</strong> ${nomClient || devis.nom_client_payeur}</p>
          <p><strong>Téléphone:</strong> ${telClient || devis.tel_client}</p>
          ${(adresseClient || devis.adresse_client) ? `<p><strong>Adresse:</strong> ${adresseClient || devis.adresse_client}</p>` : ''}
        </div>

        <div class="section-title">🛠️ Services (${servicesSelectionnes.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Désignation</th>
              <th style="width: 15%; text-align: center;">Qté</th>
              <th style="width: 17%; text-align: right;">Prix Unit.</th>
              <th style="width: 18%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${servicesSelectionnes.map(s => `
              <tr>
                <td>${s.nom_service}</td>
                <td style="text-align: center;">${s.quantite || 1}</td>
                <td style="text-align: right;">${s.cout.toLocaleString('fr-FR')} F</td>
                <td>${(s.cout * (s.quantite || 1)).toLocaleString('fr-FR')} F</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${equipements.length > 0 ? `
          <div class="section-title">📦 Équipements (${equipements.length})</div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Désignation</th>
                <th style="width: 15%; text-align: center;">Qté</th>
                <th style="width: 17%; text-align: right;">Prix Unit.</th>
                <th style="width: 18%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${equipements.map(e => `
                <tr>
                  <td>${e.designation}${e.marque ? ` <small>(${e.marque})</small>` : ''}</td>
                  <td style="text-align: center;">${e.quantite}</td>
                  <td style="text-align: right;">${e.prix_unitaire.toLocaleString('fr-FR')} F</td>
                  <td>${e.total.toLocaleString('fr-FR')} F</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="totaux">
          <div class="totaux-row">
            <span>Total Services</span>
            <span>${totalServices.toLocaleString('fr-FR')} F</span>
          </div>
          ${totalEquipements > 0 ? `
            <div class="totaux-row">
              <span>Total Équipements</span>
              <span>${totalEquipements.toLocaleString('fr-FR')} F</span>
            </div>
          ` : ''}
          <div class="totaux-row total">
            <span>TOTAL DEVIS</span>
            <span>${totalDevisActuel.toLocaleString('fr-FR')} F</span>
          </div>
        </div>

        <div class="validite">
          <p style="margin: 0 0 5px 0;"><strong>Arrêté le présent devis à la somme de: ${totalDevisActuel.toLocaleString('fr-FR')} FCFA</strong></p>
          <p style="margin: 0; font-style: italic; font-size: 11px;">(${nombreEnLettres(totalDevisActuel)} francs CFA)</p>
        </div>

        <div class="footer">
          <p style="text-align: right; font-weight: bold; color: #4f46e5; margin-bottom: 10px;">Le Responsable: ${user?.username || 'Responsable'}</p>
          <p>Document généré le ${new Date().toLocaleString('fr-FR')}</p>
          <p style="color: #4f46e5; font-weight: bold; margin-top: 8px;">FayClick - La Super App des Marchands</p>
        </div>
      </body>
      </html>
    `;

    // Méthode robuste avec iframe caché (compatible mobile/tablette)
    // Évite les popup blockers et les problèmes de timing
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
      frameDoc.write(devisHTML);
      frameDoc.close();

      // Attendre le chargement complet avant d'imprimer
      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('Impression iframe échouée, tentative alternative:', e);
            window.print();
          }
          // Nettoyer l'iframe après impression
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500); // Délai plus long pour mobile
      };
    } else {
      console.warn('Iframe non disponible, utilisation de window.print()');
      window.print();
    }
  };

  // Imprimer le devis format carnet sénégalais
  const handlePrintDevisCarnet = () => {
    if (!devisData) return;

    const { devis } = devisData;
    const structure = authService.getStructureDetails();
    const user = authService.getUser();
    const totalDevisActuel = totalServices + totalEquipements;

    const dateFormatee = new Date(dateDevis || devis.date_devis).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Fusionner équipements + services dans un seul tableau
    const allItems: Array<{ qte: number; designation: string; pu: number; total: number }> = [];

    // D'abord les équipements
    equipements.forEach(eq => {
      allItems.push({
        qte: eq.quantite,
        designation: eq.designation + (eq.marque ? ` (${eq.marque})` : ''),
        pu: eq.prix_unitaire,
        total: eq.total
      });
    });

    // Ensuite les services
    servicesSelectionnes.forEach(s => {
      allItems.push({
        qte: s.quantite || 1,
        designation: s.nom_service,
        pu: s.cout,
        total: s.cout * (s.quantite || 1)
      });
    });

    const devisHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Devis ${devis.num_devis}</title>
        <style>
          @page { size: A5; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; padding: 15px; max-width: 600px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
          .logo-section { }
          .logo-section img { max-width: 60px; max-height: 40px; }
          .logo-section h2 { color: #1e40af; font-size: 14px; margin: 5px 0 2px 0; }
          .logo-section p { font-size: 10px; color: #666; }
          .devis-info { text-align: right; }
          .devis-info .type { background: #1e40af; color: white; padding: 4px 12px; font-weight: bold; font-size: 14px; border: 2px solid #1e40af; display: inline-block; }
          .devis-info .num { background: #e8f0fe; color: #1e40af; padding: 4px 10px; font-weight: bold; font-size: 11px; border: 1px solid #1e40af; margin-top: 5px; display: inline-block; }
          .info-row { display: flex; gap: 20px; margin-bottom: 10px; font-size: 11px; }
          .info-row span { }
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
          .total-row td { color: white; font-weight: bold; font-size: 13px; border-color: #1e40af; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            ${structure?.logo ? `<img src="${structure.logo}" alt="Logo" />` : ''}
            <h2>${structure?.nom_structure || 'Entreprise'}</h2>
            <p>Tél: ${user?.telephone || structure?.telephone || ''}</p>
            ${structure?.adresse ? `<p>${structure.adresse}</p>` : ''}
          </div>
          <div class="devis-info">
            <div class="type">DEVIS</div>
            <br/>
            <div class="num">N° ${devis.num_devis}</div>
          </div>
        </div>

        <div class="info-row">
          <span><strong>Date:</strong> ${dateFormatee}</span>
          <span><strong>Client:</strong> ${nomClient || devis.nom_client_payeur}</span>
        </div>
        <div class="info-row">
          <span><strong>Tél:</strong> ${telClient || devis.tel_client}</span>
          ${(adresseClient || devis.adresse_client) ? `<span><strong>Adresse:</strong> ${adresseClient || devis.adresse_client}</span>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>QTÉ</th>
              <th>DÉSIGNATION</th>
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
              <td>${totalDevisActuel.toLocaleString('fr-FR')} F</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Arrêté le présent devis à la somme de: <strong>${totalDevisActuel.toLocaleString('fr-FR')} FCFA</strong></p>
          <p style="font-style: italic; font-size: 9px; margin: 3px 0;">(${nombreEnLettres(totalDevisActuel)} francs CFA)</p>
          <p style="text-align: right; margin-top: 10px; font-weight: bold; color: #1e40af;">Le Responsable: ${user?.username || ''}</p>
          <p style="margin-top: 8px; color: #1e40af;">FayClick - La Super App des Marchands</p>
        </div>
      </body>
      </html>
    `;

    // Méthode robuste avec iframe caché (compatible mobile/tablette)
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
      frameDoc.write(devisHTML);
      frameDoc.close();

      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.warn('Impression iframe échouée:', e);
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

  // Soumettre la mise à jour
  const handleSubmit = async () => {
    if (!devisData) return;

    // Validation
    if (!nomClient.trim()) {
      showMessage('warning', 'Veuillez saisir le nom du client');
      return;
    }

    if (!telClient.trim() || telClient.length < 9) {
      showMessage('warning', 'Veuillez saisir un numéro de téléphone valide (9 chiffres)');
      return;
    }

    if (servicesSelectionnes.length === 0) {
      showMessage('warning', 'Veuillez ajouter au moins un service');
      return;
    }

    setIsLoading(true);

    try {
      const formData: DevisFormData = {
        date_devis: dateDevis,
        nom_client: nomClient.trim(),
        tel_client: telClient.replace(/\s/g, ''),
        adresse_client: adresseClient.trim(),
        montant_services: totalServices,
        lignes_services: servicesSelectionnes,
        lignes_equipements: equipements
      };

      const response = await prestationService.updateDevis(devisData.devis.id_devis, formData);

      if (response.success) {
        showMessage('success', 'Devis mis à jour avec succès');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        showMessage('error', response.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour devis:', error);
      showMessage('error', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  // Formatage
  const formatMontant = (montant: number | undefined | null) =>
    `${(montant || 0).toLocaleString('fr-FR')} F`;

  if (!isOpen || !devisData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-5 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Devis {devisData.devis.num_devis}
                </h3>
                <p className="text-indigo-200 text-sm mt-1">Modification</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenu scrollable */}
          <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
            {/* Section Date et Client */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-500" />
                  Informations
                </h4>
                {/* Boutons Partage et Impression */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowShareModal(true)}
                    className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                    title="Partager le devis"
                  >
                    <Share2 className="w-5 h-5 text-white" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePrintDevis}
                    className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                    title="Imprimer le devis"
                  >
                    <Printer className="w-5 h-5 text-white" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePrintDevisCarnet}
                    className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                    title="Imprimer format carnet"
                  >
                    <ClipboardList className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Date du devis */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Date du devis</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={dateDevis}
                      onChange={(e) => setDateDevis(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nom du client *</label>
                  <input
                    type="text"
                    value={nomClient}
                    onChange={(e) => setNomClient(e.target.value)}
                    placeholder="Ex: Amadou Diallo"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Téléphone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={telClient}
                      onChange={(e) => setTelClient(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="77 123 45 67"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Adresse</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={adresseClient}
                      onChange={(e) => setAdresseClient(e.target.value)}
                      placeholder="Ex: Dakar, Médina Rue 10"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section Services */}
            <div className="bg-orange-50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'services' ? null : 'services')}
                className="w-full p-4 flex items-center justify-between"
              >
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-orange-500" />
                  Services ({servicesSelectionnes.length})
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 font-bold">{formatMontant(totalServices)}</span>
                  {expandedSection === 'services' ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expandedSection === 'services' && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Liste des services sélectionnés */}
                      {servicesSelectionnes.map((service, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-white rounded-xl p-3 border border-orange-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{service.nom_service}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Qté:</span>
                                <input
                                  type="number"
                                  value={service.quantite || 1}
                                  onChange={(e) => handleUpdateServiceQte(index, parseInt(e.target.value) || 1)}
                                  className="w-14 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                                  min="1"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">Prix:</span>
                                <input
                                  type="number"
                                  value={service.cout}
                                  onChange={(e) => handleUpdateServiceCout(index, parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400"
                                />
                                <span className="text-xs text-gray-500">F</span>
                              </div>
                            </div>
                            <p className="text-xs text-orange-600 mt-1 font-medium">
                              Sous-total: {formatMontant(service.cout * (service.quantite || 1))}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveService(index)}
                            className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Bouton ajouter service */}
                      {!showServiceSelector ? (
                        <button
                          onClick={() => setShowServiceSelector(true)}
                          className="w-full py-3 border-2 border-dashed border-orange-300 rounded-xl text-orange-600 font-medium flex items-center justify-center gap-2 hover:bg-orange-100 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          Ajouter un service
                        </button>
                      ) : (
                        <div className="bg-white rounded-xl border border-orange-200 p-3">
                          <p className="text-sm text-gray-600 mb-2">Sélectionner un service:</p>
                          {isLoadingServices ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                            </div>
                          ) : servicesDisponibles.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-2">
                              Aucun service disponible.
                            </p>
                          ) : (
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {servicesDisponibles.map((service) => (
                                <button
                                  key={service.id_service}
                                  onClick={() => handleAddService(service)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-between"
                                >
                                  <span className="text-sm font-medium">{service.nom_service}</span>
                                  <span className="text-sm text-orange-600">{formatMontant(service.cout_base)}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setShowServiceSelector(false)}
                            className="w-full mt-2 py-2 text-sm text-gray-500 hover:text-gray-700"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section Équipements */}
            <div className="bg-purple-50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'equipements' ? null : 'equipements')}
                className="w-full p-4 flex items-center justify-between"
              >
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-500" />
                  Équipements ({equipements.length})
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-bold">{formatMontant(totalEquipements)}</span>
                  {expandedSection === 'equipements' ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {expandedSection === 'equipements' && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-xs text-purple-700 bg-purple-100 p-2 rounded-lg">
                        Les équipements sont des articles que le client devra acheter.
                        Ce montant n&apos;est pas comptabilisé dans votre chiffre d&apos;affaires.
                      </p>

                      {/* Liste des équipements */}
                      {equipements.map((equipement, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 bg-white rounded-xl p-3 border border-purple-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 text-sm">{equipement.designation}</p>
                            {equipement.marque && (
                              <p className="text-xs text-gray-500">{equipement.marque}</p>
                            )}
                            <p className="text-xs text-purple-600 mt-1">
                              {equipement.quantite} x {formatMontant(equipement.prix_unitaire)} = {formatMontant(equipement.total)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveEquipement(index)}
                            className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Formulaire ajout équipement */}
                      {!showEquipementForm ? (
                        <button
                          onClick={() => setShowEquipementForm(true)}
                          className="w-full py-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 font-medium flex items-center justify-center gap-2 hover:bg-purple-100 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          Ajouter un équipement
                        </button>
                      ) : (
                        <div className="bg-white rounded-xl border border-purple-200 p-3 space-y-3">
                          <input
                            type="text"
                            placeholder="Désignation *"
                            value={nouvelEquipement.designation}
                            onChange={(e) => setNouvelEquipement(prev => ({ ...prev, designation: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                          <input
                            type="text"
                            placeholder="Marque (optionnel)"
                            value={nouvelEquipement.marque}
                            onChange={(e) => setNouvelEquipement(prev => ({ ...prev, marque: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500">Prix unitaire *</label>
                              <input
                                type="number"
                                placeholder="Prix"
                                value={nouvelEquipement.prix_unitaire || ''}
                                onChange={(e) => setNouvelEquipement(prev => ({ ...prev, prix_unitaire: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Quantité</label>
                              <input
                                type="number"
                                placeholder="Qté"
                                value={nouvelEquipement.quantite || 1}
                                onChange={(e) => setNouvelEquipement(prev => ({ ...prev, quantite: parseInt(e.target.value) || 1 }))}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400"
                                min="1"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowEquipementForm(false)}
                              className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={handleAddEquipement}
                              className="flex-1 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Récapitulatif */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Récapitulatif
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-indigo-100">Services (main d&apos;œuvre)</span>
                  <span className="font-semibold">{formatMontant(totalServices)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-100">Équipements (achats client)</span>
                  <span className="font-semibold">{formatMontant(totalEquipements)}</span>
                </div>
                <div className="border-t border-indigo-400 pt-2 mt-2 flex justify-between text-lg">
                  <span className="font-bold">TOTAL DEVIS</span>
                  <span className="font-bold">{formatMontant(totalDevis)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer avec boutons */}
          <div className="p-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || servicesSelectionnes.length === 0}
              className="flex-1 py-3 px-4 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isLoading ? 'Mise à jour...' : 'Enregistrer'}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Messages */}
      <PopMessage
        show={popMessage.show}
        type={popMessage.type}
        title={popMessage.title}
        message={popMessage.message}
        onClose={() => setPopMessage({ ...popMessage, show: false })}
      />

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
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-cyan-500" />
                  Partager le devis
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
                  <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center p-2">
                    <Image
                      src="/images/pdf_logo.png"
                      alt="PDF"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <span className="font-semibold text-gray-800">
                    {isGeneratingPdf ? 'Génération...' : 'Télécharger PDF'}
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
                  <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center p-2">
                    <Image
                      src="/images/whatsapp.png"
                      alt="WhatsApp"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <span className="font-semibold text-gray-800">
                    WhatsApp
                  </span>
                </motion.button>
              </div>

              {/* Info */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Choisissez comment partager le devis {devisData?.devis.num_devis}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

export default ModalEditDevis;
