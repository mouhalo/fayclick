'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Loader,
  ChevronDown,
  CheckCircle,
  Share2,
  Copy,
  Check,
  Printer
} from 'lucide-react';
import Image from 'next/image';
import { decodeFactureParams } from '@/lib/url-encoder';
import { RecuDetails, WalletDisplayConfig } from '@/types/recu';
import { recuService } from '@/services/recu.service';

interface RecuPubliqueClientProps {
  token: string;
}

const walletDisplayConfig: WalletDisplayConfig = {
  'OM': {
    name: 'OM',
    displayName: 'Orange Money',
    color: '#FF6B00',
    bgGradient: 'from-orange-500 to-orange-600',
    icon: '/images/om.png',
    description: 'Mobile Money Orange'
  },
  'orange-money': {
    name: 'orange-money',
    displayName: 'Orange Money',
    color: '#FF6B00',
    bgGradient: 'from-orange-500 to-orange-600',
    icon: '/images/om.png',
    description: 'Mobile Money Orange'
  },
  'WAVE': {
    name: 'WAVE',
    displayName: 'Wave',
    color: '#00D4FF',
    bgGradient: 'from-blue-400 to-cyan-500',
    icon: '/images/wave.png',
    description: 'Wave Mobile Money'
  },
  'wave': {
    name: 'wave',
    displayName: 'Wave',
    color: '#00D4FF',
    bgGradient: 'from-blue-400 to-cyan-500',
    icon: '/images/wave.png',
    description: 'Wave Mobile Money'
  },
  'FREE': {
    name: 'FREE',
    displayName: 'Free Money',
    color: '#1E40AF',
    bgGradient: 'from-blue-600 to-blue-700',
    icon: '/images/free.png',
    description: 'Free Money Mobile'
  },
  'free-money': {
    name: 'free-money',
    displayName: 'Free Money',
    color: '#1E40AF',
    bgGradient: 'from-blue-600 to-blue-700',
    icon: '/images/free.png',
    description: 'Free Money Mobile'
  },
  'espèces': {
    name: 'espèces',
    displayName: 'Espèces',
    color: '#16a34a',
    bgGradient: 'from-green-500 to-green-600',
    icon: '',
    description: 'Paiement en espèces'
  }
};

