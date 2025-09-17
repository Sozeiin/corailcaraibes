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
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch active preparations
  const { data: preparations = [] } = useQuery({
    queryKey: ['boat-preparations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_preparation_checklists')
        .select(`
          id,
          status,
          technician_id,
          anomalies_count,
          created_at,
          boat:boats!inner(id, name, model),
          planning_activity:planning_activities!inner(id, title, scheduled_start, scheduled_end)
        `)
        .in('status', ['in_progress', 'anomaly'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BoatPreparation[];
    }
  });

  // Create preparation mutation
  const createPreparationMutation = useMutation({
    mutationFn: async (data: CreatePreparationData) => {
      // First create the planning activity
      const { data: activity, error: activityError } = await supabase
        .from('planning_activities')
        .insert({
          activity_type: 'preparation',
          title: `Préparation ${boats.find(b => b.id === data.boat_id)?.name || ''}`,
          description: data.notes,
          scheduled_start: data.scheduled_start,
          scheduled_end: data.scheduled_end,
          boat_id: data.boat_id,
          base_id: user?.base_id,
          status: 'planned',
          priority: 'medium',
          color_code: '#10b981'
        })
        .select()
        .single();
      
      if (activityError) throw activityError;

      // Then create the preparation checklist
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
      queryClient.invalidateQueries({ queryKey: ['boat-preparations'] });
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      setIsCreateDialogOpen(false);
      setNewPreparation({});
      toast.success('Ordre de préparation créé avec succès');
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
    if (!newPreparation.boat_id || !newPreparation.scheduled_start || !newPreparation.scheduled_end) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    createPreparationMutation.mutate(newPreparation as CreatePreparationData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestion des préparations</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle préparation
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduled_start">Début prévu *</Label>
                  <Input
                    type="datetime-local"
                    value={newPreparation.scheduled_start || ''}
                    onChange={(e) => setNewPreparation(prev => ({ ...prev, scheduled_start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="scheduled_end">Fin prévue *</Label>
                  <Input
                    type="datetime-local"
                    value={newPreparation.scheduled_end || ''}
                    onChange={(e) => setNewPreparation(prev => ({ ...prev, scheduled_end: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  placeholder="Instructions particulières..."
                  value={newPreparation.notes || ''}
                  onChange={(e) => setNewPreparation(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button 
                onClick={handleCreatePreparation} 
                className="w-full"
                disabled={createPreparationMutation.isPending}
              >
                {createPreparationMutation.isPending ? 'Création...' : 'Créer la préparation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {preparations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Ship className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune préparation en cours</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {preparations.map((prep) => (
            <Card key={prep.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">
                  {prep.boat.name} ({prep.boat.model})
                </CardTitle>
                {getStatusBadge(prep.status)}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Planifiée</p>
                    <p>{new Date(prep.planning_activity.scheduled_start).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Fin prévue</p>
                    <p>{new Date(prep.planning_activity.scheduled_end).toLocaleString()}</p>
                  </div>
                  {prep.anomalies_count > 0 && (
                    <div className="col-span-2">
                      <Badge variant="destructive" className="mr-2">
                        {prep.anomalies_count} anomalie{prep.anomalies_count > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}