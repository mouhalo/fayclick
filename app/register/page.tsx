'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  MapPin,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
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

/* ═══ Paillettes maison (zéro dépendance réseau) ═══
   Explosion localisée pour célébrer chaque niveau de la barre verticale. */
const FX_COLORS = ['#38bdf8', '#0ea5e9', '#10b981', '#ffffff', '#fbbf24'];

function ensureFxLayer(): HTMLElement {
  let layer = document.getElementById('fx-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'fx-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden;';
    document.body.appendChild(layer);
  }
  return layer;
}

function spawnConfetti(x: number, y: number, count: number, variance: number) {
  const layer = ensureFxLayer();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    const size = 4 + Math.random() * 5;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9; // vers le haut ±80°
    const dist = 40 + Math.random() * (variance || 90);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 14; // légère retombée
    const rot = (Math.random() - 0.5) * 540;
    p.style.cssText =
      'position:absolute;left:' + x + 'px;top:' + y + 'px;' +
      'width:' + size + 'px;height:' + (Math.random() < 0.4 ? size * 0.4 : size) + 'px;' +
      'background:' + FX_COLORS[(Math.random() * FX_COLORS.length) | 0] + ';' +
      'border-radius:' + (Math.random() < 0.5 ? '50%' : '2px') + ';' +
      'transform:translate(-50%,-50%);opacity:1;will-change:transform,opacity;' +
      'transition:transform ' + (700 + Math.random() * 400) + 'ms cubic-bezier(.16,1,.3,1),' +
      'opacity ' + (600 + Math.random() * 300) + 'ms ease-in;';
    layer.appendChild(p);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      p.style.transform = 'translate(' + (dx - size / 2) + 'px,' + (dy - size / 2) + 'px) rotate(' + rot + 'deg)';
      p.style.opacity = '0';
    }));
    setTimeout(() => p.remove(), 1300);
  }
}

function burstAt(el: HTMLElement | null, count = 40, variance = 80) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  spawnConfetti(r.left + r.width / 2, r.top + r.height / 2, count, variance);
}

function bigSideCelebration() {
  for (let w = 0; w < 4; w++) {
    setTimeout(() => {
      spawnConfetti(0, window.innerHeight * 0.75, 10, 130);
      spawnConfetti(window.innerWidth, window.innerHeight * 0.75, 10, 130);
    }, w * 180);
  }
}

/** Nœud de la barre verticale : numéro → coche bleue → coche verte. */
function VNode({
  nodeRef,
  num,
  active,
  done,
}: {
  nodeRef: React.RefObject<HTMLDivElement | null>;
  num: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      ref={nodeRef}
      className={`reg_vnode w-7 h-7 rounded-full border border-white/20 text-white/40 flex items-center justify-center text-[11px] font-bold bg-white/5 ${
        active ? 'reg_vnode-active' : ''
      } ${done ? 'reg_vnode-done' : ''}`}
    >
      <span className="vnum">{num}</span>
      <svg className="vcheck w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </div>
  );
}

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterPage />
    </Suspense>
  );
}

function RegisterFallback() {
  return (
    <div className="reg_page flex items-center justify-center">
      <div className="text-white/70 flex items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement…
      </div>
    </div>
  );
}

