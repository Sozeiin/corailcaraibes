import * as XLSX from 'xlsx';

export const downloadStockImportTemplate = () => {
  const headers = [[
    'Nom',
    'Référence',
    'Catégorie',
    'Quantité',
    'Seuil minimum',
    'Unité',
    'Emplacement',
    'Fournisseur',
    'Base (Guadeloupe, Martinique, Saint-Martin)',
  ]];

  const exampleRow = [[
    'Bouteille Oxygène',
    'OXY-001',
    'Plongée',
    12,
    4,
    'pièce',
    'Magasin A',
    'Air Liquide',
    'Guadeloupe',
  ]];

  const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle');
  XLSX.writeFile(workbook, 'modele_import_stock.xlsx');
};
