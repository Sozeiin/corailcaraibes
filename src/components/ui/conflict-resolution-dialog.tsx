import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, User, Smartphone, Monitor } from 'lucide-react';

interface ConflictData {
  id: number;
  table_name: string;
  record_id: string;
  local_data: any;
  remote_data: any;
  conflict_type: string;
  created_at: number;
}

interface ConflictResolutionDialogProps {
  conflicts: ConflictData[];
  isOpen: boolean;
  onClose: () => void;
  onResolve: (conflictId: number, strategy: string, data?: any) => Promise<void>;
}

export function ConflictResolutionDialog({
  conflicts,
  isOpen,
  onClose,
  onResolve
}: ConflictResolutionDialogProps) {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);

  const currentConflict = conflicts[currentConflictIndex];

  if (!currentConflict) {
    return null;
  }

  const formatData = (data: any) => {
    return Object.entries(data).map(([key, value]) => (
      <div key={key} className="flex justify-between py-1">
        <span className="font-medium text-sm">{key}:</span>
        <span className="text-sm text-muted-foreground">{String(value)}</span>
      </div>
    ));
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'timestamp':
        return <Clock className="h-4 w-4" />;
      case 'data':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleResolve = async () => {
    if (!selectedStrategy) return;

    setIsResolving(true);
    try {
      let resolvedData;
      
      switch (selectedStrategy) {
        case 'use_local':
          resolvedData = currentConflict.local_data;
          break;
        case 'use_remote':
          resolvedData = currentConflict.remote_data;
          break;
        case 'merge':
          // Simple merge strategy - combine both datasets
          resolvedData = { ...currentConflict.remote_data, ...currentConflict.local_data };
          break;
        default:
          resolvedData = currentConflict.local_data;
      }

      await onResolve(currentConflict.id, selectedStrategy, resolvedData);
      
      // Move to next conflict or close dialog
      if (currentConflictIndex < conflicts.length - 1) {
        setCurrentConflictIndex(prev => prev + 1);
        setSelectedStrategy('');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSkip = () => {
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(prev => prev + 1);
      setSelectedStrategy('');
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Résolution de conflit de synchronisation
            <Badge variant="outline">
              {currentConflictIndex + 1} / {conflicts.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Conflict Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getConflictIcon(currentConflict.conflict_type)}
                  Conflit détecté: {currentConflict.table_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enregistrement: {currentConflict.record_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  Détecté le: {new Date(currentConflict.created_at).toLocaleString()}
                </p>
              </CardHeader>
            </Card>

            {/* Data Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Données locales (hors ligne)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formatData(currentConflict.local_data)}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Données distantes (serveur)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {formatData(currentConflict.remote_data)}
                </CardContent>
              </Card>
            </div>

            {/* Resolution Strategy */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Stratégie de résolution</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="use_local" id="use_local" />
                      <Label htmlFor="use_local" className="cursor-pointer">
                        Utiliser les données locales (priorité hors ligne)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="use_remote" id="use_remote" />
                      <Label htmlFor="use_remote" className="cursor-pointer">
                        Utiliser les données du serveur (priorité en ligne)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="merge" id="merge" />
                      <Label htmlFor="merge" className="cursor-pointer">
                        Fusionner les données (combinaison intelligente)
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isResolving}
          >
            Ignorer ce conflit
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isResolving}
            >
              Fermer
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!selectedStrategy || isResolving}
            >
              {isResolving ? 'Résolution...' : 'Résoudre le conflit'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}