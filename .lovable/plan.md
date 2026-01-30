
# Correction : Stockage du type de checklist et du client

## Problème identifié

Le système actuel **n'enregistre pas** le type de checklist (checkin/checkout) ni le nom du client dans la table `boat_checklists`. Ces informations sont **inférées** à l'affichage en comparant les dates avec les locations, ce qui échoue quand plusieurs locations se chevauchent.

### Cas concret observé
- Location "Bill" : 30/01 → 31/01 (le check-in devrait être pour Bill)
- Location "test test" : 23/01 → 30/01 (le check-out devrait être pour test test)
- Le système confond les deux car les dates se chevauchent le 30/01

---

## Solution proposée

### 1. Migration base de données

Ajouter les colonnes manquantes à `boat_checklists` :

```sql
ALTER TABLE boat_checklists 
ADD COLUMN IF NOT EXISTS checklist_type TEXT CHECK (checklist_type IN ('checkin', 'checkout', 'maintenance')),
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS rental_id UUID REFERENCES boat_rentals(id);
```

### 2. Modifier le hook de création de checklist

**Fichier** : `src/hooks/useChecklistData.ts`

Mettre à jour l'interface `ChecklistData` pour inclure :
```typescript
export interface ChecklistData {
  // ... existing fields
  checklistType: 'checkin' | 'checkout' | 'maintenance';
  customerName?: string;
  rentalId?: string;
}
```

Modifier la mutation pour enregistrer ces nouvelles données lors de l'insertion.

### 3. Modifier le formulaire de checklist

**Fichier** : `src/components/checkin/ChecklistForm.tsx`

Passer les données `type`, `customerName` et `rentalId` à la mutation :
```typescript
const checklistData: ChecklistData = {
  // ... existing
  checklistType: type, // 'checkin' ou 'checkout'
  customerName: rentalData?.customerName,
  rentalId: rental?.id,
};
```

### 4. Simplifier l'affichage de l'historique

**Fichier** : `src/components/boats/BoatChecklistHistory.tsx`

Utiliser directement les colonnes stockées au lieu de l'inférence complexe :
```typescript
const { data: checklistsData } = await supabase
  .from('boat_checklists')
  .select(`
    id,
    checklist_date,
    overall_status,
    checklist_type,    // Utiliser la valeur stockée
    customer_name,     // Utiliser la valeur stockée
    technician:profiles!...(name)
  `)
  .eq('boat_id', boatId);
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| Migration SQL | Ajouter `checklist_type`, `customer_name`, `rental_id` |
| `src/hooks/useChecklistData.ts` | Étendre interface, insérer nouvelles colonnes |
| `src/components/checkin/ChecklistForm.tsx` | Passer type et client à la mutation |
| `src/components/boats/BoatChecklistHistory.tsx` | Lire les colonnes directement au lieu d'inférer |

---

## Résultat attendu

Après ces modifications :
- Check-in de Bill → affiche "Check-in" avec client "Bill"
- Check-out de test test → affiche "Check-out" avec client "test test"
- Pas de confusion possible entre les locations qui se chevauchent

---

## Section technique

### Pourquoi stocker plutôt qu'inférer ?

L'inférence actuelle échoue quand :
1. Plusieurs locations ont des dates qui se chevauchent (cas observé)
2. Une location est modifiée après le check-in/out
3. Une checklist est faite sans location associée

En stockant les données au moment de la création, on capture l'**intention réelle** du technicien, indépendamment des données de location qui peuvent évoluer.

### Migration des données existantes (optionnel)

Pour les checklists existantes sans `checklist_type`, l'ancien algorithme d'inférence sera conservé comme fallback dans l'affichage.
