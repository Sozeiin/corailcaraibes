import { Wifi, WifiOff, CloudOff, Download, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export const OfflineStatusIcon = () => {
  const { syncStatus, performSync } = useOfflineSync();

  const getColor = () => {
    if (syncStatus.error) return 'text-red-500';
    if (syncStatus.isSyncing) return 'text-blue-500';
    if (!syncStatus.isOnline || syncStatus.pendingChanges > 0) return 'text-orange-500';
    return 'text-green-500';
  };

  const getIcon = () => {
    if (syncStatus.error) return <AlertTriangle className="h-5 w-5" />;
    if (syncStatus.isSyncing) return <Download className="h-5 w-5 animate-pulse" />;
    if (!syncStatus.isOnline) return <WifiOff className="h-5 w-5" />;
    if (syncStatus.pendingChanges > 0) return <CloudOff className="h-5 w-5" />;
    return <Wifi className="h-5 w-5" />;
  };

  const getMessage = () => {
    if (syncStatus.error) return `Erreur de synchronisation:\n${syncStatus.error}`;
    if (!syncStatus.isOnline) return 'Mode hors ligne. Les modifications seront synchronisées à la reconnexion.';
    if (syncStatus.isSyncing) return 'Synchronisation en cours...';
    if (syncStatus.pendingChanges > 0) return `${syncStatus.pendingChanges} modification(s) en attente. Appuyez pour synchroniser.`;
    return `Synchronisé${syncStatus.lastSync ? `\nDernière sync: ${new Date(syncStatus.lastSync).toLocaleString()}` : ''}`;
  };

  const handleClick = async () => {
    if (syncStatus.isOnline && syncStatus.pendingChanges > 0 && !syncStatus.isSyncing) {
      await performSync();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn('p-1 rounded-full', getColor())}
          >
            {getIcon()}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <pre className="whitespace-pre-wrap text-xs">{getMessage()}</pre>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
