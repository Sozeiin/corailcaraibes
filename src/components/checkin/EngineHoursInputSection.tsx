import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Gauge, AlertTriangle } from 'lucide-react';
import { useBoatEngines, BoatEngine } from '@/hooks/useBoatEngines';
import { Skeleton } from '@/components/ui/skeleton';

interface EngineHoursInputSectionProps {
  boatId: string;
  engineHours: Record<string, number | undefined>;
  onEngineHoursChange: (componentId: string, hours: number | undefined) => void;
}

export function EngineHoursInputSection({
  boatId,
  engineHours,
  onEngineHoursChange,
}: EngineHoursInputSectionProps) {
  const { data: engines, isLoading, error } = useBoatEngines(boatId);

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="h-5 w-5 text-blue-600" />
            Heures moteur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !engines || engines.length === 0) {
    return null; // Ne rien afficher si pas de moteurs configurés
  }

  const validateHours = (engine: BoatEngine, newHours: number | undefined): string | null => {
    if (newHours === undefined) return null;
    
    const currentHours = engine.current_engine_hours || 0;
    
    // Vérifier que les nouvelles heures sont supérieures ou égales aux heures actuelles
    if (newHours < currentHours) {
      return `Les heures ne peuvent pas être inférieures à ${currentHours}h`;
    }
    
    // Alerte si augmentation de plus de 100h en une seule saisie
    if (newHours - currentHours > 100) {
      return `Attention: augmentation de ${newHours - currentHours}h`;
    }
    
    return null;
  };

  const handleInputChange = (componentId: string, value: string) => {
    if (value === '') {
      onEngineHoursChange(componentId, undefined);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onEngineHoursChange(componentId, numValue);
      }
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-5 w-5 text-blue-600" />
          Heures moteur
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            Mise à jour automatique
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Saisissez les heures actuelles pour chaque moteur. Les valeurs seront automatiquement enregistrées lors de la validation.
        </p>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {engines.map((engine) => {
            const inputValue = engineHours[engine.id];
            const validationMessage = validateHours(engine, inputValue);
            const isWarning = validationMessage?.startsWith('Attention');
            const isError = validationMessage && !isWarning;
            
            return (
              <div key={engine.id} className="space-y-2">
                <Label 
                  htmlFor={`engine-hours-${engine.id}`}
                  className="text-sm font-medium"
                >
                  {engine.component_name}
                </Label>
                <div className="relative">
                  <Input
                    id={`engine-hours-${engine.id}`}
                    type="number"
                    min={engine.current_engine_hours || 0}
                    step="0.1"
                    placeholder={`${engine.current_engine_hours || 0}`}
                    value={inputValue ?? ''}
                    onChange={(e) => handleInputChange(engine.id, e.target.value)}
                    className={`pr-8 ${
                      isError ? 'border-red-500 focus-visible:ring-red-500' : 
                      isWarning ? 'border-orange-500 focus-visible:ring-orange-500' : ''
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    h
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Actuel: {engine.current_engine_hours ?? 0}h
                  </span>
                  {inputValue !== undefined && inputValue > (engine.current_engine_hours || 0) && (
                    <span className="text-green-600">
                      +{(inputValue - (engine.current_engine_hours || 0)).toFixed(1)}h
                    </span>
                  )}
                </div>
                {validationMessage && (
                  <div className={`flex items-center gap-1 text-xs ${
                    isError ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                    {validationMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
