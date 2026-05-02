/**
 * Étape 1/3 — Saisie du téléphone et envoi de l'OTP WhatsApp.
 *
 * Workflow :
 *   1. L'utilisateur saisit son téléphone (9 chiffres SN ou E.164)
 *   2. Validation locale du format
 *   3. Génération d'un code 5 chiffres (crypto.getRandomValues si dispo)
 *   4. Envoi via whatsAppService.sendDirectWhatsApp({ telephone, code, langue: 'fr' })
 *   5. Si success → on transmet la session OTP au parent (HistoriqueClientPage)
 *
 * Sécurité : le code OTP n'est JAMAIS persisté (state React uniquement).
 *
 * @module components/historique/StepPhone
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import whatsAppService from '@/services/whatsapp.service';
import SecurityService from '@/services/security.service';
import type { OtpSession } from './HistoriqueClientPage';

/** TTL de l'OTP en millisecondes (5 minutes). */
const OTP_TTL_MS = 5 * 60 * 1000;

/** Nombre maximum de tentatives autorisées sur l'OTP. */
const OTP_MAX_ATTEMPTS = 3;

interface StepPhoneProps {
  /**
   * Téléphone pré-rempli (format BD canonique : 9 chiffres SN si possible,
   * sinon E.164).
   */
  initialTelephone?: string;
  /**
   * Callback succès. Reçoit DEUX formats :
   *   - phoneCanonical : valeur à matcher en BD (9 chiffres si SN, sinon E.164)
   *   - phoneE164      : format pour l'API WhatsApp uniquement
   *   - session        : session OTP (code, expiry, attempts)
   */
  onValidated: (
    phoneCanonical: string,
    phoneE164: string,
    session: OtpSession
  ) => void;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Génère un code OTP à 5 chiffres.
 * Utilise crypto.getRandomValues() si disponible (cryptographiquement sûr),
 * fallback sur Math.random() sinon.
 */
function generateOtpCode(): string {
  const length = 5;
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    // 10000..99999 → 5 chiffres garantis (pas de zéro de tête)
    const min = 10000;
    const max = 99999;
    const value = min + (arr[0] % (max - min + 1));
    return String(value).padStart(length, '0').slice(-length);
  }
  // Fallback non cryptographique (hors navigateur ou crypto absent)
  return String(Math.floor(10000 + Math.random() * 90000));
}

/**
 * Normalise un téléphone vers un format E.164 (pour l'API WhatsApp uniquement).
 * - 9 chiffres SN commençant par 7 → préfixé +221
 * - Déjà E.164 (commence par +) → tel quel
 * - Sinon → renvoyé tel quel (sera rejeté par la validation)
 */
function normalizeToE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  // 9 chiffres SN → ajout de l'indicatif +221
  if (/^7\d{8}$/.test(trimmed)) {
    return `+221${trimmed}`;
  }
  return trimmed;
}

/**
 * Normalise un téléphone vers le FORMAT BD CANONIQUE (celui à matcher en
 * `facture_com.tel_client`) :
 * - 9 chiffres SN commençant par 7 → conservé tel quel (`771234567`)
 * - +221XXXXXXXXX → décapé en 9 chiffres (`771234567`)
 * - Étranger E.164 (autre indicatif) → conservé en E.164 (best-effort)
 *
 * Important : la fonction PG `get_historique_achats_client` matche en
 * STRICT (WHERE tel_client = p_telephone), il faut donc passer la valeur
 * exactement comme elle est stockée — la BD utilise massivement le format
 * 9 chiffres (cf. rapport DBA 2026-05-02 : tests sur `766448182`).
 */
