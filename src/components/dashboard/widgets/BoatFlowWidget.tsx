import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMemo, useState } from 'react';
import { Ship, Clock, AlertTriangle, Plus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const BoatFlowWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dashboardData = useDashboardData();
  const [showPreparationDialog, setShowPreparationDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [newPreparation, setNewPreparation] = useState({ boat_id: '', template_id: '', notes: '' });

  const flowData = useMemo(() => {
    if (dashboardData.loading) return null;

    const { boats } = dashboardData;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Simulate returning boats and preparation orders based on boat status
    const returningBoats = boats.filter(b => b.status === 'rented').length;
    const preparationsInProgress = boats.filter(b => b.status === 'maintenance').length;
    const readyBoats = boats.filter(b => b.status === 'available').length;
    const overduePreparations = boats.filter(b => 
      b.status === 'maintenance' && b.next_maintenance && new Date(b.next_maintenance) < today
    ).length;

    return {
      returningBoats,
      preparationsInProgress,
      readyBoats,
      overduePreparations,
      totalBoats: boats.length
    };
  }, [dashboardData]);

  // Fetch boats for preparation dialog
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
    },
    enabled: showPreparationDialog
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
      return data || [];
    },
    enabled: showPreparationDialog
  });

  // Fetch unassigned orders for assignment
  const { data: unassignedOrders = [] } = useQuery({
    queryKey: ['unassigned-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_activities')
        .select(`
          *,
          boat:boats(id, name, model)
        `)
        .eq('activity_type', 'preparation')
        .is('technician_id', null)
        .eq('status', 'planned')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: showAssignDialog
  });

  // Récupérer les techniciens depuis la base de données
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians', user?.baseId],
    queryFn: async () => {
      if (user?.role === 'direction') {
        const { data } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('role', 'technicien');
        return data || [];
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('role', 'technicien')
          .eq('base_id', user?.baseId);
        return data || [];
      }
    },
    enabled: showAssignDialog && !!user?.id,
  });

  // Create preparation mutation
  const createPreparationMutation = useMutation({
    mutationFn: async (data: { boat_id: string; template_id?: string; notes?: string }) => {
      const boatName = boats.find(b => b.id === data.boat_id)?.name || '';
      const templateName = templates.find(t => t.id === data.template_id)?.name;
      
      const { data: activity, error: activityError } = await supabase
        .from('planning_activities')
        .insert({
          activity_type: 'preparation',
          title: `${templateName || 'Préparation'} ${boatName}`,
          description: data.notes,
          boat_id: data.boat_id,
          base_id: user?.baseId,
          status: 'planned',
          priority: 'medium',
          color_code: '#10b981',
          scheduled_start: new Date().toISOString(),
          scheduled_end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          estimated_duration: 120
        })
        .select()
        .single();
      
      if (activityError) throw activityError;

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
      setShowPreparationDialog(false);
      setNewPreparation({ boat_id: '', template_id: '', notes: '' });
      toast.success('Ordre de préparation créé');
    },
    onError: (error) => {
      console.error('Error creating preparation:', error);
      toast.error('Erreur lors de la création de l\'ordre de préparation');
    }
  });

  // Assign technician mutation
  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ orderId, technicianId }: { orderId: string; technicianId: string }) => {
      const { error } = await supabase
        .from('planning_activities')
        .update({ technician_id: technicianId })
        .eq('id', orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      toast.success('Technicien assigné avec succès');
    },
    onError: (error) => {
      console.error('Error assigning technician:', error);
      toast.error('Erreur lors de l\'assignation');
    }
  });

  const handleCreatePreparation = () => {
    if (!newPreparation.boat_id) {
      toast.error('Veuillez sélectionner un bateau');
      return;
    }
    createPreparationMutation.mutate({
      boat_id: newPreparation.boat_id,
      template_id: newPreparation.template_id || undefined,
      notes: newPreparation.notes || undefined
    });
  };

  const handleAssignTechnician = (orderId: string, technicianId: string) => {
    assignTechnicianMutation.mutate({ orderId, technicianId });
  };

  const getUrgencyColor = (count: number, type: 'overdue' | 'normal') => {
    if (type === 'overdue' && count > 0) return 'destructive';
    if (count > 5) return 'secondary';
    return 'default';
  };

  if (!flowData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Ship className="h-4 w-4" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Ship className="h-4 w-4" />
          {config.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Retours location</span>
              <Badge variant={getUrgencyColor(flowData.returningBoats, 'normal')}>
                {flowData.returningBoats}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Préparations</span>
              <Badge variant={getUrgencyColor(flowData.preparationsInProgress, 'normal')}>
                {flowData.preparationsInProgress}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Prêts</span>
              <Badge variant="outline" className="text-green-600">
                {flowData.readyBoats}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                En retard
              </span>
              <Badge variant={getUrgencyColor(flowData.overduePreparations, 'overdue')}>
                {flowData.overduePreparations}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Taux de disponibilité</span>
            <span className="font-bold">
              {Math.round((flowData.readyBoats / flowData.totalBoats) * 100)}%
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-8"
              onClick={() => setShowPreparationDialog(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ordre prépa
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 h-8"
              onClick={() => setShowAssignDialog(true)}
            >
              <User className="h-3 w-3 mr-1" />
              Assigner
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Create Preparation Dialog */}
      <Dialog open={showPreparationDialog} onOpenChange={setShowPreparationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un ordre de préparation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="boat_id">Bateau *</Label>
              <Select 
                value={newPreparation.boat_id} 
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
                value={newPreparation.template_id} 
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
                value={newPreparation.notes}
                onChange={(e) => setNewPreparation(prev => ({ ...prev, notes: e.target.value }))}
              />
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

      {/* Assign Technician Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assigner des techniciens</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {unassignedOrders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Aucun ordre non assigné
              </div>
            ) : (
              unassignedOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{order.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.boat?.name} ({order.boat?.model})
                    </p>
                  </div>
                  <Select onValueChange={(technicianId) => handleAssignTechnician(order.id, technicianId)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Assigner" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((technician) => (
                        <SelectItem key={technician.id} value={technician.id}>
                          {technician.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};