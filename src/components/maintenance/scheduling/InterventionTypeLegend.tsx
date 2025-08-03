import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Wrench, AlertTriangle, Search, Settings } from 'lucide-react';

const interventionTypes = [
  {
    type: 'preventive',
    label: 'Préventive',
    icon: Shield,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Maintenance préventive planifiée'
  },
  {
    type: 'corrective',
    label: 'Corrective',
    icon: Wrench,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Correction de problèmes identifiés'
  },
  {
    type: 'emergency',
    label: 'Urgence',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Intervention d\'urgence'
  },
  {
    type: 'inspection',
    label: 'Inspection',
    icon: Search,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Contrôle et inspection'
  },
  {
    type: 'repair',
    label: 'Réparation',
    icon: Settings,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'Réparation de composants'
  }
];

export function InterventionTypeLegend() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Types d'interventions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {interventionTypes.map((type) => {
          const Icon = type.icon;
          return (
            <div key={type.type} className="flex items-center gap-3">
              <Badge variant="outline" className={`${type.color} text-xs`}>
                <Icon className="w-3 h-3 mr-1" />
                {type.label}
              </Badge>
              <span className="text-xs text-muted-foreground flex-1">
                {type.description}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}