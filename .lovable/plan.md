# Archiver les demandes terminées

## Objectif
Sur la page "Demandes d'approvisionnement", les demandes au statut "Completed" disparaissent de la liste principale et sont regroupées dans un nouvel onglet "Archive", affiché sous forme de tableau de lignes.

## Ce qui change

1. **Deux onglets en haut de la page** : "Demandes en cours" et "Archive".
   - Onglet "Demandes en cours" : toutes les demandes sauf celles terminées, présentées sous forme de cartes existantes.
   - Onglet "Archive" : uniquement les demandes terminées (statut `completed`), présentées sous forme de lignes dans un tableau.
   - Le compteur du nombre de demandes est affiché sur chaque onglet.

2. **Tableau de l'archive** : chaque ligne affiche uniquement :
   - Date de la demande
   - Nom de la demande
   - Créateur de la demande
   - Un bouton "Voir" à la fin de la ligne pour ouvrir le détail.

3. **Filtres conservés** : la recherche et le filtre d'urgence restent disponibles et s'appliquent à l'onglet actif. Le sélecteur de statut est masqué dans l'onglet Archive.

4. **Persistance** : l'onglet actif est mémorisé comme les filtres existants, donc un retour sur la page ou un changement d'onglet du navigateur ne le réinitialise pas.

## Détails techniques
- `src/pages/SupplyRequests.tsx` : ajout d'un état `activeTab` ('active' | 'archive') persisté en `sessionStorage` (clé `supply-requests-tab`), inclus dans la `queryKey`. La requête Supabase applique `.neq('status','completed')` en onglet actif et `.eq('status','completed')` en archive. Le rendu est séparé : grille de cartes pour l'onglet actif, tableau de lignes pour l'archive.
- `src/components/supply/SupplyRequestFilters.tsx` : ajout d'une prop optionnelle `showStatusFilter` (défaut `true`) pour masquer le sélecteur de statut dans l'onglet Archive.
- Aucun changement de base de données.
