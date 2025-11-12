/**
 * Service d'impression de la liste des produits
 * Génère un document HTML avec QR codes stylés pour impression/PDF
 */

import QRCode from 'qrcode';
import { Produit } from '@/types/produit';

interface PrintProduitsOptions {
  nomStructure: string;
  produits: Produit[];
  logoStructure?: string;
}

interface ProduitAvecQR extends Produit {
  qrCodeDataUrl: string;
}

/**
 * Générer un QR code vert avec logo "F" au centre
 * @param text Contenu du QR code (nom du produit)
 * @returns Data URL du QR code en base64
 */
async function generateStyledQRCode(text: string): Promise<string> {
  try {
    // Générer QR code vert
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H', // Haute correction pour permettre le logo
      width: 150,
      color: {
        dark: '#10b981',  // Emerald-500 (vert FayClick)
        light: '#ffffff'  // Blanc
      },
      margin: 1
    });

    // Créer canvas pour ajouter logo "F"
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return qrCodeDataUrl; // Fallback sans logo
    }

    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = 150;
        canvas.height = 150;

        // Dessiner le QR code
        ctx.drawImage(img, 0, 0, 150, 150);

        // Ajouter cercle blanc au centre
        const centerX = 75;
        const centerY = 75;
        const radius = 20;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();

        // Ajouter bordure verte au cercle
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ajouter lettre "F" stylée
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', centerX, centerY);

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => {
        resolve(qrCodeDataUrl); // Fallback sans logo
      };

      img.src = qrCodeDataUrl;
    });
  } catch (error) {
    console.error('❌ Erreur génération QR code:', error);
    // Retourner un data URL vide transparent en cas d'erreur
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
}

/**
 * Grouper les produits par catégorie
 */
function grouperParCategorie(produits: ProduitAvecQR[]): Map<string, ProduitAvecQR[]> {
  const groupes = new Map<string, ProduitAvecQR[]>();

  produits.forEach(produit => {
    const categorie = produit.nom_categorie || 'Sans catégorie';

    if (!groupes.has(categorie)) {
      groupes.set(categorie, []);
    }

    groupes.get(categorie)!.push(produit);
  });

  return groupes;
}

/**
 * Générer le HTML d'impression des produits
 */
