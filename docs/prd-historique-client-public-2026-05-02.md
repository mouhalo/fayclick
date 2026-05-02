# PRD — Historique Client Public (page publique avec OTP WhatsApp)

| Méta | Valeur |
|---|---|
| **Date** | 2026-05-02 |
| **Version** | 1.0 |
| **Statut** | DRAFT — validé fonctionnellement par PO |
| **Auteur** | Claude (Opus 4.7) — Lead Tech FayClick |
| **Branche cible** | `feature/historique-client-public` (créée) |
| **Dépendances** | DBA (2 fonctions PG à créer) · ICELABSOFT (endpoint `send_otp` déjà opérationnel) |

---

## 1. Contexte & Objectifs

### 1.1 Contexte

FayClick V2 propose 3 pages publiques de paiement (`/catalogue?id=XXX`, `/produit?token=XXX`, `/facture?token=XXX`) accessibles sans authentification. Après un achat, le client reçoit un reçu par lien partageable (`/recu?token=YYY`) mais **n'a aucun moyen de retrouver l'historique de tous ses achats** s'il a perdu le lien — alors qu'il est identifié uniquement par son numéro de téléphone.

### 1.2 Objectifs

Donner à tout client final un **moyen autonome** de :

1. **Retrouver l'historique** de tous ses achats sur la marketplace FayClick à partir de son numéro de téléphone, sans inscription
2. **Visualiser/réimprimer** un reçu d'achat à tout moment via le lien public existant
3. **Anonymiser** un achat spécifique pour qu'il ne s'affiche plus dans son historique (RGPD light)

Le tout protégé par un **OTP WhatsApp** pour vérifier la propriété du numéro avant affichage des données.

### 1.3 Hors-scope (V1)

- Historique enrichi (top boutiques, statistiques personnelles, totaux annuels)
- Suppression définitive (`DELETE` PostgreSQL) — uniquement anonymisation pour préserver la comptabilité
- Filtres avancés (période, montant, mode paiement) — uniquement filtre par boutique
- Multi-langue : V1 en français uniquement (locale wo/en en V2)
- Page accessible depuis admin/dashboard — uniquement via les pages publiques marketplace
- Re-création du reçu si jamais détruit — utilise uniquement le reçu déjà généré

---

## 2. Personas & User Stories

### 2.1 Persona

**Client final marketplace FayClick** (anonyme, identifié par son téléphone)
- N'a pas de compte FayClick
- A acheté ≥ 1 fois sur une boutique publique
- Utilise principalement son **smartphone Android**
- Possède WhatsApp installé (~95% au Sénégal)
- Cherche un de ses anciens reçus pour preuve d'achat ou réimpression

### 2.2 User Stories

| ID | Story | Critères d'acceptation |
|---|---|---|
| **US-1** | En tant que client, je veux **demander mon historique** en saisissant mon numéro de téléphone | Validation format (9 chiffres SN ou E.164), bouton "Envoyer code" déclenche l'OTP WhatsApp |
| **US-2** | En tant que client, je veux **valider mon identité** via un code OTP reçu par WhatsApp | OTP 5 chiffres, expire 5 min, max 3 tentatives, fallback "renvoyer le code" après 30s |
| **US-3** | En tant que client, je veux **voir la liste de mes achats** sous forme de cartes (boutique, date, n° reçu, montant, mode paiement) | Pagination 20/page (load more), tri date desc, image logo boutique |
| **US-4** | En tant que client, je veux **filtrer la liste par boutique** (ex: voir seulement les achats sur "TECH24") | Dropdown boutique avec recherche, "Toutes" par défaut |
| **US-5** | En tant que client, je veux **afficher le reçu** d'un achat dans un nouvel onglet | Bouton "Afficher" → ouvre `/recu?token=YYY` (URL générée via `recuService.generateUrlPartage`) |
| **US-6** | En tant que client, je veux **anonymiser un achat** pour qu'il ne s'affiche plus dans mon historique | Modal confirmation, anonymise UNIQUEMENT cette facture (`tel_client → '771234567'`, `nom_client → 'CLIENT_ANONYME'`), refresh liste |
| **US-7** | En tant qu'utilisateur de la marketplace mobile, je veux **un bouton Historique** dans la navigation pour accéder à cette page | Remplace le bouton "Recherche" actuel dans `BottomNavMarketplace` (icône `History`) sur les 3 callsites |

---

