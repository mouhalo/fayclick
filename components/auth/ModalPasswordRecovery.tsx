'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Building2, Lock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ModalPasswordRecoveryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalPasswordRecovery({ isOpen, onClose }: ModalPasswordRecoveryProps) {
  const { isMobile, isMobileLarge, isDesktop } = useBreakpoint();
  const [formData, setFormData] = useState({
    structureName: '',
    phoneNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Réinitialiser le formulaire à chaque ouverture
  useEffect(() => {
    if (isOpen) {
      setFormData({ structureName: '', phoneNumber: '' });
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

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
        phonePadding: 'pl-14', // Padding réduit pour mobile
        indicatorLeft: 'left-4' // Position indicateur pour mobile
      };
    } else if (isMobileLarge) {
      return {
        container: 'max-w-sm p-5',
        title: 'text-xl',
        subtitle: 'text-sm',
        input: 'text-base px-4 py-2.5',
        button: 'text-base py-2.5',
        icon: 'w-5 h-5 left-3',
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
        icon: 'w-5 h-5 left-3',
        phonePadding: 'pl-18', // Plus d'espace sur desktop
        indicatorLeft: 'left-9' // Position indicateur pour desktop
      };
    }
  };

  const styles = getModalStyles();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.structureName.trim()) {
      setError('Le nom de la structure est requis');
      return;
    }
    
    if (!formData.phoneNumber.trim()) {
      setError('Le numéro de téléphone est requis');
      return;
    }

    // Validation du format téléphone sénégalais
    const phoneRegex = /^(77|78|76|70|75)[0-9]{7}$/;
    const cleanPhone = formData.phoneNumber.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Numéro de téléphone invalide (format: 77XXXXXXX)');
      return;
    }

    setIsLoading(true);

    try {
      // Simuler l'appel API pour récupération du mot de passe
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // En production, ici on appellerait le service auth
      // const response = await authService.recoverPassword({
      //   structure_name: formData.structureName,
      //   phone_number: cleanPhone
      // });

      setSuccess(true);
      
      // Fermer le modal après 3 secondes
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Garder uniquement les chiffres
    if (value.length <= 9) {
      setFormData({ ...formData, phoneNumber: value });
    }
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
                      Récupération du mot de passe
                    </h2>
                    <p className={`${styles.subtitle} text-green-100 mt-1`}>
                      Recevez un nouveau mot de passe par SMS
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

              {/* Contenu */}
              {!success ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nom de la structure */}
                  <div>
                    <label className={`block ${styles.subtitle} font-medium text-green-100 mb-2`}>
                      Nom de votre structure
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.icon} text-green-300`} />
                      <input
                        type="text"
                        value={formData.structureName}
                        onChange={(e) => setFormData({ ...formData, structureName: e.target.value })}
                        className={`
                          w-full ${styles.input} pl-10
                          bg-white/20 backdrop-blur-sm border border-green-200/30
                          rounded-xl text-white placeholder-green-100/60
                          focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                          transition-all duration-200 hover:bg-white/30
                        `}
                        placeholder="Nom de la structure"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {/* Numéro de téléphone */}
                  <div>
                    <label className={`block ${styles.subtitle} font-medium text-green-100 mb-2`}>
                      Numéro de téléphone
                    </label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.icon} text-green-300`} />
                      <span className={`absolute ${styles.indicatorLeft} top-1/2 -translate-y-1/2 text-green-200 font-medium pointer-events-none`}>
                        +221
                      </span>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={handlePhoneChange}
                        className={`
                          w-full ${styles.input} ${styles.phonePadding}
                          bg-white/20 backdrop-blur-sm border border-green-200/30
                          rounded-xl text-white placeholder-green-100/60
                          focus:ring-2 focus:ring-emerald-400 focus:border-transparent
                          transition-all duration-200 hover:bg-white/30
                        `}
                        placeholder="77 XXX XX XX"
                        disabled={isLoading}
                      />
                    </div>
                    <p className={`${styles.subtitle} text-green-200/80 mt-1`}>
                      Format: 77, 78, 76, 70 ou 75 suivi de 7 chiffres
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
                      Annuler
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
                          <span>Envoi...</span>
                        </>
                      ) : (
                        <>
                          <Send className={styles.icon} />
                          <span>Envoyer</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                // Message de succès
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full mb-4">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`${styles.title} font-bold text-white mb-2`}>
                    Demande envoyée !
                  </h3>
                  <p className={`${styles.subtitle} text-green-100`}>
                    Vous allez recevoir votre nouveau mot de passe par SMS
                  </p>
                  <p className={`${styles.subtitle} text-green-200/80 mt-2`}>
                    sur le numéro +221 {formData.phoneNumber}
                  </p>
                </motion.div>
              )}

              {/* Note d'information */}
              {!success && (
                <div className="mt-6 p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-green-200/20">
                  <p className={`${styles.subtitle} text-green-200/80 text-center`}>
                    Assurez-vous que le nom de la structure et le numéro de téléphone correspondent à ceux enregistrés lors de votre inscription.
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