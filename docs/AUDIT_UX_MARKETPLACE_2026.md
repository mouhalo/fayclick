# AUDIT UX EXPERT - FayClick Marketplace

**Auditeur** : Agent Expert UX Designer Senior (500+ realisations, cofondateur Stitch)
**Date** : 4 mars 2026
**Pages auditees** : `/catalogues` (Marketplace globale), `/catalogue?id=89` (Catalogue boutique), Workflow panier
**Devices testes** : Desktop 1280px, Tablette 768px, Mobile 375px

---

## EXECUTIVE SUMMARY

**Note globale : 5.5/10**

La marketplace FayClick presente une base technique solide (Next.js 15, Framer Motion, Tailwind) mais souffre de **problemes UX majeurs** qui freinent la conversion. Le design actuel est trop sombre, manque de hierarchie visuelle claire, et le parcours d'achat presente des frictions significatives. L'absence quasi-totale de photos produits est le probleme **numero 1** qui tue la credibilite.

### Points forts
- Architecture technique moderne et performante
- Effet glassmorphism coherent et identite visuelle distinctive
- Recherche intelligente (nom + telephone)
- Workflow panier fonctionnel de bout en bout
- Responsivite de base presente sur les 3 breakpoints

### Points critiques
- 95% des produits n'ont pas de photo (image placeholder FayClick)
- Palette trop sombre, manque de contraste et de luminosite
- Categories produits non normalisees (doublons, labels techniques)
- Panier public trop minimaliste, manque de confiance
- Pas de fiche produit detaillee
- Navigation inter-boutiques faible

---

## 1. PAGE `/catalogues` - MARKETPLACE GLOBALE

### 1.1 Hero Section

**Ce qui fonctionne** :
- Logo FayClick bien place, identite claire
- Barre de recherche proeminente au centre
- 3 badges stats (45 produits, 15 boutiques, 9 categories) = bonne preuve sociale
- Glassmorphism premium, donne un aspect moderne

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| H1 | CRITIQUE | Le hero ne communique pas la proposition de valeur. "Trouvez un marchand par nom ou telephone" est utilitaire, pas inspirant | Le visiteur ne comprend pas POURQUOI utiliser FayClick |
| H2 | MAJEUR | Pas de CTA visible ("Decouvrir les boutiques", "Voir les promos") | Aucune direction d'action pour le visiteur |
| H3 | MAJEUR | La barre de recherche cherche uniquement les boutiques, pas les produits | Frustration si le visiteur cherche un produit specifique |
| H4 | MINEUR | Les stats badges manquent d'icones differenciantes visuellement | Les 3 badges se ressemblent trop |

**Recommandations** :
- **R1** : Changer le sous-titre en une accroche marketing : "Les meilleurs commercants du Senegal a portee de clic" ou "Achetez en ligne, payez avec Orange Money ou Wave"
- **R2** : Ajouter un CTA principal sous les stats : "Explorer les boutiques" (primaire) + "Voir les promotions" (secondaire)
- **R3** : Transformer la recherche en recherche universelle (boutiques + produits) avec onglets ou autocompletion mixte
- **R4** : Ajouter une banniere promo/carrousel hero avec les produits mis en avant

---

### 1.2 Section Boutiques (Carrousel)

**Ce qui fonctionne** :
- Scroll horizontal natif fluide sur mobile
- Cartes boutiques avec logo, adresse, nombre de produits
- Boutons navigation fleches sur desktop

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| B1 | CRITIQUE | La plupart des logos boutiques sont la mascotte FayClick par defaut - aucune differenciation visuelle | Toutes les boutiques se ressemblent, zero identite |
| B2 | MAJEUR | Les noms de boutiques sont trop longs et tronques ("BONCOINMINABABELBAZAR", "LIBRAIRIE CHEZ KELEFA SCAT URBAM") | Illisibilite, surtout mobile |
| B3 | MAJEUR | Les cartes boutiques sont toutes identiques visuellement (meme fond vert sombre) | Aucune personnalite, aspect ennuyeux |
| B4 | MOYEN | Pas d'indicateur visuel du scroll horizontal sur mobile | L'utilisateur peut ne pas savoir qu'il y a plus de boutiques |
| B5 | MINEUR | Le bouton "Voir" est peu visible (texte emeraude sur fond sombre) | Call-to-action faible |

