/**
 * Étape 2/3 — Saisie et validation du code OTP WhatsApp.
 *
 * UI :
 *   - 5 cases (input num) avec auto-focus next + paste handling
 *   - Compteur "Code expire dans MM:SS" (rouge dans les 30 dernières secondes)
 *   - Compteur tentatives restantes (max 3)
 *   - Lien "Renvoyer le code" (désactivé pendant 30s, puis actif)
 *   - Lien "Modifier le numéro" → retour étape 1
 *
 * Validation :
 *   - Si saisie === session.code ET non expirée → onValidated()
 *   - Sinon : décrémente attempts. À 0 → reset session + retour phone.
 *
 * Sécurité : aucune persistance, aucun log du code clair.
 *
 * @module components/historique/StepOtp
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Loader2, AlertCircle, Phone, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import whatsAppService from '@/services/whatsapp.service';
import SecurityService from '@/services/security.service';
import type { OtpSession } from './HistoriqueClientPage';

const OTP_LENGTH = 5;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN_S = 30;

interface StepOtpProps {
  /**
   * Téléphone au format BD canonique (9 chiffres SN ou E.164 si étranger).
   * Sert uniquement à l'affichage masqué — la lookup BD se fera au Sprint 3.
   */
  telephone: string;
  /**
   * Téléphone au format E.164 strict (`+221xxxxxxxxx`).
   * Utilisé EXCLUSIVEMENT pour l'API WhatsApp (renvoi du code).
   */
  telephoneE164: string;
  /** Session OTP active */
  session: OtpSession;
  /** Callback succès — passe le contrôle au step 'list' */
  onValidated: () => void;
  /** Callback après renvoi d'un nouveau code (met à jour la session côté parent) */
  onResend: (newSession: OtpSession) => void;
  /** Callback à chaque tentative incorrecte — décrémente attempts côté parent */
  onAttemptFailed: () => void;
  /** Retour étape 1 (modification du numéro) */
  onChangePhone: () => void;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Masque un téléphone (SN 9 chiffres ou E.164) pour affichage public.
 * - "771234567"     -> "771****67"
 * - "+221777301221" -> "+22177*****221"
 */
function maskPhone(phone: string): string {
  if (!phone) return '***';
  if (phone.length <= 5) return '***';
  // Format SN 9 chiffres
  if (/^\d{9}$/.test(phone)) {
    return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
  }
  if (phone.length < 8) return '***';
  const start = phone.slice(0, 6);
  const end = phone.slice(-3);
  const middleLen = Math.max(0, phone.length - 9);
  return `${start}${'*'.repeat(middleLen)}${end}`;
}

/** Génère un code OTP 5 chiffres (crypto sécurisé si dispo). */
function generateOtpCode(): string {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const min = 10000;
    const max = 99999;
    const value = min + (arr[0] % (max - min + 1));
    return String(value).padStart(OTP_LENGTH, '0').slice(-OTP_LENGTH);
  }
  return String(Math.floor(10000 + Math.random() * 90000));
}

/** Format MM:SS pour affichage du compte à rebours. */
function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// -----------------------------------------------------------------------------
// Composant
// -----------------------------------------------------------------------------

