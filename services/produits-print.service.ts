/**
 * Service d'impression de la liste des produits
 * Optimisé pour gérer 500+ produits sans crash navigateur
 *
 * Fonctionnalités :
 * - Génération QR codes par lots (batch de 50)
 * - Pagination automatique du document imprimé
 * - Progression en temps réel
 * - Support annulation
 * - Différentes tailles d'étiquettes
 */

import QRCode from 'qrcode';
import { Produit } from '@/types/produit';
import { processBatches, estimateTimeRemaining } from '@/utils/batch-processor';
import {
  QRGenerationOptions,
  QRGenerationProgress,
  PrintPageOptions,
  PrintMetadata,
  STICKER_SIZES,
  LIST_CONFIG,
  PRINT_LIMITS,
  StickerSizeKey
} from '@/types/print';

// ============================================================================
// TYPES INTERNES
// ============================================================================

interface PrintProduitsOptions {
  nomStructure: string;
  produits: Produit[];
  logoStructure?: string;
}

export interface ProduitAvecQR extends Produit {
  qrCodeDataUrl: string;
}

export interface PrintQRStickersOptions {
  nomStructure: string;
  produits: Produit[];
  afficherNom: boolean;
  afficherPrix: boolean;
  stickerSize?: StickerSizeKey;
}

// ============================================================================
// GÉNÉRATION QR CODES
// ============================================================================

/**
 * Générer un QR code vert avec logo "F" au centre
 * @param text Contenu du QR code (nom du produit)
 * @param size Taille du QR code en pixels (default: 150)
 * @returns Data URL du QR code en base64
 */
async function generateStyledQRCode(text: string, size: number = 150): Promise<string> {
  try {
    // Générer QR code vert
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      width: size,
      color: {
        dark: '#10b981',  // Emerald-500 (vert FayClick)
        light: '#ffffff'
      },
      margin: 1
    });

    // Créer canvas pour ajouter logo "F"
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return qrCodeDataUrl;
    }

    const img = new Image();

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = size;
        canvas.height = size;

        ctx.drawImage(img, 0, 0, size, size);

        // Logo "F" au centre
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.133; // Proportionnel à la taille

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(size * 0.187)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', centerX, centerY);

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => resolve(qrCodeDataUrl);
      img.src = qrCodeDataUrl;
    });
  } catch (error) {
    console.error('❌ Erreur génération QR code:', error);
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
}

/**
 * Génère les QR codes par lots avec progression
 * Optimisé pour 500+ produits sans crash mémoire
 */
export async function generateQRCodesBatched(
  produits: Produit[],
  options: QRGenerationOptions = {}
): Promise<Map<number, string>> {
  const {
    batchSize = PRINT_LIMITS.BATCH_SIZE,
    onProgress,
    abortSignal
  } = options;

  console.log(`🖨️ [QR BATCH] Démarrage génération pour ${produits.length} produits (lots de ${batchSize})`);

  const startTime = Date.now();
  const qrMap = new Map<number, string>();

  const result = await processBatches<Produit, { id: number; qr: string }>({
    items: produits,
    batchSize,
    processItem: async (produit) => ({
      id: produit.id_produit,
      qr: await generateStyledQRCode(produit.nom_produit)
    }),
    onProgress: (processed, total, currentBatch, totalBatches) => {
      if (onProgress) {
        const elapsedMs = Date.now() - startTime;
        onProgress({
          processed,
          total,
          currentBatch,
          totalBatches,
          estimatedTimeRemaining: estimateTimeRemaining(processed, total, elapsedMs)
        });
      }
    },
    delayBetweenBatches: PRINT_LIMITS.MEMORY_RELEASE_DELAY,
    abortSignal
  });

  if (result.cancelled) {
    throw new DOMException('Génération annulée', 'AbortError');
  }

  // Construire la map des résultats
  for (const { id, qr } of result.results) {
    qrMap.set(id, qr);
  }

  console.log(`✅ [QR BATCH] Terminé: ${result.totalProcessed} QR codes en ${result.duration}ms`);
  return qrMap;
}

// ============================================================================
// GÉNÉRATION HTML PAGINÉ
// ============================================================================

/**
 * Styles CSS communs pour impression
 */
