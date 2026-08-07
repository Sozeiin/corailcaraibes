# Refonte du stock : une fiche produit unique, plusieurs emplacements

## Objectif

Aujourd'hui une fiche article = une base. Un même produit présent en Guadeloupe, Martinique et Métropole existe en 3 fiches indépendantes.

Après la refonte : **une seule fiche produit** par article, avec un **stock par emplacement** rattaché à cette fiche.

```text
Fiche produit (nom, référence, catégorie, unité, marque, photo, code-barres)
   ├── Stock Guadeloupe : qté, seuil, emplacement détaillé, fournisseur, tarif
   ├── Stock Martinique : qté, seuil, emplacement détaillé, fournisseur, tarif
   └── Stock Métropole  : qté, seuil, emplacement détaillé, fournisseur, tarif
```

## Ce que chaque rôle voit

| Rôle | Vision |
|---|---|
| Direction, Administratif | Toutes les fiches, avec la quantité de **chaque** emplacement sur la fiche + total, et un **filtre par emplacement** |
| Chef de base, Technicien | Uniquement la ligne de stock de **leur** base : quantité, seuil, emplacement détaillé. Les quantités des autres bases ne sont pas visibles |

Le détail d'emplacement (rayonnage, casier, commentaire) saisi par une base n'est lisible que par les membres de cette base, la direction et l'administratif.

**Tarifs et fournisseurs : visibles par tous.** Quel que soit le rôle et l'emplacement, chaque fiche produit affiche l'ensemble des tarifs et fournisseurs pratiqués sur toutes les bases (fournisseur, référence fournisseur, prix unitaire, dernier achat et date, base concernée), ainsi que l'historique des achats et des devis. Seules les quantités, seuils et emplacements détaillés restent restreints à la base de l'utilisateur.


## Migration des données

Aucun regroupement automatique : chacune des 653 fiches actuelles devient une fiche produit distincte avec sa ligne de stock sur sa base d'origine. Rien n'est perdu, rien n'est fusionné à tort.

Pour fusionner ensuite les vrais doublons, un outil **« Fusionner des fiches »** est ajouté (direction / administratif) : on sélectionne 2 ou plusieurs fiches, on choisit la fiche à conserver, et les lignes de stock, mouvements, historiques d'achat et liens composants des autres fiches y sont rattachés avant suppression des fiches vides. Un écran liste les doublons probables (même référence ou nom proche) pour faciliter le travail.

## Écran « Gestion du stock » après refonte

- Liste des fiches produit (une ligne par produit, plus une ligne par base).
- Colonnes direction/administratif : produit, référence, catégorie, **qté Guadeloupe / Martinique / Métropole**, total, seuil global atteint ou non.
- Filtre « Emplacement » : tout / une base précise (n'affiche alors que les produits présents sur cette base, avec sa quantité).
- Chef de base / technicien : colonnes produit, référence, catégorie, quantité, seuil, emplacement détaillé — restreint à leur base.
- Fiche article (clic) : entête produit commun, puis un bloc par emplacement autorisé (qté, seuil, emplacement détaillé, fournisseur, tarif, dernier achat).
- Boutons existants conservés : mouvement de stock, inventaire, demande d'approvisionnement, fournisseur & tarif, export Excel, export PDF, import, scanner, code-barres. Ils agissent désormais sur le couple produit + emplacement.

## Détails techniques

Nouveau schéma, ajouté sans casser l'existant :

- `stock_products` : `id`, `name`, `reference`, `category`, `unit`, `brand`, `photo_url`, `barcode` (unique), timestamps. Lecture pour tous les rôles authentifiés, écriture direction / administratif / chef de base.
- `stock_base_levels` : `id`, `product_id` → `stock_products`, `base_id` → `bases`, `quantity`, `min_threshold`, `location`, `unit_price`, `last_supplier_id`, `supplier_reference`, `last_purchase_date`, `last_purchase_cost`, `last_updated`. Unicité `(product_id, base_id)`. GRANT + RLS : direction et administratif sur toutes les lignes, chef de base et technicien sur `base_id = get_user_base_id()`.
- Migration de données : pour chaque `stock_items` → 1 `stock_products` + 1 `stock_base_levels`. On conserve `stock_items.id` comme `stock_base_levels.id` afin que toutes les tables qui référencent `stock_item_id` (mouvements, inventaires, réservations, historiques d'achat, liens composants, interventions, demandes d'appro, expéditions, order_items) restent valides sans réécriture.
- `stock_items` est conservée en vue de compatibilité (`security_invoker`) construite sur la jointure produit + niveau, le temps de migrer les écrans secondaires ; les écrans stock principaux passent directement sur les nouvelles tables.
- Fonction `merge_stock_products(keep_id uuid, merge_ids uuid[])` en `SECURITY DEFINER` avec contrôle de rôle direction/administratif, qui recolle les lignes de stock (addition des quantités si même base) et supprime les fiches vidées.

Front :

- Nouveaux hooks `useStockProducts` (liste agrégée par produit, selon rôle) et `useStockLevels`.
- `src/pages/Stock.tsx`, `StockTable.tsx`, `StockCards.tsx`, `StockFilters.tsx`, `StockItemDetailsDialog.tsx`, `StockDialog.tsx` adaptés au modèle produit + niveaux ; `StockDuplicateDialog.tsx` remplacé par « Ajouter cet article à une autre base ».
- Exports Excel et PDF, inventaire et scanner alignés sur produit + emplacement.
- Les écrans hors stock (maintenance, expéditions, demandes d'appro, composants bateaux) continuent de fonctionner via la vue de compatibilité, puis sont migrés progressivement.

## Étapes

1. Migration schéma + reprise des 653 fiches + vue de compatibilité.
2. Hooks et page stock (vision multi-emplacements direction/administratif, vision mono-base chef/technicien, filtre emplacement).
3. Fiche article multi-emplacements et ajout d'un emplacement.
4. Outil de fusion des doublons + liste des doublons probables.
5. Alignement des exports, de l'inventaire et du scanner, puis vérification des écrans dépendants.
