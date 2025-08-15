import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sqliteService } from '@/lib/database/sqlite';
import { useOfflineSync } from '@/hooks/useOfflineSync';

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
  
  const { syncStatus } = useOfflineSync();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (syncStatus.isOnline) {
        // Online: fetch from Supabase with dynamic query building
        const queryBuilder = (supabase as any).from(table).select('*');
        
        let finalQuery;
        if (baseId) {
          finalQuery = queryBuilder.eq('base_id', baseId);
        } else {
          finalQuery = queryBuilder;
        }
        
        const { data: onlineData, error: supabaseError } = await finalQuery;
        
        if (supabaseError) throw supabaseError;
        
        // Update local database with fresh data
        if (onlineData && Array.isArray(onlineData)) {
          for (const item of onlineData) {
            if (item && typeof item === 'object' && 'id' in item) {
              const existing = await sqliteService.findById(table, item.id as string);
              if (existing) {
                await sqliteService.update(table, item.id as string, { ...item, sync_status: 'synced' });
              } else {
                await sqliteService.insert(table, { ...item, sync_status: 'synced' });
              }
            }
          }
        }
        
        setData((onlineData as any) || []);
      } else {
        // Offline: fetch from SQLite
        const offlineData = await sqliteService.findAll(table, baseId);
        setData(offlineData as T[]);
      }
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
      
      // Fallback to offline data on error
      try {
        const offlineData = await sqliteService.findAll(table, baseId);
        setData(offlineData as T[]);
      } catch (offlineErr) {
        console.error('Error fetching offline data:', offlineErr);
      }
    } finally {
      setLoading(false);
    }
  }, [table, baseId, syncStatus.isOnline, ...dependencies]);

  const create = useCallback(async (item: Omit<T, 'id'>): Promise<string> => {
    const newItem = {
      ...item,
      base_id: baseId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any;

    let id: string;

    if (syncStatus.isOnline) {
      try {
        const { data: insertedData, error } = await (supabase as any)
          .from(table)
          .insert(newItem)
          .select()
          .single();
        
        if (error) throw error;
        
        if (insertedData && typeof insertedData === 'object' && 'id' in insertedData) {
          await sqliteService.insert(table, { ...insertedData, sync_status: 'synced' });
          setData(prev => [insertedData as T, ...prev]);
          return insertedData.id as string;
        }
      } catch (error) {
        console.error('Error creating online, falling back to offline:', error);
      }
    }
    
    // Offline: save to SQLite only
    id = await sqliteService.insert(table, newItem);
    const newRecord = { ...newItem, id } as T;
    setData(prev => [newRecord, ...prev]);
    
    return id;
  }, [table, baseId, syncStatus.isOnline]);

  const update = useCallback(async (id: string, item: Partial<T>): Promise<void> => {
    const updateData = { ...item, updated_at: new Date().toISOString() } as any;

    if (syncStatus.isOnline) {
      try {
        const { error } = await (supabase as any)
          .from(table)
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
        await sqliteService.update(table, id, { ...updateData, sync_status: 'synced' });
      } catch (error) {
        console.error('Error updating online, falling back to offline:', error);
        await sqliteService.update(table, id, updateData);
      }
    } else {
      await sqliteService.update(table, id, updateData);
    }
    
    setData(prev => prev.map(record => 
      record.id === id ? { ...record, ...updateData } : record
    ));
  }, [table, syncStatus.isOnline]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (syncStatus.isOnline) {
      try {
        const { error } = await (supabase as any).from(table).delete().eq('id', id);
        if (error) throw error;
        await sqliteService.delete(table, id);
      } catch (error) {
        console.error('Error deleting online, falling back to offline:', error);
        await sqliteService.delete(table, id);
      }
    } else {
      await sqliteService.delete(table, id);
    }
    
    setData(prev => prev.filter(record => record.id !== id));
  }, [table, syncStatus.isOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create, update, remove };
}