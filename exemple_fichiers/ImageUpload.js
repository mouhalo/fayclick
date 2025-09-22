import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faImage, faSpinner } from '@fortawesome/free-solid-svg-icons';
import ImageService from '../apis/imageService';
import '../styles/ImageUpload.css';

const ImageUpload = ({ 
  defaultImage, 
  onImageChange, 
  className = '',
  size = 120,
  accept = 'image/jpeg,image/png,image/gif',
  shape = 'rounded', // 'rounded' ou 'circle'
  withFile = false // Nouveau prop pour indiquer si on veut le fichier
}) => {
  const [preview, setPreview] = useState(defaultImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageError = () => {
    setPreview(null);
    setError("Image non disponible");
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      // Créer une URL locale pour la prévisualisation
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Envoi du fichier vers le serveur FTP
      console.log('Envoi du fichier depuis ImageUpload...');

      if (withFile) {
        // Si withFile est true, on passe l'URL et le fichier
        onImageChange?.(previewUrl, file);
      } else {
        // Upload l'image et récupère l'URL
        const uploadedUrl = await ImageService.uploadImage(file);
        onImageChange?.(uploadedUrl);
      }

    } catch (error) {
      setError(error.message);
      setPreview(defaultImage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`image-upload-container ${className}`}
      style={{ width: size, height: size }}
    >
      <div 
        className={`image-wrapper ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
        style={{ width: size, height: size }}
      >
        {loading ? (
          <div className="loading-overlay">
            <FontAwesomeIcon icon={faSpinner} spin />
          </div>
        ) : error ? (
          <div className="error-overlay">
            <FontAwesomeIcon icon={faImage} />
            <span>{error}</span>
          </div>
        ) : (
          <img
            src={preview || defaultImage}
            alt="Preview"
            onError={handleImageError}
            className={`image-preview ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}`}
          />
        )}
        
        <div className="upload-overlay">
          <label className="upload-button">
            <FontAwesomeIcon icon={faCamera} />
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;