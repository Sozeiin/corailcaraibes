# Archiver les demandes terminées

## Objectif
Sur la page "Demandes d'approvisionnement", les demandes au statut "Completed" disparaissent de la liste principale et sont regroupées dans un nouvel onglet "Archive".

## Ce qui change

1. **Deux onglets en haut de la page** : "Demandes en cours" et "Archive".
   - Onglet "Demandes en cours" : toutes les demandes sauf celles terminées.
   - Onglet "Archive" : uniquement les demandes terminées (statut `completed`).
   - Le compteur du nombre de demandes est affiché sur chaque onglet.

2. **Filtres conservés** : la recherche, le filtre d'urgence et le filtre de statut restent disponibles et s'appliquent à l'onglet actif. Dans l'onglet Archive, l'option de statut est inutile (tout est "Terminé") — le sélecteur de statut y est masqué.

3. **Cartes identiques** : même affichage de carte, mêmes boutons (Voir / Gérer / Supprimer) selon les droits actuels, dans les deux onglets.

4. **Persistance** : l'onglet actif est mémorisé comme les filtres existants, donc un retour sur la page ou un changement d'onglet du navigateur ne le réinitialise pas.

## Détails techniques
- `src/pages/SupplyRequests.tsx` : ajout d'un état `activeTab` ('active' | 'archive') persisté en `sessionStorage` (clé `supply-requests-tab`), inclus dans la `queryKey`. La requête Supabase applique `.eq('status','completed')` en archive et `.neq('status','completed')` en actif (le filtre de statut manuel prime quand il est défini en onglet actif). Le rendu des cartes est extrait dans un petit composant/fonction réutilisé par les deux `TabsContent` pour éviter la duplication.
- `src/components/supply/SupplyRequestFilters.tsx` : ajout d'une prop optionnelle `showStatusFilter` (défaut `true`) pour masquer le sélecteur de statut dans l'onglet Archive.
- Aucun changement de base de données.
