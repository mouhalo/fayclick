# PRD — Dashboard Admin : Gestion avancée des Structures, Abonnements et Utilisateurs

| Méta | Valeur |
|---|---|
| **Date** | 2026-04-30 |
| **Version** | 1.0 |
| **Statut** | DRAFT — en attente validation |
| **Auteur** | Claude (Opus 4.7) — Lead Tech FayClick |
| **Branche cible** | `feature/admin-gestion-structures` (à créer) |
| **Dépendances** | DBA (3 fonctions PG à créer + 1 à étendre + 1 table) · ICELABSOFT (mémo templates WhatsApp séparé) |
| **Compte de test** | `admin@system.fay / 777301221@` (id_structure = 0) |

---

## 1. Contexte & Objectifs

### 1.1 Contexte

Le dashboard administrateur système (`/dashboard/admin`) permet aujourd'hui une **supervision en lecture seule** : listage des structures, abonnements, ventes, utilisateurs, partenaires et codes promo. Aucune action de gestion n'est possible — toute correction nécessite l'intervention manuelle du DBA.

### 1.2 Objectifs

Donner à l'administrateur système un **outil opérationnel autonome** pour :

1. **Modifier** la fiche et les paramètres d'une structure depuis le dashboard.
2. **Supprimer** définitivement une structure (hard delete, cascade complète).
3. **Offrir des abonnements gratuits** à des structures (jours / mois / année).
4. **Ajuster la mensualité** (tarif d'abonnement) appliquée à une structure spécifique (compte privé).
5. **Rechercher finement les utilisateurs** par nom de structure ou téléphone.
6. **Réinitialiser les mots de passe** et notifier l'utilisateur via WhatsApp.
7. **Tracer toutes les actions critiques** dans une table d'audit `admin_actions_log`.

### 1.3 Hors-scope (V1)

- **Envoi de messages WhatsApp/SMS libres** : reporté à un PRD ultérieur après création des templates Meta par ICELABSOFT (cf. § 9 Annexe Mémo).
- **Confirmation par mot de passe admin** : non requise (validation par modal de confirmation suffisante).
- **Soft delete** : non retenu — l'admin veut une suppression réelle.
- **Modification du type_structure** : figé après création (impact métier disqualifiant).
- **Réplication des changements** sur l'auth context utilisateur connecté ailleurs : non géré (l'utilisateur affecté devra se reconnecter).

---

## 2. Personas & User Stories

### 2.1 Persona

**Admin Système FayClick** (`id_structure = 0`, groupe contenant `ADMIN`/`SYSTEM`)
- Travaille depuis un PC desktop (priorité responsive desktop, mobile en best-effort).
- Connaît parfaitement le métier : pas besoin de wizards, mais besoin de modals clairs et rapides.
- Effectue ~5 à 30 actions critiques par jour (correction tarifs, prolongation, gestion structures problématiques).

### 2.2 User Stories

| ID | Story | Critères d'acceptation |
|---|---|---|
| **US-1** | En tant qu'admin, je veux **modifier la fiche** d'une structure (nom, n° autorisation, localité) | Modal d'édition · validation · refresh table · log audit |
| **US-2** | En tant qu'admin, je veux **modifier les paramètres** d'une structure (limites, compte privé, mensualité, taux wallet, live) | Modal d'édition · sauvegarde unique · log audit |
| **US-3** | En tant qu'admin, je veux **supprimer définitivement** une structure | Modal confirmation explicite (texte à taper) · cascade DB · log audit |
| **US-4** | En tant qu'admin, je veux **offrir un abonnement gratuit** (jours/mois/année) à une structure expirée ou active | Modal saisie durée + motif · création nouvel abonnement (méthode `OFFERT`) · refresh · log audit |
| **US-5** | En tant qu'admin, je veux **ajuster la mensualité** appliquée à une structure spécifique | Modal saisie nouveau montant + motif · update `param_structure.mensualite` · log audit |
| **US-6** | En tant qu'admin, je veux **rechercher un utilisateur** par nom de structure (texte) ou téléphone (exact) | Champs de filtrage actifs · API supporte déjà les params · pas de breaking change autres filtres |
| **US-7** | En tant qu'admin, je veux **réinitialiser le mot de passe** d'un utilisateur | Modal confirmation · `reset_user_password` · `pwd_changed=false` · envoi WhatsApp template OTP avec nouveau MDP · log audit |

---

## 3. Spécifications fonctionnelles

### 3.1 US-1 — Modifier la fiche structure

**Déclencheur** : Bouton "Modifier" dans `ModalDetailStructure` (onglet *Infos*).