function normalizeToBdFormat(raw: string): string {
  const trimmed = raw.trim();
  // Cas SN : 9 chiffres
  if (/^7\d{8}$/.test(trimmed)) {
    return trimmed;
  }
  // Cas +221XXXXXXXXX → on retire le préfixe pour matcher la BD
  if (/^\+221\d{9}$/.test(trimmed)) {
    return trimmed.slice(4);
  }
  // Cas étranger E.164 — on garde tel quel (la BD pourrait le stocker ainsi)
  if (/^\+\d{8,15}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

/**
 * Valide qu'un téléphone est au format SN 9 chiffres OU E.164 strict.
 */
function isValidPhone(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // Format SN sans préfixe (9 chiffres commençant par 7)
  if (/^7\d{8}$/.test(trimmed)) return true;
  // Format E.164 strict (+ suivi de 8-15 chiffres)
  if (/^\+\d{8,15}$/.test(trimmed)) return true;
  return false;
}

/**
 * Mappe un error_code WhatsApp vers un message utilisateur français.
 */
function mapWhatsAppError(errorCode?: string, fallback?: string): string {
  switch (errorCode) {
    case 'META_INVALID_NUMBER':
      return 'Ce numéro n\'a pas WhatsApp ou est invalide.';
    case 'META_RATE_LIMIT':
    case 'DAILY_QUOTA_EXCEEDED':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'META_TOKEN_EXPIRED':
    case 'INTERNAL_ERROR':
      return 'Service temporairement indisponible. Réessayez plus tard.';
    case 'INVALID_REQUEST':
      return 'Format invalide. Vérifiez votre numéro.';
    default:
      return fallback || 'Impossible d\'envoyer le code WhatsApp. Réessayez.';
  }
}

// -----------------------------------------------------------------------------
// Composant
// -----------------------------------------------------------------------------

export default function StepPhone({
  initialTelephone = '',
  onValidated,
}: StepPhoneProps) {
  // Le parent nous passe déjà le format canonique BD (9 chiffres SN ou E.164).
  // On affiche tel quel — l'utilisateur peut le re-saisir librement.
  const initialDisplay = useMemo(() => {
    if (!initialTelephone) return '';
    // Au cas où on reçoit un +221xxx, on simplifie pour l'UX
    if (initialTelephone.startsWith('+221') && initialTelephone.length === 13) {
      return initialTelephone.slice(4);
    }
    return initialTelephone;
  }, [initialTelephone]);

  const [telephone, setTelephone] = useState(initialDisplay);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneIsValid = isValidPhone(telephone);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Autoriser : chiffres, + initial, espaces (qu'on stripperea)
      // Limite raisonnable à 16 caractères pour éviter abus.
      const sanitized = value.replace(/[^\d+]/g, '').slice(0, 16);
      setTelephone(sanitized);
      if (error) setError(null);
    },
    [error]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!phoneIsValid) {
        setError('Format invalide : 9 chiffres SN (ex. 771234567) ou +221xxxxxxxxx');
        return;
      }

      const phoneE164 = normalizeToE164(telephone);
      const phoneCanonical = normalizeToBdFormat(telephone);
      const code = generateOtpCode();

      setIsLoading(true);

      try {
        SecurityService.secureLog(
          'log',
          '[HISTORIQUE] Envoi OTP WhatsApp pour saisie historique client'
        );

        const wa = await whatsAppService.sendDirectWhatsApp({
          telephone: phoneE164,
          code,
          langue: 'fr',
        });

        if (wa.success) {
          const session: OtpSession = {
            code,
            expiresAt: Date.now() + OTP_TTL_MS,
            attempts: OTP_MAX_ATTEMPTS,
          };
          toast.success('Code envoyé sur WhatsApp', {
            description: 'Vérifiez votre application WhatsApp.',
          });
          onValidated(phoneCanonical, phoneE164, session);
        } else {
          const userMsg = mapWhatsAppError(wa.error_code, wa.message);
          setError(userMsg);
          toast.error('Envoi impossible', { description: userMsg });
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Erreur réseau. Vérifiez votre connexion.';
        SecurityService.secureLog('error', '[HISTORIQUE] StepPhone — échec envoi OTP', {
          error: msg,
        });
        setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
        toast.error('Erreur réseau');
      } finally {
        setIsLoading(false);
      }
    },
    [phoneIsValid, telephone, onValidated]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="
        bg-white/10 backdrop-blur-xl border border-white/20
        rounded-3xl shadow-2xl p-6 sm:p-8
      "
    >
      {/* Icône en header card */}
      <div className="flex justify-center mb-5">
        <div
          className="
            inline-flex items-center justify-center
            w-14 h-14 rounded-2xl
            bg-gradient-to-br from-emerald-500 to-green-600
            shadow-lg shadow-emerald-500/30
          "
        >
          <Phone className="w-7 h-7 text-white" />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
        Mon historique d&apos;achats
      </h2>
      <p className="mt-2 text-sm text-emerald-100/80 text-center">
        Saisissez votre numéro pour retrouver tous vos achats sur FayClick.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {/* Input téléphone */}
        <div>
          <label
            htmlFor="historique-tel"
            className="block text-xs font-medium text-emerald-100 mb-2"
          >
            Numéro de téléphone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
            <input
              id="historique-tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              value={telephone}
              onChange={handlePhoneChange}
              placeholder="771234567 ou +221771234567"
              disabled={isLoading}
              className="
                w-full pl-10 pr-4 py-3
                bg-white/10 backdrop-blur-sm border border-white/20
                rounded-xl text-white placeholder-white/40
                focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-transparent
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
          </div>
          <p className="mt-1.5 text-[11px] text-emerald-200/70">
            Format : 9 chiffres SN (commençant par 7) ou E.164 (+221…).
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="
              flex items-start gap-2 p-3
              bg-red-500/15 border border-red-300/30 rounded-xl
            "
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-red-100">{error}</span>
          </motion.div>
        )}

        {/* Bouton primaire — vert WhatsApp */}
        <button
          type="submit"
          disabled={!phoneIsValid || isLoading}
          className="
            w-full mt-2 py-3 px-4
            bg-green-600 hover:bg-green-700
            text-white font-semibold rounded-xl
            shadow-lg shadow-green-600/30 hover:shadow-green-600/40
            transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
            focus:outline-none focus:ring-2 focus:ring-green-400/70
          "
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Envoi en cours…</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              <span>Envoyer le code WhatsApp</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-emerald-200/70 text-center pt-1">
          Un code de validation à 5 chiffres sera envoyé sur votre WhatsApp.
        </p>
      </form>
    </div>
  );
}
