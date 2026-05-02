/**
 * Orchestrateur de la page publique "Mon historique d'achats".
 *
 * Gère le workflow en 3 étapes :
 *   - phone : saisie + envoi OTP WhatsApp
 *   - otp   : validation du code 5 chiffres (TTL 5min, 3 tentatives)
 *   - list  : placeholder Sprint 3 (sera remplacé par <ListeAchatsClient />)
 *
 * État volontairement local (pas de Zustand) — la session OTP doit
 * disparaître au reload pour des raisons de sécurité.
 *
 * @module components/historique/HistoriqueClientPage
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, History } from 'lucide-react';
import { Toaster } from 'sonner';
import StepPhone from './StepPhone';
import StepOtp from './StepOtp';
import ListeAchatsClient from './ListeAchatsClient';

/** Étapes du workflow (la 3e — 'list' — sera implémentée au Sprint 3). */
export type HistoriqueStep = 'phone' | 'otp' | 'list';

/**
 * Session OTP courante. Stockée uniquement en mémoire React (jamais
 * persistée en localStorage / sessionStorage) pour limiter la fenêtre
 * de validité au cycle de vie du composant.
 */
export interface OtpSession {
  /** Code à 5 chiffres généré côté client */
  code: string;
  /** Timestamp d'expiration (Date.now() + 5min) */
  expiresAt: number;
  /** Nombre de tentatives restantes (initial : 3) */
  attempts: number;
}

interface HistoriqueClientPageProps {
  /** Téléphone pré-rempli (depuis query param ?tel=XXX), optionnel */
  initialTelephone?: string;
}

// (Note: le masquage du numéro pour affichage est géré désormais
//  à l'intérieur de <ListeAchatsClient />, plus aucun usage ici.)

export default function HistoriqueClientPage({
  initialTelephone,
}: HistoriqueClientPageProps) {
  const [step, setStep] = useState<HistoriqueStep>('phone');
  // Téléphone au FORMAT BD CANONIQUE (9 chiffres SN si possible, sinon E.164)
  // — c'est ce format qui sera passé au Sprint 3 / aux fonctions PG.
  const [telephone, setTelephone] = useState<string>(initialTelephone ?? '');
  // Format E.164 utilisé UNIQUEMENT pour l'API WhatsApp (renvoi OTP, etc.).
  const [telephoneE164, setTelephoneE164] = useState<string>('');
  const [otpSession, setOtpSession] = useState<OtpSession | null>(null);

  // ---------------------------------------------------------------------------
  // Transitions inter-étapes
  // ---------------------------------------------------------------------------

  /**
   * Appelé par StepPhone après envoi WhatsApp réussi.
   * - phoneCanonical : format à matcher en BD (9 chiffres SN ou E.164 si étranger)
   * - phoneE164      : format pour l'API WhatsApp uniquement
   */
  const handlePhoneValidated = useCallback(
    (phoneCanonical: string, phoneE164: string, session: OtpSession) => {
      setTelephone(phoneCanonical);
      setTelephoneE164(phoneE164);
      setOtpSession(session);
      setStep('otp');
    },
    []
  );

  const handleOtpValidated = useCallback(() => {
    // OTP validé — on entre dans la zone "authentifiée" du workflow.
    // La session OTP n'a plus à survivre : on la nettoie.
    setOtpSession(null);
    setStep('list');
  }, []);

  const handleResendOtp = useCallback((session: OtpSession) => {
    // Mise à jour de la session après renvoi du code (depuis StepOtp).
    setOtpSession(session);
  }, []);

  /**
   * Décrémente les tentatives OTP de manière immutable.
   * Appelé par StepOtp à chaque code incorrect.
   */
  const handleAttemptFailed = useCallback(() => {
    setOtpSession((prev) =>
      prev ? { ...prev, attempts: Math.max(0, prev.attempts - 1) } : null
    );
  }, []);

  const handleBackToPhone = useCallback(() => {
    setOtpSession(null);
    setStep('phone');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'otp') {
      handleBackToPhone();
    } else if (step === 'list') {
      // Depuis la liste, on revient à la saisie téléphone (déconnexion).
      setTelephone('');
      setTelephoneE164('');
      setStep('phone');
    }
  }, [step, handleBackToPhone]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const showBackButton = step !== 'phone';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-900 relative overflow-hidden">
      {/* Décor : halos d'arrière-plan (purement esthétique, GPU-friendly) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[28rem] h-[28rem] bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] bg-green-400/15 rounded-full blur-3xl" />
      </div>

      {/* Header global */}
      <header className="relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Retour à l'étape précédente"
                  className="
                    p-2 rounded-xl
                    bg-white/10 backdrop-blur-md border border-white/20
                    text-white/90 hover:bg-white/20 transition-all
                    focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                  "
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div className="leading-tight">
                  <h1 className="text-base sm:text-lg font-bold text-white">
                    Mes achats
                  </h1>
                  <p className="text-[11px] sm:text-xs text-emerald-200/80">
                    FayClick · Historique client
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal — animations entre étapes */}
      <main className="relative z-10 px-4 sm:px-6 pb-10">
        <div className="max-w-md mx-auto pt-6 sm:pt-10">
          <AnimatePresence mode="wait">
            {step === 'phone' && (
              <motion.div
                key="phone"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <StepPhone
                  initialTelephone={telephone}
                  onValidated={handlePhoneValidated}
                />
              </motion.div>
            )}

            {step === 'otp' && otpSession && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <StepOtp
                  telephone={telephone}
                  telephoneE164={telephoneE164}
                  session={otpSession}
                  onValidated={handleOtpValidated}
                  onResend={handleResendOtp}
                  onAttemptFailed={handleAttemptFailed}
                  onChangePhone={handleBackToPhone}
                />
              </motion.div>
            )}

            {step === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <ListeAchatsClient
                  telephone={telephone}
                  onChangeNumber={() => {
                    setOtpSession(null);
                    setTelephone('');
                    setTelephoneE164('');
                    setStep('phone');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-[11px] text-white/50">
          Powered by <span className="font-semibold text-white/70">FayClick</span>
        </p>
      </footer>

      {/* Toasts globaux (sonner) */}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </div>
  );
}
