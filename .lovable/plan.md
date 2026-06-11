Modifier `src/components/stock/StockInventoryDialog.tsx` pour trier la liste des articles par ordre alphabétique (champ `name`) lors de la saisie de l'inventaire.

Détail technique :
- Dans le `useMemo` de `baseItems` (ligne ~106), ajouter `.sort((a, b) => a.name.localeCompare(b.name))` après le `filter`.
- Cela garantit que tous les produits affichés dans le dialog d'inventaire sont classés de A à Z, que la recherche soit active ou non.