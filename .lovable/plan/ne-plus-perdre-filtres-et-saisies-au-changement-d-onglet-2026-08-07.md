# Ne plus perdre filtres et saisies au changement d'onglet

## Le problème observé

Quand vous quittez l'onglet du navigateur puis revenez sur "Demandes d'approvisionnement" :
- les filtres (statut, urgence, recherche) reviennent à zéro,
- une demande ouverte en cours de saisie se referme.

## Cause confirmée

Deux mécanismes se cumulent au retour de focus :

1. Supabase émet un évènement d'authentification (`TOKEN_REFRESHED` / `SIGNED_IN`). Dans `AuthContext`, chaque évènement repasse `loading` à `true` (ligne 46), ce qui fait afficher l'écran de chargement par `ProtectedRoute` (`App.tsx`). La page est alors **démontée** : ses filtres et ses boîtes de dialogue ouvertes (état local React) sont perdus.
2. Plusieurs rafraîchissements se déclenchent en même temps au focus : `refetchOnWindowFocus`, `refetchInterval: 30000` et `staleTime: 0` (`main.tsx`), plus le `forceRefresh` sur `focus` de `useAutoRefresh`.

Les boîtes de dialogue des demandes d'approvisionnement ne sont pas non plus enregistrées dans `FormStateContext`, donc les protections « formulaire ouvert » déjà en place ne s'y appliquent pas.

## Ce qui va être fait

1. **Ne plus afficher l'écran de chargement pour un simple rafraîchissement de session** : le profil est rechargé silencieusement en arrière-plan quand un utilisateur est déjà connecté. L'écran de chargement reste uniquement au tout premier chargement de l'app et lors d'une vraie connexion/déconnexion. La page n'est donc plus démontée → filtres et saisies conservés.
2. **Calmer les rafraîchissements automatiques** : désactiver `refetchOnWindowFocus`, retirer le `refetchInterval` global de 30 s et donner un `staleTime` court (30 s) ; supprimer le `forceRefresh` global sur l'évènement `focus` de `useAutoRefresh` (le refresh périodique sélectif et le bouton de refresh manuel restent).
3. **Protéger les dialogues d'approvisionnement** : enregistrer `SupplyRequestDialog`, `SupplyRequestDetailsDialog` et `SupplyManagementDialog` dans `FormStateContext` (comme les dialogues de check-in et d'intervention) afin que tout refresh soit suspendu pendant leur ouverture.
4. **Garder les filtres même après un rechargement de page** : mémoriser statut / urgence / recherche de la page Demandes d'approvisionnement dans `sessionStorage` et les restaurer au montage.

## Détails techniques

- `src/contexts/AuthContext.tsx` : dans `loadProfileForSession`, ne déclencher `setLoading(true)` que si aucun utilisateur n'est encore chargé (rafraîchissement silencieux sinon) ; ignorer les évènements `TOKEN_REFRESHED` quand l'ID utilisateur ne change pas.
- `src/main.tsx` : `refetchOnWindowFocus: false`, suppression de `refetchInterval`, `staleTime: 30000`.
- `src/hooks/useAutoRefresh.ts` : suppression de l'écouteur `focus` déclenchant `invalidateQueries()` global.
- `src/components/supply/SupplyRequestDialog.tsx`, `SupplyRequestDetailsDialog.tsx`, `SupplyManagementDialog.tsx` : `registerForm()` / `unregisterForm()` selon l'état d'ouverture.
- `src/pages/SupplyRequests.tsx` : persistance des trois filtres dans `sessionStorage`.

Aucune modification de base de données, aucune fonctionnalité retirée.
