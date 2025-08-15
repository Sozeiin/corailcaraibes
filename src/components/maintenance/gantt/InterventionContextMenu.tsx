import React from 'react';
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Context menu triggered:', intervention.title);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger 
        onContextMenu={handleContextMenu}
        className="block"
        asChild
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onViewDetails} className="cursor-pointer">
          <Eye className="mr-2 h-4 w-4" />
          Voir les détails
        </ContextMenuItem>
        
        {canEdit && (
          <>
            <ContextMenuItem onClick={onEdit} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuSub>
              <ContextMenuSubTrigger className="cursor-pointer">
                <RotateCcw className="mr-2 h-4 w-4" />
                Changer le statut
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-48">
                {statusOptions.map((status) => {
                  const StatusIcon = status.icon;
                  return (
                    <ContextMenuItem
                      key={status.value}
                      onClick={() => onStatusChange(status.value)}
                      disabled={intervention.status === status.value}
                      className="cursor-pointer"
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
                <ContextMenuSubTrigger className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  Réassigner
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-48">
                  <ContextMenuItem
                    onClick={() => onReassign('')}
                    className="cursor-pointer"
                  >
                    <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                    Non assigné
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  {technicians.map((technician) => (
                    <ContextMenuItem
                      key={technician.id}
                      onClick={() => onReassign(technician.id)}
                      disabled={intervention.technician_id === technician.id}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      {technician.name}
                      {intervention.technician_id === technician.id && (
                        <CheckCircle className="ml-auto h-3 w-3 text-green-600" />
                      )}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={onWeatherEvaluation} className="cursor-pointer">
          <Cloud className="mr-2 h-4 w-4" />
          Évaluation météo
        </ContextMenuItem>
        
        {canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={onDelete} 
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}