import React from 'react';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ScheduledMaintenance {
  id: string;
  title: string;
  boat_id: string;
  priority: string;
  estimated_duration: number;
  created_at: string;
  boats?: {
    name: string;
    model: string;
  };
}

interface ScheduledMaintenanceTableProps {
  maintenances: ScheduledMaintenance[];
  isLoading: boolean;
  canManage: boolean;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const priorityLabels = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente'
};

export function ScheduledMaintenanceTable({ maintenances, isLoading, canManage }: ScheduledMaintenanceTableProps) {
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (maintenances.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune maintenance programmée</h3>
        <p className="text-gray-500">Les maintenances seront automatiquement programmées selon les manuels.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tâche</TableHead>
            <TableHead>Bateau</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Durée estimée</TableHead>
            <TableHead>Programmée le</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {maintenances.map((maintenance) => (
            <TableRow key={maintenance.id}>
              <TableCell className="font-medium">
                {maintenance.title}
              </TableCell>
              <TableCell>
                {maintenance.boats ? (
                  <div>
                    <div>{maintenance.boats.name}</div>
                    <div className="text-sm text-gray-500">{maintenance.boats.model}</div>
                  </div>
                ) : (
                  <span className="text-gray-400">Bateau non trouvé</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={priorityColors[maintenance.priority as keyof typeof priorityColors] || priorityColors.medium}>
                  {priorityLabels[maintenance.priority as keyof typeof priorityLabels] || maintenance.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {maintenance.estimated_duration}h
                </div>
              </TableCell>
              <TableCell>
                {new Date(maintenance.created_at).toLocaleDateString('fr-FR')}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-marine-600 text-white hover:bg-marine-700"
                  >
                    Programmer
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}