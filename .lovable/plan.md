

# Afficher les heures effectuees pendant la location sur le check-out

## Objectif

Sur chaque check-out dans l'historique, afficher la difference d'heures moteur par rapport au check-in du meme client/location. Exemple : "Moteur BB: 2500h (+100h)" au lieu de simplement "2500h".

## Approche

Quand on affiche l'historique, pour chaque check-out qui a un `engine_hours_snapshot`, rechercher le check-in correspondant (meme `rental_id` ou meme `customer_name` juste avant) et calculer le delta.

## Fichiers modifies

### 1. `src/components/boats/BoatChecklistHistory.tsx`

- Apres avoir recupere les checklists, pour chaque check-out avec un `engine_hours_snapshot`, trouver le check-in correspondant via `rental_id` (ou a defaut le check-in le plus recent avant ce check-out pour le meme client).
- Calculer le delta pour chaque moteur : `checkout_hours - checkin_hours`.
- Afficher dans les badges : "Moteur BB: 2500h (+100h)" avec le delta en vert.
- Sur les check-in, afficher uniquement les heures sans delta (comme actuellement).

### 2. `src/components/boats/ChecklistDetailsModal.tsx`

- Meme logique dans la modale de details : quand c'est un check-out, charger le check-in correspondant et afficher le delta sous chaque valeur d'heure moteur.

## Section technique

### Logique de correspondance check-in / check-out

```text
1. Si le check-out a un rental_id -> chercher le check-in avec le meme rental_id
2. Sinon, chercher le check-in le plus recent avant la date du check-out pour le meme customer_name
```

### BoatChecklistHistory.tsx - Calcul du delta

Apres le mapping des checklists, creer une map des check-ins par `rental_id`. Pour chaque check-out, trouver le check-in correspondant et calculer les deltas :

```typescript
// Pour chaque checkout, trouver le checkin correspondant
const getCheckinDelta = (checkout: ChecklistHistoryItem) => {
  if (checkout.display_type !== 'checkout' || !checkout.engine_hours_snapshot) return null;
  
  // Chercher le checkin correspondant par rental_id
  const matchingCheckin = checklists.find(c => 
    c.display_type === 'checkin' && 
    c.rental_id && c.rental_id === checkout.rental_id &&
    c.engine_hours_snapshot
  );
  
  if (!matchingCheckin?.engine_hours_snapshot) return null;
  
  // Calculer les deltas par component_id
  return checkout.engine_hours_snapshot.map(eng => {
    const checkinEng = matchingCheckin.engine_hours_snapshot.find(
      e => e.component_id === eng.component_id
    );
    return {
      ...eng,
      delta: checkinEng ? eng.hours - checkinEng.hours : null
    };
  });
};
```

### Affichage dans les badges (BoatChecklistHistory)

```text
Check-in:  [Moteur BB: 2400h]  [Moteur TB: 2300h]  [Generatrice: 1200h]
Check-out: [Moteur BB: 2500h (+100h)]  [Moteur TB: 2400h (+100h)]  [Generatrice: 1300h (+100h)]
```

Le delta sera affiche en vert gras entre parentheses.

### ChecklistDetailsModal.tsx

- Quand le checklist est un check-out, faire une requete supplementaire pour recuperer le check-in correspondant (meme `rental_id`).
- Afficher sous chaque heure moteur : la valeur actuelle + le delta en vert.

