# Reset MDP Caissier (/settings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une 4ᵉ icône « Réinitialiser le mot de passe » sur chaque carte caissier de l'onglet Utilisateurs de `/settings`, en réutilisant le modal admin existant.

**Architecture:** Modification unique de `components/settings/UsersManagement.tsx` : un bouton `Key` ouvre `ModalConfirmResetPassword` (composant admin générique déjà en place) qui appelle `adminService.resetUserPassword()` → PG `reset_user_password(id)`. Aucune nouvelle fonction service ni BD.

**Tech Stack:** Next.js 14 / React 18 / TypeScript, framer-motion, lucide-react, sonner.

## Global Constraints

- Langue UI/commentaires : **français**.
- Pas d'infra de tests automatisés dans ce projet → vérification par `npm run lint` + `npm run build` + test manuel navigateur (port 3000).
- Le MDP en clair ne doit **jamais** être persisté ni loggé (déjà garanti par `ModalConfirmResetPassword`).
- Icône reset uniquement sur les **cartes caissier** (liste `caissiers`), pas sur la carte admin.
- Branche : `feat/reset-password-caissier-settings` (déjà créée depuis `origin/main`).
- Réutiliser `ModalConfirmResetPassword` tel quel (thème sombre) — décision utilisateur validée.
- `nomStructure` passé au modal = `userData.structure?.nom_structure || ''`.
- `login` passé au modal = `userData.login || \`${userData.telephone}${loginSuffix}\``.
- `id_admin` est résolu **dans** le modal via `useAuth().user.id` — ne pas le passer en prop.

---

### Task 1 : Câbler le bouton reset MDP + le modal dans UsersManagement

**Files:**
- Modify: `components/settings/UsersManagement.tsx`

**Interfaces:**
- Consumes (existant, ne pas modifier) :
  - `ModalConfirmResetPassword` — export **default** ET nommé depuis `components/admin/ModalConfirmResetPassword.tsx`. Props : `{ isOpen: boolean; onClose: () => void; idUtilisateur: number | null; username: string; login: string; nomStructure: string; telephone: string }`.
  - `UtilisateurData` (déjà importé) : champs utilisés `id`, `username`, `login`, `telephone`, `structure.nom_structure`.
  - `loginSuffix` (déjà calculé dans le composant, ligne ~41).
- Produces : aucune interface consommée ailleurs (feature autonome).

- [ ] **Step 1 : Ajouter les imports**

Dans l'import `lucide-react` existant (ligne 10), ajouter `Key` :

```tsx
import { Users, Phone, Shield, Edit3, X, Save, Loader2, Trash2, AlertTriangle, Key } from 'lucide-react';
```

Sous l'import de `ModalDroitsUtilisateur` (ligne 20), ajouter :

```tsx
import ModalConfirmResetPassword from '@/components/admin/ModalConfirmResetPassword';
```

- [ ] **Step 2 : Ajouter l'état du modal reset**

Après l'état `droitsUser` (ligne ~58), ajouter :

```tsx
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{
    id: number;
    username: string;
    login: string;
    telephone: string;
    nomStructure: string;
  } | null>(null);
```

- [ ] **Step 3 : Ajouter le handler d'ouverture**

Après `handleCancelDelete` (ligne ~250), ajouter :

```tsx
  // Ouvrir le modal de réinitialisation du mot de passe
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

- [ ] **Step 4 : Ajouter la 4ᵉ icône dans la rangée d'actions de la carte caissier**

Dans le bloc `{/* Boutons d'action */}` (ligne ~404), insérer le bouton `Key` **entre** le bouton Modifier (`Edit3`) et le bouton Supprimer (`Trash2`) :

```tsx
                <button
                  onClick={() => handleOpenResetPassword(userData)}
                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Réinitialiser le mot de passe"
                >
                  <Key className="h-5 w-5" />
                </button>
```

Résultat attendu : ordre des icônes = Droits (`Shield`, indigo) → Modifier (`Edit3`, bleu) → **Reset (`Key`, orange)** → Supprimer (`Trash2`, rouge).

- [ ] **Step 5 : Rendre le modal reset**

Juste avant la fermeture de `</AnimatePresence>` (ligne ~841, après le bloc `ModalDroitsUtilisateur`), ajouter le rendu du modal. `ModalConfirmResetPassword` gère son propre overlay et sa propre `AnimatePresence` interne — le placer à l'intérieur du wrapper `AnimatePresence` existant est sans effet de bord (il ne dépend pas d'une clé d'animation du parent) :

```tsx
        {/* Modal de réinitialisation du mot de passe */}
        <ModalConfirmResetPassword
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false);
            setResetPasswordUser(null);
          }}
          idUtilisateur={resetPasswordUser?.id ?? null}
          username={resetPasswordUser?.username ?? ''}
          login={resetPasswordUser?.login ?? ''}
          nomStructure={resetPasswordUser?.nomStructure ?? ''}
          telephone={resetPasswordUser?.telephone ?? ''}
        />
