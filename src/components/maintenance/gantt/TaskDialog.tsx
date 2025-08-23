import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Ship, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  estimated_duration?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  intervention_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  technician_id?: string;
  boat_id?: string;
  boats?: { id: string; name: string; model: string };
}

interface Technician {
  id: string;
  name: string;
  role: string;
}

interface TaskDialogProps {
  task?: Task | null;
  isOpen: boolean;
  onClose: () => void;
  technicians: Technician[];
  onTaskCreated?: () => void;
}

export function TaskDialog({ task, isOpen, onClose, technicians, onTaskCreated }: TaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state for new task creation
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    intervention_type: '',
    priority: 'medium' as const,
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00'
  });

  const handleCreateTask = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre est obligatoire",
        variant: "destructive"
      });
      return;
    }

    if (!user?.baseId) {
      toast({
        title: "Erreur",
        description: "Base non définie",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('interventions')
        .insert({
          title: formData.title,
          description: formData.description || null,
          intervention_type: formData.intervention_type || 'maintenance',
          priority: formData.priority,
          status: 'scheduled',
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time,
          base_id: user.baseId,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Tâche de maintenance créée avec succès"
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        intervention_type: '',
        priority: 'medium',
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: '09:00'
      });

      onTaskCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la création de la tâche",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programmée';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  if (!task) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche de maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input 
                id="title" 
                placeholder="Entrez le titre de la tâche"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Description détaillée"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduled_date">Date</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="scheduled_time">Heure</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={formData.intervention_type} 
                  onValueChange={(value) => setFormData({ ...formData, intervention_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de maintenance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oil">Vidange</SelectItem>
                    <SelectItem value="engine">Moteur</SelectItem>
                    <SelectItem value="electrical">Électrique</SelectItem>
                    <SelectItem value="mechanical">Mécanique</SelectItem>
                    <SelectItem value="emergency">Urgence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priorité</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleCreateTask} disabled={isCreating}>
                {isCreating ? 'Création...' : 'Créer la tâche'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            <Badge className={getStatusColor(task.status)}>
              {getStatusLabel(task.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Task details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(task.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
            {task.scheduled_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{task.scheduled_time.slice(0, 5)}</span>
                {task.estimated_duration && (
                  <span className="text-muted-foreground">
                    ({task.estimated_duration}min)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Boat info */}
          {task.boats && (
            <div className="flex items-center gap-2 text-sm">
              <Ship className="h-4 w-4 text-muted-foreground" />
              <span>{task.boats.name} - {task.boats.model}</span>
            </div>
          )}

          {/* Technician */}
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>
              {task.technician_id ? 
                technicians.find(t => t.id === task.technician_id)?.name || 'Technicien inconnu' :
                'Non assigné'
              }
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {task.description}
              </p>
            </div>
          )}

          {/* Priority */}
          {task.priority && (
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Priorité:</Label>
              <Badge
                variant={task.priority === 'urgent' || task.priority === 'high' ? 'destructive' : 'secondary'}
              >
                {task.priority}
              </Badge>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button>Modifier</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}