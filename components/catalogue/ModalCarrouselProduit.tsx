/**
 * Modal Carrousel Premium pour afficher les photos d'un produit
 * Design glassmorphique sophistiqué cohérent avec FayClick
 * Optimisé mobile : Zoom avancé + Maximum d'espace pour images
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Package
} from 'lucide-react';
import { ProduitPublic } from '@/types/catalogue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import Image from 'next/image';

interface ModalCarrouselProduitProps {
  produit: ProduitPublic;
  isOpen: boolean;
  onClose: () => void;
  initialPhotoIndex?: number;
}

export default function ModalCarrouselProduit({
  produit,
  isOpen,
  onClose,
  initialPhotoIndex = 0
}: ModalCarrouselProduitProps) {
  const { isMobile } = useBreakpoint();
  const [currentIndex, setCurrentIndex] = useState(initialPhotoIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });

  const photos = produit.photos || [];
  const hasPhotos = photos.length > 0;

  // Reset à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialPhotoIndex);
      setIsZoomed(false);
      setImageLoaded(false);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialPhotoIndex]);

  // Navigation au clavier
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const handlePrevious = useCallback(() => {
    if (!hasPhotos) return;
    setImageLoaded(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [hasPhotos, photos.length]);

  const handleNext = useCallback(() => {
    if (!hasPhotos) return;
    setImageLoaded(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [hasPhotos, photos.length]);

  const toggleZoom = () => {
    if (isZoomed) {
      setIsZoomed(false);
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    } else {
      setIsZoomed(true);
      setZoomLevel(isMobile ? 2 : 2.5);
    }
  };

  // Gestion pinch-to-zoom sur mobile
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    let initialDistance = 0;
    let initialZoom = 1;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        initialZoom = zoomLevel;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = currentDistance / initialDistance;
        const newZoom = Math.min(Math.max(initialZoom * scale, 1), 4);
        setZoomLevel(newZoom);
        setIsZoomed(newZoom > 1);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isOpen, isMobile, zoomLevel]);

  // Format prix
  const formatPrix = (prix: number): string => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(prix);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
          onClick={onClose}
        >
          {/* Effet de morphing dynamique en arrière-plan */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                background: [
                  'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 50%, rgba(147, 51, 234, 0.15) 0%, transparent 50%)',
                  'radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)',
                  'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)'
                ]
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute inset-0"
            />
          </div>

          {/* Container principal avec effet de verre premium */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-6xl w-full max-h-[95vh] overflow-hidden"
          >
            {/* Carte principale avec effet prismatique */}
            <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
              {/* Effet de réflexion premium */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

              {/* Effet prismatique animé */}
              <motion.div
                animate={{
                  background: [
                    'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                    'linear-gradient(135deg, transparent 0%, rgba(147, 51, 234, 0.1) 50%)',
                    'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
                  ]
                }}
                transition={{ duration: 5, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none"
              />

              {/* Header avec info produit - Optimisé mobile */}
              <div className="relative p-3 md:p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-start justify-between gap-2 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <motion.h2
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-lg md:text-2xl lg:text-3xl font-bold text-white line-clamp-2"
                    >
                      {produit.nom_produit}
                    </motion.h2>

                    {/* Catégorie et prix uniquement sur desktop */}
                    {!isMobile && (
                      <div className="flex flex-wrap items-center gap-3 text-sm mt-2">
                        {produit.nom_categorie && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 backdrop-blur-sm rounded-full border border-blue-400/30"
                          >
                            <span className="text-blue-100 font-medium">{produit.nom_categorie}</span>
                          </motion.div>
                        )}

                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-400/30"
                        >
                          <span className="text-emerald-100 font-bold">{formatPrix(produit.prix_vente)}</span>
                        </motion.div>
                      </div>
                    )}
                  </div>

                  {/* Bouton fermer avec effet d'énergie */}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="relative p-2 md:p-3 bg-red-500/20 backdrop-blur-sm rounded-full border border-red-400/30 hover:bg-red-500/30 transition-all group flex-shrink-0"
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          '0 0 20px rgba(239, 68, 68, 0.5)',
                          '0 0 30px rgba(239, 68, 68, 0.8)',
                          '0 0 20px rgba(239, 68, 68, 0.5)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full"
                    />
                    <X className="w-5 h-5 md:w-6 md:h-6 text-red-200 relative z-10" />
                  </motion.button>
                </div>
              </div>

              {/* Zone carrousel - Optimisé mobile avec zoom avancé */}
              <div className="relative p-2 md:p-6">
                {hasPhotos ? (
                  <div className="relative">
                    {/* Image principale avec zoom avancé */}
                    <motion.div
                      className={`relative bg-black/20 rounded-xl md:rounded-2xl overflow-hidden ${
                        isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                      }`}
                      style={{
                        aspectRatio: isMobile ? '3/4' : '16/9',
                        touchAction: isZoomed ? 'none' : 'auto'
                      }}
                      onClick={isMobile ? undefined : toggleZoom}
                      onDoubleClick={isMobile ? toggleZoom : undefined}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentIndex}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{
                            opacity: imageLoaded ? 1 : 0.5,
                            scale: zoomLevel,
                            x: panPosition.x,
                            y: panPosition.y
                          }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                          className="relative w-full h-full"
                        >
                          <Image
                            src={photos[currentIndex].url_photo}
                            alt={`${produit.nom_produit} - Photo ${currentIndex + 1}`}
                            fill
                            className="object-contain"
                            onLoad={() => setImageLoaded(true)}
                            priority
                          />
                        </motion.div>
                      </AnimatePresence>

                      {/* Badge zoom et instruction mobile */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-2 md:top-4 right-2 md:right-4 p-1.5 md:p-2 bg-black/40 backdrop-blur-sm rounded-lg"
                      >
                        {isZoomed ? (
                          <ZoomOut className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        ) : (
                          <ZoomIn className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        )}
                      </motion.div>

                      {/* Instruction pinch sur mobile */}
                      {isMobile && !isZoomed && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-2 left-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20"
                        >
                          <span className="text-white text-xs font-medium">
                            🤏 Pincez pour zoomer
                          </span>
                        </motion.div>
                      )}

                      {/* Compteur photos */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1.5 md:py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/20"
                      >
                        <span className="text-white font-medium text-xs md:text-sm">
                          {currentIndex + 1} / {photos.length}
                        </span>
                      </motion.div>
                    </motion.div>

                    {/* Boutons navigation avec effet d'énergie - Plus compacts sur mobile */}
                    {photos.length > 1 && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.1, x: -5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handlePrevious}
                          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 md:p-4 bg-blue-500/30 backdrop-blur-md rounded-r-xl md:rounded-r-2xl border border-blue-400/30 hover:bg-blue-500/50 transition-all group"
                        >
                          <motion.div
                            animate={{
                              boxShadow: [
                                '0 0 20px rgba(59, 130, 246, 0.5)',
                                '0 0 30px rgba(59, 130, 246, 0.8)',
                                '0 0 20px rgba(59, 130, 246, 0.5)'
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-r-xl md:rounded-r-2xl"
                          />
                          <ChevronLeft className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1, x: 5 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleNext}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 md:p-4 bg-blue-500/30 backdrop-blur-md rounded-l-xl md:rounded-l-2xl border border-blue-400/30 hover:bg-blue-500/50 transition-all group"
                        >
                          <motion.div
                            animate={{
                              boxShadow: [
                                '0 0 20px rgba(59, 130, 246, 0.5)',
                                '0 0 30px rgba(59, 130, 246, 0.8)',
                                '0 0 20px rgba(59, 130, 246, 0.5)'
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 rounded-l-xl md:rounded-l-2xl"
                          />
                          <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-white relative z-10" />
                        </motion.button>
                      </>
                    )}

                    {/* Miniatures - Masquées sur mobile si zoomé */}
                    {photos.length > 1 && !(isMobile && isZoomed) && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-3 md:mt-6 flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-white/10"
                      >
                        {photos.map((photo, index) => (
                          <motion.button
                            key={photo.id_photo || index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setImageLoaded(false);
                              setZoomLevel(1);
                              setPanPosition({ x: 0, y: 0 });
                              setIsZoomed(false);
                              setCurrentIndex(index);
                            }}
                            className={`relative flex-shrink-0 w-16 h-16 md:w-24 md:h-24 rounded-lg md:rounded-xl overflow-hidden border-2 transition-all ${
                              index === currentIndex
                                ? 'border-blue-400 shadow-lg shadow-blue-500/50'
                                : 'border-white/20 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <Image
                              src={photo.url_photo}
                              alt={`Miniature ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            {index === currentIndex && (
                              <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-[1px]" />
                            )}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-2xl">
                    <div className="text-center">
                      <Package className="w-16 h-16 text-white/50 mx-auto mb-4" />
                      <p className="text-white/70 text-lg">Aucune photo disponible</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {produit.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                  >
                    <h3 className="text-white font-semibold mb-2">Description</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {produit.description}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}