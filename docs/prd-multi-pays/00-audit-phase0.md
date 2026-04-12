# Phase 0 — Audit préalable multi-pays CEDEAO

## Points d'envoi SMS OTP/PIN identifiés

### Scope MVP (à migrer vers routeur SMS/Email selon pays)
1. **Inscription** — `app/register/page.tsx:322` → `smsService.sendDirectSMS(phoneOM, 'code OTP ${otpCode}')` (OTP PIN connexion rapide)
2. **Récupération mot de passe / OTP login** — `components/auth/ModalRecoveryOTP.tsx:113` → `smsService.sendDirectSMS(cleanPhone, message)`

### Hors scope MVP (reste SMS-only, bloqué pour non-SN)
3. **Retrait KALPE** — `services/retrait.service.ts` (OTP 5 chiffres pour retrait wallet) — bloqué pour pays ≠ SN (wallets locaux futurs)

## Service SMS actuel
- `services/sms.service.ts`
- API : `https://api.icelabsoft.com/sms_service/api/send_o_sms`
- Méthode principale : `sendDirectSMS(phoneNumber, message)`
- Sender : `ICELABOSOFT`

## Fonctions PostgreSQL d'inscription
- **Principale** : `add_edit_inscription(12 params)` — `services/registration.service.ts:161`
- Paramètres actuels : `id_type, nom_structure, adresse, mobile_om, mobile_wave, numautorisatioon, nummarchand, email, logo, nom_service, code_promo, id_structure`
- ❌ **Aucun paramètre `indicatif_pays` / `code_iso_pays`** — à ajouter
- ❌ **Email optionnel** (chaîne vide par défaut) — à rendre obligatoire si pays ≠ SN

## Usage actuel `indicatif_pays`
- **Aucune référence dans le code** — le champ existe en DB mais n'est ni lu ni écrit côté TypeScript
- → On peut librement passer à `code_iso` sans migration complexe de code

## Types impactés
- `types/registration.ts` : `RegistrationFormData` (businessName, phoneOM, phoneWave, address, logoUrl, codePromo, acceptTerms) — ajouter `countryCode` + `email`
- `types/admin.types.ts` : `AdminStructureItem`, `StructureDetailData` — ajouter `code_iso_pays`, `devise`

## Documents PRD existants (ne pas écraser)
- `docs/bmad/prd/PRD_OTP_INSCRIPTION.md`
- `docs/bmad/prd/PRD_REDESIGN_REGISTER.md`
- Nouveau PRD : `docs/prd-multi-pays-cedeao-2026-04-12.md` (consolidé final)
