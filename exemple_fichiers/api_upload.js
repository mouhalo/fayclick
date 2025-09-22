// src/apis/api_upload.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const uploadFile = async (endpoint, method, formData) => {
    try {
          // Get the token from localStorage or your auth state management
        const token = localStorage.getItem('token'); // or however you store your token
    
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Validation des données requises
        const requiredFields = ['id_type', 'nom_structure', 'mobile_om'];
        for (const field of requiredFields) {
            if (!formData.get(field)) {
                throw new Error(`Le champ ${field} est requis`);
            }
        }

        const response = await axios({
            method,
            url: `${API_URL}${endpoint}`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}` 
            },
            onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                console.log(`Upload progress: ${percentCompleted}%`);
            },
            // Augmenter le timeout pour les uploads lents
            timeout: 30000,
        });

        
        if (response.data.error) {
            throw new Error(response.data.error);
        }

        return response.data;
    } catch (error) {
       
        console.error('Erreur lors de l\'upload:', error.response?.data || error.message);

        // Formater l'erreur de manière plus détaillée
        const errorMessage = error.response?.data?.error 
            || error.message 
            || 'Erreur lors de l\'upload';
            
        throw new Error(errorMessage);
    }
};