# Stage A — Restauration gestion Représentants dans /settings

> Restauration ciblée du module Représentants (onglet /settings uniquement) depuis la branche locale `feature/reseau-distribution-representants`, avec réconciliation du service contre les signatures PROD actuelles. Le dashboard représentant + stock + reversements = Stage B (ultérieur).

**Base** : `origin/main` (Stage A n'utilise pas le WIP suppression — le module utilise suspendre/reactiver, pas delete). Branche : `feat/representants-settings-stage-a`.

**Gating** : `compte_distributeur === true` (exposé `get_une_structure().data.compte_distributeur`). Raison : `create_representant` exige en dur `compte_distributeur=TRUE` (sinon `MODULE_INACTIF`). Test sur structure **183 (TECH24)**.

## Source (à porter depuis `feature/reseau-distribution-representants`)

`git show feature/reseau-distribution-representants:<path>` pour récupérer, puis RÉCONCILIER :
- `types/representant.ts`
- `services/representant.service.ts`
- `components/representants/RepresentantCard.tsx`
- `components/representants/ModalCreerRepresentant.tsx`
- `components/settings/RepresentantsManagement.tsx`
- câblage onglet dans `app/settings/page.tsx` (lignes ~39, 91, 173-174, 807-810, 1101-1106 sur la branche)

**NE PAS porter** (Stage B) : `ModalAffecterStock.tsx`, `app/dashboard/representant/*`, services `affectation/reversement/vente-representant/reseau-distribution`.

## Réconciliation service — signatures PROD (audit dba_master, à respecter à la lettre)

Le service de la branche appelle d'ANCIENNES signatures. Corriger :
- `getRepresentants(id)` → `get_representants_structure(id_structure, actifsSeul)` — **2 args**. Appeler avec `false` pour inclure les suspendus. Shape retour : `{success, data:{representants:[...], total}}`.
- `create` → `create_representant(p_id_structure, p_username, p_tel_user, p_telephone_terrain, p_nom_rep, p_prenom_rep, p_email_rep, p_id_localite(0 si vide), p_mode_encaissement('WALLET_STRUCTURE' défaut), p_id_user(=0))`. Retour succès : `data.password_initial` (clair, 8 chars, à afficher 1× + `pwd_temporaire`). Erreurs : `MODULE_INACTIF, QUOTA_ATTEINT, LOGIN_DEJA_UTILISE, LOCALITE_INVALIDE, MODE_INVALIDE, PROFIL_MANQUANT`.
- `modifier` → `modifier_representant(p_id_structure, p_username, p_tel_user, p_telephone_terrain, p_nom_rep, p_prenom_rep, p_email_rep, p_id_localite, p_mode_encaissement, p_id_user)` — ⚠️ `p_id_user` = **ID du rep à modifier** (dernier). `username`/`tel_user` ignorés côté UPDATE (login non modifiable). Seuls modifiables : localité, mode_encaissement, telephone_terrain, nom_rep, prenom_rep, email_rep.
- `suspendre` → `suspendre_representant(id_structure, id_representant, id_admin)` — **3 args, pas de motif**.
- `reactiver` → `reactiver_representant(id_structure, id_representant, id_admin)`.
- `resetPwd` → `reinitialiser_pwd_representant_auto(id_structure, id_representant, id_admin)` — retourne `data.new_password` (clair). **Remplace** l'ancienne logique SMS (`reinitialiser_pwd_representant(p_id_rep, p_envoyer_sms)` qui n'existe plus sous cette forme utilisable).
- `getLocalites` → `get_localites_disponibles()` — RETURNS TABLE (le parser défensif existant gère déjà).

`id_admin` = `useAuth().user.id`. Échappement apostrophes + `NULL` : pattern `admin.service.ts`.

## Composants — adaptations

- `RepresentantsManagement.tsx` : retirer l'affectation stock (`ModalAffecterStock`, `stockRep`). Handlers `suspendre/reactiver/resetPwd` : passer `id_structure` (= `user.id_structure`) + `id_representant` (= `rep.id`) + `id_admin`. Le **reset** doit désormais afficher le `new_password` en clair via une **modale de révélation** (calquée sur `components/admin/ModalConfirmResetPassword.tsx`, avec le fix `setResetting(false)` en étape succès + bouton Copier ; MDP jamais persisté/loggé) — remplace le `window.confirm` + toast SMS. Idem, la **création** affiche `password_initial` (révélation 1×). Remplacer les `window.confirm` (bloquent l'automatisation navigateur) par des modales de confirmation cohérentes avec le reste des settings.
- `ModalCreerRepresentant.tsx` : select localités via `getLocalites()`, select `mode_encaissement` (WALLET_STRUCTURE/LIBRE). En création, révéler `password_initial`. En édition, champs login/username en lecture seule.
- `RepresentantCard.tsx` : afficher nom/prénom, tel terrain, localité, mode_encaissement, badge `actif_reseau` (Actif réseau/Suspendu). Actions : Modifier, Reset MDP, toggle Suspendre/Réactiver. Masquer les infos stock/solde spécifiques Stage B si présentes (ou les garder en lecture seule si triviales — préférer masquer pour rester scoped).

## Câblage settings

`app/settings/page.tsx` : ajouter `TabId 'representants'`, onglet visible seulement si `data.compte_distributeur === true`, rendu `<RepresentantsManagement onShowMessage=... maxRepresentants={data.nb_reps_max ?? 5} />`. Étendre `RawStructureData` avec `compte_distributeur?: boolean; nb_reps_max?: number`.

## Vérification

1. `npm run build` + lint.
2. Navigateur sur **183 (TECH24)** (login à fournir par l'utilisateur) : onglet Représentants visible ; liste affiche `tech24_rep` ; édition d'un champ (réversible) ; toggle suspendre/réactiver (réversible) ; reset MDP → révélation du nouveau MDP clair (⚠️ mute réellement le MDP du rep en prod — soit tester sur un rep jetable créé pour l'occasion puis suspendu/supprimé, soit s'arrêter à la confirmation). Création d'un rep de test → `password_initial` affiché, puis nettoyage.
3. Vérifier qu'une structure non-distributrice (218 actuel) ne voit pas l'onglet.

## Notes / faits backend à respecter

- Quota `create_representant` compte `actif=TRUE` ; suspendre/reactiver ne touchent que `actif_reseau` → un rep suspendu compte encore dans le quota ; `reactiver` ne revérifie pas le quota. Ne pas construire une UI qui suppose une cohérence quota/statut inexistante.
- `p_id_admin` ignoré backend (pas d'audit) — ne pas s'appuyer dessus.