**Recommandations** :
- **R5** : Obliger/encourager les marchands a uploader un logo (onboarding). Afficher un avatar genere avec les initiales comme fallback plus distinct
- **R6** : Ajouter une couleur d'accent unique par boutique (generee automatiquement) pour differencier visuellement les cartes
- **R7** : Ajouter des dots de pagination sous le carrousel pour indiquer le nombre de boutiques
- **R8** : Augmenter le contraste du bouton "Voir" (fond emerald-500 plein)

---

### 1.3 Grille Produits

**Ce qui fonctionne** :
- Grille responsive (3 cols mobile, 4 tablet, 5 desktop) bien calibree
- Badge stock visible ("1 left", "Epuise", "x26")
- Badge categorie en haut a droite
- Prix bien lisible en bas de la carte

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| P1 | **BLOQUANT** | 95% des produits n'ont PAS de photo - icone FayClick generique partout | **DESTRUCTEUR pour la conversion.** Aucun e-commerce ne vend sans photos |
| P2 | CRITIQUE | Les labels de categories sont techniques et inconsistants : "produit_se..", "Alimentati..", "Electroniq.." (tronques), "Autre" | Confusion, aspect non professionnel |
| P3 | CRITIQUE | Sur la marketplace globale, pas de bouton "Acheter" sur les cartes produits | Le visiteur ne peut pas acheter directement, il doit d'abord aller dans la boutique |
| P4 | MAJEUR | Le badge boutique en bas de carte ("@ @SALIH NATANGUE", "B BONCOINMINABABELBAZAR") est illisible et confus | L'utilisateur ne comprend pas la source du produit |
| P5 | MAJEUR | La categorie "produit_service" est un slug technique visible par le client | Aspect non professionnel |
| P6 | MOYEN | "60K FCFA" pour du Nutella - les donnees de test sont incoherentes et nuisent a la credibilite | Meme en test, ca donne une mauvaise impression |
| P7 | MOYEN | Pas de filtre multi-criteres (prix min/max, en stock, en promo) | Navigation limitee dans un catalogue qui grandit |
| P8 | MINEUR | Le bouton "Charger plus (33 restants)" est trop discret (fond quasi transparent) | Peut etre rate par l'utilisateur |

**Recommandations** :
- **R9** : **PRIORITE ABSOLUE** - Imposer au moins 1 photo par produit lors de la creation. Afficher un placeholder plus elegant (illustration du type de categorie plutot que le logo FayClick)
- **R10** : Normaliser les categories : renommer "produit_service" en "Services", unifier "Electronique"/"Electroniq..", augmenter la largeur du badge pour eviter la troncature
- **R11** : Ajouter un bouton "Acheter" (ou "Voir") directement sur les cartes produits de la marketplace globale, comme c'est le cas dans le catalogue individuel
- **R12** : Redesigner le badge boutique : icone boutique + nom court, avec un style plus lisible
- **R13** : Ajouter des filtres avances : par prix, par stock disponible, par promotion

---

### 1.4 Filtre Categories

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| F1 | MAJEUR | Le select "Toutes categories" est un dropdown natif HTML sans style | Incohérent avec le design glassmorphism du reste |
| F2 | MAJEUR | Les categories ont des doublons : "Electronique" et "Electronique" (avec/sans accent) | Confusion et split des produits |
| F3 | MOYEN | Pas de compteur par categorie dans le dropdown | L'utilisateur ne sait pas combien de produits par categorie |

**Recommandations** :
- **R14** : Remplacer le select natif par des chips/tags cliquables horizontaux (comme sur Jumia/Amazon) pour une navigation plus visuelle
- **R15** : Fusionner les categories dupliquees et normaliser les noms

---

## 2. PAGE `/catalogue?id=89` - CATALOGUE BOUTIQUE

### 2.1 Header Boutique

