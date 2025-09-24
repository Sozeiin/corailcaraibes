import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Wrench, AlertTriangle, Search, Shield, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
  intervention_type?: string;
  boats?: { id: string; name: string; model: string };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  technician_id?: string;
}

interface SimpleDraggableTaskProps {
  task: Task;
  onClick?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

const getTypeConfig = (type: string) => {
  const configs = {
    preventive: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: Shield,
      label: 'Préventive'
    },
    corrective: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Wrench,
      label: 'Corrective'
    },
    emergency: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: AlertTriangle,
      label: 'Urgence'
    },
    inspection: {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: Search,
      label: 'Inspection'
    },
    repair: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: Settings,
      label: 'Réparation'
    },
    maintenance: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Wrench,
      label: 'Maintenance'
    }
  };
  
  return configs[type as keyof typeof configs] || configs.maintenance;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'in_progress': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'completed': return 'bg-green-50 text-green-700 border-green-200';
    case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'scheduled': return 'Planifiée';
    case 'in_progress': return 'En cours';
    case 'completed': return 'Terminée';
    case 'cancelled': return 'Annulée';
    default: return status;
  }
};

export function SimpleDraggableTask({ task, onClick, onContextMenu }: SimpleDraggableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

  const typeConfig = getTypeConfig(task.intervention_type || 'maintenance');
  const TypeIcon = typeConfig.icon;

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onClick?.(task);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDragging) {
      onContextMenu?.(e, task);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md
        ${isDragging ? 'opacity-50 scale-105 shadow-lg' : ''}
        border-l-4 ${typeConfig.color.split(' ')[2]}
      `}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{task.title}</h4>
            {task.boats && (
              <p className="text-xs text-muted-foreground">
                {task.boats.name}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {typeConfig.label}
            </Badge>
            <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </Badge>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {task.scheduled_time ? 
                format(new Date(`2000-01-01T${task.scheduled_time}`), 'HH:mm', { locale: fr }) :
                'Non planifié'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}