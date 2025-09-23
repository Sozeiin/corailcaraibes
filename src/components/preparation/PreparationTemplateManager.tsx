import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Settings, Trash2, Edit, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateItem {
  name: string;
  category: string;
  description?: string;
  mandatory: boolean;
}

interface Template {
  id: string;
  name: string;
  boat_id?: string;
  boat?: {
    id: string;
    name: string;
    model: string;
  };
  category: string;
  items: TemplateItem[];
  is_active: boolean;
  created_at: string;
}

interface CreateTemplateData {
  name: string;
  boat_id?: string;
  category: string;
  items: TemplateItem[];
}

export function PreparationTemplateManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState<CreateTemplateData>({
    name: '',
    boat_id: '',
    category: 'standard',
    items: []
  });
  const [newItem, setNewItem] = useState<TemplateItem>({
    name: '',
    category: '',
    description: '',
    mandatory: true
  });

  // Fetch existing templates with boat information
  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ['preparation-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('preparation_checklist_templates')
        .select(`
          *,
          boat:boats(id, name, model)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(template => ({
        ...template,
        items: (template.items as unknown as TemplateItem[]) || []
      }));
    }
  });

  // Fetch boats for selection
  const { data: boats = [] } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('id, name, model')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: CreateTemplateData) => {
      const { data, error } = await supabase
        .from('preparation_checklist_templates')
        .insert({
          name: templateData.name,
          boat_id: templateData.boat_id || null,
          category: templateData.category,
          items: templateData.items as any,
          created_by: user?.id,
          base_id: user?.baseId
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparation-templates'] });
      setIsCreateDialogOpen(false);
      setNewTemplate({
        name: '',
        boat_id: '',
        category: 'standard',
        items: []
      });
      toast.success('Modèle créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du modèle');
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: Template) => {
      const { data, error } = await supabase
        .from('preparation_checklist_templates')
        .update({
          name: template.name,
          boat_id: template.boat_id || null,
          category: template.category,
          items: template.items as any
        })
        .eq('id', template.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparation-templates'] });
      setEditingTemplate(null);
      toast.success('Modèle mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('preparation_checklist_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparation-templates'] });
      toast.success('Modèle supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const defaultCategories = [
    'Moteur', 'Réservoirs', 'Sécurité', 'Électronique', 
    'Confort', 'Gréement', 'Navigation', 'Général'
  ];

  const addItemToTemplate = () => {
    if (!newItem.name || !newItem.category) {
      toast.error('Nom et catégorie sont obligatoires');
      return;
    }
    
    const currentTemplate = editingTemplate || newTemplate;
    const updatedItems = [...currentTemplate.items, { ...newItem }];
    
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, items: updatedItems });
    } else {
      setNewTemplate({ ...newTemplate, items: updatedItems });
    }
    
    setNewItem({ name: '', category: '', description: '', mandatory: true });
  };

  const removeItemFromTemplate = (index: number) => {
    const currentTemplate = editingTemplate || newTemplate;
    const updatedItems = currentTemplate.items.filter((_, i) => i !== index);
    
    if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, items: updatedItems });
    } else {
      setNewTemplate({ ...newTemplate, items: updatedItems });
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || newTemplate.items.length === 0) {
      toast.error('Nom et au moins un élément sont obligatoires');
      return;
    }
    createTemplateMutation.mutate(newTemplate);
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate(editingTemplate);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate({
      ...template,
      items: template.items || []
    });
    setNewTemplate({
      name: template.name,
      boat_id: template.boat_id,
      category: template.category,
      items: template.items
    });
  };

  const handleDuplicateTemplate = (template: Template) => {
    setNewTemplate({
      name: `${template.name} (Copie)`,
      boat_id: template.boat_id,
      category: template.category,
      items: [...template.items]
    });
    setIsCreateDialogOpen(true);
  };

  const renderTemplateForm = (template: CreateTemplateData | Template, isEditing = false) => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Nom du modèle</Label>
          <Input
            id="name"
            value={template.name}
            onChange={(e) => {
              if (isEditing && editingTemplate) {
                setEditingTemplate({ ...editingTemplate, name: e.target.value });
              } else {
                setNewTemplate({ ...newTemplate, name: e.target.value });
              }
            }}
            placeholder="Ex: Checklist standard Lagoon"
          />
        </div>
        <div>
          <Label htmlFor="boat">Bateau (optionnel)</Label>
          <Select
            value={template.boat_id || ''}
            onValueChange={(value) => {
              if (isEditing && editingTemplate) {
                setEditingTemplate({ ...editingTemplate, boat_id: value || undefined });
              } else {
                setNewTemplate({ ...newTemplate, boat_id: value || undefined });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un bateau (global si vide)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Modèle global (tous les bateaux)</SelectItem>
              {boats.map((boat) => (
                <SelectItem key={boat.id} value={boat.id}>
                  {boat.name} ({boat.model})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="category">Catégorie</Label>
        <Select 
          value={template.category} 
          onValueChange={(value) => {
            if (isEditing && editingTemplate) {
              setEditingTemplate({ ...editingTemplate, category: value });
            } else {
              setNewTemplate({ ...newTemplate, category: value });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="catamaran">Catamaran</SelectItem>
            <SelectItem value="monohull">Monocoque</SelectItem>
            <SelectItem value="motor">Moteur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add new item section */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Ajouter un élément</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="item_name">Nom *</Label>
            <Input
              id="item_name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Ex: Carburant"
            />
          </div>
          <div>
            <Label htmlFor="item_category">Catégorie *</Label>
            <Select 
              value={newItem.category} 
              onValueChange={(value) => setNewItem({ ...newItem, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {defaultCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="item_description">Description</Label>
          <Textarea
            id="item_description"
            value={newItem.description || ''}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            placeholder="Description de la vérification à effectuer"
            rows={2}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="item_mandatory"
            checked={newItem.mandatory}
            onCheckedChange={(checked) => setNewItem({ ...newItem, mandatory: !!checked })}
          />
          <Label htmlFor="item_mandatory">Élément obligatoire</Label>
        </div>
        <Button onClick={addItemToTemplate} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter
        </Button>
      </div>

      {/* Items list */}
      {template.items && template.items.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Éléments de la checklist ({template.items.length})</h4>
          <ScrollArea className="h-64 border rounded">
            <div className="p-4 space-y-2">
              {template.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      {item.mandatory && <Badge variant="secondary" className="text-xs">Obligatoire</Badge>}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItemFromTemplate(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          onClick={() => {
            if (isEditing) {
              setEditingTemplate(null);
            } else {
              setIsCreateDialogOpen(false);
            }
          }}
        >
          Annuler
        </Button>
        <Button 
          onClick={isEditing ? handleUpdateTemplate : handleCreateTemplate}
          disabled={isEditing ? updateTemplateMutation.isPending : createTemplateMutation.isPending}
        >
          {isEditing ? 'Mettre à jour' : 'Créer le modèle'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Modèles de checklist</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau modèle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un modèle de checklist</DialogTitle>
            </DialogHeader>
            {renderTemplateForm(newTemplate)}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{template.category}</Badge>
                {!template.is_active && <Badge variant="secondary">Inactif</Badge>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDuplicateTemplate(template)}
                  title="Dupliquer le modèle"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Bateau</p>
                  {template.boat ? (
                    <p>{template.boat.name} ({template.boat.model})</p>
                  ) : (
                    <p>Modèle global</p>
                  )}
                </div>
                <div>
                  <p className="text-gray-500">Nombre d'éléments</p>
                  <p>{template.items.length} éléments</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit template dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le modèle</DialogTitle>
            </DialogHeader>
            {renderTemplateForm(editingTemplate, true)}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}