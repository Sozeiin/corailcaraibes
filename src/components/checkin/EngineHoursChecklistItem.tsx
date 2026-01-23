import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, AlertTriangle, Camera, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChecklistMultiPhotoCapture } from './ChecklistMultiPhotoCapture';
import { useBoatEngines } from '@/hooks/useBoatEngines';
import { Skeleton } from '@/components/ui/skeleton';

interface ChecklistItem {
  id: string;
  name: string;
  isRequired: boolean;
  status: 'ok' | 'needs_repair' | 'not_checked';
  notes?: string;
  photos?: Array<{ id?: string; url: string; displayOrder: number }>;
}

interface EngineHoursChecklistItemProps {
  item: ChecklistItem;
  onStatusChange: (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  onPhotoChange: (itemId: string, photos: Array<{ id?: string; url: string; displayOrder: number }>) => void;
  checklistId?: string;
  boatId: string;
  engineHours: Record<string, number | undefined>;
  onEngineHoursChange: (componentId: string, hours: number | undefined) => void;
}

export function EngineHoursChecklistItem({
  item,
  onStatusChange,
  onNotesChange,
  onPhotoChange,
  checklistId,
  boatId,
  engineHours,
  onEngineHoursChange
}: EngineHoursChecklistItemProps) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const { data: engines = [], isLoading, error } = useBoatEngines(boatId);

  const getBarColor = () => {
    switch (item.status) {
      case 'ok':
        return 'bg-green-500';
      case 'needs_repair':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  const validateHours = (engine: typeof engines[0], newHours: number | undefined): string | null => {
    if (newHours === undefined) return null;
    
    const currentHours = engine.current_engine_hours || 0;
    
    if (newHours < currentHours) {
      return `Les heures ne peuvent pas être inférieures aux heures actuelles (${currentHours}h)`;
    }
    
    if (newHours - currentHours > 100) {
      return `Attention: augmentation importante (+${newHours - currentHours}h)`;
    }
    
    return null;
  };

  const handleInputChange = (componentId: string, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    if (value === '' || (!isNaN(numValue!) && numValue! >= 0)) {
      onEngineHoursChange(componentId, numValue);
    }
  };

  const getEngineName = (engine: typeof engines[0]) => {
    // Utiliser component_type au lieu de component_name pour la détection
    const type = engine.component_type.toLowerCase();
    
    if (type.includes('bâbord') || type.includes('babord') || type.includes('port')) {
      return 'Moteur BB';
    }
    if (type.includes('tribord') || type.includes('starboard')) {
      return 'Moteur TB';
    }
    if (type.includes('génératrice') || type.includes('generatrice') || 
        type.includes('générateur') || type.includes('generateur') || 
        type.includes('generator')) {
      return 'Génératrice';
    }
    
    // Fallback: utiliser le nom du composant ou le type
    return engine.component_name || engine.component_type;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      {/* Status bar */}
      <div className={cn("h-1.5 w-full transition-colors duration-200", getBarColor())} />
      
      <div className="p-4">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-gray-900">{item.name}</h4>
              {item.isRequired && (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Obligatoire
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Engine hours inputs */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            </div>
          ) : error || engines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              {error ? 'Erreur de chargement des moteurs' : 'Aucun moteur configuré pour ce bateau'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {engines.map((engine) => {
                const newHours = engineHours[engine.id];
                const currentHours = engine.current_engine_hours || 0;
                const validation = validateHours(engine, newHours);
                const isError = validation?.includes('inférieures');
                const isWarning = validation?.includes('Attention');
                const increase = newHours !== undefined ? newHours - currentHours : 0;

                return (
                  <div key={engine.id} className="space-y-1">
                    <label className="text-xs font-medium text-gray-700">
                      {getEngineName(engine)}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={currentHours}
                        value={newHours ?? ''}
                        onChange={(e) => handleInputChange(engine.id, e.target.value)}
                        placeholder={`${currentHours}`}
                        className={cn(
                          "h-9 text-sm",
                          isError && "border-red-500 focus-visible:ring-red-500",
                          isWarning && "border-amber-500 focus-visible:ring-amber-500"
                        )}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">h</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Actuel: {currentHours}h
                      </span>
                      {newHours !== undefined && increase > 0 && (
                        <span className={cn(
                          "font-medium",
                          isWarning ? "text-amber-600" : "text-green-600"
                        )}>
                          +{increase}h
                        </span>
                      )}
                    </div>
                    {validation && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs mt-1",
                        isError ? "text-red-600" : "text-amber-600"
                      )}>
                        <AlertTriangle className="h-3 w-3" />
                        <span>{validation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status buttons */}
        <div className="flex gap-2 mb-3">
          <Button
            size="sm"
            variant={item.status === 'ok' ? 'default' : 'outline'}
            className={cn(
              "flex-1 gap-1.5",
              item.status === 'ok' && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => onStatusChange(item.id, 'ok', item.notes)}
          >
            <Check className="h-4 w-4" />
            OK
          </Button>
          <Button
            size="sm"
            variant={item.status === 'needs_repair' ? 'default' : 'outline'}
            className={cn(
              "flex-1 gap-1.5",
              item.status === 'needs_repair' && "bg-red-600 hover:bg-red-700"
            )}
            onClick={() => onStatusChange(item.id, 'needs_repair', item.notes)}
          >
            <X className="h-4 w-4" />
            Problème
          </Button>
        </div>

        {/* Photo capture */}
        <div className="mb-3">
          <ChecklistMultiPhotoCapture
            itemId={item.id}
            checklistId={checklistId}
            photos={item.photos || []}
            onPhotosChange={(photos) => onPhotoChange(item.id, photos)}
          />
        </div>

        {/* Notes section */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          >
            <span className="flex items-center gap-2">
              <span>Notes</span>
              {item.notes && !isNotesExpanded && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  : {item.notes}
                </span>
              )}
            </span>
            {isNotesExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          {isNotesExpanded && (
            <Textarea
              value={item.notes || ''}
              onChange={(e) => onNotesChange(item.id, e.target.value)}
              placeholder="Ajouter des notes..."
              className="mt-2 min-h-[80px]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
