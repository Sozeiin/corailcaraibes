
import { supabase } from '@/integrations/supabase/client';

export interface GlobalStockItem {
  id: string;
  name: string;
  reference?: string;
  category?: string;
  quantity: number;
  minThreshold: number;
  unit?: string;
  location?: string;
  baseId: string;
  baseName: string;
  lastUpdated: string;
  lastPurchaseDate?: string;
  lastPurchaseCost?: number;
  lastSupplierId?: string;
}

/**
 * Search for stock items across all bases globally
 */
export async function searchGlobalStockItems(searchCode: string): Promise<GlobalStockItem | null> {
  try {
    const trimmedCode = searchCode.trim();
    
    // Build the query to search across all bases
    let query = supabase
      .from('stock_items')
      .select(`
        id,
        name,
        reference,
        category,
        quantity,
        min_threshold,
        unit,
        location,
        base_id,
        last_updated,
        last_purchase_date,
        last_purchase_cost,
        last_supplier_id,
        bases!inner(name)
      `);

    // Search by exact reference match first (case insensitive)
    const { data: exactMatch, error: exactError } = await query
      .ilike('reference', trimmedCode)
      .limit(1)
      .maybeSingle();

    if (exactMatch && !exactError) {
      return transformToGlobalStockItem(exactMatch);
    }

    // Search by partial reference match
    if (trimmedCode.length >= 3) {
      const { data: partialRefMatch, error: partialError } = await query
        .ilike('reference', `%${trimmedCode}%`)
        .limit(1)
        .maybeSingle();

      if (partialRefMatch && !partialError) {
        return transformToGlobalStockItem(partialRefMatch);
      }
    }

    // Search by name containing the code
    if (trimmedCode.length >= 3) {
      const { data: nameMatch, error: nameError } = await query
        .ilike('name', `%${trimmedCode}%`)
        .limit(1)
        .maybeSingle();

      if (nameMatch && !nameError) {
        return transformToGlobalStockItem(nameMatch);
      }
    }

    return null;
  } catch (error) {
    console.error('Error searching global stock:', error);
    return null;
  }
}

/**
 * Create a local copy of a stock item from another base
 */
export async function createLocalStockCopy(
  sourceItem: GlobalStockItem,
  targetBaseId: string,
  initialQuantity: number = 1,
  location?: string
): Promise<{ success: boolean; itemId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('stock_items')
      .insert({
        name: sourceItem.name,
        reference: sourceItem.reference || null,
        category: sourceItem.category || 'Autre',
        quantity: initialQuantity,
        min_threshold: sourceItem.minThreshold || 1,
        unit: sourceItem.unit || 'pièce',
        location: location || `Importé de ${sourceItem.baseName}`,
        base_id: targetBaseId,
        last_updated: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating local stock copy:', error);
      return { success: false, error: error.message };
    }

    return { success: true, itemId: data.id };
  } catch (error) {
    console.error('Error creating local stock copy:', error);
    return { success: false, error: 'Erreur lors de la création de la copie locale' };
  }
}

/**
 * Transform database result to GlobalStockItem interface
 */
function transformToGlobalStockItem(item: any): GlobalStockItem {
  return {
    id: item.id,
    name: item.name,
    reference: item.reference || '',
    category: item.category || '',
    quantity: item.quantity || 0,
    minThreshold: item.min_threshold || 0,
    unit: item.unit || '',
    location: item.location || '',
    baseId: item.base_id || '',
    baseName: item.bases?.name || '',
    lastUpdated: item.last_updated || new Date().toISOString(),
    lastPurchaseDate: item.last_purchase_date,
    lastPurchaseCost: item.last_purchase_cost,
    lastSupplierId: item.last_supplier_id
  };
}
