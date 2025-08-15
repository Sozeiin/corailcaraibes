import { useState, useEffect } from 'react';
import { Download, Upload, Trash2, Database, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { sqliteService } from '@/lib/database/sqlite';
import { toast } from '@/hooks/use-toast';

interface DataStats {
  totalRecords: number;
  pendingUploads: number;
  lastSyncTime: Date | null;
  storageSize: string;
}

export const MobileDataManager = () => {
  const { syncStatus, performSync } = useOfflineSync();
  const [dataStats, setDataStats] = useState<DataStats>({
    totalRecords: 0,
    pendingUploads: 0,
    lastSyncTime: null,
    storageSize: '0 MB'
  });
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadDataStats();
  }, []);

  const loadDataStats = async () => {
    try {
      const db = await sqliteService.getDatabase();
      
      // Count total records
      const tablesResult = await db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      
      let totalRecords = 0;
      for (const table of tablesResult.values || []) {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM ${table.name}`);
        totalRecords += countResult.values?.[0]?.count || 0;
      }

      // Get pending changes
      const pendingChanges = await sqliteService.getPendingChanges();
      
      // Estimate storage size (simplified)
      const storageSize = `${Math.round(totalRecords * 0.5)} KB`;

      setDataStats({
        totalRecords,
        pendingUploads: pendingChanges.length,
        lastSyncTime: syncStatus.lastSync ? new Date(syncStatus.lastSync) : null,
        storageSize
      });
    } catch (error) {
      console.error('Failed to load data stats:', error);
    }
  };

  const handleClearOfflineData = async () => {
    setIsClearing(true);
    try {
      const db = await sqliteService.getDatabase();
      
      // Clear all offline tables
      const tables = ['offline_stock', 'offline_suppliers', 'offline_boat_components', 'offline_maintenance_tasks'];
      
      for (const table of tables) {
        await db.execute(`DELETE FROM ${table}`);
      }
      
      // Clear pending changes
      await db.execute('DELETE FROM pending_changes');
      
      toast({
        title: "Données effacées",
        description: "Toutes les données hors ligne ont été supprimées",
      });
      
      await loadDataStats();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'effacer les données hors ligne",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Gestion des données mobiles</h3>
        <p className="text-muted-foreground text-sm">
          Gérez vos données hors ligne et la synchronisation
        </p>
      </div>

      {/* Sync Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            État de synchronisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Statut</span>
            <Badge variant={syncStatus.isOnline ? "default" : "secondary"}>
              {syncStatus.isOnline ? "En ligne" : "Hors ligne"}
            </Badge>
          </div>
          
          {syncStatus.isSyncing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Synchronisation...</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Modifications en attente</span>
            <Badge variant={syncStatus.pendingChanges > 0 ? "destructive" : "default"}>
              {syncStatus.pendingChanges}
            </Badge>
          </div>
          
          {dataStats.lastSyncTime && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Dernière sync</span>
              <span className="text-sm text-muted-foreground">
                {dataStats.lastSyncTime.toLocaleString('fr-FR')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Statistiques des données
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{dataStats.totalRecords}</div>
              <div className="text-xs text-muted-foreground">Enregistrements</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-500">{dataStats.storageSize}</div>
              <div className="text-xs text-muted-foreground">Stockage utilisé</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={performSync} 
            disabled={!syncStatus.isOnline || syncStatus.isSyncing}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Synchroniser maintenant
          </Button>
          
          <Button 
            variant="outline" 
            onClick={loadDataStats}
            className="w-full"
          >
            <Clock className="h-4 w-4 mr-2" />
            Actualiser les statistiques
          </Button>
          
          <Button 
            variant="destructive" 
            onClick={handleClearOfflineData}
            disabled={isClearing}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing ? 'Suppression...' : 'Effacer données hors ligne'}
          </Button>
        </CardContent>
      </Card>

      {/* Warnings */}
      {syncStatus.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur de synchronisation: {syncStatus.error}
          </AlertDescription>
        </Alert>
      )}
      
      {syncStatus.pendingChanges > 10 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous avez beaucoup de modifications en attente. Pensez à synchroniser dès que possible.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};