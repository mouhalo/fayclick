'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface VideoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title: string;
}

export default function VideoLightbox({ isOpen, onClose, src, title }: VideoLightboxProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl"
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="text-white text-lg font-semibold mb-3">{title}</div>
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
              <video
                ref={videoRef}
                src={src}
                controls
                autoPlay
                className="w-full aspect-video"
                controlsList="nodownload"
              >
                Votre navigateur ne supporte pas la lecture vidéo.
              </video>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
