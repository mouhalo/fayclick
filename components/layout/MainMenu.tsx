'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { ModalDeconnexion } from '@/components/auth/ModalDeconnexion';
import { type UserCredentialsResult } from '@/types';
import DatabaseService from '@/services/database.service';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, LockOpen, User, Phone, Shield, Check, X, Eye, EyeOff } from 'lucide-react';
import PopMessage from '@/components/ui/PopMessage';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  businessName?: string;
}

export default function MainMenu({ isOpen, onClose, userName, businessName }: MenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleProfile = () => {
    setShowProfileModal(true);
    onClose();
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    onClose();
    authService.logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Menu Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50"
          >
            {/* Header du menu */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Menu Principal</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Info utilisateur */}
              <div className="space-y-1">
                <p className="text-sm opacity-90">Connecté en tant que</p>
                <p className="font-semibold">{userName || 'Utilisateur'}</p>
                <p className="text-sm opacity-80">{businessName || 'Structure'}</p>
              </div>
            </div>

            {/* Options du menu */}
            <div className="p-4">
              <nav className="space-y-2">
                <button
                  onClick={handleProfile}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-2xl">👤</span>
                  <span className="font-medium">Mon Profil</span>
                </button>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-2xl">🏠</span>
                  <span className="font-medium">Tableau de bord</span>
                </button>

                <button
                  onClick={() => router.push('/settings')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-2xl">⚙️</span>
                  <span className="font-medium">Paramètres</span>
                </button>

                <hr className="my-4" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 transition-colors text-left"
                >
                  <span className="text-2xl">🚪</span>
                  <span className="font-medium">Déconnexion</span>
                </button>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Profil */}
      {showProfileModal && (
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={authService.getUser() as UserCredentialsResult}
        />
      )}

      {/* Modal de déconnexion */}
      <ModalDeconnexion
        isOpen={showLogoutModal}
        onClose={handleCancelLogout}
        onConfirm={handleConfirmLogout}
        userName={userName}
      />
    </>
  );
}

// Modal de profil
interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserCredentialsResult | null;
}

function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    telephone: user?.telephone || '',
    login: user?.login || '',
    nom_profil: user?.nom_profil || '',
    actif: user?.actif || false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // État pour PopMessage
  const [popMessage, setPopMessage] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  // Fonction helper pour afficher les messages
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Utilisation de la méthode dédiée du DatabaseService
      await DatabaseService.updateUser({
        id_structure: user.id_structure,
        id_profil: user.id_profil,
        username: formData.username,
        telephone: formData.telephone,
        id_utilisateur: user.id
      });
      
      // Mettre à jour le contexte
      updateUser({
        username: formData.username,
        telephone: formData.telephone
      } as any);
      
      // Afficher le message de succès avec PopMessage
      showMessage('success', 'Vos informations ont été mises à jour avec succès', 'Profil sauvegardé');
      
      // Fermer le modal après un délai
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('❌ [PROFILE] Erreur mise à jour:', error);
      showMessage('error', error.message || 'Impossible de mettre à jour le profil', 'Erreur de sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
            >
              {/* Header du modal */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }} />
                </div>
                
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold mb-1">Mon Profil</h3>
                    <p className="text-sm opacity-90">Gérez vos informations personnelles</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body du modal */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Nom d'utilisateur */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Nom d'utilisateur"
                    />
                  </div>

                  {/* Profil */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-500" />
                      Profil
                    </label>
                    <input
                      type="text"
                      value={formData.nom_profil}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                      disabled
                      readOnly
                    />
                  </div>

                  {/* Login */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Login
                    </label>
                    <input
                      type="text"
                      value={formData.login}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
                      disabled
                      readOnly
                    />
                  </div>

                  {/* Mot de passe */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-500" />
                        Mot de passe
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPasswordModal(true)}
                        className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm"
                      >
                        <LockOpen className="w-4 h-4" />
                        Modifier
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value="********"
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed pr-10"
                        disabled
                        readOnly
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="Numéro de téléphone"
                    />
                  </div>

                  {/* Statut actif */}
                  <div className="flex items-center justify-between py-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Check className="w-4 h-4 text-gray-500" />
                      Compte actif
                    </label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="actif"
                        checked={formData.actif}
                        onChange={handleChange}
                        className="sr-only"
                        disabled
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${
                        formData.actif ? 'bg-green-500' : 'bg-gray-300'
                      }`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                          formData.actif ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enregistrement...
                      </span>
                    ) : (
                      'Enregistrer'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de changement de mot de passe */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        userId={user?.id || 0}
        onSuccess={() => {
          setShowPasswordModal(false);
          showMessage('success', 'Votre mot de passe a été modifié avec succès', 'Sécurité mise à jour');
        }}
      />

      {/* PopMessage pour les notifications */}
      <PopMessage
        show={popMessage.show}
        type={popMessage.type}
        title={popMessage.title}
        message={popMessage.message}
        onClose={() => setPopMessage({ ...popMessage, show: false })}
      />
    </>
  );
}

// Modal de changement de mot de passe
interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess?: () => void;
}

function PasswordChangeModal({ isOpen, onClose, userId, onSuccess }: PasswordChangeModalProps) {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // État pour PopMessage
  const [popMessage, setPopMessage] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    message: ''
  });

  // Fonction helper pour afficher les messages
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', message: string, title?: string) => {
    setPopMessage({ show: true, type, title, message });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      showMessage('warning', 'Les mots de passe ne correspondent pas', 'Erreur de validation');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      showMessage('warning', 'Le nouveau mot de passe doit contenir au moins 6 caractères', 'Mot de passe trop court');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Utilisation de la méthode dédiée du DatabaseService
      const success = await DatabaseService.changeUserPassword(
        userId,
        formData.oldPassword,
        formData.newPassword
      );
      
      if (success) {
        onSuccess?.();
        onClose();
      } else {
        showMessage('error', 'Le mot de passe actuel est incorrect', 'Erreur d\'authentification');
      }
    } catch (error: any) {
      console.error('❌ [PASSWORD] Erreur changement de mot de passe:', error);
      showMessage('error', error.message || 'Impossible de changer le mot de passe', 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LockOpen className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Changer le mot de passe</h3>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="p-5">
              <div className="space-y-4">
                {/* Ancien mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe actuel
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      name="oldPassword"
                      value={formData.oldPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                      required
                      placeholder="Entrez votre mot de passe actuel"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Nouveau mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                      required
                      placeholder="Minimum 6 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmer le mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
                      required
                      placeholder="Confirmez le nouveau mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Changement...
                    </span>
                  ) : (
                    'Changer le mot de passe'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* PopMessage pour les notifications */}
      <PopMessage
        show={popMessage.show}
        type={popMessage.type}
        title={popMessage.title}
        message={popMessage.message}
        onClose={() => setPopMessage({ ...popMessage, show: false })}
      />
    </>
  );
}
