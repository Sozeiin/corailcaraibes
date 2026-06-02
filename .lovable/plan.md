# Fonctionnalité d'inventaire du stock

## Objectif
Permettre de réaliser un inventaire physique : saisir la quantité réellement comptée pour chaque pièce d'une base, valider, puis mettre à jour automatiquement les stocks. Chaque validation conserve un historique traçable des écarts (stock théorique vs compté).

## Expérience utilisateur
- Dans l'onglet **Stock**, ajout d'un bouton **« Inventaire »** (à côté de « Ajouter un article »), visible pour les rôles autorisés à gérer le stock.
- Le bouton ouvre un **écran/dialogue dédié** listant **toutes les pièces de la base sélectionnée** (sélecteur de base en haut du dialogue ; pour un chef de base / technicien, la base est verrouillée sur la sienne).
- Pour chaque pièce, on affiche : nom, référence, emplacement, **quantité théorique** (stock actuel), et un **champ de saisie « Quantité comptée »**.
- Un champ « écart » se calcule en direct et se colore (vert = identique, orange/rouge = écart) pour chaque ligne.
- Une barre de recherche filtre la liste dans le dialogue (pratique sur grandes bases).
- Les lignes non saisies sont considérées comme « non comptées » et **ne modifient pas** le stock (on n'écrase pas à 0 par erreur).
- Bouton **« Valider l'inventaire »** : récapitule le nombre de pièces comptées et le nombre d'écarts avant confirmation.

## Comportement à la validation
Pour chaque pièce **comptée** :
1. Mise à jour de `stock_items.quantity` avec la quantité comptée (+ `last_updated`).
2. Enregistrement d'une ligne d'historique d'inventaire (quantité théorique, quantité comptée, écart, base, auteur, date, identifiant de session).

Les pièces non saisies sont ignorées.

## Détails techniques

### Base de données (migration)
- Nouvelle table `public.stock_inventory_records` :
  - `session_id` (uuid) — regroupe les lignes d'un même inventaire
  - `stock_item_id` (uuid, FK vers `stock_items`, `ON DELETE SET NULL`)
  - `item_name`, `item_reference` (snapshot, pour conserver l'historique même si l'article est supprimé)
  - `base_id` (uuid, FK `bases`)
  - `theoretical_qty` (numeric), `counted_qty` (numeric), `difference` (numeric)
  - `actor` (uuid), `actor_name` (snapshot), `created_at`
- GRANT `SELECT, INSERT` à `authenticated`, `ALL` à `service_role` (pas d'accès `anon`).
- RLS activée : lecture/insertion réservées aux utilisateurs authentifiés, filtrées par base (en cohérence avec les politiques stock existantes) ; rôle `direction` accès toutes bases.
- Index sur `session_id` et `base_id`.

> Remarque : `stock_movements` a une contrainte limitant `movement_type` à `outbound_distribution`/`inbound_distribution`, on utilise donc une table dédiée pour l'historique d'inventaire plutôt que de modifier cette contrainte.

### Frontend
- Nouveau composant `src/components/stock/StockInventoryDialog.tsx` : dialogue plein écran avec sélecteur de base, recherche, liste scrollable des pièces et champs de saisie, récapitulatif + confirmation.
- Nouveau hook `src/hooks/useStockInventory.ts` :
  - mutation `useValidateInventory` qui, pour chaque ligne comptée, met à jour `stock_items.quantity` et insère dans `stock_inventory_records` (même `session_id`), puis invalide les requêtes stock.
- Branchement dans `src/pages/Stock.tsx` : état d'ouverture + bouton « Inventaire ».
- Conventions respectées : `getLocalDateString` pour les dates, filtrage par `base_id`, tokens de design sémantiques pour les couleurs d'écart, snapshot des noms (`*_name`) pour préserver l'historique.

### (Optionnel, même structure) Consultation de l'historique
- Possibilité d'ajouter ultérieurement un onglet/section « Historique d'inventaire » lisant `stock_inventory_records` groupé par `session_id`. Non inclus par défaut dans cette première version sauf demande.

## Hors périmètre
- Pas de scan code-barres dédié à l'inventaire (réutilisation possible plus tard).
- Pas de modification du flux des mouvements de sortie existants.
