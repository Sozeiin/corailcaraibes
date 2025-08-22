import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Cog, Wrench, Clock } from 'lucide-react';
import { getOilChangeStatusBadge, calculateOilChangeProgress } from '@/utils/engineMaintenanceUtils';

interface EngineStatusCardProps {
  engine: {
    id: string;
    component_name: string;
    current_engine_hours: number;
    last_oil_change_hours: number;
    status: string;
  };
  className?: string;
}

export const EngineStatusCard: React.FC<EngineStatusCardProps> = ({ engine, className = '' }) => {
  const oilStatus = getOilChangeStatusBadge(engine.current_engine_hours, engine.last_oil_change_hours);
  const oilProgress = calculateOilChangeProgress(engine.current_engine_hours, engine.last_oil_change_hours);

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
        return 'default';
      case 'maintenance':
        return 'secondary';
      case 'defective':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getOilStatusVariant = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'destructive';
      case 'due_soon':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getOilStatusLabel = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'Vidange en retard';
      case 'due_soon':
        return 'Vidange bientôt';
      default:
        return 'Vidange OK';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <Cog className="h-4 w-4 mr-2" />
            {engine.component_name}
          </div>
          <Badge variant={getStatusBadgeVariant(engine.status)}>
            {engine.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Heures moteur */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Heures moteur
            </span>
            <span className="font-medium">{engine.current_engine_hours}h</span>
          </div>
        </div>

        {/* Statut vidange */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <Wrench className="h-3 w-3 mr-1" />
              Vidange
            </span>
            <Badge variant={getOilStatusVariant(oilStatus.status)} className="text-xs">
              {getOilStatusLabel(oilStatus.status)}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Dernière: {engine.last_oil_change_hours}h</span>
              <span>{oilStatus.hoursSinceLastChange}h écoulées</span>
            </div>
            <Progress 
              value={Math.min(oilProgress, 100)} 
              className="h-2"
            />
            {oilProgress > 100 && (
              <p className="text-xs text-destructive font-medium">
                En retard de {(oilStatus.hoursSinceLastChange - 250)}h
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};