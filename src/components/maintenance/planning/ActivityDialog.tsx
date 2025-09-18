import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Ship, Calendar } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PlanningActivity {
  id: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency' | 'preparation';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  title: string;
  description?: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_duration: number;
  technician_id?: string;
  boat_id?: string;
  base_id: string;
  priority: string;
  color_code: string;
  checklist_completed: boolean;
  delay_minutes: number;
  performance_rating?: number;
  notes?: string;
}

interface Technician {
  id: string;
  name: string;
  role: string;
}

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: PlanningActivity | null;
  technicians: Technician[];
}

interface ActivityFormData {
  title: string;
  description: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency' | 'preparation';
  priority: string;
  estimated_duration: number;
  technician_id: string;
  boat_id: string;
  notes: string;
  scheduled_date: string;
  scheduled_time: string;
}

export function ActivityDialog({ open, onOpenChange, activity, technicians }: ActivityDialogProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    title: '',
    description: '',
    activity_type: 'checkin',
    priority: 'medium',
    estimated_duration: 60,
    technician_id: 'unassigned',
    boat_id: '',
    notes: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '09:00'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Debug logging
  console.log('ActivityDialog render:', { open, user: user?.baseId, technicians: technicians.length });

  // Early return if no user or baseId
  if (!user || !user.baseId) {
    console.log('ActivityDialog: No user or baseId, returning null');
    return null;
  }

  useEffect(() => {
    if (activity) {
      const activityDate = new Date(activity.scheduled_start);
      setFormData({
        title: activity.title,
        description: activity.description || '',
        activity_type: activity.activity_type,
        priority: activity.priority,
        estimated_duration: activity.estimated_duration,
        technician_id: activity.technician_id || 'unassigned',
        boat_id: activity.boat_id || '',
        notes: activity.notes || '',
        scheduled_date: activityDate.toISOString().split('T')[0],
        scheduled_time: activityDate.toTimeString().substring(0, 5)
      });
    } else {
      setFormData({
        title: '',
        description: '',
        activity_type: 'checkin',
        priority: 'medium',
        estimated_duration: 60,
        technician_id: 'unassigned',
        boat_id: '',
        notes: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: '09:00'
      });
    }
  }, [activity]);

  const createActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('planning_activities')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-activities'] });
      toast({
        title: "Activité créée",
        description: "L'activité a été créée avec succès.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'activité.",
        variant: "destructive",
      });
    }
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('planning_activities')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-activities'] });
      toast({
        title: "Activité mise à jour",
        description: "L'activité a été mise à jour avec succès.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'activité.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate start and end times using the form data
    const [hours, minutes] = formData.scheduled_time.split(':').map(Number);
    const startTime = new Date(formData.scheduled_date);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + formData.estimated_duration);

    const activityData = {
      title: formData.title,
      description: formData.description,
      activity_type: formData.activity_type,
      priority: formData.priority,
      estimated_duration: formData.estimated_duration,
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      base_id: user.baseId,
      color_code: getActivityColor(formData.activity_type),
      technician_id: formData.technician_id === 'unassigned' ? null : formData.technician_id,
      boat_id: formData.boat_id || null,
      notes: formData.notes || null
    };

    if (activity) {
      updateActivityMutation.mutate({ id: activity.id, data: activityData });
    } else {
      createActivityMutation.mutate(activityData);
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'checkin': return '#10b981';
      case 'checkout': return '#f59e0b';
      case 'emergency': return '#ef4444';
      case 'travel': return '#6b7280';
      case 'break': return '#8b5cf6';
      default: return '#3b82f6';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {activity ? 'Modifier l\'activité' : 'Nouvelle activité'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type d'activité</Label>
              <Select
                value={formData.activity_type}
                onValueChange={(value: any) => setFormData({ ...formData, activity_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkin">Check-in</SelectItem>
                  <SelectItem value="checkout">Check-out</SelectItem>
                  <SelectItem value="travel">Déplacement</SelectItem>
                  <SelectItem value="break">Pause</SelectItem>
                  <SelectItem value="emergency">Urgence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priorité</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Faible</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled_date">Date</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="scheduled_time">Heure de début</Label>
              <Input
                id="scheduled_time"
                type="time"
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="duration">Durée estimée (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              max="480"
              value={formData.estimated_duration}
              onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label>Technicien</Label>
            <Select
              value={formData.technician_id}
              onValueChange={(value) => setFormData({ ...formData, technician_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un technicien" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Aucun (non assigné)</SelectItem>
                {technicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {activity ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}