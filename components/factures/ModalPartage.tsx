/**
 * Modal de partage de facture avec QR Code
 * Design responsive selon les standards modals de l'application
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Share2, 
  QrCode,
  ChevronDown,
  Copy,
  Download,
  MessageCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { FactureComplete } from '@/types/facture';
import { encodeFactureParams } from '@/lib/url-encoder';

interface ModalPartageProps {
  isOpen: boolean;
  onClose: () => void;
  facture: FactureComplete | null;
}

export function ModalPartage({ isOpen, onClose, facture }: ModalPartageProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  
  // États
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [urlPublique, setUrlPublique] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Génération de l'URL et du QR Code
  useEffect(() => {
    if (isOpen && facture) {
      setLoading(true);
      generateShareData();
    }
  }, [isOpen, facture]);

  const generateShareData = async () => {
    if (!facture) return;

    try {
      // Encodage sécurisé de l'ID structure et facture
      const token = encodeFactureParams(
        facture.facture.id_structure,
        facture.facture.id_facture
      );

      // Construction de l'URL publique
      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.protocol}//${window.location.host}`
        : 'https://v2.fayclick.net';
      
      const url = `${baseUrl}/facture/${token}`;
      setUrlPublique(url);

      // Génération du QR Code
      const qrData = await QRCodeLib.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1e40af', // Couleur bleue
          light: '#ffffff'
        }
      });
      
      setQrCodeData(qrData);
    } catch (error) {
      console.error('Erreur génération partage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Styles responsives selon les standards
  const getModalStyles = () => {
    if (isMobile) {
      return {
        container: 'max-w-xs p-4',
        title: 'text-lg',
        subtitle: 'text-sm',
        button: 'text-sm px-3 py-2',
        qrSize: 120,
        icon: 'w-4 h-4'
      };
    } else if (isMobileLarge) {
      return {
        container: 'max-w-sm p-5',
        title: 'text-xl',
        subtitle: 'text-base',
        button: 'text-sm px-4 py-2.5',
        qrSize: 150,
        icon: 'w-5 h-5'
      };
    } else {
      return {
        container: 'max-w-md p-6',
        title: 'text-2xl',
        subtitle: 'text-base',
        button: 'text-base px-5 py-3',
        qrSize: 200,
        icon: 'w-5 h-5'
      };
    }
  };

  const styles = getModalStyles();

  // Copier l'URL
  const copyUrl = async () => {
    if (!urlPublique) return;
    
    try {
      await navigator.clipboard.writeText(urlPublique);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback pour les navigateurs anciens
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

  // Télécharger le QR Code
  const downloadQR = () => {
    if (!qrCodeData || !facture) return;

    const link = document.createElement('a');
    link.download = `QR_${facture.facture.num_facture}.png`;
    link.href = qrCodeData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Partager via WhatsApp
  const shareWhatsApp = () => {
    if (!urlPublique || !facture) return;

    const message = encodeURIComponent(
      `Facture ${facture.facture.num_facture}\n` +
      `Montant: ${facture.facture.montant.toLocaleString('fr-FR')} FCFA\n` +
      `Voir la facture: ${urlPublique}`
    );
    
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  // Ouvrir l'URL publique
  const openPublicUrl = () => {
    if (!urlPublique) return;
    window.open(urlPublique, '_blank');
  };

  if (!isOpen || !facture) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`
            bg-gradient-to-br from-white via-white to-blue-50/30 
            rounded-2xl shadow-2xl border border-white/50 
            backdrop-blur-sm w-full max-h-[90vh] overflow-y-auto
            ${styles.container}
          `}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Share2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className={`text-gray-900 font-bold ${styles.title}`}>
                  Partager la facture
                </h2>
                <p className={`text-gray-600 ${styles.subtitle}`}>
                  {facture.facture.num_facture}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Informations facture */}
          <div className="bg-blue-50/50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Client</p>
                <p className={`text-gray-900 ${styles.subtitle}`}>{facture.facture.nom_client}</p>
              </div>
              <div>
                <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Montant</p>
                <p className={`text-gray-900 font-bold ${styles.subtitle}`}>
                  {facture.facture.montant.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div>
                <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Statut</p>
                <span className={`
                  inline-flex px-2 py-1 text-xs font-medium rounded-full
                  ${facture.facture.libelle_etat === 'PAYEE' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }
                `}>
                  {facture.facture.libelle_etat}
                </span>
              </div>
              <div>
                <p className={`text-gray-600 font-medium ${styles.subtitle}`}>Date</p>
                <p className={`text-gray-900 ${styles.subtitle}`}>
                  {new Date(facture.facture.date_facture).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </div>

          {/* URL de partage */}
          <div className="space-y-4 mb-6">
            <div>
              <label className={`block text-gray-700 font-medium mb-2 ${styles.subtitle}`}>
                Lien de partage
              </label>
              <div className="flex items-center space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={urlPublique}
                    readOnly
                    className={`
                      w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg 
                      text-gray-700 ${isMobile ? 'text-xs' : 'text-sm'}
                    `}
                  />
                </div>
                <button
                  onClick={copyUrl}
                  className={`
                    bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                    transition-colors flex items-center space-x-1
                    ${styles.button}
                  `}
                  disabled={!urlPublique}
                >
                  {copied ? (
                    <>
                      <CheckCircle className={styles.icon} />
                      {!isMobile && <span>Copié !</span>}
                    </>
                  ) : (
                    <>
                      <Copy className={styles.icon} />
                      {!isMobile && <span>Copier</span>}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Actions de partage */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={shareWhatsApp}
                className={`
                  bg-green-500 text-white rounded-lg hover:bg-green-600 
                  transition-colors flex items-center justify-center space-x-2
                  ${styles.button}
                `}
                disabled={!urlPublique}
              >
                <MessageCircle className={styles.icon} />
                <span>WhatsApp</span>
              </button>

              <button
                onClick={openPublicUrl}
                className={`
                  bg-gray-500 text-white rounded-lg hover:bg-gray-600 
                  transition-colors flex items-center justify-center space-x-2
                  ${styles.button}
                `}
                disabled={!urlPublique}
              >
                <ExternalLink className={styles.icon} />
                <span>Ouvrir</span>
              </button>
            </div>
          </div>

          {/* Section QR Code repliable */}
          <div className="border-t border-gray-200 pt-6">
            <button
              onClick={() => setIsQrExpanded(!isQrExpanded)}
              className={`
                w-full flex items-center justify-between p-3 
                bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-colors
                ${styles.subtitle}
              `}
            >
              <div className="flex items-center space-x-2">
                <QrCode className={styles.icon} />
                <span className="font-medium text-gray-700">
                  {isQrExpanded ? 'Masquer' : 'Afficher'} le QR Code
                </span>
              </div>
              <ChevronDown 
                className={`${styles.icon} text-gray-400 transition-transform ${
                  isQrExpanded ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* QR Code expandable */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ 
                height: isQrExpanded ? 'auto' : 0,
                opacity: isQrExpanded ? 1 : 0
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              {isQrExpanded && (
                <div className="pt-4 text-center">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  ) : qrCodeData ? (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <motion.img
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          src={qrCodeData}
                          alt="QR Code"
                          width={styles.qrSize}
                          height={styles.qrSize}
                          className="rounded-lg shadow-sm border border-gray-200"
                        />
                      </div>
                      
                      <p className={`text-gray-600 ${styles.subtitle}`}>
                        Scannez ce code QR pour accéder à la facture
                      </p>
                      
                      <button
                        onClick={downloadQR}
                        className={`
                          bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                          transition-colors flex items-center space-x-2 mx-auto
                          ${styles.button}
                        `}
                      >
                        <Download className={styles.icon} />
                        <span>Télécharger QR</span>
                      </button>
                    </div>
                  ) : (
                    <p className={`text-red-600 ${styles.subtitle}`}>
                      Erreur lors de la génération du QR Code
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Action de fermeture */}
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className={`
                bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 
                transition-colors font-medium
                ${styles.button}
              `}
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}