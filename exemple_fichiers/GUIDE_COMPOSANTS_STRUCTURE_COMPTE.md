# 📋 GUIDE COMPLET - Composants Structure & Compte Utilisateur

**Version :** 1.0
**Date :** 21 septembre 2025
**Équipe :** Développement Frontend
**Objectif :** Guide de reproduction pour autres applications

---

## 🎯 Vue d'ensemble

Ce guide détaille la reproduction de deux composants clés de PayEcole :

1. **AddEditStructure** - Formulaire de création/modification de structure
2. **MonCompte** - Modal de gestion du profil et changement de mot de passe

Ces composants utilisent des designs modernes avec glassmorphisme, animations et validations robustes.

---

## 📱 COMPOSANT 1 : AddEditStructure

### 🏗️ Architecture générale

```javascript
// Structure du composant
const AddEditStructure = ({ mode='add', structure: initialStructure, onClose }) => {
  // États principaux
  const [structure, setStructure] = useState(...)
  const [typeOptions, setTypeOptions] = useState([])
  const [logoFile, setLogoFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hooks et effects
  // Fonctions de validation
  // Handlers d'événements
  // Rendu JSX
}
```

### 🔧 Props et Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | string | 'add' | Mode : 'add' ou 'edit' |
| `structure` | object | null | Données de structure à éditer |
| `onClose` | function | null | Callback de fermeture |

### 📊 Structure des données

```javascript
const structureSchema = {
  id_type: '',              // ID du type de structure
  code_structure: '',       // Code unique
  nom_structure: '',        // Nom (requis)
  adresse: '',             // Adresse (requise)
  mobile_om: '',           // Mobile Orange Money (requis)
  mobile_wave: '',         // Mobile Wave
  numautorisatioon: '',    // Numéro d'autorisation
  nummarchand: '',         // Numéro marchand
  email: '',               // Email avec validation
  id_localite: '',         // ID localité
  actif: true,             // Statut actif/inactif
  logo: DEFAULT_LOGO       // Logo avec upload
}
```

### 🔍 Validations implémentées

#### 1. Validation des champs requis
```javascript
const validateForm = () => {
  const requiredFields = ['nom_structure', 'adresse', 'id_type', 'mobile_om'];
  const missingFields = requiredFields.filter(field => !structure[field]);

  if (missingFields.length > 0) {
    const fieldNames = {
      nom_structure: 'Nom de la structure',
      adresse: 'Adresse',
      id_type: 'Type de structure',
      mobile_om: 'Mobile Orange Money'
    };
    setPopupMessage(`Veuillez remplir : ${missingFields.map(f => fieldNames[f]).join(', ')}`);
    return false;
  }
  return true;
}
```

#### 2. Validation du numéro Orange Money
```javascript
if (structure.mobile_om && !/^\d{9}$/.test(structure.mobile_om)) {
  setPopupMessage('Le numéro Orange Money doit contenir 9 chiffres');
  return false;
}
```

#### 3. Validation de l'email
```javascript
if (structure.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(structure.email)) {
  setPopupMessage("Format d'email invalide");
  return false;
}
```

### 🌐 API Endpoints

#### 1. Récupération des types de structure
```javascript
// Endpoint : GET /typestructures
const fetchTypes = async () => {
  const response = await getReponseApi('/typestructures', 'GET');
  setTypeOptions(response);
}
```

#### 2. Sauvegarde de la structure
```javascript
// Endpoint dynamique selon le mode
const endpoint = mode === 'add' ? '/structures' : `/structures/${structure.id_structure}`;
const method = mode === 'add' ? 'POST' : 'PUT';

// Envoi avec FormData pour support upload
const formData = new FormData();
Object.keys(structure).forEach(key => {
  if (key !== 'logo') {
    formData.append(key, structure[key]);
  }
});

if (logoFile) {
  formData.append('logo', logoFile);
} else if (structure.logo) {
  formData.append('logoUrl', structure.logo);
}

const response = await uploadFile(endpoint, method, formData);
```

### 🎨 Design et CSS