## 3. Spécifications fonctionnelles

### 3.1 Workflow global (3 étapes)

```
[Étape 1] Saisie téléphone
    │
    ├─ Validation format (9 chiffres SN ou E.164)
    ├─ Génération OTP 5 chiffres côté front (crypto.getRandomValues)
    └─ Envoi via whatsAppService.sendDirectWhatsApp(tel, code, 'fr')
         │
         ▼
[Étape 2] Saisie OTP
    │
    ├─ Comparaison string code saisi vs code généré
    ├─ Max 3 tentatives, expiration 5 min
    ├─ Lien "renvoyer le code" actif après 30s
    └─ Si OK → étape 3
         │
         ▼
[Étape 3] Liste des achats
    │
    ├─ Appel get_historique_achats_client(tel, limit=20, offset=0, id_structure_filter=NULL)
    ├─ Affichage cartes (CarteAchatClient)
    ├─ Filtre boutique (dropdown des boutiques où le client a acheté)
    ├─ Bouton "Charger plus" (offset += 20)
    ├─ Action "Afficher" → ouvre /recu?token=...
    └─ Action "Supprimer" → modal confirmation → anonymiser_achat_client(id_facture, tel) → refresh
```

### 3.2 US-1 — Saisie téléphone (Étape 1)

**UI** : page `/historique` avec :
- Header décoratif (logo FayClick + titre "Mon historique d'achats")
- Carte centrale glassmorphism :
  - Icône `Phone` 
  - Texte explicatif : "Saisissez votre numéro de téléphone pour retrouver tous vos achats sur FayClick"
  - Input téléphone (format auto SN, placeholder "771234567" ou +221xxxxxxx)
  - Bouton primaire "Envoyer le code WhatsApp" (vert WhatsApp)
  - Note discrète : "Un code de validation sera envoyé sur votre WhatsApp"
- Footer : lien retour vers la page précédente (history.back())

**Validation** :
- Téléphone requis
- Format strict : 9 chiffres SN (commence par 7) OU E.164 (`+\d{8,15}`)

### 3.3 US-2 — Saisie OTP (Étape 2)

**UI** :
- Reprend le pattern visuel de `ModalRecoveryOTP.tsx` (existant)
- Input OTP 5 chiffres (chacun dans une case)
- Compteur "Code expire dans XX:XX" (5 min)
- Compteur tentatives restantes (3 max)
- Bouton "Renvoyer le code" (désactivé pendant 30s, puis actif)
- Lien "Modifier le numéro" (retour étape 1)

**Sécurité** :
- Code stocké uniquement en **state React** (pas localStorage/sessionStorage pour limiter exposition)
- Expiration TTL 5 min strict (timestamp à la génération)
- Si 3 tentatives KO → reset complet, retour étape 1
- Si OTP correct → token de session de courte durée (15 min) en sessionStorage pour éviter de redemander à chaque action

### 3.4 US-3 — Liste des achats (Étape 3)

**Composant `CarteAchatClient`** (1 carte par achat) :

```
┌────────────────────────────────────────────────┐
│  [logo]  TECH24                       [Date]   │
│          ALIMENTATION              02 mai 2026 │
│  ─────────────────────────────────────────────  │
│  N° reçu : REC-2026-1289                       │
│  Montant : 12 500 FCFA                         │
│  Paiement : 🟧 Orange Money                    │
│  ─────────────────────────────────────────────  │
│       [👁 Afficher]      [🗑 Supprimer]        │
└────────────────────────────────────────────────┘
```

**Affichage liste** :
- Pagination "load more" : bouton "Charger plus" en bas, offset += 20
- Loader en bas pendant fetch
- Empty state si aucun achat : "Aucun achat trouvé pour ce numéro"

### 3.5 US-4 — Filtre par boutique

**UI** : 
- Dropdown au-dessus de la liste : "Toutes les boutiques" (défaut) | liste alphabétique des boutiques distinctes du client
- La liste des boutiques est calculée par la fonction PG dans le retour JSON (sous forme de tableau `boutiques: [{id_structure, nom_structure}]`)
- Sur changement → refetch avec `id_structure_filter` + reset pagination à 0

### 3.6 US-5 — Afficher reçu

**Action** : bouton "Afficher" sur chaque carte
- Génère l'URL via `recuService.generateUrlPartage(id_structure, id_facture)` → `https://fayclick.com/recu?token=...`
- Ouvre dans un **nouvel onglet** (`window.open(url, '_blank', 'noopener,noreferrer')`)
- Pas de fermeture de la page historique → user peut consulter plusieurs reçus

