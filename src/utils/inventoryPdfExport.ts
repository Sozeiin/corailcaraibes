import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem } from '@/types';
import { getLocalDateString } from '@/lib/dateUtils';

interface BaseOption {
  id: string;
  name: string;
}

interface ExportOptions {
  role?: string;
  baseId?: string;
}

export interface InventoryPDFFile {
  blob: Blob;
  fileName: string;
  baseName: string;
  itemCount: number;
}

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function buildBasePdf(baseName: string, items: StockItem[]): InventoryPDFFile {
  const doc = new jsPDF({ orientation: 'landscape' });
  const dateStr = getLocalDateString();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(`Inventaire - ${baseName}`, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Généré le ${dateStr}`, 14, 22);
  doc.setTextColor(0);

  const sorted = [...items].sort((a, b) => {
    const cat = (a.category || '').localeCompare(b.category || '');
    if (cat !== 0) return cat;
    return (a.name || '').localeCompare(b.name || '');
  });

  autoTable(doc, {
    startY: 28,
    head: [['Catégorie', 'Nom', 'Référence', 'Marque', 'Quantité', 'Seuil min', 'Unité', 'Emplacement']],
    body: sorted.map((item) => [
      item.category || '-',
      item.name || '-',
      item.reference || '-',
      item.brand || '-',
      String(item.quantity ?? 0),
      String(item.minThreshold ?? 0),
      item.unit || '-',
      item.location || '-',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 120], textColor: 255 },
    alternateRowStyles: { fillColor: [243, 246, 250] },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageCurrent = data.pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        `${sorted.length} article(s) - Page ${pageCurrent}/${pageCount}`,
        pageWidth - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'right' }
      );
      doc.setTextColor(0);
    },
  });

  const fileName = `inventaire_${slugify(baseName)}_${dateStr}.pdf`;
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  return { blob, fileName, baseName, itemCount: sorted.length };
}

/**
 * Génère un PDF imprimable par base.
 * - Direction : un PDF pour chaque base ayant des produits.
 * - Autres rôles : un PDF uniquement pour la base de l'utilisateur.
 */
export function exportInventoryPDF(
  items: StockItem[],
  bases: BaseOption[],
  options: ExportOptions
): InventoryPDFFile[] {
  const isDirection = options.role === 'direction';

  const targetBases = isDirection
    ? bases
    : bases.filter((b) => b.id === options.baseId);

  const files: InventoryPDFFile[] = [];

  targetBases.forEach((base) => {
    const baseItems = items.filter((item) => item.baseId === base.id);
    if (baseItems.length === 0) return;
    files.push(buildBasePdf(base.name, baseItems));
  });

  return files;
}
