// app/login/page.tsx - Version hybride : Authentification réelle + Design glassmorphisme
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import LogoFayclick from '@/components/ui/LogoFayclick'
import { ModalPasswordRecovery } from '@/components/auth/ModalPasswordRecovery'
import { ModalRecoveryOTP } from '@/components/auth/ModalRecoveryOTP'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'
import OTPInput from '@/components/coffre-fort/OTPInput'

const FloatingWhatsAppButton = dynamic(() => import('@/components/ui/FloatingWhatsAppButton'), {
  ssr: false
})

export default function LoginPage() {
  const router = useRouter()
  const { login: authLogin, isAuthenticated, isLoading: authLoading, error: authError, clearError, user } = useAuth()
  const [isLoaded, setIsLoaded] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false)
  const [showRecoveryOTP, setShowRecoveryOTP] = useState(false)

  // États PIN
  const [loginMode, setLoginMode] = useState<'credentials' | 'pin'>('credentials')
  const [hasPinConfigured, setHasPinConfigured] = useState(false)
  const [pinError, setPinError] = useState('')
  const [pinLength, setPinLength] = useState(5)
  const [loginStep, setLoginStep] = useState('')

  useEffect(() => {
    setIsLoaded(true)

    // Vérifier si on doit forcer la déconnexion (par exemple après une erreur 401)
    const urlParams = new URLSearchParams(window.location.search)
    const forceLogout = urlParams.get('logout') === 'true'

    if (forceLogout) {
      console.log('🔓 [LOGIN PAGE] Déconnexion forcée détectée')
      // Nettoyer la session
      authService.clearSession()
      // Retirer le paramètre de l'URL
      window.history.replaceState({}, document.title, '/login')
      return
    }

    // Vérifier si déjà connecté SEULEMENT si pas de logout forcé
    if (isAuthenticated && user) {
      console.log('🔄 [LOGIN PAGE] Utilisateur déjà connecté, redirection...', user.login)
      // La redirection automatique est gérée par AuthContext
    }

    // Détecter si un PIN est configuré et restaurer le dernier mode
    const raw = localStorage.getItem('fayclick_quick_pin')
    if (raw) {
      try {
        const pinData = JSON.parse(atob(raw))
        if (pinData?.pin) {
          setHasPinConfigured(true)
          // Détecter la longueur du PIN stocké (4 ancien, 5 nouveau/OTP)
          setPinLength(pinData.pin.length || 5)

          // Support du paramètre mode=pin (ex: après inscription avec OTP)
          const modeParam = urlParams.get('mode')
          if (modeParam === 'pin' || pinData.lastMode === 'pin') {
            setLoginMode('pin')
          }
        }
      } catch { /* PIN invalide, on ignore */ }
    } else {
      // Pas de PIN mais mode=pin demandé ? On reste en credentials
      // (cas rare: URL manuelle sans PIN configuré)
    }
  }, [isAuthenticated, user, router])

  // Effacer les erreurs au changement de formulaire
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => clearError(), 100)
      return () => clearTimeout(timer)
    }
  }, [formData.email, formData.password, authError, clearError])

  // Progression automatique du texte de chargement
  useEffect(() => {
    if (!isLoading && !authLoading) return
    const steps = [
      'Vérification des identifiants',
      'Chargement de votre structure',
      'Préparation du tableau de bord',
    ]
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i < steps.length) {
        setLoginStep(steps[i])
      }
    }, 1200)
    return () => clearInterval(interval)
  }, [isLoading, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    clearError()
    
    console.log('🔐 [LOGIN PAGE] Soumission du formulaire de connexion')
    console.log('📊 [LOGIN PAGE] Données du formulaire:', {
      email: formData.email,
      passwordLength: formData.password.length,
      timestamp: new Date().toISOString()
    })

    try {
      // Validation basique
      if (!formData.email || !formData.password) {
        throw new Error('Veuillez remplir tous les champs')
      }

      setLoginStep('Vérification des identifiants')

      // Utiliser le login du contexte AuthContext avec la logique restaurée
      await authLogin({
        login: formData.email.toLowerCase().trim(),
        pwd: formData.password
      })

      setLoginStep('Redirection')
      // Mettre à jour lastMode si PIN configuré
      const raw = localStorage.getItem('fayclick_quick_pin')
      if (raw) {
        try {
          const pinData = JSON.parse(atob(raw))
          const updated = JSON.stringify({ ...pinData, lastMode: 'credentials' })
          localStorage.setItem('fayclick_quick_pin', btoa(updated))
        } catch { /* ignore */ }
      }

    } catch (error) {
      console.error('❌ [LOGIN PAGE] Erreur lors de la connexion:', error)
    } finally {
      setIsLoading(false)
      setLoginStep('')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // Effacer l'erreur quand l'utilisateur tape
    if (authError) clearError()
  }

  // Connexion par PIN
  const handlePinLogin = useCallback(async (pin: string) => {
    setPinError('')
    const raw = localStorage.getItem('fayclick_quick_pin')
    if (!raw) {
      setPinError('Aucun PIN configuré')
      return
    }

    try {
      const pinData = JSON.parse(atob(raw))
      if (pin !== pinData.pin) {
        setPinError('Code PIN incorrect')
        return
      }

      // PIN correct : mettre à jour lastMode et lancer la connexion
      const updated = JSON.stringify({ ...pinData, lastMode: 'pin' })
      localStorage.setItem('fayclick_quick_pin', btoa(updated))

      setIsLoading(true)
      setLoginStep('Vérification des identifiants')
      clearError()
      await authLogin({ login: pinData.login, pwd: pinData.pwd })
      setLoginStep('Redirection')
    } catch {
      setPinError('Erreur de connexion')
    } finally {
      setIsLoading(false)
      setLoginStep('')
    }
  }, [authLogin, clearError])

  // Basculer entre les modes et sauver la préférence
  const toggleLoginMode = useCallback((mode: 'credentials' | 'pin') => {
    setLoginMode(mode)
    setPinError('')
    if (authError) clearError()
  }, [authError, clearError])

  // Affichage du loading pendant l'hydratation
  if (!isLoaded) {
    return (
      <div className="reg_page flex items-center justify-center">
        <div className="text-white/60 text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="reg_page flex items-center justify-center p-3 sm:p-4">
      {/* Orbes flottantes décoratives */}
      <div className="reg_orb" style={{ width: 320, height: 320, background: 'rgba(16,185,129,0.15)', top: '-8%', left: '-12%', animationDelay: '0s' }} />
      <div className="reg_orb" style={{ width: 260, height: 260, background: 'rgba(20,184,166,0.12)', bottom: '-6%', right: '-10%', animationDelay: '7s' }} />
      <div className="reg_orb" style={{ width: 180, height: 180, background: 'rgba(245,158,11,0.07)', top: '35%', right: '3%', animationDelay: '14s' }} />

      {/* Container principal */}
      <div className="w-full max-w-sm relative z-10">
        {/* Logo et titre */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoFayclick className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">FayClick</h1>
          <p className="text-emerald-200/60 text-sm mt-1">Gestion simplifiée de votre business</p>
        </div>

        {/* Glass Card premium */}
        <div className="login_glass-card">
          <div className="relative z-10 p-5 sm:p-6">
            {/* Conteneur Flip 3D */}
            <div style={{ perspective: '1000px' }}>
              <div style={{
                transformStyle: 'preserve-3d',
                transform: loginMode === 'pin' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.6s ease-in-out',
                display: 'grid'
              }}>
                {/* ===== FACE AVANT : Formulaire Login/Password ===== */}
                <div style={{ backfaceVisibility: 'hidden', gridArea: '1 / 1', position: 'relative' }}>
                  {/* Bouton # coin supérieur droit → bascule vers PIN (toujours visible) */}
                  <button
                    type="button"
                    onClick={() => toggleLoginMode('pin')}
                    className="login_icon-btn-pulse"
                    title="Connexion par PIN"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="9" x2="20" y2="9" />
                      <line x1="4" y1="15" x2="20" y2="15" />
                      <line x1="10" y1="3" x2="8" y2="21" />
                      <line x1="16" y1="3" x2="14" y2="21" />
                    </svg>
                  </button>
                  <h2 className="text-xl font-semibold text-white mb-4">Connexion</h2>

                  {/* Affichage des erreurs */}
                  {authError && (
                    <div className="mb-3 p-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <p className="text-red-200 text-sm">{authError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Champ Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-emerald-100/80 mb-1.5">
                        Email / Login
                      </label>
                      <div className="relative">
                        <input
                          id="email"
                          name="email"
                          type="text"
                          autoComplete="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="login_glass-input"
                          style={{ paddingLeft: '2.5rem' }}
                          placeholder="votre@email.com ou login"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-emerald-300/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Champ Mot de passe */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-emerald-100/80 mb-1.5">
                        Mot de passe
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="login_glass-input"
                          style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                          placeholder="••••••••"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-emerald-300/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center transition-colors"
                        >
                          <svg className="h-4 w-4 text-emerald-300/50 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showPassword ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Bouton de connexion */}
                    <button
                      type="submit"
                      disabled={isLoading || authLoading}
                      className="login_btn-primary"
                    >
                      {(isLoading || authLoading) ? 'Connexion...' : 'Se connecter'}
                    </button>

                    {/* Lien mot de passe oublié */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setShowPasswordRecovery(true)}
                        className="text-emerald-200/60 hover:text-white text-sm underline transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </form>

                  {/* Liens supplémentaires */}
                  <div className="mt-4 text-center space-y-2">
                    <p className="text-emerald-100/50 text-sm">
                      Pas encore de compte ?{' '}
                      <Link href="/register" className="text-emerald-200 hover:text-white underline transition-colors">
                        Inscrivez-vous
                      </Link>
                    </p>
                    <Link href="/" className="inline-block text-emerald-200/50 hover:text-white text-sm underline transition-colors">
                      ← Retour vers Accueil
                    </Link>
                  </div>
                </div>

                {/* ===== FACE ARRIERE : Formulaire PIN ===== */}
                <div style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  gridArea: '1 / 1',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}>
                  {/* Bouton @ coin supérieur droit → bascule vers classique */}
                  <button
                    type="button"
                    onClick={() => toggleLoginMode('credentials')}
                    className="login_icon-btn-pulse"
                    title="Connexion classique"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </button>
                  {/* Header */}
                  <h2 className="text-xl font-semibold text-white mb-1">Connexion rapide</h2>
                  <p className="text-emerald-200/60 text-sm">Saisissez votre code à {pinLength} chiffres</p>

                  {/* Zone centrale - PIN centré */}
                  <div className="flex-1 flex flex-col items-center justify-center py-6">
                    {/* Erreur auth (serveur) */}
                    {authError && !pinError && (
                      <div className="mb-4 p-2.5 rounded-xl w-full" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                        <p className="text-red-200 text-sm text-center">{authError}</p>
                      </div>
                    )}

                    {/* Icone cadenas glass */}
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)' }}>
                      <svg className="w-7 h-7 text-emerald-300/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>

                    {/* OTP Input pour PIN */}
                    <OTPInput
                      length={pinLength}
                      onComplete={handlePinLogin}
                      disabled={isLoading || authLoading}
                      error={pinError}
                      helperText=""
                    />

                    {/* Message d'aide */}
                    <div className="mt-4 flex items-start gap-2 px-2 py-2 rounded-lg max-w-xs"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <svg className="w-4 h-4 text-emerald-300/50 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-emerald-200/50 text-xs leading-relaxed">
                        Pour créer ou modifier votre PIN, connectez-vous puis allez dans <span className="text-emerald-100/80 font-medium">Menu → Mon Profil → Code PIN rapide</span>
                      </p>
                    </div>

                    {/* Lien "Code perdu ?" */}
                    <button
                      type="button"
                      onClick={() => setShowRecoveryOTP(true)}
                      className="mt-3 text-orange-300/80 hover:text-orange-200 text-sm underline transition-colors"
                    >
                      Code perdu ?
                    </button>
                  </div>

                  {/* Footer - Liens */}
                  <div className="space-y-3">
                    <div className="text-center space-y-2">
                      <p className="text-emerald-100/50 text-sm">
                        Pas encore de compte ?{' '}
                        <Link href="/register" className="text-emerald-200 hover:text-white underline transition-colors">
                          Inscrivez-vous
                        </Link>
                      </p>
                      <Link href="/" className="inline-block text-emerald-200/50 hover:text-white text-sm underline transition-colors">
                        ← Retour vers Accueil
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Glassmorphism de chargement */}
      {(isLoading || authLoading) && (
        <div className="login_backdrop">
          <div className="login_modal">
            {/* Particules décoratives */}
            <div className="login_particle" style={{ width: 6, height: 6, background: '#10b981', top: '15%', left: '12%', animationDelay: '0s' }} />
            <div className="login_particle" style={{ width: 4, height: 4, background: '#f59e0b', top: '20%', right: '15%', animationDelay: '0.8s' }} />
            <div className="login_particle" style={{ width: 5, height: 5, background: '#14b8a6', bottom: '25%', left: '18%', animationDelay: '1.6s' }} />
            <div className="login_particle" style={{ width: 3, height: 3, background: '#34d399', bottom: '30%', right: '12%', animationDelay: '0.4s' }} />
            <div className="login_particle" style={{ width: 4, height: 4, background: '#fbbf24', top: '50%', left: '8%', animationDelay: '1.2s' }} />

            {/* Anneaux animés */}
            <div className="login_rings">
              <div className="login_halo" />
              <div className="login_ring-outer" />
              <div className="login_ring-middle" />
              <div className="login_ring-inner" />
              <div className="login_ring-center">
                <LogoFayclick className="w-10 h-10" />
              </div>
            </div>

            {/* Texte */}
            <div className="text-center relative z-10">
              <p className="text-white text-base font-bold mb-1">Connexion en cours</p>
              <p className="text-green-200/70 text-sm login_step-text">
                {loginStep || 'Initialisation'}
              </p>
            </div>

            {/* Barre de progression */}
            <div className="login_progress-track relative z-10">
              <div
                className="login_progress-fill"
                style={{
                  width: loginStep.includes('tableau') ? '90%'
                    : loginStep.includes('structure') ? '60%'
                    : loginStep.includes('identifiants') ? '30%'
                    : '10%'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal récupération mot de passe */}
      <ModalPasswordRecovery
        isOpen={showPasswordRecovery}
        onClose={() => setShowPasswordRecovery(false)}
      />

      {/* Modal récupération code OTP */}
      <ModalRecoveryOTP
        isOpen={showRecoveryOTP}
        onClose={() => setShowRecoveryOTP(false)}
        onSuccess={() => {
          setShowRecoveryOTP(false);
          setPinError('');
          // Recharger la config PIN depuis localStorage
          const raw = localStorage.getItem('fayclick_quick_pin');
          if (raw) {
            try {
              const pinData = JSON.parse(atob(raw));
              if (pinData?.pin) {
                setHasPinConfigured(true);
                setPinLength(pinData.pin.length || 5);
                setLoginMode('pin');
              }
            } catch { /* ignore */ }
          }
        }}
      />

      {/* Bouton WhatsApp flottant */}
      <FloatingWhatsAppButton />
    </div>
  )
}