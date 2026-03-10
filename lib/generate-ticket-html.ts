/**
 * Generateur unifie de ticket HTML pour impression 80mm
 * Utilise par: ModalFactureSuccess, ModalRecuVenteFlash, ModalRecuGenere
 */

export interface TicketArticle {
  nom_produit: string;
  quantite: number;
  prix: number;
  sous_total: number;
}

export interface TicketData {
  // Structure
  nomStructure: string;
  logoUrl?: string;
  adresse?: string;
  telephone?: string;

  // Facture
  numFacture: string;
  dateFacture: string; // Format DD/MM/YYYY HH:MM
  nomClient: string;
  telClient?: string;

  // Articles (optionnel)
  articles?: TicketArticle[];

  // Montants
  sousTotal?: number;
  remise?: number;
  montantNet: number;
  acompte?: number;
  restant?: number;

  // Paiement
  methodePaiement: string; // 'Especes', 'Orange Money', 'Wave', etc.
  monnaieARendre?: number;

  // Caissier
  nomCaissier?: string;

  // Badge
  badge?: 'PAYE' | 'ACOMPTE' | 'FACTURE';
}

export function generateTicketHTML(data: TicketData): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const logoFayclick = `${baseUrl}/images/logofayclick.png`;
  const logoStructure = data.logoUrl && data.logoUrl.trim() !== ''
    ? data.logoUrl
    : `${baseUrl}/images/logofayclick.png`;

  // Articles HTML
  const articlesHTML = data.articles && data.articles.length > 0
    ? `
      <table>
        <thead>
          <tr><th>Qt</th><th>Designation</th><th>PU</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${data.articles.map(a => `
            <tr>
              <td>${a.quantite}</td>
              <td>${a.nom_produit}</td>
              <td>${a.prix.toLocaleString('fr-FR')}</td>
              <td>${a.sous_total.toLocaleString('fr-FR')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="divider"></div>
    ` : '';

  // Sous-total et remise
  const sousTotal = data.sousTotal ?? data.montantNet + (data.remise || 0);
  const remise = data.remise || 0;
  const acompte = data.acompte || 0;
  const restant = data.restant || 0;

  // Badge
  const badgeLabel = data.badge || 'PAYE';
  const badgeClass = badgeLabel === 'ACOMPTE' ? 'badge-acompte' : 'badge-success';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recu ${data.numFacture}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Courier New', 'Lucida Console', Monaco, monospace;
      font-weight: bold;
      max-width: 80mm;
      margin: 0 auto;
      padding: 8px;
      font-size: 12px;
      background: white;
      color: #1e293b;
    }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 8px; }
    .logo-img { max-width: 50px; max-height: 50px; margin: 0 auto 6px; display: block; border-radius: 6px; object-fit: contain; }
    .structure-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
    .structure-info { font-size: 9px; color: #64748b; font-weight: bold; }
    .title { font-size: 11px; font-weight: bold; color: #059669; margin-top: 4px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-weight: bold; font-size: 10px; margin: 6px 0; }
    .badge-success { background: #d1fae5; color: #059669; }
    .badge-acompte { background: #fef3c7; color: #d97706; }
    .divider { border-top: 1px dashed #999; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
    .row .label { color: #64748b; font-weight: bold; }
    .row .val { font-weight: bold; text-align: right; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 4px 2px; border-bottom: 1.5px solid #333; color: #475569; font-weight: bold; }
    th:nth-child(1) { width: 8%; text-align: center; }
    th:nth-child(2) { width: 50%; }
    th:nth-child(3) { width: 21%; text-align: right; }
    th:nth-child(4) { width: 21%; text-align: right; }
    td { font-size: 11px; padding: 3px 2px; border-bottom: 1px dotted #ddd; font-weight: bold; }
    td:nth-child(1) { text-align: center; color: #64748b; }
    td:nth-child(3) { text-align: right; color: #64748b; }
    td:nth-child(4) { text-align: right; }
    .total-section { margin-top: 6px; }
    .total-line { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
    .total-line .label { color: #64748b; font-weight: bold; }
    .total-line .val { font-weight: bold; font-size: 12px; }
    .total-line.grand { padding: 6px 0; font-size: 14px; font-weight: bold; margin-top: 4px; border-top: 2px solid #1e293b; }
    .total-line.grand .label, .total-line.grand .val { color: #1e293b; font-weight: bold; }
    .total-line.remise .val { color: #16a34a; }
    .total-line.restant { background: #fef3c7; padding: 4px 8px; border-radius: 4px; margin-top: 3px; color: #92400e; }
    .total-line.restant .label, .total-line.restant .val { color: #92400e; }
    .monnaie { display: flex; justify-content: space-between; margin-top: 4px; padding: 4px 8px; background: #fef3c7; border-radius: 4px; font-size: 12px; color: #d97706; font-weight: bold; }
    .footer { text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #333; }
    .footer .caissier { font-size: 9px; color: #64748b; margin-bottom: 4px; font-weight: bold; }
    .footer .caissier strong { color: #1e293b; }
    .footer .merci { font-size: 10px; font-weight: bold; color: #059669; margin-bottom: 4px; }
    .footer .powered { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 4px; }
    .footer .powered img { height: 12px; }
    .footer .powered span { font-size: 8px; color: #94a3b8; font-weight: bold; }
    .footer .date-gen { font-size: 8px; color: #94a3b8; margin-top: 3px; }
    @media print { html, body { margin: 0; padding: 0; background: white; } body { padding: 4px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoStructure}" alt="Logo" class="logo-img" onerror="this.style.display='none'" crossorigin="anonymous" />
    <div class="structure-name">${data.nomStructure}</div>
    ${data.adresse ? `<div class="structure-info">${data.adresse}</div>` : ''}
    ${data.telephone ? `<div class="structure-info">Tel: ${data.telephone}</div>` : ''}
    <div class="title">RECU DE VENTE</div>
    <div class="badge ${badgeClass}">${badgeLabel}</div>
  </div>

  <div class="row"><span class="label">N°</span><span class="val" style="font-size:10px">${data.numFacture}</span></div>
  <div class="row"><span class="label">Date</span><span class="val">${data.dateFacture}</span></div>
  <div class="row"><span class="label">Client</span><span class="val">${data.nomClient}</span></div>
  ${data.telClient && data.telClient !== '000000000' && data.telClient !== '771234567' ? `<div class="row"><span class="label">Tel</span><span class="val">${data.telClient}</span></div>` : ''}

  <div class="divider"></div>

  ${articlesHTML}

  <div class="row"><span class="label">Paiement</span><span class="val">${data.methodePaiement}</span></div>

  <div class="total-section">
    ${data.articles && data.articles.length > 0 && remise > 0 ? `
      <div class="total-line"><span class="label">Sous-total</span><span class="val">${sousTotal.toLocaleString('fr-FR')} F</span></div>
      <div class="total-line remise"><span class="label">Remise</span><span class="val">-${remise.toLocaleString('fr-FR')} F</span></div>
    ` : ''}
    <div class="total-line grand"><span class="label">TOTAL</span><span class="val">${data.montantNet.toLocaleString('fr-FR')} F</span></div>
    ${acompte > 0 ? `<div class="total-line"><span class="label">Acompte</span><span class="val">${acompte.toLocaleString('fr-FR')} F</span></div>` : ''}
    ${restant > 0 ? `<div class="total-line restant"><span class="label">RESTE</span><span class="val">${restant.toLocaleString('fr-FR')} F</span></div>` : ''}
  </div>

  ${data.monnaieARendre && data.monnaieARendre > 0 ? `<div class="monnaie"><span>Monnaie</span><span>${data.monnaieARendre.toLocaleString('fr-FR')} F</span></div>` : ''}

  <div class="footer">
    ${data.nomCaissier ? `<div class="caissier">Caissier: <strong>${data.nomCaissier}</strong></div>` : ''}
    <div class="merci">Merci pour votre confiance !</div>
    <div class="powered">
      <img src="${logoFayclick}" alt="FayClick" />
      <span>Powered by FayClick</span>
    </div>
    <div class="date-gen">${new Date().toLocaleString('fr-FR')}</div>
  </div>
</body>
</html>`;
}

/** Imprime un HTML via iframe cache (compatible tous navigateurs) */
export function printViaIframe(htmlContent: string): void {
  const printFrame = document.createElement('iframe');
  printFrame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;visibility:hidden';
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
          try { document.body.removeChild(printFrame); } catch {}
        }, 1000);
      }, 250);
    };
  }
}
