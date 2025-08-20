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
      let fetchedData: T[] = [];
      
      if (syncStatus.isOnline) {
        // En ligne : récupérer de Supabase et synchroniser avec SQLite
        const queryBuilder = (supabase as any).from(table).select('*');
        
        let finalQuery;
        if (baseId) {
          finalQuery = queryBuilder.eq('base_id', baseId);
        } else {
          finalQuery = queryBuilder;
        }
        
        const { data: onlineData, error: supabaseError } = await finalQuery;
        
        if (supabaseError) throw supabaseError;
        
        fetchedData = (onlineData as any) || [];
        
        // Synchroniser avec SQLite en arrière-plan
        try {
          await sqliteService.initialize();
          for (const record of fetchedData) {
            const existing = await sqliteService.findById(table, record.id);
            if (existing) {
              await sqliteService.update(table, record.id, {
                ...record,
                sync_status: 'synced'
              });
            } else {
              await sqliteService.insert(table, {
                ...record,
                sync_status: 'synced'
              });
            }
          }
        } catch (syncError) {
          console.warn('Erreur lors de la synchronisation avec SQLite:', syncError);
        }
      } else {
        // Hors ligne : récupérer de SQLite uniquement
        await sqliteService.initialize();
        const localData = await sqliteService.findAll(table, baseId);
        fetchedData = localData as T[];
      }
      
      setData(fetchedData);
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      
      // En cas d'erreur en ligne, essayer de récupérer depuis SQLite
      if (syncStatus.isOnline) {
        try {
          await sqliteService.initialize();
          const localData = await sqliteService.findAll(table, baseId);
          setData(localData as T[]);
          setError('Données récupérées depuis le cache local');
        } catch (localErr) {
          setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données hors ligne');
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

    try {
      let insertedData: any;
      
      if (syncStatus.isOnline) {
        // En ligne : créer dans Supabase
        const { data, error } = await (supabase as any)
          .from(table)
          .insert(newItem)
          .select()
          .single();
        
        if (error) throw error;
        insertedData = data;
        
        // Synchroniser avec SQLite
        try {
          await sqliteService.initialize();
          await sqliteService.insert(table, {
            ...insertedData,
            sync_status: 'synced'
          });
        } catch (syncError) {
          console.warn('Erreur lors de la synchronisation avec SQLite:', syncError);
        }
      } else {
        // Hors ligne : créer dans SQLite avec ID généré
        await sqliteService.initialize();
        const id = await sqliteService.insert(table, newItem);
        insertedData = { ...newItem, id };
      }
      
      if (insertedData && typeof insertedData === 'object' && 'id' in insertedData) {
        setData(prev => [insertedData as T, ...prev]);
        return insertedData.id as string;
      }
      
      throw new Error('No data returned from insert');
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }, [table, baseId, syncStatus.isOnline]);

  const update = useCallback(async (id: string, item: Partial<T>): Promise<void> => {
    const updateData = { ...item, updated_at: new Date().toISOString() } as any;

    try {
      if (syncStatus.isOnline) {
        // En ligne : mettre à jour dans Supabase
        const { error } = await (supabase as any)
          .from(table)
          .update(updateData)
          .eq('id', id);
        
        if (error) throw error;
        
        // Synchroniser avec SQLite
        try {
          await sqliteService.initialize();
          await sqliteService.update(table, id, {
            ...updateData,
            sync_status: 'synced'
          });
        } catch (syncError) {
          console.warn('Erreur lors de la synchronisation avec SQLite:', syncError);
        }
      } else {
        // Hors ligne : mettre à jour dans SQLite
        await sqliteService.initialize();
        await sqliteService.update(table, id, updateData);
      }
      
      setData(prev => prev.map(record => 
        record.id === id ? { ...record, ...updateData } : record
      ));
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }, [table, syncStatus.isOnline]);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      console.log(`Attempting to delete ${table} with id:`, id);
      
      if (syncStatus.isOnline) {
        // En ligne : supprimer de Supabase
        const { error, data: deletedData } = await (supabase as any)
          .from(table)
          .delete()
          .eq('id', id);
        
        console.log('Delete result:', { error, deletedData });
        
        if (error) {
          console.error('Supabase delete error:', error);
          throw error;
        }
        
        // Synchroniser avec SQLite
        try {
          await sqliteService.initialize();
          await sqliteService.delete(table, id);
        } catch (syncError) {
          console.warn('Erreur lors de la synchronisation avec SQLite:', syncError);
        }
      } else {
        // Hors ligne : supprimer de SQLite
        await sqliteService.initialize();
        await sqliteService.delete(table, id);
      }
      
      setData(prev => prev.filter(record => record.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }, [table, syncStatus.isOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create, update, remove };
}