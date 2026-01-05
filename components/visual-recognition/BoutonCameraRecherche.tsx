/**
 * BoutonCameraRecherche
 * Bouton compact pour lancer la reconnaissance visuelle de produit
 * FayClick V2 - Commerce
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles } from 'lucide-react';
import { ModalCapturePhoto } from './ModalCapturePhoto';
import { VisualMatch } from '@/services/visual-recognition';

interface BoutonCameraRechercheProps {
  idStructure: number;
  onProductFound?: (match: VisualMatch) => void;
  onProductNotFound?: () => void;
  className?: string;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button';
}

export function BoutonCameraRecherche({
  idStructure,
  onProductFound,
  onProductNotFound,
  className = '',
  showBadge = true,
  size = 'md',
  variant = 'icon'
}: BoutonCameraRechercheProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRecognized = (match: VisualMatch | null) => {
    setIsModalOpen(false);

    if (match) {
      onProductFound?.(match);
    } else {
      onProductNotFound?.();
    }
  };

  // Tailles selon size
  const sizes = {
    sm: { button: 'w-8 h-8', icon: 'w-4 h-4', badge: 'w-2 h-2' },
    md: { button: 'w-10 h-10', icon: 'w-5 h-5', badge: 'w-2.5 h-2.5' },
    lg: { button: 'w-12 h-12', icon: 'w-6 h-6', badge: 'w-3 h-3' }
  };

  const currentSize = sizes[size];

  if (variant === 'button') {
    return (
      <>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all ${className}`}
        >
          <Camera className="w-5 h-5" />
          <span className="font-medium">Recherche visuelle</span>
          {showBadge && (
            <Sparkles className="w-4 h-4 text-amber-300" />
          )}
        </motion.button>

        <ModalCapturePhoto
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mode="recognize"
          idStructure={idStructure}
          onRecognized={handleRecognized}
        />
      </>
    );
  }

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className={`${currentSize.button} bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl shadow-md hover:shadow-lg flex items-center justify-center relative transition-all ${className}`}
        title="Recherche visuelle"
      >
        <Camera className={currentSize.icon} />
        {showBadge && (
          <div className={`absolute -top-0.5 -right-0.5 ${currentSize.badge} bg-amber-400 rounded-full`} />
        )}
      </motion.button>

      <ModalCapturePhoto
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode="recognize"
        idStructure={idStructure}
        onRecognized={handleRecognized}
      />
    </>
  );
}

export default BoutonCameraRecherche;
