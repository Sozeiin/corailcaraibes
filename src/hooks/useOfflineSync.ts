import { useState, useEffect, useCallback } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { sqliteService } from '@/lib/database/sqlite';
import { offlineSyncManager } from '@/lib/offlineSync';
import { useToast } from '@/hooks/use-toast';
import { Preferences } from '@capacitor/preferences';

interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number | null;
  pendingChanges: number;
  error: string | null;
}

export const useOfflineSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    error: null
  });

  const { toast } = useToast();

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      const status = await Network.getStatus();
      setSyncStatus(prev => ({ ...prev, isOnline: status.connected }));
      return status.connected;
    } else {
      const online = navigator.onLine;
      setSyncStatus(prev => ({ ...prev, isOnline: online }));
      return online;
    }
  }, []);

  // Initialize offline database
  const initializeOfflineDb = useCallback(async () => {
    try {
      await sqliteService.initialize();
      console.log('Offline database initialized');
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        error: 'Impossible d\'initialiser la base de données hors ligne' 
      }));
    }
  }, []);

  // Sync data from Supabase to local SQLite
  const syncDownload = useCallback(async (table: 'boats' | 'interventions' | 'stock_items' | 'orders' | 'order_items') => {
    try {
      const lastSync = await sqliteService.getLastSyncTime(table);
      let query = supabase.from(table).select('*');
      
      if (lastSync) {
        query = query.gte('updated_at', lastSync.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (data && data.length > 0) {
        for (const record of data) {
          // Check if record exists locally
          const existing = await sqliteService.findById(table, record.id);
          
          if (existing) {
            // Update existing record (without triggering sync)
            await sqliteService.update(table, record.id, {
              ...record,
              sync_status: 'synced',
              last_modified: new Date().toISOString()
            });
          } else {
            // Insert new record
            await sqliteService.insert(table, {
              ...record,
              sync_status: 'synced'
            });
          }
        }
        
        await sqliteService.updateLastSyncTime(table);
        console.log(`Downloaded ${data.length} records for ${table}`);
      }
    } catch (error) {
      console.error(`Error syncing download for ${table}:`, error);
      throw error;
    }
  }, []);

  // Sync local changes to Supabase
  const syncUpload = useCallback(async () => {
    try {
      const pendingChanges = await sqliteService.getPendingChanges();
      let successCount = 0;
      let errorCount = 0;

      for (const change of pendingChanges) {
        try {
          const data = JSON.parse(change.data);
          const cleanData = { ...data };
          delete cleanData.sync_status;
          delete cleanData.last_modified;

          switch (change.operation) {
            case 'INSERT':
              const { error: insertError } = await supabase
                .from(change.table_name as any)
                .insert(cleanData);
              
              if (insertError) throw insertError;
              break;

            case 'UPDATE':
              const { error: updateError } = await supabase
                .from(change.table_name as any)
                .update(cleanData)
                .eq('id', change.record_id);
              
              if (updateError) throw updateError;
              break;

            case 'DELETE':
              const { error: deleteError } = await supabase
                .from(change.table_name as any)
                .delete()
                .eq('id', change.record_id);
              
              if (deleteError) throw deleteError;
              break;
          }

          await sqliteService.clearPendingChange(change.id);
          successCount++;
        } catch (error) {
          console.error(`Error syncing change ${change.id}:`, error);
          await sqliteService.markSyncError(change.id, error.message);
          errorCount++;
        }
      }

      console.log(`Sync upload completed: ${successCount} success, ${errorCount} errors`);
      return { successCount, errorCount };
    } catch (error) {
      console.error('Error during sync upload:', error);
      throw error;
    }
  }, []);

  // Full synchronization
  const performFullSync = useCallback(async () => {
    if (!syncStatus.isOnline) {
      console.log('Cannot sync: offline');
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // First, upload pending changes
      await syncUpload();

      // Then, download updates for each table
      const tables: ('boats' | 'interventions' | 'stock_items' | 'orders' | 'order_items')[] = ['boats', 'interventions', 'stock_items', 'orders', 'order_items'];
      
      for (const table of tables) {
        await syncDownload(table);
      }

      // Update sync status
      const pendingChanges = await sqliteService.getPendingChanges();
      
      setSyncStatus(prev => ({
        ...prev,
        lastSync: Date.now(),
        pendingChanges: pendingChanges.length,
        error: null
      }));

      // Save last sync time in preferences
      await Preferences.set({
        key: 'lastSyncTime',
        value: new Date().toISOString()
      });

      toast({
        title: "Synchronisation terminée",
        description: "Toutes les données ont été synchronisées avec succès."
      });
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => ({
        ...prev,
        error: error.message || 'Erreur de synchronisation'
      }));

      toast({
        variant: "destructive",
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser les données. Vérifiez votre connexion."
      });
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [syncStatus.isOnline, syncUpload, syncDownload, toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    let networkListener: any;

    const setupNetworkListener = async () => {
      await checkNetworkStatus();

      if (Capacitor.isNativePlatform()) {
        networkListener = await Network.addListener('networkStatusChange', async (status) => {
          setSyncStatus(prev => ({ ...prev, isOnline: status.connected }));
          
          if (status.connected && !syncStatus.isSyncing) {
            console.log('Back online, starting auto-sync...');
            await performFullSync();
          }
        });
      } else {
        const handleOnline = () => {
          setSyncStatus(prev => ({ ...prev, isOnline: true }));
          if (!syncStatus.isSyncing) {
            performFullSync();
          }
        };

        const handleOffline = () => {
          setSyncStatus(prev => ({ ...prev, isOnline: false }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    };

    setupNetworkListener();

    return () => {
      if (networkListener) {
        networkListener.remove();
      }
    };
  }, [checkNetworkStatus, performFullSync, syncStatus.isSyncing]);

  // Initialize offline database on mount
  useEffect(() => {
    initializeOfflineDb();
  }, [initializeOfflineDb]);

  // Load initial sync status
  useEffect(() => {
    const loadInitialStatus = async () => {
      try {
        const { value: lastSyncTime } = await Preferences.get({ key: 'lastSyncTime' });
        const pendingChanges = await sqliteService.getPendingChanges();
        
        setSyncStatus(prev => ({
          ...prev,
          lastSync: lastSyncTime ? new Date(lastSyncTime).getTime() : null,
          pendingChanges: pendingChanges.length
        }));
      } catch (error) {
        console.error('Error loading initial sync status:', error);
      }
    };

    loadInitialStatus();
  }, []);

  // Auto-sync périodique toutes les 2 minutes quand en ligne
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncStatus.isOnline && !syncStatus.isSyncing) {
        console.log('🔄 Auto-sync périodique...');
        performFullSync();
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [syncStatus.isOnline, syncStatus.isSyncing, performFullSync]);

  return {
    syncStatus,
    performSync: performFullSync,
    checkNetworkStatus
  };
};