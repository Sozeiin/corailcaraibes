import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, Gauge } from 'lucide-react';
import { SafetyStatusIcon } from './SafetyStatusIcon';
import { OilChangeStatusBadge } from './OilChangeStatusBadge';
import { calculateWorstOilChangeProgress, type EngineComponent } from '@/utils/engineMaintenanceUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface BoatFleetCardProps {
  boat: {
    id: string;
    name: string;
    model: string;
    status: string;
    current_engine_hours?: number;
    last_oil_change_hours?: number;
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
  
  // Fetch engine components for this boat
  const { data: engineComponents = [], isLoading: isLoadingEngines } = useQuery({
    queryKey: ['boat-engines', boat.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_components')
        .select('id, component_name, component_type, current_engine_hours, last_oil_change_hours')
        .eq('boat_id', boat.id)
        .ilike('component_type', '%moteur%');
      
      if (error) throw error;
      return data as EngineComponent[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true
  });

  const oilChangeProgress = calculateWorstOilChangeProgress(engineComponents);

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
                engines={engineComponents}
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

          {/* Engine status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4" />
              <span className="font-medium">Moteurs:</span>
              {isLoadingEngines ? (
                <span className="text-muted-foreground">Chargement...</span>
              ) : (
                <span>{engineComponents.length} moteur{engineComponents.length > 1 ? 's' : ''}</span>
              )}
            </div>
            {!isLoadingEngines && engineComponents.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progression vidange</span>
                  <span>{Math.round(oilChangeProgress)}%</span>
                </div>
                <Progress 
                  value={oilChangeProgress} 
                  className="h-2"
                  style={{
                    '--progress-foreground': oilChangeProgress >= 100 
                      ? 'hsl(var(--destructive))' 
                      : oilChangeProgress >= 80 
                      ? 'hsl(var(--accent))' 
                      : 'hsl(var(--primary))'
                  } as React.CSSProperties}
                />
              </div>
            )}
            {!isLoadingEngines && engineComponents.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun moteur configuré</p>
            )}
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
              Intervention
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};