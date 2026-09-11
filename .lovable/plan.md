# Récupérer une fiche check-out par réservation ou par bateau (API Corail)

## Constat

Notre API le fait déjà en partie : `marevo-webhook` accepte un **GET** avec `booking_id` (ou `checkin_form_id`) et renvoie les inspections **check-in ET check-out** avec tous les points de contrôle détaillés. Mais :

1. Ce n'est **pas documenté** dans `docs/INTEGRATION_MAREVO_BOOKING.md` — Marevo Booking ne peut pas le deviner.
2. La recherche ne fonctionne que par `booking_id` / `checkin_form_id`, **pas par bateau**.

## Ce que Marevo Booking peut appeler dès aujourd'hui

```text
GET https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/marevo-webhook?token=<clé cc_…>&booking_id=RES-640142
```

Réponse : `checkin_inspection`, `checkout_inspection` (avec `items` détaillés : nom, catégorie, statut, notes, photo), `checkin_completed`, `checkout_completed`, statut de la fiche.

## Travaux prévus

1. **Documenter** dans `docs/INTEGRATION_MAREVO_BOOKING.md` une nouvelle section « LECTURE — Récupérer les fiches check-in / check-out » : paramètres acceptés, exemple de réponse complète, aliases des champs.
2. **Ajouter la recherche par bateau** dans `marevoWebhookHandler.ts` : accepter `boat_id` (UUID Corail) ou `boat_name`, combiné optionnellement à une date, et renvoyer la/les fiches et inspections correspondantes. Fallback par location (`boat_rentals`) sur la fenêtre de dates, comme pour la recherche par réservation.
3. **Vérifier** par appels de test (curl sur la fonction déployée) les trois cas : par `booking_id`, par `checkin_form_id`, par bateau.

## Détails techniques

- `supabase/functions/_shared/marevoWebhookHandler.ts` : étendre la branche GET (autour de la résolution `formIdCandidate` / `bookingRef`) pour résoudre aussi `boat_id` / `boat_name` via les tables `boats`, `boat_rentals` et `administrative_checkin_forms`. Réutiliser le code existant de chargement des checklists et items — aucun changement sur le format de réponse.
- Aucune migration de base de données. Pas de changement sur les envois sortants (`marevo-sync`).
- Après déploiement automatique de la fonction, test via `supabase--curl_edge_functions` sur la réservation RES-640142.
