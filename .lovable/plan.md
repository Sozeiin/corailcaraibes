# Bouton « Achats » sur les lignes de stock

## Objectif
Ajouter, sur chaque ligne d'article de la page Stock, un bouton/icône **Achats** visible uniquement pour les profils **chef de base** et **administratif**. Ce bouton ouvre une petite boîte de dialogue pré-remplie avec le nom du produit, où l'on saisit la quantité voulue, on ajoute une photo si absente, puis on envoie une **demande d'achats** qui apparaît dans l'onglet *Demandes d'achats*.

## Comportement attendu
1. Icône « Achats » (panier/ShoppingCart) sur chaque ligne, à côté des actions existantes (Modifier, Dupliquer, Supprimer).
2. Visible uniquement pour `chef_base` et `administratif`.
3. Au clic, ouverture d'une petite boîte de dialogue contenant :
   - Nom de l'article (récupéré automatiquement, en lecture seule).
   - Référence affichée (lecture seule).
   - Champ **Quantité à commander** (nombre, min 1, défaut 1).
   - Champ **Niveau d'urgence** (Faible/Normal/Élevé/Urgent, défaut Normal).
   - Champ description optionnel.
   - Aperçu de la photo de l'article ; si l'article n'a pas de photo, possibilité d'en ajouter (réutilisation du composant `PhotoCapture`).
4. Bouton **« Envoyer ma demande d'achats »** qui insère la demande dans `supply_requests` (même logique que `SupplyRequestDialog`), puis affiche un toast de succès et ferme la boîte.
5. La demande créée est automatiquement visible dans l'onglet *Demandes d'achats* (page existante alimentée par la table `supply_requests`).

## Détails techniques

### Nouveau composant `src/components/stock/QuickSupplyRequestDialog.tsx`
- Props : `item: StockItem | null`, `isOpen: boolean`, `onClose: () => void`.
- Pré-remplit `item_name`, `item_reference`, `stock_item_id` et `photo_url` à partir de l'article.
- État local : `quantity_needed`, `urgency_level`, `description`, `photoUrl`.
- Mutation d'insertion dans `supply_requests` (champs : `item_name`, `item_reference`, `description`, `quantity_needed`, `urgency_level`, `photo_url`, `base_id` = `user.baseId`, `requested_by` = `user.id`, `stock_item_id`, `boat_id` = null). `request_number` est généré par le trigger existant — ne pas le fournir.
- `onSuccess` : invalider `["supply-requests"]`, toast succès, fermer.
- Réutilise `PhotoCapture` pour permettre l'ajout d'une photo si l'article n'en a pas.

### `src/components/stock/StockTable.tsx`
- Nouvelle prop optionnelle `onRequestPurchase?: (item: StockItem) => void` et `canRequestPurchase?: boolean`.
- Dans la cellule Actions, ajouter un bouton icône `ShoppingCart` (titre « Demande d'achats ») rendu si `canRequestPurchase`, avec `e.stopPropagation()`.
- S'assurer que la colonne Actions s'affiche aussi pour ces profils (elle est déjà conditionnée par `canManage`, ce qui inclut `chef_base` et `administratif`).

### `src/pages/Stock.tsx`
- Calcul `canRequestPurchase = ['chef_base','administratif'].includes(user?.role || '')`.
- États `purchaseItem` / `isPurchaseDialogOpen` et handler `handleRequestPurchase`.
- Passer `onRequestPurchase` et `canRequestPurchase` à `StockTable`.
- Pour le mobile (`MobileTable`), ajouter une colonne action ou un accès via la fiche — ajout d'un bouton « Achats » dans les colonnes mobiles.
- Monter `<QuickSupplyRequestDialog .../>`.

### Permissions / sécurité
- Restriction UI par rôle ; la table `supply_requests` conserve ses RLS existantes (l'insert utilise déjà `base_id` + `requested_by`). Aucune migration nécessaire.

## Vérification
- Connecté en `chef_base` : l'icône Achats apparaît, la boîte se pré-remplit, l'envoi crée une demande visible dans l'onglet *Demandes d'achats*.
- Connecté en `technicien` ou `direction` : l'icône Achats n'apparaît pas.
- Article sans photo : possibilité d'en ajouter une avant envoi.