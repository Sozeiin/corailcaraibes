import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  Clock,
  Award,
  Calendar,
  Upload,
  FileUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { QuoteImportDialog } from './QuoteImportDialog';

interface CampaignQuotesTabProps {
  campaignId: string;
}

export const CampaignQuotesTab: React.FC<CampaignQuotesTabProps> = ({ campaignId }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ['campaign-items', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_items')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('product_name');

      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: quotes, isLoading } = useQuery({
    queryKey: ['campaign-quotes', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          campaign_items!inner(
            campaign_id,
            product_name
          ),
          suppliers(name)
        `)
        .eq('campaign_items.campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const addQuoteMutation = useMutation({
    mutationFn: async (quoteData: any) => {
      const { error } = await supabase
        .from('supplier_quotes')
        .insert(quoteData);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Devis ajouté",
        description: "Le devis a été ajouté avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-quotes', campaignId] });
      setShowAddDialog(false);
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le devis.",
        variant: "destructive",
      });
    },
  });

  const updateQuoteStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('supplier_quotes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Statut mis à jour",
        description: "Le statut du devis a été mis à jour.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-quotes', campaignId] });
    },
  });

  const QuoteForm = ({ onSubmit, onCancel }: any) => {
    const [formData, setFormData] = useState({
      campaign_item_id: '',
      supplier_id: '',
      unit_price: 0,
      minimum_quantity: 1,
      delivery_time_days: 30,
      quality_rating: 5,
      warranty_months: 12,
      valid_until: '',
      notes: '',
      quote_reference: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Article *</label>
            <Select value={formData.campaign_item_id} onValueChange={(value) => setFormData({ ...formData, campaign_item_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un article" />
              </SelectTrigger>
              <SelectContent>
                {items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Fournisseur *</label>
            <Select value={formData.supplier_id} onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un fournisseur" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Prix unitaire (€)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Quantité minimum</label>
            <Input
              type="number"
              value={formData.minimum_quantity}
              onChange={(e) => setFormData({ ...formData, minimum_quantity: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Délai de livraison (jours)</label>
            <Input
              type="number"
              value={formData.delivery_time_days}
              onChange={(e) => setFormData({ ...formData, delivery_time_days: parseInt(e.target.value) || 30 })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Note qualité (1-5)</label>
            <Select value={formData.quality_rating.toString()} onValueChange={(value) => setFormData({ ...formData, quality_rating: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Faible</SelectItem>
                <SelectItem value="2">2 - Correct</SelectItem>
                <SelectItem value="3">3 - Bien</SelectItem>
                <SelectItem value="4">4 - Très bien</SelectItem>
                <SelectItem value="5">5 - Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Garantie (mois)</label>
            <Input
              type="number"
              value={formData.warranty_months}
              onChange={(e) => setFormData({ ...formData, warranty_months: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Valide jusqu'au</label>
            <Input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Référence devis</label>
            <Input
              value={formData.quote_reference}
              onChange={(e) => setFormData({ ...formData, quote_reference: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit">
            Ajouter le devis
          </Button>
        </div>
      </form>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'received': return 'bg-green-100 text-green-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'selected': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'received': return 'Reçu';
      case 'expired': return 'Expiré';
      case 'selected': return 'Sélectionné';
      default: return status;
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Devis des Fournisseurs</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les devis reçus pour les articles de cette campagne
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowImportDialog(true)}>
            <FileUp className="h-4 w-4 mr-2" />
            Importer PDF
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un devis
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Ajouter un devis</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau devis de fournisseur pour un article de la campagne.
              </DialogDescription>
            </DialogHeader>
            <QuoteForm
              onSubmit={(data: any) => addQuoteMutation.mutate(data)}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <QuoteImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        campaignId={campaignId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['campaign-quotes', campaignId] });
        }}
      />

      {quotes && quotes.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Prix unitaire</TableHead>
                  <TableHead>Qté min</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead>Qualité</TableHead>
                  <TableHead>Garantie</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell>
                      <div className="font-medium">
                        {quote.campaign_items?.product_name}
                      </div>
                      {quote.quote_reference && (
                        <div className="text-sm text-muted-foreground">
                          Réf: {quote.quote_reference}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{quote.suppliers?.name}</TableCell>
                    <TableCell>
                      {Number(quote.unit_price).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                    <TableCell>{quote.minimum_quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {quote.delivery_time_days}j
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Award className="h-4 w-4 mr-1" />
                        {quote.quality_rating}/5
                      </div>
                    </TableCell>
                    <TableCell>{quote.warranty_months}m</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(quote.status)}>
                        {getStatusLabel(quote.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {quote.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuoteStatusMutation.mutate({
                              id: quote.id,
                              status: 'received'
                            })}
                          >
                            Marquer reçu
                          </Button>
                        )}
                        {quote.status === 'received' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuoteStatusMutation.mutate({
                              id: quote.id,
                              status: 'selected'
                            })}
                          >
                            Sélectionner
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun devis</h3>
              <p className="text-muted-foreground mb-4">
                Commencez par ajouter des devis de fournisseurs pour les articles de la campagne.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le premier devis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};