function getPrintStyles(): string {
  return `
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
      }

      /* Saut de page explicite */
      .page-break {
        page-break-after: always;
        break-after: page;
        height: 0;
        display: block;
      }

      .page-container {
        page-break-inside: avoid;
        break-inside: avoid;
        padding: 10mm;
      }

      /* Header */
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

      /* Stats */
      .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 15px 0;
      }

      .stat-card {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        padding: 10px;
        border-radius: 8px;
        text-align: center;
        border-left: 3px solid #10b981;
      }

      .stat-value {
        font-size: 18px;
        font-weight: bold;
        color: #059669;
      }

      .stat-label {
        color: #666;
        font-size: 11px;
        margin-top: 3px;
      }

      /* Grilles stickers */
      .stickers-grid-small {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4mm;
      }

      .stickers-grid-medium {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6mm;
      }

      .stickers-grid-large {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8mm;
      }

      .sticker {
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        padding: 6px;
        background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        page-break-inside: avoid;
        position: relative;
      }

      .sticker-small { min-height: 45mm; }
      .sticker-medium { min-height: 55mm; }
      .sticker-large { min-height: 70mm; }

      .sticker-qr {
        width: 100%;
        height: auto;
        margin: 4px auto;
      }

      .sticker-nom {
        font-weight: 600;
        color: #111827;
        margin: 4px 6px;
        line-height: 1.2;
        word-wrap: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .sticker-nom-small { font-size: 9px; max-height: 2.4em; }
      .sticker-nom-medium { font-size: 11px; max-height: 2.6em; }
      .sticker-nom-large { font-size: 13px; max-height: 2.8em; }

      .sticker-prix {
        font-weight: bold;
        color: #10b981;
        margin-top: 4px;
        padding: 3px 6px;
        background: white;
        border-radius: 4px;
        border: 1px solid #10b981;
      }

      .sticker-prix-small { font-size: 10px; }
      .sticker-prix-medium { font-size: 13px; }
      .sticker-prix-large { font-size: 15px; }

      .sticker-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: #10b981;
        color: white;
        font-size: 8px;
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 3px;
      }

      /* Tableau liste */
      .produits-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 10px;
      }

      .produits-table thead {
        background: #f9fafb;
      }

      .produits-table th {
        padding: 10px;
        text-align: left;
        font-weight: 600;
        color: #374151;
        border-bottom: 2px solid #e5e7eb;
        font-size: 12px;
      }

      .produits-table td {
        padding: 8px 10px;
        border-bottom: 1px solid #f3f4f6;
        vertical-align: middle;
      }

      .produits-table tr {
        page-break-inside: avoid;
      }

      .nom-produit {
        font-weight: 600;
        color: #111827;
        font-size: 13px;
      }

      .prix {
        color: #059669;
        font-weight: 600;
        text-align: right;
        font-size: 13px;
      }

      .stock {
        text-align: center;
        font-weight: 600;
      }

      .stock.bas { color: #ef4444; }
      .stock.ok { color: #10b981; }

      .qr-cell {
        text-align: center;
        padding: 4px;
      }

      .qr-code {
        width: 70px;
        height: 70px;
        border: 1px dashed #d1d5db;
        border-radius: 4px;
        padding: 2px;
      }

      /* Footer */
      .footer {
        margin-top: 20px;
        text-align: center;
        font-size: 10px;
        color: #9ca3af;
        border-top: 1px solid #e5e7eb;
        padding-top: 10px;
      }

      .footer-logo {
        font-weight: bold;
        color: #10b981;
        margin-top: 4px;
      }

      .page-indicator {
        position: absolute;
        bottom: 5mm;
        right: 10mm;
        font-size: 10px;
        color: #9ca3af;
      }

      /* Instructions */
      .instructions {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 10px;
        margin: 10px 0;
        border-radius: 6px;
        font-size: 11px;
        color: #92400e;
      }

      @media print {
        body { padding: 0; }
        .no-print { display: none !important; }
        .page-break {
          height: 0;
          page-break-after: always;
          break-after: page;
        }
      }
    </style>
  `;
}

/**
 * Génère une page de stickers
 */