export default function RecuPubliqueClient({ token }: RecuPubliqueClientProps) {
  const [recu, setRecu] = useState<RecuDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadRecuData = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = decodeFactureParams(token);
        if (!params) throw new Error('Token de reçu invalide');
        const recuData = await recuService.getRecuPublique(params.id_structure, params.id_facture);
        setRecu(recuData);
      } catch (err: unknown) {
        console.error('Erreur chargement reçu:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement du reçu');
      } finally {
        setLoading(false);
      }
    };
    if (token) loadRecuData();
  }, [token]);

  const formatMontant = (montant: number): string => {
    return montant.toLocaleString('fr-FR') + ' F CFA';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-SN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatHeure = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('fr-SN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie URL:', err);
    }
  };

  const handleWhatsAppShare = () => {
    if (!recu) return;
    const walletName = getWalletConfig(recu.paiement.methode_paiement).displayName;
    const datePaiement = formatDate(recu.paiement.date_paiement);

    const message =
      `Salut *${recu.facture.nom_structure}*, je viens de vous acheter pour *${formatMontant(recu.paiement.montant_paye)}* ` +
      `un de vos articles en ligne.\n\n` +
      `Ceci est mon Recu N°: *${recu.facture.numrecu}*\n` +
      `ce ${datePaiement} avec *${walletName}*\n\n` +
      `Voir le recu : ${window.location.href}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const getWalletConfig = (walletType: string) => {
    return walletDisplayConfig[walletType] || {
      name: walletType,
      displayName: walletType.toUpperCase(),
      color: '#6B7280',
      bgGradient: 'from-gray-500 to-gray-600',
      icon: '',
      description: 'Paiement'
    };
  };

  // --- LOADING ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
        >
          <Loader className="w-8 h-8 text-green-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Chargement du reçu...</p>
        </motion.div>
      </div>
    );
  }

  // --- ERROR ---
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center"
        >
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-red-800 mb-1">Reçu introuvable</h2>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </motion.div>
      </div>
    );
  }

  if (!recu) return null;

  const walletConfig = getWalletConfig(recu.paiement.methode_paiement);
  const nbArticles = recu.details_articles?.length || 0;

  return (
    <>
      {/* Styles d'impression */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-zone, .print-zone * { visibility: visible; }
          .print-zone { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100">
        {/* Header structure identique à /produit?token */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 px-4 py-3 shadow-md no-print">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="flex-shrink-0">
              <Image
                src={recu.facture.logo && recu.facture.logo.trim() !== '' ? recu.facture.logo : '/images/logofayclick.png'}
                alt={recu.facture.nom_structure}
                width={40}
                height={40}
                className="rounded-full object-cover border-2 border-white/30"
                onError={(e) => { (e.target as HTMLImageElement).src = '/images/logofayclick.png'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white text-sm truncate">{recu.facture.nom_structure}</h1>
              <p className="text-green-200 text-xs">Reçu de paiement</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="Imprimer / PDF"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handleWhatsAppShare}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="Partager via WhatsApp"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-3 py-4">

          {/* === CARTE RECU === */}
          <motion.div
            ref={printRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden print-zone"
          >
            {/* Badge PAYÉ */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-white flex items-center justify-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">PAIEMENT CONFIRMÉ</span>
            </div>

            {/* Montant principal */}
            <div className="px-4 pt-4 pb-3 text-center border-b border-dashed border-gray-200">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-0.5">Montant payé</p>
              <p className="text-2xl font-bold text-green-600">{formatMontant(recu.paiement.montant_paye)}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <div className={`w-3 h-3 bg-gradient-to-r ${walletConfig.bgGradient} rounded-full`}></div>
                <span className="text-xs text-gray-500">via {walletConfig.displayName}</span>
              </div>
            </div>

            {/* Infos condensées */}
            <div className="px-4 py-3 space-y-2 text-xs">
              {/* N° reçu */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">N° Reçu</span>
                <span className="font-mono font-semibold text-gray-800 text-[11px]">{recu.facture.numrecu}</span>
              </div>
              {/* Client */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Client</span>
                <span className="font-medium text-gray-800">{recu.facture.nom_client}</span>
              </div>
              {/* Téléphone */}
              {recu.facture.tel_client && recu.facture.tel_client !== '000000000' && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Téléphone</span>
                  <span className="text-gray-800">{recu.facture.tel_client}</span>
                </div>
              )}
              {/* N° Facture */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">N° Facture</span>
                <span className="font-mono text-gray-800">{recu.facture.num_facture}</span>
              </div>
              {/* Date */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-800">{formatDate(recu.paiement.date_paiement)} à {formatHeure(recu.paiement.date_paiement)}</span>
              </div>
              {/* Référence */}
              {recu.paiement.reference_transaction && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Réf. transaction</span>
                  <span className="font-mono text-[10px] text-gray-600 max-w-[55%] truncate text-right">{recu.paiement.reference_transaction}</span>
                </div>
              )}
            </div>

            {/* Détails articles (dépliable) */}
            {nbArticles > 0 && (
              <div className="border-t border-gray-100 px-4 py-2.5">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between no-print"
                >
                  <span className="text-xs font-medium text-gray-700">
                    {nbArticles} article{nbArticles > 1 ? 's' : ''}
                  </span>
                  <motion.div animate={{ rotate: showDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <table className="w-full text-[11px] mt-2">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500">
                            <th className="text-left py-1.5 font-medium">Article</th>
                            <th className="text-center py-1.5 font-medium w-10">Qté</th>
                            <th className="text-right py-1.5 font-medium">P.U.</th>
                            <th className="text-right py-1.5 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recu.details_articles.map((article, i) => (
                            <tr key={i} className="border-b border-gray-50">
                              <td className="py-1.5 text-gray-800 font-medium pr-2 max-w-[120px] truncate">{article.nom_produit}</td>
                              <td className="text-center py-1.5 text-gray-600">{article.quantite}</td>
                              <td className="text-right py-1.5 text-gray-600">{formatMontant(article.prix)}</td>
                              <td className="text-right py-1.5 font-medium text-gray-800">{formatMontant(article.sous_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td colSpan={3} className="text-right py-2 font-semibold text-gray-800">Total</td>
                            <td className="text-right py-2 font-bold text-green-600">{formatMontant(recu.paiement.montant_paye)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Footer FayClick */}
            <div className="border-t border-gray-100 py-2 text-center">
              <p className="text-[10px] text-gray-400">Reçu généré par FayClick</p>
            </div>
          </motion.div>

          {/* Copier le lien */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-3 no-print"
          >
            <button
              onClick={handleCopyUrl}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {urlCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {urlCopied ? 'Lien copié !' : 'Copier le lien du reçu'}
            </button>
          </motion.div>

        </div>
      </div>
    </>
  );
}
