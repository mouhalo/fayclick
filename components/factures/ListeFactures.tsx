/**
 * Composant de liste des factures avec expansion/collapse
 * Interface responsive avec toutes les actions disponibles
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Calendar, 
  User, 
  Phone, 
  Receipt, 
  DollarSign,
  CreditCard,
  Share2,
  Eye,
  Package
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { FactureComplete } from '@/types/facture';

interface ListeFacturesProps {
  factures: FactureComplete[];
  loading?: boolean;
  onVoirDetails?: (facture: FactureComplete) => void;
  onAjouterAcompte?: (facture: FactureComplete) => void;
  onPartager?: (facture: FactureComplete) => void;
}

export function ListeFactures({ 
  factures, 
  loading = false,
  onVoirDetails,
  onAjouterAcompte,
  onPartager
}: ListeFacturesProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const [expandedFactures, setExpandedFactures] = useState<Set<number>>(new Set());

  // Gérer l'expansion/collapse d'une facture
  const toggleExpanded = (idFacture: number) => {
    const newExpanded = new Set(expandedFactures);
    if (newExpanded.has(idFacture)) {
      newExpanded.delete(idFacture);
    } else {
      newExpanded.add(idFacture);
    }
    setExpandedFactures(newExpanded);
  };

  // Styles responsives
  const getStyles = () => {
    if (isMobile) {
      return {
        container: 'space-y-3',
        card: 'p-3',
        title: 'text-sm font-semibold',
        subtitle: 'text-xs',
        badge: 'text-xs px-2 py-1',
        button: 'text-xs px-2 py-1',
        icon: 'w-4 h-4',
        amount: 'text-base font-bold',
        detailItem: 'text-xs'
      };
    } else if (isMobileLarge) {
      return {
        container: 'space-y-4',
        card: 'p-4',
        title: 'text-base font-semibold',
        subtitle: 'text-sm',
        badge: 'text-sm px-3 py-1.5',
        button: 'text-sm px-3 py-1.5',
        icon: 'w-5 h-5',
        amount: 'text-lg font-bold',
        detailItem: 'text-sm'
      };
    } else {
      return {
        container: 'space-y-4',
        card: 'p-6',
        title: 'text-lg font-semibold',
        subtitle: 'text-base',
        badge: 'text-sm px-3 py-2',
        button: 'text-sm px-4 py-2',
        icon: 'w-5 h-5',
        amount: 'text-xl font-bold',
        detailItem: 'text-base'
      };
    }
  };

  const styles = getStyles();

  // Badge de statut
  const getStatusBadge = (statut: string) => {
    const baseClasses = `${styles.badge} rounded-full font-medium`;
    
    if (statut === 'PAYEE') {
      return `${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200`;
    } else {
      return `${baseClasses} bg-amber-100 text-amber-800 border border-amber-200`;
    }
  };

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return <ListeFacturesLoading />;
  }

  if (!factures || factures.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">Aucune facture trouvée</h3>
        <p className="text-gray-400">Aucune facture ne correspond à vos critères de recherche.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {factures.map((factureComplete, index) => {
        const { facture, details, resume } = factureComplete;
        const isExpanded = expandedFactures.has(facture.id_facture);

        return (
          <motion.div
            key={facture.id_facture}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`
              bg-gradient-to-br from-white to-gray-50/30 
              border border-white/50 rounded-2xl 
              shadow-sm hover:shadow-md transition-all duration-200
              backdrop-blur-sm overflow-hidden
              ${styles.card}
            `}
          >
            {/* En-tête de la facture (toujours visible) */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Numéro et date */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-blue-900 ${styles.title}`}>
                    {facture.num_facture}
                  </h3>
                  <span className={getStatusBadge(facture.libelle_etat)}>
                    {facture.libelle_etat}
                  </span>
                </div>

                {/* Informations client */}
                <div className={`space-y-1 mb-3 text-gray-600 ${styles.subtitle}`}>
                  <div className="flex items-center">
                    <User className={`${styles.icon} mr-2`} />
                    <span>{facture.nom_client}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className={`${styles.icon} mr-2`} />
                    <span>{facture.tel_client}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className={`${styles.icon} mr-2`} />
                    <span>{formatDate(facture.date_facture)}</span>
                  </div>
                </div>

                {/* Montants */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-gray-900 ${styles.amount}`}>
                      {facture.montant.toLocaleString('fr-FR')} FCFA
                    </p>
                    {facture.mt_restant > 0 && (
                      <p className={`text-amber-600 font-medium ${styles.subtitle}`}>
                        Reste: {facture.mt_restant.toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                  </div>
                  
                  {/* Bouton expand/collapse */}
                  <button
                    onClick={() => toggleExpanded(facture.id_facture)}
                    className={`
                      bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 
                      transition-colors flex items-center space-x-1
                      ${styles.button}
                    `}
                  >
                    <span className="hidden sm:inline">Détails</span>
                    <ChevronDown 
                      className={`${styles.icon} transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Détails expandables */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    {/* Résumé */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className={`text-center ${styles.detailItem}`}>
                        <Package className={`${styles.icon} mx-auto mb-1 text-gray-400`} />
                        <p className="font-medium">{resume.nombre_articles}</p>
                        <p className="text-gray-500">Articles</p>
                      </div>
                      <div className={`text-center ${styles.detailItem}`}>
                        <Receipt className={`${styles.icon} mx-auto mb-1 text-gray-400`} />
                        <p className="font-medium">{resume.quantite_totale}</p>
                        <p className="text-gray-500">Quantité</p>
                      </div>
                      <div className={`text-center ${styles.detailItem}`}>
                        <DollarSign className={`${styles.icon} mx-auto mb-1 text-gray-400`} />
                        <p className="font-medium">{resume.cout_total_revient.toLocaleString('fr-FR')}</p>
                        <p className="text-gray-500">Coût revient</p>
                      </div>
                      <div className={`text-center ${styles.detailItem}`}>
                        <CreditCard className={`${styles.icon} mx-auto mb-1 text-gray-400`} />
                        <p className="font-medium text-emerald-600">{resume.marge_totale.toLocaleString('fr-FR')}</p>
                        <p className="text-gray-500">Marge</p>
                      </div>
                    </div>

                    {/* Liste des articles */}
                    <div className="space-y-2 mb-4">
                      <h4 className={`font-semibold text-gray-700 ${styles.subtitle}`}>
                        Détails des articles
                      </h4>
                      {details.map((detail, idx) => (
                        <div key={idx} className="bg-white/50 rounded-lg p-3 border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`font-medium text-gray-900 ${styles.detailItem}`}>
                                {detail.nom_produit}
                              </p>
                              <p className={`text-gray-500 ${styles.detailItem}`}>
                                Qté: {detail.quantite} × {detail.prix.toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold text-gray-900 ${styles.detailItem}`}>
                                {detail.sous_total.toLocaleString('fr-FR')} FCFA
                              </p>
                              <p className={`text-emerald-600 ${styles.detailItem}`}>
                                +{detail.marge.toLocaleString('fr-FR')} marge
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 justify-end">
                      {onVoirDetails && (
                        <button
                          onClick={() => onVoirDetails(factureComplete)}
                          className={`
                            bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                            transition-colors flex items-center space-x-1
                            ${styles.button}
                          `}
                        >
                          <Eye className={styles.icon} />
                          <span>Voir</span>
                        </button>
                      )}

                      {facture.libelle_etat === 'IMPAYEE' && onAjouterAcompte && (
                        <button
                          onClick={() => onAjouterAcompte(factureComplete)}
                          className={`
                            bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 
                            transition-colors flex items-center space-x-1
                            ${styles.button}
                          `}
                        >
                          <CreditCard className={styles.icon} />
                          <span>Payer</span>
                        </button>
                      )}

                      {onPartager && (
                        <button
                          onClick={() => onPartager(factureComplete)}
                          className={`
                            bg-amber-500 text-white rounded-lg hover:bg-amber-600 
                            transition-colors flex items-center space-x-1
                            ${styles.button}
                          `}
                        >
                          <Share2 className={styles.icon} />
                          <span>Partager</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// Composant de loading
export function ListeFacturesLoading() {
  const { isMobile, isMobileLarge } = useBreakpoint();

  const getLoadingStyles = () => {
    if (isMobile) {
      return {
        container: 'space-y-3',
        card: 'p-3 h-32'
      };
    } else if (isMobileLarge) {
      return {
        container: 'space-y-4',
        card: 'p-4 h-36'
      };
    } else {
      return {
        container: 'space-y-4',
        card: 'p-6 h-40'
      };
    }
  };

  const styles = getLoadingStyles();

  return (
    <div className={styles.container}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`
            bg-gradient-to-br from-gray-100 to-gray-200 
            rounded-2xl animate-pulse
            ${styles.card}
          `}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3"></div>
              <div className="h-5 bg-gray-300 rounded w-1/4"></div>
            </div>
            <div className="w-20 h-8 bg-gray-300 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}