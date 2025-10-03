/**
 * Composant d'affichage de l'état actuel de l'abonnement
 * Affiche: État, Date limite, Type d'abonnement
 */

'use client';

import { motion } from 'framer-motion';
import {
  Crown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  CurrentSubscriptionState,
  SubscriptionStatus,
  formatSubscriptionDate,
  isExpiringSoon,
  getDaysRemaining,
  STATUS_COLORS
} from '@/types/subscription.types';

interface CurrentSubscriptionStatusProps {
  subscription: CurrentSubscriptionState;
}

/**
 * Icône selon le statut
 */
function getStatusIcon(statut: SubscriptionStatus) {
  switch (statut) {
    case 'ACTIF':
      return <CheckCircle className="w-6 h-6 text-emerald-600" />;
    case 'EXPIRE':
      return <XCircle className="w-6 h-6 text-red-600" />;
    case 'EN_ATTENTE':
      return <Clock className="w-6 h-6 text-orange-600" />;
    case 'ANNULE':
      return <XCircle className="w-6 h-6 text-gray-600" />;
    default:
      return <Crown className="w-6 h-6 text-gray-400" />;
  }
}

/**
 * Message selon le statut et la date
 */
function getStatusMessage(
  statut: SubscriptionStatus,
  dateLimite: string
): { text: string; color: string } {
  if (statut === 'EXPIRE') {
    return {
      text: 'Votre abonnement a expiré',
      color: 'text-red-700'
    };
  }

  if (statut === 'ANNULE') {
    return {
      text: 'Abonnement annulé',
      color: 'text-gray-700'
    };
  }

  if (statut === 'EN_ATTENTE') {
    return {
      text: 'Paiement en attente de confirmation',
      color: 'text-orange-700'
    };
  }

  // ACTIF
  const daysRemaining = getDaysRemaining(dateLimite);

  if (daysRemaining < 0) {
    return {
      text: 'Abonnement expiré',
      color: 'text-red-700'
    };
  }

  if (daysRemaining === 0) {
    return {
      text: 'Expire aujourd\'hui',
      color: 'text-orange-700'
    };
  }

  if (daysRemaining === 1) {
    return {
      text: 'Expire demain',
      color: 'text-orange-700'
    };
  }

  if (daysRemaining <= 7) {
    return {
      text: `Expire dans ${daysRemaining} jours`,
      color: 'text-orange-700'
    };
  }

  return {
    text: `Valide jusqu'au ${formatSubscriptionDate(dateLimite)}`,
    color: 'text-emerald-700'
  };
}

export default function CurrentSubscriptionStatus({
  subscription
}: CurrentSubscriptionStatusProps) {
  const expiringSoon = subscription.date_limite_abonnement
    ? isExpiringSoon(subscription.date_limite_abonnement)
    : false;

  const statusMessage = subscription.date_limite_abonnement
    ? getStatusMessage(subscription.etat_abonnement, subscription.date_limite_abonnement)
    : { text: 'Aucun abonnement actif', color: 'text-gray-700' };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`p-5 md:p-6 rounded-xl border-2 shadow-lg ${
        subscription.etat_abonnement === 'ACTIF' && !expiringSoon
          ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
          : subscription.etat_abonnement === 'ACTIF' && expiringSoon
          ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'
          : subscription.etat_abonnement === 'EXPIRE'
          ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
          : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
          subscription.etat_abonnement === 'ACTIF' && !expiringSoon
            ? 'bg-gradient-to-br from-emerald-500 to-green-600'
            : subscription.etat_abonnement === 'ACTIF' && expiringSoon
            ? 'bg-gradient-to-br from-orange-500 to-amber-600'
            : subscription.etat_abonnement === 'EXPIRE'
            ? 'bg-gradient-to-br from-red-500 to-pink-600'
            : 'bg-gradient-to-br from-gray-400 to-slate-500'
        }`}>
          {subscription.etat_abonnement === 'ACTIF' && !expiringSoon ? (
            <Crown className="w-6 h-6 text-white" />
          ) : expiringSoon ? (
            <AlertTriangle className="w-6 h-6 text-white" />
          ) : (
            getStatusIcon(subscription.etat_abonnement)
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">État de votre abonnement</h3>
          <p className={`text-sm font-medium ${statusMessage.color}`}>
            {statusMessage.text}
          </p>
        </div>
      </div>

      {/* Informations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* État */}
        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
          <div className="flex items-center gap-2 mb-1">
            {getStatusIcon(subscription.etat_abonnement)}
            <p className="text-xs text-gray-600 font-medium">État</p>
          </div>
          <p className={`font-bold ${STATUS_COLORS[subscription.etat_abonnement].replace('bg-', 'text-').replace('/100', '-700')}`}>
            {subscription.etat_abonnement}
          </p>
        </div>

        {/* Date limite */}
        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-gray-600" />
            <p className="text-xs text-gray-600 font-medium">Date limite</p>
          </div>
          <p className="font-bold text-gray-900">
            {subscription.date_limite_abonnement
              ? formatSubscriptionDate(subscription.date_limite_abonnement)
              : '-'
            }
          </p>
          {subscription.date_limite_abonnement && subscription.etat_abonnement === 'ACTIF' && (
            <p className="text-xs text-gray-600 mt-1">
              {getDaysRemaining(subscription.date_limite_abonnement)} jours restants
            </p>
          )}
        </div>

        {/* Type abonnement */}
        <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-white/80">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-gray-600" />
            <p className="text-xs text-gray-600 font-medium">Type</p>
          </div>
          <p className="font-bold text-gray-900">
            {subscription.type_abonnement || 'Aucun'}
          </p>
        </div>
      </div>

      {/* Alerte expiration */}
      {subscription.etat_abonnement === 'ACTIF' && expiringSoon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-900">
                Renouvellement recommandé
              </p>
              <p className="text-xs text-orange-800 mt-1">
                Votre abonnement arrive à échéance. Pensez à le renouveler pour continuer à profiter de FayClick sans interruption.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Abonnement expiré */}
      {subscription.etat_abonnement === 'EXPIRE' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900">
                Abonnement expiré
              </p>
              <p className="text-xs text-red-800 mt-1">
                Votre abonnement a expiré. Souscrivez à un nouvel abonnement pour continuer à utiliser FayClick.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
