import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, Gauge } from 'lucide-react';
import { SafetyStatusIcon } from './SafetyStatusIcon';
import { OilChangeStatusBadge } from './OilChangeStatusBadge';
import { calculateOilChangeProgress } from '@/utils/engineMaintenanceUtils';
import { useNavigate } from 'react-router-dom';

interface BoatFleetCardProps {
  boat: {
    id: string;
    name: string;
    model: string;
    status: string;
    current_engine_hours: number;
    last_oil_change_hours: number;
    next_maintenance?: string;
  };
  alertsCount?: number;
  onCreateIntervention?: (boatId: string, boatName?: string) => void;
}

export const BoatFleetCard: React.FC<BoatFleetCardProps> = ({ 
  boat, 
  alertsCount = 0,
  onCreateIntervention 
}) => {
  const navigate = useNavigate();
  const oilChangeProgress = calculateOilChangeProgress(boat.current_engine_hours, boat.last_oil_change_hours);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'secondary';
      case 'maintenance': return 'destructive';
      case 'in_use': return 'default';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'maintenance': return 'Maintenance';
      case 'in_use': return 'En cours';
      default: return status;
    }
  };

  return (
    <Card className="card-hover h-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header with boat name and badges */}
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg truncate">{boat.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{boat.model}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <SafetyStatusIcon boatId={boat.id} size="md" />
              <OilChangeStatusBadge 
                currentEngineHours={boat.current_engine_hours}
                lastOilChangeHours={boat.last_oil_change_hours}
                size="md"
              />
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center justify-between">
            <Badge variant={getStatusBadgeVariant(boat.status)}>
              {getStatusLabel(boat.status)}
            </Badge>
            {alertsCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alertsCount} alerte{alertsCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Engine hours with progress */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4" />
              <span className="font-medium">Heures moteur:</span>
              <span>{boat.current_engine_hours}h</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Prochaine vidange</span>
                <span>{Math.max(0, 250 - (boat.current_engine_hours - boat.last_oil_change_hours))}h restantes</span>
              </div>
              <Progress 
                value={oilChangeProgress} 
                className="h-2"
                // Apply color based on progress
                style={{
                  '--progress-foreground': oilChangeProgress >= 100 
                    ? 'hsl(var(--destructive))' 
                    : oilChangeProgress >= 80 
                    ? 'hsl(var(--accent))' 
                    : 'hsl(var(--secondary))'
                } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Next maintenance */}
          {boat.next_maintenance && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Maintenance: {new Date(boat.next_maintenance).toLocaleDateString()}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => navigate(`/boats/${boat.id}`)}
            >
              Détails
            </Button>
            <Button 
              size="sm" 
              className="btn-ocean"
              onClick={() => onCreateIntervention?.(boat.id, `${boat.name} - ${boat.model}`)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Action
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};