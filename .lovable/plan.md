
# Afficher les heures moteur dans l'historique des check-in/check-out

## Probleme

Lors d'un check-in ou check-out, les heures moteur (babord, tribord, generatrice) sont correctement enregistrees dans la table `boat_components`, mais elles ne sont **pas stockees dans la checklist elle-meme**. L'historique n'a donc aucune donnee a afficher dans la colonne "Moteurs / Engines".

## Solution

Stocker les heures moteur dans la checklist au moment de l'enregistrement, puis les afficher dans l'historique.

### 1. Ajouter une colonne `engine_hours_snapshot` a la table `boat_checklists`

Nouvelle colonne de type `jsonb` qui stockera un instantane des heures moteur au moment du check-in/out :

```text
Format: [{"component_id": "xxx", "component_name": "Moteur BB", "hours": 1250}, ...]
```

### 2. Sauvegarder les heures moteur dans la checklist (ChecklistForm.tsx)

Apres la creation de la checklist et la mise a jour des `boat_components`, enregistrer egalement les heures dans le champ `engine_hours_snapshot` de la checklist.

### 3. Afficher les heures moteur dans l'historique (BoatChecklistHistory.tsx)

Ajouter une section "Heures moteur" dans chaque carte de l'historique, affichant les valeurs enregistrees (ex: "BB: 1250h | TB: 1230h | Gen: 450h").

### 4. Afficher les heures dans le detail de la checklist (ChecklistDetailsModal.tsx)

Ajouter une carte "Heures moteur" dans la modale de details.

## Section technique

### Migration SQL

```sql
ALTER TABLE boat_checklists
ADD COLUMN engine_hours_snapshot jsonb DEFAULT NULL;
```

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajout colonne `engine_hours_snapshot` (jsonb) |
| `src/components/checkin/ChecklistForm.tsx` | Apres la mise a jour des `boat_components`, construire le snapshot et faire un UPDATE sur la checklist |
| `src/hooks/useChecklistData.ts` | Ajouter `engineHoursSnapshot` a `ChecklistData` et l'inclure dans l'INSERT |
| `src/components/boats/BoatChecklistHistory.tsx` | Requeter `engine_hours_snapshot` et afficher les heures dans chaque carte |
| `src/components/boats/ChecklistDetailsModal.tsx` | Afficher la section "Heures moteur" dans la modale de details |

### Detail des modifications

**ChecklistForm.tsx** : Apres la boucle de mise a jour des `boat_components` (lignes 521-542), construire un tableau snapshot avec le nom et les heures de chaque moteur, puis mettre a jour la checklist :

```typescript
// Construire le snapshot
const snapshot = engineHoursEntries.map(([componentId, hours]) => {
  const engine = engines.find(e => e.id === componentId);
  return {
    component_id: componentId,
    component_name: engine?.component_name || 'Moteur',
    component_type: engine?.component_type || '',
    hours: hours
  };
});

// Sauvegarder dans la checklist
await supabase
  .from('boat_checklists')
  .update({ engine_hours_snapshot: snapshot })
  .eq('id', checklist.id);
```

Pour acceder aux engines dans ChecklistForm, il faut utiliser le hook `useBoatEngines` deja existant.

**BoatChecklistHistory.tsx** : Ajouter `engine_hours_snapshot` au SELECT, puis afficher les heures sous forme de badges compacts dans chaque carte.

**ChecklistDetailsModal.tsx** : Ajouter une carte dediee "Heures moteur" avec les valeurs du snapshot.
