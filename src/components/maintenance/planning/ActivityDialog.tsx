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

interface PlanningActivity {
  id: string;
  activity_type: 'maintenance' | 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency';
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

export function ActivityDialog({ open, onOpenChange, activity, technicians }: ActivityDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activity_type: 'maintenance' as 'maintenance' | 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency',
    priority: 'medium',
    estimated_duration: 60,
    technician_id: '',
    boat_id: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (activity) {
      setFormData({
        title: activity.title,
        description: activity.description || '',
        activity_type: activity.activity_type,
        priority: activity.priority,
        estimated_duration: activity.estimated_duration,
        technician_id: activity.technician_id || '',
        boat_id: activity.boat_id || '',
        notes: activity.notes || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        activity_type: 'maintenance',
        priority: 'medium',
        estimated_duration: 60,
        technician_id: '',
        boat_id: '',
        notes: ''
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
    
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(8, 0, 0, 0); // Default to 8 AM
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + formData.estimated_duration);

    const activityData = {
      ...formData,
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      base_id: '550e8400-e29b-41d4-a716-446655440001', // Default base ID
      color_code: getActivityColor(formData.activity_type),
      technician_id: formData.technician_id || null,
      boat_id: formData.boat_id || null
    };

    if (activity) {
      updateActivityMutation.mutate({ id: activity.id, data: activityData });
    } else {
      createActivityMutation.mutate(activityData);
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'maintenance': return '#3b82f6';
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
                  <SelectItem value="maintenance">Maintenance</SelectItem>
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

          <div>
            <Label htmlFor="duration">Durée estimée (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              max="480"
              value={formData.estimated_duration}
              onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
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
                <SelectItem value="">Aucun (non assigné)</SelectItem>
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