**Champs éditables** (table `structures`) :
| Champ | Type | Validation |
|---|---|---|
| `nom_structure` | string | requis · max 100 · unique implicite (warning si déjà pris) |
| `numautorisatioon` | string | optionnel · max 50 |
| `id_localite` | integer | requis · dropdown alimenté par `localites` (à charger) |

**Champs NON éditables** : `id_type`, `mobile_om`, `mobile_wave`, `email`, `adresse`, `logo`, `code_structure`. *(Le logo et l'adresse sont gérés par la structure elle-même via Settings — pas par l'admin.)*

**Composant** : `ModalEditStructure` (nouveau) — réutilise le pattern visuel de `ModalDetailStructure`.

### 3.2 US-2 — Modifier les paramètres structure

**Déclencheur** : Bouton "Paramètres" dans `ModalDetailStructure` (onglet *Infos* ou nouvel onglet *Paramètres admin*).

**Champs éditables** (table `param_structure`) :
| Champ | Type | UI | Notes |
|---|---|---|---|
| `nombre_produit_max` | integer | input number | min 0, max 99999 |
| `nombre_caisse_max` | integer | input number | min 1, max 99 |
| `compte_prive` | boolean | toggle | Si true → débloque tarif personnalisé via `mensualite` |
| `mensualite` | numeric | input number | en FCFA · visible/éditable uniquement si `compte_prive=true` |
| `taux_wallet` | numeric | input number | en %, ex: 1.5 |
| `live_autorise` | boolean | toggle | active live shopping |

**Composant** : `ModalEditParamStructure` (nouveau).

### 3.3 US-3 — Supprimer une structure (HARD DELETE)

**Déclencheur** : Bouton rouge "Supprimer la structure" dans `ModalDetailStructure` (footer).

**Workflow UX** :
1. Clic → modal confirmation `ModalConfirmDeleteStructure`
2. Affiche : nom structure, type, nb factures, nb utilisateurs, solde wallet
3. Demande de **taper le nom exact de la structure** pour activer le bouton "Supprimer définitivement"
4. Sur confirmation → appel `delete_structure(id, id_admin)` → toast succès → fermeture modal détail → refresh liste

**Cascade DB** (à implémenter dans la fonction PG) :
- Supprimer dans l'ordre : `transactions_wallet`, `wallet_structure`, `mouvement_stock`, `produit_photos`, `product_embeddings`, `detail_facture_com`, `recus_paiement`, `paiements`, `list_factures_com`, `clients`, `list_devis`, `services_prestataire`, `list_produits`, `depenses`, `type_depenses`, `inventaire_periodique`, `abonnements_structure`, `param_structure`, `utilisateurs`, `codes_promo_utilises` (si lié à structure), `pending_sms` (si lié), puis enfin `structures`.
- Wrapper la cascade dans une **transaction** PostgreSQL.
- Logger la suppression dans `admin_actions_log` AVANT le DELETE final.

### 3.4 US-4 — Offrir un abonnement gratuit

**Déclencheur** : Bouton "Offrir abonnement" dans `ModalDetailStructure` (onglet *Abonnement*).

**Champs du modal** `ModalOffrirAbonnement` :
| Champ | Type | Validation |
|---|---|---|
| `duree` | radio | `7 jours` · `15 jours` · `1 mois` · `3 mois` · `6 mois` · `1 an` · `Personnalisé (jours)` |
| `nb_jours_custom` | integer | requis si `Personnalisé` · min 1 · max 730 |
| `motif` | textarea | **requis** · min 10 caractères · max 500 |

**Workflow** :
- Calcul `date_debut = max(date_fin_dernier_abonnement + 1 jour, CURRENT_DATE)`
- Calcul `date_fin = date_debut + nb_jours - 1`
- Appel `add_abonnement_offert(id_structure, nb_jours, motif, id_admin)` → crée un enregistrement dans `abonnements_structure` avec `methode_paiement='OFFERT'`, `montant=0`, `statut='ACTIF'`, `ref_abonnement='OFFERT-{timestamp}'`
- Log `admin_actions_log`

### 3.5 US-5 — Ajuster la mensualité

**Déclencheur** : Bouton "Ajuster mensualité" dans onglet *Abonnement* du modal détail structure.

**Pré-condition** : visible uniquement si `compte_prive = true` sur la structure.

**Champs du modal** `ModalAjusterMensualite` :
| Champ | Type | Validation |
|---|---|---|
| `ancienne_mensualite` | display | lecture seule |
| `nouvelle_mensualite` | numeric | requis · min 0 · max 999999 (FCFA) |
| `motif` | textarea | **requis** · min 10 caractères |