export default function StepOtp({
  telephone,
  telephoneE164,
  session,
  onValidated,
  onResend,
  onAttemptFailed,
  onChangePhone,
}: StepOtpProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const [resendUnlockAt, setResendUnlockAt] = useState<number>(
    () => Date.now() + RESEND_COOLDOWN_S * 1000
  );

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // ---------------------------------------------------------------------------
  // Tick : 1s pour rafraîchir compteurs
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-focus première case au montage
  // ---------------------------------------------------------------------------

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  // ---------------------------------------------------------------------------
  // Compteurs dérivés
  // ---------------------------------------------------------------------------

  const remainingMs = Math.max(0, session.expiresAt - now);
  const isExpired = remainingMs === 0;
  const isCriticalWindow = remainingMs > 0 && remainingMs <= 30_000;

  const resendRemainingMs = Math.max(0, resendUnlockAt - now);
  const canResend = resendRemainingMs === 0 && !isResending;

  const code = useMemo(() => digits.join(''), [digits]);
  const isComplete = code.length === OTP_LENGTH && /^\d{5}$/.test(code);

  // ---------------------------------------------------------------------------
  // Handlers saisie
  // ---------------------------------------------------------------------------

  const focusInput = (idx: number) => {
    const next = inputsRef.current[idx];
    if (next) next.focus();
  };

  const handleChange = useCallback(
    (idx: number, value: string) => {
      // On ne garde que le dernier chiffre saisi
      const cleaned = value.replace(/\D/g, '').slice(-1);
      setDigits((prev) => {
        const next = [...prev];
        next[idx] = cleaned;
        return next;
      });
      if (error) setError(null);
      if (cleaned && idx < OTP_LENGTH - 1) {
        focusInput(idx + 1);
      }
    },
    [error]
  );

  const handleKeyDown = useCallback(
    (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (!digits[idx] && idx > 0) {
          // Case vide : on remonte et on efface la précédente
          e.preventDefault();
          setDigits((prev) => {
            const next = [...prev];
            next[idx - 1] = '';
            return next;
          });
          focusInput(idx - 1);
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        e.preventDefault();
        focusInput(idx - 1);
      } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
        e.preventDefault();
        focusInput(idx + 1);
      }
    },
    [digits]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
      if (!pasted) return;
      e.preventDefault();
      const chars = pasted.slice(0, OTP_LENGTH).split('');
      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < OTP_LENGTH; i++) {
          next[i] = chars[i] ?? '';
        }
        return next;
      });
      const lastFilled = Math.min(chars.length - 1, OTP_LENGTH - 1);
      focusInput(lastFilled === OTP_LENGTH - 1 ? lastFilled : lastFilled + 1);
      if (error) setError(null);
    },
    [error]
  );

  // ---------------------------------------------------------------------------
  // Validation OTP
  // ---------------------------------------------------------------------------

  const handleVerify = useCallback(() => {
    if (!isComplete) {
      setError(`Le code doit contenir ${OTP_LENGTH} chiffres.`);
      return;
    }

    if (isExpired) {
      setError('Code expiré. Demandez un nouveau code.');
      toast.error('Code expiré', {
        description: 'Cliquez sur « Renvoyer le code ».',
      });
      setDigits(Array(OTP_LENGTH).fill(''));
      focusInput(0);
      return;
    }

    setIsVerifying(true);

    // Comparaison stricte côté client (le code n'a jamais quitté le browser)
    const isMatch = code === session.code;

    // Petit délai cosmétique pour ressentir la "vérification"
    setTimeout(() => {
      setIsVerifying(false);

      if (isMatch) {
        SecurityService.secureLog(
          'log',
          '[HISTORIQUE] OTP validé pour saisie historique client'
        );
        toast.success('Code validé', {
          description: 'Accès à votre historique en cours…',
        });
        onValidated();
        return;
      }

      // Code incorrect : on délègue la mise à jour du compteur au parent
      // (immutable, déclenche re-render correct).
      const remainingAttempts = session.attempts - 1;
      onAttemptFailed();

      if (remainingAttempts <= 0) {
        toast.error('Trop de tentatives', {
          description: 'Recommencez la procédure depuis votre numéro.',
        });
        SecurityService.secureLog(
          'warn',
          '[HISTORIQUE] OTP — nombre max de tentatives atteint'
        );
        onChangePhone();
        return;
      }

      setError(
        `Code incorrect. ${remainingAttempts} tentative${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''}.`
      );
      setDigits(Array(OTP_LENGTH).fill(''));
      focusInput(0);
    }, 250);
  }, [
    code,
    isComplete,
    isExpired,
    session.code,
    session.attempts,
    onValidated,
    onAttemptFailed,
    onChangePhone,
  ]);

  // Auto-submit quand les 5 chiffres sont saisis (UX fluide)
  useEffect(() => {
    if (isComplete && !isVerifying && !isExpired) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  // ---------------------------------------------------------------------------
  // Renvoi du code
  // ---------------------------------------------------------------------------

  const handleResend = useCallback(async () => {
    if (!canResend) return;
    setError(null);
    setIsResending(true);

    const newCode = generateOtpCode();

    try {
      // ⚠️ L'API WhatsApp exige le format E.164 strict — on utilise donc
      // `telephoneE164` (passé par le parent), JAMAIS `telephone` (canonique BD).
      const wa = await whatsAppService.sendDirectWhatsApp({
        telephone: telephoneE164,
        code: newCode,
        langue: 'fr',
      });

      if (wa.success) {
        const newSession: OtpSession = {
          code: newCode,
          expiresAt: Date.now() + OTP_TTL_MS,
          attempts: OTP_MAX_ATTEMPTS,
        };
        setDigits(Array(OTP_LENGTH).fill(''));
        setResendUnlockAt(Date.now() + RESEND_COOLDOWN_S * 1000);
        onResend(newSession);
        toast.success('Nouveau code envoyé', {
          description: 'Vérifiez votre WhatsApp.',
        });
        focusInput(0);
      } else {
        const msg =
          wa.error_code === 'META_RATE_LIMIT'
            ? 'Trop de demandes. Patientez un instant.'
            : wa.message || 'Renvoi impossible.';
        setError(msg);
        toast.error('Renvoi impossible', { description: msg });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      SecurityService.secureLog('error', '[HISTORIQUE] Renvoi OTP échoué', {
        error: msg,
      });
      setError('Erreur réseau. Réessayez.');
      toast.error('Erreur réseau');
    } finally {
      setIsResending(false);
    }
  }, [canResend, telephoneE164, onResend]);

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
      {/* Icône */}
      <div className="flex justify-center mb-5">
        <div
          className="
            inline-flex items-center justify-center
            w-14 h-14 rounded-2xl
            bg-gradient-to-br from-emerald-500 to-green-600
            shadow-lg shadow-emerald-500/30
          "
        >
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-white text-center">
        Vérification du code
      </h2>
      <p className="mt-2 text-sm text-emerald-100/80 text-center">
        Saisissez le code à {OTP_LENGTH} chiffres reçu sur WhatsApp au{' '}
        <span className="font-semibold text-white">{maskPhone(telephone)}</span>
      </p>

      {/* Cases OTP */}
      <div className="mt-6 flex justify-center gap-2 sm:gap-3">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={isVerifying || isExpired}
            aria-label={`Chiffre ${idx + 1} sur ${OTP_LENGTH}`}
            className="
              w-11 h-14 sm:w-12 sm:h-16
              text-center text-xl sm:text-2xl font-bold
              text-white bg-white/10 backdrop-blur-sm
              border-2 border-white/20 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:border-emerald-400/50
              transition-all
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        ))}
      </div>

      {/* Compteur expiration */}
      <div className="mt-4 text-center">
        {isExpired ? (
          <p className="text-sm font-medium text-red-300">
            Code expiré. Demandez un nouveau code.
          </p>
        ) : (
          <p
            className={`text-sm font-medium transition-colors ${
              isCriticalWindow ? 'text-red-300' : 'text-emerald-200/80'
            }`}
            aria-live="polite"
          >
            Code expire dans{' '}
            <span className="font-mono tabular-nums">
              {formatRemaining(remainingMs)}
            </span>
          </p>
        )}
        <p className="mt-1 text-[11px] text-emerald-200/60">
          {session.attempts} tentative{session.attempts > 1 ? 's' : ''} restante
          {session.attempts > 1 ? 's' : ''}
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="
            mt-4 flex items-start gap-2 p-3
            bg-red-500/15 border border-red-300/30 rounded-xl
          "
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-100">{error}</span>
        </motion.div>
      )}

      {/* État vérification (overlay léger) */}
      {isVerifying && (
        <div className="mt-4 flex items-center justify-center gap-2 text-emerald-200/90">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Vérification…</span>
        </div>
      )}

      {/* Actions secondaires */}
      <div className="mt-6 space-y-2 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend}
          className="
            inline-flex items-center justify-center gap-2
            text-sm font-medium text-emerald-300
            hover:text-emerald-200 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
            focus:outline-none focus:underline
          "
        >
          {isResending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Envoi en cours…</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              <span>
                Renvoyer le code
                {!canResend && resendRemainingMs > 0 && (
                  <span className="ml-1 font-mono tabular-nums">
                    ({Math.ceil(resendRemainingMs / 1000)}s)
                  </span>
                )}
              </span>
            </>
          )}
        </button>

        <div>
          <button
            type="button"
            onClick={onChangePhone}
            className="
              inline-flex items-center justify-center gap-2
              text-xs text-white/70 hover:text-white
              transition-colors
              focus:outline-none focus:underline
            "
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Modifier le numéro</span>
          </button>
        </div>
      </div>
    </div>
  );
}
