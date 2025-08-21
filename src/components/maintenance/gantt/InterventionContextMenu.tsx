import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={onViewDetails}>
          <Eye className="mr-2 h-4 w-4" />
          Voir les détails
        </ContextMenuItem>
        
        {canEdit && (
          <>
            <ContextMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <RotateCcw className="mr-2 h-4 w-4" />
                Changer le statut
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {statusOptions.map((status) => {
                  const StatusIcon = status.icon;
                  return (
                    <ContextMenuItem
                      key={status.value}
                      onClick={() => onStatusChange(status.value)}
                      className={intervention.status === status.value ? 'bg-accent' : ''}
                    >
                      <StatusIcon className={`mr-2 h-4 w-4 ${status.color}`} />
                      {status.label}
                      {intervention.status === status.value && (
                        <CheckCircle className="ml-auto h-3 w-3 text-green-600" />
                      )}
                    </ContextMenuItem>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>

            {canReassign && technicians.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Users className="mr-2 h-4 w-4" />
                  Réassigner
                  {lastDroppedTechnician && (
                    <div className="ml-auto">
                      <AlertCircle className="h-3 w-3 text-blue-600" />
                    </div>
                  )}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => onReassign('')}>
                    <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                    Non assigné
                  </ContextMenuItem>
                  {technicians.map((technician) => (
                    <ContextMenuItem
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
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onWeatherEvaluation}>
          <Cloud className="mr-2 h-4 w-4" />
          Évaluation météo
        </ContextMenuItem>
        
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}