**Workflow** :
- Appel `edit_param_structure(id_structure, ..., p_mensualite=nouvelle_mensualite)` *(fonction PG à étendre)*
- Log `admin_actions_log`

### 3.6 US-6 — Recherche utilisateurs

**UI** : étendre les filtres existants de `AdminUsersTab` :
- Ajouter input texte **"Structure"** → mappé sur `params.search` côté API ou nouveau param `search_structure` *(à clarifier avec implémentation, l'API actuelle fait déjà `search` multi-champs)*.
- Renommer le filtre Recherche existant en **"Nom utilisateur / login"**.
- Ajouter input **"Téléphone (exact)"** → 9 chiffres SN ou format E.164 international, recherche stricte (=).

**API** :
- Étendre `get_admin_all_utilisateurs` côté PG pour ajouter `p_search_structure varchar` et `p_search_telephone varchar` (recherche stricte sur `telephone`).
- Étendre `AdminAllUtilisateursParams` côté TS et `adminService.getAllUtilisateurs()`.

### 3.7 US-7 — Reset mot de passe

**Déclencheur** : Bouton "Reset MDP" sur chaque ligne utilisateur dans `AdminUsersTab` (icône clé).

**Workflow** :
1. Clic → `ModalConfirmResetPassword` affiche : nom user, login, structure, téléphone WhatsApp, "Êtes-vous sûr ?"
2. Confirmation → appel `reset_user_password(id_utilisateur)` → retourne le **nouveau mot de passe en clair**
3. **Toujours** forcer `UPDATE utilisateurs SET pwd_changed=false WHERE id_utilisateur = ?` *(à inclure dans la fonction PG ou en step séparé)*
4. **Envoyer le nouveau MDP par WhatsApp** via `whatsapp_service/api/send_otp` *(le template OTP actuel `fayclick_auth_code` accepte 4-8 chiffres → ⚠️ INCOMPATIBLE avec un MDP textuel)*. **Voir § 5.2 — décision de design.**
5. Toast "MDP réinitialisé · WhatsApp envoyé à +221XX*****XX"
6. Log `admin_actions_log`

---

## 4. Spécifications techniques

### 4.1 Fonctions PostgreSQL — résumé

| Fonction | État | Action |
|---|---|---|
| `add_edit_structure(p_id_type, p_nom_structure, ...)` | ✅ Existe | Réutiliser tel quel pour US-1 |
| `edit_param_structure(...)` | ⚠️ Existe mais incomplète | **Étendre** : ajouter `p_nombre_produit_max`, `p_nombre_caisse_max`, `p_compte_prive`, `p_mensualite`, `p_taux_wallet`, `p_live_autorise` |
| `delete_structure(p_id_structure, p_id_admin)` | ❌ Manquante | **Créer** : hard delete avec cascade complète + log |
| `add_abonnement_offert(p_id_structure, p_nb_jours, p_motif, p_id_admin)` | ❌ Manquante | **Créer** : insère un abonnement `methode='OFFERT'`, `montant=0`, `statut='ACTIF'` |
| `reset_user_password(pid_utilisateur)` | ✅ Existe | Réutiliser ; **vérifier** qu'elle force `pwd_changed=false` (sinon ajouter UPDATE séparé) |
| `get_admin_all_utilisateurs(...)` | ⚠️ Existe mais incomplète | **Étendre** : ajouter `p_search_structure`, `p_search_telephone_exact` |
| `log_admin_action(...)` | ❌ Manquante | **Créer** + table `admin_actions_log` |

### 4.2 Schéma de la table `admin_actions_log`

```sql
CREATE TABLE admin_actions_log (
  id_log              BIGSERIAL PRIMARY KEY,
  id_admin            INTEGER NOT NULL REFERENCES utilisateurs(id_utilisateur),
  username_admin      VARCHAR(100) NOT NULL,         -- snapshot, robuste à la suppression
  action              VARCHAR(50) NOT NULL,          -- DELETE_STRUCTURE | EDIT_STRUCTURE | EDIT_PARAM | OFFRIR_ABONNEMENT | AJUSTER_MENSUALITE | RESET_PASSWORD
  cible_type          VARCHAR(30) NOT NULL,          -- 'STRUCTURE' | 'UTILISATEUR' | 'ABONNEMENT' | 'PARAM_STRUCTURE'
  cible_id            INTEGER NOT NULL,
  cible_nom           VARCHAR(200),                  -- snapshot nom (structure ou user)
  ancienne_valeur     JSONB,                         -- état avant
  nouvelle_valeur     JSONB,                         -- état après
  motif               TEXT,                          -- requis pour OFFRIR_ABONNEMENT et AJUSTER_MENSUALITE
  ip_address          VARCHAR(45),                   -- optionnel (à passer si dispo)
  user_agent          TEXT,                          -- optionnel
  tms_create          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_log_admin    ON admin_actions_log(id_admin, tms_create DESC);
CREATE INDEX idx_admin_log_cible    ON admin_actions_log(cible_type, cible_id);
CREATE INDEX idx_admin_log_action   ON admin_actions_log(action, tms_create DESC);
```

### 4.3 Fonction PG `log_admin_action`

```sql
CREATE OR REPLACE FUNCTION log_admin_action(
  p_id_admin           INTEGER,
  p_action             VARCHAR,
  p_cible_type         VARCHAR,
  p_cible_id           INTEGER,
  p_cible_nom          VARCHAR DEFAULT NULL,
  p_ancienne_valeur    JSONB DEFAULT NULL,
  p_nouvelle_valeur    JSONB DEFAULT NULL,
  p_motif              TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_username  VARCHAR(100);
  v_id_log    BIGINT;
BEGIN
  SELECT username INTO v_username FROM utilisateurs WHERE id_utilisateur = p_id_admin;

  INSERT INTO admin_actions_log (
    id_admin, username_admin, action, cible_type, cible_id,
    cible_nom, ancienne_valeur, nouvelle_valeur, motif
  ) VALUES (
    p_id_admin, COALESCE(v_username, 'unknown'), p_action, p_cible_type, p_cible_id,
    p_cible_nom, p_ancienne_valeur, p_nouvelle_valeur, p_motif
  ) RETURNING id_log INTO v_id_log;

  RETURN v_id_log;
END;
$$ LANGUAGE plpgsql;
```

> **Important** : `log_admin_action` est appelée **dans** chaque fonction admin (delete_structure, add_abonnement_offert, etc.) pour garantir l'atomicité.

### 4.4 Fonction PG `delete_structure`

```sql
CREATE OR REPLACE FUNCTION delete_structure(
  p_id_structure INTEGER,
  p_id_admin     INTEGER
) RETURNS JSON AS $$
DECLARE
  v_nom_structure VARCHAR(200);
  v_snapshot      JSONB;
  v_nb_factures   INTEGER;
  v_nb_users      INTEGER;
BEGIN
  -- 1. Vérifier existence + récupérer snapshot
  SELECT nom_structure INTO v_nom_structure FROM structures WHERE id_structure = p_id_structure;
  IF v_nom_structure IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Structure introuvable');
  END IF;

  -- Empêcher suppression de la structure admin (id 0)
  IF p_id_structure = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Suppression de la structure système interdite');
  END IF;

  -- 2. Snapshot complet pour log audit
  SELECT to_jsonb(s) INTO v_snapshot FROM structures s WHERE s.id_structure = p_id_structure;
  SELECT COUNT(*) INTO v_nb_factures FROM list_factures_com WHERE id_structure = p_id_structure;
  SELECT COUNT(*) INTO v_nb_users    FROM utilisateurs WHERE id_structure = p_id_structure;

  -- 3. Log AVANT suppression
  PERFORM log_admin_action(
    p_id_admin, 'DELETE_STRUCTURE', 'STRUCTURE', p_id_structure,
    v_nom_structure, v_snapshot, NULL,
    format('Suppression. %s factures, %s utilisateurs supprimés.', v_nb_factures, v_nb_users)
  );

  -- 4. Cascade — ordre crucial pour respecter les FK
  DELETE FROM transactions_wallet WHERE id_structure = p_id_structure;
  DELETE FROM wallet_structure    WHERE id_structure = p_id_structure;
  DELETE FROM mouvement_stock     WHERE id_structure = p_id_structure;
  DELETE FROM produit_photos      WHERE id_produit IN (SELECT id_produit FROM list_produits WHERE id_structure = p_id_structure);
  DELETE FROM product_embeddings  WHERE id_structure = p_id_structure;
  DELETE FROM detail_facture_com  WHERE id_facture  IN (SELECT id_facture FROM list_factures_com WHERE id_structure = p_id_structure);
  DELETE FROM recus_paiement      WHERE id_structure = p_id_structure;
  DELETE FROM paiements           WHERE id_facture  IN (SELECT id_facture FROM list_factures_com WHERE id_structure = p_id_structure);
  DELETE FROM list_factures_com   WHERE id_structure = p_id_structure;
  DELETE FROM clients             WHERE id_structure = p_id_structure;
  DELETE FROM list_devis          WHERE id_structure = p_id_structure;
  DELETE FROM services_prestataire WHERE id_structure = p_id_structure;
  DELETE FROM list_produits       WHERE id_structure = p_id_structure;
  DELETE FROM depenses            WHERE id_structure = p_id_structure;
  DELETE FROM type_depenses       WHERE id_structure = p_id_structure;
  DELETE FROM inventaire_periodique WHERE id_structure = p_id_structure;
  DELETE FROM abonnements_structure WHERE id_structure = p_id_structure;
  DELETE FROM param_structure     WHERE id_structure = p_id_structure;
  DELETE FROM utilisateurs        WHERE id_structure = p_id_structure;
  DELETE FROM codes_promo_utilises WHERE id_structure = p_id_structure;
  DELETE FROM pending_sms         WHERE structure_name = v_nom_structure;
  DELETE FROM structures          WHERE id_structure = p_id_structure;

  RETURN json_build_object(
    'success', true,
    'message', format('Structure "%s" supprimée définitivement', v_nom_structure),
    'nb_factures_supprimees', v_nb_factures,
    'nb_users_supprimes', v_nb_users
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
```

> **Note DBA** : la liste de tables ci-dessus doit être validée par le DBA contre le schéma réel (FK constraints). Toute table FK manquée bloquera le DELETE.

### 4.5 Fonction PG `add_abonnement_offert`

```sql
CREATE OR REPLACE FUNCTION add_abonnement_offert(
  p_id_structure INTEGER,
  p_nb_jours     INTEGER,
  p_motif        TEXT,
  p_id_admin     INTEGER
) RETURNS JSON AS $$
DECLARE
  v_date_debut DATE;
  v_date_fin   DATE;
  v_id_abo     INTEGER;
  v_nom        VARCHAR(200);
  v_ref        VARCHAR(50);
BEGIN
  -- Validations
  IF p_nb_jours <= 0 OR p_nb_jours > 730 THEN
    RETURN json_build_object('success', false, 'message', 'Nombre de jours invalide (1-730)');
  END IF;
  IF length(coalesce(p_motif,'')) < 10 THEN
    RETURN json_build_object('success', false, 'message', 'Motif requis (10 caractères min)');
  END IF;

  SELECT nom_structure INTO v_nom FROM structures WHERE id_structure = p_id_structure;
  IF v_nom IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Structure introuvable');
  END IF;

  -- Date début : max(dernière date_fin + 1, today)
  SELECT GREATEST(COALESCE(MAX(date_fin) + 1, CURRENT_DATE), CURRENT_DATE)
  INTO v_date_debut
  FROM abonnements_structure
  WHERE id_structure = p_id_structure;

  v_date_fin := v_date_debut + (p_nb_jours - 1);
  v_ref := 'OFFERT-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || p_id_structure;

  INSERT INTO abonnements_structure (
    id_structure, type_abonnement, date_debut, date_fin, montant,
    statut, methode_paiement, ref_abonnement, numrecu, tms_create
  ) VALUES (
    p_id_structure,
    CASE WHEN p_nb_jours <= 31 THEN 'MENSUEL' ELSE 'ANNUEL' END,
    v_date_debut, v_date_fin, 0,
    CASE WHEN v_date_debut > CURRENT_DATE THEN 'EN_ATTENTE' ELSE 'ACTIF' END,
    'OFFERT', v_ref, v_ref, now()
  ) RETURNING id_abonnement INTO v_id_abo;

  PERFORM log_admin_action(
    p_id_admin, 'OFFRIR_ABONNEMENT', 'ABONNEMENT', v_id_abo,
    v_nom, NULL,
    jsonb_build_object('nb_jours', p_nb_jours, 'date_debut', v_date_debut, 'date_fin', v_date_fin),
    p_motif
  );

  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'id_abonnement', v_id_abo, 'date_debut', v_date_debut, 'date_fin', v_date_fin
    )
  );
END;
$$ LANGUAGE plpgsql;
```

### 4.6 Extension de `edit_param_structure`

**Signature actuelle** : `(p_id_structure, p_credit_autorise, p_limite_credit, p_acompte_autorise, p_prix_engros, p_info_facture, p_config_facture, p_inclure_tva, p_taux_tva, p_wallet_paiement)`

**Signature étendue** :
```
edit_param_structure(
  p_id_structure INTEGER,
  p_credit_autorise BOOL DEFAULT NULL,
  p_limite_credit NUMERIC DEFAULT NULL,
  p_acompte_autorise BOOL DEFAULT NULL,
  p_prix_engros BOOL DEFAULT NULL,
  p_info_facture JSON DEFAULT NULL,
  p_config_facture JSON DEFAULT NULL,
  p_inclure_tva BOOL DEFAULT NULL,
  p_taux_tva NUMERIC DEFAULT NULL,
  p_wallet_paiement BOOL DEFAULT NULL,
  -- nouveaux paramètres admin
  p_nombre_produit_max INTEGER DEFAULT NULL,
  p_nombre_caisse_max  INTEGER DEFAULT NULL,
  p_compte_prive       BOOL DEFAULT NULL,
  p_mensualite         NUMERIC DEFAULT NULL,
  p_taux_wallet        NUMERIC DEFAULT NULL,
  p_live_autorise      BOOL DEFAULT NULL
) RETURNS JSON
```

⚠️ **Compat** : tous les nouveaux params en `DEFAULT NULL` → aucun appel existant (Settings côté structure) ne casse.

### 4.7 Extension de `get_admin_all_utilisateurs`

Ajouter 2 paramètres :
- `p_search_structure VARCHAR DEFAULT NULL` → `WHERE LOWER(s.nom_structure) LIKE LOWER('%'||p_search_structure||'%')`
- `p_search_telephone VARCHAR DEFAULT NULL` → `WHERE u.telephone = p_search_telephone` (égalité stricte, 9 chiffres SN)

### 4.8 Côté frontend — Services

| Fichier | Modifs |
|---|---|
| `services/admin.service.ts` | Ajouter : `editStructure()`, `editParamStructureAdmin()`, `deleteStructure()`, `offrirAbonnement()`, `ajusterMensualite()`, `resetUserPassword()`. Étendre `getAllUtilisateurs()` (params). |
| `services/database.service.ts` | Étendre `editParamStructure()` (6 nouveaux champs). |
| `services/whatsapp-message.service.ts` | **Nouveau** — wrapper `sendNewPasswordWhatsApp(telephone, login, password)` qui utilise un nouveau template ICELABSOFT (à demander, cf. § 9). En attendant : fallback sur affichage popup admin uniquement. |
| `types/admin.types.ts` | Ajouter : `EditStructureParams`, `EditParamStructureAdminParams`, `DeleteStructureResponse`, `OffrirAbonnementParams`, `AjusterMensualiteParams`, `AdminActionLog`, étendre `AdminAllUtilisateursParams` (`search_structure`, `search_telephone`). |

### 4.9 Côté frontend — Composants

| Composant | État | Description |
|---|---|---|
| `components/admin/ModalEditStructure.tsx` | **Nouveau** | Édition champs `structures` (nom, n° autorisation, localité) |
| `components/admin/ModalEditParamStructure.tsx` | **Nouveau** | Édition `param_structure` (6 champs admin) |
| `components/admin/ModalConfirmDeleteStructure.tsx` | **Nouveau** | Suppression hard delete avec saisie nom |
| `components/admin/ModalOffrirAbonnement.tsx` | **Nouveau** | Saisie durée + motif |
| `components/admin/ModalAjusterMensualite.tsx` | **Nouveau** | Saisie mensualité + motif |
| `components/admin/ModalConfirmResetPassword.tsx` | **Nouveau** | Confirmation reset MDP + envoi WhatsApp |
| `components/admin/ModalDetailStructure.tsx` | **Étendu** | Ajout boutons "Modifier" / "Paramètres" / "Supprimer" / "Offrir abonnement" / "Ajuster mensualité" |
| `components/admin/AdminUsersTab.tsx` | **Étendu** | Ajout 2 inputs filtres (Structure, Téléphone exact) + bouton "Reset MDP" par ligne |
| `components/admin/AdminAuditTab.tsx` | **Optionnel V2** | Lecture `admin_actions_log` (filtres action, admin, période) |

---

## 5. Décisions de design importantes

### 5.1 Hard delete avec cascade — risque accepté

L'admin a explicitement choisi le hard delete sans blocage sur factures payées. **Conséquence comptable** : aucune trace des transactions de la structure supprimée → impossible de reconstituer son historique. **Atténuation** : le snapshot complet de la structure est sauvegardé dans `admin_actions_log.ancienne_valeur` (JSONB) avant DELETE, ce qui permet une **reconstruction partielle** en cas d'erreur.

### 5.2 Reset password : envoi WhatsApp — point bloquant à court terme

Le template WhatsApp actuel (`fayclick_auth_code`) accepte uniquement **4 à 8 chiffres** : il est **incompatible** avec un mot de passe textuel généré par `reset_user_password`.

**Décision V1** :
1. **Court terme** : afficher le nouveau MDP dans un popup admin uniquement (l'admin transmet manuellement).
2. **Moyen terme** : demander à ICELABSOFT de créer un nouveau template `fayclick_password_reset` avec variable texte libre (cf. § 9 Mémo).
3. **Long terme (V2)** : intégration WhatsApp automatique via le nouveau template + fallback Email/SMS.

> **À valider** : on commence par afficher le MDP dans un popup admin **dès maintenant** (pas de blocage), et on intègre WhatsApp dès que le template est livré.

### 5.3 Pas de confirmation par mot de passe admin

Décision validée par le métier. Sécurité reposera sur :
- Les modals de confirmation explicites (saisie du nom de structure pour delete).
- L'auth déjà active (admin authentifié via JWT).
- L'audit trail complet dans `admin_actions_log`.

### 5.4 Snapshot avant action

Toutes les fonctions PG admin (delete, edit, ajustement) **doivent** capturer un snapshot JSONB de l'état avant modification (`ancienne_valeur`) AVANT l'action et l'enregistrer dans `admin_actions_log`. Ceci permet :
- Reconstitution en cas d'erreur.
- Forensics.
- Reporting.

---

## 6. Plan de Sprint

### Sprint 1 — Fondations DBA + Modifications structure (3 jours)

**DBA** :
- [ ] Créer table `admin_actions_log` + index
- [ ] Créer fonction `log_admin_action`
- [ ] Étendre `edit_param_structure` (6 nouveaux params)
- [ ] Étendre `get_admin_all_utilisateurs` (2 nouveaux params)
- [ ] Tests unitaires PG

**Frontend** :
- [ ] Étendre `databaseService.editParamStructure()` (6 champs)
- [ ] Étendre `adminService.getAllUtilisateurs()` (2 params)
- [ ] Créer `ModalEditStructure`
- [ ] Créer `ModalEditParamStructure`
- [ ] Étendre `ModalDetailStructure` avec boutons "Modifier" / "Paramètres"
- [ ] US-1, US-2, US-6 livrées

### Sprint 2 — Suppression + Abonnements (3 jours)

**DBA** :
- [ ] Créer fonction `delete_structure` (cascade complète + log)
- [ ] Créer fonction `add_abonnement_offert` (avec log)
- [ ] Tests unitaires PG (cas limites, structures avec/sans factures, etc.)

**Frontend** :
- [ ] Service `adminService.deleteStructure()`, `offrirAbonnement()`, `ajusterMensualite()`
- [ ] `ModalConfirmDeleteStructure`
- [ ] `ModalOffrirAbonnement`
- [ ] `ModalAjusterMensualite`
- [ ] Étendre `ModalDetailStructure` avec boutons "Supprimer" / "Offrir abo" / "Ajuster mensualité"
- [ ] US-3, US-4, US-5 livrées

### Sprint 3 — Reset password + Audit (2 jours)

**DBA** :
- [ ] Vérifier `reset_user_password` force `pwd_changed=false` (sinon patcher)
- [ ] Créer vue `vw_admin_audit_log` (jointure user + structure pour reporting)

**Frontend** :
- [ ] Service `adminService.resetUserPassword()`
- [ ] `ModalConfirmResetPassword` (popup avec MDP affiché — voir § 5.2)
- [ ] Bouton "Reset MDP" dans `AdminUsersTab` (icône clé par ligne)
- [ ] *(Optionnel)* Onglet `AdminAuditTab` (lecture `admin_actions_log`)
- [ ] US-7 livrée

### Sprint 4 (à planifier) — Intégration WhatsApp Reset MDP

**Pré-requis** : ICELABSOFT a livré le template `fayclick_password_reset`.
- [ ] Créer `services/whatsapp-message.service.ts`
- [ ] Brancher dans `ModalConfirmResetPassword`
- [ ] Tests bout-en-bout

---

## 7. Risques & Dépendances

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R1 | DELETE cascade bloqué par FK manquée | Moyenne | Haut | Audit complet du schéma par DBA avant déploiement, tests sur structure de test |
| R2 | `reset_user_password` ne force pas `pwd_changed=false` | Faible | Moyen | Vérifier sur DB ; ajouter UPDATE dans la fonction si manquant |
| R3 | Template WhatsApp pour MDP non livré à temps | Haute | Faible | Fallback popup admin (V1), intégration WhatsApp V2 |
| R4 | Structures avec données sensibles supprimées par erreur | Faible | Critique | Confirmation par saisie du nom + snapshot JSONB complet dans audit log |
| R5 | `admin_actions_log` grossit rapidement | Moyenne | Faible | Index sur `tms_create`, plan d'archivage > 12 mois |
| R6 | Filtre "Recherche structure" multi-champs casse l'API existante | Moyenne | Moyen | Param `p_search_structure` séparé en plus de `p_search` (pas de remplacement) |

---

## 8. Critères d'acceptation globaux

- [ ] Toutes les actions critiques sont loggées dans `admin_actions_log` avec snapshot complet
- [ ] La table de référence du formulaire de modification structure n'inclut que les 3 champs autorisés
- [ ] Le type_structure n'est jamais modifiable
- [ ] La cascade DELETE ne laisse aucune ligne orpheline (vérifié par requête de contrôle post-déploiement)
- [ ] L'abonnement offert respecte la chronologie (jamais de chevauchement avec un abonnement existant)
- [ ] La mensualité ajustée est immédiatement prise en compte au prochain renouvellement
- [ ] Reset MDP force `pwd_changed=false` ET retourne le MDP en clair à l'admin
- [ ] Recherche utilisateurs par téléphone exact est strictement insensible à la casse mais sensible aux chiffres
- [ ] Les filtres existants (groupe, profil, statut, tri) continuent de fonctionner avec les nouveaux filtres
- [ ] Aucune régression sur les pages : Dashboard, Settings (structure), Login

---

## 9. Annexe — Mémo ICELABSOFT (templates WhatsApp manquants)

> **À envoyer à l'équipe ICELABSOFT en parallèle du Sprint 1.**
> Liste les templates WhatsApp Business à créer/approuver côté Meta pour pouvoir étendre les communications FayClick au-delà de l'OTP.

### 9.1 Contexte

FayClick V2 souhaite envoyer plusieurs types de messages WhatsApp opérationnels via l'endpoint existant `https://api.icelabsoft.com/whatsapp_service/api/send_otp` (ou un nouvel endpoint dédié `/send_message`). L'endpoint actuel est limité aux templates de catégorie *Authentication* (codes OTP 4-8 chiffres) — il ne peut pas véhiculer de texte libre.

### 9.2 Templates demandés (FR + EN)

| # | Nom suggéré | Catégorie | Variables | Cas d'usage |
|---|---|---|---|---|
| 1 | `fayclick_password_reset` (FR) / `fayclick_password_reset_en` (EN) | Utility | `{{1}}` = login, `{{2}}` = nouveau MDP | Reset MDP par admin (US-7) |
| 2 | `fayclick_subscription_expiring` (FR/EN) | Utility | `{{1}}` = nom structure, `{{2}}` = jours restants, `{{3}}` = montant à payer | Rappel échéance abonnement (J-7, J-3, J-1) |
| 3 | `fayclick_subscription_offered` (FR/EN) | Utility | `{{1}}` = nom structure, `{{2}}` = nb jours, `{{3}}` = date fin | Notification abonnement offert (US-4) |
| 4 | `fayclick_admin_message` (FR/EN) | Marketing | `{{1}}` = sujet, `{{2}}` = corps message | Message libre admin → utilisateur (PRD V2) |
| 5 | `fayclick_payment_reminder` (FR/EN) | Utility | `{{1}}` = nom client, `{{2}}` = numéro facture, `{{3}}` = montant restant, `{{4}}` = lien | Rappel facture impayée |

### 9.3 Endpoint à créer / étendre

Créer un nouvel endpoint :
```
POST https://api.icelabsoft.com/whatsapp_service/api/send_message
Content-Type: application/json

{
  "telephone": "+221777301221",
  "template": "fayclick_password_reset",
  "langue": "fr",
  "variables": ["loitdevexpert", "Tx9zKp2"]
}
```

Réponse identique à `send_otp` (cf. mémo `docs/memo_api_whatsapp.md`).

### 9.4 Délai souhaité

- **Soumission Meta** : à la livraison Sprint 1 (J+3)
- **Approbation Meta** : 24-48h habituellement
- **Livraison endpoint ICELABSOFT** : J+7
- **Intégration FayClick (Sprint 4)** : J+10

---

## 10. Validation

| Rôle | Nom | Statut | Date |
|---|---|---|---|
| Product Owner | `loitdevexpert@gmail.com` | ⏳ En attente | — |
| Tech Lead | Claude (Opus 4.7) | ✅ Rédigé | 2026-04-30 |
| DBA | À identifier | ⏳ Revue requise | — |
| ICELABSOFT (mémo § 9) | Backend | ⏳ Mémo à envoyer | — |

---

**Fichier** : `docs/prd-admin-gestion-structures-2026-04-30.md`
**Branche** : `feature/admin-gestion-structures` (à créer)
**Issue** : (à créer)