### 3.7 US-6 — Anonymiser un achat

**Workflow** :
1. Clic "Supprimer" sur la carte → modal `ModalConfirmAnonymiser`
2. Modal explicite :
   - Titre rouge : "Supprimer cet achat de mon historique ?"
   - Snapshot : "Boutique TECH24 • REC-2026-1289 • 12 500 FCFA"
   - Avertissement : "Cette action est **irréversible**. L'achat sera anonymisé et vous ne pourrez plus le retrouver dans votre historique. Le commerçant conserve la trace comptable de la transaction."
   - Boutons "Annuler" / "Supprimer définitivement" (rouge)
3. Confirmation → appel `anonymiser_achat_client(p_id_facture, p_telephone)` → backend valide que `p_telephone` correspond bien au `tel_client` actuel (sécurité)
4. Toast succès → refresh liste (l'achat disparaît car son `tel_client` est maintenant `'771234567'`)

### 3.8 US-7 — Bouton Historique dans BottomNavMarketplace

**Modification** : remplacer l'onglet "Recherche" par "Historique" (icône `History` lucide-react) dans `BottomNavMarketplace.tsx`.

⚠️ **Impact sur 3 callsites** :
- `CataloguePublicClient.tsx` : passait `tab === 'cart'` → garder + ajouter case `'history'`
- `CataloguesGlobalClient.tsx` : passait `'search'` → remplacer par `'history'`

**Au clic sur "Historique"** : `router.push('/historique')` (ou `window.location.href` selon le contexte)

---

## 4. Spécifications techniques

### 4.1 Fonctions PostgreSQL — résumé

| Fonction | État | Action |
|---|---|---|
| `get_historique_achats_client` | ❌ Manquante | **À créer** (cf. § 4.2) |
| `anonymiser_achat_client` | ❌ Manquante | **À créer** (cf. § 4.3) |

### 4.2 Fonction `get_historique_achats_client`

```sql
CREATE OR REPLACE FUNCTION public.get_historique_achats_client(
  p_telephone           VARCHAR,
  p_limit               INTEGER DEFAULT 20,
  p_offset              INTEGER DEFAULT 0,
  p_id_structure_filter INTEGER DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql AS $func$
DECLARE
  v_total      INTEGER;
  v_achats     JSON;
  v_boutiques  JSON;
BEGIN
  -- Validation
  IF p_telephone IS NULL OR length(trim(p_telephone)) < 9 THEN
    RETURN json_build_object('success', false, 'message', 'Téléphone invalide');
  END IF;

  -- Compte total (avec ou sans filtre boutique)
  SELECT COUNT(*) INTO v_total
  FROM facture_com f
  WHERE f.tel_client = p_telephone
    AND f.tel_client <> '771234567'  -- exclure les achats déjà anonymisés
    AND (p_id_structure_filter IS NULL OR f.id_structure = p_id_structure_filter);

  -- Liste paginée
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_achats
  FROM (
    SELECT
      f.id_facture,
      f.id_structure,
      f.num_facture,
      f.numrecu,
      s.nom_structure,
      s.logo            AS structure_logo,
      ts.nom_type       AS type_structure,
      f.date_facture,
      f.montant,
      f.mt_acompte,
      f.mt_restant,
      r.methode_paiement,
      r.date_paiement,
      r.numero_recu     AS recu_numero
    FROM facture_com f
    LEFT JOIN structures      s  ON s.id_structure  = f.id_structure
    LEFT JOIN type_structure  ts ON ts.id_type      = s.id_type
    LEFT JOIN recus_paiement  r  ON r.id_facture    = f.id_facture
    WHERE f.tel_client = p_telephone
      AND f.tel_client <> '771234567'
      AND (p_id_structure_filter IS NULL OR f.id_structure = p_id_structure_filter)
    ORDER BY f.date_facture DESC, f.id_facture DESC
    LIMIT p_limit OFFSET p_offset
  ) t;

  -- Liste des boutiques distinctes du client (pour le dropdown filtre)
  SELECT COALESCE(json_agg(row_to_json(b)), '[]'::json) INTO v_boutiques
  FROM (
    SELECT DISTINCT f.id_structure, s.nom_structure
    FROM facture_com f
    LEFT JOIN structures s ON s.id_structure = f.id_structure
    WHERE f.tel_client = p_telephone
      AND f.tel_client <> '771234567'
    ORDER BY s.nom_structure
  ) b;

  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'achats',     v_achats,
      'boutiques',  v_boutiques,
      'pagination', json_build_object(
        'total',  v_total,
        'limit',  p_limit,
        'offset', p_offset,
        'has_more', (p_offset + p_limit) < v_total
      )
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$func$;
```

### 4.3 Fonction `anonymiser_achat_client`

```sql
CREATE OR REPLACE FUNCTION public.anonymiser_achat_client(
  p_id_facture  INTEGER,
  p_telephone   VARCHAR
) RETURNS JSON
LANGUAGE plpgsql AS $func$
DECLARE
  v_tel_actuel  VARCHAR;
  v_id_structure INTEGER;
BEGIN
  -- Validation entrée
  IF p_id_facture IS NULL OR p_telephone IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Paramètres requis manquants');
  END IF;

  -- Vérifier que la facture appartient bien à ce téléphone (sécurité)
  SELECT tel_client, id_structure
  INTO v_tel_actuel, v_id_structure
  FROM facture_com
  WHERE id_facture = p_id_facture;

  IF v_tel_actuel IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Facture introuvable');
  END IF;

  IF v_tel_actuel <> p_telephone THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cette facture n''appartient pas à ce numéro'
    );
  END IF;

  -- Anonymisation : tel_client + nom_client → valeurs sentinelles
  UPDATE facture_com
  SET tel_client = '771234567',
      nom_client = 'CLIENT_ANONYME'
  WHERE id_facture = p_id_facture;

  -- Anonymiser également le numéro de téléphone côté reçu de paiement
  UPDATE recus_paiement
  SET numero_telephone = '771234567'
  WHERE id_facture = p_id_facture;

  RETURN json_build_object(
    'success', true,
    'message', 'Achat anonymisé avec succès',
    'data', json_build_object(
      'id_facture',   p_id_facture,
      'id_structure', v_id_structure
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$func$;
```

⚠️ **Note RGPD/comptable** : `nom_classe`, `description`, `mt_remise`, `montant` sont conservés pour la traçabilité comptable côté commerçant — seul l'identifiant client est masqué.

### 4.4 Service WhatsApp OTP (réutilisation)

`services/whatsapp.service.ts` existe déjà avec `sendDirectWhatsApp({ telephone, code, langue })`. Aucune modification requise. La validation OTP reste **côté frontend** (comparaison string en mémoire).

**Pattern d'utilisation** dans le composant Historique :

```typescript
// 1. Génération du code (5 chiffres)
const code = String(Math.floor(10000 + Math.random() * 90000));
setSavedOtp({ code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

// 2. Envoi WhatsApp
const phoneE164 = telephone.startsWith('+') ? telephone : `+221${telephone}`;
const wa = await whatsAppService.sendDirectWhatsApp({
  telephone: phoneE164,
  code,
  langue: 'fr'
});
if (!wa.success) { /* fallback ou retry */ }

// 3. Vérification (à la soumission)
if (saisie === savedOtp.code && Date.now() < savedOtp.expiresAt) {
  // OK → passage étape 3
}
```

### 4.5 Côté frontend — Services TS

| Fichier | État | Modifs |
|---|---|---|
| `services/historique-client.service.ts` | **Nouveau** | Singleton avec : `getHistoriqueAchats(tel, limit, offset, structureFilter?)` + `anonymiserAchat(idFacture, tel)` |
| `services/whatsapp.service.ts` | Existant | Aucune (réutilisation `sendDirectWhatsApp`) |
| `services/recu.service.ts` | Existant | Aucune (réutilisation `generateUrlPartage`) |
| `types/historique.ts` | **Nouveau** | `AchatClient`, `BoutiqueClient`, `HistoriqueResponse`, `AnonymiserResponse` |

### 4.6 Côté frontend — Composants

| Composant | État | Description |
|---|---|---|
| `app/historique/page.tsx` | **Nouveau** | Route Next.js (Suspense + lecture query params si besoin) |
| `components/historique/HistoriqueClientPage.tsx` | **Nouveau** | Orchestrateur 3 étapes (`step` state : 'phone' \| 'otp' \| 'list') |
| `components/historique/StepPhone.tsx` | **Nouveau** | Étape 1 — saisie téléphone + envoi OTP |
| `components/historique/StepOtp.tsx` | **Nouveau** | Étape 2 — saisie code + vérif + renvoi |
| `components/historique/ListeAchatsClient.tsx` | **Nouveau** | Étape 3 — header + filtre + liste cartes + pagination |
| `components/historique/CarteAchatClient.tsx` | **Nouveau** | Carte d'un achat (boutique, date, n°reçu, montant, mode paiement, 2 boutons) |
| `components/historique/FiltreBoutique.tsx` | **Nouveau** | Dropdown boutique |
| `components/historique/ModalConfirmAnonymiser.tsx` | **Nouveau** | Confirmation suppression irréversible |
| `components/marketplace/BottomNavMarketplace.tsx` | **Étendre** | Remplace `Search` par `History`, callback `'history'` au lieu de `'search'` |
| `components/catalogue/CataloguePublicClient.tsx` | **Étendre** | Gérer le cas `tab === 'history'` → `router.push('/historique')` |
| `components/catalogue/CataloguesGlobalClient.tsx` | **Étendre** | Idem |

### 4.7 Routes

| Route | Composant | Accès |
|---|---|---|
| `/historique` | `HistoriqueClientPage` | Public (sans auth) |
| `/historique?tel=771234567` | Idem, mais pré-remplit le téléphone | Public |

---

## 5. Décisions de design

### 5.1 OTP côté frontend uniquement

V1 : code généré + vérifié côté front (pas de BD). Risque limité car les données accessibles sont des achats personnels (pas financièrement sensibles), et la friction d'un OTP backend ralentirait inutilement.

V2 (potentielle) : `add_demande_password` PG existante peut être adaptée pour stocker un code temporaire en BD avec validation backend.

### 5.2 Anonymisation par marqueur (pas DELETE)

Le choix de remplacer `tel_client` par `'771234567'` (et `nom_client` par `'CLIENT_ANONYME'`) au lieu d'un `DELETE` :
- ✅ Préserve la **traçabilité comptable** côté commerçant
- ✅ La fonction `get_historique_achats_client` filtre `WHERE tel_client <> '771234567'` → l'achat disparaît de l'historique du client
- ✅ Le commerçant voit toujours la facture dans son tableau de bord (avec mention "Client anonyme")
- ✅ Réversibilité humaine possible (recréer la liaison via une autre source)

### 5.3 Validation propriété de la facture côté backend

`anonymiser_achat_client` vérifie que `tel_client` actuel correspond au `p_telephone` fourni, **avant** la mise à jour. Évite qu'un attaquant envoie l'`id_facture` d'une autre personne.

### 5.4 Pagination "load more" plutôt que pages numérotées

UX mobile-first : bouton "Charger plus" en bas est plus naturel que des numéros de page sur petit écran. Préserve aussi le state des achats déjà chargés.

---

## 6. Plan de Sprint

### Sprint 1 — Backend DBA + Services TS (3h estimées)

**DBA (`dba_master`)** :
- [ ] Créer `get_historique_achats_client` (PRD § 4.2)
- [ ] Créer `anonymiser_achat_client` (PRD § 4.3)
- [ ] Tests unitaires sur quelques téléphones SIMULA27 réels
- [ ] Index recommandé : `CREATE INDEX IF NOT EXISTS idx_facture_com_tel_client ON facture_com(tel_client) WHERE tel_client <> '771234567';`

**Frontend (`fullstack-web-expert`)** :
- [ ] `types/historique.ts`
- [ ] `services/historique-client.service.ts` (CRUD via fonctions PG)
- [ ] Aucune UI à ce stade

### Sprint 2 — Page + workflow OTP (étapes 1 & 2) (3h)

**Frontend** :
- [ ] `app/historique/page.tsx`
- [ ] `HistoriqueClientPage.tsx` (orchestrateur 3 étapes)
- [ ] `StepPhone.tsx` (saisie téléphone + envoi OTP via `whatsAppService.sendDirectWhatsApp`)
- [ ] `StepOtp.tsx` (saisie code 5 chiffres + verif + renvoi 30s)
- [ ] Tests manuels OTP avec un numéro réel

### Sprint 3 — Liste achats + filtres + actions (3h)

**Frontend** :
- [ ] `ListeAchatsClient.tsx` (orchestrateur étape 3)
- [ ] `CarteAchatClient.tsx` (1 carte par achat avec 2 boutons)
- [ ] `FiltreBoutique.tsx` (dropdown)
- [ ] Pagination "load more" (offset += 20)
- [ ] Bouton "Afficher" → `recuService.generateUrlPartage` + `window.open` nouvel onglet
- [ ] `ModalConfirmAnonymiser.tsx` + appel `anonymiserAchat`
- [ ] Loading states + empty state + erreurs

### Sprint 4 — Bouton Historique dans BottomNav + Tests + Deploy (2h)

**Frontend** :
- [ ] Modifier `BottomNavMarketplace.tsx` : `Search` → `History` + label `t('nav.history')`
- [ ] Ajouter clé i18n `nav.history` (FR/EN/WO)
- [ ] Mettre à jour les 2 callsites (`CataloguePublicClient`, `CataloguesGlobalClient`) pour gérer `tab === 'history'`
- [ ] Tests E2E (Chrome DevTools MCP) sur mobile : flow complet OTP → liste → Afficher → Anonymiser
- [ ] Build + commit + merge main + deploy prod

---

## 7. Risques & Dépendances

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Quota WhatsApp Meta dépassé (250/jour gratuit) si beaucoup d'utilisateurs | Moyenne | Moyen | Monitor `quota.used` via `/status`, prévoir fallback SMS via `send_o_sms` si SN |
| R2 | Numéro `'771234567'` est aussi un numéro réel d'un client → pollution | Faible | Faible | Filtre WHERE explicite sur la valeur sentinelle dans la fonction PG |
| R3 | Performance lente sur recherche `WHERE tel_client = ?` sans index | Moyenne | Moyen | Index `idx_facture_com_tel_client` créé en Sprint 1 |
| R4 | Attaquant tape un numéro inconnu et reçoit un OTP → spam | Moyenne | Faible | Rate limit côté ICELABSOFT (déjà en place, 20 req/min) |
| R5 | Reçu manquant si `add_acompte_facture` n'a pas créé de ligne `recus_paiement` (cas legacy) | Moyenne | Faible | LEFT JOIN dans la fonction → l'achat reste affiché même sans reçu, bouton "Afficher" peut alors retourner 404 → message clair |

---

## 8. Critères d'acceptation globaux

- [ ] OTP WhatsApp reçu en < 10s pour 95% des cas
- [ ] Liste des achats affichée en < 2s pour un client avec ≤ 100 achats
- [ ] Pagination fluide sans scroll loss
- [ ] Filtre boutique mis à jour instantanément (refetch)
- [ ] Anonymisation : la carte disparaît de la liste après confirmation, sans reload manuel
- [ ] Bouton "Afficher" ouvre le bon reçu dans un nouvel onglet
- [ ] BottomNav mobile montre bien l'icône `History` sur les 3 callsites
- [ ] Aucune régression sur le bouton Panier (gardé pour CataloguePublicClient)
- [ ] Aucune régression sur les pages publiques de paiement
- [ ] Build production OK + tests manuels prod sur les 3 pages

---

## 9. Workflow utilisateur (capture mentale)

```
Utilisateur sur https://fayclick.com/catalogue?id=183 (mobile)
  → Tap onglet "Historique" en bas de l'écran
  → Arrive sur https://fayclick.com/historique
  → Saisit "777301221"
  → Tap "Envoyer le code WhatsApp"
  → Reçoit code OTP sur WhatsApp en < 10s : "🔐 Votre code FayClick : 47892"
  → Saisit "47892"
  → Voit la liste de ses achats (8 achats sur 3 boutiques)
  → Filtre par boutique "TECH24" → 5 achats
  → Tap "Afficher" sur le 1er achat (REC-2026-1289 / 12 500 FCFA)
  → Reçu s'ouvre dans un nouvel onglet (https://fayclick.com/recu?token=...)
  → Retour à l'historique
  → Tap "Supprimer" sur un vieux achat de test
  → Confirme suppression
  → L'achat disparaît de la liste, toast "Achat anonymisé avec succès"
```

---

## 10. Validation

| Rôle | Statut | Date |
|---|---|---|
| Product Owner | ✅ Réponses validées | 2026-05-02 |
| Tech Lead | ✅ Rédigé | 2026-05-02 |
| DBA | ⏳ Revue requise (Sprint 1) | — |

---

**Fichier** : `docs/prd-historique-client-public-2026-05-02.md`
**Branche** : `feature/historique-client-public` (créée)