function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('register');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  // Pré-remplissage depuis le chatbot : /register?nom=<Nom>&source=chatbot
  const prefillName = (searchParams?.get('nom') ?? '')
    .replace(/[^\p{L}\p{N}\s&.'-]/gu, '')
    .trim()
    .toUpperCase()
    .slice(0, VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH);
  const registerSource = searchParams?.get('source') ?? '';

  // Traçage de la source d'inscription (mesure de conversion du chatbot)
  useEffect(() => {
    if (!registerSource) return;
    try {
      localStorage.setItem('fayclick-register-source', registerSource);
    } catch {
      // stockage indisponible : sans gravité
    }
  }, [registerSource]);

  // Form data - COMMERCE forcé (structureTypeId=2)
  const [formData, setFormData] = useState<RegistrationFormData>({
    businessName: prefillName,
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
    otpChannel: 'sms' | 'email' | 'whatsapp'; otpRecipient: string;
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
  const phoneNodeRef = useRef<HTMLDivElement>(null);
  const nameNodeRef = useRef<HTMLDivElement>(null);
  const addressNodeRef = useRef<HTMLDivElement>(null);
  const termsNodeRef = useRef<HTMLDivElement>(null);
  const extraNodeRef = useRef<HTMLDivElement>(null);

  // Refs synchronisées : les handlers de blur lisent l'état COMMITÉ
  // (évite la closure périmée quand frappe + blur arrivent dans le même tick)
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const nameCheckStateRef = useRef(nameCheckState);
  nameCheckStateRef.current = nameCheckState;

  // Barre verticale : état des célébrations par niveau
  const celebratedRef = useRef<boolean[]>([false, false, false, false]);
  const wasAllValidRef = useRef(false);
  const [celebrated, setCelebrated] = useState<boolean[]>([false, false, false, false]);
  const [extraOpen, setExtraOpen] = useState(false);

  // Auto-focus sur le téléphone au chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = document.querySelector<HTMLInputElement>('input[type="tel"], input[inputmode="tel"]');
      firstInput?.focus();
    }, 250);
    return () => clearTimeout(timer);
  }, []);

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
        alert(t('errors.uploadFailed'));
        return;
      }
      if (!result.url.startsWith('http://') && !result.url.startsWith('https://')) {
        alert(t('errors.invalidImageUrl'));
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

  // ═══ Progression verticale : niveaux remplis ═══
  const phoneValidForCountry = validatePhoneForPays(formData.phoneOM, countryCode);
  const emailValidIfNeeded = countryCode === 'SN' || (emailGmail.length > 0 && isEmailValid);
  const phoneFilled = formData.phoneOM.length > 0 && phoneValidForCountry;
  const nameFilled = businessNameValidation.isValid;
  const addressFilled = formData.address.trim().length > 0 && formData.address.length <= VALIDATION_RULES.ADDRESS_MAX_LENGTH;
  const termsFilled = formData.acceptTerms;
  const isFormValid = phoneFilled && nameFilled && addressFilled && termsFilled && emailValidIfNeeded;

  // Célèbre un niveau une seule fois (tant que le champ reste rempli)
  const celebrateLevel = (index: number, nodeEl: HTMLDivElement | null) => {
    if (!nodeEl || celebratedRef.current[index]) return;
    celebratedRef.current[index] = true;
    burstAt(nodeEl);
    setCelebrated([...celebratedRef.current]);
  };

  // Réarme la célébration d'un niveau si son champ redevient vide
  useEffect(() => {
    const levels = [phoneFilled, nameFilled, addressFilled, termsFilled];
    levels.forEach((filled, i) => {
      if (!filled && celebratedRef.current[i]) {
        celebratedRef.current[i] = false;
        setCelebrated([...celebratedRef.current]);
      }
    });
  }, [phoneFilled, nameFilled, addressFilled, termsFilled]);

  // Filet de sécurité (autofill) + grande célébration à la complétion
  useEffect(() => {
    const levels = [
      { filled: phoneFilled, node: phoneNodeRef.current },
      { filled: nameFilled, node: nameNodeRef.current },
      { filled: addressFilled, node: addressNodeRef.current },
      { filled: termsFilled, node: termsNodeRef.current },
    ];
    const activeTag = document.activeElement?.tagName;
    const typingInAField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag || '');
    levels.forEach((lvl, i) => {
      if (lvl.filled && !celebratedRef.current[i] && !typingInAField) {
        celebrateLevel(i, lvl.node);
      }
    });

    if (isFormValid && !wasAllValidRef.current) {
      wasAllValidRef.current = true;
      setTimeout(bigSideCelebration, 250); // laisse les nœuds passer au vert d'abord
    }
    if (!isFormValid) wasAllValidRef.current = false;
  }, [phoneFilled, nameFilled, addressFilled, termsFilled, isFormValid]);

  // Paillettes après chaque niveau : au moment où l'on quitte le champ.
  // Lit les refs synchronisées (état commité) plutôt que les closures de render.
  const handlePhoneBlur = () => {
    const { phoneOM: phone, countryCode: code } = formDataRef.current;
    if (phone.length > 0 && validatePhoneForPays(phone, code)) celebrateLevel(0, phoneNodeRef.current);
  };
  const handleNameBlur = () => {
    const name = formDataRef.current.businessName.trim();
    const okLength =
      name.length >= VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH &&
      name.length <= VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH;
    if (okLength && nameCheckStateRef.current.exists !== true) celebrateLevel(1, nameNodeRef.current);
  };
  const handleAddressBlur = () => {
    const address = formDataRef.current.address.trim();
    if (address.length > 0 && address.length <= VALIDATION_RULES.ADDRESS_MAX_LENGTH) {
      celebrateLevel(2, addressNodeRef.current);
    }
  };
  // Entrée valide le niveau : ferme le clavier et déclenche le blur
  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur();
    }
  };
  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    if (e.target.checked) celebrateLevel(3, termsNodeRef.current);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isFormValid) return;

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
      let otpChannel: 'sms' | 'email' | 'whatsapp' = countryCode === 'SN' ? 'sms' : 'whatsapp';
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
      const errorMessage = error instanceof Error ? error.message : t('errors.registrationFailed');
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
    celebratedRef.current = [false, false, false, false];
    setCelebrated([false, false, false, false]);
    wasAllValidRef.current = false;
    setExtraOpen(false);
    setError('');
  };

  return (
    <>
      <div className="reg_page">
        {/* Floating Orbs — 2 bleus + 1 émeraude */}
        <div className="reg_orb" style={{ top: '-10%', right: '-5%', width: '300px', height: '300px', background: 'rgba(14, 165, 233, 0.25)', animationDelay: '0s' }} />
        <div className="reg_orb" style={{ top: '35%', left: '-12%', width: '280px', height: '280px', background: 'rgba(14, 165, 233, 0.18)', animationDelay: '6s' }} />
        <div className="reg_orb" style={{ bottom: '-15%', left: '25%', width: '250px', height: '250px', background: 'rgba(16, 185, 129, 0.2)', animationDelay: '12s' }} />

        {/* Header - simple (la progression est dans le formulaire) */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)' }}
                title={t('backToHome')}
              >
                <Home className="w-5 h-5 text-sky-200" />
              </button>
              <LogoFayclick className="w-10 h-10" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">{t('title')}</h1>
                <p className="text-xs text-sky-200/70">{t('subtitle')}</p>
              </div>
            </div>

            <LanguageSwitcher variant="compact" />
          </div>
        </header>

        {/* Main Content — un seul écran */}
        <main className="max-w-lg mx-auto px-4 py-6 md:py-10 relative z-10">
          <form onSubmit={handleSubmit}>

            {/* Glass Card */}
            <div className="reg_glass-card p-2.5 md:p-8 mb-2 md:mb-4">
              {/* Welcome */}
              <div className="text-center space-y-1.5 md:space-y-3 mb-6 md:mb-9">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-2xl text-2xl md:text-3xl shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}
                >
                  🏪
                </motion.div>
                <h2 className="text-xl md:text-3xl font-bold text-white">
                  {t('singleStep.title')}
                </h2>
                <p className="text-sky-200/70 max-w-md mx-auto text-xs md:text-sm">
                  {t('singleStep.subtitle')}
                </p>
              </div>

              {/* ═══ STEP 1 : Téléphone ═══ */}
              <div className="flex gap-4" onBlur={handlePhoneBlur} onKeyDown={handleFieldKeyDown}>
                <div className="flex flex-col items-center shrink-0">
                  <VNode nodeRef={phoneNodeRef} num="1" active={phoneFilled} done={isFormValid} />
                  <div className="w-0.5 flex-1 min-h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="reg_vseg-fill w-full" style={{ height: phoneFilled ? '100%' : undefined }} />
                  </div>
                </div>
                <div className="flex-1 pb-7">
                  <label className="flex items-center gap-2 text-white/80 font-semibold text-sm mb-1.5">
                    <Phone className="w-4 h-4 text-sky-400" />
                    {t('step1.phoneLabel')} <span className="text-red-400">*</span>
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
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-white/80 font-semibold text-sm">
                            <Mail className="w-4 h-4 text-sky-400" />
                            {t('step2.emailGmailLabel')} <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="email"
                            name="emailGmail"
                            value={emailGmail}
                            onChange={handleEmailGmailChange}
                            onBlur={() => setEmailTouched(true)}
                            className="reg_glass-input"
                            placeholder={t('step2.emailGmailPlaceholder')}
                            autoComplete="email"
                            inputMode="email"
                            required
                            aria-required="true"
                            aria-invalid={emailTouched && !isEmailValid}
                          />
                          {emailTouched && emailGmail && !isEmailValid && (
                            <p className="text-red-400 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {t('step2.emailGmailRequired')}
                            </p>
                          )}
                          {emailGmail && isEmailValid && (
                            <p className="text-emerald-400 text-xs flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              {t('step2.emailGmailValid')}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ═══ STEP 2 : Nom commercial ═══ */}
              <div className="flex gap-4" onBlur={handleNameBlur} onKeyDown={handleFieldKeyDown}>
                <div className="flex flex-col items-center shrink-0">
                  <VNode nodeRef={nameNodeRef} num="2" active={nameFilled} done={isFormValid} />
                  <div className="w-0.5 flex-1 min-h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="reg_vseg-fill w-full" style={{ height: nameFilled ? '100%' : undefined }} />
                  </div>
                </div>
                <div className="flex-1 pb-7">
                  <label className="block text-white/80 font-semibold text-sm mb-1.5">
                    {t('step1.businessNameLabelStrong')} <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={businessNameRef}
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      className={`reg_glass-input text-base md:text-lg font-bold uppercase pr-12 ${
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
                      placeholder={t('step1.businessNamePlaceholderExample')}
                      maxLength={VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {nameCheckState.checking ? (
                        <Loader2 className="w-5 h-5 text-sky-300 animate-spin" />
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
                        className={`flex items-center gap-2 text-sm font-medium mt-1.5 ${
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

                  <div className="flex justify-between text-xs text-white/40 mt-1">
                    <span>{VALIDATION_RULES.BUSINESS_NAME_MIN_LENGTH}-{VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH} caractères</span>
                    <span className={formData.businessName.length > VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH * 0.8 ? 'text-orange-400 font-semibold' : ''}>
                      {formData.businessName.length}/{VALIDATION_RULES.BUSINESS_NAME_MAX_LENGTH}
                    </span>
                  </div>
                </div>
              </div>

              {/* ═══ STEP 3 : Adresse ═══ */}
              <div className="flex gap-4" onBlur={handleAddressBlur} onKeyDown={handleFieldKeyDown}>
                <div className="flex flex-col items-center shrink-0">
                  <VNode nodeRef={addressNodeRef} num="3" active={addressFilled} done={isFormValid} />
                  <div className="w-0.5 flex-1 min-h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="reg_vseg-fill w-full" style={{ height: addressFilled ? '100%' : undefined }} />
                  </div>
                </div>
                <div className="flex-1 pb-7">
                  <label className="flex items-center gap-1.5 text-white/80 font-semibold text-sm mb-1.5">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    {t('step3Extended.addressLabel')} <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={addressRef}
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="reg_glass-input"
                    placeholder={t('step3Extended.addressPlaceholderExample')}
                    maxLength={VALIDATION_RULES.ADDRESS_MAX_LENGTH}
                    required
                  />
                  <div className="text-xs text-white/40 text-right mt-1">
                    {formData.address.length}/{VALIDATION_RULES.ADDRESS_MAX_LENGTH}
                  </div>
                </div>
              </div>

              {/* ═══ STEP 4 : Conditions ═══ */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <VNode nodeRef={termsNodeRef} num="4" active={termsFilled} done={isFormValid} />
                  <div className="w-0.5 flex-1 min-h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="reg_vseg-fill w-full" style={{ height: termsFilled ? '100%' : undefined }} />
                  </div>
                </div>
                <div className="flex-1 pb-7">
                  <label className="flex items-start gap-3 min-h-[48px] cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleTermsChange}
                      className="mt-0.5 w-5 h-5 rounded accent-sky-500 cursor-pointer flex-shrink-0"
                      required
                    />
                    <span className="text-sm leading-relaxed text-white/70 group-hover:text-white">
                      J&apos;accepte les{' '}
                      <a href="/terms" target="_blank" className="text-sky-300 hover:text-sky-200 font-semibold underline">
                        conditions générales
                      </a>{' '}
                      et la{' '}
                      <a href="/privacy" target="_blank" className="text-sky-300 hover:text-sky-200 font-semibold underline">
                        politique de confidentialité
                      </a>{' '}
                      de FayClick.
                    </span>
                  </label>
                </div>
              </div>

              {/* ═══ STEP 5 : « En dire plus ? » — fin de la barre ═══ */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <VNode nodeRef={extraNodeRef} num="+" active={false} done={extraOpen} />
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setExtraOpen(o => !o)}
                    className="flex items-center gap-2 h-12 text-sm font-semibold text-sky-300 hover:text-sky-200 active:text-sky-200 transition-colors"
                  >
                    {t('singleStep.enDirePlus')}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${extraOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Contenu dépliable */}
                  <div className={`reg_extra ${extraOpen ? 'reg_extra-open' : ''}`}>
                    <div className="pb-6">
                      <label className="flex items-center gap-1.5 text-white/80 font-semibold text-sm mb-1.5">
                        <Tag className="w-4 h-4 text-orange-400" />
                        {t('step3Extended.promoCodeLabel')}{' '}
                        <span className="text-white/40 text-xs font-normal">({tCommon('optional')})</span>
                      </label>
                      <input
                        type="text"
                        name="codePromo"
                        value={formData.codePromo || ''}
                        onChange={handleChange}
                        className="reg_glass-input uppercase"
                        placeholder={t('step3Extended.promoCodePlaceholder')}
                        maxLength={11}
                      />
                      <p className="text-xs text-white/40 mt-1">
                        {t('step3Extended.promoCodeHelp')}
                      </p>
                    </div>
                    <div className="pb-6">
                      <label className="flex items-center gap-1.5 text-white/80 font-semibold text-sm mb-1.5">
                        <Upload className="w-4 h-4 text-sky-400" />
                        {t('step3Extended.logoLabel')}{' '}
                        <span className="text-white/40 text-xs font-normal">({tCommon('optional')})</span>
                      </label>
                      <LogoUpload
                        onUploadComplete={handleLogoUploadComplete}
                        onUploadProgress={handleLogoUploadProgress}
                        onFileSelect={handleLogoFileSelect}
                        registerMode={true}
                        structureName={formData.businessName || 'fayclick'}
                      />
                    </div>
                  </div>
                </div>
              </div>
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

            {/* Bouton de soumission unique */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!isFormValid || isLoading}
              className="reg_btn-primary w-full h-14 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('submit.creating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {t('submit.create')}
                </>
              )}
            </motion.button>

            {/* Login link */}
            <div className="text-center mt-4 md:mt-6 pb-4">
              <p className="text-white/50 text-sm">
                {t('loginLink.text')}{' '}
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-sky-300 hover:text-sky-200 font-semibold underline"
                >
                  {t('loginLink.action')}
                </button>
              </p>
            </div>
          </form>
        </main>
      </div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
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
              {t('celebration.title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
              className="text-sky-200 mt-2"
            >
              {t('celebration.subtitle')}
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
