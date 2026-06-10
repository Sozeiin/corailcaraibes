import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem } from '@/types';
import { getLocalDateString, formatDateSafe } from '@/lib/dateUtils';

export interface InventoryReportRecord {
  session_id: string;
  item_name: string;
  item_reference: string | null;
  theoretical_qty: number;
  counted_qty: number;
  difference: number;
  actor_name: string | null;
  created_at: string;
}

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

/**
 * Génère et télécharge un PDF du rapport d'inventaire (sessions historiques)
 * pour une base et une année données. Chaque session est détaillée avec ses écarts.
 * Retourne le nombre de sessions exportées.
 */
export function downloadInventoryReportPDFForBase(
  baseName: string,
  year: number,
  records: InventoryReportRecord[]
): number {
  const doc = new jsPDF({ orientation: 'landscape' });
  const dateStr = getLocalDateString();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Regroupe les enregistrements par session
  const sessionMap = new Map<string, InventoryReportRecord[]>();
  records.forEach((rec) => {
    const arr = sessionMap.get(rec.session_id) ?? [];
    arr.push(rec);
    sessionMap.set(rec.session_id, arr);
  });

  const sessions = Array.from(sessionMap.entries())
    .map(([sessionId, recs]) => ({ sessionId, recs }))
    .sort(
      (a, b) =>
        new Date(b.recs[0].created_at).getTime() - new Date(a.recs[0].created_at).getTime()
    );

  doc.setFontSize(16);
  doc.text(`Rapport d'inventaire - ${baseName}`, 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Année ${year} · ${sessions.length} inventaire(s) · Généré le ${dateStr}`, 14, 22);
  doc.setTextColor(0);

  let cursorY = 30;

  sessions.forEach(({ recs }, index) => {
    const first = recs[0];
    const discrepancies = recs.filter((r) => Number(r.difference) !== 0).length;
    const totalDiff = recs.reduce((sum, r) => sum + Number(r.difference), 0);

    if (index > 0) cursorY += 4;

    doc.setFontSize(11);
    doc.setTextColor(30, 64, 120);
    doc.text(
      `Inventaire du ${formatDateSafe(first.created_at)} · Réalisé par ${first.actor_name ?? '—'}`,
      14,
      cursorY
    );
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `${recs.length} article(s) · ${discrepancies} écart(s) · Écart total : ${totalDiff > 0 ? '+' : ''}${totalDiff}`,
      14,
      cursorY + 5
    );
    doc.setTextColor(0);

    const sorted = [...recs].sort((a, b) => (a.item_name || '').localeCompare(b.item_name || ''));

    autoTable(doc, {
      startY: cursorY + 8,
      head: [['Article', 'Référence', 'Théorique', 'Compté', 'Écart']],
      body: sorted.map((rec) => [
        rec.item_name || '-',
        rec.item_reference || '-',
        String(rec.theoretical_qty ?? 0),
        String(rec.counted_qty ?? 0),
        `${Number(rec.difference) > 0 ? '+' : ''}${rec.difference}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 120], textColor: 255 },
      alternateRowStyles: { fillColor: [243, 246, 250] },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Page ${data.pageNumber}/${pageCount}`,
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'right' }
        );
        doc.setTextColor(0);
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 6;
  });

  const fileName = `rapport_inventaire_${slugify(baseName)}_${year}_${dateStr}.pdf`;
  downloadPdfBlob(doc, fileName);

  return sessions.length;
}
