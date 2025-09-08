'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ReactElement } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import LogoFayclick from '@/components/ui/LogoFayclick';
import { 
  Smartphone, 
  QrCode, 
  CreditCard,  
  BarChart3,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function MobileHome() {
  const { isMobile, isMobileLarge } = useBreakpoint();
  const [particles, setParticles] = useState<ReactElement[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  
  const logoY = useTransform(scrollY, [0, 300], [0, -50]);
  const featuresY = useTransform(scrollY, [0, 300], [0, -100]);

  // Gestion du mouvement de la souris pour les effets magnétiques

  useEffect(() => {
    // Génération des particules vertes premium
    const particleCount = isMobile ? 15 : 25;
    const newParticles = Array.from({ length: particleCount }, (_, i) => (
      <motion.div
        key={`particle-${i}`}
        className="absolute rounded-full pointer-events-none"
        initial={{ opacity: 0, y: '100vh' }}
        animate={{
          opacity: [0, 0.8, 0.8, 0],
          y: [100, -100],
          x: Math.random() * 100 - 50,
          scale: [0.5, 1, 0.5],
        }}
        transition={{
          duration: Math.random() * 10 + 8,
          repeat: Infinity,
          delay: Math.random() * 15,
          ease: "easeInOut"
        }}
        style={{
          left: `${Math.random() * 100}%`,
          width: Math.random() * 6 + 2,
          height: Math.random() * 6 + 2,
          background: `radial-gradient(circle, ${
            ['#10b981', '#06b6d4', '#84cc16', '#22c55e'][Math.floor(Math.random() * 4)]
          }66, transparent)`
        }}
      />
    ));
    setParticles(newParticles);
  }, [isMobile]);

  // Styles responsifs
  const getStyles = () => {
    if (isMobile) {
      return {
        logoSize: 'w-28 h-28',
        titleSize: 'text-4xl',
        subtitleSize: 'text-lg',
        containerPadding: 'px-4 py-6'
      };
    } else if (isMobileLarge) {
      return {
        logoSize: 'w-32 h-32',
        titleSize: 'text-5xl',
        subtitleSize: 'text-xl',
        containerPadding: 'px-6 py-8'
      };
    } else {
      return {
        logoSize: 'w-36 h-36',
        titleSize: 'text-6xl',
        subtitleSize: 'text-2xl',
        containerPadding: 'px-8 py-10'
      };
    }
  };

  const styles = getStyles();

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(34, 197, 94, 0.2) 0%, transparent 50%),
          linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #134e4a 100%)
        `
      }}
    >
      {/* Particules d'arrière-plan premium */}
      <div className="absolute inset-0 z-0">
        {particles}
        
        {/* Bulles glassmorphisme flottantes */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`bubble-${i}`}
            className="absolute rounded-full bg-gradient-to-br from-emerald-400/10 via-green-400/20 to-teal-400/10 backdrop-blur-xl border border-green-200/20"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 0.7, 0],
              scale: [0, 1, 0],
              x: Math.sin(i) * 50,
              y: Math.cos(i) * 30
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeInOut"
            }}
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              width: Math.random() * 120 + 80,
              height: Math.random() * 120 + 80,
            }}
          />
        ))}
      </div>

      {/* Contenu principal */}
      <div className={`relative z-10 ${styles.containerPadding} flex flex-col items-center justify-center min-h-screen`}>
        
        {/* Logo animé premium avec effets spectaculaires */}
        <motion.div
          style={{ y: logoY }}
          initial={{ scale: 0, rotate: -360, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ 
            duration: 2.5, 
            type: "spring", 
            bounce: 0.4,
            delay: 0.2
          }}
          whileHover={{ 
            scale: 1.05,
            rotate: [0, 5, -5, 0],
            transition: { duration: 0.8 }
          }}
          className="mb-8 relative group cursor-pointer"
        >
          {/* Effet d'aura autour du logo */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />
          
          {/* Logo principal */}
          <div className={`${styles.logoSize} relative z-10 drop-shadow-2xl`}>
            <LogoFayclick className={`${styles.logoSize} filter drop-shadow-lg`} />
          </div>

          {/* Particules d'étincelles autour du logo */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`spark-${i}`}
              className="absolute w-1 h-1 bg-emerald-400 rounded-full"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                x: Math.cos((i * 60) * Math.PI / 180) * 60,
                y: Math.sin((i * 60) * Math.PI / 180) * 60,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>

        {/* Titre principal avec effet néon */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1.2, type: "spring" }}
          className="text-center mb-4"
        >
          <motion.h1
            className={`${styles.titleSize} font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-200 to-teal-300 mb-2`}
            style={{
              textShadow: '0 0 30px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.3)',
              filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))'
            }}
            animate={{
              textShadow: [
                '0 0 30px rgba(16, 185, 129, 0.5)',
                '0 0 50px rgba(16, 185, 129, 0.8)',
                '0 0 30px rgba(16, 185, 129, 0.5)'
              ]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {"FayClick".split("").map((char, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.8 + index * 0.1,
                  duration: 0.6,
                  type: "spring" 
                }}
                whileHover={{ 
                  scale: 1.2,
                  color: "#10b981",
                  transition: { duration: 0.2 }
                }}
                className="inline-block cursor-pointer"
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>
        </motion.div>

        {/* Sous-titre avec gradient animé */}
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className={`${styles.subtitleSize} font-bold text-center mb-2`}
          style={{
            background: 'linear-gradient(45deg, #a7f3d0, #6ee7b7, #34d399)',
            backgroundSize: '200% 200%',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}
        >
          <motion.span
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'linear-gradient(45deg, #a7f3d0, #6ee7b7, #34d399)',
              backgroundSize: '200% 200%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
            }}
          >
            Commerce Digital Sénégal
          </motion.span>
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="text-base text-emerald-100/90 mb-12 text-center max-w-sm leading-relaxed font-medium"
        >
          Révolutionnez votre business avec une plateforme tout-en-un 
          <span className="text-emerald-300 font-semibold"> ultra-moderne</span>
        </motion.p>

        {/* Boutons glassmorphisme premium */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          className="w-full max-w-sm space-y-4 mb-16"
        >
          {/* Bouton Créer un Compte - Premium Glass */}
          <Link href="/register" className="block">
            <motion.button
              whileHover={{ 
                scale: 1.02,
                boxShadow: "0 20px 40px rgba(16, 185, 129, 0.3)"
              }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-6 relative overflow-hidden rounded-2xl font-bold text-lg text-white border border-emerald-400/30 group"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(16, 185, 129, 0.4) 0%, 
                    rgba(6, 182, 212, 0.3) 50%, 
                    rgba(34, 197, 94, 0.4) 100%
                  )
                `,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(16, 185, 129, 0.2)',
              }}
            >
              {/* Effet de vague au hover */}
              <motion.div
                className="absolute inset-0"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                }}
              />
              
              {/* Contenu du bouton */}
              <div className="relative z-10 flex items-center justify-center gap-3">
                <Sparkles className="w-5 h-5" />
                <span>Créer un Compte</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          </Link>

          {/* Bouton Se Connecter - Glass Transparent */}
          <Link href="/login" className="block">
            <motion.button
              whileHover={{ 
                scale: 1.02,
                borderColor: "rgba(16, 185, 129, 0.6)"
              }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-6 rounded-2xl font-bold text-lg text-emerald-100 border-2 border-emerald-300/40 group relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Effet lumineux au hover */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.1) 0%, transparent 70%)'
                }}
              />
              
              <div className="relative z-10 flex items-center justify-center gap-3">
                <CreditCard className="w-5 h-5" />
                <span>Se Connecter</span>
              </div>
            </motion.button>
          </Link>
        </motion.div>

        {/* Features cards glassmorphisme révolutionnaires */}
        <motion.div
          style={{ y: featuresY }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 1.2 }}
          className="grid grid-cols-3 gap-4 w-full max-w-md"
        >
          {[
            { 
              Icon: Smartphone, 
              title: "Mobile\nPayments", 
              color: "from-emerald-400 to-green-500",
              gradient: "from-emerald-400/20 to-green-500/20"
            },
            { 
              Icon: BarChart3, 
              title: "Analytics\nPro", 
              color: "from-teal-400 to-cyan-500",
              gradient: "from-teal-400/20 to-cyan-500/20"
            },
            { 
              Icon: QrCode, 
              title: "QR Code\nInstant", 
              color: "from-green-400 to-emerald-500",
              gradient: "from-green-400/20 to-emerald-500/20"
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: 2 + index * 0.2, 
                duration: 0.8,
                type: "spring",
                bounce: 0.4
              }}
              whileHover={{ 
                scale: 1.05,
                y: -5,
                transition: { duration: 0.3 }
              }}
              className="relative group cursor-pointer"
            >
              {/* Card glassmorphisme */}
              <div
                className="p-4 rounded-2xl backdrop-blur-xl border border-green-200/20 text-center relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${feature.gradient})`
                }}
              >
                {/* Effet de brillance */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100"
                  animate={{
                    background: [
                      'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                      'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 20%, transparent 40%)',
                    ]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                />
                
                {/* Icône avec gradient */}
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color} mb-3 relative z-10`}>
                  <feature.Icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Texte */}
                <p className="text-xs text-white/90 font-medium whitespace-pre-line relative z-10">
                  {feature.title}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer premium */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="absolute bottom-6 text-center"
        >
          <div className="text-xs text-emerald-200/80">
            © 2025 Développé par{" "}
            <motion.a
              href="https://icelabsoft.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 font-semibold relative inline-block"
              whileHover={{ scale: 1.05 }}
            >
              <span className="relative z-10">IcelabSoft</span>
              <motion.div
                className="absolute inset-0 bg-emerald-400/20 rounded-md -z-10"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
                style={{ originX: 0 }}
              />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}