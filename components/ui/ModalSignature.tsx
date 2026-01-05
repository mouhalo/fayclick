/**
 * Modal de capture de signature manuscrite
 * Wrapper autour de SignatureCanvas avec animations Framer Motion
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, PenTool } from 'lucide-react';
import { SignatureCanvas } from './SignatureCanvas';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ModalSignatureProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string) => void;
}

export function ModalSignature({ isOpen, onClose, onSave }: ModalSignatureProps) {
  const { isMobile, isMobileLarge } = useBreakpoint();

  // Dimensions canvas selon taille écran
  const getCanvasDimensions = () => {
    if (isMobile) {
      return { width: 280, height: 140 };
    } else if (isMobileLarge) {
      return { width: 320, height: 160 };
    }
    return { width: 400, height: 180 };
  };

  const { width, height } = getCanvasDimensions();

  // Gérer la sauvegarde
  const handleSave = (signatureBase64: string) => {
    onSave(signatureBase64);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[130] p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`
            bg-gradient-to-br from-white via-white to-blue-50/30
            rounded-2xl shadow-2xl border border-white/50
            backdrop-blur-sm w-full overflow-hidden
            ${isMobile ? 'max-w-xs p-4' : isMobileLarge ? 'max-w-sm p-5' : 'max-w-md p-6'}
          `}
        >
          {/* En-tête */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <PenTool className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className={`text-gray-900 font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>
                  Signature
                </h2>
                <p className="text-gray-500 text-sm">
                  Signez avec votre doigt ou souris
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Canvas de signature */}
          <div className="flex justify-center">
            <SignatureCanvas
              width={width}
              height={height}
              strokeColor="#1e40af"
              strokeWidth={2}
              onSave={handleSave}
              onCancel={onClose}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalSignature;
