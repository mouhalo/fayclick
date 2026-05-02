# Memo de reprise — Audit du flow de réabonnement

**Date d'ouverture** : 2026-05-02
**Branche de travail** : `fix/audit-reabonnement-2026-05-02`
**État** : audit terminé, patch SQL prêt, **test live runtime à faire**

---

## Contexte initial

Le PO a rapporté un symptôme sur le réabonnement (Settings → onglet Abonnements) :

> « Le polling de paiement réussit (status COMPLETED côté wallet), mais on
> dirait que la base de données n'est pas mise à jour aussitôt après. »

Compte de test fourni : `administrateur@alloshop.fay / 777301221@`
(structure `139 — ALLOSHOP`, type `COMMERCIALE`, abonnement MENSUEL)

---

## Ce qui a été fait

### 1. Audit statique frontend (agent qa-test-regression)
- `services/subscription.service.ts` — appel DB OK (parse PG `typeof === 'string'`)
- `services/payment-wallet.service.ts` — polling COMPLETED OK
- `components/subscription/ModalPaiementAbonnement.tsx:178` — `startPolling(uuid, jours, method)` passe les valeurs en paramètres → **pas de closure stale**
- `app/settings/page.tsx:520-551` — `handleSubscriptionSuccess` appelle bien `refreshAuth()` puis `getStructureDetails()`
- **Verdict** : pas de bug évident à la lecture du code frontend

### 2. Audit DBA (agent dba_master) — `fayclick_db` sur `154.12.224.173:3253`

Rapport complet : `docs/dba/rapport-audit-reabonnement-2026-05-02.md`
Dumps prod (référence figée) : `docs/dba/scripts/prod-*-2026-05-02.sql` (7 fichiers)

Cinq anomalies indépendantes du symptôme PO :

