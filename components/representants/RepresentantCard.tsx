'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Wallet, Pause, Play, KeyRound, Edit3, Mail } from 'lucide-react';
import { RepresentantData, getStatutRepresentant } from '@/types/representant';

interface RepresentantCardProps {
  representant: RepresentantData;
  index?: number;
  onEdit?: (rep: RepresentantData) => void;
  onSuspendre?: (rep: RepresentantData) => void;
  onReactiver?: (rep: RepresentantData) => void;
  onResetPwd?: (rep: RepresentantData) => void;
}

const STATUT_STYLES: Record<string, string> = {
  ACTIF: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  SUSPENDU: 'bg-amber-100 text-amber-700 border-amber-200',
  INACTIF: 'bg-gray-200 text-gray-700 border-gray-300',
  NOUVEAU: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
};

const STATUT_LABELS: Record<string, string> = {
  ACTIF: 'Actif réseau',
  SUSPENDU: 'Suspendu',
  INACTIF: 'Inactif',
  NOUVEAU: 'Nouveau',
};

function getInitials(rep: RepresentantData): string {
  const n = (rep.nom_rep || rep.username || '?').trim();
  const p = (rep.prenom_rep || '').trim();
  if (p && n) return (p[0] + n[0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function RepresentantCard({
  representant,
  index = 0,
  onEdit,
  onSuspendre,
  onReactiver,
  onResetPwd,
}: RepresentantCardProps) {
  const statut = getStatutRepresentant(representant);
  const estActifReseau = representant.actif && representant.actif_reseau;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {getInitials(representant)}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate">
              {representant.prenom_rep} {representant.nom_rep}
            </h3>
            <span
              className={`px-2 py-0.5 text-xs font-semibold rounded border ${STATUT_STYLES[statut]}`}
            >
              {STATUT_LABELS[statut]}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-2 truncate">@{representant.username}</p>

          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-fuchsia-500 flex-shrink-0" />
              <span>{representant.telephone}</span>
              {representant.telephone_terrain &&
                representant.telephone_terrain !== representant.telephone && (
                  <span className="text-xs text-gray-400">
                    (terrain : {representant.telephone_terrain})
                  </span>
                )}
            </div>

            {representant.email_rep && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-fuchsia-500 flex-shrink-0" />
                <span className="truncate">{representant.email_rep}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-fuchsia-500 flex-shrink-0" />
              <span className="truncate">
                {representant.localite?.nom_localite || `Localité #${representant.id_localite}`}
                {representant.localite?.nom_commune && (
                  <span className="text-gray-400"> · {representant.localite.nom_commune}</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-fuchsia-500 flex-shrink-0" />
              <span className="text-xs">
                {representant.mode_encaissement === 'WALLET_STRUCTURE'
                  ? 'Encaissement → Wallet structure'
                  : 'Encaissement libre (CASH/wallet manuel)'}
              </span>
            </div>

            <p className="text-xs text-gray-400 mt-1">
              Créé le {formatDate(representant.user_createdat)}
            </p>
          </div>

          {/* KPIs agrégés si disponibles (ventes, solde dû) */}
          {(representant.nb_ventes_mois !== undefined || representant.solde_du !== undefined) && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
              {representant.nb_ventes_mois !== undefined && (
                <div>
                  <p className="text-xs text-gray-400">Ventes du mois</p>
                  <p className="text-sm font-bold text-gray-900">
                    {representant.nb_ventes_mois}
                  </p>
                </div>
              )}
              {representant.solde_du !== undefined &&
                representant.mode_encaissement === 'LIBRE' && (
                  <div>
                    <p className="text-xs text-gray-400">À reverser</p>
                    <p
                      className={`text-sm font-bold ${
                        representant.solde_du > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {representant.solde_du.toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(representant)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-fuchsia-50 hover:text-fuchsia-600 text-gray-500 transition-colors"
              title="Modifier"
              aria-label="Modifier le représentant"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
          {onResetPwd && (
            <button
              type="button"
              onClick={() => onResetPwd(representant)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-500 transition-colors"
              title="Réinitialiser le mot de passe"
              aria-label="Réinitialiser le mot de passe"
            >
              <KeyRound className="h-4 w-4" />
            </button>
          )}
          {estActifReseau && onSuspendre && (
            <button
              type="button"
              onClick={() => onSuspendre(representant)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 transition-colors"
              title="Suspendre"
              aria-label="Suspendre le représentant"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          {!estActifReseau && onReactiver && representant.actif && (
            <button
              type="button"
              onClick={() => onReactiver(representant)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-emerald-50 hover:text-emerald-600 text-gray-500 transition-colors"
              title="Réactiver"
              aria-label="Réactiver le représentant"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default RepresentantCard;
