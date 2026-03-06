/**
 * Modal Reçu VenteFlash - Format Ticket de Caisse
 * Affiche confirmation + reçu + actions en un seul modal compact
 * Auto-fermeture 5s avec timer visuel
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Printer, MessageCircle, X, Share2 } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { authService } from '@/services/auth.service';
import { generateTicketHTML, printViaIframe } from '@/lib/generate-ticket-html';

interface DetailProduit {
  id_detail?: number;
  nom_produit: string;
  quantite: number;
  prix: number;
  sous_total: number;
}

interface ModalRecuVenteFlashProps {
  isOpen: boolean;
  onClose: () => void;
  idFacture: number;
  numFacture: string;
  montantTotal: number;
  methodePaiement: 'CASH' | 'OM' | 'WAVE';
  monnaieARendre?: number;
  dateVente?: Date;
  detailFacture?: DetailProduit[];
}

export function ModalRecuVenteFlash({
  isOpen,
  onClose,
  idFacture,
  numFacture,
  montantTotal,
  methodePaiement,
  monnaieARendre = 0,
  dateVente = new Date(),
  detailFacture = []
}: ModalRecuVenteFlashProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const isCompact = isMobile || isMobileLarge;

  const [timerPaused, setTimerPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const user = authService.getUser();
  const nomStructure = user?.nom_structure || 'Ma Boutique';

  // Timer auto-close 10s
  useEffect(() => {
    if (isOpen && !timerPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isOpen, timerPaused, onClose]);

  // Reset timer à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(10);
      setTimerPaused(false);
    }
  }, [isOpen]);

  // Pause timer au clic sur le modal
  const handleModalClick = () => {
    setTimerPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Formater date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Label méthode paiement
  const getMethodeLabel = () => {
    switch (methodePaiement) {
      case 'CASH': return 'Espèces';
      case 'OM': return 'Orange Money';
      case 'WAVE': return 'Wave';
      default: return methodePaiement;
    }
  };

  // Impression ticket - Format unifie
  const handlePrint = () => {
    setTimerPaused(true);

    const structureDetails = authService.getStructureDetails();
    const html = generateTicketHTML({
      nomStructure,
      logoUrl: structureDetails?.logo || '',
      adresse: structureDetails?.adresse || '',
      telephone: user?.telephone || '',
      numFacture,
      dateFacture: `${formatDate(dateVente)} ${formatTime(dateVente)}`,
      nomClient: 'CLIENT_ANONYME',
      articles: detailFacture.length > 0 ? detailFacture : undefined,
      montantNet: montantTotal,
      methodePaiement: getMethodeLabel(),
      monnaieARendre: monnaieARendre > 0 ? monnaieARendre : undefined,
      nomCaissier: user?.username || 'Caissier',
      badge: 'PAYE',
    });

    printViaIframe(html);
  };

  // WhatsApp partage
  const handleWhatsApp = () => {
    setTimerPaused(true);

    // Générer les lignes de détails produits pour WhatsApp
    const detailsText = detailFacture.length > 0
      ? '\n📦 *Articles:*\n' + detailFacture.map(item =>
          `• ${item.nom_produit}\n  ${item.quantite} x ${item.prix.toLocaleString('fr-FR')} = ${item.sous_total.toLocaleString('fr-FR')} F`
        ).join('\n') + '\n'
      : '';

    const message = encodeURIComponent(
      `🧾 *REÇU DE PAIEMENT*\n\n` +
      `📍 ${nomStructure}\n` +
      `📋 Facture: ${numFacture}\n` +
      `📅 ${formatDate(dateVente)} à ${formatTime(dateVente)}\n` +
      detailsText +
      `\n💰 *TOTAL: ${montantTotal.toLocaleString('fr-FR')} FCFA*\n` +
      `💳 Paiement: ${getMethodeLabel()}\n\n` +
      `Merci de votre confiance ! 🙏`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-2"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, duration: 0.3 }}
          onClick={handleModalClick}
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden ${isCompact ? 'w-[280px]' : 'w-[320px]'}`}
        >
          {/* Timer bar */}
          {!timerPaused && (
            <div className="h-1 bg-gray-200">
              <motion.div
                className="h-full bg-green-500"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 10, ease: 'linear' }}
              />
            </div>
          )}

          {/* Success header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 text-white text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2"
            >
              <CheckCircle className="w-8 h-8" />
            </motion.div>
            <h2 className={`font-bold ${isCompact ? 'text-base' : 'text-lg'}`}>Paiement Confirmé</h2>
          </div>

          {/* Ticket content - Compact */}
          <div className="p-2 ticket-receipt">
            {/* Header structure */}
            <div className="ticket-header mb-1">
              <p className={`font-bold text-gray-900 ${isCompact ? 'text-xs' : 'text-sm'}`}>{nomStructure}</p>
              <p className="text-gray-500 text-[10px]">REÇU DE VENTE</p>
            </div>

            {/* Infos compactes - Date/Heure sur une ligne */}
            <div className="text-[10px] space-y-0.5">
              <div className="ticket-row">
                <span className="text-gray-500">N°</span>
                <span className="font-semibold text-gray-900 text-[9px]">{numFacture}</span>
              </div>
              <div className="ticket-row">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-700">{formatDate(dateVente)} {formatTime(dateVente)}</span>
              </div>
            </div>

            <div className="ticket-divider my-1" />

            {/* Détails produits - Ultra compact */}
            {detailFacture.length > 0 && (
              <>
                <div className="space-y-0.5 text-[10px]">
                  {detailFacture.map((item, index) => (
                    <div key={item.id_detail || index} className="flex justify-between items-center gap-1">
                      <div className="flex-1 min-w-0 flex items-center gap-1">
                        <span className="text-gray-800 font-medium truncate">{item.nom_produit}</span>
                        <span className="text-gray-400 text-[9px] flex-shrink-0">×{item.quantite}</span>
                      </div>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">
                        {item.sous_total.toLocaleString('fr-FR')}F
                      </span>
                    </div>
                  ))}
                </div>
                <div className="ticket-divider my-1" />
              </>
            )}

            <div className="text-[10px] space-y-0.5">
              <div className="ticket-row">
                <span className="text-gray-500">Client</span>
                <span className="text-gray-700">ANONYME</span>
              </div>
              <div className="ticket-row">
                <span className="text-gray-500">Paiement</span>
                <span className={`font-semibold ${
                  methodePaiement === 'CASH' ? 'text-green-600' :
                  methodePaiement === 'OM' ? 'text-orange-600' : 'text-blue-600'
                }`}>{getMethodeLabel()}</span>
              </div>
            </div>

            {/* Total - Compact */}
            <div className="ticket-row ticket-total mt-1 pt-1 border-t-2 border-gray-300">
              <span className="text-xs font-bold">TOTAL</span>
              <span className="text-green-700 font-bold text-sm">{montantTotal.toLocaleString('fr-FR')} F</span>
            </div>

            {/* Monnaie - Compact */}
            {methodePaiement === 'CASH' && monnaieARendre > 0 && (
              <div className="mt-1 py-1 px-2 bg-amber-50 rounded border border-amber-200 flex justify-between items-center">
                <span className="text-[10px] text-gray-600">Monnaie</span>
                <span className="font-bold text-amber-600 text-xs">
                  {monnaieARendre.toLocaleString('fr-FR')} F
                </span>
              </div>
            )}
          </div>

          {/* Actions 3x1 */}
          <div className="p-3 pt-0 grid grid-cols-3 gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className={`flex flex-col items-center justify-center ${isCompact ? 'py-2' : 'py-3'} bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors`}
            >
              <Printer className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-700 mb-1`} />
              <span className="text-[10px] text-gray-600 font-medium">Ticket</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsApp}
              className={`flex flex-col items-center justify-center ${isCompact ? 'py-2' : 'py-3'} bg-green-50 hover:bg-green-100 rounded-xl transition-colors`}
            >
              <MessageCircle className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-green-600 mb-1`} />
              <span className="text-[10px] text-green-600 font-medium">WhatsApp</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className={`flex flex-col items-center justify-center ${isCompact ? 'py-2' : 'py-3'} bg-red-50 hover:bg-red-100 rounded-xl transition-colors`}
            >
              <X className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-red-600 mb-1`} />
              <span className="text-[10px] text-red-600 font-medium">Fermer</span>
            </motion.button>
          </div>

          {/* Timer indicator */}
          {!timerPaused && (
            <p className="text-center text-[10px] text-gray-400 pb-2">
              Fermeture dans {timeLeft}s - Cliquez pour annuler
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
