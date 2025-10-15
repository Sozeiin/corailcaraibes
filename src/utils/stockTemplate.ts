import * as XLSX from 'xlsx';

/**
 * Generates and downloads the Excel template used for stock imports.
 */
export const downloadStockTemplate = () => {
  const headers = [[
    'Nom',
    'Référence',
    'Code-barres',
    'Catégorie',
    'Quantité',
    'Seuil minimum',
    'Unité',
    'Emplacement',
    'Fournisseur',
    'Base (Guadeloupe, Martinique, Saint-Martin)',
    'Marque',
    'Référence Fournisseur',
  ]];

  const exampleRow = [[
    'Bouteille Oxygène',
    'OXY-001',
    '', // Code-barres vide = auto-généré
    'Plongée',
    12,
    4,
    'pièce',
    'Magasin A',
    'Air Liquide',
    'Guadeloupe',
    'Air Liquide',
    'AL-OXY-001-FR',
  ]];

  const worksheet = XLSX.utils.aoa_to_sheet([...headers, ...exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle');
  XLSX.writeFile(workbook, 'modele_import_stock.xlsx');
};
