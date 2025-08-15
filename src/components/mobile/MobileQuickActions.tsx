import { useState } from 'react';
import { Plus, Scan, Camera, FileText, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  action: () => void;
  requiresOnline?: boolean;
}

export const MobileQuickActions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { syncStatus, performSync } = useOfflineSync();
  const { isNative } = useMobileCapacitor();

  const quickActions: QuickAction[] = [
    {
      id: 'scan',
      label: 'Scanner',
      icon: <Scan className="h-5 w-5" />,
      color: 'bg-primary',
      action: () => {
        // Navigate to scanner
        setIsOpen(false);
      }
    },
    {
      id: 'photo',
      label: 'Photo',
      icon: <Camera className="h-5 w-5" />,
      color: 'bg-green-500',
      action: () => {
        // Open camera
        setIsOpen(false);
      }
    },
    {
      id: 'report',
      label: 'Rapport',
      icon: <FileText className="h-5 w-5" />,
      color: 'bg-blue-500',
      action: () => {
        // Create report
        setIsOpen(false);
      },
      requiresOnline: true
    },
    {
      id: 'sync',
      label: 'Sync',
      icon: <Download className="h-5 w-5" />,
      color: 'bg-orange-500',
      action: () => {
        performSync();
        setIsOpen(false);
      },
      requiresOnline: true
    }
  ];

  const availableActions = quickActions.filter(action => 
    !action.requiresOnline || syncStatus.isOnline
  );

  if (!isNative) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className={cn(
            "fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 shadow-lg",
            "bg-primary hover:bg-primary/90"
          )}
        >
          <Plus className="h-6 w-6" />
          {syncStatus.pendingChanges > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {syncStatus.pendingChanges}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {availableActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="lg"
              onClick={action.action}
              className={cn(
                "h-20 flex-col gap-2 border-2 hover:scale-105 transition-transform",
                action.color,
                "text-white border-white/20 hover:bg-white/10"
              )}
              disabled={action.requiresOnline && !syncStatus.isOnline}
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
        
        {!syncStatus.isOnline && (
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-sm text-orange-600 text-center">
              Certaines actions nécessitent une connexion internet
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};