import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Ship, AlertTriangle, Wrench, Clock } from 'lucide-react';

interface FleetKPIGridProps {
  totalBoats: number;
  urgentOilChanges: number;
  expiredControls: number;
  overdueInterventions: number;
}

export const FleetKPIGrid: React.FC<FleetKPIGridProps> = ({
  totalBoats,
  urgentOilChanges,
  expiredControls,
  overdueInterventions
}) => {
  const kpis = [
    {
      title: 'Total Flotte',
      value: totalBoats,
      icon: Ship,
      color: 'bg-primary',
      description: 'Bateaux dans la flotte'
    },
    {
      title: 'Vidanges Urgentes',
      value: urgentOilChanges,
      icon: Wrench,
      color: 'bg-destructive',
      description: 'Nécessitent une vidange'
    },
    {
      title: 'Contrôles Expirés',
      value: expiredControls,
      icon: AlertTriangle,
      color: 'bg-accent',
      description: 'Contrôles de sécurité'
    },
    {
      title: 'Interventions en Retard',
      value: overdueInterventions,
      icon: Clock,
      color: 'bg-muted',
      description: 'Actions en attente'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="card-hover">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {kpi.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.description}
                </p>
              </div>
              <div className={`p-3 rounded-full ${kpi.color} flex-shrink-0`}>
                <kpi.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};