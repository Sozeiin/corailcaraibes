import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Edit, 
  RotateCcw, 
  Users, 
  Cloud, 
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Intervention {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  intervention_type?: string;
  technician_id?: string;
  boat_id?: string;
  boats?: { id: string; name: string; model: string };
  profiles?: { first_name: string; last_name: string };
}

interface Technician {
  id: string;
  name: string;
  role: string;
}

interface InterventionContextMenuProps {
  intervention: Intervention;
  technicians: Technician[];
  lastDroppedTechnician?: string | null;
  children: React.ReactNode;
  onViewDetails: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onReassign: (technicianId: string) => void;
  onDelete: () => void;
  onWeatherEvaluation: () => void;
}

export function InterventionContextMenu({
  intervention,
  technicians,
  lastDroppedTechnician,
  children,
  onViewDetails,
  onEdit,
  onStatusChange,
  onReassign,
  onDelete,
  onWeatherEvaluation,
}: InterventionContextMenuProps) {
  const { user } = useAuth();
  
  const canEdit = user?.role === 'direction' || user?.role === 'chef_base';
  const canDelete = user?.role === 'direction' || user?.role === 'chef_base';
  const canReassign = user?.role === 'direction' || user?.role === 'chef_base';

  const statusOptions = [
    { value: 'scheduled', label: 'Programmé', icon: Clock, color: 'text-blue-600' },
    { value: 'in_progress', label: 'En cours', icon: AlertCircle, color: 'text-orange-600' },
    { value: 'completed', label: 'Terminé', icon: CheckCircle, color: 'text-green-600' },
    { value: 'cancelled', label: 'Annulé', icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {React.cloneElement(children as React.ReactElement, {
          onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Right click on intervention:', intervention.title);
            // Trigger the dropdown menu programmatically
            (e.currentTarget as HTMLElement).click();
          },
        })}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuItem onClick={onViewDetails}>
          <Eye className="mr-2 h-4 w-4" />
          Voir les détails
        </DropdownMenuItem>
        
        {canEdit && (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RotateCcw className="mr-2 h-4 w-4" />
                Changer le statut
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {statusOptions.map((status) => {
                  const StatusIcon = status.icon;
                  return (
                    <DropdownMenuItem
                      key={status.value}
                      onClick={() => onStatusChange(status.value)}
                      className={intervention.status === status.value ? 'bg-accent' : ''}
                    >
                      <StatusIcon className={`mr-2 h-4 w-4 ${status.color}`} />
                      {status.label}
                      {intervention.status === status.value && (
                        <CheckCircle className="ml-auto h-3 w-3 text-green-600" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {canReassign && technicians.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Users className="mr-2 h-4 w-4" />
                  Réassigner
                  {lastDroppedTechnician && (
                    <div className="ml-auto">
                      <AlertCircle className="h-3 w-3 text-blue-600" />
                    </div>
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onReassign('')}>
                    <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                    Non assigné
                  </DropdownMenuItem>
                  {technicians.map((technician) => (
                    <DropdownMenuItem
                      key={technician.id}
                      onClick={() => onReassign(technician.id)}
                      className={intervention.technician_id === technician.id ? 'bg-accent' : ''}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {technician.name}
                      <div className="ml-auto flex items-center gap-1">
                        {intervention.technician_id === technician.id && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                        {lastDroppedTechnician === technician.id && intervention.technician_id !== technician.id && (
                          <div title="Dernier drag & drop">
                            <AlertCircle className="h-3 w-3 text-blue-600" />
                          </div>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={onWeatherEvaluation}>
          <Cloud className="mr-2 h-4 w-4" />
          Évaluation météo
        </DropdownMenuItem>
        
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}