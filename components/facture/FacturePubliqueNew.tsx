/**
 * Composant d'affichage de facture publique
 * Utilise les données de get_my_facture
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Printer, 
  Download, 
  CheckCircle, 
  Phone, 
  Calendar,
  ShoppingCart,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import { formatAmount } from '@/utils/formatAmount';

interface FactureDetail {
  id_detail: number;
  id_facture: number;
  date_facture: string;
  nom_produit: string;
  cout_revient: number;
  quantite: number;
  prix: number;
  marge: number;
  id_produit: number;
  sous_total: number;
}

interface FactureData {
  id_facture: number;
  num_facture: string;
  id_structure: number;
  nom_structure: string;
  date_facture: string;
  annee: number;
  mois: number;
  description: string;
  nom_classe: string;
  tel_client: string;
  nom_client: string;
  montant: number;
  id_etat: number;
  libelle_etat: string;
  numrecu: string;
  logo: string;
  tms_update: string | null;
  avec_frais: boolean;
  periode: string;
  mt_reverser: boolean;
  mt_remise: number;
  mt_acompte: number;
  mt_restant: number;
  photo_url: string;
}

interface FactureResume {
  nombre_articles: number;
  quantite_totale: number;
  cout_total_revient: number;
  marge_totale: number;
}

interface FactureComplete {
  facture: FactureData;
  details: FactureDetail[];
  resume: FactureResume;
  timestamp_generation: string;
}

interface Props {
  factureData: FactureComplete;
  onPaymentClick?: () => void;
}

export function FacturePubliqueNew({ factureData, onPaymentClick }: Props) {
  const { facture, details, resume } = factureData;
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  const isPaid = facture.id_etat !== 1;
  const hasDiscount = facture.mt_remise > 0;
  const hasDeposit = facture.mt_acompte > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 print:bg-white">
      {/* Actions flottantes */}
      <div className="fixed top-4 right-4 z-50 flex gap-2 print:hidden">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrint}
          className="bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          title="Imprimer"
        >
          <Printer className="w-5 h-5 text-gray-700" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
          title="Télécharger PDF"
        >
          <Download className="w-5 h-5 text-gray-700" />
        </motion.button>
      </div>

      {/* Conteneur principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none print:rounded-none"
      >
        {/* En-tête avec logo et infos structure */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 print:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {facture.logo ? (
                <Image
                  src={facture.logo}
                  alt={facture.nom_structure}
                  width={60}
                  height={60}
                  className="rounded-full bg-white p-1"
                />
              ) : (
                <div className="w-15 h-15 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {facture.nom_structure.substring(0, 2)}
                  </span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{facture.nom_structure}</h1>
                <p className="text-blue-100">Facture #{facture.num_facture}</p>
              </div>
            </div>
            
            {/* Badge de statut */}
            <div className={`px-4 py-2 rounded-full font-semibold ${
              isPaid 
                ? 'bg-green-500 text-white' 
                : 'bg-yellow-400 text-gray-900'
            }`}>
              {facture.libelle_etat}
            </div>
          </div>
        </div>

        {/* Informations de la facture */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-semibold">
                  {new Date(facture.date_facture).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Client</p>
                <p className="font-semibold">{facture.nom_client}</p>
                <p className="text-sm text-gray-600">{facture.tel_client}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-semibold">{facture.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Détails des articles */}
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            Détail des {facture.nom_classe}s
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-gray-600">
                  <th className="pb-3">Article</th>
                  <th className="pb-3 text-center">Qté</th>
                  <th className="pb-3 text-right">Prix unitaire</th>
                  <th className="pb-3 text-right">Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail) => (
                  <tr key={detail.id_detail} className="border-b">
                    <td className="py-3">
                      <p className="font-medium">{detail.nom_produit}</p>
                    </td>
                    <td className="py-3 text-center">{detail.quantite}</td>
                    <td className="py-3 text-right">
                      {formatAmount(detail.prix)} F
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {formatAmount(detail.sous_total)} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Résumé et totaux */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-semibold">
                {formatAmount(facture.montant + facture.mt_remise)} F
              </span>
            </div>
            
            {hasDiscount && (
              <div className="flex justify-between py-2 text-green-600">
                <span>Remise</span>
                <span className="font-semibold">
                  - {formatAmount(facture.mt_remise)} F
                </span>
              </div>
            )}
            
            <div className="flex justify-between py-3 border-t text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">
                {formatAmount(facture.montant)} F CFA
              </span>
            </div>
            
            {hasDeposit && (
              <>
                <div className="flex justify-between py-2 text-blue-600">
                  <span>Acompte versé</span>
                  <span className="font-semibold">
                    - {formatAmount(facture.mt_acompte)} F
                  </span>
                </div>
                
                <div className="flex justify-between py-3 border-t text-xl font-bold">
                  <span>Reste à payer</span>
                  <span className="text-orange-600">
                    {formatAmount(facture.mt_restant)} F CFA
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bouton de paiement si non payé */}
        {!isPaid && (
          <div className="p-6 bg-gray-50 print:hidden">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPaymentClick}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
            >
              <CreditCard className="w-6 h-6" />
              Payer maintenant
              <span className="ml-2 text-xl">
                {formatAmount(facture.mt_restant || facture.montant)} F
              </span>
            </motion.button>
            
            <p className="text-center text-sm text-gray-500 mt-3">
              Paiement sécurisé par Orange Money, Wave ou Free Money
            </p>
          </div>
        )}

        {/* Badge payé si applicable */}
        {isPaid && (
          <div className="p-6 bg-green-50 print:hidden">
            <div className="flex items-center justify-center gap-3 text-green-600">
              <CheckCircle className="w-8 h-8" />
              <div>
                <p className="font-bold text-lg">Facture payée</p>
                {facture.numrecu && (
                  <p className="text-sm">Reçu: {facture.numrecu}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer avec infos supplémentaires */}
        <div className="px-6 py-4 bg-gray-50 text-center text-xs text-gray-500 print:bg-white">
          <p>Facture générée le {new Date(factureData.timestamp_generation).toLocaleString('fr-FR')}</p>
          <p className="mt-1">
            {resume.nombre_articles} article(s) • 
            Quantité totale: {resume.quantite_totale}
          </p>
        </div>
      </motion.div>
    </div>
  );
}