

# Fix: Bateau ONE WAY reste en "location" et ne change pas de base après check-out

## Problème identifié

Deux bugs dans la logique de check-out ONE WAY dans `TechnicianCheckinInterface.tsx` :

1. **Le bateau ne passe pas en "disponible"** : après un check-out normal (non force), le code met à jour le `boat_rentals` et le `administrative_checkin_forms`, mais ne met **jamais** à jour le statut du bateau à `available`. Le `ChecklistForm.tsx` le fait (ligne 568), mais si cette mise à jour échoue ou si le flux passe par un autre chemin, le bateau reste en "rented".

2. **Le bateau ne change pas de base** : pour un ONE WAY, le code crée seulement une entrée `planning_activities` mais ne met **jamais** à jour le `base_id` du bateau vers la `destination_base_id`.

## Correction

### Fichier : `src/components/checkin/TechnicianCheckinInterface.tsx`

Dans la fonction `handleComplete`, après avoir détecté un check-out ONE WAY (lignes 252-264) :

- **Mettre à jour le `base_id` du bateau** vers `formData.destination_base_id` en plus de la création de l'activité planning.
- **S'assurer que le statut du bateau est bien `available`** après tout check-out normal (pas seulement force-checkout). Ajouter une mise à jour du statut bateau à `available` dans le bloc checkout normal, comme filet de sécurité.

Le code ajoutera après le bloc ONE WAY existant :
```
// Mettre à jour la base du bateau pour ONE WAY
await supabase
  .from('boats')
  .update({ 
    base_id: formData.destination_base_id,
    status: 'available',
    updated_at: new Date().toISOString()
  })
  .eq('id', formData.boat_id);
```

Et pour les check-outs non ONE WAY, ajouter une mise à jour de sécurité :
```
// S'assurer que le bateau est bien disponible
await supabase
  .from('boats')
  .update({ status: 'available', updated_at: new Date().toISOString() })
  .eq('id', selectedRental.boat_id);
```

Cela garantit que dans tous les cas, le bateau finit en statut "disponible" et, pour les ONE WAY, change de base.

