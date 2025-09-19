import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, Ship, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface BoatPreparation {
  id: string;
  boat: {
    id: string;
    name: string;
    model: string;
  };
  status: 'in_progress' | 'ready' | 'anomaly';
  technician_id?: string;
  planning_activity: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
  };
  anomalies_count: number;
  created_at: string;
}

interface CreatePreparationData {
  boat_id: string;
  template_id?: string;
  scheduled_start: string;
  scheduled_end: string;
  notes?: string;
}

export function BoatPreparationManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPreparation, setNewPreparation] = useState<Partial<CreatePreparationData>>({});

  // Fetch boats
  const { data: boats = [] } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('id, name, model, status')
        .eq('status', 'available')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch preparation templates
  const { data: templates = [] } = useQuery({
    queryKey: ['preparation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preparation_checklist_templates')
        .select('*')
        .or(`base_id.eq.${user?.baseId},base_id.is.null`)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Create preparation mutation - simplified for Chef de base
  const createPreparationMutation = useMutation({
    mutationFn: async (data: { boat_id: string; template_id?: string; notes?: string }) => {
      // Create unassigned planning activity for drag & drop assignment
      const boatName = boats.find(b => b.id === data.boat_id)?.name || '';
      
      const { data: activity, error: activityError } = await supabase
        .from('planning_activities')
        .insert({
          activity_type: 'preparation',
          title: `Préparation ${boatName}`,
          description: data.notes,
          boat_id: data.boat_id,
          base_id: user?.baseId,
          status: 'planned',
          priority: 'medium',
          color_code: '#10b981',
          // No scheduled times - will be set via drag & drop
          scheduled_start: new Date().toISOString(),
          scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2h default
          estimated_duration: 120 // 2 hours
        })
        .select()
        .single();
      
      if (activityError) throw activityError;

      // Create the preparation checklist
      const { data: preparation, error: prepError } = await supabase
        .from('boat_preparation_checklists')
        .insert({
          planning_activity_id: activity.id,
          boat_id: data.boat_id,
          template_id: data.template_id,
          status: 'in_progress'
        })
        .select()
        .single();
      
      if (prepError) throw prepError;
      return preparation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-activities'] });
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      setIsCreateDialogOpen(false);
      setNewPreparation({});
      toast.success('Ordre de préparation créé - disponible dans les tâches non assignées');
    },
    onError: (error) => {
      console.error('Error creating preparation:', error);
      toast.error('Erreur lors de la création de l\'ordre de préparation');
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'ready':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Prêt</Badge>;
      case 'anomaly':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Anomalie</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreatePreparation = () => {
    if (!newPreparation.boat_id) {
      toast.error('Veuillez sélectionner un bateau');
      return;
    }
    createPreparationMutation.mutate({
      boat_id: newPreparation.boat_id,
      template_id: newPreparation.template_id,
      notes: newPreparation.notes
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Ordres de préparation</h2>
          <p className="text-gray-600">Créez des ordres qui apparaîtront dans le planning pour assignation</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvel ordre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un ordre de préparation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="boat_id">Bateau *</Label>
                <Select 
                  value={newPreparation.boat_id || ''} 
                  onValueChange={(value) => setNewPreparation(prev => ({ ...prev, boat_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un bateau" />
                  </SelectTrigger>
                  <SelectContent>
                    {boats.map((boat) => (
                      <SelectItem key={boat.id} value={boat.id}>
                        {boat.name} ({boat.model})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template_id">Modèle de checklist</Label>
                <Select 
                  value={newPreparation.template_id || ''} 
                  onValueChange={(value) => setNewPreparation(prev => ({ ...prev, template_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Instructions particulières</Label>
                <Textarea
                  placeholder="Notes pour le technicien..."
                  value={newPreparation.notes || ''}
                  onChange={(e) => setNewPreparation(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="text-blue-800">
                  L'ordre sera créé sans assignation. Utilisez le planning pour l'assigner à un technicien via drag & drop.
                </p>
              </div>

              <Button 
                onClick={handleCreatePreparation} 
                className="w-full"
                disabled={createPreparationMutation.isPending}
              >
                {createPreparationMutation.isPending ? 'Création...' : 'Créer l\'ordre'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="text-center py-8">
          <Ship className="w-12 h-12 mx-auto text-primary mb-4" />
          <h3 className="text-lg font-medium mb-2">Organisation via le Planning</h3>
          <p className="text-gray-600 mb-4">
            Les ordres de préparation apparaissent dans le planning intelligent.<br />
            Utilisez le drag & drop pour les assigner aux techniciens.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/planning'}>
            Aller au Planning
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}