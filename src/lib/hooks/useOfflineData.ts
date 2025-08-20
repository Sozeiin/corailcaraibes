import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseOfflineDataOptions {
  table: string;
  baseId?: string;
  dependencies?: any[];
}

interface OfflineDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (item: Omit<T, 'id'>) => Promise<string>;
  update: (id: string, item: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useOfflineData<T extends { id: string; base_id?: string }>({
  table,
  baseId,
  dependencies = []
}: UseOfflineDataOptions): OfflineDataState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch from Supabase with dynamic query building
      const queryBuilder = (supabase as any).from(table).select('*');
      
      let finalQuery;
      if (baseId) {
        finalQuery = queryBuilder.eq('base_id', baseId);
      } else {
        finalQuery = queryBuilder;
      }
      
      const { data: onlineData, error: supabaseError } = await finalQuery;
      
      if (supabaseError) throw supabaseError;
      
      setData((onlineData as any) || []);
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [table, baseId, ...dependencies]);

  const create = useCallback(async (item: Omit<T, 'id'>): Promise<string> => {
    const newItem = {
      ...item,
      base_id: baseId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;

    try {
      const { data: insertedData, error } = await (supabase as any)
        .from(table)
        .insert(newItem)
        .select()
        .single();
      
      if (error) throw error;
      
      if (insertedData && typeof insertedData === 'object' && 'id' in insertedData) {
        setData(prev => [insertedData as T, ...prev]);
        return insertedData.id as string;
      }
      
      throw new Error('No data returned from insert');
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }, [table, baseId]);

  const update = useCallback(async (id: string, item: Partial<T>): Promise<void> => {
    const updateData = { ...item, updated_at: new Date().toISOString() } as any;

    try {
      const { error } = await (supabase as any)
        .from(table)
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      
      setData(prev => prev.map(record => 
        record.id === id ? { ...record, ...updateData } : record
      ));
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }, [table]);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      console.log(`Attempting to delete ${table} with id:`, id);
      const { error, data: deletedData } = await (supabase as any)
        .from(table)
        .delete()
        .eq('id', id);
      
      console.log('Delete result:', { error, deletedData });
      
      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }
      
      setData(prev => prev.filter(record => record.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }, [table]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create, update, remove };
}