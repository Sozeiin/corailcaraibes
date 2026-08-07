# Fiches articles : fournisseur, tarif, demande d'appro + export Excel

## Point 2 — Réponse à votre question (structure actuelle)

**1 fiche article = 1 base.** La table des articles de stock contient un champ « base » unique par fiche : un article appartient à une seule base (Guadeloupe, Martinique ou Métropole). C'est pour ça qu'il existe déjà un bouton « Dupliquer » : le même article présent sur 2 bases existe en 2 fiches distinctes (les données montrent effectivement des articles au même nom dupliqués sur 2 bases).

Conséquences : quantité, emplacement, seuil, dernier prix et dernier fournisseur sont propres à chaque base. Une fiche unique partagée par les 3 bases demanderait une refonte (fiche « produit » globale + lignes de stock par base) — pas inclus ici, à décider séparément si vous le souhaitez.

## Point 1 — Actions directement depuis la fiche article

Dans la boîte de dialogue de détail d'un article :

- **Nouveau bouton « Demande d'appro »** dans l'en-tête de la fiche (visible pour direction, chef de base, administratif) qui ouvre le dialogue de demande rapide déjà existant, pré-rempli avec l'article, sa photo et sa référence.
- **Onglet « Fournisseur »** : ajout d'un bouton « Définir le fournisseur » permettant de choisir un fournisseur dans la liste et d'enregistrer la référence fournisseur — cela met à jour la fiche (fournisseur principal + réf. fournisseur).
- **Tarif** : ajout d'un champ prix unitaire dans le même formulaire (prix unitaire + date), enregistré sur la fiche, avec affichage immédiat dans le bandeau « Dernier coût ».
- L'onglet « Devis » existant reste la voie pour les tarifs multi-fournisseurs ; le nouveau formulaire sert au fournisseur/tarif de référence de la fiche.

## Point 3 — Export Excel de l'inventaire

- Nouveau bouton **« Exporter Excel »** dans l'en-tête de la page Gestion du stock, à côté de « Inventaire ».
- Génère un fichier `.xlsx` (bibliothèque xlsx déjà présente dans le projet) contenant tous les articles correspondant aux filtres en cours (base, catégorie, recherche, stock faible), colonnes : Nom, Référence, Réf. fournisseur, Marque, Catégorie, Quantité, Unité, Seuil min, Emplacement, Base, Prix unitaire, Valeur totale, Dernier achat, Dernier coût, Statut.
- Une feuille par base lorsque « Toutes les bases » est sélectionné (direction), sinon une seule feuille pour la base concernée. Nom du fichier : `inventaire-<base>-<date>.xlsx`.
- Les données sont lues directement en base pour ne pas être limitées par la pagination de l'affichage.

## Détails techniques

- `src/components/stock/StockItemDetailsDialog.tsx` : bouton demande d'appro + montage de `QuickSupplyRequestDialog`.
- Nouveau `src/components/stock/StockSupplierPriceDialog.tsx` : sélection fournisseur (`suppliers`), réf. fournisseur, prix unitaire ; mise à jour de `stock_items` (`last_supplier_id`, `supplier_reference`, `unit_price`, `last_purchase_cost`, `last_purchase_date`) + invalidation des requêtes stock.
- Nouveau `src/utils/inventoryExcelExport.ts` : génération xlsx via `XLSX.utils.json_to_sheet` / `writeFile`, une feuille par base.
- `src/pages/Stock.tsx` : bouton d'export, requête Supabase de tous les articles selon les filtres/rôle.
- Aucune modification de schéma de base de données nécessaire.
