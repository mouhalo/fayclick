/**
 * Carte affichant un achat (facture) du client connecté.
 *
 * Layout mobile-first avec glassmorphism léger sur fond sombre :
 *   - En-tête : logo boutique + nom + type + date
 *   - Détails : N° reçu, Montant, Mode de paiement coloré
 *   - Footer  : 2 boutons (Afficher, Supprimer)
 *
 * Note : la carte n'est pas cliquable globalement — seuls les boutons le sont,
 * pour éviter tout conflit `stopPropagation` et garder une UX prévisible.
 *
 * Contexte : Sprint 3 UI "Historique Client Public" (US-3 / US-5 / US-6 du PRD).
 *
 * @module components/historique/CarteAchatClient
 */

'use client';

import { motion } from 'framer-motion';
import {
  Eye,
  Trash2,
  Calendar,
  Receipt,
  Wallet,
  CircleDollarSign,
  Store as StoreIcon,
} from 'lucide-react';
import type { AchatClient } from '@/types/historique';

interface CarteAchatClientProps {
  achat: AchatClient;
  /** Callback bouton "Afficher" (ouvre le reçu dans un nouvel onglet). */
  onAfficher: () => void;
  /** Callback bouton "Supprimer" (ouvre le modal de confirmation). */
  onSupprimer: () => void;
  /** Désactive les actions (ex: anonymisation en cours pour cet achat). */
  disabled?: boolean;
}

/**
 * Métadonnées d'affichage pour un mode de paiement.
 * - `label`  : libellé humain en français
 * - `cls`    : classes Tailwind (couleur de fond + bordure + texte)
 * - `icon`   : emoji court (rendu en regard du libellé)
 */
interface ModePaiementInfo {
  label: string;
  cls: string;
  icon: string;
}

/**
 * Convertit une valeur brute `methode_paiement` (BD) en métadonnées d'affichage.
 * Tolérant aux variantes legacy (casse, MOBILE_MONEY, etc.).
 */
export function getModePaiementInfo(
  methode: string | null | undefined
): ModePaiementInfo {
  if (!methode) {
    return {
      label: '—',
      cls: 'bg-white/5 border-white/10 text-white/60',
      icon: '·',
    };
  }
  const m = methode.trim().toUpperCase();

  if (m === 'OM' || m === 'ORANGE_MONEY' || m === 'MOBILE_MONEY') {
    return {
      label: 'Orange Money',
      cls: 'bg-orange-500/15 border-orange-400/30 text-orange-200',
      icon: '🟧',
    };
  }
  if (m === 'WAVE') {
    return {
      label: 'Wave',
      cls: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
      icon: '🟦',
    };
  }
  if (m === 'FREE' || m === 'FREE_MONEY') {
    return {
      label: 'Free Money',
      cls: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200',
      icon: '🟩',
    };
  }
  if (m === 'CASH' || m === 'ESPECES') {
    return {
      label: 'Espèces',
      cls: 'bg-slate-500/15 border-slate-400/30 text-slate-200',
      icon: '💵',
    };
  }
  // Valeur inconnue : on renvoie tel quel pour ne pas perdre d'info
  return {
    label: methode,
    cls: 'bg-white/5 border-white/10 text-white/70',
    icon: '·',
  };
}

/** Formate un montant FCFA en français : 12500 -> "12 500 FCFA" */
function formatMontant(montant: number): string {
  if (typeof montant !== 'number' || Number.isNaN(montant)) {
    return '—';
  }
  return `${montant.toLocaleString('fr-FR')} FCFA`;
}

/** Formate une date ISO YYYY-MM-DD en DD/MM/YYYY (locale FR). */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  // On tolère un timestamp complet (avec heures) en plus du DATE pur
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Numéro de reçu à afficher (recu_numero prioritaire, fallback numrecu). */
function getNumRecuAffiche(achat: AchatClient): string {
  return achat.recu_numero || achat.numrecu || '—';
}

export default function CarteAchatClient({
  achat,
  onAfficher,
  onSupprimer,
  disabled = false,
}: CarteAchatClientProps) {
  const modePaiement = getModePaiementInfo(achat.methode_paiement);
  const numReçu = getNumRecuAffiche(achat);
  const canAfficherRecu = achat.recu_numero !== null && achat.recu_numero !== '';

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="
        bg-white/8 backdrop-blur-md
        border border-white/15
        rounded-2xl shadow-lg
        overflow-hidden
      "
    >
      {/* En-tête : logo + nom boutique + date */}
      <div className="flex items-start gap-3 p-4">
        {/* Logo boutique (40x40 round, fallback mascotte si null) */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
          {achat.structure_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={achat.structure_logo}
              alt={`Logo ${achat.nom_structure}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback en cas d'URL cassée
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML =
                    '<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M9 22V12h6v10"/></svg>';
                }
              }}
            />
          ) : (
            <StoreIcon className="w-5 h-5 text-white/70" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate">
            {achat.nom_structure}
          </h3>
          {achat.type_structure && (
            <p className="text-xs text-emerald-200/70 truncate">
              {achat.type_structure}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-1.5 text-xs text-white/70">
          <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{formatDate(achat.date_facture)}</span>
        </div>
      </div>

      {/* Séparateur */}
      <div className="border-t border-white/10" />

      {/* Détails facture */}
      <div className="px-4 py-3 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
          <span className="text-white/60 w-24 flex-shrink-0">N° reçu :</span>
          <span className="text-white font-mono text-xs truncate">
            {numReçu}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CircleDollarSign
            className="w-3.5 h-3.5 text-emerald-300"
            aria-hidden="true"
          />
          <span className="text-white/60 w-24 flex-shrink-0">Montant :</span>
          <span className="text-emerald-200 font-semibold">
            {formatMontant(achat.montant)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-white/50" aria-hidden="true" />
          <span className="text-white/60 w-24 flex-shrink-0">Paiement :</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${modePaiement.cls}`}
          >
            <span aria-hidden="true">{modePaiement.icon}</span>
            <span>{modePaiement.label}</span>
          </span>
        </div>
      </div>

      {/* Séparateur */}
      <div className="border-t border-white/10" />

      {/* Footer : actions */}
      <div className="px-4 py-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled && canAfficherRecu) onAfficher();
          }}
          disabled={disabled || !canAfficherRecu}
          title={
            !canAfficherRecu
              ? 'Reçu non disponible (facture non payée)'
              : 'Afficher le reçu de paiement'
          }
          className="
            flex-1 flex items-center justify-center gap-1.5
            py-2 rounded-xl
            bg-emerald-500/20 hover:bg-emerald-500/30
            border border-emerald-400/40
            text-emerald-100 text-sm font-medium
            transition-all
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/20
            focus:outline-none focus:ring-2 focus:ring-emerald-400/60
          "
          aria-label="Afficher le reçu"
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          <span>Afficher</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onSupprimer();
          }}
          disabled={disabled}
          title="Supprimer cet achat de mon historique"
          className="
            flex-1 flex items-center justify-center gap-1.5
            py-2 rounded-xl
            bg-red-500/15 hover:bg-red-500/25
            border border-red-400/40
            text-red-200 text-sm font-medium
            transition-all
            disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500/15
            focus:outline-none focus:ring-2 focus:ring-red-400/60
          "
          aria-label="Supprimer cet achat de mon historique"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
          <span>Supprimer</span>
        </button>
      </div>
    </motion.article>
  );
}
