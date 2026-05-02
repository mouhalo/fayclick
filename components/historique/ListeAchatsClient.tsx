/**
 * Orchestrateur de l'étape 3 du workflow Historique Client Public.
 *
 * Une fois l'OTP validé en amont, ce composant :
 *   1. Charge la première page d'achats du client.
 *   2. Affiche la liste sous forme de <CarteAchatClient />.
 *   3. Permet le filtrage par boutique (FiltreBoutique) si > 1 boutique.
 *   4. Gère la pagination "load more" (offset/limit côté PG).
 *   5. Ouvre un nouvel onglet vers /recu?token=... au clic "Afficher".
 *   6. Anonymise un achat via <ModalConfirmAnonymiser /> au clic "Supprimer".
 *
 * Sécurité :
 *   - `telephone` est passé tel quel au service (déjà au format BD canonique
 *     côté `HistoriqueClientPage` après validation OTP).
 *   - Toutes les requêtes utilisent les fonctions PG dédiées avec contrôles
 *     d'identité côté backend.
 *   - Race condition pagination + filtre : `requestIdRef` invalide les réponses
 *     obsolètes ; le `<select>` est aussi désactivé pendant un load more.
 *
 * Contexte : Sprint 3 UI "Historique Client Public" (US-3 à US-6 du PRD).
 *
 * @module components/historique/ListeAchatsClient
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  AlertCircle,
  Inbox,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

import historiqueClientService, {
  HistoriqueClientException,
} from '@/services/historique-client.service';
import recuService from '@/services/recu.service';
import SecurityService from '@/services/security.service';

import type {
  AchatClient,
  BoutiqueClient,
  HistoriqueAchatsPagination,
} from '@/types/historique';

import CarteAchatClient from './CarteAchatClient';
import FiltreBoutique from './FiltreBoutique';
import ModalConfirmAnonymiser from './ModalConfirmAnonymiser';

const PAGE_SIZE = 20;

interface ListeAchatsClientProps {
  /** Téléphone client au format BD canonique (déjà validé OTP en amont). */
  telephone: string;
  /** Callback "Modifier le numéro" — ramène à l'étape 'phone'. */
  onChangeNumber: () => void;
}

/** Masque un téléphone pour affichage (cf. HistoriqueClientPage). */
function maskPhoneForDisplay(phone: string): string {
  if (!phone) return '***';
  if (phone.length <= 5) return '***';
  if (/^\d{9}$/.test(phone)) {
    return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
  }
  if (phone.length < 8) return '***';
  const start = phone.slice(0, 6);
  const end = phone.slice(-3);
  const middleLen = Math.max(0, phone.length - 9);
  return `${start}${'*'.repeat(middleLen)}${end}`;
}

