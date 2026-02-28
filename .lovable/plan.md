

# Correction du decalage de date (11 fevrier affiche comme 10 fevrier)

## Probleme identifie

L'application est utilisee dans les Caraibes (fuseau horaire UTC-4). Quand une date comme `"2026-02-11"` est stockee en base, le code utilise `new Date("2026-02-11")` pour l'afficher, ce qui cree un objet Date a **minuit UTC** (soit le 10 fevrier a 20h en heure locale). Ensuite, `toLocaleDateString()` affiche la date en heure locale, donc **10 fevrier au lieu du 11**.

Ce probleme touche deux aspects :
1. **L'affichage** : `new Date(dateString).toLocaleDateString()` est utilise dans environ 25 fichiers
2. **L'enregistrement** : `new Date().toISOString().split('T')[0]` peut aussi decaler la date dans certains cas

## Solution

### 1. Ajouter une fonction utilitaire d'affichage dans `src/lib/dateUtils.ts`

Creer une fonction `formatDateSafe(dateString)` qui parse la date sans decalage de fuseau horaire, en extrayant directement les composants annee/mois/jour de la chaine.

```text
Exemple :
"2026-02-11" -> affiche "11/02/2026" quel que soit le fuseau horaire
```

### 2. Corriger l'enregistrement des dates dans `ChecklistForm.tsx`

Remplacer :
```text
checklistDate: new Date().toISOString().split('T')[0]
```
par un calcul qui utilise la date locale (annee, mois, jour locaux) pour eviter le decalage.

Meme correction pour `scheduled_date` des interventions automatiques creees lors du check-in.

### 3. Corriger l'affichage dans les fichiers concernes

Remplacer les occurrences de `new Date(date).toLocaleDateString()` par la nouvelle fonction `formatDateSafe()` dans les fichiers principaux lies au check-in et aux interventions :

- `src/components/boats/BoatChecklistHistory.tsx` (2 occurrences)
- `src/components/boats/BoatInterventionHistory.tsx` (2 occurrences)
- `src/components/boats/ChecklistDetailsModal.tsx` (1 occurrence)
- `src/components/maintenance/InterventionTable.tsx` (2 occurrences)
- `src/components/dashboard/widgets/MaintenanceWidget.tsx` (1 occurrence)
- `src/hooks/useCreateIntervention.ts` (1 occurrence)
- Autres fichiers utilisant le meme pattern pour les dates de type "YYYY-MM-DD"

## Section technique

### Fonction `formatDateSafe`

```typescript
export function formatDateSafe(dateString: string, locale: string = 'fr-FR'): string {
  // Pour les dates "YYYY-MM-DD", parser directement sans passer par new Date()
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    // Creer la date a midi pour eviter tout decalage
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return date.toLocaleDateString(locale);
  }
  // Fallback pour les dates ISO completes
  const d = new Date(dateString);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)
    .toLocaleDateString(locale);
}
```

### Fonction `getLocalDateString`

```typescript
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/lib/dateUtils.ts` | Ajout de `formatDateSafe` et `getLocalDateString` |
| `src/components/checkin/ChecklistForm.tsx` | Utiliser `getLocalDateString()` pour `checklistDate` et `scheduled_date` |
| `src/components/boats/BoatChecklistHistory.tsx` | Utiliser `formatDateSafe()` pour l'affichage |
| `src/components/boats/BoatInterventionHistory.tsx` | Utiliser `formatDateSafe()` pour l'affichage |
| `src/components/boats/ChecklistDetailsModal.tsx` | Utiliser `formatDateSafe()` pour l'affichage |
| `src/components/maintenance/InterventionTable.tsx` | Utiliser `formatDateSafe()` pour l'affichage |
| `src/components/dashboard/widgets/MaintenanceWidget.tsx` | Utiliser `formatDateSafe()` pour l'affichage |
| `src/hooks/useCreateIntervention.ts` | Utiliser `formatDateSafe()` pour le message de notification |

