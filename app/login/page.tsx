// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LogoFayclick from '@/components/ui/LogoFayclick'
import { ModalPasswordRecovery } from '@/components/auth/ModalPasswordRecovery'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simuler une connexion
    setTimeout(() => {
      setIsLoading(false)
      router.push('/dashboard')
    }, 2000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Champ Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-green-100 mb-2 drop-shadow">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pl-12 border border-green-200/30 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white placeholder-green-100/60"
                    placeholder="votre@email.com"
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-green-200 hover:text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-green-200 hover:text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Options supplémentaires */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    className="h-4 w-4 text-emerald-400 focus:ring-emerald-400 border-green-200/30 rounded bg-white/20"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-green-100">
                    Se souvenir de moi
                  </label>
                </div>

                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => setShowPasswordRecovery(true)}
                    className="font-medium text-green-200 hover:text-green-100 drop-shadow transition-colors"
                  >
                    Mot de passe oublié?
                  </button>
                </div>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            {/* Divider */}
            
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-white/5 backdrop-blur-sm border-t border-green-200/20">
            <p className="text-sm text-center text-green-100">
              Pas encore de compte?{' '}
              <Link href="/register" className="font-medium text-green-200 hover:text-green-100">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-8 text-center">
          <p className="text-xs text-green-200/80">
            En vous connectant, vous acceptez nos{' '}
            <Link href="/terms" className="underline hover:text-green-100">
              Conditions dutilisation
            </Link>{' '}
            et notre{' '}
            <Link href="/privacy" className="underline hover:text-green-100">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>

      {/* Décoration de fond */}
      <div className="fixed top-0 right-0 -z-10 transform rotate-12 -translate-y-12 translate-x-8">
        <div className="w-72 h-72 bg-gradient-to-br from-emerald-400 to-green-500 opacity-30 rounded-full blur-3xl"></div>
      </div>
      <div className="fixed bottom-0 left-0 -z-10 transform -rotate-12 translate-y-12 -translate-x-8">
        <div className="w-96 h-96 bg-gradient-to-tr from-green-400 to-emerald-500 opacity-30 rounded-full blur-3xl"></div>
      </div>

      {/* Modal de récupération de mot de passe */}
      <ModalPasswordRecovery 
        isOpen={showPasswordRecovery} 
        onClose={() => setShowPasswordRecovery(false)} 
      />
    </div>
  )
}
