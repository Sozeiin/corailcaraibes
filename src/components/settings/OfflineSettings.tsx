import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Upload, 
  AlertTriangle, 
  Trash2,
  Settings as SettingsIcon,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useConflictResolution } from '@/hooks/useConflictResolution';
import { ConflictResolutionDialog } from '@/components/ui/conflict-resolution-dialog';
import { offlineSyncManager } from '@/lib/offlineSync';
import { sqliteService } from '@/lib/database/sqlite';
import { useToast } from '@/hooks/use-toast';
import { Preferences } from '@capacitor/preferences';
import { MobileDataManager } from '@/components/mobile/MobileDataManager';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { backgroundSyncService } from '@/services/backgroundSync';

export function OfflineSettings() {
  const { syncStatus, performSync } = useOfflineSync();
  const { conflicts, resolveConflict, hasConflicts } = useConflictResolution();
  const { toast } = useToast();
  const { isNative } = useMobileCapacitor();
  
  const [stats, setStats] = useState({
    totalOfflineRecords: 0,
    pendingChanges: 0,
    unresolvedConflicts: 0,
    lastSyncTimes: {} as Record<string, Date | null>
  });
  
  const [autoSync, setAutoSync] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(backgroundSyncService.isEnabled());

  useEffect(() => {
    loadStats();
    loadSettings();
  }, []);

  const loadStats = async () => {
    try {
      const statistics = await offlineSyncManager.getOfflineStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading offline stats:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const autoSyncPref = await Preferences.get({ key: 'autoSync' });
      const offlineModePref = await Preferences.get({ key: 'offlineMode' });
      
      setAutoSync(autoSyncPref.value === 'true');
      setOfflineMode(offlineModePref.value === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setAutoSync(enabled);
    await Preferences.set({ key: 'autoSync', value: enabled.toString() });
    
    toast({
      title: enabled ? "Synchronisation automatique activée" : "Synchronisation automatique désactivée",
      description: enabled 
        ? "Les données seront synchronisées automatiquement lorsque la connexion est disponible"
        : "La synchronisation sera désormais manuelle"
    });
  };

  const handleOfflineModeToggle = async (enabled: boolean) => {
    setOfflineMode(enabled);
    await Preferences.set({ key: 'offlineMode', value: enabled.toString() });
    
    toast({
      title: enabled ? "Mode hors ligne activé" : "Mode hors ligne désactivé",
      description: enabled 
        ? "L'application privilégiera les données locales"
        : "L'application privilégiera les données en ligne"
    });
  };

  const handleBackgroundSyncToggle = async (enabled: boolean) => {
    if (enabled) {
      await backgroundSyncService.enableBackgroundSync();
    } else {
      await backgroundSyncService.disableBackgroundSync();
    }
    setBackgroundSyncEnabled(enabled);
    
    toast({
      title: enabled ? "Synchronisation en arrière-plan activée" : "Synchronisation en arrière-plan désactivée",
      description: enabled 
        ? "L'application synchronisera automatiquement en arrière-plan"
        : "La synchronisation en arrière-plan est désactivée"
    });
  };

  const handleOptimizeDatabase = async () => {
    setIsOptimizing(true);
    try {
      await sqliteService.optimizeDatabase();
      await loadStats();
      
      toast({
        title: "Base de données optimisée",
        description: "La base de données locale a été nettoyée et optimisée"
      });
    } catch (error) {
      toast({
        title: "Erreur d'optimisation",
        description: "Impossible d'optimiser la base de données",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClearOfflineData = async () => {
    setIsClearingData(true);
    try {
      // Clear all offline tables (implement this method in SQLiteService)
      const tables = ['boats', 'interventions', 'stock_items', 'orders', 'suppliers', 'boat_components'];
      for (const table of tables) {
        await sqliteService.getDatabase().then(db => 
          db.run(`DELETE FROM offline_${table}`)
        );
      }
      
      // Clear pending changes
      await sqliteService.getDatabase().then(db => 
        db.run('DELETE FROM pending_changes')
      );
      
      await loadStats();
      
      toast({
        title: "Données hors ligne effacées",
        description: "Toutes les données hors ligne ont été supprimées"
      });
    } catch (error) {
      toast({
        title: "Erreur de suppression",
        description: "Impossible de supprimer les données hors ligne",
        variant: "destructive"
      });
    } finally {
      setIsClearingData(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Jamais';
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Gestion hors ligne</h2>
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            État de synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalOfflineRecords}</div>
              <div className="text-sm text-muted-foreground">Enregistrements locaux</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.pendingChanges}</div>
              <div className="text-sm text-muted-foreground">En attente de sync</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.unresolvedConflicts}</div>
              <div className="text-sm text-muted-foreground">Conflits non résolus</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {syncStatus.lastSync ? 'Récent' : 'Jamais'}
              </div>
              <div className="text-sm text-muted-foreground">Dernière sync</div>
            </div>
          </div>

          {syncStatus.isSyncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Synchronisation en cours...</span>
                <span>En cours</span>
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions de synchronisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={performSync}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
              Synchroniser maintenant
            </Button>

            {hasConflicts && (
              <Button
                variant="destructive"
                onClick={() => setShowConflictDialog(true)}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Résoudre les conflits ({conflicts.length})
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleOptimizeDatabase}
              disabled={isOptimizing}
              className="flex items-center gap-2"
            >
              <Database className={`h-4 w-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              Optimiser la base
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Data Manager */}
      {isNative && <MobileDataManager />}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Paramètres de synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-sync">Synchronisation automatique</Label>
              <p className="text-sm text-muted-foreground">
                Synchroniser automatiquement lorsque la connexion est rétablie
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={handleAutoSyncToggle}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="offline-mode">Mode hors ligne privilégié</Label>
              <p className="text-sm text-muted-foreground">
                Utiliser les données locales même quand en ligne
              </p>
            </div>
            <Switch
              id="offline-mode"
              checked={offlineMode}
              onCheckedChange={handleOfflineModeToggle}
            />
          </div>

          {isNative && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="background-sync">Synchronisation en arrière-plan</Label>
                  <p className="text-sm text-muted-foreground">
                    Synchroniser automatiquement quand l'app est en arrière-plan
                  </p>
                </div>
                <Switch
                  id="background-sync"
                  checked={backgroundSyncEnabled}
                  onCheckedChange={handleBackgroundSyncToggle}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Table Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Statut par table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.lastSyncTimes).map(([table, lastSync]) => (
              <div key={table} className="flex items-center justify-between py-2">
                <div className="font-medium capitalize">{table}</div>
                <Badge variant="outline">
                  {formatLastSync(lastSync)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ces actions sont irréversibles. Assurez-vous de synchroniser vos données avant de continuer.
            </p>
            <Button
              variant="destructive"
              onClick={handleClearOfflineData}
              disabled={isClearingData}
              className="flex items-center gap-2"
            >
              <Trash2 className={`h-4 w-4 ${isClearingData ? 'animate-spin' : ''}`} />
              Effacer toutes les données hors ligne
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conflict Resolution Dialog */}
      <ConflictResolutionDialog
        conflicts={conflicts}
        isOpen={showConflictDialog}
        onClose={() => setShowConflictDialog(false)}
        onResolve={resolveConflict}
      />
    </div>
  );
}