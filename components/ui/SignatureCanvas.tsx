/**
 * Composant SignatureCanvas - Capture de signature manuscrite
 * Canvas HTML5 tactile avec support mouse + touch
 * Export en base64 PNG
 */

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, Check, X } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (signatureBase64: string) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  transparent?: boolean; // Nouveau: fond transparent pour superposition
}

export function SignatureCanvas({
  onSave,
  onCancel,
  width = 300,
  height = 150,
  strokeColor = '#1e40af', // Bleu signature
  strokeWidth = 2,
  transparent = true // Par défaut transparent pour superposition cachet
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialiser le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurer le canvas - transparent ou avec fond blanc
    if (transparent) {
      // Fond transparent (pour superposition sur cachet)
      ctx.clearRect(0, 0, width, height);
    } else {
      // Fond blanc classique
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [width, height, strokeColor, strokeWidth, transparent]);

  // Obtenir les coordonnées relatives au canvas
  const getCoordinates = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      // Touch event
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  }, []);

  // Commencer le tracé
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e.nativeEvent);
    if (!coords) return;

    setIsDrawing(true);
    lastPointRef.current = coords;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Dessiner un point au début (pour les clics simples)
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, strokeWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    setHasDrawn(true);
  }, [getCoordinates, strokeColor, strokeWidth]);

  // Dessiner
  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const coords = getCoordinates(e.nativeEvent);
    if (!coords || !lastPointRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    // Dessiner la ligne
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastPointRef.current = coords;
  }, [isDrawing, getCoordinates]);

  // Arrêter le tracé
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  // Effacer le canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (transparent) {
      // Effacer en gardant la transparence
      ctx.clearRect(0, 0, width, height);
    } else {
      // Effacer avec fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
    setHasDrawn(false);
  }, [width, height, transparent]);

  // Sauvegarder la signature
  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Exporter en PNG base64
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  }, [hasDrawn, onSave]);

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Instructions */}
      <p className="text-sm text-gray-600 text-center">
        Dessinez votre signature ci-dessous
        {transparent && (
          <span className="block text-xs text-blue-500 mt-1">
            (Fond transparent - se superposera au cachet)
          </span>
        )}
      </p>

      {/* Canvas */}
      <div
        className="relative border-2 border-dashed border-blue-300 rounded-lg overflow-hidden"
        style={transparent ? {
          // Fond damier pour montrer la transparence (comme Photoshop)
          backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          backgroundColor: '#ffffff'
        } : { backgroundColor: '#ffffff' }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="touch-none cursor-crosshair"
          style={{ width: '100%', maxWidth: `${width}px`, height: 'auto' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Ligne de base indicative */}
        <div
          className="absolute bottom-6 left-4 right-4 border-b border-gray-300 pointer-events-none"
          style={{ borderStyle: 'dotted' }}
        />
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center justify-center space-x-3 w-full">
        {/* Annuler */}
        <button
          onClick={onCancel}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Annuler</span>
        </button>

        {/* Effacer */}
        <button
          onClick={clearCanvas}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          disabled={!hasDrawn}
        >
          <Eraser className="w-4 h-4" />
          <span>Effacer</span>
        </button>

        {/* Valider */}
        <button
          onClick={saveSignature}
          disabled={!hasDrawn}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
            ${hasDrawn
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Check className="w-4 h-4" />
          <span>Valider</span>
        </button>
      </div>
    </div>
  );
}

export default SignatureCanvas;
