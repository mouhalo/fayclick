'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt,
  User,
  Package,
  AlertCircle,
  Loader,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle,
  CreditCard,
  Share,
  Copy,
  Check
} from 'lucide-react';
import { decodeFactureParams } from '@/lib/url-encoder';
import { RecuDetails, WalletDisplayConfig } from '@/types/recu';
import { recuService } from '@/services/recu.service';

interface RecuPubliqueClientProps {
  token: string;
}

// Configuration d'affichage des wallets pour reçus
const walletDisplayConfig: WalletDisplayConfig = {
  'orange-money': {
    name: 'orange-money',
    displayName: 'Orange Money',
    color: '#FF6B00',
    bgGradient: 'from-orange-500 to-orange-600',
    icon: '/images/om.png',
    description: 'Mobile Money Orange'
  },
  'wave': {
    name: 'wave',
    displayName: 'Wave',
    color: '#00D4FF',
    bgGradient: 'from-blue-400 to-cyan-500',
    icon: '/images/wave.png',
    description: 'Wave Mobile Money'
  },
  'free-money': {
    name: 'free-money',
    displayName: 'Free Money',
    color: '#1E40AF',
    bgGradient: 'from-blue-600 to-blue-700',
    icon: '/images/free.png',
    description: 'Free Money Mobile'
  }
};

export default function RecuPubliqueClient({ token }: RecuPubliqueClientProps) {

  const [recu, setRecu] = useState<RecuDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour l'affichage
  const [showPrices, setShowPrices] = useState(true); // Montants visibles par défaut pour reçus
  const [showDetails, setShowDetails] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Charger les données du reçu
  useEffect(() => {
    const loadRecuData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Décoder le token pour extraire les paramètres
        const params = decodeFactureParams(token);
        if (!params) {
          throw new Error('Token de reçu invalide');
        }

        // Récupérer le reçu via le service
        const recuData = await recuService.getRecuPublique(params.id_structure, params.id_facture);
        setRecu(recuData);
      } catch (err: unknown) {
        console.error('Erreur chargement reçu:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement du reçu');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadRecuData();
    }
  }, [token]);

  const formatMontant = (montant: number): string => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(montant);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-SN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('fr-SN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
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

    const message = `🧾 *Reçu de Paiement*\n\n` +
      `📋 Reçu N°: ${recu.facture.numrecu}\n` +
      `🏪 ${recu.facture.nom_structure}\n` +
      `👤 Client: ${recu.facture.nom_client}\n` +
      `💰 Montant: ${formatMontant(recu.paiement.montant_paye)}\n` +
      `💳 Paiement: ${walletDisplayConfig[recu.paiement.methode_paiement]?.displayName}\n` +
      `📅 Payé le: ${formatDate(recu.paiement.date_paiement)}\n\n` +
      `🔗 Voir le reçu: ${window.location.href}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getWalletConfig = (walletType: string) => {
    return walletDisplayConfig[walletType] || {
      name: walletType,
      displayName: walletType.toUpperCase(),
      color: '#6B7280',
      bgGradient: 'from-gray-500 to-gray-600',
      icon: '',
      description: 'Paiement Mobile'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chargement du reçu
          </h2>
          <p className="text-gray-600">
            Récupération des informations de paiement...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Reçu introuvable
          </h2>
          <p className="text-red-600 mb-4">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Réessayer
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (!recu) return null;

  const walletConfig = getWalletConfig(recu.paiement.methode_paiement);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header avec badge "Reçu Payé" */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6"
        >
          {/* En-tête avec gradient vert succès */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Receipt className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Reçu de Paiement</h1>
                  <p className="text-green-100 text-sm">
                    {recu.facture.nom_structure}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/20 rounded-lg px-3 py-1 mb-2">
                  <span className="text-sm font-medium">PAYÉ</span>
                </div>
                <CheckCircle className="w-6 h-6 mx-auto" />
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-6">
            {/* Informations du reçu */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Informations client */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Informations Client
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Nom:</strong> {recu.facture.nom_client}</p>
                  <p><strong>Téléphone:</strong> {recu.facture.tel_client}</p>
                  <p><strong>Description:</strong> {recu.facture.description}</p>
                </div>
              </div>

              {/* Informations paiement */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Détails Paiement
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Méthode:</strong> {walletConfig.displayName}</p>
                  <p><strong>Référence:</strong> {recu.paiement.reference_transaction}</p>
                  <p><strong>Date:</strong> {formatDateTime(recu.paiement.date_paiement)}</p>
                </div>
              </div>
            </div>

            {/* Numéro de reçu et montant */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">Numéro de Reçu</p>
                <p className="text-lg font-mono font-semibold text-gray-900 mb-4">
                  {recu.facture.numrecu}
                </p>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <button
                    onClick={() => setShowPrices(!showPrices)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title={showPrices ? 'Masquer le montant' : 'Afficher le montant'}
                  >
                    {showPrices ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <p className="text-gray-600 text-sm mb-2">Montant Payé</p>
                <p className="text-4xl font-bold text-green-600">
                  {showPrices ? formatMontant(recu.paiement.montant_paye) : '••••••'}
                </p>

                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className={`w-4 h-4 bg-gradient-to-r ${walletConfig.bgGradient} rounded-full`}></div>
                  <span className="text-sm text-gray-600">
                    Payé via {walletConfig.displayName}
                  </span>
                </div>
              </div>
            </div>

            {/* Détails des articles */}
            {recu.details_articles && recu.details_articles.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Détails de la commande ({recu.details_articles.length} article{recu.details_articles.length > 1 ? 's' : ''})
                  </h3>
                  <motion.div
                    animate={{ rotate: showDetails ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-medium text-gray-900">Article</th>
                              <th className="text-center py-2 px-2 font-medium text-gray-900">Qté</th>
                              <th className="text-right py-2 px-2 font-medium text-gray-900">Prix Unit.</th>
                              <th className="text-right py-2 px-2 font-medium text-gray-900">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recu.details_articles.map((article, index) => (
                              <tr key={index} className="border-b border-gray-100">
                                <td className="py-2 px-2 font-medium text-gray-900">
                                  {article.nom_produit}
                                </td>
                                <td className="text-center py-2 px-2">
                                  {article.quantite}
                                </td>
                                <td className="text-right py-2 px-2">
                                  {showPrices ? formatMontant(article.prix) : '•••••'}
                                </td>
                                <td className="text-right py-2 px-2 font-medium">
                                  {showPrices ? formatMontant(article.sous_total) : '•••••'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions de partage */}
            <div className="flex flex-col sm:flex-row gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleWhatsAppShare}
                className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Share className="w-5 h-5" />
                Partager via WhatsApp
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyUrl}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {urlCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {urlCopied ? 'Copié !' : 'Copier le lien'}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-gray-500 text-sm"
        >
          <p>Reçu généré par FayClick • Paiement sécurisé</p>
        </motion.div>
      </div>
    </div>
  );
}