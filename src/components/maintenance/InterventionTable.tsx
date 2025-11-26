import React from 'react';
import { Edit, Eye, Clock, User, Calendar } from 'lucide-react';
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
import { Intervention } from '@/types';

interface InterventionTableProps {
  interventions: Intervention[];
  isLoading: boolean;
  onEdit: (intervention: Intervention) => void;
  canManage: boolean;
  showHistory?: boolean;
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const statusLabels = {
  scheduled: 'Programmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export function InterventionTable({ 
  interventions, 
  isLoading, 
  onEdit, 
  canManage, 
  showHistory = false 
}: InterventionTableProps) {
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (interventions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {showHistory ? 'Aucun historique' : 'Aucune intervention'}
        </h3>
        <p className="text-gray-500">
          {showHistory 
            ? 'Aucune intervention terminée pour la période sélectionnée.'
            : 'Commencez par créer votre première intervention.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Intervention</TableHead>
            <TableHead>Bateau</TableHead>
            <TableHead>Technicien</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date programmée</TableHead>
            {showHistory && <TableHead>Date terminée</TableHead>}
            <TableHead>Durée</TableHead>
            {canManage && !showHistory && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {interventions.map((intervention) => (
            <TableRow key={intervention.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{intervention.title}</div>
                  {intervention.description && (
                    <div className="text-sm text-gray-600 truncate max-w-xs">
                      {intervention.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {intervention.boat?.name}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <User className="h-3 w-3" />
                  {intervention.technician?.name || (intervention as any).technician_name || 'Non assigné'}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[intervention.status as keyof typeof statusColors]}>
                  {statusLabels[intervention.status as keyof typeof statusLabels]}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3 w-3" />
                  {intervention.scheduledDate 
                    ? new Date(intervention.scheduledDate).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </div>
              </TableCell>
              {showHistory && (
                <TableCell>
                  {intervention.completedDate 
                    ? new Date(intervention.completedDate).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  {intervention.scheduledDate && intervention.completedDate
                    ? Math.ceil(
                        (new Date(intervention.completedDate).getTime() - 
                         new Date(intervention.scheduledDate).getTime()) / 
                        (1000 * 60 * 60 * 24)
                      ) + 'j'
                    : '-'
                  }
                </div>
              </TableCell>
              {canManage && !showHistory && (
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(intervention)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(intervention)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}