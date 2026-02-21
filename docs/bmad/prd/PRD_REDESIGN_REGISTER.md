# PRD : Redesign Page Inscription - Glassmorphism Commerce

## 1. Contexte & Objectif

### Probleme actuel
La page `/register` comporte **3 etapes avec trop de champs** : type de structure, type de service, telephone Wave, etc. Les commercants du secteur informel senegalais sont souvent **peu familiers avec les formulaires complexes** et abandonnent l'inscription.

### Objectif
Reduire le formulaire a **2 etapes essentielles** avec un design **glassmorphism premium** (fond vert sombre + cartes translucides), des **animations CSS sophistiquees** guidant l'utilisateur, et une **celebration visuelle** (confetti/explosion) a la reussite.

### Public cible
Commercants du secteur informel au Senegal - priorite : simplicite, effet "wow", confiance.

---

## 2. Simplification des Champs

### Etape 1 : Identite (2 champs)
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| Nom de la structure | text, uppercase | Oui | Min 5 chars, verification unicite existante |
| Telephone Orange Money | tel, 9 chiffres | Oui | Prefixe +221, auto-copie vers Wave |

- **Wave auto-rempli** : `phoneWave = phoneOM` (invisible pour l'utilisateur)
- **Type de structure force** : `structureTypeId = 2` (COMMERCE, invisible)
- **Type de service force** : `serviceType = 'SERVICES'` (invisible)

### Etape 2 : Completer & Confirmer (3 champs + checkbox)
| Champ | Type | Requis | Notes |
|-------|------|--------|-------|
| Adresse | text, 1 ligne | Oui | Max 255 chars |
| Logo | upload image | Non | Composant LogoUpload existant |
| Code parrainage | text, uppercase | Non | Max 11 chars, defaut "FAYCLICK" |
| Accepter conditions | checkbox | Oui | Lien CGU/confidentialite |

### Champs supprimes de l'UI
- ~~Type de structure~~ (force a COMMERCE = 2)
- ~~Type de service~~ (force a SERVICES)
- ~~Telephone Wave~~ (auto = telephone OM)

---

## 3. Design System - Glassmorphism Vert

### 3.1 Palette de couleurs
```css
/* Fond principal - gradient sombre */
--reg-bg-primary: linear-gradient(135deg, #064e3b 0%, #065f46 30%, #047857 60%, #064e3b 100%);

/* Cartes glass */
--reg-glass-bg: rgba(255, 255, 255, 0.08);
--reg-glass-border: rgba(255, 255, 255, 0.15);
--reg-glass-blur: 20px;

/* Inputs glass */
--reg-input-bg: rgba(255, 255, 255, 0.12);
--reg-input-border: rgba(255, 255, 255, 0.20);
--reg-input-focus: rgba(16, 185, 129, 0.5);

/* Boutons */
--reg-btn-primary: linear-gradient(135deg, #10b981, #059669);
--reg-btn-hover: linear-gradient(135deg, #059669, #047857);

/* Textes */
--reg-text-primary: #ffffff;
--reg-text-secondary: rgba(255, 255, 255, 0.7);
--reg-text-muted: rgba(255, 255, 255, 0.5);

/* Accents */
--reg-accent-success: #34d399;
--reg-accent-error: #f87171;
--reg-accent-warning: #fbbf24;
--reg-accent-orange: #f59e0b;
```

### 3.2 Effets Glass
```css
.reg_glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.reg_glass-input {
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.20);
  border-radius: 16px;
  color: white;
  transition: all 0.3s ease;
}

.reg_glass-input:focus {
  border-color: rgba(16, 185, 129, 0.6);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
  background: rgba(255, 255, 255, 0.18);
}
```

### 3.3 Layout responsive
- **Mobile** (< 640px) : Carte pleine largeur, padding 16px
- **Tablet** (640-1024px) : Carte max-w-md centree, padding 24px
- **Desktop** (> 1024px) : Carte max-w-lg centree, padding 32px

---

## 4. Animations CSS (prefixe `reg_`)

### 4.1 Background anime
```css
/* Orbes lumineuses flottantes (3-4 cercles degrade) */
@keyframes reg_float-orb {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -20px) scale(1.1); }
  50% { transform: translate(-10px, 30px) scale(0.95); }
  75% { transform: translate(20px, 10px) scale(1.05); }
}

/* Grille subtile en overlay */
@keyframes reg_grid-pulse {
  0%, 100% { opacity: 0.03; }
  50% { opacity: 0.08; }
}
```

### 4.2 Transitions entre etapes
```css
/* Slide + fade pour le changement d'etape */
@keyframes reg_step-enter {
  from {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
    filter: blur(0);
  }
}

@keyframes reg_step-exit {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: translateX(-40px) scale(0.95);
    filter: blur(4px);
  }
}
```

### 4.3 Barre de progression animee
```css
/* Barre avec glow et particules */
@keyframes reg_progress-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
  50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.6); }
}

@keyframes reg_progress-shine {
  from { left: -100%; }
  to { left: 100%; }
}
```

### 4.4 Validation input en temps reel
```css
/* Pulse vert sur validation reussie */
@keyframes reg_valid-pulse {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(52, 211, 153, 0); }
  100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); }
}

/* Shake sur erreur */
@keyframes reg_error-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
```

### 4.5 Bouton "Suivant" avec micro-interactions
```css
/* Fleche qui pulse vers la droite */
@keyframes reg_arrow-pulse {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(4px); }
}

/* Bouton ripple au clic */
@keyframes reg_btn-ripple {
  0% { transform: scale(0); opacity: 0.5; }
  100% { transform: scale(4); opacity: 0; }
}
```

---

## 5. Animation de Celebration (Succes)

### 5.1 Explosion de confettis CSS
```css
/* 30-50 particules colorees qui explosent du centre */
@keyframes reg_confetti-burst {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(0);
    opacity: 0;
  }
}
```
- Couleurs : vert, dore, orange, blanc, emeraude
- Duree : 2.5s avec ease-out
- Generees via JS (30 particules avec positions aleatoires)

### 5.2 Checkmark anime SVG
```
Cercle vert qui se dessine (stroke-dasharray)
→ Checkmark qui se trace a l'interieur
→ Pulse de lumiere autour
→ Texte "Felicitations !" qui apparait
```

### 5.3 Sequence complete
1. **0.0s** : Fond s'assombrit legerement
2. **0.2s** : Cercle vert se dessine (SVG stroke animation)
3. **0.6s** : Checkmark se trace a l'interieur
4. **0.8s** : Explosion confettis (30 particules)
5. **1.0s** : Pulse lumineux autour du cercle
6. **1.5s** : Texte "Inscription Reussie !" apparait (fade + scale)
7. **2.0s** : Carte avec identifiants slide depuis le bas
8. **2.5s** : Confettis disparaissent, interface stable

---

## 6. Ecran de Succes (redesign)

### Layout post-celebration
Apres la celebration (confettis + SVG), afficher :

```
[Cercle vert animate + checkmark]

"Inscription Reussie !"
NOM DE LA STRUCTURE

---

[Carte glass : Code de connexion rapide]
  Envoye par SMS au +221 77XXXXXXX
  [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ]   <-- affichage du code OTP
  [Copier le code]

---

[Section retractable : Identifiants classiques]
  Login: xxx | Mot de passe: 0000
  "Changez le mot de passe des la 1ere connexion"

---

[Bouton principal vert] "Se connecter maintenant"
[Lien discret] "Fermer"
```

---

## 7. Structure des Fichiers

### Fichiers a modifier
| Fichier | Action |
|---------|--------|
| `app/register/page.tsx` | **MODIFIER** - Refonte complete du composant |
| `app/globals.css` | **MODIFIER** - Ajouter les classes CSS `reg_*` |

### Fichiers inchanges (reutilises)
| Fichier | Usage |
|---------|-------|
| `components/ui/LogoUpload.tsx` | Upload logo (composant existant) |
| `components/ui/SuccessModal.tsx` | Modal succes (composant existant, ajouter confettis) |
| `services/registration.service.ts` | Service inscription (inchange) |
| `services/sms.service.ts` | Envoi SMS OTP (inchange) |
| `types/registration.ts` | Types (inchange) |

---

## 8. Regles CSS - Convention `reg_`

Toutes les classes CSS specifiques a la page register et ses modals doivent etre prefixees `reg_` :

```css
/* Exemples de convention */
.reg_page          /* Container page */
.reg_glass-card    /* Carte glassmorphism */
.reg_glass-input   /* Input glassmorphism */
.reg_progress-bar  /* Barre de progression */
.reg_step-dots     /* Indicateur d'etapes */
.reg_btn-primary   /* Bouton principal */
.reg_btn-secondary /* Bouton secondaire */
.reg_orb           /* Orbe lumineuse de fond */
.reg_confetti      /* Particule confetti */
.reg_checkmark     /* SVG checkmark anime */
.reg_celebration   /* Container celebration */
.reg_error-shake   /* Animation erreur */
.reg_valid-pulse   /* Animation validation */
```

---

## 9. Plan d'Implementation

### Phase 1 : CSS Foundation
1. Ajouter toutes les classes `reg_*` dans `globals.css`
2. Keyframes animations (orbes, transitions, confettis, checkmark)
3. Variables CSS glassmorphism

### Phase 2 : Refonte Register Page
1. Nouveau layout fond sombre + orbes flottantes
2. Etape 1 : Nom structure + Telephone OM (glass card)
3. Etape 2 : Adresse + Logo + Code parrainage + CGU (glass card)
4. Forcer `structureTypeId=2`, `phoneWave=phoneOM`, `serviceType='SERVICES'`
5. Barre de progression animee (2 etapes au lieu de 3)
6. Transitions entre etapes (slide + blur)

### Phase 3 : Celebration & Succes
1. Composant confettis CSS (particules generees en JS)
2. SVG checkmark anime (stroke-dasharray)
3. Sequence de celebration (timing precise)
4. Redesign ecran succes (identifiants + bouton connexion)

### Phase 4 : Tests & Polish
1. Test mobile (iPhone SE, Galaxy S21)
2. Test tablet (iPad)
3. Test desktop
4. Verification flux complet : inscription → SMS → connexion
5. Test rate limiting
6. Test avec nom structure existant (erreur)

---

## 10. Criteres d'Acceptation

- [ ] **2 etapes** seulement (au lieu de 3)
- [ ] **Fond sombre vert** avec orbes lumineuses animees
- [ ] **Cartes glassmorphism** avec backdrop-blur et bordures translucides
- [ ] **Inputs glass** avec focus glow vert
- [ ] **Animations fluides** entre etapes (slide + blur + scale)
- [ ] **Barre de progression** avec glow anime
- [ ] **Validation temps reel** du nom (pulse vert / shake rouge)
- [ ] **Confettis CSS** a la reussite (30+ particules multicolores)
- [ ] **SVG checkmark anime** (stroke-dasharray)
- [ ] **Responsive** : mobile-first, beau sur tous les ecrans
- [ ] **Type structure = COMMERCE** (force, invisible)
- [ ] **Wave = OM** (auto-copie, invisible)
- [ ] **Toutes les classes CSS prefixees `reg_`**
- [ ] **Pas de regression** : le flux inscription → SMS OTP → connexion fonctionne
