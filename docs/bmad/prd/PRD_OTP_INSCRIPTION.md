# PRD : Connexion OTP simplifiee a l'inscription

> **Product Requirements Document** | Projet: FayClick V2

---

## Informations Generales

| Champ | Valeur |
|-------|--------|
| **Projet** | FayClick V2 |
| **Fonctionnalite** | Code OTP auto-genere a l'inscription pour connexion simplifiee |
| **Version PRD** | 1.0 |
| **Date creation** | 2026-02-21 |
| **Auteur** | SUPER_BMAD_AGENT |
| **Statut** | Draft |
| **Priorite** | Must Have |

---

## Objectif

### Resume Executif
Lors de la creation d'une structure sur FayClick, le backend retourne un login et un mot de passe. Ces identifiants sont difficiles a retenir et a saisir pour les commercants senegalais. L'objectif est de generer automatiquement un code OTP (5 chiffres) a partir du login/password retourne, de l'envoyer par SMS au numero de la structure, et de le stocker localement pour permettre une connexion simplifiee via les champs OTP deja existants sur la page de login (face arriere du flip 3D).

### Objectifs Mesurables
1. Reduire le temps de premiere connexion apres inscription de 60s a moins de 15s
2. Eliminer les erreurs de saisie login/password pour les nouveaux inscrits (taux d'echec premiere connexion < 5%)
3. Permettre la connexion par code OTP 5 chiffres tant que le mot de passe n'a pas ete change

---

## Contexte

### Probleme
Les commercants senegalais, cible principale de FayClick, ont des difficultes avec la saisie de logins et mots de passe classiques. Apres inscription, beaucoup echouent a leur premiere connexion car ils ne retiennent pas ou saisissent mal les identifiants fournis. Le taux d'abandon post-inscription est eleve.

### Situation Actuelle

**Flux d'inscription actuel (3 etapes) :**
1. Saisie nom de structure (verification unicite)
2. Details : type, telephone OM, telephone WAVE, adresse, logo
3. Resume + acceptation conditions

**Apres inscription :**
- La fonction PostgreSQL `add_edit_inscription()` retourne un message contenant `login: XXX | mot de passe: YYY`
- Le service `extractLoginInfo()` parse ce message (regex)
- Un SuccessModal affiche login/password (masquables, copiables)
- Redirection vers `/inscription-success` puis `/login?login=XXX`

**Connexion existante :**
- Page `/login` avec flip 3D : Face avant (login/password) + Face arriere (PIN 4 chiffres)
- Le PIN est stocke en localStorage (`fayclick_quick_pin`) encode base64
- Le PIN n'est disponible que si l'utilisateur l'a configure manuellement via son profil
- Composant `OTPInput` (5 chiffres) existe deja dans `components/coffre-fort/OTPInput.tsx`

**Probleme identifie :** Le PIN n'est jamais configure automatiquement. Le nouvel inscrit doit d'abord reussir a se connecter avec login/password, puis aller dans son profil pour configurer un PIN. La majorite ne le fait jamais.

### Impact Attendu

| Type d'impact | Description | Mesure |
|---------------|-------------|--------|
| Business | Reduction drastique des abandons post-inscription | Taux de premiere connexion reussie > 95% |
| Utilisateur | Connexion simplifiee des la creation du compte | Temps premiere connexion < 15s |
| Technique | Reutilisation du composant OTPInput et du flux PIN existant | 0 nouveau composant UI a creer |

---

## Utilisateurs Concernes

| Persona | Benefice Principal | Frequence d'utilisation | Priorite |
|---------|-------------------|------------------------|----------|
| Nouveau commercant | Se connecte immediatement apres inscription avec un simple code 5 chiffres | Premiere connexion puis quotidien | Haute |
| Commercant existant (n'a jamais configure PIN) | Peut demander un code OTP pour se connecter facilement | Quotidien | Moyenne |
| Admin systeme | Peut voir si un utilisateur utilise encore le code OTP par defaut | Ponctuel | Faible |

### Parcours Utilisateur (User Journey)

```
1. L'utilisateur complete l'inscription (3 etapes)
   |
2. Backend cree la structure, retourne login + password
   |
3. Frontend genere un code OTP 5 chiffres aleatoire
   |
4. Le code OTP est stocke en localStorage (fayclick_quick_pin)
   avec le login et password en arriere-plan
   |
5. SMS envoye au numero OM de la structure avec le code OTP
   |
6. SuccessModal affiche le code OTP (pas le login/password)
   + message "Utilisez ce code pour vous connecter"
   |
7. Redirection vers /login en mode PIN (face arriere du flip)
   |
8. L'utilisateur saisit les 5 chiffres du code OTP
   |
9. Le systeme utilise le login/password stockes pour se connecter
   |
10. Connexion reussie ! Dashboard affiche.
```

---

## Exigences Fonctionnelles

### Epic 1 : Generation et envoi du code OTP a l'inscription

#### US-OTP-001 : Generer un code OTP 5 chiffres apres inscription reussie

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-001 |
| **Priorite** | Must Have |
| **Points** | 3 |

**En tant que** nouveau commercant
**Je veux** qu'un code OTP soit genere automatiquement apres mon inscription
**Afin de** pouvoir me connecter facilement sans retenir login/password

**Criteres d'Acceptance :**
- [ ] **CA1** : Apres `registerMerchant()` reussie et extraction login/password, un code OTP de 5 chiffres aleatoires est genere
- [ ] **CA2** : Le code OTP est stocke en localStorage (`fayclick_quick_pin`) au format existant : `{ pin: "12345", login: "xxx", pwd: "yyy", lastMode: "pin" }`
- [ ] **CA3** : Le code OTP ne commence jamais par 0 (premier chiffre 1-9, les 4 suivants 0-9)

**Regles Metier :**
- Le code est genere cote frontend (pas de nouvel endpoint backend)
- Format identique au PIN existant pour reutiliser le flux de connexion PIN
- Le code est encode en base64 comme le PIN existant

**Notes Techniques :**
- Fonction a ajouter dans `services/registration.service.ts` : `generateOTPCode(): string`
- Stockage identique a celui de `fayclick_quick_pin` dans `app/login/page.tsx`

---

#### US-OTP-002 : Envoyer le code OTP par SMS au numero de la structure

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-002 |
| **Priorite** | Must Have |
| **Points** | 2 |

**En tant que** nouveau commercant
**Je veux** recevoir mon code de connexion par SMS
**Afin de** l'avoir meme si je quitte la page avant de le noter

**Criteres d'Acceptance :**
- [ ] **CA1** : Un SMS est envoye au numero OM saisi lors de l'inscription
- [ ] **CA2** : Le SMS contient : "Bienvenue sur FayClick! Votre code de connexion rapide : {CODE}. Saisissez-le sur la page de connexion. Gardez-le precieusement!"
- [ ] **CA3** : L'envoi SMS ne bloque pas l'affichage du SuccessModal (appel asynchrone)
- [ ] **CA4** : Si l'envoi SMS echoue, l'inscription reste valide et le code est quand meme affiche

**Regles Metier :**
- Utiliser `smsService.sendNotificationSMS(phoneOM, message)` existant
- L'envoi est "best effort" : pas de retry, pas de blocage

**Notes Techniques :**
- Service existant : `services/sms.service.ts` avec `sendNotificationSMS()`
- API : PostgreSQL `add_pending_sms()` via le service existant

---

#### US-OTP-003 : Afficher le code OTP dans le modal et la page de succes

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-003 |
| **Priorite** | Must Have |
| **Points** | 3 |

**En tant que** nouveau commercant
**Je veux** voir clairement mon code de connexion apres inscription
**Afin de** pouvoir l'utiliser immediatement

**Criteres d'Acceptance :**
- [ ] **CA1** : Le SuccessModal dans `/register` affiche le code OTP en gros (taille 2xl+, espacement entre chiffres) au lieu du login/password
- [ ] **CA2** : Le login/password sont toujours affiches mais en section secondaire repliable ("Identifiants avances")
- [ ] **CA3** : Un message clair indique : "Utilisez ce code pour vous connecter rapidement"
- [ ] **CA4** : Un bouton "Copier le code" est disponible
- [ ] **CA5** : La page `/inscription-success` affiche egalement le code OTP en priorite avec les memes principes
- [ ] **CA6** : Le SMS envoye est confirme visuellement ("Code envoye par SMS au 77XXXXXXX")

**Notes Techniques :**
- Modifier le `SuccessModal` dans `app/register/page.tsx`
- Modifier `app/inscription-success/page.tsx` pour recevoir le code OTP en parametre URL
- Le code OTP est passe via URL param `otp=12345`

---

### Epic 2 : Connexion par code OTP

#### US-OTP-004 : Rediriger vers la page login en mode OTP apres inscription

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-004 |
| **Priorite** | Must Have |
| **Points** | 2 |

**En tant que** nouveau commercant
**Je veux** arriver directement sur le formulaire de saisie du code OTP
**Afin de** ne pas chercher comment basculer entre les modes de connexion

**Criteres d'Acceptance :**
- [ ] **CA1** : Le bouton "Acceder a mon Dashboard" redirige vers `/login?mode=pin`
- [ ] **CA2** : La page `/login` detecte `mode=pin` et affiche directement la face arriere (flip)
- [ ] **CA3** : Le composant OTPInput de la face arriere utilise `length=5` (au lieu de 4)

**Regles Metier :**
- Le flip s'effectue automatiquement si `mode=pin` est dans l'URL
- Le message d'aide affiche "Saisissez votre code de connexion a 5 chiffres"

**Notes Techniques :**
- Modifier `app/login/page.tsx` : lire `searchParams.get('mode')` et declencher le flip
- Adapter la longueur OTPInput : `length={5}` au lieu de `length={4}`
- Le PIN existant de 4 chiffres doit continuer a fonctionner (retro-compatible)

---

#### US-OTP-005 : Authentification via code OTP stocke en localStorage

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-005 |
| **Priorite** | Must Have |
| **Points** | 2 |

**En tant que** commercant
**Je veux** me connecter en saisissant mon code a 5 chiffres
**Afin de** ne jamais avoir a saisir login et mot de passe

**Criteres d'Acceptance :**
- [ ] **CA1** : La saisie complete des 5 chiffres declenche automatiquement la verification
- [ ] **CA2** : Le code saisi est compare au `pin` stocke dans `fayclick_quick_pin` (localStorage)
- [ ] **CA3** : Si le code correspond, le `login` et `pwd` stockes sont utilises pour appeler `authContext.login()`
- [ ] **CA4** : Si le code est incorrect, un message d'erreur s'affiche avec animation shake
- [ ] **CA5** : Apres 3 echecs consecutifs, basculer automatiquement vers le mode login/password

**Regles Metier :**
- Le flux d'authentification complet (`completeLogin()`) est identique au login classique
- Le code OTP n'est qu'un "raccourci local" vers les vraies credentials

**Notes Techniques :**
- Le flux existant `handlePinLogin()` dans `app/login/page.tsx` gere deja ca pour le PIN 4 chiffres
- Il suffit d'adapter la longueur et le message d'erreur

---

### Epic 3 : Cycle de vie du code OTP

#### US-OTP-006 : Invalider le code OTP au changement de mot de passe

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-006 |
| **Priorite** | Must Have |
| **Points** | 2 |

**En tant que** commercant ayant change son mot de passe
**Je veux** que mon ancien code OTP soit automatiquement invalide
**Afin de** garantir la securite de mon compte

**Criteres d'Acceptance :**
- [ ] **CA1** : Lorsque l'utilisateur change son mot de passe (page `/settings` ou profil), le `fayclick_quick_pin` est supprime du localStorage
- [ ] **CA2** : Un message informe l'utilisateur : "Votre code de connexion rapide a ete reinitialise. Vous devrez vous connecter avec votre nouveau mot de passe."
- [ ] **CA3** : L'utilisateur peut ensuite configurer un nouveau PIN depuis son profil

**Regles Metier :**
- Le champ `pwd_changed` retourne par `check_user_credentials()` peut etre utilise pour detecter si le mot de passe a change
- Si `pwd_changed = true` et que le `pwd` stocke dans `fayclick_quick_pin` ne correspond plus, supprimer le PIN

**Notes Techniques :**
- Modifier la page `/settings` (section changement mot de passe) pour supprimer `fayclick_quick_pin`
- Ajouter une verification dans `handlePinLogin()` : si login echoue avec credentials du PIN, supprimer le PIN

---

#### US-OTP-007 : Detecter et afficher le mode de connexion recommande

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-007 |
| **Priorite** | Should Have |
| **Points** | 2 |

**En tant que** utilisateur revenant sur la page de login
**Je veux** voir directement le mode de connexion le plus adapte
**Afin de** ne pas perdre de temps a chercher

**Criteres d'Acceptance :**
- [ ] **CA1** : Si `fayclick_quick_pin` existe en localStorage, la page login affiche la face OTP par defaut
- [ ] **CA2** : Si aucun PIN n'est configure, la face login/password est affichee par defaut
- [ ] **CA3** : Un lien "Se connecter avec login/mot de passe" permet de basculer vers l'autre face
- [ ] **CA4** : Le `lastMode` stocke dans `fayclick_quick_pin` est respecte

**Notes Techniques :**
- La logique existe deja partiellement dans `app/login/page.tsx` avec `hasPinConfigured`
- Il faut renforcer la detection au chargement de la page

---

#### US-OTP-008 : Regenerer un code OTP depuis le profil

| Champ | Valeur |
|-------|--------|
| **ID** | US-OTP-008 |
| **Priorite** | Could Have |
| **Points** | 3 |

**En tant que** commercant connecte
**Je veux** pouvoir regenerer un nouveau code OTP depuis mon profil
**Afin de** changer mon code si je pense qu'il a ete compromis

**Criteres d'Acceptance :**
- [ ] **CA1** : Dans la page `/settings`, une section "Code de connexion rapide" permet de voir/regenerer le code
- [ ] **CA2** : La regeneration genere un nouveau code 5 chiffres et met a jour le localStorage
- [ ] **CA3** : Le nouveau code est envoye par SMS au numero de la structure
- [ ] **CA4** : Un message confirme "Nouveau code genere et envoye par SMS"

**Notes Techniques :**
- Reutiliser `generateOTPCode()` et `smsService.sendNotificationSMS()`

---

## Exigences Non-Fonctionnelles

### Performance

| Critere | Exigence | Priorite |
|---------|----------|----------|
| Generation code OTP | < 10ms (calcul local) | Haute |
| Envoi SMS | < 3s (asynchrone, non bloquant) | Moyenne |
| Verification PIN au login | < 50ms (comparaison localStorage) | Haute |

### Securite
- [ ] Le code OTP est stocke encode en base64 (comme le PIN existant)
- [ ] Le login/password stockes dans `fayclick_quick_pin` sont encodes
- [ ] Le code OTP est invalide automatiquement si le mot de passe change
- [ ] Apres 3 tentatives echouees, basculement vers login/password
- [ ] Le code OTP n'est PAS un token d'authentification : il sert uniquement a retrouver les credentials locales

### Accessibilite
- [ ] Champs OTP navigables au clavier (Tab, Backspace, fleches)
- [ ] Chiffres suffisamment grands pour les utilisateurs moins alphabetises
- [ ] Feedback visuel clair (vert = correct, rouge = erreur, shake animation)
- [ ] Message SMS en francais simple et clair

### Compatibilite

| Environnement | Support | Notes |
|---------------|---------|-------|
| Mobile (PWA) | Requis | Cible principale : smartphones Android |
| Desktop | Requis | Chrome, Firefox, Edge |
| Multi-appareils | Note importante | Le code OTP est stocke par appareil (localStorage). Sur un autre appareil, il faudra le login/password |

---

## Dependances

### Dependances Internes

| Fonctionnalite/Module | Type | Statut |
|-----------------------|------|--------|
| Formulaire d'inscription (`/register`) | Modification requise | Disponible |
| Page login flip 3D (`/login`) | Modification requise | Disponible |
| Composant OTPInput | Reutilisation | Disponible |
| Service SMS | Reutilisation | Disponible |
| localStorage `fayclick_quick_pin` | Reutilisation pattern | Disponible |

### Dependances Externes

| Service/API | Usage | Documentation |
|-------------|-------|---------------|
| API SMS (`add_pending_sms`) | Envoi code OTP par SMS | services/sms.service.ts |

### Dependances Base de Donnees
```sql
-- Fonctions existantes (aucune modification requise)
SELECT add_edit_inscription(...);        -- Creation structure
SELECT check_user_credentials(login, pwd); -- Verification connexion
SELECT add_pending_sms(sender, client, phone, message); -- Envoi SMS
```

Aucune nouvelle table ou fonction PostgreSQL requise. Tout repose sur l'existant.

---

## Risques et Mitigations

| ID | Risque | Probabilite | Impact | Mitigation |
|----|--------|-------------|--------|------------|
| R1 | L'utilisateur efface son localStorage (perd le code) | Moyenne | Moyen | Peut toujours se connecter avec login/password. Peut demander un reset |
| R2 | L'utilisateur change d'appareil (pas de code sur le nouveau) | Haute | Moyen | Login/password reste disponible. Future feature : associer code au compte cote serveur |
| R3 | SMS non recu (operateur, probleme reseau) | Faible | Faible | Le code est affiche a l'ecran et peut etre copie |
| R4 | Code OTP devine par brute force (5 chiffres = 90000 combinaisons) | Faible | Moyen | Verrou apres 3 tentatives + code stocke localement uniquement |

---

## Matrice de Tracabilite

| Epic | Nom | User Stories | Estimation |
|------|-----|-------------|------------|
| EPIC-1 | Generation et envoi OTP a l'inscription | US-OTP-001, US-OTP-002, US-OTP-003 | 3 stories, 8 points |
| EPIC-2 | Connexion par code OTP | US-OTP-004, US-OTP-005 | 2 stories, 4 points |
| EPIC-3 | Cycle de vie du code OTP | US-OTP-006, US-OTP-007, US-OTP-008 | 3 stories, 7 points |
| **TOTAL** | | **8 stories** | **19 points** |

### Prioritisation

| Priorite | Nombre | Stories |
|----------|--------|---------|
| Must Have | 6 | US-OTP-001 a 006 |
| Should Have | 1 | US-OTP-007 |
| Could Have | 1 | US-OTP-008 |

---

## Planning Estime

| Phase | Duree | Responsable |
|-------|-------|-------------|
| Epic 1 : Generation + SMS + UI | 1 session | Developer |
| Epic 2 : Login OTP | 1 session | Developer |
| Epic 3 : Cycle de vie | 1 session | Developer |
| Tests + deploiement | 1 session | Developer + QA |
| **Total** | **2-3 sessions** | |

---

## Criteres de Validation Globaux (Definition of Done)

### Fonctionnel
- [ ] Inscription cree le code OTP et l'envoie par SMS
- [ ] Le code OTP est affiche dans le modal de succes et la page succes
- [ ] La page login s'ouvre en mode OTP quand PIN configure
- [ ] Connexion OTP 5 chiffres fonctionne de bout en bout
- [ ] Changement de mot de passe invalide le code OTP
- [ ] Login/password classique continue de fonctionner

### Technique
- [ ] Build production reussi sans erreur
- [ ] Pas de regression sur le flux PIN 4 chiffres existant
- [ ] Pas de regression sur le flux login/password
- [ ] Code OTP encode en base64 dans localStorage

### Deploiement
- [ ] Deploye sur v2.fayclick.net et fayclick.com
- [ ] Teste en navigation privee
- [ ] Hard refresh effectue apres deploiement

---

## Historique des Modifications

| Date | Version | Auteur | Modifications |
|------|---------|--------|---------------|
| 2026-02-21 | 1.0 | SUPER_BMAD_AGENT | Creation initiale |
