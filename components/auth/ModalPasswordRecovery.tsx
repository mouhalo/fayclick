'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Building2, Lock, Send, CheckCircle, AlertCircle, Clock, Shield } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { authService } from '@/services/auth.service';
import { registrationService } from '@/services/registration.service';
import { toast } from 'sonner';
import { useTranslations } from '@/hooks/useTranslations';

interface ModalPasswordRecoveryProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'request' | 'verify' | 'success';

export function ModalPasswordRecovery({ isOpen, onClose }: ModalPasswordRecoveryProps) {
  const { isMobile, isMobileLarge, isDesktop } = useBreakpoint();
  const t = useTranslations('auth');
  
  // État du workflow
  const [currentStep, setCurrentStep] = useState<Step>('request');
  
  // Données du formulaire
  const [formData, setFormData] = useState({
    nomStructure: '',
    phoneNumber: '',
    verificationCode: ''
  });

  // Login résolu depuis le nom de structure
  const [resolvedLogin, setResolvedLogin] = useState('');
  
  // États UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(120); // 2 minutes
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Données de la demande
  const [requestData, setRequestData] = useState({
    demandId: '',
    expiration: '',
    newPassword: ''
  });

  // Réinitialiser le formulaire à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setFormData({ nomStructure: '', phoneNumber: '', verificationCode: '' });
      setResolvedLogin('');
      setError('');
      setCurrentStep('request');
      setCountdown(120);
      setRequestData({ demandId: '', expiration: '', newPassword: '' });
    } else {
      // Nettoyer le compte à rebours
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    }
  }, [isOpen]);

  // Gérer le compte à rebours
  useEffect(() => {
    if (currentStep === 'verify' && countdown > 0) {
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setError(t('passwordRecovery.errors.codeExpired'));
            setCurrentStep('request');
            return 120;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (countdownInterval.current) {
          clearInterval(countdownInterval.current);
        }
      };
    }
  }, [currentStep, countdown]);

  // Styles responsifs
  const getModalStyles = () => {
    if (isMobile) {
      return {
        container: 'max-w-xs p-4',
        title: 'text-lg',
        subtitle: 'text-xs',
        input: 'text-sm px-5 py-2',
        button: 'text-sm py-2',
        icon: 'w-4 h-4',
        phonePadding: 'pl-14',
        indicatorLeft: 'left-4'
      };
    } else if (isMobileLarge) {
      return {
        container: 'max-w-sm p-5',
        title: 'text-xl',
        subtitle: 'text-sm',
        input: 'text-base px-4 py-2.5',
        button: 'text-base py-2.5',
        icon: 'w-5 h-5',
        phonePadding: 'pl-16',
        indicatorLeft: 'left-8'
      };
    } else {
      return {
        container: 'max-w-md p-6',
        title: 'text-2xl',
        subtitle: 'text-base',
        input: 'text-base px-6 py-3',
        button: 'text-base py-3',
        icon: 'w-5 h-5',
        phonePadding: 'pl-18',
        indicatorLeft: 'left-9'
      };
    }
  };

  const styles = getModalStyles();

  // Étape 1: Demande de récupération
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.nomStructure.trim()) {
      setError(t('passwordRecovery.errors.structureRequired'));
      return;
    }

    if (formData.nomStructure.trim().length < 3) {
      setError(t('passwordRecovery.errors.structureTooShort'));
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setError(t('passwordRecovery.errors.phoneRequired'));
      return;
    }

    // Validation du format téléphone (7 à 10 chiffres)
    const cleanPhone = formData.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 10) {
      setError(t('passwordRecovery.errors.phoneInvalid'));
      return;
    }

    setIsLoading(true);

    try {
      // Étape 1 : Résoudre le login admin via nom de structure
      const structResult = await registrationService.getStructureAdminByName(formData.nomStructure, cleanPhone);

      if (!structResult.found || !structResult.login) {
        setError(t('passwordRecovery.errors.structureNotFound'));
        setIsLoading(false);
        return;
      }

      setResolvedLogin(structResult.login);

      // Étape 2 : Demander la réinitialisation avec le login résolu
      const response = await authService.requestPasswordReset(structResult.login, cleanPhone);
      
      if (response.success) {
        setRequestData({
          demandId: response.demandId || '',
          expiration: response.expiration || '',
          newPassword: ''
        });
        setCurrentStep('verify');
        setCountdown(120); // Réinitialiser le compte à rebours
        toast.success(t('passwordRecovery.toasts.codeSentTitle'), {
          description: t('passwordRecovery.toasts.codeSentDescription')
        });
      } else {
        setError(response.message || t('passwordRecovery.errors.requestFailed'));
      }
    } catch (err: any) {
      setError(err.message || t('passwordRecovery.errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  // Étape 2: Vérification du code
  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.verificationCode.trim()) {
      setError(t('passwordRecovery.errors.codeRequired'));
      return;
    }

    if (formData.verificationCode.length !== 6) {
      setError(t('passwordRecovery.errors.codeLength'));
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = formData.phoneNumber.replace(/\s/g, '');
      const response = await authService.verifyPasswordResetCode(
        resolvedLogin,
        cleanPhone,
        formData.verificationCode.toUpperCase()
      );
      
      if (response.success) {
        setRequestData(prev => ({
          ...prev,
          newPassword: response.newPassword || ''
        }));
        setCurrentStep('success');
        
        // Toast de succès
        toast.success(t('passwordRecovery.success.toastTitle'), {
          description: response.instruction || t('passwordRecovery.success.toastDescription'),
          duration: 5000
        });
        
        // Fermer le modal après 5 secondes
        setTimeout(() => {
          onClose();
        }, 5000);
      } else {
        setError(response.message || t('passwordRecovery.errors.codeInvalid'));
      }
    } catch (err: any) {
      setError(err.message || t('passwordRecovery.errors.verifyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ ...formData, phoneNumber: value });
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setFormData({ ...formData, verificationCode: value });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              bg-gradient-to-br from-green-400/20 via-emerald-400/25 to-teal-400/20
              backdrop-blur-2xl rounded-2xl shadow-2xl border border-green-200/30
              max-h-[90vh] overflow-y-auto
            `}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                    <Lock className={`${styles.icon} text-white`} />
                  </div>
                  <div>
                    <h2 className={`${styles.title} font-bold text-white`}>
                      {t('passwordRecovery.title')}
                    </h2>
                    <p className={`${styles.subtitle} text-green-100 mt-1`}>
                      {currentStep === 'request' && t('passwordRecovery.stepRequestLabel')}
                      {currentStep === 'verify' && t('passwordRecovery.stepVerifyLabel')}
                      {currentStep === 'success' && t('passwordRecovery.stepSuccessLabel')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  disabled={isLoading}
                >
                  <X className={`${styles.icon} text-green-200`} />
                </button>
              </div>

              {/* Indicateur de progression */}
              <div className="flex items-center justify-center mb-6 gap-2">
                <div className={`w-8 h-1 rounded-full transition-all ${
                  currentStep !== 'request' ? 'bg-emerald-500' : 'bg-white/30'
                }`} />
                <div className={`w-8 h-1 rounded-full transition-all ${
                  currentStep === 'success' ? 'bg-emerald-500' : 'bg-white/30'
                }`} />
              </div>

              {/* Contenu selon l'étape */}
              {currentStep === 'request' && (
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  {/* Nom de la structure */}
                  <div>
                    <label className={`block ${styles.subtitle} font-medium text-green-100 mb-2`}>
                      {t('passwordRecovery.request.structureNameLabel')}
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.icon} text-green-300`} />
                      <input
                        type="text"
                        value={formData.nomStructure}
                        onChange={(e) => setFormData({ ...formData, nomStructure: e.target.value })}
                        className={`
                          w-full ${styles.input} pl-10
                          bg-white/20 backdrop-blur-sm border border-green-200/30
                          rounded-xl text-white placeholder-green-100/60
                          focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                          transition-all duration-200 hover:bg-white/30
                          uppercase
                        `}
                        placeholder={t('passwordRecovery.request.structureNamePlaceholder')}
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Numéro de téléphone */}
                  <div>
                    <label className={`block ${styles.subtitle} font-medium text-green-100 mb-2`}>
                      {t('passwordRecovery.request.phoneLabel')}
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.icon} text-green-300`} />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={handlePhoneChange}
                        className={`
                          w-full ${styles.input} pl-10
                          bg-white/20 backdrop-blur-sm border border-green-200/30
                          rounded-xl text-white placeholder-green-100/60
                          focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                          transition-all duration-200 hover:bg-white/30
                        `}
                        placeholder={t('passwordRecovery.request.phonePlaceholder')}
                        disabled={isLoading}
                      />
                    </div>
                    <p className={`${styles.subtitle} text-green-200/80 mt-1`}>
                      {t('passwordRecovery.request.phoneHelp')}
                    </p>
                  </div>

                  {/* Message d'erreur */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-300/30 rounded-lg"
                    >
                      <AlertCircle className={`${styles.icon} text-red-300`} />
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
                        bg-white/10 backdrop-blur-sm border border-green-200/30
                        text-green-100 rounded-xl font-medium
                        hover:bg-white/20 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {t('passwordRecovery.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`
                        flex-1 ${styles.button} px-4
                        bg-gradient-to-r from-emerald-600 to-teal-600
                        text-white rounded-xl font-medium
                        hover:from-emerald-700 hover:to-teal-700
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
                          <span>{t('passwordRecovery.request.submitting')}</span>
                        </>
                      ) : (
                        <>
                          <Send className={styles.icon} />
                          <span>{t('passwordRecovery.request.submit')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {currentStep === 'verify' && (
                <form onSubmit={handleVerificationSubmit} className="space-y-4">
                  {/* Instructions */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <Shield className={`${styles.icon} text-emerald-400 mt-1`} />
                      <div>
                        <p className={`${styles.subtitle} text-green-100`}>
                          {t('passwordRecovery.verify.codeSentTo')}
                        </p>
                        <p className={`${styles.subtitle} font-bold text-white mt-1`}>
                          +221 {formData.phoneNumber}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Compte à rebours */}
                  <div className="flex items-center justify-center gap-2 text-white">
                    <Clock className={styles.icon} />
                    <span className={`${styles.subtitle} font-mono font-bold ${
                      countdown < 30 ? 'text-orange-300' : 'text-white'
                    }`}>
                      {formatTime(countdown)}
                    </span>
                  </div>

                  {/* Code de vérification */}
                  <div>
                    <label className={`block ${styles.subtitle} font-medium text-green-100 mb-2`}>
                      {t('passwordRecovery.verify.codeLabel')}
                    </label>
                    <input
                      type="text"
                      value={formData.verificationCode}
                      onChange={handleCodeChange}
                      className={`
                        w-full ${styles.input} text-center tracking-widest
                        bg-white/20 backdrop-blur-sm border border-green-200/30
                        rounded-xl text-white placeholder-green-100/60 uppercase
                        focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                        transition-all duration-200 hover:bg-white/30
                        font-mono text-2xl
                      `}
                      placeholder={t('passwordRecovery.verify.codePlaceholder')}
                      disabled={isLoading}
                      autoFocus
                      maxLength={6}
                    />
                  </div>

                  {/* Message d'erreur */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-300/30 rounded-lg"
                    >
                      <AlertCircle className={`${styles.icon} text-red-300`} />
                      <span className={`${styles.subtitle} text-red-200`}>{error}</span>
                    </motion.div>
                  )}

                  {/* Boutons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep('request');
                        setFormData({ ...formData, verificationCode: '' });
                        setError('');
                      }}
                      disabled={isLoading}
                      className={`
                        flex-1 ${styles.button} px-4
                        bg-white/10 backdrop-blur-sm border border-green-200/30
                        text-green-100 rounded-xl font-medium
                        hover:bg-white/20 transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {t('passwordRecovery.back')}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || formData.verificationCode.length !== 6}
                      className={`
                        flex-1 ${styles.button} px-4
                        bg-gradient-to-r from-emerald-600 to-teal-600
                        text-white rounded-xl font-medium
                        hover:from-emerald-700 hover:to-teal-700
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
                          <span>{t('passwordRecovery.verify.submitting')}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className={styles.icon} />
                          <span>{t('passwordRecovery.verify.submit')}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lien pour renvoyer le code */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => handleRequestSubmit(new Event('submit') as any)}
                      className={`${styles.subtitle} text-green-200 hover:text-white underline`}
                      disabled={isLoading}
                    >
                      {t('passwordRecovery.verify.resend')}
                    </button>
                  </div>
                </form>
              )}

              {currentStep === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`${styles.title} font-bold text-white mb-2`}>
                    {t('passwordRecovery.success.title')}
                  </h3>
                  <p className={`${styles.subtitle} text-green-100 mb-4`}>
                    {t('passwordRecovery.success.tempPasswordLabel')}
                  </p>
                  
                  {/* Affichage du nouveau mot de passe */}
                  {requestData.newPassword && (
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
                      <p className={`font-mono text-2xl font-bold text-white tracking-wider`}>
                        {requestData.newPassword}
                      </p>
                    </div>
                  )}
                  
                  <p className={`${styles.subtitle} text-green-200/80 mt-4`}>
                    {t('passwordRecovery.success.instruction')}
                  </p>

                  <button
                    onClick={onClose}
                    className={`
                      mt-6 ${styles.button} px-8
                      bg-gradient-to-r from-emerald-600 to-teal-600
                      text-white rounded-xl font-medium
                      hover:from-emerald-700 hover:to-teal-700
                      transition-all duration-200 shadow-lg hover:shadow-xl
                    `}
                  >
                    {t('passwordRecovery.close')}
                  </button>
                </motion.div>
              )}

              {/* Note d'information */}
              {currentStep === 'request' && (
                <div className="mt-6 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-green-200/20">
                  <p className={`${styles.subtitle} text-green-200/80 text-center`}>
                    {t('passwordRecovery.request.note')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}