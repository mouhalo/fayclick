'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SplashScreenProps {
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ isVisible, onAnimationComplete }: SplashScreenProps) {
  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
          }}
        >
          {/* Cercles décoratifs animés en arrière-plan */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2, opacity: 0.05 }}
              transition={{ duration: 2, ease: 'easeOut', delay: 0.3 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white"
            />
          </div>

          {/* Particules flottantes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  y: '100vh',
                  x: `${15 + i * 15}vw`,
                  opacity: 0
                }}
                animate={{
                  y: '-10vh',
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeOut',
                }}
                className="absolute w-2 h-2 bg-white/40 rounded-full"
              />
            ))}
          </div>

          {/* Contenu principal */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Mascotte animée dans un cercle */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="relative"
            >
              {/* Halo lumineux derrière le cercle */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.05, 1] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full blur-2xl"
                style={{
                  width: '120%',
                  height: '120%',
                  top: '-10%',
                  left: '-10%',
                  background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)'
                }}
              />

              {/* Cercle conteneur avec bordure dorée */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative w-[280px] h-[280px] rounded-full overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, #ffffff 0%, #f0f9ff 50%, #e0f2fe 100%)',
                  boxShadow: `
                    0 0 0 4px rgba(251, 191, 36, 0.8),
                    0 0 0 8px rgba(251, 191, 36, 0.3),
                    0 20px 60px rgba(0, 0, 0, 0.3),
                    inset 0 -10px 30px rgba(0, 0, 0, 0.1)
                  `
                }}
              >
                {/* Reflet sur le cercle */}
                <div
                  className="absolute top-0 left-0 w-full h-1/2 rounded-t-full opacity-40"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.8) 0%, transparent 100%)'
                  }}
                />

                {/* Image de la mascotte centrée dans le cercle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="/images/Mascotte_Animate_VF.webp"
                    alt="FayClick Mascotte"
                    width={260}
                    height={260}
                    priority
                    className="object-contain"
                    style={{
                      marginTop: '-10px'
                    }}
                  />
                </div>
              </motion.div>

              {/* Anneau doré animé autour du cercle */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-0 w-[280px] h-[280px] rounded-full"
                style={{
                  border: '2px dashed rgba(251, 191, 36, 0.4)',
                  transform: 'scale(1.15)'
                }}
              />
            </motion.div>

            {/* Slogan */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-4 text-white/90 text-lg font-medium tracking-wide"
            >
              Votre Super App au Sénégal
            </motion.p>

            {/* Indicateur de chargement */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.3 }}
              className="mt-8 flex items-center gap-2"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                  className="w-2.5 h-2.5 bg-white rounded-full"
                />
              ))}
            </motion.div>

            {/* Texte de chargement */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.3 }}
              className="mt-3 text-white/70 text-sm"
            >
              Chargement...
            </motion.p>
          </div>

          {/* Version en bas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-8 text-white/50 text-xs"
          >
            Version 2.5.0
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
