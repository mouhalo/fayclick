'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Building2, Send, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { registrationService } from '@/services/registration.service';
import smsService from '@/services/sms.service';

interface ModalRecoveryOTPProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STORAGE_KEY = 'fayclick_otp_recovery';
const MAX_DAILY_ATTEMPTS = 3;

function getRecoveryCount(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { date: '', count: 0 };
}

function incrementRecoveryCount() {
  const today = new Date().toISOString().split('T')[0];
  const current = getRecoveryCount();
  const count = current.date === today ? current.count + 1 : 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count }));
}

function isDailyLimitReached(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const current = getRecoveryCount();
  return current.date === today && current.count >= MAX_DAILY_ATTEMPTS;
}

export function ModalRecoveryOTP({ isOpen, onClose, onSuccess }: ModalRecoveryOTPProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  const [nomStructure, setNomStructure] = useState('');
  const [telephone, setTelephone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'success'>('form');

  useEffect(() => {
    if (isOpen) {
      setNomStructure('');
      setTelephone('');
      setError('');
      setStep('form');
    }
  }, [isOpen]);

  const getStyles = () => {
    if (isMobile) {
      return { container: 'max-w-xs p-4', title: 'text-lg', subtitle: 'text-xs', input: 'text-sm px-4 py-2', button: 'text-sm py-2', icon: 'w-4 h-4' };
    } else if (isMobileLarge) {
      return { container: 'max-w-sm p-5', title: 'text-xl', subtitle: 'text-sm', input: 'text-base px-4 py-2.5', button: 'text-base py-2.5', icon: 'w-5 h-5' };
    }
    return { container: 'max-w-md p-6', title: 'text-2xl', subtitle: 'text-base', input: 'text-base px-6 py-3', button: 'text-base py-3', icon: 'w-5 h-5' };
  };

  const styles = getStyles();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) setTelephone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nomStructure.trim()) {
      setError('Le nom de la structure est requis');
      return;
    }
    if (nomStructure.trim().length < 3) {
      setError('Nom de structure trop court (minimum 3 caractères)');
      return;
    }

    const cleanPhone = telephone.replace(/\D/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 10) {
      setError('Numéro de téléphone invalide (7 à 10 chiffres)');
      return;
    }

    if (isDailyLimitReached()) {
      setError('Limite quotidienne atteinte (3 max). Réessayez demain.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await registrationService.getStructureAdminByName(nomStructure, cleanPhone);

      if (!result.found || !result.login) {
        setError('Structure non trouvée ou numéro ne correspond pas');
        setIsLoading(false);
        return;
      }

      // Générer et envoyer le nouveau code OTP
      const otpCode = registrationService.generateOTPCode();
      const message = `FAYCLICK - Votre nouveau code de connexion rapide est : ${otpCode}. Ne le partagez avec personne.`;

      await smsService.sendDirectSMS(cleanPhone, message);

      // Stocker le PIN dans localStorage
      const pinData = { pin: otpCode, login: result.login, pwd: '0000', lastMode: 'pin' };
      localStorage.setItem('fayclick_quick_pin', btoa(JSON.stringify(pinData)));

      // Incrémenter le compteur
      incrementRecoveryCount();

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className={`
              ${styles.container} w-full
              bg-gradient-to-br from-orange-400/20 via-amber-400/25 to-yellow-400/20
              backdrop-blur-2xl rounded-2xl shadow-2xl border border-orange-200/30
              max-h-[90vh] overflow-y-auto
            `}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                    <ShieldAlert className={`${styles.icon} text-white`} />
                  </div>
                  <div>
                    <h2 className={`${styles.title} font-bold text-white`}>
                      Code perdu ?
                    </h2>
                    <p className={`${styles.subtitle} text-orange-100 mt-1`}>
                      {step === 'form' ? 'Récupérez votre code de connexion' : 'Nouveau code généré'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  disabled={isLoading}
                >
                  <X className={`${styles.icon} text-orange-200`} />
                </button>
              </div>

              {step === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nom de la structure */}
                  <div>
                    <label className={`block ${styles.subtitle} font-medium text-orange-100 mb-2`}>
                      Nom de votre structure
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.icon} text-orange-300`} />
                      <input
                        type="text"
                        value={nomStructure}
                        onChange={(e) => setNomStructure(e.target.value)}
                        className={`
                          w-full ${styles.input} pl-10
                          bg-white/20 backdrop-blur-sm border border-orange-200/30
                          rounded-xl text-white placeholder-orange-100/60
                          focus:ring-2 focus:ring-amber-400 focus:border-transparent
                          transition-all duration-200 hover:bg-white/30
                        `}
                        placeholder="Ex: MA BOUTIQUE"
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Numéro OM */}
                  <div>
                    <label className={`block ${styles.subtitle} font-medium text-orange-100 mb-2`}>
                      Téléphone Orange Money
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.icon} text-orange-300`} />
                      <input
                        type="tel"
                        value={telephone}
                        onChange={handlePhoneChange}
                        className={`
                          w-full ${styles.input} pl-10
                          bg-white/20 backdrop-blur-sm border border-orange-200/30
                          rounded-xl text-white placeholder-orange-100/60
                          focus:ring-2 focus:ring-amber-400 focus:border-transparent
                          transition-all duration-200 hover:bg-white/30
                        `}
                        placeholder="77XXXXXXX"
                        disabled={isLoading}
                      />
                    </div>
                    <p className={`${styles.subtitle} text-orange-200/80 mt-1`}>
                      Le numéro utilisé lors de l&apos;inscription
                    </p>
                  </div>

                  {/* Message d'erreur */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-300/30 rounded-lg"
                    >
                      <AlertCircle className={`${styles.icon} text-red-300 flex-shrink-0`} />
                      <span className={`${styles.subtitle} text-red-200`}>{error}</span>
                    </motion.div>
                  )}

                  {/* Boutons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className={`
                        flex-1 ${styles.button} px-4
                        bg-white/10 backdrop-blur-sm border border-orange-200/30
                        text-orange-100 rounded-xl font-medium
                        hover:bg-white/20 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`
                        flex-1 ${styles.button} px-4
                        bg-gradient-to-r from-orange-600 to-amber-600
                        text-white rounded-xl font-medium
                        hover:from-orange-700 hover:to-amber-700
                        transition-all duration-200 shadow-lg hover:shadow-xl
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2
                      `}
                    >
                      {isLoading ? (
                        <>
                          <svg className={`animate-spin ${styles.icon}`} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Recherche...</span>
                        </>
                      ) : (
                        <>
                          <Send className={styles.icon} />
                          <span>Récupérer</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Note d'information */}
                  <div className="mt-4 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-orange-200/20">
                    <p className={`${styles.subtitle} text-orange-200/80 text-center`}>
                      Le nom et le numéro doivent correspondre à ceux utilisés lors de l&apos;inscription.
                    </p>
                  </div>
                </form>
              )}

              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`${styles.title} font-bold text-white mb-2`}>
                    Code envoyé par SMS !
                  </h3>

                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                    <Phone className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                    <p className={`${styles.subtitle} text-orange-100`}>
                      Un nouveau code à 5 chiffres a été envoyé au
                    </p>
                    <p className={`${styles.subtitle} font-bold text-white mt-1`}>
                      +221 {telephone}
                    </p>
                  </div>

                  <p className={`${styles.subtitle} text-orange-200/80 mb-1`}>
                    Vérifiez vos SMS et saisissez le code reçu
                  </p>
                  <p className={`${styles.subtitle} text-orange-200/60 text-xs`}>
                    Ne partagez ce code avec personne
                  </p>

                  <button
                    onClick={handleSuccessClose}
                    className={`
                      mt-6 ${styles.button} px-8
                      bg-gradient-to-r from-emerald-600 to-teal-600
                      text-white rounded-xl font-medium
                      hover:from-emerald-700 hover:to-teal-700
                      transition-all duration-200 shadow-lg hover:shadow-xl
                    `}
                  >
                    Saisir mon code
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
