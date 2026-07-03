# Corriger le bug "null value in column start_date"

## Problème
Quand on finalise un brouillon (ex. HOKI), l'application insère une nouvelle location dans la table `boat_rentals`. La date de début (`start_date`) est parfois absente (cas des check-in/out hors dates prévues ou brouillon incomplet). La base de données refuse l'enregistrement car `start_date` ne peut pas être vide → erreur bloquante.

## Cause technique
Dans `src/hooks/useChecklistData.ts`, la fonction `useCreateRental` insère les données telles quelles. La valeur `start_date` (et `end_date`) provient de `rentalData.startDate` (`src/components/checkin/ChecklistForm.tsx`, ligne 531), qui peut être `null`/`undefined`. Aucune valeur de repli n'existe, donc l'insertion viole la contrainte `NOT NULL`.

## Solution (durable, centralisée)
Garantir qu'une date valide est **toujours** présente avant l'insertion, au seul endroit qui insère dans `boat_rentals` :

1. Dans `useCreateRental` (`src/hooks/useChecklistData.ts`), avant l'`insert` :
   - Si `start_date` est absente/invalide → utiliser la date du jour (`new Date().toISOString()`).
   - Si `end_date` est absente/invalide → utiliser `start_date` (durée = même jour) afin de ne jamais laisser ce champ vide non plus.
   - Construire un objet nettoyé (`sanitizedRental`) et insérer celui-ci.
   - Journaliser (console.warn) quand un repli est appliqué, pour tracer les cas rares de check-in/out hors dates.

2. Côté `ChecklistForm.tsx` (ligne ~526), aucune logique métier modifiée : la sécurisation est faite dans le hook, ce qui couvre tous les chemins d'appel (brouillons, fiches admin, locations forcées).

Cette approche corrige le cas présent et tous les futurs cas de dates manquantes, sans changer le comportement quand les dates sont correctement renseignées.

## Détails techniques
Fichier : `src/hooks/useChecklistData.ts`, fonction `useCreateRental`.

```text
mutationFn(rentalData):
  now = new Date().toISOString()
  start = (rentalData.start_date valide ?) ? rentalData.start_date : now
  end   = (rentalData.end_date valide ?)   ? rentalData.end_date   : start
  sanitizedRental = { ...rentalData, start_date: start, end_date: end }
  insert(sanitizedRental)
```

"valide" = chaîne non vide et `Date` parseable (`!isNaN(new Date(x).getTime())`).

## Vérification
- Finaliser un brouillon sans dates (type HOKI) → la location se crée avec la date du jour, plus d'erreur.
- Finaliser une fiche avec dates renseignées → dates inchangées (comportement identique à aujourd'hui).
