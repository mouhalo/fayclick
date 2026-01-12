'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import OTPInput from './OTPInput';
import { retraitService } from '@/services/retrait.service';

type WalletType = 'OM' | 'WAVE' | 'FREE';

interface WalletFlipCardProps {
  type: WalletType;
  solde: number;
  totalNet: number;      // total_net - montants reçus nets
  totalRetire: number;   // total_retire - montants retirés
  telephone: string;
  idStructure: number;
  nomStructure: string;
  isLoading?: boolean;
  onRetraitSuccess?: () => void;
}

type RetraitStep = 'idle' | 'form' | 'otp' | 'processing' | 'success' | 'error';

const OTP_TIMER_DURATION = 120; // 2 minutes en secondes

export default function WalletFlipCard({
  type,
  solde,
  totalNet,
  totalRetire,
  telephone,
  idStructure,
  nomStructure,
  isLoading = false,
  onRetraitSuccess
}: WalletFlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [step, setStep] = useState<RetraitStep>('idle');
  const [montant, setMontant] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Timer OTP (2 minutes)
  const [timeRemaining, setTimeRemaining] = useState<number>(OTP_TIMER_DURATION);
  const [isTimerExpired, setIsTimerExpired] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const canFlip = solde > 0 && !isLoading;

  // Fonction pour formater le temps restant (mm:ss)
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Démarrer le timer
  const startTimer = useCallback(() => {
    setTimeRemaining(OTP_TIMER_DURATION);
    setIsTimerExpired(false);

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setIsTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Arrêter le timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  // Calculer le pourcentage de progression pour la jauge
  const timerProgress = (timeRemaining / OTP_TIMER_DURATION) * 100;

  const walletConfig = {
    OM: {
      name: 'Orange Money',
      image: '/images/om.png',
      gradient: 'from-orange-50 to-orange-100',
      border: 'border-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-500',
      hoverBg: 'hover:bg-orange-600'
    },
    WAVE: {
      name: 'Wave',
      image: '/images/wave.png',
      gradient: 'from-blue-50 to-blue-100',
      border: 'border-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-500',
      hoverBg: 'hover:bg-blue-600'
    },
    FREE: {
      name: 'Free Money',
      image: null,
      gradient: 'from-green-50 to-green-100',
      border: 'border-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-500',
      hoverBg: 'hover:bg-green-600'
    }
  };

  const config = walletConfig[type];

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  // Format compact pour les montants (ex: 1 250 F)
  const formatCompact = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' F';
  };

  const formatPhone = (phone: string) => {
    if (!phone || phone.length !== 9) return phone;
    return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 7)} ${phone.slice(7)}`;
  };

  const handleCardClick = () => {
    if (canFlip && step === 'idle') {
      setIsFlipped(true);
      setStep('form');
      setMontant(solde.toString());
    }
  };

  const handleCancel = () => {
    stopTimer(); // Arrêter le timer
    setIsFlipped(false);
    setStep('idle');
    setMontant('');
    setOtpError('');
    setStatusMessage('');
    setTimeRemaining(OTP_TIMER_DURATION);
    setIsTimerExpired(false);
  };

  const handleSendOTP = async () => {
    const montantNum = parseInt(montant);
    const validation = retraitService.validateMontant(montantNum, solde);
    if (!validation.valid) {
      setStatusMessage(validation.message);
      return;
    }

    setStep('processing');
    setStatusMessage('Envoi du code de confirmation...');

    const result = await retraitService.sendOTP(idStructure, telephone, type, montantNum);

    if (result.success) {
      setStep('otp');
      setStatusMessage('');
      startTimer(); // Démarrer le timer de 2 minutes
      toast.success('Code SMS envoyé', {
        description: `Vérifiez votre téléphone ${formatPhone(telephone)}`,
        duration: 3000,
      });
    } else {
      setStep('form');
      setStatusMessage(result.message);
      toast.error('Échec envoi SMS', {
        description: result.message,
        duration: 4000,
      });
    }
  };

  const handleOTPComplete = async (otp: string) => {
    console.log('🎯 [UI] handleOTPComplete appelé avec OTP:', otp);
    console.log('🎯 [UI] Contexte:', { idStructure, type, telephone, montant, isTimerExpired });

    // Empêcher la validation si le timer est expiré
    if (isTimerExpired) {
      console.log('⚠️ [UI] Timer expiré, abandon');
      setOtpError('Code expiré');
      toast.error('Code expiré. Veuillez demander un nouveau code.');
      return;
    }

    console.log('🔄 [UI] Appel verifyOTP...');
    const verification = retraitService.verifyOTP(idStructure, type, otp);
    console.log('🔄 [UI] Résultat verifyOTP:', verification);

    if (!verification.valid) {
      console.log('❌ [UI] Code invalide:', verification.message);
      setOtpError(verification.message);
      toast.error(verification.message, {
        description: 'Veuillez vérifier le code reçu par SMS',
        duration: 4000,
      });
      return;
    }

    console.log('✅ [UI] Code valide ! Lancement du retrait...');
    stopTimer(); // Arrêter le timer car le code est validé
    setStep('processing');
    setStatusMessage('Traitement du retrait en cours...');
    setOtpError('');

    const result = await retraitService.effectuerRetrait({
      idStructure,
      telephone,
      montant: parseInt(montant),
      methode: type,
      nomStructure
    });

    if (result.success) {
      setStep('success');
      setStatusMessage(result.message);
      toast.success('Retrait effectué avec succès !', {
        description: `${formatCurrency(parseInt(montant))} envoyé vers ${formatPhone(telephone)}`,
        duration: 5000,
      });
      if (onRetraitSuccess) {
        setTimeout(() => {
          onRetraitSuccess();
          handleCancel();
        }, 2000);
      }
    } else {
      setStep('error');
      setStatusMessage(result.message);
      toast.error('Échec du retrait', {
        description: result.message,
        duration: 5000,
      });
    }
  };

  const handleResendOTP = async () => {
    stopTimer(); // Arrêter l'ancien timer
    setOtpError('');
    setIsTimerExpired(false);
    setTimeRemaining(OTP_TIMER_DURATION);
    setStep('form'); // Revenir au formulaire pour réenvoyer
    await handleSendOTP();
  };

  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="relative h-40"
      style={{ perspective: '1000px' }}
      onClick={!isFlipped ? handleCardClick : undefined}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* Face Avant - Nouveau layout avec grille 3 colonnes */}
        <div
          className={`
            absolute inset-0 w-full h-full
            flex flex-col p-3
            bg-gradient-to-r ${config.gradient} rounded-lg border-l-4 ${config.border}
            ${canFlip ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
          `}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
          {/* Ligne 1: Logo + Nom + Téléphone */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 relative flex-shrink-0">
              {config.image ? (
                <Image
                  src={config.image}
                  alt={config.name}
                  width={32}
                  height={32}
                  className="object-contain"
                />
              ) : (
                <div className={`w-8 h-8 ${config.bgColor} rounded-full flex items-center justify-center`}>
                  <span className="text-white font-bold text-xs">F</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-gray-700">{config.name}</span>
              <span className="text-xs text-gray-500 ml-2">{formatPhone(telephone)}</span>
            </div>
            {canFlip && (
              <div className="text-[9px] text-gray-400 bg-white/50 px-1.5 py-0.5 rounded">
                Cliquez pour retirer
              </div>
            )}
          </div>

          {/* Ligne 2: Grille 3 colonnes (Net Reçu | Net Retiré | Solde Dispo) */}
          <div className="flex-1 grid grid-cols-3 gap-1">
            {/* Net Reçu */}
            <div className="bg-white/60 rounded-lg p-2 text-center">
              <div className="text-[9px] text-gray-500 mb-0.5">Net Reçu</div>
              <div className="text-xs font-bold text-green-600">
                {isLoading ? (
                  <div className="w-12 h-4 bg-gray-200 animate-pulse rounded mx-auto"></div>
                ) : (
                  formatCompact(totalNet)
                )}
              </div>
            </div>

            {/* Net Retiré */}
            <div className="bg-white/60 rounded-lg p-2 text-center">
              <div className="text-[9px] text-gray-500 mb-0.5">Net Retiré</div>
              <div className="text-xs font-bold text-red-600">
                {isLoading ? (
                  <div className="w-12 h-4 bg-gray-200 animate-pulse rounded mx-auto"></div>
                ) : (
                  formatCompact(totalRetire)
                )}
              </div>
            </div>

            {/* Solde Dispo */}
            <div className={`bg-white/80 rounded-lg p-2 text-center border ${config.border}`}>
              <div className="text-[9px] text-gray-500 mb-0.5">Solde Dispo</div>
              <div className={`text-sm font-bold ${config.textColor}`}>
                {isLoading ? (
                  <div className="w-14 h-4 bg-gray-200 animate-pulse rounded mx-auto"></div>
                ) : (
                  formatCompact(solde)
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Face Arrière */}
        <div
          className={`
            absolute inset-0 w-full h-full
            bg-gradient-to-br ${config.gradient} rounded-lg border-2 ${config.border}
            p-3 flex flex-col
          `}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 relative flex-shrink-0">
                {config.image ? (
                  <Image
                    src={config.image}
                    alt={config.name}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                ) : (
                  <div className={`w-6 h-6 ${config.bgColor} rounded-full flex items-center justify-center`}>
                    <span className="text-white font-bold text-xs">F</span>
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-700">Retrait {config.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
              disabled={step === 'processing'}
            >
              ×
            </button>
          </div>

          {/* Contenu selon l'étape - Layout Grille 2 colonnes */}
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              {step === 'form' && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  {/* Ligne : Montant + Bouton alignés */}
                  <div className="flex gap-3 items-stretch">
                    {/* Colonne gauche : Montant */}
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-600 mb-1 block">Montant</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={montant}
                          onChange={(e) => setMontant(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="0"
                          className={`
                            w-full px-2 py-2.5 text-lg font-bold text-center rounded-lg border-2 bg-white
                            ${config.border} focus:ring-2 focus:ring-opacity-50 outline-none
                          `}
                          min={100}
                          max={solde}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                          FCFA
                        </span>
                      </div>
                    </div>

                    {/* Colonne droite : Bouton Retirer */}
                    <div className="flex flex-col">
                      <label className="text-[10px] text-gray-600 mb-1 block invisible">Action</label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendOTP();
                        }}
                        disabled={!montant || parseInt(montant) <= 0}
                        className={`
                          px-4 py-2.5 rounded-lg text-white font-bold text-sm
                          ${config.bgColor} ${config.hoverBg} transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center justify-center gap-1 whitespace-nowrap
                        `}
                      >
                        <span>💸</span>
                        <span>Retirer</span>
                      </button>
                    </div>
                  </div>

                  {/* Ligne info : Max + Message erreur */}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-gray-500">Max: {formatCurrency(solde)}</span>
                    {statusMessage && (
                      <span className="text-[9px] text-red-600">{statusMessage}</span>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Timer expiré */}
                  {isTimerExpired ? (
                    <div className="text-center py-1">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-red-600 text-xl">⏱️</span>
                        <p className="text-xs font-semibold text-red-600">Code expiré</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResendOTP();
                        }}
                        className={`
                          w-full py-2 rounded-lg text-white font-semibold text-xs
                          ${config.bgColor} ${config.hoverBg} transition-colors
                        `}
                      >
                        Renvoyer un code
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-4 items-center">
                      {/* Colonne gauche : Timer compact */}
                      <div className="flex flex-col items-center w-16 flex-shrink-0">
                        <span className={`text-xl font-bold ${timeRemaining <= 30 ? 'text-red-600' : timeRemaining <= 60 ? 'text-orange-500' : 'text-green-600'}`}>
                          {formatTime(timeRemaining)}
                        </span>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              timeRemaining <= 30 ? 'bg-red-500' : timeRemaining <= 60 ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${timerProgress}%` }}
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResendOTP();
                          }}
                          className="text-[8px] text-gray-500 hover:text-gray-700 underline mt-1"
                        >
                          Renvoyer
                        </button>
                      </div>

                      {/* Colonne droite : OTP Input */}
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-600 mb-1 block">Code SMS reçu</label>
                        <OTPInput
                          length={5}
                          onComplete={handleOTPComplete}
                          error={otpError}
                          autoFocus
                          disabled={isTimerExpired}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-2"
                >
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-gray-600">{statusMessage}</p>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                    className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1"
                  >
                    <span className="text-xl text-green-600">✓</span>
                  </motion.div>
                  <p className="text-sm font-semibold text-green-600">Retrait effectué !</p>
                  <p className="text-xs text-gray-500">{formatCurrency(parseInt(montant))}</p>
                </motion.div>
              )}

              {step === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-2"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-1">
                    <span className="text-xl text-red-600">✕</span>
                  </div>
                  <p className="text-sm font-semibold text-red-600">Échec</p>
                  <p className="text-[10px] text-gray-500">{statusMessage}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel();
                    }}
                    className="mt-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Réessayer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
