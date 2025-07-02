import React from 'react';
import { BookOpen, Settings, Eye } from 'lucide-react';
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

interface MaintenanceManual {
  id: string;
  boatModel: string;
  manufacturer: string;
  tasks: {
    name: string;
    interval: number;
    unit: string;
  }[];
}

interface ManualMaintenanceTableProps {
  manuals: MaintenanceManual[];
  isLoading: boolean;
  canManage: boolean;
}

export function ManualMaintenanceTable({ manuals, isLoading, canManage }: ManualMaintenanceTableProps) {
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (manuals.length === 0) {
    return (
      <div className="p-8 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun manuel</h3>
        <p className="text-gray-500">Commencez par ajouter les manuels constructeur.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modèle</TableHead>
            <TableHead>Constructeur</TableHead>
            <TableHead>Tâches de maintenance</TableHead>
            <TableHead>Bateaux concernés</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {manuals.map((manual) => (
            <TableRow key={manual.id}>
              <TableCell className="font-medium">
                {manual.boatModel}
              </TableCell>
              <TableCell>
                {manual.manufacturer}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {manual.tasks.slice(0, 3).map((task, index) => (
                    <Badge key={index} variant="outline" className="mr-1">
                      {task.name} ({task.interval} {task.unit})
                    </Badge>
                  ))}
                  {manual.tasks.length > 3 && (
                    <Badge variant="secondary">
                      +{manual.tasks.length - 3} autres
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  0 bateau(x)
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
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