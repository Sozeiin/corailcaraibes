

## Problème identifié

Quand un technicien fait un **check-in**, le check-in se transforme en **check-out** et l'envoi email échoue silencieusement. Idem dans l'autre sens. Cause : un seul bouton "Reprendre" dans la liste de brouillons partagés réutilise n'importe quel brouillon dont le `form_key` correspond, et la **clé d'identification du brouillon n'inclut pas le type** correctement, donc check-in et check-out se mélangent. De plus, l'envoi email échoue car le brouillon est supprimé avant la fin de l'envoi.

### Causes techniques précises

1. **`useSignaturePersistence.ts` ligne 17** :
   ```
   const dbFormKey = `checklist_${formKey.replace('checklist_', '')}`;
   ```
   `formKey` est déjà `checklist_<boatId>_checkin`. Après remplacement, on obtient `checklist_<boatId>_checkin` → OK pour le boat, mais le type est dans la chaîne. Le vrai problème est ailleurs : voir 2.

2. **`TechnicianCheckinInterface.tsx` `handleResumeDraft`** : navigue vers `/checkin-process` en passant `type: checklistType` dans `state`, MAIS `CheckInProcess.tsx` (vu dans le contexte initial) **passe `type="checkin"` en dur** à `<ChecklistForm>`. Donc reprendre un brouillon de check-out ouvre un check-in qui charge le brouillon check-out → données mélangées et statut bateau erroné.

3. **`ChecklistForm.tsx` ligne 169** : la `formKey` est `checklist_${boat.id}_${type}`. Quand on reprend un brouillon check-out via la page `/checkin-process` qui force `type="checkin"`, la formKey devient `checklist_<boat>_checkin` mais le brouillon en DB est `checklist_<boat>_checkout`. Pire : si le même bateau a un brouillon check-in ET check-out, ils s'écrasent l'un l'autre via `upsert` car `boat_id` se retrouve réutilisé.

4. **Ordre dans `handleComplete` (ChecklistForm ligne 728-737)** : `clearFormDraft()` et `clearSignatures()` sont appelés AVANT `onComplete()`. Si l'envoi email se fait via Promise et qu'une erreur survient juste après, l'utilisateur perd son brouillon ET le check-in n'est pas finalisé côté UI → "tout a été effacé".

5. **Section "Brouillons en cours"** affiche TOUS les drafts de la base sans filtrer par technicien ni par type, et le bouton "Reprendre" ne respecte pas le type.

## Plan de correction

### 1. Corriger `CheckInProcess.tsx`
- Lire `state.type` ('checkin' | 'checkout') et le passer à `<ChecklistForm type={state.type || 'checkin'} />`
- Adapter le titre ("Check-in" vs "Check-out")
- Adapter la logique de transfert ONE WAY (uniquement si `type === 'checkin'`)

### 2. Corriger `TechnicianCheckinInterface.tsx` — `handleResumeDraft`
- Récupérer le bateau complet (`select * from boats where id`) et la fiche admin associée si check-in
- Passer `type: draft.checklist_type` explicitement dans `state`
- Pour un brouillon check-out, charger le rental associé

### 3. Renforcer la séparation check-in / check-out dans `useFormPersistence` et `useSignaturePersistence`
- S'assurer que `formKey` inclut TOUJOURS `_checkin` ou `_checkout`
- Dans `useSignaturePersistence`, utiliser directement `formKey` (pas de manipulation `replace`) pour viser exactement la bonne ligne en DB
- Ajouter dans la migration une contrainte unique `(boat_id, checklist_type)` en complément de `form_key` pour éviter les collisions futures

### 4. Sécuriser l'ordre de finalisation dans `ChecklistForm.handleComplete`
- Ne supprimer le brouillon (`clearFormDraft` + `clearSignatures`) **qu'après** que la checklist soit créée ET sauvegardée en DB avec succès
- Si l'envoi email échoue, conserver la checklist mais ne PAS supprimer le brouillon tant que la création checklist DB n'est pas confirmée
- Déplacer `clearFormDraft()` / `clearSignatures()` juste après `createChecklistMutation.mutateAsync` réussi, et entourer d'un try/catch dédié

### 5. Filtrer la liste "Brouillons en cours"
- Filtrer par `created_by = user.id` OU `updated_by = user.id` côté requête (ou afficher tous mais grouper par type)
- Afficher clairement le badge type (déjà fait) et n'afficher dans l'onglet Check-in que les drafts `checklist_type='checkin'` quand on est en mode check-in (et inversement). Garder la section globale mais ordonnée.

### 6. Diagnostic email (`send-checklist-report`)
- Vérifier les logs récents de l'edge function pour comprendre pourquoi l'email ne part pas
- Ajouter un retry et une remontée d'erreur plus visible côté UI (toast persistant)

### Fichiers impactés
- `src/pages/CheckInProcess.tsx`
- `src/components/checkin/TechnicianCheckinInterface.tsx`
- `src/components/checkin/ChecklistForm.tsx`
- `src/hooks/useFormPersistence.ts`
- `src/hooks/useSignaturePersistence.ts`
- Migration SQL : index unique `(boat_id, checklist_type)` sur `checkin_drafts` + nettoyage des doublons existants
- Vérification logs `supabase/functions/send-checklist-report`

### Validation E2E
1. Démarrer un check-in TOPAZE → quitter à mi-chemin → reprendre le brouillon → doit rester un **check-in** (pas check-out)
2. Démarrer un check-out sur le même bateau en parallèle → les deux brouillons coexistent sans s'écraser
3. Finaliser le check-in avec envoi email → email part, brouillon supprimé, statut bateau = `rented`
4. Si email échoue → checklist est créée, brouillon supprimé, message d'erreur clair sur l'email uniquement

