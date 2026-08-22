# Intégration Corail Caraïbes (Marevo Maintenance) ↔ Marevo Booking

## 1. Principes

- **Base URL** : `https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1`
- **Authentification entrante** : clé métier Corail (`cc_…`) ou clé privée Marevo (`mk_…`), acceptée dans
  l'en-tête `x-api-key` (ou `x-webhook-secret`, `Authorization: Bearer …`), dans n'importe quel paramètre
  d'URL (`?token=…`) ou dans le body (`token` / `api_key` / `corail_api_key`).
  La clé porte le tenant : l'isolation société est automatique (`marevo_integration_config.marevo_tenant_id`).
- **Format** : JSON, `Content-Type: application/json`. CORS ouvert, `OPTIONS` supporté.
- **Fuseau** : dates de location en `YYYY-MM-DD`, horodatages ISO 8601 UTC.
- Chaque appel est journalisé dans `marevo_sync_log`.

### Créer une clé
Corail → connexion en rôle `direction` → **Paramètres → Marevo** → « Générer la clé API ».
La clé complète (`cc_…`) y reste consultable ; on y renseigne aussi l'URL/clé Marevo pour le sens sortant.

### Codes d'erreur

| Code | Signification |
| --- | --- |
| 400 | Champs manquants / dates invalides / aucune base configurée |
| 401 | Clé absente, inconnue ou révoquée |
| 403 | `tenant_id` différent de la config |
| 404 | Nom de fonction inexistant |
| 500 | `{ error, details }` |

## 2. ENTRANT — `POST /create-checkin-from-booking`

Crée (ou met à jour) la fiche check-in administrative à partir d'une réservation, en statut `ready`.
Enchaînement : clé → parsing → validation → base → client → bateau → dédoublonnage (`marevo_booking_id`) → insertion.

Alias acceptés (top-level ou dans `data`) :

| Champ canonique | Requis | Alias |
| --- | --- | --- |
| `customer_first_name` | oui | `first_name`, `firstName`, `customerFirstName`, `end_client_first_name` |
| `customer_last_name` | oui | `last_name`, `lastName`, `customerLastName`, `end_client_last_name` |
| `customer_email` | non | `email`, `customerEmail`, `end_client_email` |
| `customer_phone` | non | `phone`, `phone_number`, `phoneNumber`, `customerPhone` |
| `planned_start_date` | oui | `start_date`, `startDate`, `checkin_date`, `rental_start` |
| `planned_end_date` | oui | `end_date`, `endDate`, `checkout_date`, `rental_end` |
| `boat_name` | non | `boat`, `boatName`, `boat_model`, `vessel_name`, `vessel` |
| `boat_external_id` | non | `external_boat_id`, `externalBoatId`, `boat_id`, `boatId` |
| `base_name` | non | `base`, `baseName`, `location`, `location_name` |
| `rental_notes` | non | `notes`, `internal_notes` |
| `special_instructions` | non | `special_requests`, `instructions` |
| `booking_id` | non | `external_id`, `booking_reference`, `reference` |

Réponse : `{ "success": true, "checkin_form_id": "<uuid>", ... }`.
Annulation : envoyer `event: "booking.cancelled"` (ou `status` contenant `cancel`) avec le `booking_id`.

### Alias d'endpoints déployés
`create-checkin-from-booking`, `marevo-webhook`, `marevo-booking-webhook`, `marevo-checkin`,
`create-marevo-checkin`, `corail-checkin`, `checkin-completed`, `checkout-completed`.

## 3. ENTRANT — Flotte : `POST /sync-boats` (ou `/marevo-fleet-sync`)

```json
{ "event": "boat.sync", "boats": [{ "marevo_boat_id": "<uuid Corail>", "name": "Saphir", "status": "available" }] }
```

`marevo_boat_id` doit contenir l'UUID Corail du bateau (alias : `corail_boat_id`, `boat_id`, `id`).
Réponse : `{ success, matched, total, unmatched, results }`. Les bateaux inconnus ne sont pas créés.

## 4. SORTANT — Corail → Marevo Booking

Corail pousse `checkin.completed` et `checkout.completed` vers l'URL Marevo configurée, avec
`checkin_form_id` + le `booking_id` Marevo, la clé `mk_…` en `x-api-key`. Journalisé dans `marevo_sync_log`.
