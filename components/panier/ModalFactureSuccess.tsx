/**
 * Modal de succès après création de facture
 * Design glassmorphisme bleu clair avec QR Code et partage WhatsApp
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle, QrCode as QrIcon, MessageCircle, 
  Link, Copy, ExternalLink, Download 
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { factureService } from '@/services/facture.service';
import { authService } from '@/services/auth.service';
import { encodeFactureParams } from '@/lib/url-encoder';
import { produitsService } from '@/services/produits.service';
import { useFactureSuccessStore } from '@/hooks/useFactureSuccess';

export function ModalFactureSuccess() {
  const { isOpen, factureId, closeModal } = useFactureSuccessStore();
  const [factureDetails, setFactureDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Générer les URLs
  const generateFactureUrls = () => {
    if (!factureDetails) return { simple: '', encoded: '', full: '' };
    
    const user = authService.getUser();
    const idStructure = user?.id_structure || factureDetails.id_structure;
    
    // URL simple format: /fay/{id_structure}#{id_facture}
    const simpleUrl = `/fay/${idStructure}%23${factureId}`;
    
    // URL encodée avec token
    const token = encodeFactureParams(idStructure, factureId || 0);
    const encodedUrl = `/facture?token=${token}`;
    
    // URL complète avec domaine (utilise l'URL encodée pour être sûr)
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${encodedUrl}`;
    
    return { simple: simpleUrl, encoded: encodedUrl, full: fullUrl };
  };

  const urls = generateFactureUrls();

  useEffect(() => {
    if (isOpen && factureId) {
      loadFactureDetails();
    }
  }, [isOpen, factureId]);

  const loadFactureDetails = async () => {
    if (!factureId) return;
    
    try {
      setLoading(true);
      setError(null);
      const details = await factureService.getFactureDetails(factureId);
      setFactureDetails(details);
      
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
      `🔗 Voir la facture:\n${urls.full}\n\n` +
      `_Merci pour votre confiance !_`
    );
    
    window.open(`https://wa.me/${senegalPhone}?text=${message}`, '_blank');
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="
              bg-gradient-to-br from-sky-100/95 via-sky-50/95 to-white/95
              backdrop-blur-xl rounded-3xl w-full max-w-md
              shadow-2xl border border-sky-200/50
              overflow-hidden
            "
          >
            {/* Header avec effet glassmorphisme */}
            <div className="
              bg-gradient-to-r from-sky-400/90 to-sky-500/90 
              backdrop-blur-lg p-6 text-white relative overflow-hidden
            ">
              {/* Pattern décoratif */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }} />
              </div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Facture créée !</h2>
                    <p className="text-sky-100 text-sm">Prête à partager</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenu */}
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  <p>{error}</p>
                </div>
              ) : factureDetails ? (
                <>
                  {/* Informations facture */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 mb-6 border border-sky-100">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">Numéro</span>
                      <span className="font-bold text-gray-900">{factureDetails.num_facture}</span>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">Client</span>
                      <span className="font-medium text-gray-800">{factureDetails.nom_client_payeur}</span>
                    </div>
                    
                    <div className="border-t border-sky-100 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-700">Reste à payer</span>
                        <span className="text-2xl font-bold text-sky-600">
                          {factureDetails.mt_restant?.toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="bg-gradient-to-br from-sky-50/60 to-white/60 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-sky-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <QrIcon className="w-5 h-5 text-sky-600" />
                        QR Code de paiement
                      </h3>
                      <button
                        onClick={handleDownloadQR}
                        className="text-sky-600 hover:text-sky-700 transition-colors"
                        title="Télécharger QR Code"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl flex items-center justify-center">
                      <QRCode
                        id="facture-qr-code"
                        value={urls.full}
                        size={200}
                        level="H"
                        fgColor="#0284c7"
                        bgColor="#ffffff"
                      />
                    </div>
                    
                    <p className="text-xs text-gray-600 text-center mt-3">
                      Scannez pour accéder à la facture
                    </p>
                  </div>

                  {/* Boutons d'action */}
                  <div className="space-y-3">
                    {/* WhatsApp */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWhatsAppShare}
                      className="
                        w-full bg-gradient-to-r from-green-500 to-green-600
                        text-white font-semibold py-4 rounded-xl
                        shadow-lg hover:shadow-xl transition-all
                        flex items-center justify-center gap-3
                      "
                    >
                      <MessageCircle className="w-5 h-5" />
                      Partager sur WhatsApp
                    </motion.button>

                    {/* Copier URL */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCopyUrl}
                      className="
                        w-full bg-white/60 backdrop-blur-sm border-2 border-sky-200
                        text-sky-700 font-semibold py-4 rounded-xl
                        hover:bg-white/80 transition-all
                        flex items-center justify-center gap-3
                      "
                    >
                      {copiedUrl ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          URL copiée !
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          Copier le lien
                        </>
                      )}
                    </motion.button>

                    {/* Voir facture */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => window.open(urls.full, '_blank')}
                      className="
                        w-full bg-sky-100/60 backdrop-blur-sm
                        text-sky-700 font-medium py-3 rounded-xl
                        hover:bg-sky-100/80 transition-all
                        flex items-center justify-center gap-3
                      "
                    >
                      <ExternalLink className="w-4 h-4" />
                      Voir la facture
                    </motion.button>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}