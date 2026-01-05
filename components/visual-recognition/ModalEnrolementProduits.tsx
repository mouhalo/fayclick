/**
 * ModalEnrolementProduits
 * Modal d'enrôlement en masse de produits par capture photo
 * Workflow: Capture → OCR (nom) + CLIP (embedding) → Tableau édition → Sauvegarde
 * FayClick V2 - Commerce
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  X,
  SwitchCamera,
  Loader2,
  Save,
  Trash2,
  Edit3,
  Check,
  AlertTriangle,
  Package,
  ImagePlus,
  Sparkles
} from 'lucide-react';
import { claudeVisionService } from '@/services/visual-recognition/claude-vision.service';
import { clipClient } from '@/services/visual-recognition/clip-client';
import { imageProcessor } from '@/services/visual-recognition/image-processor';
import { createEmbeddingStore } from '@/services/visual-recognition/embedding-store';
import databaseService from '@/services/database.service';

// Types
interface ProduitCapture {
  id: string;                    // ID temporaire local
  thumbnailUrl: string;          // Miniature base64
  nomProduit: string;            // Nom extrait par OCR
  nomOriginal: string;           // Nom original (avant édition)
  coutRevient: number | '';      // Prix achat (vide = non saisi)
  prixVente: number | '';        // Prix vente (vide = non saisi)
  qteStock: number;              // Quantité disponible (défaut 1)
  embedding: number[] | null;    // Embedding CLIP
  imageHash: string;             // Hash de l'image
  confidence: 'high' | 'medium' | 'low';
  isEditing: boolean;            // Mode édition du nom
  isProcessing: boolean;         // En cours de traitement
  error?: string;                // Erreur éventuelle
}

interface ModalEnrolementProduitsProps {
  isOpen: boolean;
  onClose: () => void;
  idStructure: number;
  onSuccess?: (nbProduits: number) => void;
}

export function ModalEnrolementProduits({
  isOpen,
  onClose,
  idStructure,
  onSuccess
}: ModalEnrolementProduitsProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // États caméra
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // États produits
  const [produits, setProduits] = useState<ProduitCapture[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Démarrer la caméra
  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        setCameraError(null);

        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('[Enrolement] Erreur caméra:', err);
        setCameraError('Impossible d\'accéder à la caméra');
      }
    };

    startCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isOpen, facingMode]);

  // Nettoyer à la fermeture
  useEffect(() => {
    if (!isOpen) {
      stream?.getTracks().forEach(track => track.stop());
      setStream(null);
      setProduits([]);
      setSaveError(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  // Capturer et traiter une image
  const captureAndProcess = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      // Convertir en blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => b ? resolve(b) : reject(new Error('Capture échouée')),
          'image/jpeg',
          0.9
        );
      });

      // Créer l'entrée temporaire
      const tempId = crypto.randomUUID();
      const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.5);

      const newProduit: ProduitCapture = {
        id: tempId,
        thumbnailUrl,
        nomProduit: 'Extraction en cours...',
        nomOriginal: '',
        coutRevient: '',
        prixVente: '',
        qteStock: 1,
        embedding: null,
        imageHash: '',
        confidence: 'low',
        isEditing: false,
        isProcessing: true
      };

      setProduits(prev => [newProduit, ...prev]);

      // Traiter l'image en parallèle
      const processed = await imageProcessor.process(blob);

      // Lancer OCR et CLIP en parallèle
      const [ocrResult, clipResult] = await Promise.all([
        claudeVisionService.extractProductName(processed.base64, 'image/jpeg'),
        clipClient.getEmbedding(processed.base64).catch(err => {
          console.warn('[Enrolement] Erreur CLIP:', err);
          return null;
        })
      ]);

      // Mettre à jour le produit
      setProduits(prev => prev.map(p => {
        if (p.id === tempId) {
          return {
            ...p,
            nomProduit: ocrResult.nomProduit,
            nomOriginal: ocrResult.nomProduit,
            confidence: ocrResult.confidence,
            embedding: clipResult?.embedding || null,
            imageHash: processed.hash,
            isProcessing: false,
            error: ocrResult.success ? undefined : ocrResult.error
          };
        }
        return p;
      }));

    } catch (error) {
      console.error('[Enrolement] Erreur capture:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  // Import depuis galerie
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Même traitement que la capture
    const tempId = crypto.randomUUID();
    const thumbnailUrl = URL.createObjectURL(file);

    const newProduit: ProduitCapture = {
      id: tempId,
      thumbnailUrl,
      nomProduit: 'Extraction en cours...',
      nomOriginal: '',
      coutRevient: '',
      prixVente: '',
      qteStock: 1,
      embedding: null,
      imageHash: '',
      confidence: 'low',
      isEditing: false,
      isProcessing: true
    };

    setProduits(prev => [newProduit, ...prev]);

    try {
      const processed = await imageProcessor.process(file);

      const [ocrResult, clipResult] = await Promise.all([
        claudeVisionService.extractProductName(processed.base64, 'image/jpeg'),
        clipClient.getEmbedding(processed.base64).catch(() => null)
      ]);

      setProduits(prev => prev.map(p => {
        if (p.id === tempId) {
          return {
            ...p,
            nomProduit: ocrResult.nomProduit,
            nomOriginal: ocrResult.nomProduit,
            confidence: ocrResult.confidence,
            embedding: clipResult?.embedding || null,
            imageHash: processed.hash,
            isProcessing: false
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('[Enrolement] Erreur import:', error);
      setProduits(prev => prev.map(p => {
        if (p.id === tempId) {
          return { ...p, isProcessing: false, error: 'Erreur de traitement' };
        }
        return p;
      }));
    }

    // Reset input
    e.target.value = '';
  }, []);

  // Changer caméra
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Supprimer un produit
  const handleDelete = useCallback((id: string) => {
    setProduits(prev => prev.filter(p => p.id !== id));
  }, []);

  // Toggle mode édition nom
  const toggleEditNom = useCallback((id: string) => {
    setProduits(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, isEditing: !p.isEditing };
      }
      return p;
    }));
  }, []);

  // Modifier un champ
  const updateProduit = useCallback((id: string, field: keyof ProduitCapture, value: any) => {
    setProduits(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  }, []);

  // Valider les données avant sauvegarde
  const validateProduits = (): boolean => {
    const validProduits = produits.filter(p => !p.isProcessing && !p.error);

    if (validProduits.length === 0) {
      setSaveError('Aucun produit valide à sauvegarder');
      return false;
    }

    for (const p of validProduits) {
      if (!p.nomProduit || p.nomProduit === 'Produit non identifié') {
        setSaveError(`Veuillez corriger le nom du produit "${p.nomProduit}"`);
        return false;
      }
      if (p.coutRevient === '' || p.prixVente === '') {
        setSaveError(`Veuillez saisir les prix pour "${p.nomProduit}"`);
        return false;
      }
      if (Number(p.prixVente) < Number(p.coutRevient)) {
        setSaveError(`Le prix de vente doit être supérieur au prix d'achat pour "${p.nomProduit}"`);
        return false;
      }
    }

    return true;
  };

  // Sauvegarder tous les produits
  const handleSave = async () => {
    setSaveError(null);

    if (!validateProduits()) return;

    setIsSaving(true);

    try {
      const validProduits = produits.filter(p => !p.isProcessing && !p.error);

      // Construire le JSON pour add_multiproduit
      const produitsJson = validProduits.map(p => ({
        nom_produit: p.nomProduit,
        cout_revient: Number(p.coutRevient),
        prix_vente: Number(p.prixVente),
        qte_stock: p.qteStock
      }));

      console.log('[Enrolement] Sauvegarde produits:', produitsJson);

      // Appeler add_multiproduit
      const query = `SELECT * FROM add_multiproduit(${idStructure}, '${JSON.stringify(produitsJson)}'::jsonb)`;
      const result = await databaseService.query(query);

      console.log('[Enrolement] Résultat add_multiproduit:', result);

      if (!result?.success) {
        throw new Error(result?.message || 'Erreur lors de la création des produits');
      }

      const produitsIds: number[] = result.data?.produits_ids || [];

      // Sauvegarder les embeddings pour chaque produit créé
      const embeddingStore = createEmbeddingStore(idStructure);

      for (let i = 0; i < validProduits.length; i++) {
        const produit = validProduits[i];
        const idProduit = produitsIds[i];

        if (produit.embedding && idProduit) {
          try {
            await embeddingStore.save(idProduit, produit.embedding, produit.imageHash, {
              confidence: produit.confidence === 'high' ? 1 : produit.confidence === 'medium' ? 0.7 : 0.5,
              syncToServer: true
            });
            console.log(`[Enrolement] Embedding sauvegardé pour produit ${idProduit}`);
          } catch (err) {
            console.warn(`[Enrolement] Erreur sauvegarde embedding ${idProduit}:`, err);
          }
        }
      }

      setSaveSuccess(true);
      onSuccess?.(validProduits.length);

      // Fermer après 2s
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('[Enrolement] Erreur sauvegarde:', error);
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  // Stats
  const validCount = produits.filter(p => !p.isProcessing && !p.error).length;
  const processingCount = produits.filter(p => p.isProcessing).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 bg-white/20 rounded-full"
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>

          <div className="text-center">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              Ajout par Photo
            </h2>
            <p className="text-white/80 text-xs">
              {validCount} produit{validCount > 1 ? 's' : ''} capturé{validCount > 1 ? 's' : ''}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            className="p-2 bg-white/20 rounded-full"
          >
            <SwitchCamera className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Zone caméra (30% hauteur) */}
        <div className="h-[30vh] relative bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-white text-sm text-center px-4">{cameraError}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Guide de cadrage */}
          {!cameraError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-32 border-2 border-white/50 rounded-lg border-dashed" />
            </div>
          )}

          {/* Overlay capture */}
          {isCapturing && (
            <div className="absolute inset-0 bg-white/30 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          )}

          {/* Boutons capture */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <ImagePlus className="w-6 h-6 text-white" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={captureAndProcess}
              disabled={isCapturing || !stream}
              className="w-16 h-16 bg-white rounded-full border-4 border-purple-400 disabled:opacity-50"
            />

            <div className="w-12 h-12" /> {/* Spacer */}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Tableau des produits (reste de l'écran) */}
        <div className="flex-1 bg-gray-100 overflow-hidden flex flex-col">
          {/* Entêtes tableau */}
          <div className="bg-white border-b border-gray-200 px-2 py-2 grid grid-cols-12 gap-1 text-xs font-medium text-gray-600">
            <div className="col-span-1 text-center">Photo</div>
            <div className="col-span-4">Nom produit</div>
            <div className="col-span-2 text-center">P. Achat</div>
            <div className="col-span-2 text-center">P. Vente</div>
            <div className="col-span-1 text-center">Qté</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {/* Liste produits */}
          <div className="flex-1 overflow-y-auto">
            {produits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Camera className="w-12 h-12 mb-2" />
                <p className="text-sm">Capturez des photos de vos produits</p>
                <p className="text-xs mt-1">Les noms seront extraits automatiquement</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {produits.map((produit) => (
                  <motion.div
                    key={produit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`px-2 py-2 grid grid-cols-12 gap-1 items-center bg-white ${
                      produit.error ? 'bg-red-50' : ''
                    }`}
                  >
                    {/* Photo */}
                    <div className="col-span-1 flex justify-center">
                      <img
                        src={produit.thumbnailUrl}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    </div>

                    {/* Nom produit */}
                    <div className="col-span-4">
                      {produit.isProcessing ? (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs">Extraction...</span>
                        </div>
                      ) : produit.isEditing ? (
                        <input
                          type="text"
                          value={produit.nomProduit}
                          onChange={(e) => updateProduit(produit.id, 'nomProduit', e.target.value)}
                          onBlur={() => toggleEditNom(produit.id)}
                          onKeyDown={(e) => e.key === 'Enter' && toggleEditNom(produit.id)}
                          autoFocus
                          className="w-full px-2 py-1 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`text-xs truncate ${
                            produit.confidence === 'low' ? 'text-amber-600' : 'text-gray-800'
                          }`}>
                            {produit.nomProduit}
                          </span>
                          {produit.confidence === 'low' && (
                            <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Prix achat */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={produit.coutRevient}
                        onChange={(e) => updateProduit(produit.id, 'coutRevient', e.target.value ? Number(e.target.value) : '')}
                        placeholder="0"
                        disabled={produit.isProcessing}
                        className="w-full px-1 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Prix vente */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={produit.prixVente}
                        onChange={(e) => updateProduit(produit.id, 'prixVente', e.target.value ? Number(e.target.value) : '')}
                        placeholder="0"
                        disabled={produit.isProcessing}
                        className="w-full px-1 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Quantité */}
                    <div className="col-span-1">
                      <input
                        type="number"
                        min="0"
                        value={produit.qteStock}
                        onChange={(e) => updateProduit(produit.id, 'qteStock', Math.max(0, Number(e.target.value)))}
                        disabled={produit.isProcessing}
                        className="w-full px-1 py-1 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:bg-gray-100"
                      />
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex justify-center gap-1">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleEditNom(produit.id)}
                        disabled={produit.isProcessing}
                        className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50"
                        title="Corriger le nom"
                      >
                        {produit.isEditing ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Edit3 className="w-3.5 h-3.5" />
                        )}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(produit.id)}
                        className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer avec bouton sauvegarder */}
          {produits.length > 0 && (
            <div className="bg-white border-t border-gray-200 p-3">
              {saveError && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{saveError}</p>
                </div>
              )}

              {saveSuccess ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center justify-center gap-2 py-3 bg-green-100 rounded-xl"
                >
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">
                    {validCount} produit{validCount > 1 ? 's' : ''} enregistré{validCount > 1 ? 's' : ''} !
                  </span>
                </motion.div>
              ) : (
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    disabled={isSaving}
                    className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium disabled:opacity-50"
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSave}
                    disabled={isSaving || validCount === 0 || processingCount > 0}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Sauvegarder ({validCount})
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ModalEnrolementProduits;
