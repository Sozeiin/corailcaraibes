import { supabase } from '@/integrations/supabase/client';
import { sqliteService } from '@/lib/database/sqlite';

export interface SyncOptions {
  tables?: string[];
  conflictResolution?: 'local_wins' | 'remote_wins' | 'manual';
  batchSize?: number;
}

export class OfflineSyncManager {
  private readonly defaultOptions: SyncOptions = {
    tables: ['boats', 'interventions', 'stock_items', 'orders', 'suppliers', 'boat_components'],
    conflictResolution: 'manual',
    batchSize: 50
  };

  async syncTableDown(tableName: string, baseId?: string): Promise<number> {
    let recordsProcessed = 0;
    
    try {
      // Get last sync time
      const lastSync = await sqliteService.getLastSyncTime(tableName);
      
      // Build query
      let query = (supabase as any).from(tableName).select('*');

      const baseFilteredTables = [
        'boats',
        'interventions',
        'stock_items',
        'orders',
        'suppliers',
        'boat_components'
      ];
      if (baseId && baseFilteredTables.includes(tableName)) {
        query = query.eq('base_id', baseId);
      }
      
      if (lastSync) {
        query = query.gt('updated_at', new Date(lastSync).toISOString());
      }
      
      const { data, error } = await query.order('updated_at', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        for (const record of data) {
          try {
            if (!record || typeof record !== 'object' || !('id' in record)) {
              continue;
            }
            
            // Check if record exists locally
            const existingRecord = await sqliteService.findById(tableName, record.id as string);
            
            if (existingRecord) {
              // Check for conflicts
              const localModified = new Date(existingRecord.updated_at || 0);
              const remoteModified = new Date((record as any).updated_at || 0);
              
              if (localModified > remoteModified && existingRecord.sync_status === 'pending') {
                // Conflict detected - store for manual resolution
                await sqliteService.createConflict(
                  tableName,
                  record.id as string,
                  existingRecord,
                  record,
                  'timestamp'
                );
                continue;
              }
              
              // Update existing record
              await sqliteService.update(tableName, record.id as string, {
                ...record,
                sync_status: 'synced'
              });
            } else {
              // Insert new record
              await sqliteService.insert(tableName, {
                ...record,
                sync_status: 'synced'
              });
            }
            
            recordsProcessed++;
          } catch (recordError) {
            console.error(`Error processing record ${(record as any).id}:`, recordError);
          }
        }
        
        // Update last sync time
        await sqliteService.updateLastSyncTime(tableName);
      }
    } catch (error) {
      console.error(`Error syncing ${tableName} down:`, error);
      throw error;
    }
    
    return recordsProcessed;
  }

  async syncTableUp(tableName: string): Promise<number> {
    let recordsProcessed = 0;
    
    try {
      // Get pending changes for this table
      const pendingChanges = await sqliteService.getPendingChanges();
      const tableChanges = pendingChanges.filter(change => 
        change.table_name === tableName
      );
      
      for (const change of tableChanges) {
        try {
          const data = JSON.parse(change.data);
          
          switch (change.operation) {
            case 'INSERT':
              const { error: insertError } = await (supabase as any)
                .from(tableName)
                .insert(data);
              
              if (insertError) throw insertError;
              break;
              
            case 'UPDATE':
              const { error: updateError } = await (supabase as any)
                .from(tableName)
                .update(data)
                .eq('id', change.record_id);
              
              if (updateError) throw updateError;
              break;
              
            case 'DELETE':
              const { error: deleteError } = await (supabase as any)
                .from(tableName)
                .delete()
                .eq('id', change.record_id);
              
              if (deleteError) throw deleteError;
              break;
          }
          
          // Remove from pending changes
          await sqliteService.clearPendingChange(change.id);
          
          // Update local record sync status
          if (change.operation !== 'DELETE') {
            await sqliteService.update(tableName, change.record_id, {
              sync_status: 'synced'
            });
          }
          
          recordsProcessed++;
        } catch (changeError) {
          console.error(`Error syncing change ${change.id}:`, changeError);
          
          // Mark error and increment retry count
          await sqliteService.markSyncError(
            change.id, 
            changeError instanceof Error ? changeError.message : 'Unknown error'
          );
        }
      }
    } catch (error) {
      console.error(`Error syncing ${tableName} up:`, error);
      throw error;
    }
    
    return recordsProcessed;
  }

  async performFullSync(baseId?: string, options: Partial<SyncOptions> = {}): Promise<{
    downloadCount: number;
    uploadCount: number;
    errors: string[];
  }> {
    const finalOptions = { ...this.defaultOptions, ...options };
    let totalDownloaded = 0;
    let totalUploaded = 0;
    const errors: string[] = [];
    
    try {
      // First, upload pending changes
      for (const table of finalOptions.tables!) {
        try {
          const uploaded = await this.syncTableUp(table);
          totalUploaded += uploaded;
        } catch (error) {
          const errorMsg = `Upload error for ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      // Then, download new data
      for (const table of finalOptions.tables!) {
        try {
          const downloaded = await this.syncTableDown(table, baseId);
          totalDownloaded += downloaded;
        } catch (error) {
          const errorMsg = `Download error for ${table}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      // Optimize database after sync
      await sqliteService.optimizeDatabase();
      
    } catch (error) {
      const errorMsg = `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }
    
    return {
      downloadCount: totalDownloaded,
      uploadCount: totalUploaded,
      errors
    };
  }

  async getOfflineStatistics(): Promise<{
    totalOfflineRecords: number;
    pendingChanges: number;
    unresolvedConflicts: number;
    lastSyncTimes: Record<string, Date | null>;
  }> {
    const stats = {
      totalOfflineRecords: 0,
      pendingChanges: 0,
      unresolvedConflicts: 0,
      lastSyncTimes: {} as Record<string, Date | null>
    };
    
    try {
      // Count offline records
      for (const table of this.defaultOptions.tables!) {
        const records = await sqliteService.findAll(table);
        stats.totalOfflineRecords += records.length;

        // Get last sync time
        stats.lastSyncTimes[table] = await sqliteService.getLastSyncTime(table);
      }
      
      // Count pending changes
      const pendingChanges = await sqliteService.getPendingChanges();
      stats.pendingChanges = pendingChanges.length;
      
      // Count unresolved conflicts
      const conflicts = await sqliteService.getConflicts();
      stats.unresolvedConflicts = conflicts.length;
      
    } catch (error) {
      console.error('Error getting offline statistics:', error);
    }
    
    return stats;
  }
}

export const offlineSyncManager = new OfflineSyncManager();
