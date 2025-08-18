import React from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOfflineSync } from '@/hooks/useOfflineSync';
interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}
export function OfflineIndicator({
  className,
  showDetails = true
}: OfflineIndicatorProps) {
  const {
    syncStatus,
    performSync
  } = useOfflineSync();
  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-destructive';
    if (syncStatus.isSyncing) return 'bg-warning';
    if (syncStatus.error) return 'bg-destructive';
    return 'bg-success';
  };
  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Hors ligne';
    if (syncStatus.isSyncing) return 'Synchronisation...';
    if (syncStatus.error) return 'Erreur de sync';
    return 'En ligne';
  };
  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus.isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (syncStatus.error) return <AlertCircle className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };
  const handleSync = async () => {
    if (!syncStatus.isSyncing) {
      await performSync();
    }
  };
  return <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">État de la synchronisation</p>
              <p className="text-sm text-muted-foreground">
                Status: {getStatusText()}
              </p>
              {syncStatus.lastSync && <p className="text-sm text-muted-foreground">
                  Dernière sync: {new Date(syncStatus.lastSync).toLocaleString()}
                </p>}
              {syncStatus.pendingChanges > 0 && <p className="text-sm text-muted-foreground">
                  {syncStatus.pendingChanges} changement(s) en attente
                </p>}
              {syncStatus.error && <p className="text-sm text-destructive">
                  Erreur: {syncStatus.error}
                </p>}
            </div>
          </TooltipContent>
        </Tooltip>

        {showDetails && syncStatus.pendingChanges > 0 && <Badge variant="outline" className="text-xs">
            {syncStatus.pendingChanges} en attente
          </Badge>}

        {showDetails && !syncStatus.isSyncing}
      </div>
    </TooltipProvider>;
}