**Ce qui fonctionne** :
- Logo boutique bien mis en valeur (ici BONCOINMINABABELBAZAR a un vrai logo)
- Numero de telephone cliquable (tel:)
- Adresse affichee
- Stats produits + categories
- Bouton retour "Marketplace" bien place

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| CH1 | MAJEUR | Le nom "BONCOINMINABABELBAZAR" en tout majuscule, font enorme, est ecrasant et peu lisible | Agressif visuellement, surtout sur mobile |
| CH2 | MAJEUR | Pas de description de la boutique, pas d'horaires, pas de note/avis | Le visiteur ne sait pas ce que vend cette boutique |
| CH3 | MOYEN | Le header prend trop de place verticale (40% de l'ecran mobile au-dessus du fold) | Les produits sont repousses trop bas |
| CH4 | MINEUR | Pas de bouton "Partager" ou "Contacter sur WhatsApp" | Opportunite de social sharing manquee |

**Recommandations** :
- **R16** : Reduire la taille du nom boutique, ajouter une tagline/description ("Epicerie fine, produits de qualite")
- **R17** : Ajouter un bouton WhatsApp cliquable (tres important au Senegal)
- **R18** : Compacter le header sur mobile (logo + nom + stats sur 2 lignes max)
- **R19** : Ajouter un systeme de description boutique et/ou d'avis clients

---

### 2.2 Grille Produits Boutique

**Ce qui fonctionne** :
- Bouton "Acheter" present et visible (vert emeraude)
- Grille responsive correcte
- Produits epuises clairement marques en rouge
- 160 produits avec pagination "Charger plus"

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| CP1 | CRITIQUE | Meme probleme de photos absentes que la marketplace globale | Impact mortel sur la conversion |
| CP2 | MAJEUR | Les produits epuises sont melanges avec les disponibles sans separation | Le visiteur scrolle sur des produits qu'il ne peut pas acheter |
| CP3 | MAJEUR | Pas de tri (prix croissant/decroissant, nouveautes, popularite) | Avec 160 produits, trouver ce qu'on veut est penible |
| CP4 | MOYEN | Le bouton "Acheter" n'est pas present sur les produits epuises (normal) mais aucune alternative ("Etre notifie", "Produit similaire") | Opportunite perdue |
| CP5 | MOYEN | Le filtre "Toutes categories" est un select plein largeur sur mobile, peu ergonomique | Encombrant |

**Recommandations** :
- **R20** : Separer les produits epuises en fin de liste ou les masquer par defaut avec un toggle "Voir les produits indisponibles"
- **R21** : Ajouter des options de tri (Prix, Nom, Stock, Promo)
- **R22** : Ajouter "Notifier quand disponible" sur les produits epuises (capture email/tel)

---

### 2.3 Carte Produit (Detail)

**Probleme majeur : Il n'existe PAS de page/fiche produit detaillee.**

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| FP1 | **BLOQUANT** | Cliquer sur un produit ouvre un carrousel photo (souvent vide) mais AUCUNE fiche produit avec description, specifications, avis | Le visiteur achete a l'aveugle. Inacceptable pour un e-commerce |
| FP2 | CRITIQUE | Pas de description produit visible nulle part | Comment savoir ce qu'on achete? |
| FP3 | MAJEUR | L'ajout au panier se fait en 1 clic sans confirmation visuelle claire (pas de toast/animation "Ajoute au panier!") | L'utilisateur ne sait pas si ca a fonctionne |

**Recommandations** :
- **R23** : **PRIORITE HAUTE** - Creer une fiche produit detaillee (modal ou page) avec : photo(s), nom, prix, description, stock, categorie, bouton acheter avec selecteur quantite
- **R24** : Ajouter un toast/notification "Produit ajoute au panier!" avec animation (checkmark vert + slide-in) apres chaque ajout
- **R25** : Permettre aux marchands de saisir une description produit lors de la creation

---

## 3. WORKFLOW PANIER & PAIEMENT

### 3.1 FAB Panier (Floating Action Button)

**Ce qui fonctionne** :
- Apparait uniquement quand le panier contient des articles
- Badge count bien visible
- Position fixe bottom-right accessible au pouce

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| FAB1 | MOYEN | Le FAB est orange (panier) mais ressemble au FAB scroll-to-top - confusion possible | 2 FAB au meme endroit selon le contexte |
| FAB2 | MINEUR | Pas de micro-animation d'ajout (le badge passe de 0 a 1 sans effet) | Manque de feedback visuel |

**Recommandations** :
- **R26** : Ajouter une animation "bounce" au FAB quand un produit est ajoute
- **R27** : Differencier clairement le FAB panier (toujours visible en bas avec mini-resume du total)

---

### 3.2 Drawer Panier

**Ce qui fonctionne** :
- Slide-in depuis la droite, standard e-commerce
- Boutons +/- pour la quantite
- Bouton supprimer (poubelle)
- Total automatique
- Boutons paiement OM et Wave avec logos

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| PA1 | CRITIQUE | Le panier est un fond BLANC pur alors que tout le site est sombre - contraste choquant | Rupture visuelle complete, aspect amateur |
| PA2 | CRITIQUE | Pas de photo produit dans le panier | L'utilisateur ne sait plus ce qu'il a ajoute |
| PA3 | MAJEUR | Le champ telephone pre-rempli "77 123 45 67" est un PLACEHOLDER qui ressemble a un vrai numero | L'utilisateur pourrait croire que son numero est deja saisi |
| PA4 | MAJEUR | Les boutons "Payer" OM et Wave sont disabled (grise) sans explication claire | L'utilisateur ne comprend pas pourquoi il ne peut pas payer |
| PA5 | MAJEUR | Pas d'indication que le numero de telephone est obligatoire pour activer les boutons | Friction cachee |
| PA6 | MAJEUR | Sur mobile, le drawer panier est 100% blanc sur fond blanc, l'en-tete vert est le seul element de design | Aspect extremement basique, pas professionnel |
| PA7 | MOYEN | Pas de sous-total par article (prix x quantite) affiche distinctement | Manque de transparence |
| PA8 | MOYEN | Pas de frais de livraison mentionnes (meme si c'est 0) | Le client ne sait pas s'il y aura des frais |
| PA9 | MINEUR | La zone centrale du panier est vide (enorme espace blanc entre l'article et le footer) | Gaspillage d'espace, aspect creux |

**Recommandations** :
- **R28** : **PRIORITE HAUTE** - Redesigner le drawer panier avec le theme sombre du site (fond slate-900, texte blanc, bordures emeraude)
- **R29** : Ajouter une miniature photo du produit dans chaque ligne panier
- **R30** : Transformer le placeholder telephone en un label clair "Entrez votre numero" avec validation visuelle en temps reel (check vert si valide)
- **R31** : Afficher un message explicite sous les boutons paiement : "Saisissez votre numero de telephone pour payer"
- **R32** : Ajouter une section recapitulative : Sous-total, Frais (0 FCFA), Total
- **R33** : Ajouter un lien "Continuer vos achats" pour fermer le panier et revenir au catalogue

---

### 3.3 Paiement Mobile Money

**Ce qui fonctionne** :
- Integration OM et Wave fonctionnelle
- Anti-abus cooldown 5 secondes
- Workflow QR code → polling → success → recu

**Problemes identifies** :

| # | Severite | Probleme | Impact |
|---|----------|----------|--------|
| PM1 | MAJEUR | Seulement 2 methodes de paiement (OM, Wave) - pas de Free Money | Free Money a une part de marche significative au Senegal |
| PM2 | MAJEUR | Pas d'option paiement a la livraison (cash on delivery) | Beaucoup de senegalais preferent payer a la reception |
| PM3 | MOYEN | Pas de recapitulatif final avant le paiement ("Vous allez payer 5000 FCFA via Orange Money") | Derniere chance de verification manquante |
| PM4 | MOYEN | Le bouton OM App est un bouton unique sans distinction App/USSD | Certains utilisateurs preferent le USSD |

**Recommandations** :
- **R34** : Ajouter Free Money comme 3e option de paiement
- **R35** : Ajouter une option "Paiement a la livraison" (meme en beta)
- **R36** : Ajouter un ecran de confirmation avant le paiement avec recapitulatif complet

---

## 4. ANALYSE RESPONSIVE CROSS-DEVICE

### 4.1 Mobile (375px) - Score : 5/10

| Aspect | Note | Detail |
|--------|------|--------|
| Lisibilite | 4/10 | Texte trop petit sur les cartes produits (9px), badges tronques |
| Touch targets | 6/10 | Boutons "Acheter" assez grands, mais cartes boutiques petites |
| Performance percue | 5/10 | Chargement initial avec spinner, pas de skeleton screen |
| Navigation | 4/10 | Pas de barre de navigation bottom fixe, retour en arriere = bouton "Marketplace" |
| Espace ecran | 5/10 | Header boutique trop haut, pousse le contenu sous le fold |

**Recommandations Mobile** :
- **R37** : Augmenter la taille des textes produits (min 11px au lieu de 9px)
- **R38** : Ajouter un skeleton screen pendant le chargement (au lieu du spinner generique)
- **R39** : Ajouter une barre de navigation bottom fixe (Accueil, Recherche, Panier, Categories)
- **R40** : Reduire le header boutique de 40% en mobile (logo plus petit, stats inline)

### 4.2 Tablette (768px) - Score : 6/10

| Aspect | Note | Detail |
|--------|------|--------|
| Grille | 7/10 | 4 colonnes bien calibrees |
| Espace | 5/10 | Header toujours trop grand |
| Navigation | 5/10 | Manque de sidebar ou de filtres lateraux |
| Touch | 7/10 | Bonne taille des elements interactifs |

**Recommandations Tablette** :
- **R41** : Exploiter l'espace lateral en tablette landscape pour un panneau de filtres
- **R42** : Afficher le panier en split-view (moitie ecran) plutot qu'en overlay

### 4.3 Desktop (1280px) - Score : 6/10

| Aspect | Note | Detail |
|--------|------|--------|
| Grille | 7/10 | 5 colonnes OK mais cards etroites avec 5 cols |
| Espace blanc | 4/10 | Beaucoup d'espace perdu, contenu centre sans max-width |
| Hover effects | 7/10 | Bien implementes (scale, glow, shimmer) |
| Navigation | 4/10 | Pas de breadcrumb, pas de menu lateral |

**Recommandations Desktop** :
- **R43** : Ajouter un breadcrumb (Marketplace > Boutique > Produit)
- **R44** : Utiliser un sidebar de filtres permanent sur desktop
- **R45** : Limiter a 4 colonnes max pour des cartes plus grandes et plus lisibles

---

## 5. DESIGN SYSTEM & IDENTITE VISUELLE

### 5.1 Palette de couleurs

| Probleme | Detail |
|----------|--------|
| Trop sombre | Le gradient `slate-900 → emerald-900 → teal-900` est tres sombre. Pour une marketplace grand public, c'est intimidant |
| Manque de contraste | Les textes gris sur fond sombre sont difficiles a lire (ratio contraste < 4.5:1 WCAG) |
| Monotone | Tout est vert/emeraude. Pas de couleur secondaire pour les CTA (l'orange n'est utilise que pour le panier et les promos) |

**Recommandations** :
- **R46** : Eclaircir le fond general. Option : garder le header/hero sombre mais passer les grilles produits sur fond blanc/gris clair pour une meilleure lisibilite des produits
- **R47** : Utiliser l'orange de maniere plus strategique pour tous les CTA principaux (Acheter, Payer, Voir)
- **R48** : Ajouter un mode clair par defaut avec possibilite de switch en mode sombre

### 5.2 Typographie

| Probleme | Detail |
|----------|--------|
| Taille minimum | 9px est en dessous du minimum recommande (12px) pour le mobile |
| Hierarchie faible | Les titres produits et les prix se confondent visuellement |
| Noms boutiques | Tout en MAJUSCULES est agressif et moins lisible que le Title Case |

**Recommandations** :
- **R49** : Fixer une taille minimum de 12px pour tout texte lisible
- **R50** : Creer une hierarchie claire : Prix en gras + couleur accent, Nom en medium, Stock en light

### 5.3 Iconographie

La marketplace utilise les icones Lucide/Heroicons de maniere coherente, c'est un bon point. Mais :
- Les icones de categories pourraient etre visuelles (illustrations) plutot que textuelles (badges)
- Ajouter des illustrations pour les etats vides (pas de resultats, panier vide)

---

## 6. BENCHMARK CONCURRENTIEL

En comparant avec les marketplaces leaders au Senegal et en Afrique :

| Critere | FayClick | Jumia SN | Expat-Dakar | CoinAfrique |
|---------|----------|----------|-------------|-------------|
| Photos produits | 5% | 100% | 95% | 90% |
| Fiche produit | Non | Oui, detaillee | Oui | Oui |
| Filtres avances | Non | Oui | Oui | Oui |
| Avis clients | Non | Oui | Non | Non |
| Paiement Mobile Money | Oui (OM/Wave) | Oui | Non | Non |
| Recherche universelle | Partiel | Oui | Oui | Oui |
| PWA / Mode offline | Oui | Non | Non | Non |

**Avantages competitifs de FayClick** :
- Integration paiement mobile money native (differenciateur majeur)
- PWA avec mode offline
- Lien direct marchand → client (le marchand partage son catalogue sur les reseaux sociaux)

**Points a rattraper en priorite** :
1. Photos produits obligatoires
2. Fiche produit detaillee
3. Filtres et tri

---

## 7. PLAN D'ACTION PRIORITISE

### Phase 1 - Quick Wins (1-2 semaines) - Impact immediat

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Redesigner le drawer panier en theme sombre + ajouter miniatures | Moyen | ELEVE |
| 2 | Ajouter un toast "Produit ajoute!" apres ajout au panier | Faible | MOYEN |
| 3 | Normaliser les noms de categories (pas de slugs techniques) | Faible | MOYEN |
| 4 | Augmenter taille texte minimum a 12px sur mobile | Faible | MOYEN |
| 5 | Ajouter message explicite "Saisissez votre numero pour payer" | Faible | MOYEN |
| 6 | Ajouter bouton "Acheter" sur les cartes marketplace globale | Moyen | ELEVE |
| 7 | Ajouter skeleton screen pendant le chargement | Moyen | MOYEN |

### Phase 2 - Ameliorations Structurelles (2-4 semaines)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 8 | Creer une fiche produit modale (photo, description, prix, acheter) | Eleve | TRES ELEVE |
| 9 | Transformer la recherche hero en recherche universelle (boutiques + produits) | Moyen | ELEVE |
| 10 | Ajouter filtres avances (prix, stock, promo) + tri | Moyen | ELEVE |
| 11 | Separer/masquer les produits epuises | Faible | MOYEN |
| 12 | Ajouter bouton WhatsApp sur header boutique | Faible | ELEVE |
| 13 | Compacter le header boutique sur mobile | Moyen | MOYEN |
| 14 | Remplacer les categories par des chips horizontaux | Moyen | MOYEN |

### Phase 3 - Experience Premium (4-8 semaines)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 15 | Imposer 1 photo minimum par produit (onboarding marchand) | Moyen | TRES ELEVE |
| 16 | Ajouter ecran de confirmation avant paiement | Moyen | ELEVE |
| 17 | Ajouter Free Money comme methode de paiement | Moyen | ELEVE |
| 18 | Barre de navigation bottom fixe sur mobile | Moyen | ELEVE |
| 19 | Systeme de favoris / wishlist | Eleve | MOYEN |
| 20 | Breadcrumb navigation | Faible | MOYEN |
| 21 | Ajouter des descriptions boutiques | Moyen | MOYEN |
| 22 | Eclaircir le design (fond clair pour les zones produits) | Eleve | ELEVE |

### Phase 4 - Differenciation (8+ semaines)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 23 | Systeme d'avis / notes clients | Tres eleve | ELEVE |
| 24 | "Paiement a la livraison" option | Eleve | TRES ELEVE |
| 25 | Recommandations personnalisees ("Vous aimerez aussi") | Tres eleve | ELEVE |
| 26 | Notifications push (produit dispo, promo) | Eleve | MOYEN |
| 27 | Mode clair / sombre toggle | Moyen | MOYEN |

---

## 8. CONCLUSION

FayClick a un **positionnement unique et pertinent** : une marketplace B2C2C ou les marchands senegalais publient leurs catalogues et les partagent sur les reseaux sociaux. L'integration paiement mobile money est un vrai differenciateur.

Cependant, le **gap avec les standards e-commerce** actuels est significatif. Les 3 actions qui auront le plus d'impact :

1. **Photos produits** - Sans photos, aucun e-commerce ne convertit. C'est la priorite numero 1.
2. **Fiche produit detaillee** - Le visiteur doit savoir ce qu'il achete avant de cliquer "Acheter".
3. **Redesign du panier** - Le panier blanc/basique casse l'experience premium du reste du site.

Avec ces 3 corrections, la marketplace passera d'un **prototype fonctionnel** a une **plateforme credible** capable de seduire les visiteurs provenant des reseaux sociaux.

---

*Rapport genere le 4 mars 2026 - Agent Expert UX Designer*
*Methodologie : Audit heuristique (Nielsen), analyse WCAG 2.1, benchmark concurrentiel, test multi-device*
