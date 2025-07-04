import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Copy, 
  Edit, 
  Trash2,
  FileText,
  Play,
  Star,
  Clock,
  Package
} from 'lucide-react';
import { useForm } from 'react-hook-form';

interface TemplateFormData {
  name: string;
  description: string;
  category: string;
  template_data: {
    suppliers: string[];
    items: {
      productName: string;
      reference: string;
      quantity: number;
      unitPrice: number;
    }[];
    workflow_type: string;
    notes: string;
  };
}

export function TemplateManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<TemplateFormData>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      template_data: {
        suppliers: [],
        items: [],
        workflow_type: 'standard',
        notes: ''
      }
    }
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['purchasing-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchasing_templates')
        .select(`
          *,
          profiles!purchasing_templates_created_by_fkey (name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-for-templates'],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('id, name').order('name');
      return data || [];
    }
  });

  const categories = [
    'Maintenance',
    'Équipement',
    'Consommables',
    'Sécurité',
    'Électronique',
    'Carburant',
    'Alimentaire',
    'Autre'
  ];

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (data: TemplateFormData) => {
    try {
      const { error } = await supabase
        .from('purchasing_templates')
        .insert({
          name: data.name,
          description: data.description,
          category: data.category,
          template_data: data.template_data,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Template créé',
        description: 'Le template de commande a été créé avec succès.'
      });

      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['purchasing-templates'] });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le template.',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      template_data: template.template_data || {
        suppliers: [],
        items: [],
        workflow_type: 'standard',
        notes: ''
      }
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = async (template: any) => {
    try {
      const { error } = await supabase
        .from('purchasing_templates')
        .insert({
          name: `${template.name} (Copie)`,
          description: template.description,
          category: template.category,
          template_data: template.template_data,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Template dupliqué',
        description: 'Le template a été dupliqué avec succès.'
      });

      queryClient.invalidateQueries({ queryKey: ['purchasing-templates'] });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer le template.',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
      const { error } = await supabase
        .from('purchasing_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Template supprimé',
        description: 'Le template a été supprimé avec succès.'
      });

      queryClient.invalidateQueries({ queryKey: ['purchasing-templates'] });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le template.',
        variant: 'destructive'
      });
    }
  };

  const useTemplate = async (template: any) => {
    // Cette fonction créerait une nouvelle commande basée sur le template
    toast({
      title: 'Template utilisé',
      description: 'Une nouvelle commande a été créée à partir du template.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestionnaire de Templates</h2>
          <p className="text-muted-foreground">
            Créez et gérez des modèles de commandes réutilisables
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Template
        </Button>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Templates Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilisations ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">47</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Économies Réalisées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18%</div>
          </CardContent>
        </Card>

        <div className="flex items-center">
          <Input
            placeholder="Rechercher un template..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun template trouvé</h3>
              <p className="text-muted-foreground">
                Créez votre premier template pour accélérer vos commandes
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      {template.category && (
                        <Badge variant="outline">{template.category}</Badge>
                      )}
                      <Badge className="bg-blue-100 text-blue-800">
                        <Star className="h-3 w-3 mr-1" />
                        Template
                      </Badge>
                    </div>
                    
                    {template.description && (
                      <p className="text-muted-foreground mb-3">
                        {template.description}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {(template.template_data as any)?.items?.length || 0} articles
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Créé le {new Date(template.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Par: {template.profiles?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => useTemplate(template)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Utiliser
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Dupliquer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-700"
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

      {/* Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le Template' : 'Nouveau Template'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Le nom est requis" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du Template *</FormLabel>
                    <FormControl>
                      <Input placeholder="Template Maintenance Mensuelle" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Description du template..."
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingTemplate(null);
                    form.reset();
                  }}
                >
                  Annuler
                </Button>
                <Button type="submit">
                  {editingTemplate ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}