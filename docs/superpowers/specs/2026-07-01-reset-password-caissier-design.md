# Design — Réinitialisation MDP caissier dans /settings (onglet Utilisateurs)

- **Date** : 2026-07-01
- **Branche** : dédiée (à créer depuis la base actuelle) — `feat/reset-password-caissier-settings`
- **Composant cible** : `components/settings/UsersManagement.tsx`
- **Statut** : Phase 1 validée (reset caissier). Phase 2 (représentants) = périmètre séparé, documentée en annexe.

## 1. Problème

Dans `/settings` → onglet **Utilisateurs**, chaque carte caissier n'expose que **3 icônes** : Droits (`Shield`), Modifier (`Edit3`), Supprimer (`Trash2`). Il manque une action **Réinitialiser le mot de passe**. La fonction PostgreSQL `reset_user_password(pid_utilisateur)` existe déjà et est déjà câblée dans l'app (dashboard admin).

## 2. Objectif (Phase 1)

Ajouter une **4ᵉ icône** « Réinitialiser le mot de passe » sur chaque carte caissier, en **réutilisant** le composant et le service existants — zéro nouvelle logique sensible, zéro nouvelle fonction BD.

Hors périmètre Phase 1 : gestion dédiée des représentants (édition / activation / désactivation / reset MDP rep) — voir annexe.

## 3. Faits BD confirmés (audit dba_master, 2026-07-01)

`reset_user_password(pid_utilisateur integer) RETURNS varchar` :
- Aucun filtre sur `id_profil` — fonctionne sur n'importe quelle ligne `utilisateur`.
- Génère un MDP aléatoire de 8 caractères (alphabet sans ambigus), `UPDATE pwd = crypt(...bf)`, `pwd_changed = false`.
- **Retourne le MDP en clair** (VARCHAR). Retourne `'NOK'` si l'`id` n'existe pas.
- **Aucun contrôle d'appelant interne** (`EXECUTE` accordé à `PUBLIC`) → un admin de structure peut l'appeler depuis `/settings`.
- **Aucun garde-fou de scope structure** côté serveur. Mitigation : le front ne cible que des utilisateurs issus de `get_list_utilisateurs(pid_structure)`, donc toujours dans la structure courante. → Limite connue, pas de correctif BD en Phase 1.

## 4. Architecture de la solution

### 4.1 Composants réutilisés (aucune modification)

- `components/admin/ModalConfirmResetPassword.tsx` — modal générique déjà en place :
  - Props : `isOpen`, `onClose`, `idUtilisateur`, `username`, `login`, `nomStructure`, `telephone`.
  - Flux 2 étapes : **confirmation** → **succès** (affichage du MDP en clair une seule fois).
  - Bouton **Copier**, envoi **WhatsApp** (template `fayclick_admin_message`), fermeture sécurisée.
  - Sécurité : MDP jamais persisté (localStorage/sessionStorage), jamais loggé, retiré du state à la fermeture.
  - Appelle déjà `adminService.resetUserPassword({ id_utilisateur, id_admin })`.
- `services/admin.service.ts` → `resetUserPassword()` — inchangé. Loggue une action `RESET_PASSWORD` (non bloquant).
- Thème : le modal est sombre (dashboard admin), affiché en overlay au-dessus des réglages clairs. **Réutilisé tel quel** (décision utilisateur) — acceptable pour une modale.

### 4.2 Modifications — `components/settings/UsersManagement.tsx`

1. **Imports** :
   - Ajouter `Key` à l'import `lucide-react`.
   - `import ModalConfirmResetPassword from '@/components/admin/ModalConfirmResetPassword';`
2. **État** :
   ```ts
   const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
   const [resetPasswordUser, setResetPasswordUser] = useState<{
     id: number; username: string; login: string;
     telephone: string; nomStructure: string;
   } | null>(null);
   ```
3. **Handler d'ouverture** :
   ```ts
   const handleOpenResetPassword = (userData: UtilisateurData) => {
     setResetPasswordUser({
       id: userData.id,
       username: userData.username,
       login: userData.login || `${userData.telephone}${loginSuffix}`,
       telephone: userData.telephone,
       nomStructure: userData.structure?.nom_structure || '',
     });
     setShowResetPasswordModal(true);
   };
   ```
4. **4ᵉ bouton** dans la rangée d'actions de la carte caissier (`components/settings/UsersManagement.tsx`, entre Modifier et Supprimer), avec `stopPropagation` non requis (carte non cliquable) mais cohérence de style :
   ```tsx
   <button
     onClick={() => handleOpenResetPassword(userData)}
     className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
     title="Réinitialiser le mot de passe"
   >
     <Key className="h-5 w-5" />
   </button>
   ```
