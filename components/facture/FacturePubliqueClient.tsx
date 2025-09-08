'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt, 
  User, 
  Phone, 
  Calendar, 
  Package,
  DollarSign,
  CreditCard,
  AlertCircle,
  Loader,
  Eye,
  EyeOff
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { decodeFactureParams } from '@/lib/url-encoder';
import { facturePubliqueService } from '@/services/facture-publique.service';
import { FactureComplete } from '@/types/facture';

interface FacturePubliqueClientProps {
  token: string;
}

export default function FacturePubliqueClient({ token }: FacturePubliqueClientProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const [facture, setFacture] = useState<FactureComplete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrices, setShowPrices] = useState(false);

  useEffect(() => {
    loadFacture();
  }, [token]);

  const loadFacture = async () => {
    try {
      setLoading(true);
      setError(null);

      // Décoder les paramètres depuis l'URL
      const result = decodeFactureParams(token);
      
      if (!result || !result.id_structure || !result.id_facture) {
        throw new Error('Token de facture invalide');
      }

      const { id_structure: idStructure, id_facture: idFacture } = result;

      // Charger les détails de la facture
      const factureData = await facturePubliqueService.getFacturePublique(idStructure, idFacture);
      
      if (!factureData) {
        throw new Error('Facture introuvable');
      }

      setFacture(factureData);
    } catch (err: any) {
      console.error('Erreur lors du chargement de la facture:', err);
      setError(err.message || 'Impossible de charger la facture');
    } finally {
      setLoading(false);
    }
  };

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

  // Styles responsifs
  const getStyles = () => {
    if (isMobile) {
      return {
        container: 'px-4 py-6',
        card: 'p-4',
        title: 'text-lg',
        subtitle: 'text-sm'
      };
    } else if (isMobileLarge) {
      return {
        container: 'px-6 py-8',
        card: 'p-6',
        title: 'text-xl',
        subtitle: 'text-base'
      };
    } else {
      return {
        container: 'px-8 py-10',
        card: 'p-8',
        title: 'text-2xl',
        subtitle: 'text-lg'
      };
    }
  };

  const styles = getStyles();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-blue-600 font-medium">Chargement de la facture...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-800 mb-2">Erreur</h1>
          <p className="text-red-600 mb-6">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!facture) return null;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${styles.container}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* En-tête de la facture */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white rounded-2xl shadow-xl ${styles.card} mb-6`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className={`${styles.title} font-bold text-gray-900`}>
                  Facture #{facture.facture.num_facture}
                </h1>
                <p className={`${styles.subtitle} text-gray-600`}>
                  {formatDate(facture.facture.date_facture)}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowPrices(!showPrices)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {showPrices ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span className="text-sm font-medium">
                {showPrices ? 'Masquer' : 'Afficher'} les prix
              </span>
            </button>
          </div>

          {/* Informations client */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Informations Client
              </h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>Nom:</strong> {facture.facture.nom_client}</p>
                <p><strong>Téléphone:</strong> {facture.facture.tel_client}</p>
                <p><strong>Adresse:</strong> {'Non spécifiée'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Informations Facturation
              </h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>Statut:</strong> 
                  <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                    facture.facture.libelle_etat === 'PAYEE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {facture.facture.libelle_etat === 'PAYEE' ? 'Payée' : 'En attente'}
                  </span>
                </p>
                <p><strong>Mode paiement:</strong> {'Non spécifié'}</p>
                <p><strong>Montant:</strong> {formatMontant(facture.facture.montant)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Détails des produits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`bg-white rounded-2xl shadow-xl ${styles.card}`}
        >
          <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Détails de la commande
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Produit</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Qté</th>
                  {showPrices && (
                    <>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Prix Unit.</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {facture.details?.map((item, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="border-b border-gray-100"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.nom_produit}</p>
                        <p className="text-sm text-gray-600">Code: {item.id_produit}</p>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 font-medium">
                      {item.quantite}
                    </td>
                    {showPrices && (
                      <>
                        <td className="text-right py-3 px-4">
                          {formatMontant(item.prix)}
                        </td>
                        <td className="text-right py-3 px-4 font-medium">
                          {formatMontant(item.sous_total)}
                        </td>
                      </>
                    )}
                  </motion.tr>
                ))}
              </tbody>
              {showPrices && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="text-right py-4 px-4 font-bold text-lg">
                      Total:
                    </td>
                    <td className="text-right py-4 px-4 font-bold text-lg text-blue-600">
                      {formatMontant(facture.facture.montant)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {!showPrices && (
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Les prix sont masqués. Cliquez sur "Afficher les prix" pour les voir.
              </p>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-gray-600"
        >
          <p className="text-sm">
            Facture générée par <strong>FayClick</strong> - Commerce Digital Sénégal
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}