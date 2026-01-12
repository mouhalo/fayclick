'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion } from 'framer-motion';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export default function OTPInput({
  length = 5,
  onComplete,
  disabled = false,
  error,
  autoFocus = true
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus premier input au montage
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Réinitialiser quand error change
  useEffect(() => {
    if (error) {
      setOtp(new Array(length).fill(''));
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  }, [error, length]);

  const handleChange = (index: number, value: string) => {
    // Ne garder que le dernier chiffre si plusieurs caractères
    const digit = value.replace(/\D/g, '').slice(-1);

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Si un chiffre est entré, passer au suivant
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Vérifier si OTP complet (tous les champs sont remplis)
    const isComplete = newOtp.every(d => d !== '');
    if (isComplete && newOtp.length === length) {
      const completeOtp = newOtp.join('');
      console.log('🔢 [OTP] Code complet saisi:', completeOtp);
      onComplete(completeOtp);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: effacer et revenir en arrière
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      }
    }

    // Arrow Left: aller au précédent
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    // Arrow Right: aller au suivant
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);

      // Focus le dernier champ rempli ou le suivant
      const lastFilledIndex = Math.min(pastedData.length, length) - 1;
      if (lastFilledIndex < length - 1) {
        inputRefs.current[lastFilledIndex + 1]?.focus();
      } else {
        inputRefs.current[lastFilledIndex]?.focus();
      }

      // Vérifier si OTP complet
      if (pastedData.length === length) {
        onComplete(pastedData);
      }
    }
  };

  const handleFocus = (index: number) => {
    // Sélectionner le contenu au focus
    inputRefs.current[index]?.select();
  };

  // Animation de shake pour les erreurs
  const shakeAnimation = {
    x: error ? [0, -10, 10, -10, 10, 0] : 0,
    transition: { duration: 0.4 }
  };

  return (
    <div className="space-y-1">
      <motion.div
        className="flex justify-center gap-1"
        animate={shakeAnimation}
      >
        {otp.map((digit, index) => (
          <motion.input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            disabled={disabled}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              borderColor: error ? '#f87171' : undefined
            }}
            transition={{ delay: index * 0.05 }}
            className={`
              w-9 h-11 text-center text-lg font-bold rounded-md border-2
              transition-all duration-200 outline-none
              ${disabled
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : error
                  ? 'border-red-400 bg-red-50 text-red-600 focus:border-red-500 focus:ring-1 focus:ring-red-200 animate-pulse'
                  : digit
                    ? 'border-green-400 bg-green-50 text-green-700 focus:border-green-500 focus:ring-1 focus:ring-green-200'
                    : 'border-gray-300 bg-white text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
              }
            `}
          />
        ))}
      </motion.div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-[10px] text-red-600 font-medium"
        >
          {error}
        </motion.p>
      )}

      {!error && (
        <p className="text-center text-[9px] text-gray-500">
          Entrez le code reçu par SMS
        </p>
      )}
    </div>
  );
}
