import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { BoatComponent } from '@/types';

interface BoatSchematicViewProps {
  components: BoatComponent[];
  onComponentClick: (component: BoatComponent) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational':
      return 'hsl(var(--secondary))';
    case 'maintenance_needed':
      return 'hsl(var(--accent))';
    case 'out_of_service':
      return 'hsl(var(--destructive))';
    case 'scheduled_maintenance':
      return 'hsl(var(--primary))';
    default:
      return 'hsl(var(--muted))';
  }
};

const getComponentPosition = (componentType: string) => {
  const positions: Record<string, { x: number; y: number; width: number; height: number }> = {
    'Moteur bâbord': { x: 20, y: 60, width: 25, height: 15 },
    'Moteur tribord': { x: 55, y: 60, width: 25, height: 15 },
    'Générateur': { x: 10, y: 40, width: 15, height: 10 },
    'Système hydraulique': { x: 75, y: 40, width: 15, height: 10 },
    'Système électrique': { x: 40, y: 25, width: 20, height: 8 },
    'Système de navigation': { x: 35, y: 10, width: 30, height: 8 },
    'Pompe de cale': { x: 45, y: 85, width: 10, height: 8 },
    'Climatisation': { x: 70, y: 25, width: 20, height: 8 },
    'Système de carburant': { x: 10, y: 75, width: 15, height: 15 },
    'Gouvernail': { x: 42, y: 95, width: 16, height: 4 },
    'Propulseur d\'étrave': { x: 42, y: 5, width: 16, height: 4 },
    'Winch': { x: 25, y: 15, width: 8, height: 8 },
    'Gréement': { x: 45, y: 0, width: 10, height: 5 },
    'Autre': { x: 5, y: 20, width: 10, height: 8 }
  };
  
  return positions[componentType] || { x: 5, y: 5, width: 10, height: 8 };
};

export function BoatSchematicView({ components, onComponentClick }: BoatSchematicViewProps) {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="relative w-full h-96 bg-gradient-to-b from-ocean-100 to-ocean-200 rounded-lg border-2 border-primary/20 overflow-hidden">
          {/* Boat Hull Outline */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Hull shape */}
            <path
              d="M20,20 Q50,5 80,20 L85,80 Q50,95 15,80 Z"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              className="opacity-60"
            />
            
            {/* Deck lines */}
            <line x1="25" y1="25" x2="75" y2="25" stroke="hsl(var(--primary))" strokeWidth="0.3" className="opacity-40" />
            <line x1="20" y1="50" x2="80" y2="50" stroke="hsl(var(--primary))" strokeWidth="0.3" className="opacity-40" />
            <line x1="25" y1="75" x2="75" y2="75" stroke="hsl(var(--primary))" strokeWidth="0.3" className="opacity-40" />
            
            {/* Component positions */}
            {components.map((component) => {
              const position = getComponentPosition(component.componentType);
              const statusColor = getStatusColor(component.status);
              
              return (
                <TooltipProvider key={component.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <g
                        className="cursor-pointer transition-all duration-200 hover:scale-110"
                        onClick={() => onComponentClick(component)}
                      >
                        <rect
                          x={position.x}
                          y={position.y}
                          width={position.width}
                          height={position.height}
                          fill={statusColor}
                          stroke="hsl(var(--foreground))"
                          strokeWidth="0.2"
                          rx="1"
                          className="opacity-80 hover:opacity-100"
                        />
                        {/* Component icon/indicator */}
                        <circle
                          cx={position.x + position.width / 2}
                          cy={position.y + position.height / 2}
                          r="1"
                          fill="hsl(var(--foreground))"
                          className="opacity-60"
                        />
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{component.componentName}</p>
                        <p className="text-sm text-muted-foreground">{component.componentType}</p>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: statusColor,
                            color: 'hsl(var(--primary-foreground))'
                          }}
                        >
                          {component.status === 'operational' && 'Opérationnel'}
                          {component.status === 'maintenance_needed' && 'Maintenance requise'}
                          {component.status === 'out_of_service' && 'Hors service'}
                          {component.status === 'scheduled_maintenance' && 'Maintenance planifiée'}
                        </Badge>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </svg>
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 border border-border/20">
            <h4 className="text-sm font-medium mb-2">Légende des statuts</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getStatusColor('operational') }}></div>
                <span>Opérationnel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getStatusColor('maintenance_needed') }}></div>
                <span>Maintenance requise</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getStatusColor('out_of_service') }}></div>
                <span>Hors service</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: getStatusColor('scheduled_maintenance') }}></div>
                <span>Maintenance planifiée</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}