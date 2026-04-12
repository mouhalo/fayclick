'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MapPin,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Home,
  Tag,
  Mail
} from 'lucide-react';
import {
  RegistrationFormData,
  VALIDATION_RULES,
} from '@/types/registration';
import LogoFayclick from '@/components/ui/LogoFayclick';
import { UploadResult, UploadProgress } from '@/types/upload.types';
import registrationService from '@/services/registration.service';
import otpRouter from '@/services/otp-router.service';
import { validatePhoneForPays, PAYS_DEFAULT_CODE, getPaysByCode } from '@/types/pays';
import CountryPhoneInput from '@/components/register/CountryPhoneInput';
import SuccessModal from '@/components/ui/SuccessModal';
import LogoUpload from '@/components/ui/LogoUpload';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslations } from '@/hooks/useTranslations';

/**
 * Nettoie une chaîne pour être compatible XML
 */
const sanitizeForXML = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/['']/g, ' ')
    .replace(/["\"]/g, ' ')
    .replace(/[;:]/g, ' ')
    .replace(/,/g, ' ')
    .replace(/&/g, 'et')
    .replace(/</g, ' ')
    .replace(/>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const CONFETTI_COLORS = ['#10b981', '#f59e0b', '#ffffff', '#34d399', '#fbbf24', '#6ee7b7'];

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations('register');
  const tCommon = useTranslations('common');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Form data - COMMERCE forcé (structureTypeId=2)
  const [formData, setFormData] = useState<RegistrationFormData>({
    businessName: '',
    structureTypeId: 2,       // COMMERCE forcé
    serviceType: 'SERVICES',  // Forcé
    phoneOM: '',
    phoneWave: '',
    address: '',
    logoUrl: '',
    codePromo: '',
    countryCode: PAYS_DEFAULT_CODE,
    emailGmail: '',
    acceptTerms: false,
  });

  // Raccourcis
  const countryCode = formData.countryCode;
  const emailGmail = formData.emailGmail || '';

  // État "touched" pour l'email (validation affichée après 1er blur)
  const [emailTouched, setEmailTouched] = useState(false);

  // Regex Gmail strict
  const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;
  const isEmailValid = GMAIL_REGEX.test(emailGmail.trim().toLowerCase());

  // Validation states
  const [nameCheckState, setNameCheckState] = useState<{
    checking: boolean;
    exists: boolean | null;
  }>({
    checking: false,
    exists: null
  });

  const [logoUploadState, setLogoUploadState] = useState({
    isUploaded: false,
    fileName: '',
    uploadProgress: 0
  });

  // Success modal
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean; message: string; login: string; password: string;
    structureName: string; otpCode: string; phoneOM: string;
    otpChannel: 'sms' | 'email'; otpRecipient: string;
  }>({
    isOpen: false,
    message: '',
    login: '',
    password: '',
    structureName: '',
    otpCode: '',
    phoneOM: '',
    otpChannel: 'sms',
    otpRecipient: ''
  });

  // Refs
  const businessNameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  // Auto-focus on step change
  useEffect(() => {
    if (step === 1 && businessNameRef.current) {
      setTimeout(() => businessNameRef.current?.focus(), 100);
    } else if (step === 2 && addressRef.current) {
      setTimeout(() => addressRef.current?.focus(), 100);
    }
  }, [step]);

  // Check structure name with debouncing
  useEffect(() => {
    const checkStructureName = async () => {
      const trimmedName = formData.businessName.trim();
      if (
        trimmedName.length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH ||
        trimmedName.length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH
      ) {
        setNameCheckState({ checking: false, exists: null });
        return;
      }
      setNameCheckState({ checking: true, exists: null });
      try {
        const exists = await registrationService.checkStructureNameExists(trimmedName);
        setNameCheckState({ checking: false, exists });
      } catch {
        setNameCheckState({ checking: false, exists: null });
      }
    };
    const timeoutId = setTimeout(checkStructureName, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.businessName]);

  // Confetti data (generated once)
  const confettiPieces = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random(),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 6,
      rotation: Math.random() * 360,
    })),
  []);

  // Validation
  const validateBusinessName = (name: string) => {
    const length = name.trim().length;
    if (length === 0) return { isValid: false, message: '', status: 'empty' };
    if (length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH) {
      return {
        isValid: false,
        message: t('step1.tooShort', { min: VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH }),
        status: 'too-short'
      };
    }
    if (length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH) {
      return {
        isValid: false,
        message: t('step1.tooLong', { max: VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH }),
        status: 'too-long'
      };
    }
    if (nameCheckState.exists === true) {
      return {
        isValid: false,
        message: t('step1.alreadyTaken'),
        status: 'duplicate'
      };
    }
    return { isValid: true, message: t('step1.available'), status: 'valid' };
  };

  const businessNameValidation = validateBusinessName(formData.businessName);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue = value;

    if (name === 'businessName') {
      processedValue = value.toUpperCase();
    }

    if (name === 'phoneOM') {
      processedValue = value.replace(/\D/g, '');
      if (processedValue.length > VALIDATION_RULES.PHONE_LENGTH) {
        processedValue = processedValue.slice(0, VALIDATION_RULES.PHONE_LENGTH);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : processedValue,
    }));
  };

  // Handlers CountryPhoneInput
  const handlePhoneChange = (phone: string) => {
    setFormData(prev => ({ ...prev, phoneOM: phone }));
  };

  const handleCountryChange = (code: string) => {
    setFormData(prev => ({ ...prev, countryCode: code }));
    // Reset "touched" quand on revient à SN (masque l'email)
    if (code === 'SN') setEmailTouched(false);
  };

  const handleEmailGmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, emailGmail: e.target.value.trim().toLowerCase() }));
  };

  const handleLogoUploadComplete = (result: UploadResult) => {
    if (result.success && result.url) {
      if (result.url.startsWith('data:')) {
        alert('Erreur: L\'upload vers le serveur a échoué. Veuillez réessayer.');
        return;
      }
      if (!result.url.startsWith('http://') && !result.url.startsWith('https://')) {
        alert('Erreur: URL de l\'image invalide. Veuillez réessayer.');
        return;
      }
      setFormData(prev => ({ ...prev, logoUrl: result.url! }));
      setLogoUploadState({
        isUploaded: true,
        fileName: result.filename || 'logo.png',
        uploadProgress: 100
      });
    }
  };

  const handleLogoUploadProgress = (progress: UploadProgress) => {
    setLogoUploadState(prev => ({
      ...prev,
      uploadProgress: progress.progress
    }));
  };

  const handleLogoFileSelect = (file: File) => {
    setLogoUploadState(prev => ({
      ...prev,
      fileName: file.name,
      isUploaded: false
    }));
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.businessName || formData.businessName.trim().length < VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH) {
          setError(`Nom du commerce requis (minimum ${VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH} caractères)`);
          return false;
        }
        if (nameCheckState.exists) {
          setError('Ce nom de structure est déjà pris');
          return false;
        }
        if (!formData.phoneOM || !validatePhoneForPays(formData.phoneOM, countryCode)) {
          const pays = getPaysByCode(countryCode);
          setError(`Numéro de téléphone invalide pour ${pays?.nom_fr || 'le pays sélectionné'}`);
          return false;
        }
        if (countryCode !== 'SN') {
          if (!emailGmail || !isEmailValid) {
            setError('Email Gmail requis pour les inscriptions hors Sénégal (ex: vous@gmail.com)');
            return false;
          }
        }
        break;
      case 2:
        if (!formData.address || formData.address.trim().length === 0) {
          setError('Adresse requise');
          return false;
        }
        if (formData.address.length > VALIDATION_RULES.ADDRESS_MAX_LENGTH) {
          setError(`Adresse trop longue (maximum ${VALIDATION_RULES.ADDRESS_MAX_LENGTH} caractères)`);
          return false;
        }
        if (!formData.acceptTerms) {
          setError('Veuillez accepter les conditions générales');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setError('');
      setStep(2);
    }
  };

  const prevStep = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(2)) return;

    setIsLoading(true);
    setError('');

    try {
      const cleanedAddress = sanitizeForXML(formData.address);

      const registrationData = {
        p_id_type: 2,                                    // COMMERCE forcé
        p_nom_structure: formData.businessName,
        p_adresse: cleanedAddress,
        p_mobile_om: formData.phoneOM,
        p_mobile_wave: formData.phoneOM,                 // Auto-copie du OM
        p_nom_service: 'SERVICES',                       // Forcé
        p_logo: formData.logoUrl || '',
        p_code_promo: formData.codePromo?.toUpperCase().trim() || 'FAYCLICK',
        // Multi-pays CEDEAO (Sprint 3)
        p_code_iso_pays: countryCode,
        p_email_gmail: countryCode !== 'SN' ? emailGmail : '',
        p_email: countryCode !== 'SN' ? emailGmail : ''
      };

      const result = await registrationService.registerMerchant(registrationData);
      const loginInfo = registrationService.extractLoginInfo(result.message);

      const otpCode = registrationService.generateOTPCode();
      const login = loginInfo.login || '';
      const password = loginInfo.password || '0000';

      // Stocker en localStorage
      if (login && password) {
        const pinData = JSON.stringify({
          pin: otpCode,
          login,
          pwd: password,
          lastMode: 'pin'
        });
        localStorage.setItem('fayclick_quick_pin', btoa(pinData));
      }

      // Envoi OTP via routeur (SMS si SN, Email Gmail sinon)
      const phoneNumber = formData.phoneOM;
      let otpChannel: 'sms' | 'email' = countryCode === 'SN' ? 'sms' : 'email';
      let otpRecipient = countryCode === 'SN' ? phoneNumber : emailGmail;
      try {
        const routed = await otpRouter.sendOTP({
          codeIsoPays: countryCode,
          phone: phoneNumber,
          email: countryCode !== 'SN' ? emailGmail : null,
          otpCode,
          context: 'registration',
          structureName: formData.businessName,
        });
        otpChannel = routed.channel;
        otpRecipient = routed.recipient;
      } catch (otpError) {
        console.warn('OTP non envoyé (non bloquant):', otpError);
      }

      // Celebration confettis AVANT le SuccessModal
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        setSuccessModal({
          isOpen: true,
          message: result.message,
          login,
          password,
          structureName: formData.businessName,
          otpCode,
          phoneOM: phoneNumber,
          otpChannel,
          otpRecipient,
        });
      }, 2800);

      resetForm();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      businessName: '',
      structureTypeId: 2,
      serviceType: 'SERVICES',
      phoneOM: '',
      phoneWave: '',
      address: '',
      logoUrl: '',
      codePromo: '',
      countryCode: PAYS_DEFAULT_CODE,
      emailGmail: '',
      acceptTerms: false,
    });
    setEmailTouched(false);
    setLogoUploadState({
      isUploaded: false,
      fileName: '',
      uploadProgress: 0
    });
    setStep(1);
    setError('');
  };

  // Animation variants for framer-motion
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30 }
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
      transition: { duration: 0.2 }
    })
  };

  const [direction, setDirection] = useState(0);

  // Step 1 validation for button
  const phoneValidForCountry = validatePhoneForPays(formData.phoneOM, countryCode);
  const emailValidIfNeeded = countryCode === 'SN' || (emailGmail.length > 0 && isEmailValid);
  const isStep1Valid = businessNameValidation.isValid && !nameCheckState.checking &&
    phoneValidForCountry && emailValidIfNeeded;

  return (
    <>
      <div className="reg_page">
        {/* Floating Orbs */}
        <div className="reg_orb" style={{ top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'rgba(16, 185, 129, 0.3)', animationDelay: '0s' }} />
        <div className="reg_orb" style={{ bottom: '-15%', left: '-10%', width: '350px', height: '350px', background: 'rgba(20, 184, 166, 0.25)', animationDelay: '5s' }} />
        <div className="reg_orb" style={{ top: '40%', left: '60%', width: '200px', height: '200px', background: 'rgba(52, 211, 153, 0.2)', animationDelay: '10s' }} />
        <div className="reg_orb" style={{ top: '20%', left: '-5%', width: '250px', height: '250px', background: 'rgba(5, 150, 105, 0.2)', animationDelay: '15s' }} />

        {/* Header - Glass sticky */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(6, 78, 59, 0.8)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                title="Retour à l'accueil"
              >
                <Home className="w-5 h-5 text-green-200" />
              </button>
              <LogoFayclick className="w-10 h-10" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">{t('title')}</h1>
                <p className="text-xs text-green-200/70">{t('subtitle')}</p>
              </div>
            </div>

            {/* Progress + Language */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-200 hidden sm:block">
                  {step}/2
                </span>
                <div className="flex gap-1.5">
                  {[1, 2].map((s) => (
                    <div
                      key={s}
                      className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: s <= step ? '#10b981' : 'rgba(255,255,255,0.2)',
                        transform: s === step ? 'scale(1.2)' : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
              </div>
              <LanguageSwitcher variant="compact" />
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="reg_progress-bar"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-lg mx-auto px-4 py-3 md:py-10 relative z-10">
          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>

            {/* Glass Card */}
            <div className="reg_glass-card p-4 md:p-8 mb-4">
              <AnimatePresence mode="wait" custom={direction}>
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-3 md:space-y-6"
                  >
                    {/* Welcome */}
                    <div className="text-center space-y-1.5 md:space-y-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.1 }}
                        className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full text-2xl md:text-3xl shadow-lg"
                        style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
                      >
                        🏪
                      </motion.div>
                      <h2 className="text-xl md:text-3xl font-bold text-white">
                        Votre Commerce
                      </h2>
                      <p className="text-green-200/70 max-w-md mx-auto text-xs md:text-sm">
                        Commencez par donner un nom à votre structure
                      </p>
                    </div>

                    {/* Business Name */}
                    <div className="space-y-1.5 md:space-y-3">
                      <label className="block text-green-100 font-semibold text-sm">
                        Nom de votre commerce <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          ref={businessNameRef}
                          type="text"
                          name="businessName"
                          value={formData.businessName}
                          onChange={handleChange}
                          className={`reg_glass-input text-lg font-bold uppercase pr-12 ${
                            businessNameValidation.status === 'valid'
                              ? 'reg_valid-pulse'
                              : businessNameValidation.status === 'duplicate'
                              ? 'reg_error-shake'
                              : ''
                          }`}
                          style={{
                            borderColor: businessNameValidation.status === 'valid'
                              ? '#10b981'
                              : businessNameValidation.status === 'duplicate'
                              ? '#ef4444'
                              : undefined
                          }}
                          placeholder="Ex: BOUTIQUE AMINATA"
                          maxLength={VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                          required
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          {nameCheckState.checking ? (
                            <Loader2 className="w-5 h-5 text-green-300 animate-spin" />
                          ) : formData.businessName && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                              {businessNameValidation.isValid ? (
                                <Check className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                              )}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Validation Message */}
                      <AnimatePresence mode="wait">
                        {formData.businessName && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex items-center gap-2 text-sm font-medium ${
                              businessNameValidation.status === 'valid'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {businessNameValidation.status === 'valid' ? (
                              <Sparkles className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                            {businessNameValidation.message}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex justify-between text-xs text-green-300/50">
                        <span>{VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH}-{VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH} caractères</span>
                        <span className={formData.businessName.length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH * 0.8 ? 'text-orange-400 font-semibold' : ''}>
                          {formData.businessName.length}/{VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                        </span>
                      </div>
                    </div>

                    {/* Phone OM — multi-pays CEDEAO */}
                    <div className="space-y-1.5 md:space-y-3">
                      <label className="flex items-center gap-2 text-green-100 font-semibold text-sm">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        Téléphone Orange Money <span className="text-red-400">*</span>
                      </label>
                      <CountryPhoneInput
                        value={formData.phoneOM}
                        countryCode={countryCode}
                        onPhoneChange={handlePhoneChange}
                        onCountryChange={handleCountryChange}
                        error={
                          formData.phoneOM && !validatePhoneForPays(formData.phoneOM, countryCode)
                            ? `Numéro invalide pour ${getPaysByCode(countryCode)?.nom_fr}`
                            : undefined
                        }
                      />
                    </div>

                    {/* Email Gmail conditionnel — pays ≠ SN */}
                    <AnimatePresence initial={false}>
                      {countryCode !== 'SN' && (
                        <motion.div
                          key="email-field"
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="space-y-1.5 md:space-y-3">
                            <label className="flex items-center gap-2 text-green-100 font-semibold text-sm">
                              <Mail className="w-4 h-4 text-emerald-400" />
                              Email Gmail <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="email"
                              name="emailGmail"
                              value={emailGmail}
                              onChange={handleEmailGmailChange}
                              onBlur={() => setEmailTouched(true)}
                              className="reg_glass-input"
                              placeholder="vous@gmail.com"
                              autoComplete="email"
                              inputMode="email"
                              required
                              aria-required="true"
                              aria-invalid={emailTouched && !isEmailValid}
                            />
                            {emailTouched && emailGmail && !isEmailValid && (
                              <p className="text-red-400 text-xs flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Email Gmail requis (ex: vous@gmail.com)
                              </p>
                            )}
                            {emailGmail && isEmailValid && (
                              <p className="text-emerald-400 text-xs flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                Email Gmail valide
                              </p>
                            )}
                            <p className="text-xs text-green-300/50">
                              Le SMS n&apos;étant pas disponible pour ce pays, votre code OTP sera envoyé par email.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Benefits Grid - Masqué sur très petits écrans */}
                    <div className="hidden sm:grid grid-cols-2 gap-3 pt-2">
                      {[
                        { icon: '🚀', text: t('step1.benefits.free') },
                        { icon: '💰', text: t('step1.benefits.instant') },
                        { icon: '🔒', text: t('step1.benefits.secure') },
                        { icon: '📱', text: t('step1.benefits.qrcode') }
                      ].map((benefit, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + index * 0.1 }}
                          className="flex items-center gap-2 p-3 rounded-xl"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          <span className="text-xl">{benefit.icon}</span>
                          <span className="text-xs font-medium text-green-100/80">{benefit.text}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-3 md:space-y-6"
                  >
                    {/* Step Title */}
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl md:text-3xl font-bold text-white">
                        Finalisation
                      </h2>
                      <p className="text-green-200/70 text-sm">
                        Encore quelques infos et c&apos;est parti !
                      </p>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-green-100 font-semibold text-sm">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        Adresse <span className="text-red-400">*</span>
                      </label>
                      <input
                        ref={addressRef}
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="reg_glass-input"
                        placeholder="Ex: Marché Sandaga, Dakar"
                        maxLength={VALIDATION_RULES.ADDRESS_MAX_LENGTH}
                        required
                      />
                      <div className="text-xs text-green-300/40 text-right">
                        {formData.address.length}/{VALIDATION_RULES.ADDRESS_MAX_LENGTH}
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-green-100 font-semibold text-sm">
                        <Upload className="w-4 h-4 text-emerald-400" />
                        Logo <span className="text-green-300/40 text-xs font-normal">({tCommon('optional')})</span>
                      </label>
                      <LogoUpload
                        onUploadComplete={handleLogoUploadComplete}
                        onUploadProgress={handleLogoUploadProgress}
                        onFileSelect={handleLogoFileSelect}
                        registerMode={true}
                      />
                    </div>

                    {/* Code Parrainage */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-green-100 font-semibold text-sm">
                        <Tag className="w-4 h-4 text-orange-400" />
                        Code Parrainage <span className="text-green-300/40 text-xs font-normal">({tCommon('optional')})</span>
                      </label>
                      <input
                        type="text"
                        name="codePromo"
                        value={formData.codePromo || ''}
                        onChange={handleChange}
                        className="reg_glass-input uppercase"
                        placeholder="Ex: ORANGE2026"
                        maxLength={11}
                      />
                      <p className="text-xs text-green-300/40">
                        Avez-vous un code partenaire ?
                      </p>
                    </div>

                    {/* Terms */}
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          name="acceptTerms"
                          checked={formData.acceptTerms}
                          onChange={handleChange}
                          className="mt-1 w-5 h-5 rounded border-green-600 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                          style={{ accentColor: '#10b981' }}
                          required
                        />
                        <span className="text-sm text-green-100/80 leading-relaxed group-hover:text-green-100">
                          J&apos;accepte les{' '}
                          <a href="/terms" target="_blank" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
                            conditions générales
                          </a>{' '}
                          et la{' '}
                          <a href="/privacy" target="_blank" className="text-emerald-400 hover:text-emerald-300 font-semibold underline">
                            politique de confidentialité
                          </a>{' '}
                          de FayClick.
                        </span>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-4 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-red-300">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {step > 1 && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  type="button"
                  onClick={() => { prevStep(); setDirection(-1); }}
                  className="reg_btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {tCommon('previous')}
                </motion.button>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={
                  (step === 1 && !isStep1Valid) ||
                  (step === 2 && isLoading)
                }
                className={`reg_btn-primary ${step === 1 ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2`}
                onClick={() => step === 1 && setDirection(1)}
              >
                {step === 2 ? (
                  isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Créer ma structure
                    </>
                  )
                ) : (
                  <>
                    {tCommon('next')}
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>

            {/* Login link */}
            <div className="text-center mt-3 md:mt-6 pb-4">
              <p className="text-green-200/50 text-sm">
                Déjà inscrit ?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </form>
        </main>
      </div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(6, 78, 59, 0.9)' }}>
          {/* Confetti CSS */}
          {confettiPieces.map((piece) => (
            <div
              key={piece.id}
              className="reg_confetti"
              style={{
                left: `${piece.x}%`,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                backgroundColor: piece.color,
                borderRadius: piece.id % 3 === 0 ? '50%' : '2px',
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ))}

          {/* SVG Checkmark */}
          <div className="text-center">
            <svg
              className="w-24 h-24 mx-auto mb-6"
              viewBox="0 0 52 52"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="reg_checkmark-circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
              <path
                className="reg_checkmark-check"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
            <motion.h2
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: 'spring' }}
              className="text-3xl font-bold text-white reg_celebration-pulse"
            >
              Félicitations !
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="text-green-200 mt-2"
            >
              Votre commerce est créé
            </motion.p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal(prev => ({ ...prev, isOpen: false }))}
        message={successModal.message}
        login={successModal.login}
        password={successModal.password}
        structureName={successModal.structureName}
        otpCode={successModal.otpCode}
        phoneOM={successModal.phoneOM}
        otpChannel={successModal.otpChannel}
        otpRecipient={successModal.otpRecipient}
      />
    </>
  );
}
