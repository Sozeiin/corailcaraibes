import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { getLocalDateString } from '@/lib/dateUtils';

interface ExportOptions {
  baseId?: string; // undefined / 'all' => toutes les bases
  category?: string; // undefined / 'all' => toutes
  searchTerm?: string;
  onlyLowStock?: boolean;
}

const HEADERS = [
  'Nom',
  'Référence',
  'Réf. fournisseur',
  'Marque',
  'Catégorie',
  'Quantité',
  'Unité',
  'Seuil min',
  'Emplacement',
  'Base',
  'Prix unitaire (€)',
  'Valeur totale (€)',
  'Dernier achat',
  'Dernier coût (€)',
  'Statut',
];

function sanitizeSheetName(name: string): string {
  return (name || 'Base').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Base';
}

export async function exportInventoryToExcel(options: ExportOptions = {}) {
  const { baseId, category, searchTerm, onlyLowStock } = options;

  const { data: bases, error: basesError } = await supabase.from('bases').select('id, name');
  if (basesError) throw basesError;
  const baseNames = new Map((bases || []).map((b: any) => [b.id, b.name]));

  let query = supabase
    .from('stock_items')
    .select('*')
    .order('name')
    .limit(10000);

  if (baseId && baseId !== 'all') query = query.eq('base_id', baseId);
  if (category && category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;

  let items = data || [];

  const term = (searchTerm || '').trim().toLowerCase();
  if (term) {
    items = items.filter((i: any) =>
      [i.name, i.reference, i.category, i.brand, i.supplier_reference]
        .some((v: any) => (v || '').toLowerCase().includes(term))
    );
  }
  if (onlyLowStock) {
    items = items.filter((i: any) => (i.quantity || 0) <= (i.min_threshold || 0));
  }

  if (items.length === 0) {
    throw new Error('Aucun article à exporter pour ces filtres');
  }

  const toRow = (i: any) => {
    const qty = i.quantity || 0;
    const price = i.unit_price != null ? Number(i.unit_price) : null;
    const status = qty === 0 ? 'Rupture' : qty <= (i.min_threshold || 0) ? 'Stock faible' : 'En stock';
    return {
      Nom: i.name || '',
      'Référence': i.reference || '',
      'Réf. fournisseur': i.supplier_reference || '',
      Marque: i.brand || '',
      'Catégorie': i.category || '',
      'Quantité': qty,
      'Unité': i.unit || '',
      'Seuil min': i.min_threshold || 0,
      Emplacement: i.location || '',
      Base: baseNames.get(i.base_id) || '',
      'Prix unitaire (€)': price ?? '',
      'Valeur totale (€)': price != null ? Number((price * qty).toFixed(2)) : '',
      'Dernier achat': i.last_purchase_date ? String(i.last_purchase_date).slice(0, 10) : '',
      'Dernier coût (€)': i.last_purchase_cost != null ? Number(i.last_purchase_cost) : '',
      Statut: status,
    };
  };

  const workbook = XLSX.utils.book_new();
  const colWidths = HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));

  const addSheet = (sheetName: string, rows: any[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
    (sheet as any)['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, sheet, sanitizeSheetName(sheetName));
  };

  let fileLabel: string;
  if (!baseId || baseId === 'all') {
    const groups = new Map<string, any[]>();
    items.forEach((i: any) => {
      const name = baseNames.get(i.base_id) || 'Sans base';
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(toRow(i));
    });
    Array.from(groups.keys()).sort().forEach((name) => addSheet(name, groups.get(name)!));
    fileLabel = 'toutes-bases';
  } else {
    const name = baseNames.get(baseId) || 'Base';
    addSheet(name, items.map(toRow));
    fileLabel = name.toLowerCase().replace(/\s+/g, '-');
  }

  const fileName = `inventaire-${fileLabel}-${getLocalDateString()}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  return { count: items.length, fileName };
}