#### Variables CSS principales
```css
:root {
  --primary-color: #4299e1;
  --success-color: #189732;
  --error-color: #df0e0e;
  --background: #ffffff;
  --text-primary: #2d3748;
  --border-color: #e2e8f0;
}
```

#### Caractéristiques du design
- **Animation d'entrée** : `slideIn` 0.3s ease-out
- **Bordures** : border-radius 20px pour le container
- **Boutons** : border-radius 46px avec effets shine
- **Logo** : Upload avec preview circulaire
- **Form fields** : Validation visuelle avec couleurs

### 📁 Fichiers requis pour reproduction

```
/components/
  ├── AddEditStructure.js        # Composant principal
  ├── ImageUpload.js             # Composant upload d'image
  └── PopMessage.js              # Composant de notification

/styles/
  └── AddEditStructure.css       # Styles complets

/apis/
  ├── api_backend.js             # Service API principal
  └── api_upload.js              # Service upload de fichiers

/assets/
  └── logos/
      └── sycad_logo.png         # Logo par défaut
```

---

## 🔐 COMPOSANT 2 : MonCompte (Modal Account)

### 🏗️ Architecture générale

```javascript
const MonCompte = ({ show = true, onHide, onSave }) => {
  // États UI
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // États des données
  const [formData, setFormData] = useState({...})
  const [passwordData, setPasswordData] = useState({...})

  // États de notification
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({...})
}
```

### 🔧 Props et Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | boolean | true | Affichage du modal |
| `onHide` | function | null | Callback de fermeture |
| `onSave` | function | null | Callback après sauvegarde |

### 📊 Structure des données

#### Données de profil
```javascript
const formData = {
  login_agent: '',      // Login (non éditable)
  nom_agent: '',        // Nom utilisateur (éditable)
  prenom_agent: '',     // Statut (éditable)
  tel_agent: '',        // Téléphone (éditable)
  user_picture: ''      // Photo de profil
}
```

#### Données de mot de passe
```javascript
const passwordData = {
  oldPassword: '',      // Ancien mot de passe
  newPassword: '',      // Nouveau mot de passe
  confirmPassword: ''   // Confirmation
}
```

### 🔍 Validations du mot de passe

#### 1. Validation complète
```javascript
const handleChangePassword = async (e) => {
  e.preventDefault();
  const { oldPassword, newPassword, confirmPassword } = passwordData;

  // Validation ancien mot de passe
  if (!oldPassword.trim()) {
    showNotification('warning', 'Veuillez saisir votre ancien mot de passe');
    return;
  }

  // Validation nouveau mot de passe
  if (!newPassword.trim()) {
    showNotification('warning', 'Veuillez saisir un nouveau mot de passe');
    return;
  }

  // Validation longueur minimum
  if (newPassword.length < 6) {
    showNotification('warning', 'Le mot de passe doit contenir au moins 6 caractères');
    return;
  }

  // Validation correspondance
  if (newPassword !== confirmPassword) {
    showNotification('error', 'Les nouveaux mots de passe ne correspondent pas');
    return;
  }

  // Appel API...
}
```

### 🌐 API Endpoints

#### 1. Mise à jour du profil
```javascript
// Endpoint : PUT /utilisateurs/updateUser/{id}
const dataToSend = {
  id_structure: user.id_structure,
  id_profil: user.id_profil,
  username: formData.nom_agent.toUpperCase(),
  tel_user: formData.tel_agent,
};

const response = await getReponseApi(`/utilisateurs/updateUser/${user.id}`, 'PUT', dataToSend);
```

#### 2. Changement de mot de passe
```javascript
// Endpoint : POST /utilisateurs/changePassword
const response = await getReponseApi('/utilisateurs/changePassword', 'POST', {
  oldPassword,
  newPassword,
  confirmPassword
});
```

#### 3. Notification SMS automatique
```javascript
// Après changement de mot de passe réussi
const message = `Bonjour ${user.username}, votre mot de passe FayClick a été modifié avec succès. Nouveau mot de passe : ${newPassword}`;
const query = `INSERT INTO sms_pending (nom_client, numtel, message_sms) VALUES ('ICELABOSOFT', '${user.telephone}', '${message}')`;
await envoyerRequeteApi('smsapi', query, '');
```

