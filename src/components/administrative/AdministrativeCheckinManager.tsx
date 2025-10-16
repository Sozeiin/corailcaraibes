import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Calendar, FileText, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdministrativeCheckinForm {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_id_number?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  rental_notes?: string;
  special_instructions?: string;
  boat_id?: string;
  status: string;
  created_at: string;
  used_by?: string;
  used_at?: string;
  boat?: {
    name: string;
  };
}

export function AdministrativeCheckinManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<AdministrativeCheckinForm | null>(null);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    customer_id_number: '',
    planned_start_date: '',
    planned_end_date: '',
    rental_notes: '',
    special_instructions: '',
    boat_id: ''
  });

  // Fetch available boats
  const { data: boats = [] } = useQuery({
    queryKey: ['boats', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];
      
      const { data, error } = await supabase
        .from('boats')
        .select('id, name')
        .eq('base_id', user.baseId)
        .eq('status', 'available')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId
  });

  // Fetch administrative forms
  const { data: forms = [], refetch } = useQuery({
    queryKey: ['administrative-checkin-forms', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];
      
      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .select(`
          *,
          boat:boats!boat_id(name)
        `)
        .eq('base_id', user.baseId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId
  });

  // Create form mutation
  const createFormMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .insert({
          ...formData,
          base_id: user?.baseId,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Fiche créée',
        description: 'La fiche client a été créée avec succès.'
      });
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la fiche client.',
        variant: 'destructive'
      });
    }
  });

  // Update form mutation
  const updateFormMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: any }) => {
      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .update(formData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Fiche mise à jour',
        description: 'La fiche client a été mise à jour avec succès.'
      });
      setIsDialogOpen(false);
      resetForm();
      refetch();
    }
  });

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('administrative_checkin_forms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Fiche supprimée',
        description: 'La fiche client a été supprimée avec succès.'
      });
      refetch();
    }
  });

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_address: '',
      customer_id_number: '',
      planned_start_date: '',
      planned_end_date: '',
      rental_notes: '',
      special_instructions: '',
      boat_id: ''
    });
    setEditingForm(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_name.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom du client est requis.',
        variant: 'destructive'
      });
      return;
    }

    if (editingForm) {
      updateFormMutation.mutate({ id: editingForm.id, formData });
    } else {
      createFormMutation.mutate(formData);
    }
  };

  const handleEdit = (form: AdministrativeCheckinForm) => {
    setEditingForm(form);
    setFormData({
      customer_name: form.customer_name,
      customer_email: form.customer_email || '',
      customer_phone: form.customer_phone || '',
      customer_address: form.customer_address || '',
      customer_id_number: form.customer_id_number || '',
      planned_start_date: form.planned_start_date ? form.planned_start_date.slice(0, 16) : '',
      planned_end_date: form.planned_end_date ? form.planned_end_date.slice(0, 16) : '',
      rental_notes: form.rental_notes || '',
      special_instructions: form.special_instructions || '',
      boat_id: form.boat_id || ''
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="secondary">Prêt</Badge>;
      case 'used':
        return <Badge variant="outline">Utilisé</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expiré</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fiches clients pré-remplies</h1>
          <p className="text-muted-foreground">
            Créez des fiches clients pour faciliter le check-in des techniciens
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle fiche
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingForm ? 'Modifier la fiche client' : 'Nouvelle fiche client'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Nom du client *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customer_email">Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_phone">Téléphone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="customer_id_number">Numéro pièce d'identité</Label>
                  <Input
                    id="customer_id_number"
                    value={formData.customer_id_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_id_number: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customer_address">Adresse</Label>
                <Textarea
                  id="customer_address"
                  value={formData.customer_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer_address: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="planned_start_date">Date/heure de début prévue</Label>
                  <Input
                    id="planned_start_date"
                    type="datetime-local"
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, planned_start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="planned_end_date">Date/heure de fin prévue</Label>
                  <Input
                    id="planned_end_date"
                    type="datetime-local"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, planned_end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="boat_id">Bateau prévu</Label>
                <Select value={formData.boat_id} onValueChange={(value) => setFormData(prev => ({ ...prev, boat_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un bateau (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {boats.map((boat) => (
                      <SelectItem key={boat.id} value={boat.id}>
                        {boat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rental_notes">Notes de location</Label>
                <Textarea
                  id="rental_notes"
                  value={formData.rental_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, rental_notes: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="special_instructions">Instructions spéciales</Label>
                <Textarea
                  id="special_instructions"
                  value={formData.special_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={createFormMutation.isPending || updateFormMutation.isPending}>
                  {editingForm ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {forms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Aucune fiche client
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Créez votre première fiche client pour faciliter le check-in des techniciens
              </p>
            </CardContent>
          </Card>
        ) : (
          forms.map((form) => (
            <Card key={form.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{form.customer_name}</h3>
                      {getStatusBadge(form.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        {form.customer_email && (
                          <p>📧 {form.customer_email}</p>
                        )}
                        {form.customer_phone && (
                          <p>📞 {form.customer_phone}</p>
                        )}
                        {form.boat?.name && (
                          <p>🚤 {form.boat.name}</p>
                        )}
                      </div>
                      <div>
                        {form.planned_start_date && (
                          <p>📅 {format(new Date(form.planned_start_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                        )}
                        {form.planned_end_date && (
                          <p>⏰ {format(new Date(form.planned_end_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                        )}
                        {form.used_at && (
                          <p>✅ Utilisé le {format(new Date(form.used_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                        )}
                      </div>
                    </div>
                    
                    {(form.rental_notes || form.special_instructions) && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        {form.rental_notes && <p><strong>Notes:</strong> {form.rental_notes}</p>}
                        {form.special_instructions && <p><strong>Instructions:</strong> {form.special_instructions}</p>}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(form)}
                      disabled={form.status === 'used'}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFormMutation.mutate(form.id)}
                      disabled={deleteFormMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}