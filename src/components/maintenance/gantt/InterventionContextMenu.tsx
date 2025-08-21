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
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(
    lastDroppedTechnician || intervention.technician_id || ''
  );
  
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
    
    try {
      console.log('InterventionContextMenu handleContextMenu called:', intervention.title);
      console.log('lastDroppedTechnician:', lastDroppedTechnician);
      console.log('intervention.technician_id:', intervention.technician_id);
      
      // Mettre à jour le technicien sélectionné avec le dernier technicien sur lequel l'intervention a été déplacée
      const newSelectedTechnicianId = lastDroppedTechnician || intervention.technician_id || '';
      console.log('Setting selectedTechnicianId to:', newSelectedTechnicianId);
      setSelectedTechnicianId(newSelectedTechnicianId);
      
      setPosition({ x: e.clientX, y: e.clientY });
      setIsOpen(true);
    } catch (error) {
      console.error('Error in handleContextMenu:', error);
    }
  };

  const handleReassignWithDropdown = () => {
    try {
      console.log('handleReassignWithDropdown called with:', selectedTechnicianId);
      onReassign(selectedTechnicianId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error in handleReassignWithDropdown:', error);
    }
  };

  // Clone children and add onContextMenu
  const childrenWithContextMenu = React.cloneElement(children as React.ReactElement, {
    onContextMenu: (e: React.MouseEvent) => {
      console.log('childrenWithContextMenu onContextMenu:', intervention.title);
      handleContextMenu(e);
    },
  });

  return (
    <>
      {childrenWithContextMenu}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50" 
          onClick={() => setIsOpen(false)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div 
            className="absolute bg-popover border border-border rounded-md shadow-lg p-1 z-50"
            style={{ 
              left: Math.min(position.x, window.innerWidth - 200), 
              top: Math.min(position.y, window.innerHeight - 300),
              minWidth: '200px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              onClick={onViewDetails} 
              className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              Voir les détails
            </div>
            
            {canEdit && (
              <>
                <div 
                  onClick={onEdit} 
                  className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </div>
                
                <div className="h-px bg-border my-1" />
                
                {/* Status submenu */}
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Changer le statut
                  </div>
                  <div className="ml-6 mt-1 space-y-1">
                    {statusOptions.map((status) => {
                      const StatusIcon = status.icon;
                      return (
                        <div
                          key={status.value}
                          onClick={() => onStatusChange(status.value)}
                          className={`flex items-center px-2 py-1 text-sm rounded-sm cursor-pointer ${
                            intervention.status === status.value 
                              ? 'bg-accent text-accent-foreground' 
                              : 'hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          <StatusIcon className={`mr-2 h-4 w-4 ${status.color}`} />
                          {status.label}
                          {intervention.status === status.value && (
                            <CheckCircle className="ml-auto h-3 w-3 text-green-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {canReassign && technicians.length > 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center mb-2">
                      <Users className="mr-2 h-4 w-4" />
                      Réassigner
                    </div>
                    <div className="ml-6">
                      <Select 
                        value={selectedTechnicianId} 
                        onValueChange={setSelectedTechnicianId}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="Sélectionner un technicien" />
                        </SelectTrigger>
                        <SelectContent className="z-[60]">
                          <SelectItem value="">
                            <div className="flex items-center">
                              <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                              Non assigné
                            </div>
                          </SelectItem>
                          {technicians.map((technician) => (
                            <SelectItem key={technician.id} value={technician.id}>
                              <div className="flex items-center">
                                <Users className="mr-2 h-4 w-4" />
                                {technician.name}
                                {intervention.technician_id === technician.id && (
                                  <CheckCircle className="ml-auto h-3 w-3 text-green-600" />
                                )}
                                {lastDroppedTechnician === technician.id && intervention.technician_id !== technician.id && (
                                  <div title="Dernier drag & drop">
                                    <AlertCircle className="ml-auto h-3 w-3 text-blue-600" />
                                  </div>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={handleReassignWithDropdown}
                        className="w-full mt-2 h-7 text-xs"
                        disabled={selectedTechnicianId === intervention.technician_id}
                      >
                        Confirmer
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            
            <div className="h-px bg-border my-1" />
            
            <div 
              onClick={onWeatherEvaluation} 
              className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <Cloud className="mr-2 h-4 w-4" />
              Évaluation météo
            </div>
            
            {canDelete && (
              <>
                <div className="h-px bg-border my-1" />
                <div 
                  onClick={onDelete} 
                  className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-destructive hover:text-destructive-foreground cursor-pointer text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}