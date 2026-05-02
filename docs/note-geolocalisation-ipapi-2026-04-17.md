# Note Conceptuelle — Géolocalisation des Utilisateurs via `ipapi.co`

**Date** : 2026-04-17
**Auteur** : Équipe FayClick
**Statut** : Conceptuel (aucune implémentation en cours)
**Contexte** : Expansion CEDEAO multi-pays, analytics marché, personnalisation UX

---

## 1. Objectif

Détecter automatiquement **le pays, la région et la ville** depuis lesquels nos utilisateurs se connectent à FayClick V2, sans interaction explicite, afin de :

- Cartographier la répartition géographique de notre base clients (structures Sénégal + CEDEAO)
- Personnaliser l'expérience utilisateur (langue, devise, numéros d'appui, contenus régionaux)
- Alimenter nos tableaux de bord analytics (volume d'inscriptions par région, zones chaudes)
- Préparer l'expansion multi-pays (voir `prd-multi-pays-cedeao-2026-04-12.md`)
- Détecter des anomalies de connexion (compte ouvert au Sénégal → connexion soudaine depuis un autre continent)

**Hors scope** : Géolocalisation GPS native (`navigator.geolocation`), consentement RGPD explicite (à traiter séparément).

---

## 2. Pourquoi `ipapi.co` et pas Cloudflare

Comparatif étudié :

| Critère | Cloudflare Free | `ipapi.co` Free |
|---|---|---|
| Pays | ✅ Header `CF-IPCountry` | ✅ `country_name`, `country_code` |
| Région / Ville | ❌ Enterprise uniquement (~200$/mois) | ✅ Gratuit |
| Latitude / Longitude | ❌ | ✅ |
| Timezone, devise, langue | ❌ | ✅ `timezone`, `currency`, `languages` |
| Opérateur / ASN | ❌ | ✅ `org`, `asn` |
| Quota gratuit | Illimité (via CDN) | 1000 requêtes/jour/IP |
| Prérequis infra | Passer le domaine par Cloudflare | Aucun (appel HTTPS direct) |
| Coût pour FayClick | 0 € | 0 € tant qu'on reste sous 1000/jour/IP |

**Choix retenu : `ipapi.co`** — le gain en granularité (région, ville, coordonnées, devise) justifie le léger surcoût d'une requête HTTPS externe, d'autant que nous allons **mettre les données en cache** (voir §4) pour éviter d'interroger l'API à chaque visite.

> **Note** : Si à terme le volume explose (>30 000 structures actives), basculer sur `ipinfo.io` (50 000 requêtes/mois gratuites) ou passer en plan payant `ipapi.co` (15 $/mois pour 50k requêtes).

---

## 3. Données récupérées

Exemple de réponse `ipapi.co/json/` :

```json
{
  "ip": "154.125.45.12",
  "network": "154.125.45.0/24",
  "version": "IPv4",
  "city": "Dakar",
  "region": "Dakar",
  "region_code": "DK",
  "country_name": "Senegal",
  "country_code": "SN",
  "country_code_iso3": "SEN",
  "country_capital": "Dakar",
  "continent_code": "AF",
  "in_eu": false,
  "postal": null,
  "latitude": 14.6928,
  "longitude": -17.4467,
  "timezone": "Africa/Dakar",
  "utc_offset": "+0000",
  "country_calling_code": "+221",
  "currency": "XOF",
  "currency_name": "Franc",
  "languages": "fr",
  "country_area": 196722.0,
  "country_population": 15854360,
  "asn": "AS37649",
  "org": "Sonatel-AS"
}
```

### Champs utiles à retenir côté FayClick

| Champ API | Usage prévu |
|---|---|
| `country_code` (ISO-2) | Clé principale de segmentation pays |
| `country_name` | Affichage UI |
| `region` | Agrégation régionale (Dakar, Thiès, Saint-Louis…) |
| `city` | Granularité fine (carte marchands, zones denses) |
| `latitude`, `longitude` | Carte marchands future, calculs distance |
| `timezone` | Horodatage correct des transactions |
| `currency` | Affichage multi-devise CEDEAO (XOF, GHS, NGN…) |
| `languages` | Pré-sélection langue UI (`fr`, `en`, `pt`…) |
| `country_calling_code` | Préfixe téléphonique par défaut au register |
| `org` | Détection fraude (VPN, hébergeurs suspects) |

---

## 4. Stratégie de cache (LocalStorage)

**Principe clé** : Une fois la géolocalisation obtenue, **stocker le résultat en `localStorage`** avec un horodatage et un TTL, pour éviter de solliciter l'API à chaque visite.

### Modèle de données proposé

Clé : `fayclick_geo_cache`

```ts
interface GeoCacheEntry {
  ip: string;              // IP au moment de la détection (invalide le cache si change)
  country_code: string;    // 'SN', 'CI', 'ML'...
  country_name: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  languages: string;
  country_calling_code: string;
  detected_at: number;     // Date.now()
  expires_at: number;      // detected_at + TTL
  source: 'ipapi.co';
}
```

### TTL recommandé

- **Durée** : **30 jours** par défaut
- **Justification** : Un utilisateur change rarement de pays/région. Un TTL long réduit les appels API (économie quota).
- **Invalidation forcée** si :
  - Changement d'IP détecté (optionnel, coûte une requête légère de vérification)
  - Utilisateur clique « Actualiser ma localisation » (paramètres)
  - Cache manuellement purgé (logout complet)

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ Utilisateur arrive sur FayClick                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌─────────────────────────────┐
          │ Lire localStorage           │
          │ fayclick_geo_cache          │
          └──────────────┬──────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
         Cache valide         Cache absent/expiré
         (expires_at > now)         │
              │                     ▼
              │          ┌──────────────────────┐
              │          │ GET ipapi.co/json/   │
              │          └──────────┬───────────┘
              │                     │
              │                     ▼
              │          ┌──────────────────────┐
              │          │ Stocker dans         │
              │          │ localStorage + TTL   │
              │          └──────────┬───────────┘
              │                     │
              └──────────┬──────────┘
                         ▼
          ┌─────────────────────────────┐
          │ Données dispo dans Context  │
          │ (GeoContext)                │
          └─────────────────────────────┘
```

### Gestion d'erreurs

- **API `ipapi.co` injoignable** : ne pas bloquer l'app, log silencieux, réessayer au prochain chargement.
- **Quota dépassé (429)** : fallback sur Cloudflare header pays seul OU sur la dernière valeur en cache même expirée.
- **IP changée** (wifi → 4G) : stratégie au choix — invalider systématiquement, ou tolérer tant que `country_code` reste stable.
- **Utilisateur en navigation privée** : pas de cache possible, l'appel est refait à chaque session (acceptable).

---

## 5. Architecture technique proposée

### Arborescence

```
services/
  geolocation.service.ts          ← Service singleton (fetch + cache)

types/
  geolocation.ts                  ← Interface GeoCacheEntry + GeoData

contexts/
  GeoContext.tsx                  ← Provider React (facultatif)

hooks/
  useGeolocation.ts               ← Hook d'accès aux données géo
```

### API publique pressentie

```ts
// services/geolocation.service.ts
class GeolocationService {
  async getGeoData(forceRefresh = false): Promise<GeoCacheEntry | null>;
  getCachedGeoData(): GeoCacheEntry | null;
  clearCache(): void;
  isCacheValid(): boolean;
}

// hooks/useGeolocation.ts
const { geo, loading, error, refresh } = useGeolocation();
// geo.country_code, geo.region, geo.city, geo.currency...
```

### Point d'injection dans l'app

Deux options à arbitrer lors de l'implémentation :

**Option A — Lazy (recommandé)** : Détection uniquement quand nécessaire (page register, settings, admin). Économise des requêtes inutiles.

**Option B — Eager** : Détection au premier mount du `RootLayout` via un provider. Donne une donnée globale disponible partout, mais consomme le quota même pour des visites courtes.

Pour FayClick V2, **l'option A est préférable** pour maîtriser la volumétrie (notamment sur la landing page publique fortement visitée).

---

## 6. Synchronisation avec la base PostgreSQL

Une fois détectée, la géoloc doit être **rattachée à l'utilisateur/structure** pour des analytics persistants.

### Hypothèse de schéma (à valider avec DBA)

Nouvelle table `user_geolocations` (ou colonnes ajoutées à `list_utilisateurs`) :

```sql
CREATE TABLE user_geolocations (
  id SERIAL PRIMARY KEY,
  id_user INTEGER REFERENCES list_utilisateurs(id_user),
  id_structure INTEGER REFERENCES list_structures(id_structure),
  country_code CHAR(2),
  country_name VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  timezone VARCHAR(50),
  ip_address INET,
  detected_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'ipapi.co'
);
```

### Quand envoyer à la BD

- **Première détection réussie** après login → 1 appel PG.
- Pas à chaque refresh du cache local (sinon spam).
- Éventuellement : fonction PG `add_user_geolocation(pid_user, p_country_code, p_region, ...)` à créer.

---

## 7. Considérations RGPD & Confidentialité

- ⚠️ **Le Sénégal** est soumis à la **loi 2008-12** sur la protection des données personnelles (CDP).
- L'IP publique est considérée comme une **donnée personnelle indirecte**.
- Obligations à traiter lors de l'implémentation :
  - **Mentionner la géolocalisation IP** dans les CGU / politique de confidentialité
  - Permettre à l'utilisateur de **consulter et supprimer** ses données géo (page Settings)
  - Ne **pas exposer** latitude/longitude précises dans les APIs publiques
  - Limiter la **durée de rétention** des logs IP (max 12 mois)
  - Côté `ipapi.co` : aucune donnée utilisateur n'est envoyée (seulement l'IP publique), donc pas de DPA nécessaire à ce stade

---

## 8. Limitations connues

| Limite | Impact |
|---|---|
| VPN / Tor | Pays détecté = pays du VPN, pas le pays réel |
| Opérateurs mobiles mutualisés (Free Mobile FR) | Plusieurs utilisateurs = même IP routée |
| Connexion Wi-Fi entreprise | Géolocalisation = siège social, pas bureau local |
| IPv6 | `ipapi.co` supporte mais parfois moins précis que IPv4 |
| Navigation privée | Cache localStorage ignoré → requête à chaque session |
| Quota 1000/jour/IP | Dépassable sur gros trafic — surveiller via monitoring |

---

## 9. Checklist avant implémentation

- [ ] Valider l'approche avec le chef de projet et le DPO
- [ ] Créer la tâche dans le backlog : `feat(geoloc): detection ipapi avec cache localStorage`
- [ ] Définir la stratégie de cache (TTL 30j confirmé ? IP check actif ?)
- [ ] Valider le schéma BD `user_geolocations` avec le DBA
- [ ] Ajouter la mention dans la politique de confidentialité
- [ ] Implémenter d'abord en **dev uniquement** (flag `NEXT_PUBLIC_ENABLE_GEOLOC`)
- [ ] Mettre en place le monitoring quota `ipapi.co`
- [ ] Tester en navigation privée + VPN + IPv6
- [ ] Prévoir un écran « Votre localisation » dans les paramètres utilisateur

---

## 10. Références

- [Documentation `ipapi.co`](https://ipapi.co/api/)
- [Cloudflare `CF-IPCountry` header](https://developers.cloudflare.com/fundamentals/reference/http-request-headers/)
- [`prd-multi-pays-cedeao-2026-04-12.md`](./prd-multi-pays-cedeao-2026-04-12.md) — Expansion CEDEAO
- [Loi 2008-12 Sénégal — Protection des données](https://www.cdp.sn)

---

**Note finale** : Ce document est **conceptuel uniquement**. Aucune ligne de code ne doit être écrite avant validation du plan par l'équipe.
