import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Save, X, CheckSquare, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Component for individual sortable checklist item
const SortableChecklistItem = ({ item, editingItem, setEditingItem, handleSave, handleDelete, updateMutation, deleteMutation, canManageChecklists }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ok': return 'default';
      case 'needs_repair': return 'destructive';
      case 'not_checked': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ok': return 'OK';
      case 'needs_repair': return 'À réparer';
      case 'not_checked': return 'Non vérifié';
      default: return status;
    }
  };

  const ChecklistItemForm = ({ item, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState({
      name: item?.name || '',
      category: item?.category || '',
      is_required: item?.is_required || false,
      status: item?.status || 'not_checked',
      notes: item?.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4 bg-muted/50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nom de l'élément *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">Statut par défaut</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_checked">Non vérifié</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="needs_repair">À réparer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="required"
            checked={formData.is_required}
            onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
          />
          <Label htmlFor="required">Élément obligatoire</Label>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sauvegarder'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      </form>
    );
  };

  if (editingItem?.id === item.id) {
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <ChecklistItemForm
          item={item}
          onSave={handleSave}
          onCancel={() => setEditingItem(null)}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex justify-between items-start p-4 border rounded-lg mb-4 bg-background transition-shadow ${
        isDragging ? 'shadow-lg opacity-50' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium">{item.name}</h4>
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {getStatusLabel(item.status)}
            </Badge>
            {item.is_required && (
              <Badge variant="outline">Obligatoire</Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-sm text-muted-foreground">{item.notes}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditingItem(item)}
          disabled={!canManageChecklists}
        >
          <Edit className="h-4 w-4" />
        </Button>
        {canManageChecklists && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action ne peut pas être annulée. Cela supprimera définitivement l'élément "{item.name}" de la checklist.
                <br /><br />
                <strong>Attention :</strong> Si cet élément est utilisé dans des checklists existantes, la suppression échouera.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(item.id)}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        )}
        {!canManageChecklists && (
          <Button variant="outline" size="sm" disabled title="Permission insuffisante">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export function ChecklistSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Only direction and chef_base can manage checklists
  const canManageChecklists = user?.role === 'direction' || user?.role === 'chef_base';

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: checklistItems = [], isLoading } = useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert([itemData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      setIsCreating(false);
      toast({
        title: "Élément créé",
        description: "Le nouvel élément de checklist a été ajouté."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'élément.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      setEditingItem(null);
      toast({
        title: "Élément modifié",
        description: "L'élément de checklist a été mis à jour."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'élément.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First check if the item is used in any boat checklists
      const { data: usageCheck, error: usageError } = await supabase
        .from('boat_checklist_items')
        .select('item_id')
        .eq('item_id', id)
        .limit(1);
      
      if (usageError) throw usageError;
      
      if (usageCheck && usageCheck.length > 0) {
        throw new Error('ITEM_IN_USE');
      }
      
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      toast({
        title: "Élément supprimé",
        description: "L'élément de checklist a été supprimé."
      });
    },
    onError: (error: any) => {
      console.error('Erreur lors de la suppression:', error);
      
      let title = "Erreur de suppression";
      let description = "Impossible de supprimer l'élément.";
      
      if (error.message === 'ITEM_IN_USE') {
        title = "Suppression impossible";
        description = "Cet élément est utilisé dans des checklists existantes. Supprimez d'abord les checklists associées.";
      } else if (error.code === '23503') {
        title = "Suppression impossible";
        description = "Cet élément est référencé dans d'autres données. Vérifiez les dépendances.";
      } else if (error.message?.includes('permission')) {
        title = "Permission refusée";
        description = "Vous n'avez pas les permissions nécessaires pour supprimer cet élément.";
      }
      
      toast({
        title,
        description,
        variant: "destructive"
      });
    }
  });

  const handleSave = (itemData: any) => {
    if (isCreating) {
      createMutation.mutate(itemData);
    } else {
      updateMutation.mutate({ id: editingItem.id, data: itemData });
    }
  };

  // Update display order mutation for drag & drop
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number; category: string }[]) => {
      setIsSaving(true);
      const promises = updates.map(({ id, display_order }) =>
        supabase
          .from('checklist_items')
          .update({ display_order })
          .eq('id', id)
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
      setIsSaving(false);
      toast({
        title: "Ordre mis à jour",
        description: "L'ordre des éléments a été sauvegardé.",
      });
    },
    onError: (error: any) => {
      setIsSaving(false);
      console.error('Erreur lors de la mise à jour de l\'ordre:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'ordre des éléments.",
        variant: "destructive"
      });
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeItem = checklistItems.find(item => item.id === active.id);
    const overItem = checklistItems.find(item => item.id === over.id);

    if (!activeItem || !overItem || activeItem.category !== overItem.category) {
      return;
    }

    const category = activeItem.category;
    const categoryItems = checklistItems.filter(item => item.category === category);
    const activeIndex = categoryItems.findIndex(item => item.id === active.id);
    const overIndex = categoryItems.findIndex(item => item.id === over.id);

    if (activeIndex !== overIndex) {
      const reorderedItems = arrayMove(categoryItems, activeIndex, overIndex);
      
      // Update display_order for all items in the category
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
        category: category
      }));

      updateOrderMutation.mutate(updates);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ok':
        return 'default';
      case 'needs_repair':
        return 'destructive';
      case 'not_checked':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ok':
        return 'OK';
      case 'needs_repair':
        return 'À réparer';
      case 'not_checked':
        return 'Non vérifié';
      default:
        return status;
    }
  };

  const categories = [...new Set(checklistItems.map(item => item.category).filter(Boolean))];

  const ChecklistItemForm = ({ item, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState({
      name: item?.name || '',
      category: item?.category || '',
      is_required: item?.is_required || false,
      status: item?.status || 'not_checked',
      notes: item?.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nom de l'élément *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="category">Catégorie</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              list="categories"
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Statut par défaut</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_checked">Non vérifié</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="needs_repair">À réparer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 mt-6">
            <Switch
              id="required"
              checked={formData.is_required}
              onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
            />
            <Label htmlFor="required">Élément obligatoire</Label>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return <div>Chargement des éléments de checklist...</div>;
  }

  const groupedItems = checklistItems.reduce((acc: any, item) => {
    const category = item.category || 'Sans catégorie';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Configuration des checklists</h3>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating || !canManageChecklists}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel élément
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Nouvel élément de checklist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChecklistItemForm
              onSave={handleSave}
              onCancel={() => setIsCreating(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
          <Card key={category}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{category}</CardTitle>
              {isSaving && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sauvegarde en cours...
                </div>
              )}
            </CardHeader>
            <CardContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={items.map((item: any) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0">
                    {items.map((item: any) => (
                       <SortableChecklistItem
                         key={item.id}
                         item={item}
                         editingItem={editingItem}
                         setEditingItem={setEditingItem}
                         handleSave={handleSave}
                         handleDelete={handleDelete}
                         updateMutation={updateMutation}
                         deleteMutation={deleteMutation}
                         canManageChecklists={canManageChecklists}
                       />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}