# Rapport DBA — Historique Client Public

**Date** : 2026-05-02
**Projet** : FayClick V2 — feature/historique-client-public
**Base de données** : `fayclick_db` — 154.12.224.173:3253
**Auteur** : Lead (exécution opérationnelle, agent dba_master bloqué par permissions Bash)
**PRD** : `docs/prd-historique-client-public-2026-05-02.md` (§ 4.2, § 4.3)

---

## 1. Résumé exécutif

Déploiement complet réussi de **2 fonctions PostgreSQL + 1 index partiel** sur `fayclick_db` pour la feature historique client public.

**Verdict** : 9/9 tests PASS (T1-T4, T6, T6b, T8, T9 + sample data réel) — **GO pour Sprint 2 UI**.

T5 (anonymisation effective) et T7 (vérification post-anonymisation) **skippés volontairement** sur prod (destructif irréversible) — validés via le flow E2E utilisateur en Sprint 4.

---

## 2. Objets déployés

### 2.1 Fonction `get_historique_achats_client`

```
get_historique_achats_client(
  p_telephone           VARCHAR,
  p_limit               INTEGER DEFAULT 20,
  p_offset              INTEGER DEFAULT 0,
  p_id_structure_filter INTEGER DEFAULT NULL
) RETURNS JSON
```

JOIN : `facture_com × structures × type_structure × recus_paiement` (LEFT JOIN sur les 3 derniers)

Retour JSON imbriqué :
```json
{
  "success": true,
  "data": {
    "achats": [...],         // tableau ordonné date_facture DESC
    "boutiques": [...],      // distinctes pour le client (dropdown filtre frontend)
    "pagination": { "total", "limit", "offset", "has_more" }
  }
}
```

### 2.2 Fonction `anonymiser_achat_client`

```
anonymiser_achat_client(
  p_id_facture INTEGER,
  p_telephone  VARCHAR
) RETURNS JSON
```

**Sécurité** : vérifie que `tel_client` actuel matche `p_telephone` AVANT toute modification.

**Action** :
- `UPDATE facture_com SET tel_client = '771234567', nom_client = 'CLIENT_ANONYME'`
- `UPDATE recus_paiement SET numero_telephone = '771234567'` (pour le `id_facture` matché)

### 2.3 Index partiel

```sql
CREATE INDEX idx_facture_com_tel_client
  ON public.facture_com USING btree (tel_client)
  WHERE ((tel_client)::text <> '771234567'::text);
```

**Bénéfice** : optimise les recherches `WHERE tel_client = ?` en excluant les ~X% lignes anonymisées (sentinelle `771234567`). Index partiel = plus petit, plus rapide.

---

## 3. Vérification des tables

| Table attendue (PRD) | Réel | Type |
|---|---|---|
| `facture_com` | ✅ | BASE TABLE |
| `list_factures_com` | (vue) | VIEW (utilisée pour SELECT, pas pour UPDATE) |
| `recus_paiement` | ✅ | BASE TABLE |
| `structures` | ✅ | BASE TABLE |
| `type_structure` | ✅ | BASE TABLE |

⚠️ **Note PRD** : la table `codes_promo_utilises` mentionnée dans le PRD § 6 n'existe pas — seule la table `partenaires` existe. Pas d'impact car les tests destructifs ont été skippés (cf. § 4 T5).

---

## 4. Résultats tests T1-T9

Tests effectués sur le téléphone réel `766448182` (8 achats sur structure 218 = LIBRAIRIE CHEZ KELEFA SCAT URBAM).