### 🎨 Design Glassmorphisme

#### Variables CSS principales
```css
:root {
  --mc-primary: #667eea;
  --mc-secondary: #764ba2;
  --mc-accent: #8b5cf6;
  --mc-success: #10b981;
  --mc-error: #ef4444;
  --mc-warning: #f59e0b;

  --mc-glass-bg: rgba(255, 255, 255, 0.12);
  --mc-glass-border: rgba(255, 255, 255, 0.2);
  --mc-text-primary: #ffffff;

  --mc-gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --mc-shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
}
```

#### Effets glassmorphisme
```css
.mc-account-card {
  background: var(--mc-glass-bg);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(25px) saturate(180%);
  border: 1px solid var(--mc-glass-border);
  border-radius: 24px;
  box-shadow: var(--mc-shadow-xl);
}
```

#### Animations clés
- **Entrée modal** : `mc-slideIn` avec cubic-bezier
- **Fermeture** : `mc-fadeOut` avec blur transition
- **Notifications** : `mc-notificationSlide` depuis le haut
- **Effets brillance** : Reflets animés sur hover

### 🔧 Gestion des événements

#### 1. Fermeture avec animation
```javascript
const handleClose = useCallback(() => {
  if (!loading) {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      if (onHide) {
        onHide();
      } else {
        navigate('/mastructure');
      }
      // Reset des formulaires
      setActiveTab('profile');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setNotification({ show: false, type: '', message: '' });
    }, 300);
  }
}, [loading, onHide, navigate]);
```

#### 2. Gestion de la touche Escape
```javascript
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape' && show && !loading) {
      handleClose();
    }
  };

  if (show) {
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden'; // Prevent body scroll
  }

  return () => {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = 'unset';
  };
}, [show, loading, handleClose]);
```

### 📁 Fichiers requis pour reproduction

```
/components/
  ├── Admin/
  │   └── MonCompte.js           # Composant principal
  └── Header.js                  # Header (optionnel)

/styles/
  └── MonCompte.css              # Styles glassmorphisme complets

/contexts/
  └── PayEcoleContext.js         # Context utilisateur

/apis/
  ├── api_backend.js             # Service API principal
  └── api.js                     # Service SMS/requêtes

/icons/
  └── user-icon.png              # Avatar par défaut
```

---

## 🚀 Guide d'implémentation

### Étape 1 : Installation des dépendances

```bash
npm install lucide-react
npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons
npm install react-router-dom
```

### Étape 2 : Structure des dossiers

```
src/
├── components/
│   ├── Admin/
│   │   ├── AddEditStructure.js
│   │   ├── MonCompte.js
│   │   └── ImageUpload.js
│   └── PopMessage.js
├── styles/
│   ├── AddEditStructure.css
│   └── MonCompte.css
├── services/
│   ├── api_backend.js
│   ├── api_upload.js
│   └── api.js
└── contexts/
    └── UserContext.js
```

### Étape 3 : Configuration des services API

#### Service API Backend
```javascript
// api_backend.js
export const getReponseApi = async (endpoint, method, data) => {
  const baseURL = process.env.REACT_APP_API_URL || 'https://api.votre-domaine.com';

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${baseURL}${endpoint}`, options);
  return await response.json();
};
```

#### Service Upload
```javascript
// api_upload.js
export const uploadFile = async (endpoint, method, formData) => {
  const baseURL = process.env.REACT_APP_API_URL || 'https://api.votre-domaine.com';

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  };

  const response = await fetch(`${baseURL}${endpoint}`, options);
  return await response.json();
};
```

### Étape 4 : Context utilisateur

```javascript
// UserContext.js
import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
```

### Étape 5 : Variables d'environnement

```bash
# .env
REACT_APP_API_URL= https://api.icelabsoft.com
REACT_APP_UPLOAD_URL=https://api.icelabsoft.com
```

---

## 🎨 Personnalisation du design

### Modification des couleurs principales

```css
/* AddEditStructure.css */
:root {
  --primary-color: #votre-couleur;     /* Couleur principale */
  --success-color: #votre-couleur;     /* Couleur succès */
  --error-color: #votre-couleur;       /* Couleur erreur */
}

