# Export PDF des produits par base (dialogue Inventaire)

## Objectif
Ajouter un bouton **« Exporter PDF »** dans la fenêtre *Inventaire* (page Gestion du Stock) qui génère une liste imprimable de tous les produits :
- **Direction** : un fichier PDF distinct pour **chaque base**.
- **Chef de base** : un PDF pour **sa** base uniquement.

## Comportement
- Le bouton apparaît dans l'en-tête du dialogue Inventaire.
- Pour la direction : génère un PDF par base existante (les bases sans produit sont ignorées).
- Pour un chef de base : génère uniquement le PDF de sa base (`userBaseId`).
- Chaque PDF contient le nom de la base, la date de génération, et un tableau de tous les produits triés par catégorie puis par nom.

## Contenu de chaque PDF
En-tête : « Inventaire – {Nom de la base} » + date du jour.

Tableau avec colonnes :
| Catégorie | Nom | Référence | Marque | Quantité | Seuil min | Unité | Emplacement |

Pied de page : numéro de page + total d'articles.

Nom de fichier : `inventaire_{nom_base}_{AAAA-MM-JJ}.pdf`.

## Détails techniques
- Ajouter la dépendance `jspdf-autotable` (jsPDF 4.0.0 est déjà présent) pour générer des tableaux propres et paginés automatiquement.
- Créer un utilitaire `src/utils/inventoryPdfExport.ts` exportant `exportInventoryPDF(items, bases, { role, baseId })` :
  - regroupe les `StockItem` par `baseId`,
  - filtre selon le rôle (direction = toutes les bases, sinon la base de l'utilisateur),
  - pour chaque base, crée un document jsPDF, écrit l'en-tête et le tableau via autotable, puis `doc.save(...)`.
  - utilise `getLocalDateString` (`src/lib/dateUtils.ts`) pour la date du nom de fichier.
- Modifier `src/components/stock/StockInventoryDialog.tsx` :
  - ajouter un bouton « Exporter PDF » (icône `FileDown`) dans l'en-tête du dialogue,
  - au clic, appeler `exportInventoryPDF(items, bases, { role: userRole, baseId: userBaseId })`,
  - afficher un toast de confirmation / d'erreur.
- Aucune modification de base de données ou de logique métier : la fonctionnalité utilise les `items` déjà chargés et passés au dialogue.