| Test | Description | Input | Output | OK/KO |
|------|-------------|-------|--------|-------|
| **T1** | Liste de base | `('766448182', 20, 0, NULL)` | success=true · total=8 · achats=8 · boutiques=1 | ✅ |
| **T2** | Filtre boutique | `('766448182', 20, 0, 218)` | total=8 · achats=8 (toutes sur cette structure) | ✅ |
| **T3** | Pagination page 1 | `('766448182', 2, 0, NULL)` | total=8 · achats=2 · has_more=true | ✅ |
| **T3b** | Pagination page 4 | `('766448182', 2, 6, NULL)` | total=8 · achats=2 · has_more=false | ✅ |
| **T4** | Téléphone inconnu | `('799999999', 20, 0, NULL)` | success=true · total=0 · achats=[] · boutiques=[] | ✅ |
| **T5** | Anonymisation effective | SKIPPED — destructif sur prod | À valider via UI E2E (Sprint 4) | ⏸ |
| **T6** | Anonymiser tel faux | `(151185, '700000000')` | success=false · `"Cette facture n'appartient pas à ce numéro"` | ✅ |
| **T6b** | Facture inexistante | `(99999999, '700000000')` | success=false · `"Facture introuvable"` | ✅ |
| **T7** | Vérif post-anonymisation | SKIPPED — dépend de T5 | À valider via UI E2E (Sprint 4) | ⏸ |
| **T8** | Index présent | `pg_indexes` | `CREATE INDEX idx_facture_com_tel_client ... WHERE tel_client <> '771234567'` | ✅ |
| **T9** | Validation entrée | `('123', 20, 0, NULL)` | success=false · `"Téléphone invalide"` | ✅ |

**Échantillon T1 (achat retourné)** :
```json
{
  "id_facture": 151185,
  "id_structure": 218,
  "num_facture": "FAC-218-...",
  "numrecu": "REC-218-151185-1777555635634",
  "nom_structure": "LIBRAIRIE CHEZ KELEFA SCAT URBAM",
  "structure_logo": null,
  "type_structure": "COMMERCIALE",
  "date_facture": "2026-04-30",
  "montant": 58500,
  "mt_acompte": 58500,
  "mt_restant": 0,
  "methode_paiement": "CASH",
  "date_paiement": "2026-04-30T...",
  "recu_numero": "REC-..."
}
```

→ Compatible avec le type TS `AchatClient` défini dans `types/historique.ts`.

---

## 5. Compatibilité Frontend

Service Frontend `services/historique-client.service.ts` (commit `517cd0b`) appelle :
- `SELECT get_historique_achats_client('${tel}', ${limit}, ${offset}, ${id_structure_filter ?? 'NULL'})`
- `SELECT anonymiser_achat_client(${id_facture}, '${tel}')`

→ Signatures **strictement alignées** avec les fonctions PG déployées.

---

## 6. Recommandations Frontend (Sprint 2-3)

1. **Téléphone** : valider `^\+?\d{8,15}$` côté UI avant envoi (la fonction PG valide aussi mais autant éviter un round-trip).
2. **Edge case T4** : si `total=0` et `boutiques=[]` → afficher empty state "Aucun achat trouvé pour ce numéro" (pas de spinner infini).
3. **Edge case `methode_paiement`** : peut être `null` (achats anciens sans reçu) ou des valeurs legacy : `OM`, `WAVE`, `FREE`, `CASH`, `MOBILE_MONEY`. Mapper côté UI :
   - `OM` / `MOBILE_MONEY` → `"Orange Money"`
   - `WAVE` → `"Wave"`
   - `FREE` → `"Free Money"`
   - `CASH` → `"Espèces"`
   - autre / null → `"-"`
4. **Edge case `recu_numero` null** : possible pour les achats sans paiement enregistré dans `recus_paiement` (legacy ou cas exceptionnel). Le bouton "Afficher" devra gérer cas où le reçu n'existe pas (404 sur `/recu?token=...`) — afficher toast d'erreur.
5. **Pagination** : utiliser `pagination.has_more` directement plutôt que recalculer `(offset + limit) < total`.

---

## 7. État post-déploiement

```
Fonctions créées : 2 ✅
Index créé : 1 ✅
Tests PASS : 9/9 (2 skippés volontairement)
Données prod modifiées : 0 (aucun UPDATE destructif exécuté)
```

---

## 8. Fichiers de déploiement

- Script principal : `C:\tmp\pgquery\historique_client_2026-05-02.js`

---

**Verdict final** : 🟢 **GO pour Sprint 2 UI** (Task #20).
