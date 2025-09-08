/**
 * Page publique de consultation d'une facture partagée
 * Accessible via URL encodée sécurisée
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { factureListService } from '@/services/facture-list.service';
import { FactureComplete } from '@/types/facture';

export default function FacturePubliquePage() {
  const params = useParams();
  const { isMobile, isMobileLarge } = useBreakpoint();
  const token = params.token as string;

  // États
  const [facture, setFacture] = useState<FactureComplete | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  // Décodage du token et chargement de la facture
  useEffect(() => {
    const loadFacture = async () => {
      if (!token) {
        setError('Token de facture manquant');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Décoder le token pour récupérer les paramètres
        const params = decodeFactureParams(token);
        
        if (!params || !params.id_structure || !params.id_facture) {
          setError('Token de facture invalide');
          setLoading(false);
          return;
        }

        // TODO: Créer un service public pour récupérer les factures
        // Pour l'instant, utiliser le service existant (à adapter pour l'usage public)
        console.log('Chargement facture publique:', params);
        
        // Simulation temporaire
        setTimeout(() => {
          setError('Service de consultation publique en cours d\'implémentation');
          setLoading(false);
        }, 1000);

      } catch (error: any) {
        console.error('Erreur décodage token:', error);
        setError('Token de facture invalide ou expiré');
        setLoading(false);
      }
    };

    loadFacture();
  }, [token]);

  // Styles responsives
  const getStyles = () => {
    if (isMobile) {
      return {
        container: 'p-4',
        title: 'text-lg',
        subtitle: 'text-sm',
        card: 'p-4',
        icon: 'w-5 h-5',
        button: 'text-sm px-3 py-2'
      };
    } else if (isMobileLarge) {
      return {
        container: 'p-6',
        title: 'text-xl',
        subtitle: 'text-base',
        card: 'p-5',
        icon: 'w-6 h-6',
        button: 'text-base px-4 py-2.5'
      };
    } else {
      return {
        container: 'p-8',
        title: 'text-2xl',
        subtitle: 'text-lg',
        card: 'p-6',
        icon: 'w-6 h-6',
        button: 'text-base px-5 py-3'
      };
    }
  };

  const styles = getStyles();

  // Formatage des dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Interface de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <h2 className={`text-gray-900 font-semibold mb-2 ${styles.title}`}>
            Chargement de la facture
          </h2>
          <p className={`text-gray-600 ${styles.subtitle}`}>
            Veuillez patienter...
          </p>
        </motion.div>
      </div>
    );
  }

  // Interface d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50/30 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className={`text-red-900 font-semibold mb-2 ${styles.title}`}>
            Facture non accessible
          </h2>
          <p className={`text-red-700 mb-6 ${styles.subtitle}`}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className={`
              bg-red-500 text-white rounded-xl hover:bg-red-600 
              transition-colors font-medium
              ${styles.button}
            `}
          >
            Réessayer
          </button>
        </motion.div>
      </div>
    );
  }

  // Interface facture (temporairement désactivée)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50/30">
      <div className={`max-w-4xl mx-auto ${styles.container}`}>
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className={`text-gray-900 font-bold mb-2 ${styles.title}`}>
            Consultation de Facture
          </h1>
          <p className={`text-gray-600 ${styles.subtitle}`}>
            FayClick - Gestion Commerciale
          </p>
        </motion.div>

        {/* Message temporaire */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className={`
            bg-gradient-to-br from-amber-50 to-amber-100/50 
            border border-amber-200 rounded-2xl ${styles.card}
            text-center
          `}
        >
          <div className="w-12 h-12 bg-amber-200 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-amber-700" />
          </div>
          <h3 className={`text-amber-900 font-semibold mb-2 ${styles.subtitle}`}>
            Fonctionnalité en développement
          </h3>
          <p className={`text-amber-800 ${styles.subtitle}`}>
            La consultation publique des factures sera bientôt disponible.<br />
            Token décodé : {token}
          </p>
        </motion.div>

        {/* Pied de page */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-center mt-8 pt-8 border-t border-gray-200"
        >
          <p className={`text-gray-500 ${styles.subtitle}`}>
            © 2025 FayClick - Système de gestion commerciale
          </p>
        </motion.div>
      </div>
    </div>
  );
}