export async function generateProduitsPrintHTML(options: PrintProduitsOptions): Promise<string> {
  const { nomStructure, produits, logoStructure } = options;

  console.log('🖨️ [PRINT PRODUITS] Génération HTML pour', produits.length, 'produits');

  // Générer les QR codes pour tous les produits
  const produitsAvecQR: ProduitAvecQR[] = await Promise.all(
    produits.map(async (produit) => ({
      ...produit,
      qrCodeDataUrl: await generateStyledQRCode(produit.nom_produit)
    }))
  );

  // Grouper par catégorie
  const produitsGroupes = grouperParCategorie(produitsAvecQR);

  // Date actuelle
  const dateImpression = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Statistiques globales
  const totalProduits = produits.length;
  const totalCategories = produitsGroupes.size;
  const valeurTotaleStock = produits.reduce((sum, p) => {
    const stock = p.niveau_stock || 0;
    const prix = p.prix_vente || 0;
    return sum + (stock * prix);
  }, 0);

  // Construire le HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Liste Produits - ${nomStructure}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }

        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #10b981;
          padding-bottom: 20px;
        }

        .logo {
          max-width: 120px;
          max-height: 80px;
          margin: 0 auto 15px;
          display: block;
        }

        h1 {
          color: #10b981;
          margin: 10px 0;
          font-size: 28px;
        }

        .structure-name {
          font-size: 20px;
          font-weight: bold;
          color: #059669;
          margin: 8px 0;
        }

        .date {
          font-size: 14px;
          color: #666;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin: 30px 0;
        }

        .stat-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          padding: 15px;
          border-radius: 10px;
          text-align: center;
          border-left: 4px solid #10b981;
        }

        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #059669;
        }

        .stat-label {
          color: #666;
          font-size: 13px;
          margin-top: 5px;
        }

        .categorie-section {
          margin: 30px 0;
          page-break-inside: avoid;
        }

        .categorie-header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 12px 20px;
          border-radius: 8px 8px 0 0;
          font-size: 18px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .produits-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0 0 8px 8px;
          overflow: hidden;
        }

        .produits-table thead {
          background: #f9fafb;
        }

        .produits-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          font-size: 13px;
        }

        .produits-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
          vertical-align: middle;
        }

        .produits-table tbody tr:hover {
          background: #f9fafb;
        }

        .produits-table tbody tr:last-child td {
          border-bottom: none;
        }

        .nom-produit {
          font-weight: 600;
          color: #111827;
          font-size: 14px;
        }

        .prix {
          color: #059669;
          font-weight: 600;
          text-align: right;
          font-size: 14px;
        }

        .stock {
          text-align: center;
          font-weight: 600;
          color: #6b7280;
        }

        .stock.bas {
          color: #ef4444;
        }

        .stock.ok {
          color: #10b981;
        }

        .qr-cell {
          text-align: center;
          padding: 8px;
        }

        .qr-code {
          width: 80px;
          height: 80px;
          border: 2px dashed #d1d5db;
          border-radius: 6px;
          padding: 4px;
          background: white;
        }

        .qr-label {
          font-size: 9px;
          color: #9ca3af;
          margin-top: 4px;
          font-style: italic;
        }

        .footer {
          margin-top: 50px;
          text-align: center;
          color: #6b7280;
          font-size: 11px;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }

        .footer-logo {
          font-weight: bold;
          color: #10b981;
          margin-top: 8px;
        }

        /* Instructions de découpe */
        .instructions {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 6px;
          font-size: 13px;
          color: #92400e;
        }

        .instructions-title {
          font-weight: bold;
          color: #78350f;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        @media print {
          body {
            padding: 0;
          }

          .no-print {
            display: none;
          }

          .categorie-section {
            page-break-inside: avoid;
          }

          .produits-table {
            page-break-inside: auto;
          }

          .produits-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        ${logoStructure ? `<img src="${logoStructure}" alt="Logo" class="logo" />` : ''}
        <h1>📦 Liste des Produits</h1>
        <div class="structure-name">${nomStructure}</div>
        <div class="date">${dateImpression}</div>
      </div>

      <!-- Statistiques -->
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">${totalProduits}</div>
          <div class="stat-label">Produits</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${totalCategories}</div>
          <div class="stat-label">Catégories</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${valeurTotaleStock.toLocaleString('fr-FR')} FCFA</div>
          <div class="stat-label">Valeur Stock</div>
        </div>
      </div>

      <!-- Instructions -->
      <div class="instructions">
        <div class="instructions-title">
          ✂️ Instructions
        </div>
        <div>
          Les QR codes peuvent être découpés et collés sur vos produits.
          Chaque QR code contient le nom du produit pour un scan rapide en caisse.
        </div>
      </div>

      <!-- Produits groupés par catégorie -->
      ${Array.from(produitsGroupes.entries()).map(([categorie, produits]) => `
        <div class="categorie-section">
          <div class="categorie-header">
            🏷️ ${categorie} (${produits.length} produit${produits.length > 1 ? 's' : ''})
          </div>
          <table class="produits-table">
            <thead>
              <tr>
                <th style="width: 40%;">Nom Produit</th>
                <th style="width: 20%; text-align: right;">Prix Vente</th>
                <th style="width: 15%; text-align: center;">Qté Dispo</th>
                <th style="width: 25%; text-align: center;">QR Code</th>
              </tr>
            </thead>
            <tbody>
              ${produits.map(produit => {
                const stock = produit.niveau_stock || 0;
                const stockClass = stock < 5 ? 'bas' : 'ok';

                return `
                  <tr>
                    <td class="nom-produit">${produit.nom_produit}</td>
                    <td class="prix">${(produit.prix_vente || 0).toLocaleString('fr-FR')} FCFA</td>
                    <td class="stock ${stockClass}">${stock}</td>
                    <td class="qr-cell">
                      <img src="${produit.qrCodeDataUrl}" alt="QR ${produit.nom_produit}" class="qr-code" />
                      <div class="qr-label">Découper ici</div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}

      <!-- Footer -->
      <div class="footer">
        <div>Document généré le ${new Date().toLocaleString('fr-FR')}</div>
        <div class="footer-logo">FayClick - La Super App des Marchands</div>
      </div>
    </body>
    </html>
  `;

  console.log('✅ [PRINT PRODUITS] HTML généré avec succès');
  return html;
}

/**
 * Imprimer la liste des produits
 */
export async function printProduitsList(options: PrintProduitsOptions): Promise<boolean> {
  try {
    console.log('🖨️ [PRINT PRODUITS] Début impression...');

    // Générer le HTML
    const html = await generateProduitsPrintHTML(options);

    // Ouvrir fenêtre d'impression
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      console.error('❌ [PRINT PRODUITS] Impossible d\'ouvrir la fenêtre d\'impression');
      return false;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Attendre le chargement puis imprimer
    printWindow.onload = () => {
      printWindow.print();
    };

    console.log('✅ [PRINT PRODUITS] Impression lancée');
    return true;
  } catch (error) {
    console.error('❌ [PRINT PRODUITS] Erreur impression:', error);
    return false;
  }
}

/**
 * Options d'impression des stickers QR codes
 */
export interface PrintQRStickersOptions {
  nomStructure: string;
  produits: Produit[];
  afficherNom: boolean;
  afficherPrix: boolean;
}

/**
 * Générer le HTML pour impression de stickers QR codes (4 par ligne)
 */
export async function generateQRStickersHTML(options: PrintQRStickersOptions): Promise<string> {
  const { nomStructure, produits, afficherNom, afficherPrix } = options;

  console.log('🖨️ [PRINT QR STICKERS] Génération HTML pour', produits.length, 'stickers');
  console.log('📝 Options: nom =', afficherNom, ', prix =', afficherPrix);

  // Générer les QR codes pour tous les produits
  const produitsAvecQR: ProduitAvecQR[] = await Promise.all(
    produits.map(async (produit) => ({
      ...produit,
      qrCodeDataUrl: await generateStyledQRCode(produit.nom_produit)
    }))
  );

  // Date actuelle
  const dateImpression = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Construire le HTML pour stickers 4×n
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Stickers QR Codes - ${nomStructure}</title>
      <style>
        @page {
          size: A4;
          margin: 10mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          background: white;
          padding: 10mm;
        }

        .header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #10b981;
        }

        .header-title {
          font-size: 18px;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 4px;
        }

        .header-subtitle {
          font-size: 12px;
          color: #666;
        }

        .stickers-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8mm;
          margin-top: 15px;
        }

        .sticker {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 8px;
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          page-break-inside: avoid;
          min-height: 55mm;
          position: relative;
        }

        .sticker-qr {
          width: 100%;
          max-width: 120px;
          height: auto;
          margin: 8px auto;
        }

        .sticker-nom {
          font-size: 11px;
          font-weight: 600;
          color: #111827;
          margin: 6px 8px;
          line-height: 1.3;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
          max-height: 3em;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .sticker-prix {
          font-size: 13px;
          font-weight: bold;
          color: #10b981;
          margin-top: 4px;
          padding: 4px 8px;
          background: white;
          border-radius: 6px;
          border: 1px solid #10b981;
        }

        .sticker-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #10b981;
          color: white;
          font-size: 9px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 10px;
          color: #9ca3af;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
        }

        .footer-logo {
          font-weight: bold;
          color: #10b981;
          margin-top: 5px;
        }

        .instructions {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 12px;
          margin: 15px 0;
          border-radius: 6px;
          font-size: 11px;
          color: #92400e;
        }

        .instructions strong {
          color: #78350f;
          display: block;
          margin-bottom: 5px;
        }

        @media print {
          body {
            padding: 0;
          }

          .no-print {
            display: none;
          }

          .sticker {
            page-break-inside: avoid;
          }

          @page {
            margin: 10mm;
          }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="header-title">🏷️ Stickers QR Codes - ${nomStructure}</div>
        <div class="header-subtitle">${dateImpression} • ${produitsAvecQR.length} sticker${produitsAvecQR.length > 1 ? 's' : ''}</div>
      </div>

      <!-- Instructions -->
      <div class="instructions">
        <strong>✂️ Instructions de découpe :</strong>
        Découpez chaque sticker le long des lignes pointillées et collez-les sur vos produits.
        Chaque QR code contient ${afficherNom ? 'le nom' : 'l\'identifiant'} du produit pour un scan rapide en caisse.
      </div>

      <!-- Grille de stickers 4×n -->
      <div class="stickers-grid">
        ${produitsAvecQR.map((produit, index) => `
          <div class="sticker">
            <div class="sticker-badge">#${index + 1}</div>
            <img src="${produit.qrCodeDataUrl}" alt="QR ${produit.nom_produit}" class="sticker-qr" />
            ${afficherNom ? `<div class="sticker-nom">${produit.nom_produit}</div>` : ''}
            ${afficherPrix ? `<div class="sticker-prix">${(produit.prix_vente || 0).toLocaleString('fr-FR')} FCFA</div>` : ''}
          </div>
        `).join('')}
      </div>

      <!-- Footer -->
      <div class="footer">
        <div>Stickers générés le ${new Date().toLocaleString('fr-FR')}</div>
        <div class="footer-logo">FayClick - La Super App des Marchands</div>
      </div>
    </body>
    </html>
  `;

  console.log('✅ [PRINT QR STICKERS] HTML généré avec succès');
  return html;
}

/**
 * Imprimer les stickers QR codes
 */
export async function printQRStickers(options: PrintQRStickersOptions): Promise<boolean> {
  try {
    console.log('🖨️ [PRINT QR STICKERS] Début impression stickers...');

    // Générer le HTML
    const html = await generateQRStickersHTML(options);

    // Ouvrir fenêtre d'impression
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      console.error('❌ [PRINT QR STICKERS] Impossible d\'ouvrir la fenêtre d\'impression');
      return false;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Attendre le chargement puis imprimer
    printWindow.onload = () => {
      printWindow.print();
    };

    console.log('✅ [PRINT QR STICKERS] Impression lancée');
    return true;
  } catch (error) {
    console.error('❌ [PRINT QR STICKERS] Erreur impression:', error);
    return false;
  }
}
