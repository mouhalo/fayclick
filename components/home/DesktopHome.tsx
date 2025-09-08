'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactElement } from 'react';

export default function DesktopHome() {
  const [particles, setParticles] = useState<ReactElement[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Images du carrousel (vous devrez ajouter ces images dans /public/images/)
  const carouselImages = [
    '/images/accueil1.png',
    '/images/accueil2.png',
    '/images/accueil3.png',
    '/images/accueil4.png',
  ];

  useEffect(() => {
    // Génération des particules côté client
    const particleCount = 50;
    const newParticles = Array.from({ length: particleCount }, (_, i) => (
      <motion.div
        key={`particle-${i}`}
        className="absolute w-1.5 h-1.5 bg-orange-400/40 rounded-full"
        initial={{ opacity: 0, y: 100 }}
        animate={{
          opacity: [0, 1, 1, 0],
          y: -100,
          x: Math.random() * 100 - 50,
        }}
        transition={{
          duration: Math.random() * 10 + 10,
          repeat: Infinity,
          delay: Math.random() * 15,
          ease: "linear"
        }}
        style={{
          left: `${Math.random() * 100}%`,
        }}
      />
    ));
    setParticles(newParticles);
  }, []);

  // Auto-slide carrousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [carouselImages.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-sky-300 to-blue-200 relative overflow-hidden">
      {/* Particules d'arrière-plan */}
      <div className="absolute inset-0 z-0">{particles}</div>

      {/* Section 1: Header */}
      <header className="relative z-10 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo gauche (vide pour centrer le logo principal) */}
            <div className="w-32"></div>

            {/* Logo animé au centre */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1.5, type: "spring" as const }}
              className="flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-white/30"
                  animate={{
                    x: [-100, 100],
                    opacity: [0, 0.5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                />
                <span className="text-2xl font-black text-white z-10">FC</span>
              </div>
              <h1 className="text-3xl font-bold text-white">FayClick</h1>
            </motion.div>

            {/* Bouton connexion à droite */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <Link href="/login">
                <button className="px-8 py-3 bg-white/90 text-sky-600 font-semibold rounded-xl shadow-lg hover:bg-white hover:shadow-xl transform transition-all hover:scale-105 backdrop-blur-sm">
                  Se Connecter
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Section 2: Carrousel */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl font-bold text-white mb-4">
              La Super App du Commerce Digital
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Gérez votre business, acceptez les paiements Orange Money et Wave, 
              et développez votre activité avec la première Super App du Sénégal
            </p>
          </motion.div>

          {/* Carrousel */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="relative max-w-6xl mx-auto"
          >
            <div className="relative h-[600px] bg-white/10 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl border border-white/20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -300 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center p-8"
                >
                  {/* Placeholder pour les images */}
                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4">📱</div>
                      <h3 className="text-3xl font-bold mb-2">
                        Slide {currentSlide + 1}
                      </h3>
                      <p className="text-xl opacity-90">
                        {currentSlide === 0 && "Tableau de bord intuitif"}
                        {currentSlide === 1 && "Gestion des stocks simplifiée"}
                        {currentSlide === 2 && "Paiements instantanés"}
                        {currentSlide === 3 && "Rapports détaillés"}
                      </p>
                    </div>
                  </div>
                  {/* Remplacez le div ci-dessus par ceci quand vous aurez les images :
                  <Image
                    src={carouselImages[currentSlide]}
                    alt={`FayClick Feature ${currentSlide + 1}`}
                    fill
                    className="object-contain"
                    priority
                  />
                  */}
                </motion.div>
              </AnimatePresence>

              {/* Indicateurs de slide */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentSlide
                        ? 'bg-white w-8'
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              {/* Boutons de navigation */}
              <button
                onClick={() => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length)}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselImages.length)}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
              >
                →
              </button>
            </div>

            {/* CTA sous le carrousel */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5, duration: 1 }}
              className="text-center mt-12"
            >
              <Link href="/register">
                <button className="px-12 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xl rounded-2xl shadow-2xl hover:shadow-3xl transform transition-all hover:scale-105 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  <span className="relative z-10">Commencer Gratuitement →</span>
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section 3: Footer */}
      <footer className="relative z-10 bg-white/10 backdrop-blur-md border-t border-white/20 mt-auto">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-white">
            <p className="mb-2">
              © 2025 FayClick - Tous droits réservés
            </p>
            <p className="text-sm opacity-80">
              Développé par{" "}
              <a
                href="https://icelabsoft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-300 font-semibold hover:text-orange-200 transition-colors"
              >
                IcelabSoft
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
