import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Package2, AlertTriangle } from 'lucide-react';
import { ComponentStockLink, StockLinkFormData } from '@/types/component';

interface ComponentStockLinkManagerProps {
  componentId?: string;
  subComponentId?: string;
  componentName: string;
}

export function ComponentStockLinkManager({ componentId, subComponentId, componentName }: ComponentStockLinkManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<StockLinkFormData>({
    stockItemId: '',
    quantityRequired: 1,
    replacementPriority: 'medium',
    notes: ''
  });

  // Fetch stock items
  const { data: stockItems } = useQuery({
    queryKey: ['stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, reference, quantity, unit')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch stock links
  const { data: stockLinks, isLoading } = useQuery({
    queryKey: ['component-stock-links', componentId, subComponentId],
    queryFn: async () => {
      let query = supabase
        .from('component_stock_links')
        .select(`
          *,
          stock_item:stock_items(id, name, reference, quantity, unit)
        `);

      if (componentId) {
        query = query.eq('component_id', componentId);
      } else if (subComponentId) {
        query = query.eq('sub_component_id', subComponentId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data as ComponentStockLink[];
    }
  });

  // Save stock link mutation
  const saveStockLinkMutation = useMutation({
    mutationFn: async (data: StockLinkFormData) => {
      const linkData = {
        component_id: componentId || null,
        sub_component_id: subComponentId || null,
        stock_item_id: data.stockItemId,
        quantity_required: data.quantityRequired,
        replacement_priority: data.replacementPriority,
        notes: data.notes || null
      };

      const { error } = await supabase
        .from('component_stock_links')
        .insert([linkData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-stock-links', componentId, subComponentId] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: "Le lien avec le stock a été créé avec succès."
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du lien.",
        variant: "destructive"
      });
    }
  });

  // Delete stock link mutation
  const deleteStockLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('component_stock_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['component-stock-links', componentId, subComponentId] });
      toast({
        title: "Succès",
        description: "Le lien avec le stock a été supprimé avec succès."
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du lien.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      stockItemId: '',
      quantityRequired: 1,
      replacementPriority: 'medium',
      notes: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.stockItemId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un article de stock.",
        variant: "destructive"
      });
      return;
    }
    saveStockLinkMutation.mutate(formData);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Haute</Badge>;
      case 'medium':
        return <Badge variant="secondary">Moyenne</Badge>;
      case 'low':
        return <Badge variant="outline">Faible</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStockStatus = (stockItem: any, quantityRequired: number) => {
    if (!stockItem) return null;
    
    if (stockItem.quantity === 0) {
      return <Badge variant="destructive">Rupture de stock</Badge>;
    } else if (stockItem.quantity < quantityRequired) {
      return <Badge variant="destructive">Stock insuffisant</Badge>;
    } else if (stockItem.quantity < quantityRequired * 2) {
      return <Badge variant="secondary">Stock faible</Badge>;
    } else {
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">En stock</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Chargement des liens stock...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Articles de stock liés à {componentName}
        </h4>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Lier un article
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lier un article de stock</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="stockItemId">Article de stock *</Label>
                <Select value={formData.stockItemId} onValueChange={(value) => setFormData({ ...formData, stockItemId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un article" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockItems?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} {item.reference && `(${item.reference})`} - {item.quantity} {item.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantityRequired">Quantité requise *</Label>
                  <Input
                    id="quantityRequired"
                    type="number"
                    value={formData.quantityRequired}
                    onChange={(e) => setFormData({ ...formData, quantityRequired: parseInt(e.target.value) || 1 })}
                    min="1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="replacementPriority">Priorité de remplacement</Label>
                  <Select value={formData.replacementPriority} onValueChange={(value) => setFormData({ ...formData, replacementPriority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="low">Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes sur ce lien..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saveStockLinkMutation.isPending}>
                  {saveStockLinkMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!stockLinks || stockLinks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucun article lié</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stockLinks.map((link) => (
            <Card key={link.id} className="border-l-4 border-l-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-medium">{link.stock_item?.name}</h5>
                      {link.stock_item?.reference && (
                        <Badge variant="outline">{link.stock_item.reference}</Badge>
                      )}
                      {getPriorityBadge(link.replacement_priority)}
                      {getStockStatus(link.stock_item, link.quantity_required)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Quantité requise:</span> {link.quantity_required} {link.stock_item?.unit}
                      </div>
                      <div>
                        <span className="font-medium">Stock disponible:</span> {link.stock_item?.quantity} {link.stock_item?.unit}
                      </div>
                    </div>

                    {link.notes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {link.notes}
                      </div>
                    )}

                    {link.stock_item && link.stock_item.quantity < link.quantity_required && (
                      <div className="flex items-center gap-2 text-orange-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Stock insuffisant pour le remplacement</span>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteStockLinkMutation.mutate(link.id)}
                      disabled={deleteStockLinkMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}