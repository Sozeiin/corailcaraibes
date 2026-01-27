
# Plan de correction : Interventions invisibles pour le Chef de Base

## Problème identifié

L'utilisateur `corail.mart@wanadoo.fr` (rôle `chef_base`, base Martinique) ne voit aucune intervention malgré 484 interventions existantes pour sa base.

### Causes identifiées

1. **Race condition potentielle** : La requête peut s'exécuter avant que `user.baseId` soit complètement chargé dans le contexte Auth
2. **Incohérence de filtrage** : La page Maintenance s'appuie uniquement sur RLS, alors que d'autres pages (Dashboard) utilisent un filtre client explicite
3. **Cache React Query** : Le `queryKey` inclut `user?.role` et `user?.baseId` qui peuvent être `undefined` lors du premier rendu, créant un cache vide qui n'est pas invalidé ensuite

### Données vérifiées
- ✅ Profil correct : `chef_base` avec `base_id = Martinique`
- ✅ 484 interventions existent pour la base Martinique
- ✅ Politiques RLS correctement définies
- ✅ Fonctions `get_user_role()` et `get_user_base_id()` correctement configurées

---

## Solution proposée

### 1. Améliorer la condition `enabled` de la requête

**Fichier** : `src/components/maintenance/MaintenanceInterventions.tsx`

```typescript
// AVANT
enabled: !!user

// APRÈS
enabled: !!user?.id && !!user?.baseId
```

Cela garantit que la requête ne s'exécute qu'une fois le profil entièrement chargé.

---

### 2. Ajouter un filtre explicite pour les non-direction (cohérence)

Pour plus de robustesse et cohérence avec le reste de l'application, ajouter un filtre `base_id` côté client (en plus de RLS) :

```typescript
// AVANT
const { data, error } = await supabase
  .from('interventions')
  .select(`*,boats(name, model),profiles(name)`)
  .order('created_at', { ascending: false });

// APRÈS
let query = supabase
  .from('interventions')
  .select(`*,boats(name, model),profiles(name)`)
  .order('created_at', { ascending: false });

// Filtrer par base pour les non-direction
if (user?.role !== 'direction') {
  query = query.eq('base_id', user.baseId);
}

const { data, error } = await query;
```

---

### 3. Améliorer le queryKey pour éviter les problèmes de cache

```typescript
// AVANT
queryKey: ['interventions', user?.role, user?.baseId]

// APRÈS
queryKey: ['interventions', user?.role, user?.baseId, user?.id]
```

Ajouter `user?.id` garantit que le cache est invalidé lors d'un changement d'utilisateur.

---

### 4. Appliquer les mêmes corrections à la requête des bateaux

Même pattern pour la requête des bateaux utilisés dans le filtre :

```typescript
enabled: !!user?.id && !!user?.baseId

// Ajouter filtre pour non-direction
if (user?.role !== 'direction') {
  query = query.eq('base_id', user.baseId);
}
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/maintenance/MaintenanceInterventions.tsx` | Améliorer `enabled`, ajouter filtre `base_id`, corriger `queryKey` |

---

## Résultat attendu

Après ces modifications :
- ✅ Le chef de base verra les 484 interventions de sa base Martinique
- ✅ Pas de race condition possible au chargement
- ✅ Cache React Query correctement géré entre sessions utilisateur
- ✅ Double protection : filtre client + RLS côté serveur

---

## Section technique

### Pourquoi RLS seul ne suffit pas ici

Bien que RLS soit correctement configuré, le problème survient quand :
1. La requête React Query s'exécute avec `user = { id: "...", role: undefined, baseId: undefined }`
2. Le token JWT est envoyé à Supabase, mais la session Supabase peut prendre un instant pour synchroniser les métadonnées
3. `get_user_base_id()` retourne `null` car le profil n'est pas encore accessible via `auth.uid()`
4. La politique RLS filtre toutes les interventions (aucune ne correspond à `base_id = null`)

En ajoutant un filtre explicite côté client ET en attendant que `user.baseId` soit défini, on élimine complètement ce problème de timing.
