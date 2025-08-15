import { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { cn } from '@/lib/utils';

export const MobileOfflineBar = () => {
  const { syncStatus, performSync } = useOfflineSync();
  const { isNative } = useMobileCapacitor();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show bar when offline, syncing, or has pending changes
    const shouldShow = !syncStatus.isOnline || 
                      syncStatus.isSyncing || 
                      syncStatus.pendingChanges > 0 ||
                      !!syncStatus.error;
    setIsVisible(shouldShow);
  }, [syncStatus]);

  if (!isVisible) return null;

  const getBarColor = () => {
    if (syncStatus.error) return 'bg-red-500';
    if (!syncStatus.isOnline) return 'bg-orange-500';
    if (syncStatus.isSyncing) return 'bg-blue-500';
    if (syncStatus.pendingChanges > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getIcon = () => {
    if (syncStatus.error) return <AlertTriangle className="h-4 w-4" />;
    if (!syncStatus.isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus.isSyncing) return <Download className="h-4 w-4 animate-pulse" />;
    if (syncStatus.pendingChanges > 0) return <CloudOff className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getMessage = () => {
    if (syncStatus.error) return 'Erreur de synchronisation';
    if (!syncStatus.isOnline) return 'Mode hors ligne';
    if (syncStatus.isSyncing) return 'Synchronisation en cours...';
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} modification(s) en attente`;
    return 'Synchronisé';
  };

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isNative ? "pt-safe-area-inset-top" : ""
    )}>
      <div className={cn(
        "flex items-center justify-between px-4 py-2 text-white text-sm",
        getBarColor()
      )}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span>{getMessage()}</span>
        </div>
        
        {syncStatus.isOnline && !syncStatus.isSyncing && syncStatus.pendingChanges > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={performSync}
            className="h-6 px-2 text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
          >
            Synchroniser
          </Button>
        )}
      </div>
      
      {syncStatus.isSyncing && (
        <div className="px-4 pb-1">
          <Progress 
            value={75} // Would be dynamic in real implementation
            className="h-1 bg-white/20"
          />
        </div>
      )}
    </div>
  );
};