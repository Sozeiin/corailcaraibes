# Correspondance de la flotte Corail ↔ Marevo Booking

## Le point bloquant

Corail Caraïbes n'a qu'un seul point d'entrée pour Marevo : la fonction `marevo-webhook`. Il n'existe pas de fonction `sync-boats` ni `create-checkin-from-booking` — c'est ce qui provoquait le 404 côté Marevo.

URL unique à utiliser dans Marevo Booking (réservations **et** flotte) :

```text
https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/marevo-webhook?token=<clé API Corail>
```

Pour la flotte, Marevo envoie :

```json
{ "event": "boat.sync", "boats": [ { "marevo_boat_id": "<uuid Corail>", "name": "Saphir", "status": "available" } ] }
```

Le champ `marevo_boat_id` doit contenir l'**UUID du bateau côté Corail**. C'est cet appariement qui manque aujourd'hui : sans lui, aucun bateau n'est reconnu.

## Ce que je vais ajouter

Une section « Correspondance de la flotte » dans **Paramètres → Intégration** (visible par la direction) :

- tableau des bateaux Corail : nom, modèle, base, statut, et l'UUID Corail avec bouton de copie ligne par ligne ;
- bouton **Copier la correspondance (JSON)** produisant directement le tableau `boats` prêt à coller dans Marevo ;
- bouton **Exporter en CSV** (colonnes : `corail_boat_id`, `nom`, `modele`, `base`, `statut`) pour l'import côté Marevo ;
- rappel de l'URL flotte + du format de payload attendu, avec bouton de copie.

## Robustesse côté webhook

- accepter aussi `corail_boat_id` et `boat_id` comme alias de `marevo_boat_id` dans le payload flotte ;
- dans la réponse, renvoyer explicitement la liste des bateaux non appariés (`unmatched`) avec le nom reçu, pour que Marevo affiche un message utile au lieu d'un échec global ;
- comportement inchangé : les bateaux inconnus ne sont pas créés dans Corail, ils sont seulement signalés (et journalisés dans les logs de synchronisation).

## Détails techniques

- `src/components/settings/MarevoIntegrationSettings.tsx` : nouvelle carte « Correspondance de la flotte », requête `boats` (id, name, model, status, base) via React Query, copie presse-papier et export CSV côté client (pas de nouvelle dépendance).
- `supabase/functions/marevo-webhook/index.ts` : élargir `BoatSchema` (alias d'identifiants) et enrichir la réponse/le log avec les bateaux non appariés.
- Aucune migration de base de données, aucun changement sur les flux check-in / check-out existants.