| ID | Sévérité | Anomalie |
|---|---|---|
| INC-01 | **BLOQUANT** | Off-by-one : `v_date_fin := v_date_debut + v_duree_jours` au lieu de `... - 1`. Cascade sur structure 203 (date_fin tombe le 1er du mois suivant). |
| INC-02 | **BLOQUANT** | Montant MENSUEL hardcodé à `30 × 100` ; en février (28j) → 3 000 FCFA au lieu de 2 800. La colonne `param_structure.mensualite` n'est consultée par aucune fonction. |
| INC-04 | MAJEUR | `nombre_jours = 1` sur 1 646 / 1 663 lignes (dette historique, `add_abonnement_structure` n'insère pas la colonne). |
| INC-05 | MAJEUR | Vue `list_structures` retourne `etat_abonnement = 'ACTIF'` pour 1 626 structures expirées (statut brut sans recalcul temporel). |
| INC-03 / INC-06 | MINEUR | Risque EXCLUDE théorique sur dates adjacentes ; absence de `RAISE LOG` pour traçabilité. |

### 3. Patch SQL préparé (NON APPLIQUÉ)

Fichier : `docs/dba/scripts/patch-inc-01-02-2026-05-02.sql`

- INC-01 : ajout du `- 1` dans `renouveler_abonnement`
- INC-02 : appel à `calculer_montant_abonnement(type, date_debut)` pour MENSUEL/ANNUEL ; fallback `p_nombre_jours × 100` pour autres types
- Bonus INC-06 (partiel) : `RAISE LOG` avant succès + dans `EXCEPTION WHEN OTHERS`
- Encadré `BEGIN ... ROLLBACK` (le `COMMIT` est commenté → exécution sans risque par défaut)
- **Aucun changement de signature** → couche frontend non impactée
- Smoke tests documentés en en-tête

---

## Ce qui reste à faire

### Tâche 1 — Test live runtime du symptôme PO (PRIORITAIRE)

Trois hypothèses à départager pour identifier la cause racine du symptôme
« BD pas mise à jour aussitôt » :

- **A** : l'UI lit `list_structures.etat_abonnement` (statut brut figé, INC-05) au lieu de recalculer via `get_une_structure`
- **B** : `refreshAuth()` manque après confirmation paiement quelque part
- **C** : `renouveler_abonnement` retourne `success: false` silencieusement (contrainte unique sur `ref_abonnement` ou `uuid_paiement`) sans remontée d'erreur côté UI

Pour départager, **trois voies possibles selon l'environnement disponible** :

1. **B.1 (recommandé)** — Installer le MCP Playwright dans Claude Code :
   ```bash
   claude mcp add playwright -- npx -y @playwright/mcp@latest
   ```
   Puis redémarrer Claude Code et relancer l'agent qa-test-regression.

2. **B.2** — Le PO pilote Chrome (DevTools Network + Console), Claude guide
   pas à pas et le PO partage 5 screenshots + 4 réponses discriminantes :
   - SQL `renouveler_abonnement` émis ?
   - Réponse `success: true` ?
   - Log `🚀 [SUBSCRIPTION-MODAL] Enregistrement abonnement` visible ?
   - Date d'expiration mise à jour après Ctrl+Shift+R ?

3. **B.3** — Instrumentation : ajouter des `console.log` ciblés dans
   `subscription.service.ts`, `app/settings/page.tsx` (handler post-paiement)
   et le wallet polling, déployer en preview, reproduire, lire les logs prod.

### Tâche 2 — Application du patch SQL INC-01 + INC-02

**Pré-requis** : validation explicite du PO + fenêtre de maintenance.

**Procédure** :
1. Connexion à `fayclick_db` sur `154.12.224.173:3253`
2. Ouvrir `docs/dba/scripts/patch-inc-01-02-2026-05-02.sql`
3. Exécuter le bloc `BEGIN; ... ROLLBACK;` tel quel
4. Vérifier les 3 smoke tests en en-tête du fichier
5. Si les checks sont verts : décommenter `COMMIT;` (commenter le `ROLLBACK;`) et ré-exécuter
6. Vérification post-patch :
   - `SELECT pg_get_functiondef('renouveler_abonnement'::regproc) ILIKE '%v_duree_jours - 1%';` → `true`
   - `SELECT pg_get_functiondef('add_abonnement_structure_avec_dates'::regproc) ILIKE '%calculer_montant_abonnement%';` → `true`
   - Test sur structure inactive : `SELECT renouveler_abonnement(<id_test>, 'MENSUEL', 'OM');`

### Tâche 3 — Décisions à prendre sur INC-04 et INC-05

- **INC-04** (dette `nombre_jours = 1` sur 1 646 lignes) : le rapport propose un `UPDATE` correctif + correction de `add_abonnement_structure` pour inclure la colonne. Décision PO : appliquer ou laisser ?
- **INC-05** (vue `list_structures` faussement ACTIF) : refonte de la vue pour recalculer `etat_abonnement` au moment de la lecture. Si l'UI lit cette vue, c'est probablement la cause racine du symptôme PO (hypothèse A).

### Tâche 4 — Merge et déploiement

Une fois les tâches 1 + 2 validées :
1. Vérifier que le frontend continue de fonctionner (les signatures PG n'ont pas changé)
2. Merge `fix/audit-reabonnement-2026-05-02` → `main`
3. Si des modifications frontend ont été nécessaires (refreshAuth manquant, etc.) : déploiement via `npm run deploy:build`

---

## État des branches au 2026-05-02

```
main (0f5e773)
├── 0f5e773 docs: PRD/rapports admin + historique + memos WhatsApp + scripts diag
├── af08975 ui(register): formulaire compact mobile (LogoUpload registerMode)
└── 07017b7 feat(remise): remise par article unifiée factures + proformas

fix/audit-reabonnement-2026-05-02 (13cf92d)
├── 13cf92d fix(dba): patch SQL INC-01 + INC-02
└── 0d8a9ae audit(dba): rapport audit + 7 dumps prod
```

---

## Démarrage rapide prochaine session

```bash
# 1. Se positionner sur la branche de travail
git checkout fix/audit-reabonnement-2026-05-02
git pull

# 2. Lire ce memo + le rapport d'audit
code docs/memo-reprise-audit-reabonnement-2026-05-02.md
code docs/dba/rapport-audit-reabonnement-2026-05-02.md

# 3. Choisir la voie de test live (B.1 / B.2 / B.3) avec le PO

# 4. Si patch SQL à appliquer :
code docs/dba/scripts/patch-inc-01-02-2026-05-02.sql
```

**Prompt de reprise pour Claude** (à coller en début de prochaine session) :

> Reprends la branche `fix/audit-reabonnement-2026-05-02`. Lis le memo
> `docs/memo-reprise-audit-reabonnement-2026-05-02.md` puis le rapport
> d'audit DBA. La tâche prioritaire est le **test live runtime** du
> symptôme PO « BD pas mise à jour après paiement de réabonnement »
> sur le compte `administrateur@alloshop.fay / 777301221@`. Demande
> au PO quelle voie il préfère (B.1 Playwright MCP, B.2 PO pilote Chrome,
> B.3 instrumentation logs).