5. **Rendu du modal** (dans le bloc `AnimatePresence` ou à côté, il gère son propre overlay) :
   ```tsx
   <ModalConfirmResetPassword
     isOpen={showResetPasswordModal}
     onClose={() => { setShowResetPasswordModal(false); setResetPasswordUser(null); }}
     idUtilisateur={resetPasswordUser?.id ?? null}
     username={resetPasswordUser?.username ?? ''}
     login={resetPasswordUser?.login ?? ''}
     nomStructure={resetPasswordUser?.nomStructure ?? ''}
     telephone={resetPasswordUser?.telephone ?? ''}
   />
   ```
   `id_admin` est résolu à l'intérieur du modal via `useAuth().user.id` (admin de structure courant).

### 4.3 Portée d'affichage

- Bouton reset présent uniquement sur les **cartes caissier** (liste `caissiers`). La carte **admin** reste sans action (inchangée).
- Les représentants (id_profil=10) remontent actuellement dans la liste `caissiers` et hériteront donc du bouton reset générique — comportement acceptable (le reset fonctionne sur eux). Leur séparation en section dédiée est traitée en Phase 2.

## 5. Data flow

```
Carte caissier → clic icône Key
  → handleOpenResetPassword(userData) → resetPasswordUser + showResetPasswordModal=true
  → ModalConfirmResetPassword (étape confirm)
    → adminService.resetUserPassword({ id_utilisateur, id_admin })
      → SELECT reset_user_password(id) → MDP clair
  → étape success : affichage MDP + Copier + WhatsApp
  → Fermer → state nettoyé (MDP effacé)
```

## 6. Gestion d'erreurs

- Réponse `'NOK'` / `success=false` → le modal reste à l'étape confirm + toast d'erreur (déjà géré).
- Log d'audit non bloquant (échec log ≠ échec reset).
- Aucun `id` cible manquant : bouton reset désactivé si `idUtilisateur` null (déjà géré dans le modal).

## 7. Tests / vérification manuelle

1. Compte commerce de test (structure 218, `admin@chezkelefa.fay`).
2. `/settings` → onglet Utilisateurs → carte caissier → clic icône Key.
3. Confirmer → vérifier affichage du MDP en clair (8 car.), bouton Copier, bouton WhatsApp.
4. Se reconnecter avec le caissier + nouveau MDP → vérifier obligation de changer le MDP (`pwd_changed=false`).
5. Vérifier que la carte admin n'a pas le bouton reset.

## 8. Annexe — Phase 2 : gestion dédiée des représentants (périmètre séparé)

Documentée ici pour mémoire. **Non implémentée en Phase 1.**

- Profil : `REPRESENTANT` = `id_profil 10`.
- Fetch liste + champs d'édition : `get_representants_structure(p_id_structure, p_actifs_seul)` → JSON avec `nom_rep, prenom_rep, email_rep, telephone_terrain, id_localite, localite{...}, mode_encaissement, actif, actif_reseau, pwd_changed`, + stats (`nb_produits_affectes, nb_ventes_mois, solde_du`).
- Localités (`<select>`) : `get_localites_disponibles()` → 24 lignes (id_localite, nom_localite, commune, département, région).
- Édition : `modifier_representant(p_id_structure, p_username, p_tel_user, p_telephone_terrain, p_nom_rep, p_prenom_rep, p_email_rep, p_id_localite, p_mode_encaissement, p_id_user)` — ⚠️ l'identifiant de la ligne est **`p_id_user`** (dernier paramètre). Ne touche pas login/pwd/username. `mode_encaissement ∈ {WALLET_STRUCTURE, LIBRE}`.
- Activation : `reactiver_representant(p_id_structure, p_id_representant, p_id_admin)` → `actif_reseau=TRUE`.
- Désactivation : `suspendre_representant(p_id_structure, p_id_representant, p_id_admin)` → `actif_reseau=FALSE`.
- Reset MDP rep : `reinitialiser_pwd_representant(p_id_structure, p_id_representant, p_nouveau_pwd_hash, p_id_admin)` — ⚠️ **exige un hash bcrypt pré-calculé** (`crypt(pwd, gen_salt('bf'))`). Le front statique ne peut pas produire ce hash proprement.
  - **Décision Phase 2 à trancher** : soit (a) hasher côté backend (`kader_backend`, bcryptjs), soit (b) créer une variante DBA `reinitialiser_pwd_representant_auto(p_id_structure, p_id_representant, p_id_admin)` qui génère + hash en interne (calquée sur `create_representant`), retournant le clair — pattern identique à `reset_user_password`. Option (b) recommandée pour rester front-statique.
- UX Phase 2 : séparer les représentants de la liste `caissiers` (filtre `id_profil !== 10`) et créer une section/onglet dédié avec un **modal représentant** distinct (édition + toggle activation + reset MDP).
