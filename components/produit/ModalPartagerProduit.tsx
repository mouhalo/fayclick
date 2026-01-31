'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import QRCodeLib from 'qrcode';
import { X, Copy, Check, Share2, Download, ExternalLink } from 'lucide-react';
import { getProduitUrl, getWhatsAppProduitUrl } from '@/lib/url-config';

interface ModalPartagerProduitProps {
  isOpen: boolean;
  onClose: () => void;
  produit: {
    id_produit: number;
    nom_produit: string;
    prix_vente: number;
  };
  idStructure: number;
}

export default function ModalPartagerProduit({
  isOpen,
  onClose,
  produit,
  idStructure
}: ModalPartagerProduitProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const produitUrl = getProduitUrl(idStructure, produit.id_produit);
  const whatsappUrl = getWhatsAppProduitUrl(idStructure, produit.id_produit, produit.nom_produit);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(produitUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback pour navigateurs sans clipboard API
      const input = document.createElement('input');
      input.value = produitUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  const handleDownloadQR = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      await QRCodeLib.toCanvas(canvas, produitUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#0284c7',
          light: '#ffffff'
        }
      });

      const link = document.createElement('a');
      const nomFichier = produit.nom_produit
        .replace(/[^a-zA-Z0-9àâäéèêëïîôùûüç\s-]/gi, '')
        .replace(/\s+/g, '-')
        .substring(0, 30);
      link.download = `FayClick-${nomFichier}-QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Erreur export QR:', error);
    } finally {
      setDownloading(false);
    }
  };

  const prixFormate = produit.prix_vente.toLocaleString('fr-FR') + ' FCFA';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  <h3 className="font-semibold text-base">Partager ce produit</h3>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/80 mt-1 truncate">
                {produit.nom_produit} &mdash; {prixFormate}
              </p>
            </div>

            {/* Corps */}
            <div className="p-5 flex flex-col items-center gap-4">
              {/* QR Code */}
              <div
                ref={qrRef}
                className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-inner"
              >
                <QRCode
                  value={produitUrl}
                  size={200}
                  level="H"
                  fgColor="#0284c7"
                  bgColor="#ffffff"
                />
              </div>

              {/* Lien copiable */}
              <div className="w-full">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-2.5">
                  <p className="text-xs text-gray-500 truncate flex-1 font-mono">
                    {produitUrl}
                  </p>
                  <button
                    onClick={handleCopy}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Boutons actions */}
              <div className="w-full flex flex-col gap-2.5">
                {/* WhatsApp */}
                <button
                  onClick={handleWhatsApp}
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb855] text-white font-medium py-3 rounded-xl transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Partager sur WhatsApp
                </button>

                {/* Télécharger QR */}
                <button
                  onClick={handleDownloadQR}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-sky-300 hover:bg-sky-50 text-gray-700 font-medium py-3 rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Export en cours...' : 'Télécharger le QR code'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
