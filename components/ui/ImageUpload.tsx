import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  defaultImage?: string;
  onImageChange?: (url: string, file?: File) => void;
  className?: string;
  size?: number;
  accept?: string;
  shape?: 'rounded' | 'circle';
  withFile?: boolean;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  defaultImage = '',
  onImageChange,
  className = '',
  size = 120,
  accept = 'image/jpeg,image/png,image/gif',
  shape = 'rounded',
  withFile = false,
  disabled = false
}) => {
  const [preview, setPreview] = useState<string>(defaultImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageError = () => {
    setPreview('');
    setError("Image non disponible");
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation de la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier est trop volumineux (max 5MB)");
      return;
    }

    // Validation du type de fichier
    const allowedTypes = accept.split(',').map(type => type.trim());
    if (!allowedTypes.some(type => file.type.startsWith(type.replace('*', '')))) {
      setError("Type de fichier non autorisé");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Créer une URL locale pour la prévisualisation
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      console.log('📸 Upload image:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        withFile
      });

      if (withFile) {
        // Si withFile est true, on passe l'URL de prévisualisation et le fichier
        onImageChange?.(previewUrl, file);
      } else {
        // TODO: Implémenter l'upload vers le serveur FTP
        // Pour le moment, on utilise juste l'URL locale
        onImageChange?.(previewUrl);
      }

    } catch (error) {
      console.error('Erreur upload image:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      setPreview(defaultImage);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  };

  const containerSize = {
    width: size,
    height: size
  };

  const shapeClasses = shape === 'circle' ? 'rounded-full' : 'rounded-lg';

  return (
    <div
      className={`relative ${className}`}
      style={containerSize}
    >
      <div
        className={`relative bg-gray-100 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-all duration-200 overflow-hidden ${shapeClasses} group cursor-pointer`}
        style={containerSize}
        onClick={handleClick}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-red-50">
            <ImageIcon className="h-8 w-8 mb-2" />
            <span className="text-xs text-center px-2">{error}</span>
          </div>
        ) : preview ? (
          <img
            src={preview}
            alt="Preview"
            onError={handleImageError}
            className={`w-full h-full object-cover ${shapeClasses}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <ImageIcon className="h-8 w-8 mb-2" />
            <span className="text-xs text-center px-2">Cliquer pour choisir</span>
          </div>
        )}

        {/* Overlay avec icône caméra au survol */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${shapeClasses} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 border border-white/30">
            <Camera className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={loading || disabled}
      />
    </div>
  );
};

export default ImageUpload;