# Vérif navigateur — parcours Représentant (Stages B3.1→B3.4)

Date : 2026-07-02 · Branche : `feat/isolation-factures-proformas` · Structure de test : **183 (TECH24)**
Compte de test rep : login `721547885` / user fictif **awadioptest** (mode encaissement réel à confirmer en base).

## Résultat — CONCLUANT ✅

| Étape | Stage | Résultat |
|-------|-------|----------|
| Login → redirection `/dashboard/representant` | B3.1 | ✅ routing rep OK |
| Accueil rep (Produits affectés 2, Valeur stock 484 F, actions rapides, Mon stock top-3, « Mes factures » = BIENTÔT) | B3.1 | ✅ |
| Mon stock — 2 produits (Casa 79 : 12×32=384 F ; Clef USB 4Gos : 4×25=100 F), catégories, recherche | B3.2 | ✅ |
| Nouvelle vente — liste produits, prix imposé (cadenas), ajout panier, stepper +/−, total, bouton Encaisser | B3.3 | ✅ (vente **non validée** — pas de mutation stock prod 183) |
| Reversements — Solde 0, Total encaissé 0, Déjà reversé 0, bouton « déclarer » **désactivé** (gate OK), historique vide | B3.4 | ✅ |
| Console JS | — | ✅ aucune erreur/exception |

## Défaut trouvé — PLUS QU'UN COSMÉTIQUE (audit dba_master 2026-07-02)

**Symptôme observé** : mode d'encaissement affiché incohérent entre deux pages du dashboard rep :
- Page **Vente** (`app/dashboard/representant/vente/page.tsx:95,277`) affiche « **Wallet structure** »
- Page **Reversements** (`app/dashboard/representant/reversements/page.tsx:150`) affiche « **Encaissement libre** »

### Cause racine (confirmée par audit BD)
`user.mode_encaissement` **n'est pas peuplé au login** : `check_user_credentials` ne renvoie pas ce champ (`auth.service.ts:437-441` est pourtant déjà câblé pour le lire s'il est présent). Face à `undefined`, chaque page devine différemment :
- Vente : `isLibre = mode === 'LIBRE'` → `false` → « Wallet structure »
- Reversements : `isLibre = mode !== 'WALLET_STRUCTURE'` (fail-open, ligne 63) → `true` → vue reversement fonctionnelle + sous-titre « Encaissement libre » (ligne 150, correct *dans la branche isLibre*)

### ⚠️ Nature réelle : mauvaise vue, pas juste mauvais libellé
Modes réels en base (structure 183) :

| Rep | login | mode_encaissement réel |
|-----|-------|------------------------|
| tech24_rep | 711051330 | **LIBRE** |
| **awadioptest** | 721547885 | **WALLET_STRUCTURE** |

awadioptest est **WALLET_STRUCTURE** → le fail-open lui a affiché **à tort** la page Reversements fonctionnelle, alors qu'il aurait dû voir le bandeau vert « Encaissement direct sur wallet structure ». Aucun dégât (solde 0, bouton désactivé, `declarer_reversement` rejette les non-LIBRE) mais c'est fonctionnellement incorrect.

### Emplacement colonne (audit)
`utilisateur.mode_encaissement` — varchar(20), défaut `'WALLET_STRUCTURE'`, `CHECK IN ('WALLET_STRUCTURE','LIBRE')`. Les reps sont des lignes `utilisateur` (`id_profil=10`), pas de table séparée → aucune jointure à ajouter dans `check_user_credentials` (la ligne `orig` est déjà jointe).

### Correction retenue : fix racine backend (aucun changement frontend)
Une fois `mode_encaissement` peuplé au login, les 2 pages deviennent exactes automatiquement (awadioptest → bandeau vert ; tech24_rep → vue reversement réelle). Le front est déjà prêt.

- **Patch SQL prêt** (audité, NON appliqué) : `docs/superpowers/plans/2026-07-02-patch-check-user-credentials-mode-encaissement.sql`
- Nature : `DROP + CREATE` (ajout colonne à `RETURNS TABLE`) dans `BEGIN/COMMIT` → aucune fenêtre login cassé. Signature d'appel inchangée, additif, aucun appelant/vue impacté, régression négligeable.
- **Décisions PO en attente** :
  1. Go pour appliquer en prod (fonction login de tous les users) via dba_master.
  2. Scope : **strict** (`mode_encaissement` seul, script actuel) ou **élargi** (+ `id_localite, nom_rep, prenom_rep, email_rep, actif_reseau`, tous lus par `auth.service.ts` et non renvoyés — même risque opérationnel). **Recommandation : élargi.**
- Validation post-patch : tester 1 login de chaque type (rep LIBRE, rep WALLET, admin standard, `*@partner.fay`, `admin@system.fay`).

## Fix appliqué + re-test post-patch (2026-07-02) — VALIDÉ ✅

Patch `check_user_credentials` scope élargi **appliqué en prod** (fayclick_db) par l'utilisateur. Re-test navigateur après re-login propre (localStorage vidé) :

| Rep | mode réel | Reversements | Vente | Nom affiché |
|-----|-----------|--------------|-------|-------------|
| awadioptest | WALLET_STRUCTURE | ✅ bandeau vert « Encaissement direct sur wallet structure » | ✅ « Wallet structure » | ✅ « awatest diop » (nom_rep/prenom_rep peuplés) |
| tech24_rep | LIBRE | ✅ vraie page (solde -256, total encaissé 128, historique 1 ligne validée) | ✅ « Encaissement libre » | ✅ « Test Aw » |

Incohérence mode d'encaissement **résolue** : `mode_encaissement` + `nom_rep`/`prenom_rep` désormais peuplés au login (scope élargi effectif). Zéro changement frontend requis.

Note mineure (non liée) : solde négatif `-256 FCFA` (données QA) affiché tel quel ; bouton correctement désactivé → pas de risque, habillage affichage négatif à envisager plus tard.

## Reste à faire (finalisation)
- Commit des fichiers doc non suivis (`2026-07-01-representants-stage-a.md`, `2026-07-01-representants-stock-b1.md`, cette note, le `.sql` du patch). **Aucun changement de code frontend** (le fix était 100 % backend, déjà appliqué).
- Ouverture PR — **ne pas merger main** sans validation complète (discipline git).
