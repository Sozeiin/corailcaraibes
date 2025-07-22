import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Database, Zap, Package } from 'lucide-react';

interface PerformanceMetricsProps {
  queryTime?: number;
  itemCount?: number;
  isLoading?: boolean;
}

export function PerformanceMetrics({ queryTime, itemCount = 0, isLoading = false }: PerformanceMetricsProps) {
  const [renderTime, setRenderTime] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    
    // Mesurer le temps de rendu après que le composant soit monté
    const measureRenderTime = () => {
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
    };

    // Utiliser setTimeout pour mesurer après le rendu complet
    setTimeout(measureRenderTime, 0);
  }, [itemCount, isLoading]);

  const getPerformanceStatus = (time: number) => {
    if (time < 100) return { label: 'Excellent', variant: 'default' as const, color: 'text-green-600' };
    if (time < 300) return { label: 'Bon', variant: 'secondary' as const, color: 'text-blue-600' };
    if (time < 1000) return { label: 'Moyen', variant: 'secondary' as const, color: 'text-yellow-600' };
    return { label: 'Lent', variant: 'destructive' as const, color: 'text-red-600' };
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Ne pas afficher en production
  }

  return (
    <Card className="mb-4 border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Métriques de performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Requête DB</p>
              {queryTime ? (
                <div className="flex items-center gap-1">
                  <span className={getPerformanceStatus(queryTime).color}>
                    {queryTime.toFixed(0)}ms
                  </span>
                  <Badge variant={getPerformanceStatus(queryTime).variant} className="text-xs">
                    {getPerformanceStatus(queryTime).label}
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Rendu</p>
              <div className="flex items-center gap-1">
                <span className={getPerformanceStatus(renderTime).color}>
                  {renderTime.toFixed(0)}ms
                </span>
                <Badge variant={getPerformanceStatus(renderTime).variant} className="text-xs">
                  {getPerformanceStatus(renderTime).label}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="h-3 w-3 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Éléments</p>
              <span className="font-medium">{itemCount}</span>
            </div>
          </div>
        </div>
        
        {isLoading && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Chargement en cours...
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook pour mesurer le temps de requête
export function useQueryPerformance() {
  const [startTime, setStartTime] = useState<number>(0);
  const [queryTime, setQueryTime] = useState<number>(0);

  const startMeasurement = () => {
    setStartTime(performance.now());
  };

  const endMeasurement = () => {
    if (startTime > 0) {
      const endTime = performance.now();
      setQueryTime(endTime - startTime);
    }
  };

  return { queryTime, startMeasurement, endMeasurement };
}