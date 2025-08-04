import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus, Edit, Trash2, Copy } from 'lucide-react';

interface ActivityTemplate {
  id: string;
  name: string;
  description?: string;
  activity_type: string;
  estimated_duration: number;
  default_priority: string;
  color_code: string;
  checklist_items?: any;
  is_active: boolean;
  base_id?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

interface ActivityTemplateManagerProps {
  onTemplateSelect?: (template: ActivityTemplate) => void;
}

export function ActivityTemplateManager({ onTemplateSelect }: ActivityTemplateManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activity_type: 'maintenance',
    estimated_duration: 60,
    default_priority: 'medium',
    color_code: '#3b82f6'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['planning-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('planning_templates')
        .insert([{
          ...data,
          base_id: '550e8400-e29b-41d4-a716-446655440001', // Default base ID
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });
      toast({
        title: "Modèle créé",
        description: "Le modèle d'activité a été créé avec succès.",
      });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le modèle.",
        variant: "destructive",
      });
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('planning_templates')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });
      toast({
        title: "Modèle mis à jour",
        description: "Le modèle d'activité a été mis à jour avec succès.",
      });
      resetForm();
      setEditingTemplate(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le modèle.",
        variant: "destructive",
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('planning_templates')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-templates'] });
      toast({
        title: "Modèle supprimé",
        description: "Le modèle d'activité a été supprimé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le modèle.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      activity_type: 'maintenance',
      estimated_duration: 60,
      default_priority: 'medium',
      color_code: '#3b82f6'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleEdit = (template: ActivityTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      activity_type: template.activity_type,
      estimated_duration: template.estimated_duration,
      default_priority: template.default_priority,
      color_code: template.color_code
    });
    setEditingTemplate(template);
  };

  const handleClone = (template: ActivityTemplate) => {
    setFormData({
      name: `${template.name} (Copie)`,
      description: template.description || '',
      activity_type: template.activity_type,
      estimated_duration: template.estimated_duration,
      default_priority: template.default_priority,
      color_code: template.color_code
    });
    setShowCreateDialog(true);
  };

  const getActivityTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      maintenance: 'Maintenance',
      checkin: 'Check-in',
      checkout: 'Check-out',
      travel: 'Déplacement',
      break: 'Pause',
      emergency: 'Urgence'
    };
    return labels[type] || type;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Faible',
      medium: 'Moyenne',
      high: 'Élevée',
      urgent: 'Urgente'
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Modèles d'activités
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau modèle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un modèle d'activité</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du modèle *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
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
                    <Label htmlFor="duration">Durée estimée (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="5"
                      max="480"
                      value={formData.estimated_duration}
                      onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Priorité par défaut</Label>
                  <Select
                    value={formData.default_priority}
                    onValueChange={(value) => setFormData({ ...formData, default_priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Élevée</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Annuler
                  </Button>
                  <Button type="submit">
                    Créer le modèle
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun modèle d'activité créé</p>
            <p className="text-sm">Créez votre premier modèle pour gagner du temps</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm truncate">{template.name}</h3>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div 
                      className="w-3 h-3 rounded-full ml-2 flex-shrink-0"
                      style={{ backgroundColor: template.color_code }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {getActivityTypeLabel(template.activity_type)}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(template.default_priority)}`}>
                        {getPriorityLabel(template.default_priority)}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Durée: {template.estimated_duration} min
                    </div>

                    <div className="flex gap-1 pt-2">
                      {onTemplateSelect && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-xs h-7"
                          onClick={() => onTemplateSelect(template)}
                        >
                          Utiliser
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="p-1 h-7 w-7"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="p-1 h-7 w-7"
                        onClick={() => handleClone(template)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="p-1 h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Template Dialog */}
        <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le modèle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nom du modèle *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
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
                    onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
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
                  <Label htmlFor="edit-duration">Durée estimée (min)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min="5"
                    max="480"
                    value={formData.estimated_duration}
                    onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>Priorité par défaut</Label>
                <Select
                  value={formData.default_priority}
                  onValueChange={(value) => setFormData({ ...formData, default_priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Élevée</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Mettre à jour
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}