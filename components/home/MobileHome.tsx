'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ReactElement } from 'react';

export default function MobileHome() {
  const [particles, setParticles] = useState<ReactElement[]>([]);

  useEffect(() => {
    // Génération des particules côté client uniquement
    const particleCount = 20;
    const newParticles = Array.from({ length: particleCount }, (_, i) => (
      <motion.div
        key={`particle-${i}`}
        className="absolute w-1 h-1 bg-orange-400/60 rounded-full"
        initial={{ opacity: 0, y: 100 }}
        animate={{
          opacity: [0, 1, 1, 0],
          y: -100,
          x: Math.random() * 50 - 25,
        }}
        transition={{
          duration: Math.random() * 8 + 8,
          repeat: Infinity,
          delay: Math.random() * 12,
          ease: "linear"
        }}
        style={{
          left: `${Math.random() * 100}%`,
        }}
      />
    ));
    setParticles(newParticles);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 relative overflow-hidden">
      {/* Particules d'arrière-plan */}
      <div className="absolute inset-0 z-0">{particles}</div>

      {/* Content */}
      <div className="relative z-10 px-6 py-8 flex flex-col items-center justify-center min-h-screen">
        {/* Logo animé */}
        <motion.div
          initial={{ scale: 0.3, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ duration: 2, type: "spring", bounce: 0.5 }}
          className="mb-8"
        >
          <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-white/30"
              animate={{
                x: [-100, 100],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            />
            <span className="text-4xl font-black text-white z-10">FC</span>
          </div>
        </motion.div>

        {/* Titre principal */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-5xl font-extrabold text-white mb-4 text-center"
        >
          FayClick
        </motion.h1>

        {/* Sous-titre */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
          className="text-xl font-semibold text-white mb-6 text-center"
        >
          Commerce Digital Sénégal
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9, duration: 1 }}
          className="text-base text-white/90 mb-10 text-center max-w-xs leading-relaxed"
        >
          Gérez votre business et recevez vos paiements
          en toute simplicité avec Orange Money
        </motion.p>

        {/* Boutons d'action */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="w-full max-w-xs space-y-4"
        >
          <Link href="/register" className="block">
            <button className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg rounded-2xl shadow-lg transform transition-all hover:scale-105 active:scale-95 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-white/20"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
              />
              <span className="relative z-10">✨ Créer un Compte</span>
            </button>
          </Link>

          <Link href="/login" className="block">
            <button className="w-full py-4 bg-white text-sky-600 font-bold text-lg rounded-2xl shadow-lg transform transition-all hover:scale-105 active:scale-95 border-2 border-sky-600">
              <span>🔑 Se Connecter</span>
            </button>
          </Link>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="flex justify-around w-full max-w-xs mt-10"
        >
          {[
            { icon: "💰", text: "Paiements\nOrange Money" },
            { icon: "📊", text: "Gestion\nStock" },
            { icon: "📱", text: "QR Code\nInstantané" },
          ].map((feature, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.1 }}
              className="text-center"
            >
              <div className="text-3xl mb-2">{feature.icon}</div>
              <p className="text-xs text-white/90 font-medium whitespace-pre-line">
                {feature.text}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 1 }}
          className="absolute bottom-4 text-center"
        >
          <p className="text-xs text-white/80">
            © 2025 Développé par{" "}
            <a
              href="https://icelabsoft.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-300 font-semibold hover:text-orange-200"
            >
              IcelabSoft
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
