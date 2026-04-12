# Sprint 1 — Rapport d'exécution migration DB multi-pays

**Date d'exécution** : 2026-04-12
**Base cible** : `fayclick_db` (154.12.224.173:3253) — PRODUCTION
**Exécuté par** : Lead (via scripts Node.js pg, transaction atomique)
**Statut final** : ✅ **SUCCESS**

---

## 1. Reconnaissance préalable

| Vérification | Résultat |
|--------------|----------|
| Nombre de structures existantes | **1 681** |
| Valeurs `indicatif_pays` | Toutes `+221` (100%) |
| Colonnes `structures` avant migration | `indicatif_pays` (VARCHAR NOT NULL), `email` (VARCHAR NOT NULL) |
| Table `pays` préexistante | ❌ Non (à créer) |
| Fonction `add_edit_inscription` | ✅ Existe (12 params, ne référence pas `indicatif_pays`) |
| Vue `list_structures` | ✅ Existe (ne référence pas `indicatif_pays`) |
| Autres fonctions PG référençant `indicatif_pays` | **Aucune** |

→ DROP COLUMN `indicatif_pays` autorisé sans risque.

## 2. Migration exécutée (transaction unique)

```
BEGIN
  OK: CREATE TABLE pays (17 colonnes, CHECK, PK)
  OK: INSERT 17 pays (SN, CI, ML, BF, TG, BJ, NE, GW, GN, SL, LR, GH, NG, CV, MA, DZ, TN)
  OK: ALTER TABLE structures
      - ADD code_iso_pays CHAR(2) NOT NULL DEFAULT 'SN'
      - UPDATE 1681 lignes → 'SN'
      - FK fk_structures_pays → pays(code_iso)
      - INDEX idx_structures_code_iso_pays
      - CHECK chk_structures_email_pays_non_sn (email @gmail.com si pays ≠ SN)
      - DROP COLUMN indicatif_pays
  OK: CREATE FUNCTION add_edit_inscription_v2 (13 params)
COMMIT
```

**Durée** : ~2 secondes. Aucune erreur.

## 3. Vérifications post-migration (9 contrôles)

| # | Vérification | Attendu | Observé | Statut |
|---|--------------|---------|---------|--------|
| V1 | Table `pays` contient 17 lignes dont 1 avec `sms_supporte=TRUE` | 17/1/17 | 17/1/17 | ✅ |
| V2 | Toutes les structures existantes en `code_iso_pays='SN'` | 1681 | 1681 | ✅ |
| V3 | FK `fk_structures_pays` posée | 1 | 1 | ✅ |
| V4 | Colonne `indicatif_pays` supprimée | 0 lignes | 0 lignes | ✅ |
| V5 | CHECK `chk_structures_email_pays_non_sn` active | 1 | 1 | ✅ |
| V6 | `add_edit_inscription_v2('CI', email vide)` lève exception | Exception | `Email obligatoire pour les pays hors Sénégal...` | ✅ |
| V7 | `add_edit_inscription_v2('MA', 'test@yahoo.com')` lève exception | Exception | `Seules les adresses @gmail.com sont acceptées...` | ✅ |
| V8 | SN a `sms_supporte=TRUE` | 1 | 1 | ✅ |
| V9 | Fonction `add_edit_inscription_v2` créée | Existe | Existe | ✅ |

## 4. Hors scope Sprint 1 (reporté Sprint 2 si besoin)

Les fonctions d'affichage suivantes n'ont **pas** été modifiées (non bloquantes car ne référencent pas `indicatif_pays` avant migration) :

- `get_une_structure()` — à enrichir plus tard pour retourner `code_iso_pays` + objet `pays` (devise)
- `get_admin_detail_structure()`
- `get_admin_list_structures()` — filtre par pays
- Vue `list_structures`

Ces modifications ne sont **pas bloquantes** pour l'inscription des marchands non-SN car :
- La nouvelle fonction `add_edit_inscription_v2` gère déjà la validation et le patch de `code_iso_pays`
- Le code TypeScript peut lire `code_iso_pays` directement via un SELECT sur la table `structures` si besoin
- L'enrichissement peut se faire plus tard sans impact utilisateur

## 5. Scripts disponibles

| Script | Rôle | Chemin |
|--------|------|--------|
| `fayclick_recon.js` / `fayclick_recon2.js` | Reconnaissance pré-migration | `C:\tmp\pgquery\` |
| `fayclick_migration.js` | Migration FORWARD (exécutée) | `C:\tmp\pgquery\` |
| `fayclick_verif.js` | Vérifications V1-V9 | `C:\tmp\pgquery\` |

Script de ROLLBACK documenté dans `01-database.md` §2.3 (non exécuté, migration réussie).

## 6. Effets collatéraux observés

- **Aucune régression** sur les 1 681 structures existantes (toutes SN, email déjà NOT NULL)
- L'inscription depuis le frontend actuel continue de fonctionner puisque `add_edit_inscription` (v1) reste inchangée
- La nouvelle fonction v2 est prête à être consommée par Sprint 2 (services fullstack)

## 7. Prochaine étape

**Sprint 2 — Services backend** (Fullstack) :
1. Créer `services/email.service.ts`
2. Créer `services/otp-router.service.ts`
3. Créer `types/pays.ts` (17 pays hardcodés + constantes)
4. Refactor `services/registration.service.ts` → appeler `add_edit_inscription_v2` avec 13e param
5. Tests unitaires

Base DB prête. Feu vert pour Sprint 2.
