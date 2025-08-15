import { Wifi, WifiOff, RefreshCw, AlertCircle, Cloud, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils";

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const SyncStatusIndicator = ({ className, showDetails = false }: SyncStatusIndicatorProps) => {
  const { syncStatus, performSync } = useOfflineSync();

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    
    if (!syncStatus.isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }
    
    if (syncStatus.syncError) {
      return <AlertCircle className="h-4 w-4" />;
    }
    
    if (syncStatus.pendingChanges > 0) {
      return <CloudOff className="h-4 w-4" />;
    }
    
    return <Cloud className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) {
      return "Synchronisation...";
    }
    
    if (!syncStatus.isOnline) {
      return "Hors ligne";
    }
    
    if (syncStatus.syncError) {
      return "Erreur de sync";
    }
    
    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges} en attente`;
    }
    
    return "Synchronisé";
  };

  const getStatusVariant = () => {
    if (syncStatus.isSyncing) {
      return "secondary";
    }
    
    if (!syncStatus.isOnline) {
      return "outline";
    }
    
    if (syncStatus.syncError) {
      return "destructive";
    }
    
    if (syncStatus.pendingChanges > 0) {
      return "secondary";
    }
    
    return "default";
  };

  const getTooltipText = () => {
    let text = getStatusText();
    
    if (syncStatus.lastSyncTime) {
      const lastSync = syncStatus.lastSyncTime.toLocaleString('fr-FR');
      text += `\nDernière sync: ${lastSync}`;
    }
    
    if (syncStatus.syncError) {
      text += `\nErreur: ${syncStatus.syncError}`;
    }
    
    if (!syncStatus.isOnline) {
      text += `\nLes modifications seront synchronisées à la reconnexion`;
    }
    
    return text;
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={getStatusVariant()}
              className="flex items-center gap-1 cursor-default"
            >
              {getStatusIcon()}
              {showDetails && <span className="text-xs">{getStatusText()}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <pre className="whitespace-pre-wrap text-xs">{getTooltipText()}</pre>
          </TooltipContent>
        </Tooltip>
        
        {syncStatus.isOnline && !syncStatus.isSyncing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={performSync}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
};