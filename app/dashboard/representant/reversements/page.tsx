/**
 * Reversements — Page rep pour déclarer ses reversements et voir le solde
 *
 * Visible uniquement si user.mode_encaissement === 'LIBRE'
 * (les reps WALLET_STRUCTURE n'ont pas de reversement à faire).
 *
 * Stage B3.4 — data layer : services/reversement.service.ts (T1, ne pas modifier)
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Wallet,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Banknote,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import reversementService from '@/services/reversement.service';
import {
  ReversementData,
  SoldeReversementRep,
  ModeReversement,
  ReversementErrorCode,
  STATUT_COLORS,
  STATUT_LABELS,
  MODE_LABELS,
} from '@/types/reversement';

/** Mappe les codes d'erreur métier renvoyés par declarer_reversement en messages clairs */
function mapErrorCode(code?: string, fallbackMessage?: string): string {
  const map: Record<ReversementErrorCode, string> = {
    REP_INVALIDE_OU_MAUVAIS_MODE:
      'Reversements réservés aux représentants en encaissement libre',
    MODE_INVALIDE: 'Mode de paiement invalide',
    MONTANT_INVALIDE: 'Le montant doit être strictement positif',
    MONTANT_SUPERIEUR_SOLDE: 'Le montant dépasse votre solde dû',
    ERROR: fallbackMessage || 'Erreur lors de la déclaration',
  };
  if (code && code in map) return map[code as ReversementErrorCode];
  return fallbackMessage || 'Erreur lors de la déclaration';
}

