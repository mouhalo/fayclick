/**
 * Page publique d'affichage des factures avec token en paramètre URL
 * Route: /facture?token=xxx
 * SANS authentification - Appel direct à la DB
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Shield } from 'lucide-react';
import { facturePubliqueService } from '@/services/facture-publique.service';
import { FacturePubliqueNew } from '@/components/facture/FacturePubliqueNew';
import { ModalPaiementWalletNew, WalletType } from '@/components/facture/ModalPaiementWalletNew';
import { decodeFactureParams, isValidEncodedToken } from '@/lib/url-encoder';

function FactureContent() {
  const searchParams = useSearchParams();
  const [facture, setFacture] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decodedParams, setDecodedParams] = useState<{id_structure: number; id_facture: number} | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    // Extraire et décoder le token depuis les paramètres URL
    const tokenParam = searchParams.get('token');
    
    if (!tokenParam) {
      setError('Token manquant dans l\'URL');
      setLoading(false);
      return;
    }

    // Validation basique du format
    if (!isValidEncodedToken(tokenParam)) {
      setError('Token invalide');
      setLoading(false);
      return;
    }

    // Décoder le token pour récupérer id_structure et id_facture
    console.log('🔍 Décodage token:', tokenParam);
    const decoded = decodeFactureParams(tokenParam);
    
    if (!decoded) {
      setError('Token corrompu ou invalide');
      setLoading(false);
      return;
    }

    console.log('✅ Token décodé avec succès:', decoded);
    setDecodedParams(decoded);
    
    // Charger la facture directement via l'API publique (SANS authentification)
    loadFacturePublique(decoded.id_structure, decoded.id_facture);
  }, [searchParams]);

  const loadFacturePublique = async (idStructure: number, idFacture: number) => {
    try {
      setLoading(true);
      setError(null);

      console.log('📄 Chargement facture publique:', { idStructure, idFacture });
      
      // Appel direct à la base de données
      const data = await facturePubliqueService.getFacturePublique(idStructure, idFacture);
      
      // Ajouter le logo FayClick si pas de logo structure
      if (!data.facture.logo || data.facture.logo === '') {
        data.facture.logo = '/images/logo.png';
      }
      
      setFacture(data);
      console.log('✅ Facture publique chargée avec succès', data);
      
    } catch (err: any) {
      console.error('❌ Erreur chargement facture publique:', err);
      
      if (err.statusCode === 404) {
        setError('Facture introuvable');
      } else if (err.statusCode === 400) {
        setError('Paramètres de facture invalides');
      } else {
        setError('Erreur lors du chargement de la facture');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = (wallet: WalletType) => {
    console.log('💳 Paiement effectué avec:', wallet);
    setShowPaymentModal(false);
    // TODO: Appeler l'API pour marquer la facture comme payée
    // TODO: Afficher un message de succès
    // Rafraîchir la page après paiement
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handleOpenPayment = () => {
    setShowPaymentModal(true);
  };

  // État de chargement avec animation sécurisée
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-1"
          >
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </motion.div>
          <p className="text-gray-600 font-medium">Chargement sécurisé de la facture...</p>
          {decodedParams && (
            <p className="text-xs text-gray-400 mt-2">
              Structure: {decodedParams.id_structure} • Facture: {decodedParams.id_facture}
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  // État d'erreur avec détails techniques
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Accès refusé</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          
          {decodedParams && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p className="text-gray-500">Facture demandée :</p>
              <p className="font-mono text-xs">
                Structure: {decodedParams.id_structure} • Facture: {decodedParams.id_facture}
              </p>
            </div>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            Réessayer
          </button>
        </motion.div>
      </div>
    );
  }

  // Affichage de la facture
  if (facture) {
    return (
      <>
        {/* Composant de facture avec les nouvelles données */}
        <FacturePubliqueNew
          factureData={facture}
          onPaymentClick={handleOpenPayment}
        />

        {/* Modal de paiement */}
        <ModalPaiementWalletNew
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          montant={facture.facture.mt_restant || facture.facture.montant}
          numeroFacture={facture.facture.num_facture}
          onPaymentComplete={handlePaymentComplete}
        />

        {/* Indicateur discret en bas pour debug */}
        {process.env.NODE_ENV === 'development' && decodedParams && (
          <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded print:hidden z-50">
            Token: {searchParams.get('token')} → {decodedParams.id_structure}-{decodedParams.id_facture}
          </div>
        )}
      </>
    );
  }

  return null;
}

// Composant parent avec Suspense boundary
export default function FacturePubliquePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
          />
        </div>
      }>
        <FactureContent />
      </Suspense>
    </div>
  );
}