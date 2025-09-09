// app/login/page.tsx - Version hybride : Authentification réelle + Design glassmorphisme
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LogoFayclick from '@/components/ui/LogoFayclick'
import { ModalPasswordRecovery } from '@/components/auth/ModalPasswordRecovery'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth.service'

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

  // Affichage du loading pendant l'hydratation
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900">
        <div className="text-white text-lg">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 p-4">
      {/* Container principal */}
      <div className="w-full max-w-md">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <LogoFayclick className="w-24 h-24" />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">FayClick</h1>
          <p className="text-green-100 text-lg mt-2 drop-shadow">Gestion simplifiée de votre business</p>
        </div>

        {/* Carte de connexion avec effet glassmorphisme vert */}
        <div className="bg-gradient-to-br from-green-400/10 via-emerald-400/15 to-teal-400/10 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-green-200/30">
          <div className="p-8">
            <h2 className="text-2xl font-semibold text-white mb-6 drop-shadow">Connexion</h2>
            
            {/* Affichage des erreurs */}
            {authError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
                <p className="text-red-200 text-sm">{authError}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Champ Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-green-100 mb-2 drop-shadow">
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
                    className="w-full px-4 py-3 pl-12 border border-green-200/30 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white placeholder-green-100/60"
                    placeholder="votre@email.com ou login"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-green-100 mb-2 drop-shadow">
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
                    className="w-full px-4 py-3 pl-12 pr-12 border border-green-200/30 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white placeholder-green-100/60"
                    placeholder="••••••••"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-white/10 rounded-r-xl transition-colors"
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
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-green-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 backdrop-blur-sm"
              >
                {(isLoading || authLoading) ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </button>

              {/* Lien mot de passe oublié */}
              <div className="text-center">
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
            <div className="mt-6 text-center">
              <p className="text-green-100 text-sm">
                Pas encore de compte ?{' '}
                <Link href="/register" className="text-green-200 hover:text-white underline transition-colors">
                  Inscrivez-vous
                </Link>
              </p>
              <Link href="/" className="inline-block mt-3 text-green-200 hover:text-white text-sm underline transition-colors">
                ← Retour à l'accueil
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal récupération mot de passe */}
      <ModalPasswordRecovery 
        isOpen={showPasswordRecovery}
        onClose={() => setShowPasswordRecovery(false)}
      />
    </div>
  )
}