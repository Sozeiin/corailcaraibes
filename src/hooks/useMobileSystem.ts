import { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { backgroundSyncService } from '@/services/backgroundSync';
import { sqliteService } from '@/lib/database/sqlite';
import { offlineSyncManager } from '@/lib/offlineSync';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { toast } from '@/hooks/use-toast';

interface MobileSystemStatus {
  isOnline: boolean;
  isOfflineReady: boolean;
  hasPendingChanges: boolean;
  hasConflicts: boolean;
  backgroundSyncEnabled: boolean;
  systemHealth: 'excellent' | 'good' | 'poor' | 'critical';
  lastFullSync: Date | null;
  estimatedDataSize: string;
  syncProgress: number;
}

interface MobileSystemActions {
  initializeSystem: () => Promise<void>;
  performFullSync: () => Promise<void>;
  toggleBackgroundSync: (enabled: boolean) => Promise<void>;
  resolveAllConflicts: () => Promise<void>;
  clearOfflineData: () => Promise<void>;
  optimizeDatabase: () => Promise<void>;
  exportDiagnostics: () => Promise<any>;
}

export const useMobileSystem = () => {
  const { syncStatus, performSync } = useOfflineSync();
  const { conflicts, resolveConflict, hasConflicts } = useConflictResolution();
  const { isNative } = useMobileCapacitor();
  
  const [status, setStatus] = useState<MobileSystemStatus>({
    isOnline: navigator.onLine,
    isOfflineReady: false,
    hasPendingChanges: false,
    hasConflicts: false,
    backgroundSyncEnabled: false,
    systemHealth: 'good',
    lastFullSync: null,
    estimatedDataSize: '0 MB',
    syncProgress: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize the mobile system
  const initializeSystem = async () => {
    if (isInitializing || isInitialized) return;
    
    setIsInitializing(true);
    try {
      // Initialize SQLite database
      await sqliteService.initialize();
      
      // Initialize background sync service if on native
      if (isNative) {
        await backgroundSyncService.initialize();
      }
      
      // Set up network listeners
      if (Capacitor.isNativePlatform()) {
        Network.addListener('networkStatusChange', (status) => {
          setStatus(prev => ({ ...prev, isOnline: status.connected }));
          if (status.connected) {
            // Auto-sync when coming back online
            performFullSync();
          }
        });
      }
      
      setIsInitialized(true);
      toast({
        title: "Système mobile initialisé",
        description: "Toutes les fonctionnalités hors ligne sont prêtes",
      });
    } catch (error) {
      console.error('Failed to initialize mobile system:', error);
      toast({
        title: "Erreur d'initialisation",
        description: "Impossible d'initialiser le système mobile",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Perform full sync with progress tracking
  const performFullSync = async () => {
    try {
      setStatus(prev => ({ ...prev, syncProgress: 0 }));
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setStatus(prev => ({ 
          ...prev, 
          syncProgress: Math.min(prev.syncProgress + 10, 90) 
        }));
      }, 200);

      await performSync();
      
      clearInterval(progressInterval);
      setStatus(prev => ({ 
        ...prev, 
        syncProgress: 100,
        lastFullSync: new Date()
      }));
      
      // Reset progress after a delay
      setTimeout(() => {
        setStatus(prev => ({ ...prev, syncProgress: 0 }));
      }, 2000);
      
    } catch (error) {
      console.error('Full sync failed:', error);
      setStatus(prev => ({ ...prev, syncProgress: 0 }));
    }
  };

  // Toggle background sync
  const toggleBackgroundSync = async (enabled: boolean) => {
    if (!isNative) return;
    
    try {
      if (enabled) {
        await backgroundSyncService.enableBackgroundSync();
      } else {
        await backgroundSyncService.disableBackgroundSync();
      }
      
      setStatus(prev => ({ ...prev, backgroundSyncEnabled: enabled }));
      
      toast({
        title: enabled ? "Sync arrière-plan activée" : "Sync arrière-plan désactivée",
        description: enabled 
          ? "La synchronisation automatique est maintenant active"
          : "La synchronisation automatique est désactivée",
      });
    } catch (error) {
      console.error('Failed to toggle background sync:', error);
    }
  };

  // Resolve all conflicts automatically
  const resolveAllConflicts = async () => {
    try {
      for (const conflict of conflicts) {
        // Default strategy: use remote data for safety
        await resolveConflict(conflict.id, 'use_remote');
      }
      
      toast({
        title: "Conflits résolus",
        description: `${conflicts.length} conflit(s) résolu(s) automatiquement`,
      });
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      toast({
        title: "Erreur de résolution",
        description: "Impossible de résoudre tous les conflits",
        variant: "destructive",
      });
    }
  };

  // Clear all offline data
  const clearOfflineData = async () => {
    try {
      const db = await sqliteService.getDatabase();
      
      // Clear all offline tables
      const tables = [
        'offline_stock_items',
        'offline_suppliers',
        'offline_boat_components',
        'offline_maintenance_tasks',
        'pending_changes',
        'sync_conflicts'
      ];
      
      for (const table of tables) {
        await db.execute(`DELETE FROM ${table}`);
      }
      
      toast({
        title: "Données effacées",
        description: "Toutes les données hors ligne ont été supprimées",
      });
      
      // Refresh status
      await updateSystemStatus();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      toast({
        title: "Erreur de suppression",
        description: "Impossible d'effacer les données hors ligne",
        variant: "destructive",
      });
    }
  };

  // Optimize database
  const optimizeDatabase = async () => {
    try {
      await sqliteService.optimizeDatabase();
      
      toast({
        title: "Base de données optimisée",
        description: "Les performances ont été améliorées",
      });
      
      await updateSystemStatus();
    } catch (error) {
      console.error('Failed to optimize database:', error);
      toast({
        title: "Erreur d'optimisation",
        description: "Impossible d'optimiser la base de données",
        variant: "destructive",
      });
    }
  };

  // Export system diagnostics
  const exportDiagnostics = async () => {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        platform: Capacitor.getPlatform(),
        isNative,
        status,
        syncStatus,
        conflicts: conflicts.length,
        networkStatus: await (Capacitor.isNativePlatform() ? Network.getStatus() : { connected: navigator.onLine }),
        databaseStats: await getDatabaseStats(),
        systemInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          } : null
        }
      };
      
      return diagnostics;
    } catch (error) {
      console.error('Failed to export diagnostics:', error);
      return null;
    }
  };

  // Update system status
  const updateSystemStatus = async () => {
    try {
      const databaseStats = await getDatabaseStats();
      const networkStatus = Capacitor.isNativePlatform() ? 
        await Network.getStatus() : 
        { connected: navigator.onLine };
      
      const systemHealth = calculateSystemHealth();
      
      setStatus(prev => ({
        ...prev,
        isOnline: networkStatus.connected,
        isOfflineReady: isInitialized,
        hasPendingChanges: syncStatus.pendingChanges > 0,
        hasConflicts: hasConflicts,
        backgroundSyncEnabled: backgroundSyncService.isEnabled(),
        systemHealth,
        estimatedDataSize: databaseStats.estimatedSize,
        lastFullSync: syncStatus.lastSync ? new Date(syncStatus.lastSync) : null
      }));
    } catch (error) {
      console.error('Failed to update system status:', error);
    }
  };

  // Calculate system health
  const calculateSystemHealth = (): MobileSystemStatus['systemHealth'] => {
    if (!isInitialized) return 'poor';
    if (hasConflicts && syncStatus.pendingChanges > 50) return 'critical';
    if (syncStatus.pendingChanges > 20 || syncStatus.error) return 'poor';
    if (syncStatus.pendingChanges > 5) return 'good';
    return 'excellent';
  };

  // Get database statistics
  const getDatabaseStats = async () => {
    try {
      const db = await sqliteService.getDatabase();
      
      // Count total records
      const tables = ['offline_stock_items', 'offline_suppliers', 'offline_boat_components', 'offline_maintenance_tasks'];
      let totalRecords = 0;
      
      for (const table of tables) {
        try {
          const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
          totalRecords += result.values?.[0]?.count || 0;
        } catch {
          // Table might not exist yet
        }
      }
      
      // Estimate size (rough calculation)
      const estimatedSize = `${Math.round(totalRecords * 0.5)} KB`;
      
      return {
        totalRecords,
        estimatedSize,
        pendingChanges: syncStatus.pendingChanges,
        conflicts: conflicts.length
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {
        totalRecords: 0,
        estimatedSize: '0 KB',
        pendingChanges: 0,
        conflicts: 0
      };
    }
  };

  // Update status when dependencies change
  useEffect(() => {
    updateSystemStatus();
  }, [syncStatus, hasConflicts, isInitialized]);

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized && !isInitializing) {
      initializeSystem();
    }
  }, []);

  const actions: MobileSystemActions = {
    initializeSystem,
    performFullSync,
    toggleBackgroundSync,
    resolveAllConflicts,
    clearOfflineData,
    optimizeDatabase,
    exportDiagnostics
  };

  return {
    status,
    actions,
    isInitialized,
    isInitializing
  };
};