export default function ListeAchatsClient({
  telephone,
  onChangeNumber,
}: ListeAchatsClientProps) {
  // -- Données ---------------------------------------------------------------
  const [achats, setAchats] = useState<AchatClient[]>([]);
  const [boutiques, setBoutiques] = useState<BoutiqueClient[]>([]);
  const [pagination, setPagination] = useState<HistoriqueAchatsPagination>({
    total: 0,
    limit: PAGE_SIZE,
    offset: 0,
    has_more: false,
  });

  // -- UI state --------------------------------------------------------------
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal anonymisation
  const [selectedAchat, setSelectedAchat] = useState<AchatClient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Anti-race condition : un id incrémenté à chaque appel — on n'applique la
  // réponse que si l'id correspond toujours au dernier appel émis.
  const requestIdRef = useRef(0);

  // -------------------------------------------------------------------------
  // Fetch initial / changement de filtre
  // -------------------------------------------------------------------------

  const fetchHistorique = useCallback(
    async (filterId: number | null) => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await historiqueClientService.getHistoriqueAchats({
          telephone,
          limit: PAGE_SIZE,
          offset: 0,
          id_structure_filter: filterId,
        });

        if (currentRequestId !== requestIdRef.current) {
          // Une requête plus récente a pris le relais — on ignore.
          return;
        }

        if (!res.success || !res.data) {
          setError(res.message || 'Impossible de charger votre historique');
          setAchats([]);
          setPagination({
            total: 0,
            limit: PAGE_SIZE,
            offset: 0,
            has_more: false,
          });
          return;
        }

        setAchats(res.data.achats);
        setPagination(res.data.pagination);

        // On ne met à jour la liste des boutiques QUE quand le filtre est
        // "Toutes" (filterId === null). Sinon on conserverait artificiellement
        // une seule entrée et on empêcherait l'utilisateur de revenir au
        // filtre global.
        if (filterId === null) {
          setBoutiques(res.data.boutiques);
        }
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) return;

        const message =
          err instanceof HistoriqueClientException
            ? err.message
            : 'Erreur réseau, veuillez réessayer';
        SecurityService.secureLog('error', '[ListeAchatsClient] fetch failed', {
          error: err instanceof Error ? err.message : 'unknown',
        });
        setError(message);
        setAchats([]);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [telephone]
  );

  // Premier chargement
  useEffect(() => {
    fetchHistorique(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Charger plus
  // -------------------------------------------------------------------------

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !pagination.has_more) return;

    const currentRequestId = ++requestIdRef.current;
    setLoadingMore(true);

    try {
      const nextOffset = pagination.offset + pagination.limit;
      const res = await historiqueClientService.getHistoriqueAchats({
        telephone,
        limit: PAGE_SIZE,
        offset: nextOffset,
        id_structure_filter: selectedBoutiqueId,
      });

      if (currentRequestId !== requestIdRef.current) {
        // Réponse périmée (filtre changé entre-temps)
        return;
      }

      if (res.success && res.data) {
        setAchats((prev) => [...prev, ...res.data!.achats]);
        setPagination(res.data.pagination);
      } else {
        // Pas d'erreur fatale, on conserve la liste — juste notification discrète
        SecurityService.secureLog(
          'warn',
          '[ListeAchatsClient] loadMore failed',
          { message: res.message }
        );
      }
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;
      SecurityService.secureLog(
        'error',
        '[ListeAchatsClient] loadMore exception',
        { error: err instanceof Error ? err.message : 'unknown' }
      );
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [
    loadingMore,
    pagination.has_more,
    pagination.offset,
    pagination.limit,
    selectedBoutiqueId,
    telephone,
  ]);

  // -------------------------------------------------------------------------
  // Filtre boutique
  // -------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (id: number | null) => {
      if (id === selectedBoutiqueId) return;
      setSelectedBoutiqueId(id);
      // Reset état liste avant refetch
      setAchats([]);
      setPagination({
        total: 0,
        limit: PAGE_SIZE,
        offset: 0,
        has_more: false,
      });
      fetchHistorique(id);
    },
    [selectedBoutiqueId, fetchHistorique]
  );

  // -------------------------------------------------------------------------
  // Actions sur une carte
  // -------------------------------------------------------------------------

  const handleAfficher = useCallback((achat: AchatClient) => {
    const url = recuService.generateUrlPartage(achat.id_structure, achat.id_facture);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleSupprimerClick = useCallback((achat: AchatClient) => {
    setSelectedAchat(achat);
    setModalOpen(true);
  }, []);

  const handleAnonymisationConfirmed = useCallback(
    (idFacture: number) => {
      // Retire la carte de la liste localement
      setAchats((prev) => prev.filter((a) => a.id_facture !== idFacture));
      // Décrémente le total (cohérence affichage — has_more reste serveur-driven)
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    },
    []
  );

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    // On conserve `selectedAchat` un instant pour l'animation de fermeture
    setTimeout(() => setSelectedAchat(null), 250);
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const phoneMasked = maskPhoneForDisplay(telephone);

  return (
    <div className="w-full">
      {/* En-tête */}
      <div className="text-center mb-5">
        <p className="text-sm text-emerald-200/80">
          {loading ? (
            'Chargement de votre historique…'
          ) : pagination.total === 0 ? (
            <>
              Aucun achat trouvé pour le numéro{' '}
              <span className="font-semibold text-white">{phoneMasked}</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-white">
                {pagination.total}
              </span>{' '}
              achat{pagination.total > 1 ? 's' : ''} trouvé
              {pagination.total > 1 ? 's' : ''} pour le numéro{' '}
              <span className="font-semibold text-white">{phoneMasked}</span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onChangeNumber}
          className="
            mt-2 inline-flex items-center gap-1 text-xs
            text-emerald-300 hover:text-emerald-200 underline-offset-2 hover:underline
            focus:outline-none focus:ring-2 focus:ring-emerald-400/60 rounded
          "
        >
          Modifier le numéro
        </button>
      </div>

      {/* Filtre boutique (seulement si > 1) */}
      {boutiques.length > 1 && (
        <div className="mb-4">
          <FiltreBoutique
            boutiques={boutiques}
            selectedId={selectedBoutiqueId}
            onChange={handleFilterChange}
            disabled={loading || loadingMore}
          />
        </div>
      )}

      {/* États : loading initial / erreur / vide / liste */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/80">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-300 mb-3" />
          <p className="text-sm">Chargement de votre historique…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-sm text-red-300 mb-4 max-w-xs">{error}</p>
          <button
            type="button"
            onClick={() => fetchHistorique(selectedBoutiqueId)}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-red-500/20 hover:bg-red-500/30
              border border-red-400/40 text-red-100
              rounded-xl text-sm font-medium transition-colors
              focus:outline-none focus:ring-2 focus:ring-red-400/60
            "
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Réessayer
          </button>
        </div>
      ) : achats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-white/80">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 mb-4">
            <Inbox className="w-7 h-7 text-emerald-300" aria-hidden="true" />
          </div>
          <p className="text-base font-semibold text-white mb-1">
            Aucun achat trouvé pour ce numéro
          </p>
          <p className="text-xs text-white/60 max-w-xs">
            Vérifiez que vous avez utilisé le bon numéro, ou essayez avec un
            autre.
          </p>
        </div>
      ) : (
        <>
          {/* Liste des achats */}
          <div className="space-y-3">
            {achats.map((achat) => (
              <CarteAchatClient
                key={achat.id_facture}
                achat={achat}
                onAfficher={() => handleAfficher(achat)}
                onSupprimer={() => handleSupprimerClick(achat)}
              />
            ))}
          </div>

          {/* Bouton "Charger plus" */}
          {pagination.has_more && (
            <div className="mt-5 flex justify-center">
              <motion.button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                whileTap={{ scale: 0.97 }}
                className="
                  inline-flex items-center gap-2
                  px-5 py-2.5 rounded-xl
                  bg-white/10 hover:bg-white/15
                  backdrop-blur-md
                  border border-white/20
                  text-sm font-medium text-white
                  transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                "
              >
                {loadingMore ? (
                  <>
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      aria-hidden="true"
                    />
                    Chargement…
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    Charger plus d&apos;achats
                  </>
                )}
              </motion.button>
            </div>
          )}

          {/* Compteur fin de liste */}
          {!pagination.has_more && achats.length > 0 && (
            <p className="text-[11px] text-center text-white/40 mt-5">
              Fin de l&apos;historique · {achats.length} affiché
              {achats.length > 1 ? 's' : ''} sur {pagination.total}
            </p>
          )}
        </>
      )}

      {/* Modal anonymisation */}
      <ModalConfirmAnonymiser
        isOpen={modalOpen}
        achat={selectedAchat}
        telephone={telephone}
        onClose={handleModalClose}
        onConfirmed={handleAnonymisationConfirmed}
      />
    </div>
  );
}
