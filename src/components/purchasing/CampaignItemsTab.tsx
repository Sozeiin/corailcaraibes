import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MobileTable } from '@/components/ui/mobile-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Package,
  Plus,
  Edit,
  Trash2,
  Building,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CampaignItemsTabProps {
  campaignId: string;
}

export const CampaignItemsTab: React.FC<CampaignItemsTabProps> = ({ campaignId }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['campaign-items', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_items')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: bases } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const { error } = await supabase
        .from('campaign_items')
        .insert({
          campaign_id: campaignId,
          ...itemData
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Article ajouté",
        description: "L'article a été ajouté à la campagne avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-items', campaignId] });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'article.",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...itemData }: any) => {
      const { error } = await supabase
        .from('campaign_items')
        .update(itemData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Article modifié",
        description: "L'article a été modifié avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-items', campaignId] });
      setEditingItem(null);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'article.",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('campaign_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Article supprimé",
        description: "L'article a été supprimé de la campagne.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-items', campaignId] });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'article.",
        variant: "destructive",
      });
    },
  });

  const ItemForm = ({ item, onSubmit, onCancel }: any) => {
    const [formData, setFormData] = useState({
      product_name: item?.product_name || '',
      category: item?.category || '',
      description: item?.description || '',
      total_quantity: item?.total_quantity || 0,
      estimated_unit_price: item?.estimated_unit_price || 0,
      unit: item?.unit || 'pièce',
      priority: item?.priority || 'medium',
      notes: item?.notes || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(item ? { id: item.id, ...formData } : formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Nom du produit *</label>
            <Input
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Catégorie</label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Quantité totale</label>
            <Input
              type="number"
              value={formData.total_quantity}
              onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Prix unitaire estimé</label>
            <Input
              type="number"
              step="0.01"
              value={formData.estimated_unit_price}
              onChange={(e) => setFormData({ ...formData, estimated_unit_price: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Unité</label>
            <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pièce">Pièce</SelectItem>
                <SelectItem value="kg">Kilogramme</SelectItem>
                <SelectItem value="litre">Litre</SelectItem>
                <SelectItem value="mètre">Mètre</SelectItem>
                <SelectItem value="lot">Lot</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Priorité</label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">
            {item ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </form>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'urgent': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Faible';
      case 'medium': return 'Moyenne';
      case 'high': return 'Élevée';
      case 'urgent': return 'Urgente';
      default: return priority;
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  const isMobile = useIsMobile();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Articles de la Campagne</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les articles inclus dans cette campagne d'achat groupé
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un article</DialogTitle>
              <DialogDescription>
                Ajoutez un nouvel article à cette campagne d'achat groupé.
              </DialogDescription>
            </DialogHeader>
            <ItemForm
              onSubmit={(data: any) => addItemMutation.mutate(data)}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {items && items.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            {isMobile ? (
              <MobileTable
                data={items}
                columns={[
                  {
                    key: 'product_name',
                    label: 'Produit',
                    render: (item) => (
                      <div>
                        <div className="font-medium">{item.product_name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'category',
                    label: 'Catégorie',
                    render: (item) => item.category || '-'
                  },
                  {
                    key: 'quantity',
                    label: 'Quantité',
                    render: (item) => `${item.total_quantity} ${item.unit}`
                  },
                  {
                    key: 'price',
                    label: 'Prix',
                    render: (item) => Number(item.estimated_unit_price).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    })
                  },
                  {
                    key: 'priority',
                    label: 'Priorité',
                    render: (item) => (
                      <Badge className={getPriorityColor(item.priority)}>
                        {getPriorityLabel(item.priority)}
                      </Badge>
                    )
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (item) => (
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Prix estimé</TableHead>
                    <TableHead>Total estimé</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell>{item.total_quantity} {item.unit}</TableCell>
                      <TableCell>
                        {Number(item.estimated_unit_price).toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR'
                        })}
                      </TableCell>
                      <TableCell>
                        {(Number(item.estimated_unit_price) * Number(item.total_quantity)).toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR'
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(item.priority)}>
                          {getPriorityLabel(item.priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun article</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter des articles à cette campagne.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le premier article
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'article</DialogTitle>
            <DialogDescription>
              Modifiez les informations de cet article.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <ItemForm
              item={editingItem}
              onSubmit={(data: any) => updateItemMutation.mutate(data)}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};