function generateStickersPage(
  produits: ProduitAvecQR[],
  pageNumber: number,
  totalPages: number,
  stickerSize: StickerSizeKey,
  options: { afficherNom: boolean; afficherPrix: boolean },
  metadata: PrintMetadata
): string {
  const config = STICKER_SIZES[stickerSize];
  const gridClass = `stickers-grid-${stickerSize}`;
  const stickerClass = `sticker sticker-${stickerSize}`;
  const nomClass = `sticker-nom sticker-nom-${stickerSize}`;
  const prixClass = `sticker-prix sticker-prix-${stickerSize}`;

  const qrMaxWidth = `${config.qrSize}px`;

  return `
    <div class="page-container">
      ${pageNumber === 1 ? `
        <div class="header">
          <div class="header-title">Stickers QR Codes - ${metadata.nomStructure}</div>
          <div class="header-subtitle">${metadata.dateImpression}</div>
        </div>
        <div class="instructions">
          <strong>Instructions :</strong> Découpez chaque sticker le long des lignes pointillées.
        </div>
      ` : ''}

      <div class="${gridClass}">
        ${produits.map((produit, index) => `
          <div class="${stickerClass}">
            <div class="sticker-badge">#${(pageNumber - 1) * config.perPage + index + 1}</div>
            <img src="${produit.qrCodeDataUrl}" alt="QR" class="sticker-qr" style="max-width: ${qrMaxWidth};" />
            ${options.afficherNom ? `<div class="${nomClass}">${produit.nom_produit}</div>` : ''}
            ${options.afficherPrix ? `<div class="${prixClass}">${(produit.prix_vente || 0).toLocaleString('fr-FR')} FCFA</div>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="page-indicator">Page ${pageNumber}/${totalPages}</div>
    </div>
  `;
}

/**
 * Génère une page de liste (tableau)
 */
function generateListPage(
  produits: ProduitAvecQR[],
  pageNumber: number,
  totalPages: number,
  totalProduits: number,
  metadata: PrintMetadata
): string {
  return `
    <div class="page-container">
      ${pageNumber === 1 ? `
        <div class="header">
          <div class="header-title">Liste des Produits - ${metadata.nomStructure}</div>
          <div class="header-subtitle">${metadata.dateImpression} - ${totalProduits} produits</div>
        </div>
      ` : ''}

      <table class="produits-table">
        <thead>
          <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 40%;">Nom Produit</th>
            <th style="width: 18%; text-align: right;">Prix Vente</th>
            <th style="width: 12%; text-align: center;">Stock</th>
            <th style="width: 25%; text-align: center;">QR Code</th>
          </tr>
        </thead>
        <tbody>
          ${produits.map((produit, index) => {
            const globalIndex = (pageNumber - 1) * LIST_CONFIG.itemsPerPage + index + 1;
            const stock = produit.niveau_stock || 0;
            const stockClass = stock < 5 ? 'bas' : 'ok';

            return `
              <tr>
                <td style="color: #9ca3af; font-size: 11px;">${globalIndex}</td>
                <td class="nom-produit">${produit.nom_produit}</td>
                <td class="prix">${(produit.prix_vente || 0).toLocaleString('fr-FR')} FCFA</td>
                <td class="stock ${stockClass}">${stock}</td>
                <td class="qr-cell">
                  <img src="${produit.qrCodeDataUrl}" alt="QR" class="qr-code" />
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="page-indicator">Page ${pageNumber}/${totalPages}</div>
    </div>
  `;
}

/**
 * Génère le HTML paginé pour impression
 */
export function generatePaginatedHTML(
  produits: ProduitAvecQR[],
  options: PrintPageOptions,
  metadata: PrintMetadata
): string[] {
  const pages: string[] = [];
  const { itemsPerPage, format, stickerOptions } = options;

  const totalPages = Math.ceil(produits.length / itemsPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const start = pageIndex * itemsPerPage;
    const end = Math.min(start + itemsPerPage, produits.length);
    const pageProducts = produits.slice(start, end);

    if (format === 'stickers' && stickerOptions) {
      pages.push(generateStickersPage(
        pageProducts,
        pageIndex + 1,
        totalPages,
        stickerOptions.stickerSize,
        {
          afficherNom: stickerOptions.afficherNom,
          afficherPrix: stickerOptions.afficherPrix
        },
        metadata
      ));
    } else {
      pages.push(generateListPage(
        pageProducts,
        pageIndex + 1,
        totalPages,
        produits.length,
        metadata
      ));
    }
  }

  return pages;
}

/**
 * Assemble les pages en document HTML complet
 */
export function buildPrintDocument(
  pages: string[],
  metadata: PrintMetadata
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Impression - ${metadata.nomStructure}</title>
      ${getPrintStyles()}
    </head>
    <body>
      ${pages.map((page, index) =>
        index < pages.length - 1
          ? `${page}<div class="page-break"></div>`
          : page
      ).join('')}

      <div class="footer">
        <div>Document généré le ${new Date().toLocaleString('fr-FR')}</div>
        <div class="footer-logo">FayClick - La Super App des Marchands</div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// FONCTIONS D'IMPRESSION OPTIMISÉES
// ============================================================================

/**
 * Interface pour les options d'impression optimisée
 */
export interface PrintOptimizedOptions {
  produits: Produit[];
  nomStructure: string;
  logoStructure?: string;
  format: 'list' | 'stickers';
  stickerSize?: StickerSizeKey;
  afficherNom?: boolean;
  afficherPrix?: boolean;
  onProgress?: (progress: QRGenerationProgress) => void;
  abortSignal?: AbortSignal;
}

/**
 * Impression optimisée pour 500+ produits
 * Génère les QR codes par lots et pagine automatiquement
 */
export async function printOptimized(options: PrintOptimizedOptions): Promise<boolean> {
  const {
    produits,
    nomStructure,
    logoStructure,
    format,
    stickerSize = 'medium',
    afficherNom = true,
    afficherPrix = true,
    onProgress,
    abortSignal
  } = options;

  try {
    console.log(`🖨️ [PRINT OPTIMIZED] Démarrage pour ${produits.length} produits (format: ${format})`);

    // Phase 1: Génération QR codes par lots
    const qrMap = await generateQRCodesBatched(produits, {
      batchSize: PRINT_LIMITS.BATCH_SIZE,
      onProgress,
      abortSignal
    });

    // Phase 2: Construction des produits avec QR
    const produitsAvecQR: ProduitAvecQR[] = produits.map(p => ({
      ...p,
      qrCodeDataUrl: qrMap.get(p.id_produit) || ''
    }));

    // Phase 3: Génération HTML paginé
    const itemsPerPage = format === 'stickers'
      ? STICKER_SIZES[stickerSize].perPage
      : LIST_CONFIG.itemsPerPage;

    const metadata: PrintMetadata = {
      nomStructure,
      logoStructure,
      dateImpression: new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    const pages = generatePaginatedHTML(produitsAvecQR, {
      itemsPerPage,
      format,
      stickerOptions: format === 'stickers' ? {
        afficherNom,
        afficherPrix,
        stickersPerRow: STICKER_SIZES[stickerSize].perRow,
        stickerSize
      } : undefined
    }, metadata);

    const htmlDocument = buildPrintDocument(pages, metadata);

    // Phase 4: Méthode robuste avec iframe caché (compatible mobile/tablette)
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
    if (!frameDoc) {
      console.error('❌ [PRINT OPTIMIZED] Impossible de créer l\'iframe d\'impression');
      return false;
    }

    frameDoc.open();
    frameDoc.write(htmlDocument);
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

    console.log(`✅ [PRINT OPTIMIZED] Impression lancée (${pages.length} pages)`);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('⛔ [PRINT OPTIMIZED] Impression annulée');
      throw error;
    }
    console.error('❌ [PRINT OPTIMIZED] Erreur:', error);
    return false;
  }
}

// ============================================================================
// FONCTIONS LEGACY (rétrocompatibilité)
// ============================================================================

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
 * @deprecated Utiliser printOptimized() pour les grandes listes
 * Générer le HTML d'impression des produits (version legacy)
 */
export async function generateProduitsPrintHTML(options: PrintProduitsOptions): Promise<string> {
  const { nomStructure, produits, logoStructure } = options;

  console.log('🖨️ [PRINT PRODUITS LEGACY] Génération HTML pour', produits.length, 'produits');

  // Pour les petites listes, utiliser l'ancienne méthode
  const produitsAvecQR: ProduitAvecQR[] = await Promise.all(
    produits.map(async (produit) => ({
      ...produit,
      qrCodeDataUrl: await generateStyledQRCode(produit.nom_produit)
    }))
  );

  const produitsGroupes = grouperParCategorie(produitsAvecQR);

  const dateImpression = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalProduits = produits.length;
  const totalCategories = produitsGroupes.size;
  const valeurTotaleStock = produits.reduce((sum, p) => {
    const stock = p.niveau_stock || 0;
    const prix = p.prix_vente || 0;
    return sum + (stock * prix);
  }, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Liste Produits - ${nomStructure}</title>
      ${getPrintStyles()}
    </head>
    <body>
      <div class="page-container">
        <div class="header">
          ${logoStructure ? `<img src="${logoStructure}" alt="Logo" style="max-width: 100px; max-height: 60px; margin-bottom: 10px;" />` : ''}
          <div class="header-title">Liste des Produits</div>
          <div class="header-subtitle">${nomStructure} - ${dateImpression}</div>
        </div>

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

        ${Array.from(produitsGroupes.entries()).map(([categorie, produits]) => `
          <div style="margin: 20px 0; page-break-inside: avoid;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 10px 15px; border-radius: 6px 6px 0 0; font-weight: bold;">
              ${categorie} (${produits.length})
            </div>
            <table class="produits-table">
              <thead>
                <tr>
                  <th>Nom Produit</th>
                  <th style="text-align: right;">Prix</th>
                  <th style="text-align: center;">Stock</th>
                  <th style="text-align: center;">QR Code</th>
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
                        <img src="${produit.qrCodeDataUrl}" alt="QR" class="qr-code" />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}

        <div class="footer">
          <div>Document généré le ${new Date().toLocaleString('fr-FR')}</div>
          <div class="footer-logo">FayClick - La Super App des Marchands</div>
        </div>
      </div>
    </body>
    </html>
  `;

  console.log('✅ [PRINT PRODUITS LEGACY] HTML généré avec succès');
  return html;
}

/**
 * @deprecated Utiliser printOptimized() pour les grandes listes
 * Imprimer la liste des produits (version legacy)
 */
export async function printProduitsList(options: PrintProduitsOptions): Promise<boolean> {
  try {
    console.log('🖨️ [PRINT PRODUITS] Début impression...');

    const html = await generateProduitsPrintHTML(options);

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
    if (!frameDoc) {
      console.error('❌ [PRINT PRODUITS] Impossible de créer l\'iframe d\'impression');
      return false;
    }

    frameDoc.open();
    frameDoc.write(html);
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

    console.log('✅ [PRINT PRODUITS] Impression lancée');
    return true;
  } catch (error) {
    console.error('❌ [PRINT PRODUITS] Erreur impression:', error);
    return false;
  }
}

/**
 * @deprecated Utiliser printOptimized() avec format='stickers'
 * Générer le HTML pour impression de stickers QR codes (version legacy)
 */
export async function generateQRStickersHTML(options: PrintQRStickersOptions): Promise<string> {
  const { nomStructure, produits, afficherNom, afficherPrix } = options;

  console.log('🖨️ [PRINT QR STICKERS LEGACY] Génération HTML pour', produits.length, 'stickers');

  const produitsAvecQR: ProduitAvecQR[] = await Promise.all(
    produits.map(async (produit) => ({
      ...produit,
      qrCodeDataUrl: await generateStyledQRCode(produit.nom_produit)
    }))
  );

  const dateImpression = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const metadata: PrintMetadata = {
    nomStructure,
    dateImpression
  };

  const pages = generatePaginatedHTML(produitsAvecQR, {
    itemsPerPage: STICKER_SIZES.medium.perPage,
    format: 'stickers',
    stickerOptions: {
      afficherNom,
      afficherPrix,
      stickersPerRow: STICKER_SIZES.medium.perRow,
      stickerSize: 'medium'
    }
  }, metadata);

  return buildPrintDocument(pages, metadata);
}

/**
 * @deprecated Utiliser printOptimized() avec format='stickers'
 * Imprimer les stickers QR codes (version legacy)
 */
export async function printQRStickers(options: PrintQRStickersOptions): Promise<boolean> {
  try {
    console.log('🖨️ [PRINT QR STICKERS] Début impression stickers...');

    const html = await generateQRStickersHTML(options);

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
    if (!frameDoc) {
      console.error('❌ [PRINT QR STICKERS] Impossible de créer l\'iframe d\'impression');
      return false;
    }

    frameDoc.open();
    frameDoc.write(html);
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

    console.log('✅ [PRINT QR STICKERS] Impression lancée');
    return true;
  } catch (error) {
    console.error('❌ [PRINT QR STICKERS] Erreur impression:', error);
    return false;
  }
}
