import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sqliteService } from '@/lib/database/sqlite';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';

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
  const [hasValidData, setHasValidData] = useState(false);
  const { syncStatus } = useOfflineSync();

  const getIsOnline = useCallback(async () => {
    let networkOnline = true;
    try {
      const status = await Network.getStatus();
      networkOnline = status.connected;
    } catch (error) {
      if (typeof navigator !== 'undefined') {
        networkOnline = navigator.onLine;
      }
    }

    let offlineMode = false;
    try {
      const pref = await Preferences.get({ key: 'offlineMode' });
      offlineMode = pref.value === 'true';
    } catch (error) {
      console.warn('[useOfflineData] Error reading offlineMode preference:', error);
    }

    return (syncStatus?.isOnline ?? true) && networkOnline && !offlineMode;
  }, [syncStatus?.isOnline]);

  const fetchData = useCallback(async () => {
    const isOnline = await getIsOnline();
    console.log(`[useOfflineData] Starting fetch for table: ${table}, online: ${isOnline}, baseId: ${baseId}`);
    
    // Protection: Ne pas fetch si baseId est requis mais non défini
    if (baseId === undefined && table !== 'bases') {
      console.warn(`[useOfflineData] ⚠️ baseId is undefined for ${table}, waiting for user profile...`);
      // Ne pas vider les données existantes, juste attendre
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      let fetchedData: T[] = [];

      if (isOnline) {
        console.log(`[useOfflineData] Fetching from Supabase for table: ${table}`);
        // En ligne : récupérer de Supabase et synchroniser avec SQLite
        const queryBuilder = (supabase as any).from(table).select('*');
        
        let finalQuery;
        if (baseId) {
          finalQuery = queryBuilder.eq('base_id', baseId);
          console.log(`[useOfflineData] Filtering by base_id: ${baseId}`);
        } else {
          finalQuery = queryBuilder;
          console.log(`[useOfflineData] No base filter applied - fetching all data`);
        }
        
        const { data: onlineData, error: supabaseError } = await finalQuery;
        
        if (supabaseError) {
          console.error(`[useOfflineData] Supabase error for ${table}:`, supabaseError);
          throw supabaseError;
        }
        
        fetchedData = (onlineData as any) || [];
        console.log(`[useOfflineData] ✅ Fetched ${fetchedData.length} records from Supabase for ${table}`);
        
        // Synchroniser avec SQLite en arrière-plan (non bloquant)
        Promise.resolve().then(async () => {
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
            console.log(`[useOfflineData] SQLite sync completed for ${table}`);
          } catch (syncError) {
            console.warn(`[useOfflineData] SQLite sync error for ${table}:`, syncError);
          }
        });
      } else {
        console.log(`[useOfflineData] Fetching from SQLite for table: ${table} (offline mode)`);
        // Hors ligne : récupérer de SQLite uniquement
        await sqliteService.initialize();
        const localData = await sqliteService.findAll(table, baseId);
        fetchedData = localData as T[];
        console.log(`[useOfflineData] Fetched ${fetchedData.length} records from SQLite for ${table}`);
      }
      
      // Protection: Ne pas remplacer des données valides par un tableau vide
      if (fetchedData.length === 0 && hasValidData && data.length > 0) {
        console.warn(`[useOfflineData] ⚠️ Refusing to clear ${data.length} ${table} records with empty response`);
        // Garder les données existantes
      } else {
        setData(fetchedData);
        if (fetchedData.length > 0) {
          setHasValidData(true);
        }
      }
      console.log(`[useOfflineData] ✅ Data set successfully for ${table}: ${fetchedData.length} records`);
    } catch (err) {
      console.error(`[useOfflineData] ❌ Error fetching ${table}:`, err);
      
      // En cas d'erreur, ne PAS vider les données existantes
      if (hasValidData && data.length > 0) {
        console.warn(`[useOfflineData] Keeping ${data.length} cached ${table} records after error`);
        setError('Données affichées depuis le cache (erreur de connexion)');
      } else if (isOnline) {
        // Essayer de récupérer depuis SQLite
        console.log(`[useOfflineData] Trying fallback to SQLite for ${table}`);
        try {
          await sqliteService.initialize();
          const localData = await sqliteService.findAll(table, baseId);
          setData(localData as T[]);
          if (localData.length > 0) {
            setHasValidData(true);
          }
          setError('Données récupérées depuis le cache local');
          console.log(`[useOfflineData] Fallback successful for ${table}: ${localData.length} records`);
        } catch (localErr) {
          console.error(`[useOfflineData] Fallback failed for ${table}:`, localErr);
          setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données hors ligne');
      }
    } finally {
      setLoading(false);
      console.log(`[useOfflineData] Fetch completed for ${table}`);
    }
    }, [table, baseId, getIsOnline, ...dependencies]);

    const create = useCallback(async (item: Omit<T, 'id'>): Promise<string> => {
      const isOnline = await getIsOnline();
      const newItem = {
        ...item,
        base_id: baseId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any;

    try {
      let insertedData: any;
      
        if (isOnline) {
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
    }, [table, baseId, getIsOnline]);

    const update = useCallback(async (id: string, item: Partial<T>): Promise<void> => {
      const isOnline = await getIsOnline();
      const updateData = { ...item, updated_at: new Date().toISOString() } as any;

    try {
        if (isOnline) {
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
    }, [table, getIsOnline]);

    const remove = useCallback(async (id: string): Promise<void> => {
      const isOnline = await getIsOnline();
      
      try {
        console.log(`[useOfflineData] Attempting to delete ${table} with id:`, id);

        if (isOnline) {
          // Vérifier d'abord que l'utilisateur est authentifié
          const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
          if (authError || !currentUser) {
            throw new Error('Utilisateur non authentifié. Veuillez vous reconnecter.');
          }

          console.log(`[useOfflineData] User authenticated, proceeding with delete`);

          let error: any = null;
          let deletedData: any = null;

          if (table === 'boats') {
            const { data: rpcData, error: rpcError } = await (supabase as any)
              .rpc('delete_boat_cascade', { p_boat_id: id });
            error = rpcError;
            deletedData = rpcData;
          } else {
            const { error: deleteError, data: supabaseData } = await (supabase as any)
              .from(table)
              .delete()
              .eq('id', id);
            error = deleteError;
            deletedData = supabaseData;
          }

          console.log(`[useOfflineData] Delete result:`, { error, deletedData });

          if (error) {
            console.error(`[useOfflineData] Supabase delete error:`, error);
            
            // Gestion spécifique des erreurs RLS
            if (error.code === 'PGRST116' || error.message?.includes('row-level security')) {
              throw new Error('Vous n\'avez pas les permissions pour supprimer cet article.');
            } else if (error.code === '42501' || error.message?.includes('permission denied')) {
              throw new Error('Accès refusé. Vérifiez vos permissions.');
            } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
              throw new Error('Session expirée. Veuillez vous reconnecter.');
            } else if (error.code === 'P0002') {
              throw new Error('Le bateau est introuvable ou a déjà été supprimé.');
            }

            throw new Error(`Erreur lors de la suppression: ${error.message}`);
          }
          
          console.log(`[useOfflineData] Successfully deleted from Supabase`);
          
          // Synchroniser avec SQLite
          try {
            await sqliteService.initialize();
            await sqliteService.delete(table, id);
            console.log(`[useOfflineData] Successfully deleted from SQLite`);
          } catch (syncError) {
            console.warn(`[useOfflineData] SQLite sync error:`, syncError);
          }
        } else {
          // Hors ligne : supprimer de SQLite avec marquage pour sync ultérieure
          console.log(`[useOfflineData] Offline mode: marking for deletion in SQLite`);
          await sqliteService.initialize();
          await sqliteService.delete(table, id);
        }
        
        // Mettre à jour l'état local seulement si la suppression a réussi
        setData(prev => prev.filter(record => record.id !== id));
        console.log(`[useOfflineData] Successfully removed item from local state`);
        
      } catch (error) {
        console.error(`[useOfflineData] Error deleting item:`, error);
        
        // Re-lancer l'erreur avec un message plus explicite
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error('Erreur inconnue lors de la suppression de l\'article');
        }
      }
    }, [table, getIsOnline]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, create, update, remove };
}