/* MonCompte.css */
:root {
  --mc-primary: #votre-couleur;        /* Couleur principale modal */
  --mc-gradient-primary: linear-gradient(135deg, #couleur1 0%, #couleur2 100%);
}
```

### Adaptation de la taille du modal

```css
.mc-modal-container {
  max-width: 420px;    /* Modifier selon vos besoins */
  max-height: 85vh;    /* Hauteur maximale */
}

.add-edit-structure-form {
  max-width: 600px;    /* Largeur du formulaire structure */
  height: 693px;       /* Hauteur fixe ou auto */
}
```

---

## 🔧 Points d'attention techniques

### 1. Gestion des erreurs API

```javascript
// Wrapper avec gestion d'erreur standardisée
const apiCall = async (endpoint, method, data) => {
  try {
    const response = await getReponseApi(endpoint, method, data);
    if (!response.success) {
      throw new Error(response.message || 'Erreur API');
    }
    return response;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
```

### 2. Optimisation des performances

```javascript
// Mémorisation des callbacks coûteux
const handleClose = useCallback(() => {
  // Logique de fermeture
}, [dependencies]);

// Debouncing pour la validation en temps réel
const debouncedValidation = useMemo(
  () => debounce(validateField, 300),
  []
);
```

### 3. Accessibilité

```jsx
// Attributs ARIA appropriés
<button
  aria-label="Fermer le modal"
  onClick={handleClose}
>
  <X size={20} />
</button>

// Focus management
useEffect(() => {
  if (show) {
    const firstInput = document.querySelector('.mc-input');
    firstInput?.focus();
  }
}, [show]);
```

### 4. Tests recommandés

```javascript
// Tests unitaires essentiels
describe('AddEditStructure', () => {
  test('validates required fields', () => {
    // Test validation
  });

  test('handles form submission', () => {
    // Test soumission
  });

  test('handles logo upload', () => {
    // Test upload
  });
});

describe('MonCompte', () => {
  test('validates password change', () => {
    // Test changement mot de passe
  });

  test('handles tab navigation', () => {
    // Test navigation onglets
  });
});
```

---

## 📚 Ressources additionnelles

### Icons utilisées
- **Lucide React** : Icônes modernes et légères
- **FontAwesome** : Icônes classiques pour certains éléments

### Animations CSS
- **Keyframes personnalisées** : slideIn, fadeIn, shine, pulse
- **Transitions fluides** : 0.3s ease pour la plupart des interactions
- **Transform effects** : scale, translateY pour les hovers

### Compatibilité navigateurs
- **Modern browsers** : Chrome 80+, Firefox 78+, Safari 13+
- **Fallbacks** : Dégradation gracieuse pour backdrop-filter
- **Responsive** : Breakpoints à 640px et 520px

---

## ✅ Checklist d'implémentation

### Composant AddEditStructure
- [ ] Structure des props et états
- [ ] Validation des champs requis
- [ ] Gestion de l'upload d'image
- [ ] Intégration API (GET types, POST/PUT structure)
- [ ] Styles CSS avec animations
- [ ] Tests de validation

### Composant MonCompte
- [ ] Modal avec glassmorphisme
- [ ] Système d'onglets (Profil/Sécurité)
- [ ] Validation du changement de mot de passe
- [ ] Gestion des notifications
- [ ] Animations d'ouverture/fermeture
- [ ] Gestion des événements clavier

### Infrastructure
- [ ] Services API configurés
- [ ] Context utilisateur
- [ ] Variables d'environnement
- [ ] Structure des dossiers
- [ ] Gestion d'erreurs
- [ ] Tests unitaires

---

**🎯 Conclusion**

Ce guide fournit tous les éléments nécessaires pour reproduire fidèlement les composants AddEditStructure et MonCompte dans une nouvelle application. L'architecture modulaire et les styles bien documentés facilitent l'adaptation selon vos besoins spécifiques.

**Auteur :** Équipe Développement PayEcole
**Contact :** dev@payecole.com
**Dernière mise à jour :** 21 septembre 2025