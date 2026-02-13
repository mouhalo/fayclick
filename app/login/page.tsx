// app/login/page.tsx - Version hybride : Authentification réelle + Design glassmorphisme
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import LogoFayclick from '@/components/ui/LogoFayclick'
import { ModalPasswordRecovery } from '@/components/auth/ModalPasswordRecovery'
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

  // États PIN
  const [loginMode, setLoginMode] = useState<'credentials' | 'pin'>('credentials')
  const [hasPinConfigured, setHasPinConfigured] = useState(false)
  const [pinError, setPinError] = useState('')

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
          if (pinData.lastMode === 'pin') {
            setLoginMode('pin')
          }
        }
      } catch { /* PIN invalide, on ignore */ }
    }
  }, [isAuthenticated, user, router])

  // Effacer les erreurs au changement de formulaire
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => clearError(), 100)
      return () => clearTimeout(timer)
    }
  }, [formData.email, formData.password, authError, clearError])

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

      // Utiliser le login du contexte AuthContext avec la logique restaurée
      await authLogin({
        login: formData.email.toLowerCase().trim(),
        pwd: formData.password
      })

      console.log('✅ [LOGIN PAGE] Connexion réussie - redirection automatique via AuthContext')
      // Mettre à jour lastMode si PIN configuré
      const raw = localStorage.getItem('fayclick_quick_pin')
      if (raw) {
        try {
          const pinData = JSON.parse(atob(raw))
          const updated = JSON.stringify({ ...pinData, lastMode: 'credentials' })
          localStorage.setItem('fayclick_quick_pin', btoa(updated))
        } catch { /* ignore */ }
      }
      // La redirection est gérée automatiquement par AuthContext après connexion réussie

    } catch (error) {
      console.error('❌ [LOGIN PAGE] Erreur lors de la connexion:', error)
      // L'erreur est gérée automatiquement par le AuthContext et disponible via authError
    } finally {
      setIsLoading(false)
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
      clearError()
      await authLogin({ login: pinData.login, pwd: pinData.pwd })
    } catch {
      setPinError('Erreur de connexion')
    } finally {
      setIsLoading(false)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900">
        <div className="text-white text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 p-3 sm:p-4">
      {/* Container principal */}
      <div className="w-full max-w-sm">
        {/* Logo et titre compacts */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoFayclick className="w-16 h-16 sm:w-20 sm:h-20" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">FayClick</h1>
          <p className="text-green-100 text-sm sm:text-base mt-1 drop-shadow">Gestion simplifiée de votre business</p>
        </div>

        {/* Carte de connexion avec effet glassmorphisme vert + Flip 3D */}
        <div className="bg-gradient-to-br from-green-400/10 via-emerald-400/15 to-teal-400/10 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden border border-green-200/30">
          <div className="p-5 sm:p-6">
            {/* Conteneur Flip 3D */}
            <div style={{ perspective: '1000px' }}>
              <div style={{
                transformStyle: 'preserve-3d',
                transform: loginMode === 'pin' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.6s ease-in-out',
                display: 'grid'
              }}>
                {/* ===== FACE AVANT : Formulaire Login/Password ===== */}
                <div style={{ backfaceVisibility: 'hidden', gridArea: '1 / 1' }}>
                  <h2 className="text-xl font-semibold text-white mb-4 drop-shadow">Connexion</h2>

                  {/* Affichage des erreurs */}
                  {authError && (
                    <div className="mb-3 p-2.5 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
                      <p className="text-red-200 text-sm">{authError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Champ Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-green-100 mb-1.5 drop-shadow">
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
                          className="w-full px-3 py-2.5 pl-10 border border-green-200/30 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white placeholder-green-100/60 text-sm"
                          placeholder="votre@email.com ou login"
                        />
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Champ Mot de passe */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-green-100 mb-1.5 drop-shadow">
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
                          className="w-full px-3 py-2.5 pl-10 pr-10 border border-green-200/30 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white placeholder-green-100/60 text-sm"
                          placeholder="••••••••"
                        />
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-2.5 flex items-center hover:bg-white/10 rounded-r-lg transition-colors"
                        >
                          <svg className="h-4 w-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-green-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm"
                    >
                      {(isLoading || authLoading) ? (
                        <div className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connexion...
                        </div>
                      ) : (
                        'Se connecter'
                      )}
                    </button>

                    {/* Bouton PIN (si configuré) */}
                    {hasPinConfigured && (
                      <button
                        type="button"
                        onClick={() => toggleLoginMode('pin')}
                        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-green-200 hover:text-white border border-green-300/30 hover:border-green-200/50 rounded-lg transition-all duration-200 hover:bg-white/10"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Connexion par PIN
                      </button>
                    )}

                    {/* Lien mot de passe oublié */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPasswordRecovery(true)}
                        className="text-green-200 hover:text-white text-sm underline transition-colors"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </form>

                  {/* Liens supplémentaires */}
                  <div className="mt-4 text-center space-y-2">
                    <p className="text-green-100 text-sm">
                      Pas encore de compte ?{' '}
                      <Link href="/register" className="text-green-200 hover:text-white underline transition-colors">
                        Inscrivez-vous
                      </Link>
                    </p>
                    <Link href="/" className="inline-block text-green-200 hover:text-white text-sm underline transition-colors">
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
                  flexDirection: 'column'
                }}>
                  {/* Header - Collé en haut */}
                  <h2 className="text-xl font-semibold text-white mb-1 drop-shadow">Connexion rapide</h2>
                  <p className="text-green-100/80 text-sm">Saisissez votre code PIN</p>

                  {/* Zone centrale - PIN centré verticalement et horizontalement */}
                  <div className="flex-1 flex flex-col items-center justify-center py-6">
                    {/* Erreur auth (serveur) */}
                    {authError && !pinError && (
                      <div className="mb-4 p-2.5 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm w-full">
                        <p className="text-red-200 text-sm text-center">{authError}</p>
                      </div>
                    )}

                    {/* Icone cadenas */}
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-green-200/30 flex items-center justify-center mb-5">
                      <svg className="w-7 h-7 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>

                    {/* OTP Input pour PIN */}
                    <OTPInput
                      length={4}
                      onComplete={handlePinLogin}
                      disabled={isLoading || authLoading}
                      error={pinError}
                      helperText=""
                    />

                    {/* Message d'aide pour créer un PIN */}
                    <div className="mt-4 flex items-start gap-2 px-2 py-2 bg-white/5 border border-green-300/20 rounded-lg max-w-xs">
                      <svg className="w-4 h-4 text-green-300/70 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-green-200/70 text-xs leading-relaxed">
                        Pour créer ou modifier votre PIN, connectez-vous puis allez dans <span className="text-green-100 font-medium">Menu → Mon Profil → Code PIN rapide</span>
                      </p>
                    </div>

                    {/* Loading */}
                    {(isLoading || authLoading) && (
                      <div className="flex items-center justify-center gap-2 mt-4 text-green-200">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Connexion en cours...</span>
                      </div>
                    )}
                  </div>

                  {/* Footer - Collé en bas */}
                  <div className="space-y-3">
                    {/* Bouton retour connexion classique */}
                    <button
                      type="button"
                      onClick={() => toggleLoginMode('credentials')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-green-200 hover:text-white border border-green-300/30 hover:border-green-200/50 rounded-lg transition-all duration-200 hover:bg-white/10"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                      </svg>
                      Connexion classique
                    </button>

                    {/* Liens */}
                    <div className="text-center space-y-2">
                      <p className="text-green-100 text-sm">
                        Pas encore de compte ?{' '}
                        <Link href="/register" className="text-green-200 hover:text-white underline transition-colors">
                          Inscrivez-vous
                        </Link>
                      </p>
                      <Link href="/" className="inline-block text-green-200 hover:text-white text-sm underline transition-colors">
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

      {/* Modal récupération mot de passe */}
      <ModalPasswordRecovery
        isOpen={showPasswordRecovery}
        onClose={() => setShowPasswordRecovery(false)}
      />

      {/* Bouton WhatsApp flottant */}
      <FloatingWhatsAppButton />
    </div>
  )
}