export default function ReversementsRepPage() {
  const { user } = useAuth();
  // ⚠️ `mode_encaissement` n'est pas toujours peuplé au login (check_user_credentials
  // ne le renvoie pas). On gate donc en « fail-open » : on affiche/charge sauf si le
  // rep est EXPLICITEMENT WALLET_STRUCTURE. La sécurité réelle vient de getSolde
  // (vue LIBRE-only), du bouton désactivé si solde_du<=0, et de la validation backend
  // (declarer_reversement rejette les non-LIBRE avec REP_INVALIDE_OU_MAUVAIS_MODE).
  const isLibre = user?.mode_encaissement !== 'WALLET_STRUCTURE';

  const [reversements, setReversements] = useState<ReversementData[]>([]);
  const [solde, setSolde] = useState<SoldeReversementRep | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id || !user?.id_structure) return;
    // Court-circuit : si le rep est WALLET_STRUCTURE, pas besoin d'appeler les
    // fonctions PG reversement (elles ne s'appliquent qu'au mode LIBRE).
    if (!isLibre) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [listRes, soldeRes] = await Promise.all([
        reversementService.list(user.id_structure, { id_representant: user.id }),
        reversementService.getSolde(user.id),
      ]);
      setReversements(Array.isArray(listRes.data?.reversements) ? listRes.data.reversements : []);
      setSolde(soldeRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.id_structure, isLibre]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeclareSuccess = () => {
    setShowModal(false);
    load();
  };

  // Si pas LIBRE → bandeau d'info
  if (!isLibre) {
    return (
      <div className="min-h-screen pb-12">
        <header className="bg-gradient-to-br from-fuchsia-500 via-purple-600 to-purple-700 text-white p-4 rounded-b-2xl shadow-md">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/representant"
              className="p-2 -ml-2 rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Wallet className="w-5 h-5" />
            <h1 className="text-lg font-bold">Reversements</h1>
          </div>
        </header>
        <main className="px-4 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-emerald-900 mb-1">
              Encaissement direct sur wallet structure
            </h3>
            <p className="text-sm text-emerald-700">
              Vos paiements wallet vont directement au KALPE de la structure.
              Aucun reversement n&apos;est nécessaire de votre part.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-gradient-to-br from-fuchsia-500 via-purple-600 to-purple-700 text-white p-4 rounded-b-2xl shadow-md">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/dashboard/representant"
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Wallet className="w-5 h-5" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">Mes reversements</h1>
            <p className="text-xs text-fuchsia-100">Encaissement libre</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50"
            aria-label="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Solde dû */}
        {solde && (
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-xs text-fuchsia-100">Solde à reverser</p>
            <p
              className={`text-2xl font-bold mt-0.5 ${
                solde.solde_du > 0 ? 'text-amber-200' : 'text-emerald-200'
              }`}
            >
              {solde.solde_du.toLocaleString('fr-FR')}{' '}
              <span className="text-sm">FCFA</span>
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-fuchsia-100">
              <div>
                Total encaissé :{' '}
                <strong>{solde.total_encaisse.toLocaleString('fr-FR')}</strong>
              </div>
              <div>
                Déjà reversé :{' '}
                <strong>{solde.total_reverse.toLocaleString('fr-FR')}</strong>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="px-4 mt-4 space-y-3">
        {/* CTA */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={!solde || solde.solde_du <= 0}
          className="w-full py-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          {!solde || solde.solde_du <= 0
            ? 'Aucun solde à reverser'
            : 'Déclarer un reversement'}
        </button>

        {/* Liste */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Historique
          </h2>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-fuchsia-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : reversements.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Aucun reversement déclaré pour l&apos;instant
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {reversements.map((r, i) => (
                <ReversementCard key={r.id_reversement} reversement={r} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal Declaration */}
      {user?.id && (
        <ModalDeclarerReversement
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleDeclareSuccess}
          idRepresentant={user.id}
          soldeMax={solde?.solde_du || 0}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function ReversementCard({
  reversement,
  index,
}: {
  reversement: ReversementData;
  index: number;
}) {
  const STATUT_ICONS = useMemo(
    () => ({
      EN_ATTENTE: <Clock className="w-4 h-4" />,
      VALIDE: <CheckCircle2 className="w-4 h-4" />,
      REJETE: <XCircle className="w-4 h-4" />,
    }),
    []
  );

  const date = new Date(reversement.date_reversement).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white border border-gray-200 rounded-xl p-3"
    >
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900">
            {reversement.montant.toLocaleString('fr-FR')}{' '}
            <span className="text-sm text-gray-500">FCFA</span>
          </p>
          <p className="text-xs text-gray-500">
            {date} · {MODE_LABELS[reversement.mode_paiement]}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-semibold rounded border flex items-center gap-1 ${
            STATUT_COLORS[reversement.statut]
          }`}
        >
          {STATUT_ICONS[reversement.statut]}
          {STATUT_LABELS[reversement.statut]}
        </span>
      </div>
      {reversement.reference_transaction && (
        <p className="text-xs text-gray-500 mt-1">
          Réf : <span className="font-mono">{reversement.reference_transaction}</span>
        </p>
      )}
      {reversement.commentaire && (
        <p className="text-xs text-gray-600 mt-1 italic">
          &quot;{reversement.commentaire}&quot;
        </p>
      )}
      {reversement.statut === 'REJETE' && reversement.commentaire && (
        <p className="text-xs text-red-600 mt-1">Motif rejet : {reversement.commentaire}</p>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────

interface ModalDeclarerReversementProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  idRepresentant: number;
  soldeMax: number;
}

function ModalDeclarerReversement({
  isOpen,
  onClose,
  onSuccess,
  idRepresentant,
  soldeMax,
}: ModalDeclarerReversementProps) {
  const [montant, setMontant] = useState<number>(0);
  const [mode, setMode] = useState<ModeReversement>('CASH');
  const [reference, setReference] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMontant(soldeMax);
      setMode('CASH');
      setReference('');
      setCommentaire('');
      setError(null);
    }
  }, [isOpen, soldeMax]);

  const handleSubmit = async () => {
    setError(null);
    if (montant <= 0 || montant > soldeMax) {
      setError(`Le montant doit être entre 1 et ${soldeMax.toLocaleString('fr-FR')} FCFA`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await reversementService.declarer({
        id_representant: idRepresentant,
        montant,
        mode_paiement: mode,
        reference_transaction: reference.trim() || undefined,
        commentaire: commentaire.trim() || undefined,
      });
      if (res.success) {
        toast.success(res.message || 'Reversement déclaré, en attente de validation');
        onSuccess();
      } else {
        setError(mapErrorCode(res.code, res.message));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Déclarer un reversement
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-2 hover:bg-white/20 rounded-lg disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-3 text-center">
              <p className="text-xs text-fuchsia-600 font-semibold uppercase">
                Solde maximum
              </p>
              <p className="text-xl font-bold text-fuchsia-700 mt-0.5">
                {soldeMax.toLocaleString('fr-FR')} FCFA
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant à reverser *
              </label>
              <input
                type="number"
                min={1}
                max={soldeMax}
                value={montant || ''}
                onChange={(e) => setMontant(Number(e.target.value) || 0)}
                disabled={submitting}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode de reversement *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['CASH', 'OM', 'WAVE', 'FREE', 'VIREMENT'] as ModeReversement[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    disabled={submitting}
                    className={`p-2.5 border-2 rounded-lg text-sm font-medium transition-colors ${
                      mode === m
                        ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700'
                        : 'border-gray-200 hover:border-fuchsia-300 text-gray-700'
                    }`}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Référence transaction (optionnel)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={submitting}
                placeholder="Ex: ID transaction OM, n° chèque, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire (optionnel)
              </label>
              <textarea
                rows={2}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                disabled={submitting}
                maxLength={200}
                placeholder="Ex: Reversement de la semaine du 12-18 mai"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-fuchsia-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || montant <= 0}
              className="flex-1 py-3 bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-600 hover:to-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi…</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Déclarer</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
