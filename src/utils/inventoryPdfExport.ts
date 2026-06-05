import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem } from '@/types';
import { getLocalDateString } from '@/lib/dateUtils';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function downloadPdfBlob(doc: jsPDF, fileName: string) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Génère et télécharge immédiatement un PDF d'inventaire pour une base donnée.
 * Le téléchargement est déclenché de façon synchrone dans le geste de clic
 * utilisateur via un lien Blob immédiat, plus fiable dans la preview et les navigateurs.
 * Retourne le nombre d'articles exportés.
 */
export function downloadInventoryPDFForBase(
  baseName: string,
  items: StockItem[]
): number {
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
  downloadPdfBlob(doc, fileName);

  return sorted.length;
}
