## Problème

Lors de la finalisation d'un check-in/check-out (ex. M. Franck Seguy), l'insertion dans `boat_rentals` échoue avec :
`null value in column "start_date" of relation "boat_rentals" violates not-null constraint`.

Cela arrive quand un check-in/out est réalisé en dehors des dates prévues, ou quand le formulaire administratif / brouillon a une date vide. Le garde-fou frontend actuel (dans `useCreateRental`) ne suffit pas : il dépend du build déployé et ne couvre pas tous les chemins.

## Solution définitive (au niveau base de données)

Ajouter un **trigger `BEFORE INSERT/UPDATE`** sur `boat_rentals` qui remplit automatiquement `start_date` / `end_date` quand elles sont nulles. Ainsi, quelle que soit l'origine de l'insertion (frontend, sync, futur code), la contrainte NOT NULL ne pourra plus être violée.

Règles du trigger :
- Si `start_date` est NULL → utiliser `now()`.
- Si `end_date` est NULL → utiliser `start_date` (déjà résolue).
- Aucune donnée existante n'est modifiée (uniquement les insertions/mises à jour qui laissent ces champs vides).

```text
INSERT boat_rentals (start_date = NULL)
        │
        ▼
  trigger BEFORE INSERT
        │  start_date := COALESCE(start_date, now())
        │  end_date   := COALESCE(end_date, start_date)
        ▼
  ligne insérée valide ✔
```

### Détails techniques

1. Migration DB créant :
   - Une fonction `public.ensure_boat_rental_dates()` (`SECURITY DEFINER`, `SET search_path = public`) qui applique les COALESCE ci-dessus sur `NEW`.
   - Un trigger `BEFORE INSERT OR UPDATE ON public.boat_rentals FOR EACH ROW`.

2. Le garde-fou frontend existant dans `src/hooks/useChecklistData.ts` (`useCreateRental`) est conservé comme double sécurité — aucune modification nécessaire.

## Vérification

- Finaliser un check-in avec une date de départ manquante → la location est créée sans erreur, `start_date` = date du jour.
- Les locations existantes restent inchangées.
- Plus aucune erreur « null value in column start_date » possible, quel que soit le chemin d'insertion.

## Note

Republier l'application après la migration pour que le correctif complet (DB + frontend déjà en place) soit actif en production.