```

- [ ] **Step 6 : Vérifier le lint**

Run: `npm run lint`
Expected: aucune nouvelle erreur/warning sur `components/settings/UsersManagement.tsx` (notamment : `Key` importé et utilisé, `ModalConfirmResetPassword` importé et utilisé, pas de variable inutilisée).

- [ ] **Step 7 : Vérifier le build**

Run: `npm run build`
Expected: build réussi (pas d'erreur TypeScript). Si échec `MODULE_NOT_FOUND`, supprimer `.next` (`rm -rf .next`) et relancer.

- [ ] **Step 8 : Commit**

```bash
git add components/settings/UsersManagement.tsx
git commit -m "$(cat <<'EOF'
✨ feat(settings): bouton réinitialiser MDP caissier (onglet Utilisateurs)

4ᵉ icône (Key) sur chaque carte caissier → ModalConfirmResetPassword existant
→ reset_user_password(). Aucune nouvelle fonction service/BD.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2 : Vérification manuelle en navigateur

**Files:** aucun (test manuel).

**Interfaces:** N/A.

- [ ] **Step 1 : Lancer le serveur de dev**

Run: `npm run dev` (port 3000). Si le port est occupé, demander une capture d'écran à l'utilisateur.

- [ ] **Step 2 : Se connecter au compte de test**

Compte commerce structure 218 : `admin@chezkelefa.fay` / `777301221@`.

- [ ] **Step 3 : Naviguer vers l'onglet Utilisateurs**

`/settings` → onglet **Utilisateurs**.
Attendu : chaque carte caissier affiche **4 icônes** dans l'ordre Droits / Modifier / **Reset (Key orange)** / Supprimer. La carte admin (bandeau vert « Principal ») n'a **aucune** icône d'action.

- [ ] **Step 4 : Déclencher un reset**

Cliquer l'icône Key d'un caissier → le modal (thème sombre) s'ouvre à l'étape confirmation avec username / login / structure / téléphone corrects.
Cliquer « Réinitialiser le mot de passe » → étape succès : MDP en clair (8 caractères) affiché, boutons **Copier** et **Envoyer par WhatsApp** présents.

- [ ] **Step 5 : Vérifier Copier + fermeture**

Cliquer Copier → toast « Mot de passe copié ». Cliquer Fermer → le modal se ferme, le MDP disparaît de l'écran.

- [ ] **Step 6 : Vérifier l'effet backend (obligation de changer le MDP)**

Se déconnecter, se reconnecter avec le login du caissier + le nouveau MDP → l'application doit demander le changement de mot de passe (`pwd_changed=false`).

- [ ] **Step 7 : Restaurer / nettoyer**

Ne pas laisser un caissier de la structure réelle 218 avec un MDP inconnu de son titulaire : soit prévenir le titulaire du nouveau MDP, soit refaire un reset communiqué. Consigner l'action dans le rapport de test.

---

## Self-Review

**Spec coverage :**
- §2 Objectif (4ᵉ icône reset) → Task 1 Steps 4-5. ✅
- §4.1 Réutilisation modal/service sans modification → Task 1 (aucune modif de `ModalConfirmResetPassword`/`admin.service`). ✅
- §4.2 Imports / état / handler / bouton / rendu → Task 1 Steps 1-5. ✅
- §4.3 Portée (caissiers uniquement, admin sans action) → Task 1 Step 4 (bouton dans le `.map(caissiers)`) + Task 2 Step 3. ✅
- §6 Gestion d'erreurs → déléguée au modal existant (documenté §4.1) ; rien à implémenter. ✅
- §7 Tests manuels → Task 2. ✅
- Annexe Phase 2 (représentants) → hors périmètre, non planifié (conforme). ✅

**Placeholder scan :** aucun TODO/TBD ; tout le code des steps est complet. ✅

**Type consistency :** props de `ModalConfirmResetPassword` (`idUtilisateur: number | null`, `username/login/nomStructure/telephone: string`) cohérentes entre le bloc Interfaces, l'état `resetPasswordUser`, et le rendu Step 5. `id_admin` volontairement non passé (résolu dans le modal). ✅
